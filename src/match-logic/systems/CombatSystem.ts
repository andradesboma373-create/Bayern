import { MatchState, Player, MatchEvent } from '../models';
import { WEAPONS } from '../config/Weapons';
import { MapSystem } from './MapSystem';

export class CombatSystem {
  static update(state: MatchState) {
    const alivePlayers = Object.values(state.players).filter(p => p.alive);
    // Shuffle deterministically so no team or player slot has unfair first-action advantage in ticks
    for (let i = alivePlayers.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [alivePlayers[i], alivePlayers[j]] = [alivePlayers[j], alivePlayers[i]];
    }
    
    for (const p of alivePlayers) {
      if (!p.alive) continue; // Fix: player might have been killed earlier in the same tick

      if (p.state === 'ENGAGING' && p.targetEnemyId) {
        const target = state.players[p.targetEnemyId];
        
        if (!target || !target.alive) {
          p.state = 'IDLE';
          p.targetEnemyId = null;
          p.aimProgress = 0;
          continue;
        }
        
        if (!MapSystem.hasLineOfSight(p.currentNodeId, target.currentNodeId)) {
           p.state = 'IDLE';
           p.targetEnemyId = null;
           p.aimProgress = 0;
           continue;
        }
        
        if (state.tick < p.reactionTimer) {
           continue; 
        }

        const weapon = WEAPONS[p.weaponId] || WEAPONS['glock'];
        const fireInterval = 10 / weapon.fireRate;

        const aimSpeed = p.aim / 2000;
        if ((p.state as string) === 'MOVING') {
            p.aimProgress = Math.max(0, (p.aimProgress || 0) - 0.1);
        } else {
            p.aimProgress = Math.min(1.0, (p.aimProgress || 0) + aimSpeed); 
        }

        if (state.tick - p.shootTimer >= fireInterval) {
           p.shootTimer = state.tick;
           this.resolveShot(state, p, target, weapon);
        }
      }
    }
  }
  
  static resolveShot(state: MatchState, shooter: Player, target: Player, weapon: any) {
    if (!shooter || !target || !shooter.alive || !target.alive || shooter.teamId === target.teamId) return;
    shooter.statistics.shots++;
    const dist = MapSystem.getDistance(MapSystem.getNode(shooter.currentNodeId), MapSystem.getNode(target.currentNodeId));
    
    // Normalize aim and reaction into 0-100 scale
    const normAim = Math.min(99, Math.max(20, (shooter.aim || 100) * 0.8));
    const aimFactor = normAim / 100;
    const progress = Math.min(1.0, Math.max(0.2, shooter.aimProgress || 0.5));
    
    let hitChance = 0.20 + 0.65 * aimFactor * progress;
    if (weapon.type === 'SNIPER') {
        // High accuracy for scoped snipers
        hitChance = 0.60 + 0.38 * aimFactor * Math.max(0.7, progress);
        hitChance *= (weapon.accuracy / 100);
        // Minimal distance falloff for snipers
        hitChance *= Math.max(0.85, 1 - (dist / (weapon.range * 4)));
    } else {
        hitChance *= (weapon.accuracy / 100);
        hitChance *= Math.max(0.35, 1 - (dist / (weapon.range * 1.2)));
    }
    
    if (shooter.state === 'MOVING') {
        hitChance *= weapon.type === 'SNIPER' ? 0.25 : 0.65;
    }
    if (target.state === 'MOVING') hitChance *= 0.85;
    
    // Flank / backstab / distraction bonus: enemy is looking elsewhere
    if (target.targetEnemyId && target.targetEnemyId !== shooter.id) {
        hitChance *= 1.25;
    }
    
    // Realistic CS2 hit chance caps
    hitChance = weapon.type === 'SNIPER' ? Math.min(0.96, Math.max(0.25, hitChance)) : Math.min(0.90, Math.max(0.15, hitChance)); 
    
    const roll = this.random();
    this.createSoundEvent(state, shooter.currentNodeId, shooter.id);
    
    if (!target.damageTaken) target.damageTaken = new Map();
    
    // Realistic utility: if shooter carries an HE grenade, use it on first clash in contested node
    if (shooter.grenades && shooter.grenades.includes('he') && !target.damageTaken.has(shooter.id)) {
        shooter.grenades = shooter.grenades.filter(g => g !== 'he');
        if (this.random() < 0.35) {
            const nadeDamage = Math.floor(10 + this.random() * 18);
            const actualNade = Math.min(target.hp - 1, nadeDamage);
            if (actualNade > 0) {
                target.hp -= actualNade;
                shooter.statistics.damage += actualNade;
                shooter.statistics.utilityDamage = (shooter.statistics.utilityDamage || 0) + actualNade;
                target.damageTaken.set(shooter.id, (target.damageTaken.get(shooter.id) || 0) + actualNade);
            }
        }
    }
    
    if (roll < hitChance) {
      shooter.statistics.hits++;
      const hsChance = (shooter.aim / 200) * shooter.aimProgress;
      const isHeadshot = this.random() < hsChance;
      
      let damage = weapon.damage;
      if (isHeadshot) damage *= weapon.headshotMultiplier;
      if (target.armor > 0) damage *= weapon.armorPenetration;
      
      damage = Math.floor(damage);
      const actualDamage = Math.max(0, Math.min(target.hp, damage));
      
      target.hp -= actualDamage;
      shooter.statistics.damage += actualDamage;
      
      if (!target.damageTaken) target.damageTaken = new Map();
      target.damageTaken.set(shooter.id, (target.damageTaken.get(shooter.id) || 0) + actualDamage);
      
      state.events.push({
        type: 'DAMAGE',
        tick: state.tick,
        data: { shooterId: shooter.id, targetId: target.id, damage: actualDamage, isHeadshot }
      });
      
      if (target.hp <= 0 && target.alive) {
        this.processKill(state, shooter, target, isHeadshot);
      } else {
        if (target.state !== 'ENGAGING' && target.alive) {
            target.state = 'IDLE'; 
            target.knownEnemies.set(shooter.id, {
                 enemyId: shooter.id,
                 position: { ...shooter.position },
                 nodeId: shooter.currentNodeId,
                 timestamp: state.tick,
                 confidence: 0.5
            });
        }
      }
    }
  }
  
