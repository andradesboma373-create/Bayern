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
        
        const regMax = state.format === 'MR15' ? 30 : 24;
        const otFatigueReactionDelay = state.round > regMax 
          ? Math.min(3, Math.floor((state.round - regMax) / 6) + 1)
          : 0;

        if (state.tick < (p.reactionTimer + otFatigueReactionDelay)) {
           continue; 
        }

        const weapon = WEAPONS[p.weaponId] || WEAPONS['glock'];
        const fireInterval = Math.max(1, Math.round(10 / (weapon.fireRate || 10)));

        const aimSpeed = p.aim / 1500;
        if ((p.state as string) === 'MOVING') {
            p.aimProgress = Math.max(0, (p.aimProgress || 0) - 0.1);
        } else {
            p.aimProgress = Math.min(1.0, (p.aimProgress || 0) + aimSpeed); 
        }

        if (state.tick >= (p.shootTimer || 0)) {
           p.shootTimer = state.tick + fireInterval;
           this.resolveShot(state, p, target, weapon);
        }
      }
    }
  }
  
  static resolveShot(state: MatchState, shooter: Player, target: Player, weapon: any) {
    if (!shooter || !target || !shooter.alive || !target.alive || shooter.teamId === target.teamId) return;
    shooter.statistics.shots++;
    const dist = MapSystem.getDistance(MapSystem.getNode(shooter.currentNodeId), MapSystem.getNode(target.currentNodeId));
    
    // Scale aim responsiveness across full rating range
    const shooterTeam = state.teams[shooter.teamId];
    const targetTeam = state.teams[target.teamId];
    
    let effectiveAim = shooter.aim || 100;
    let effectiveIq = target.iq || 100;

    // Apply individual player perks if configured in Settings -> Индивидуальные Рейты
    if (shooter.perk && shooter.perk.killMultiplier) {
      effectiveAim *= shooter.perk.killMultiplier;
    }
    if (target.perk && target.perk.deathMultiplier) {
      // Lower death multiplier (e.g. 0.85) means harder to kill -> boosts target defensive evasion
      effectiveIq *= (1.0 / Math.max(0.5, target.perk.deathMultiplier));
    }

    // Overtime fatigue: as matches enter overtime and deep marathon rounds, players experience fatigue
    const regMax = state.format === 'MR15' ? 30 : 24;
    if (state.round > regMax) {
      const otRoundsPlayed = state.round - regMax;
      const fatigueFactor = Math.min(0.20, (otRoundsPlayed / 36) * 0.16);
      effectiveAim *= (1.0 - fatigueFactor * 0.45);
      effectiveIq *= (1.0 - fatigueFactor * 0.40);
    }
    
    // Dynamic Match Psychology & Tactical Focus:
    // In competitive CS2, trailing teams use timeouts and adapt tactically
    if (shooterTeam && targetTeam) {
      const scoreDiff = shooterTeam.score - targetTeam.score; // negative means shooter's team is trailing
      
      if (scoreDiff <= -3) {
        // Trailing team tactical timeout & reset
        const trailingAmount = Math.min(6, Math.abs(scoreDiff));
        effectiveAim += trailingAmount * 0.5; // subtle +1.5 to +3.0 max
        effectiveIq += trailingAmount * 0.4;
      }
      
      // Clutch moment: 1vX situation boosts high-IQ / clutch star players
      const shooterTeamAlive = Object.values(state.players).filter(p => p.teamId === shooter.teamId && p.alive).length;
      const targetTeamAlive = Object.values(state.players).filter(p => p.teamId === target.teamId && p.alive).length;
      if (shooterTeamAlive === 1 && targetTeamAlive >= 1) {
        if ((shooter.iq || 100) > 105) {
          effectiveAim += 4; // Clutch gene for stars
        }
        if (shooter.perk?.clutchBonus) {
          effectiveAim += shooter.perk.clutchBonus * 20; // Explicit individual clutch perk boost
        }
      }
    }
    
    const aimRatio = Math.max(0.70, Math.min(1.45, effectiveAim / 100));
    const targetIqRatio = Math.max(0.70, Math.min(1.45, effectiveIq / 100));
    const progress = Math.min(1.0, Math.max(0.50, shooter.aimProgress || 0.75));
    
    let hitChance = 0.46 + (aimRatio - 1.0) * 0.22 * progress;
    if (weapon.type === 'SNIPER') {
        // High accuracy for scoped snipers holding angles or distance
        hitChance = 0.90 + (aimRatio - 1.0) * 0.12 * Math.max(0.80, progress);
        hitChance *= (weapon.accuracy / 100);
        if (dist < 15) {
            // Close range un-scoped penalty
            hitChance *= 0.65;
        } else {
            hitChance *= Math.max(0.94, 1 - (dist / (weapon.range * 5)));
        }
    } else {
        hitChance *= (weapon.accuracy / 100);
        hitChance *= Math.max(0.40, 1 - (dist / (weapon.range * 1.3)));
    }
    
    // Target defensive movement / IQ positioning
    const targetEvasion = Math.max(0.75, Math.min(1.25, 1.0 - (targetIqRatio - 1.0) * 0.10));
    hitChance *= targetEvasion;
    
    // Stationary / angle holding advantage
    if (shooter.state === 'HOLDING') {
        hitChance *= weapon.type === 'SNIPER' ? 1.08 : 1.12;
    }

    // Site anchor defensive advantage: CT holding site zone against attackers emerging from chokes
    if (shooter.side === 'CT' && shooter.state === 'HOLDING' && (shooter.currentNodeId === 'a_site' || shooter.currentNodeId === 'b_site' || shooter.currentNodeId === 'jungle' || shooter.currentNodeId === 'window')) {
        hitChance *= 1.12;
    }

    // Attacking through narrow choke entries penalty while moving
    if (shooter.side === 'T' && shooter.state === 'MOVING' && (shooter.currentNodeId === 'a_main' || shooter.currentNodeId === 'b_apps' || shooter.currentNodeId === 't_ramp')) {
        hitChance *= 0.88;
    }

    // Sniper cover mechanic: if target is a sniper currently cycling bolt, they are ducked behind cover
    const targetWeapon = WEAPONS[target.weaponId] || WEAPONS['glock'];
    if (targetWeapon.type === 'SNIPER' && state.tick < (target.shootTimer || 0)) {
        hitChance *= 0.15; // Major cover protection while cycling bolt
    }
    
    // Movement penalties
    if (shooter.state === 'MOVING') {
        hitChance *= weapon.type === 'SNIPER' ? 0.35 : 0.78;
    }
    if (target.state === 'MOVING') hitChance *= 0.90;
    
    // Flank / Distraction / Crossfire bonus: only when attacking from a different angle/node than where the target is facing
    if (target.targetEnemyId && target.targetEnemyId !== shooter.id) {
        const primaryEnemy = state.players[target.targetEnemyId];
        // If shooter is at a different position/node than the primary enemy, it's a true flank/crossfire
        if (primaryEnemy && primaryEnemy.currentNodeId !== shooter.currentNodeId) {
            hitChance *= 1.20;
        } else if (target.state !== 'HOLDING') {
            hitChance *= 1.08;
        }
    }
    
    // Balanced hit chance caps
    hitChance = weapon.type === 'SNIPER' ? Math.min(0.98, Math.max(0.40, hitChance)) : Math.min(0.85, Math.max(0.28, hitChance)); 
    
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
      let baseHsChance = Math.min(0.40, Math.max(0.12, 0.22 + (aimRatio - 1.0) * 0.16));
      if (shooter.perk?.hsMultiplier) {
        baseHsChance = Math.min(0.65, baseHsChance * shooter.perk.hsMultiplier);
      }
      const isHeadshot = this.random() < baseHsChance;
      
      let damage = weapon.damage;
      if (isHeadshot) {
        damage *= weapon.headshotMultiplier;
        // In CS2, M4A1-S and M4A4 do not 1-tap against full helmet (armor >= 2)
        if (target.armor >= 2 && (weapon.id === 'm4a1s' || weapon.id === 'm4a4' || weapon.id === 'famas' || weapon.id === 'galil' || weapon.id === 'mp9' || weapon.id === 'mac10')) {
          damage = Math.min(92, Math.floor(damage * weapon.armorPenetration));
        } else if (target.armor > 0) {
          damage = Math.floor(damage * weapon.armorPenetration);
        }
      } else {
        if (target.armor > 0) damage = Math.floor(damage * weapon.armorPenetration);
      }
      
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
        // Mutual spray / return duel damage: Only in close/medium spray duels when target was actively aiming
        if (target.state === 'ENGAGING' && shooter.hp > 15 && weapon.type !== 'SNIPER' && dist < 1400 && (target.aimProgress || 0) > 0.70) {
          const targetWeapon = WEAPONS[target.weaponId] || WEAPONS['glock'];
          if (targetWeapon.type !== 'KNIFE' && targetWeapon.type !== 'SNIPER') {
            const returnHitChance = 0.38 * (targetWeapon.accuracy / 100);
            if (this.random() < returnHitChance) {
              const returnDmg = Math.floor(Math.min(shooter.hp - 1, (targetWeapon.damage * 0.65) + this.random() * 8));
              if (returnDmg > 0) {
                shooter.hp -= returnDmg;
                target.statistics.damage += returnDmg;
                if (!shooter.damageTaken) shooter.damageTaken = new Map();
                shooter.damageTaken.set(target.id, (shooter.damageTaken.get(target.id) || 0) + returnDmg);
              }
            }
          }
        }

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
        
        // Assist distribution (at least 35 damage dealt by a teammate, modified by individual assist perk)
        if (target.damageTaken) {
            for (const [assisterId, dmg] of target.damageTaken.entries()) {
                if (assisterId !== shooter.id) {
                    const assister = state.players[assisterId];
                    if (assister && assister.teamId === shooter.teamId) {
                        const threshold = assister.perk?.assistMultiplier ? Math.max(20, Math.floor(35 / assister.perk.assistMultiplier)) : 35;
                        if (dmg >= threshold) {
                            assister.statistics.assists++;
                            break; 
                        }
                    }
                }
            }
        }

        // Killer recoil recovery and re-aiming delay
        if (weapon.type === 'SNIPER') {
          shooter.aimProgress = 0.85;
          shooter.shootTimer = state.tick + 6;
          // Sniper tactically steps behind cover / cycles bolt
          shooter.state = 'HOLDING';
        } else {
          shooter.aimProgress = 0.50;
          shooter.shootTimer = state.tick + 1;
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
                // If nearby, target killer for trade frag
                if (mate.currentNodeId === target.currentNodeId) {
                    if (mate.state !== 'ENGAGING') {
                        mate.state = 'ENGAGING';
                        mate.targetEnemyId = shooter.id;
                        mate.aimProgress = 0.75;
                        mate.reactionTimer = state.tick + 1;
                    }
                } else if (MapSystem.hasLineOfSight(mate.currentNodeId, shooter.currentNodeId)) {
                    if (mate.state !== 'ENGAGING') {
                        mate.state = 'ENGAGING';
                        mate.targetEnemyId = shooter.id;
                        mate.aimProgress = 0.50;
                        mate.reactionTimer = state.tick + 3;
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
