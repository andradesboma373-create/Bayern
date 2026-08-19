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

        const aimSpeed = p.aim / 1500;
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
    
    // Scale aim responsiveness across full rating range [40..250]
    const aimRatio = Math.max(0.4, Math.min(2.5, (shooter.aim || 100) / 100));
    const targetIqRatio = Math.max(0.4, Math.min(2.5, (target.iq || 100) / 100));
    const progress = Math.min(1.0, Math.max(0.4, shooter.aimProgress || 0.75));
    
    let hitChance = 0.44 + (aimRatio - 1.0) * 0.22 * progress;
    if (weapon.type === 'SNIPER') {
        // High accuracy for scoped snipers
        hitChance = 0.72 + (aimRatio - 1.0) * 0.16 * Math.max(0.7, progress);
        hitChance *= (weapon.accuracy / 100);
        hitChance *= Math.max(0.85, 1 - (dist / (weapon.range * 4)));
    } else {
        hitChance *= (weapon.accuracy / 100);
        hitChance *= Math.max(0.55, 1 - (dist / (weapon.range * 1.5)));
    }
    
    // Target defensive movement / IQ positioning
    const targetEvasion = Math.max(0.75, Math.min(1.25, 1.0 - (targetIqRatio - 1.0) * 0.08));
    hitChance *= targetEvasion;
    
    // Stationary / angle holding advantage
    if (shooter.state === 'HOLDING') {
        hitChance *= 1.12;
    }
    
    // Movement penalties
    if (shooter.state === 'MOVING') {
        hitChance *= weapon.type === 'SNIPER' ? 0.40 : 0.78;
    }
    if (target.state === 'MOVING') hitChance *= 0.90;
    
    // Crossfire / Flank / Distraction / Trade bonus: enemy is engaged with someone else
    if (target.targetEnemyId && target.targetEnemyId !== shooter.id) {
        hitChance *= 1.25;
    }
    
    // Balanced hit chance caps
    hitChance = weapon.type === 'SNIPER' ? Math.min(0.92, Math.max(0.40, hitChance)) : Math.min(0.82, Math.max(0.32, hitChance)); 
    
    const roll = this.random();
    this.createSoundEvent(state, shooter.currentNodeId, shooter.id);
    
    if (!target.damageTaken) target.damageTaken = new Map();
    
    // Utility usage: HE grenade in contested node
    if (shooter.grenades && shooter.grenades.includes('he') && !target.damageTaken.has(shooter.id)) {
        shooter.grenades = shooter.grenades.filter(g => g !== 'he');
        if (this.random() < 0.35) {
            const nadeDamage = Math.floor(12 + this.random() * 16);
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
      const baseHsChance = Math.min(0.65, Math.max(0.15, 0.32 + (aimRatio - 1.0) * 0.18));
      const isHeadshot = this.random() < baseHsChance;
      
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
        target.alive = false;
        target.state = 'DEAD';
        target.hp = 0;
        shooter.statistics.kills++;
        if (isHeadshot) shooter.statistics.headshots++;
        target.statistics.deaths++;
        
        // Opening kill tracking (first kill in round)
        if (!(state as any).roundFirstKillId) {
            (state as any).roundFirstKillId = shooter.id;
            shooter.statistics.openingKills++;
            target.statistics.openingDeaths++;
        }
        
        // Trade kill detection (target had dealt damage to a teammate who died recently)
        const victimDamaged = target.damageTaken;
        let isTrade = false;
        if (victimDamaged) {
            for (const [damagerId, dmg] of victimDamaged.entries()) {
                const damager = state.players[damagerId];
                if (damager && !damager.alive && damager.teamId === shooter.teamId) {
                    shooter.statistics.trades++;
                    target.statistics.tradeDeaths++;
                    (shooter as any).tradedInRound = true;
                    isTrade = true;
                    break;
                }
            }
        }
        
        // Assist distribution (at least 35 damage dealt by a teammate)
        if (target.damageTaken) {
            for (const [assisterId, dmg] of target.damageTaken.entries()) {
                if (assisterId !== shooter.id && dmg >= 35) {
                    const assister = state.players[assisterId];
                    if (assister && assister.teamId === shooter.teamId) {
                        assister.statistics.assists++;
                        break; 
                    }
                }
            }
        }

        // Alert victim teammates about killer position for trade fragging
        for (const mate of Object.values(state.players)) {
            if (mate.alive && mate.teamId === target.teamId) {
                mate.knownEnemies.set(shooter.id, {
                    enemyId: shooter.id,
                    position: { ...shooter.position },
                    nodeId: shooter.currentNodeId,
                    timestamp: state.tick,
                    confidence: 1.0
                });
                // If nearby, immediately target killer for instant trade
                if (mate.currentNodeId === target.currentNodeId || MapSystem.hasLineOfSight(mate.currentNodeId, shooter.currentNodeId)) {
                    if (mate.state !== 'ENGAGING') {
                        mate.state = 'ENGAGING';
                        mate.targetEnemyId = shooter.id;
                        mate.aimProgress = 0.80;
                        mate.reactionTimer = state.tick + 2;
                    }
                }
            }
        }
        
        state.events.push({
           type: 'PLAYER_KILLED',
           tick: state.tick,
           data: { killerId: shooter.id, victimId: target.id, isHeadshot }
        });
      }
    }
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
  static setSeed(seed: number) { 
    this.rngSeed = (Math.abs(seed) % 2147483647) || 12345; 
  }
  // High quality Mulberry32 PRNG (2^32 period)
  static random() {
    this.rngSeed |= 0;
    this.rngSeed = (this.rngSeed + 0x6D2B79F5) | 0;
    let t = Math.imul(this.rngSeed ^ (this.rngSeed >>> 15), 1 | this.rngSeed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t >>> 0) / 4294967296);
  }
}