  static processKill(state: MatchState, killer: Player, victim: Player, isHeadshot: boolean) {
    if (!victim || !victim.alive) return;
    victim.alive = false;
    victim.state = 'DEAD';
    victim.hp = 0;
    victim.statistics.deaths++;
    killer.statistics.kills++;
    if (isHeadshot) killer.statistics.headshots++;
    
    killer.money = Math.min(16000, killer.money + 300);
    killer.state = 'IDLE';
    killer.targetEnemyId = null;
    killer.aimProgress = 0;
    
    if (victim.damageTaken) {
      for (const [assistId, dmg] of victim.damageTaken.entries()) {
        if (assistId !== killer.id && dmg >= 40) {
           const assister = state.players[assistId];
           if (assister && assister.teamId === killer.teamId) {
             assister.statistics.assists++;
           }
        }
      }
    }
    
    const totalDead = Object.values(state.players).filter(p => !p.alive).length;
    if (totalDead === 1) {
       killer.statistics.openingKills++;
       victim.statistics.openingDeaths++;
       state.roundFirstKillId = killer.id;
    }
    
    (victim as any).deathTick = state.tick;
    (victim as any).killerId = killer.id;

    // If victim recently killed one of killer's teammates, that teammate was successfully traded!
    for (const mate of Object.values(state.players)) {
        if (mate.teamId === killer.teamId && !mate.alive && (mate as any).killerId === victim.id && (state.tick - (mate as any).deathTick) <= 40) {
            (mate as any).tradedInRound = true;
        }
    }

    // Alert victim teammates about killer position for trade fragging
    for (const mate of Object.values(state.players)) {
        if (mate.alive && mate.teamId === victim.teamId) {
            mate.knownEnemies.set(killer.id, {
                enemyId: killer.id,
                position: { ...killer.position },
                nodeId: killer.currentNodeId,
                timestamp: state.tick,
                confidence: 1.0
            });
            // If nearby, immediately target killer for instant trade
            if (mate.currentNodeId === victim.currentNodeId || MapSystem.hasLineOfSight(mate.currentNodeId, killer.currentNodeId)) {
                if (mate.state !== 'ENGAGING') {
                    mate.state = 'ENGAGING';
                    mate.targetEnemyId = killer.id;
                    mate.aimProgress = 0.80;
                    mate.reactionTimer = state.tick + 2;
                }
            }
        }
    }
    
    state.events.push({
       type: 'PLAYER_KILLED',
       tick: state.tick,
       data: { killerId: killer.id, victimId: victim.id, isHeadshot }
    });
  }

  static createSoundEvent(state: MatchState, nodeId: string, sourceId: string) {
     const sourceNode = MapSystem.getNode(nodeId);
     const players = Object.values(state.players).filter(p => p.alive && p.id !== sourceId);
     for (const p of players) {
         const pNode = MapSystem.getNode(p.currentNodeId);
         if (pNode && sourceNode) {
             const dist = MapSystem.getDistance(pNode, sourceNode);
             if (dist < 80) { 
                 const sourcePlayer = state.players[sourceId];
                 if (sourcePlayer && sourcePlayer.teamId !== p.teamId) {
                     p.knownEnemies.set(sourceId, {
                         enemyId: sourceId,
                         position: { ...sourcePlayer.position },
                         nodeId: sourceNode.id,
                         timestamp: state.tick,
                         confidence: Math.max(0.2, 1 - (dist / 80)) 
                     });
                 }
             }
         }
     }
  }
  
  static rngSeed = 1;
  static setSeed(seed: number) { this.rngSeed = seed; }
  static random() {
    this.rngSeed = (this.rngSeed * 9301 + 49297) % 233280;
    return this.rngSeed / 233280;
  }
}
