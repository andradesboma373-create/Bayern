import { MatchState, Player, MatchEvent } from '../models';
import { WEAPONS } from '../config/Weapons';
import { MapSystem } from './MapSystem';
import { RatingSystem } from './RatingSystem';
import { RATING_CONFIG } from '../config/RatingConfig';

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

        // Overconfidence / Confidence delay: if a team is significantly ahead in alive players (e.g. 5v1), 
        // they might be slightly slower to react than someone fighting for survival.
        const shooterTeamAlive = Object.values(state.players).filter(pl => pl.teamId === p.teamId && pl.alive).length;
        const otherTeamAlive = Object.values(state.players).filter(pl => pl.teamId !== p.teamId && pl.alive).length;
        let confidenceDelay = 0;
        if (shooterTeamAlive >= 4 && otherTeamAlive === 1) confidenceDelay = 2;
        else if (shooterTeamAlive >= 3 && otherTeamAlive === 1) confidenceDelay = 1;

        if (state.tick < (p.reactionTimer + otFatigueReactionDelay + confidenceDelay)) {
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
      
      // Clutch / Desperation moment: 1vX situation boosts star players or desperation for anyone alone
      const shooterTeamAlive = Object.values(state.players).filter(p => p.teamId === shooter.teamId && p.alive).length;
      const targetTeamAlive = Object.values(state.players).filter(p => p.teamId === target.teamId && p.alive).length;
      
      if (shooterTeamAlive === 1 && targetTeamAlive >= 1) {
        // Desperation boost for the last survivor
        effectiveAim += (targetTeamAlive * 1.5); // +1.5 to +7.5 boost
        effectiveIq += (targetTeamAlive * 1.2);
        
        if ((shooter.iq || 100) > 105) {
          effectiveAim += 4; // Clutch gene for stars
        }
        if (shooter.perk?.clutchBonus) {
          effectiveAim += shooter.perk.clutchBonus * 20; // Explicit individual clutch perk boost
        }
      }
    }
    
    // Rating Scaling: ensure higher rated players (110+) naturally outperform lower rated players (80)
    // while keeping team contribution and trading healthy
    const baseAimRatio = Math.max(0.10, effectiveAim / 100);
    const aimRatio = 1.0 + (baseAimRatio - 1.0) * 0.65; 
    
    const baseIqRatio = Math.max(0.10, effectiveIq / 100);
    const targetIqRatio = 1.0 + (baseIqRatio - 1.0) * 0.40;

    const progress = Math.min(1.0, Math.max(0.50, shooter.aimProgress || 0.75));
    
    // Baseline hit chance scaling
    let hitChance = 0.54 + (aimRatio - 1.0) * 0.35 * progress;
    if (state.game === 'so2') hitChance += 0.05;

    // Soft multi-kill fatigue (only after 2 kills in the round, does not handicap first or second duel)
    const roundKills = (shooter as any).roundKills || 0;
    if (roundKills >= 2) {
      hitChance *= (1.0 - (Math.min(2, roundKills - 1) * 0.08));
    }
    if (weapon.type === 'SNIPER') {
        // High-rated snipers (110+) are sharp, while low-rated snipers (80) miss shots and can be punished
        hitChance = 0.70 + (aimRatio - 1.0) * 0.45 * Math.max(0.75, progress);
        hitChance *= (weapon.accuracy / 100);
        if (dist < 15) {
            // Close range un-scoped penalty
            hitChance *= 0.55;
        } else {
            hitChance *= Math.max(0.85, 1 - (dist / (weapon.range * 4)));
        }
    } else {
        hitChance *= (weapon.accuracy / 100);
        hitChance *= Math.max(0.40, 1 - (dist / (weapon.range * 1.3)));
    }
    
    // Target defensive movement / IQ positioning: high movement and IQ help evade incoming fire
    const targetMoveRatio = Math.max(0.10, (target.movement || 100) / 100);
    const targetEvasion = Math.max(0.75, Math.min(1.25, 1.0 - (targetIqRatio - 1.0) * 0.06 - (targetMoveRatio - 1.0) * 0.04));
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

    // Sniper cover mechanic: mild cover advantage only if holding stationary behind site cover
    const targetWeapon = WEAPONS[target.weaponId] || WEAPONS['glock'];
    if (targetWeapon.type === 'SNIPER' && state.tick < (target.shootTimer || 0)) {
        if (target.state === 'HOLDING') {
            hitChance *= 0.90;
        }
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
    
    // Utility usage: HE grenade in contested node (scaled by player's utility stat)
    if (shooter.grenades && shooter.grenades.includes('he') && !target.damageTaken.has(shooter.id)) {
        shooter.grenades = shooter.grenades.filter(g => g !== 'he');
        const utilityMult = Math.max(0.6, (shooter.utility || 100) / 100);
        const nadeHitChance = Math.min(0.60, 0.35 * utilityMult);
        if (this.random() < nadeHitChance) {
            const nadeDamage = Math.floor((25 + this.random() * 25) * utilityMult);
            const actualNade = Math.min(target.hp - 1, nadeDamage);
            if (actualNade > 0) {
                target.hp -= actualNade;
                shooter.statistics.damage += actualNade;
                (shooter as any).roundDamageDealt = ((shooter as any).roundDamageDealt || 0) + actualNade;
                shooter.statistics.utilityDamage = (shooter.statistics.utilityDamage || 0) + actualNade;
                target.damageTaken.set(shooter.id, (target.damageTaken.get(shooter.id) || 0) + actualNade);
            }
        }
    }
    
    if (roll < hitChance) {
      shooter.statistics.hits++;
      let baseHsChance = Math.min(0.50, Math.max(0.12, 0.24 + (aimRatio - 1.0) * 0.35));
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
      (shooter as any).roundDamageDealt = ((shooter as any).roundDamageDealt || 0) + actualDamage;
      
      if (!target.damageTaken) target.damageTaken = new Map();
      target.damageTaken.set(shooter.id, (target.damageTaken.get(shooter.id) || 0) + actualDamage);
      
      state.events.push({
        type: 'DAMAGE',
        tick: state.tick,
        data: { shooterId: shooter.id, targetId: target.id, damage: actualDamage, isHeadshot }
      });
      
      if (target.hp <= 0 && target.alive) {
        // Mutual spray / return duel damage: Higher chance to trade or at least deal damage back
        if (target.state === 'ENGAGING' && shooter.hp > 5 && (target.aimProgress || 0) > 0.50) {
          const targetWeapon = WEAPONS[target.weaponId] || WEAPONS['glock'];
          if (targetWeapon.type !== 'KNIFE') {
            const returnHitChance = 0.65 * (targetWeapon.accuracy / 100);
            if (this.random() < returnHitChance) {
              const isHs = this.random() < 0.20;
              const returnDmg = isHs 
                ? Math.floor(Math.min(shooter.hp, targetWeapon.damage * 3))
                : Math.floor(Math.min(shooter.hp, (targetWeapon.damage * 0.85) + this.random() * 20));
              
              if (returnDmg > 0) {
                shooter.hp -= returnDmg;
                target.statistics.damage += returnDmg;
                (target as any).roundDamageDealt = ((target as any).roundDamageDealt || 0) + returnDmg;
                if (!shooter.damageTaken) shooter.damageTaken = new Map();
                shooter.damageTaken.set(target.id, (shooter.damageTaken.get(target.id) || 0) + returnDmg);

                if (shooter.hp <= 0 && shooter.alive) {
                  shooter.alive = false;
                  shooter.state = 'DEAD';
                  shooter.hp = 0;
                  target.statistics.kills++;
                  (target as any).roundKills = ((target as any).roundKills || 0) + 1;
                  shooter.statistics.deaths++;
                  if (isHs) target.statistics.headshots++;
                  
                  state.events.push({
                    type: 'PLAYER_KILLED',
                    tick: state.tick,
                    data: { killerId: target.id, victimId: shooter.id, isHeadshot: isHs }
                  });
                }
              }
            }
          }
        }

        const pWinBeforeKiller = RatingSystem.calculateWinProbability(state, shooter.teamId);
        const isOpeningKill = !(state as any).roundFirstKillId;

        target.alive = false;
        target.state = 'DEAD';
        target.hp = 0;
        shooter.statistics.kills++;
        (shooter as any).roundKills = ((shooter as any).roundKills || 0) + 1;
        if (isHeadshot) shooter.statistics.headshots++;
        target.statistics.deaths++;
        
        // Opening kill tracking (first kill in round)
        if (isOpeningKill) {
            (state as any).roundFirstKillId = shooter.id;
            (state as any).roundFirstKillTeamId = shooter.teamId;
            (state as any).roundFirstDeathId = target.id;
            (state as any).roundFirstKillTick = state.tick;
            shooter.statistics.openingKills = (shooter.statistics.openingKills || 0) + 1;
            target.statistics.openingDeaths = (target.statistics.openingDeaths || 0) + 1;
        }

        // Recent death tracking for precise Trade Window detection
        const recentDeaths: Array<{ victimId: string; killerId: string; tick: number; victimTeamId: string }> =
          (state as any).recentDeaths || [];
        (state as any).recentDeaths = recentDeaths;

        // Trade kill detection: did target kill a teammate of shooter within TRADE_WINDOW_TICKS?
        let isTrade = false;
        const tradeWindowTicks = RATING_CONFIG.TRADE_WINDOW_TICKS;
        for (let i = recentDeaths.length - 1; i >= 0; i--) {
            const rd = recentDeaths[i];
            if (state.tick - rd.tick > tradeWindowTicks) break; // outside trade window
            if (rd.killerId === target.id && rd.victimTeamId === shooter.teamId) {
                // Legitimate trade kill!
                shooter.statistics.trades = (shooter.statistics.trades || 0) + 1;
                target.statistics.tradeDeaths = (target.statistics.tradeDeaths || 0) + 1;
                isTrade = true;

                // Credit the fallen teammate with being traded (for KAST T)
                const tradedVictim = state.players[rd.victimId];
                if (tradedVictim) {
                    (tradedVictim as any).wasTradedInRound = true;
                }

                // If the opening killer was traded within window
                if ((state as any).roundFirstKillId === target.id) {
                    (state as any).roundFirstKillTraded = true;
                    target.statistics.openingKillsTraded = (target.statistics.openingKillsTraded || 0) + 1;
                }
                break;
            }
        }

        // Record this death into recentDeaths
        recentDeaths.push({
            victimId: target.id,
            killerId: shooter.id,
            tick: state.tick,
            victimTeamId: target.teamId
        });

        // Round Swing calculation
        const pWinAfterKiller = RatingSystem.calculateWinProbability(state, shooter.teamId);
        const actionSwing = RatingSystem.calculateActionSwing(pWinBeforeKiller, pWinAfterKiller, shooter, target, isOpeningKill, isTrade);

        // Track potential clutch situation after this death
        const targetTeamAlive = Object.values(state.players).filter(p => p && p.alive && p.teamId === target.teamId);
        const shooterTeamAlive = Object.values(state.players).filter(p => p && p.alive && p.teamId === shooter.teamId);
        if (targetTeamAlive.length === 1 && shooterTeamAlive.length >= 1) {
            const lonePlayer = targetTeamAlive[0];
            if (!(lonePlayer as any).clutchOpponentsAtStart) {
                (lonePlayer as any).clutchOpponentsAtStart = shooterTeamAlive.length;
            }
        }
        
        // Assist distribution (at least ASSIST_MIN_DAMAGE dealt by a teammate, modified by individual assist perk)
        let assistSwing = 0;
        if (target.damageTaken) {
            const minAssistDamage = RATING_CONFIG.ASSIST_MIN_DAMAGE;
            for (const [assisterId, dmg] of target.damageTaken.entries()) {
                if (assisterId !== shooter.id) {
                    const assister = state.players[assisterId];
                    if (assister && assister.teamId === shooter.teamId) {
                        const threshold = assister.perk?.assistMultiplier ? Math.max(20, Math.floor(minAssistDamage / assister.perk.assistMultiplier)) : minAssistDamage;
                        if (dmg >= threshold) {
                            assister.statistics.assists++;
                            (assister as any).roundAssists = ((assister as any).roundAssists || 0) + 1;
                            const share = Math.min(0.35, (dmg / 100) * (RATING_CONFIG.ASSIST_SWING_SHARE || 0.35));
                            assistSwing = actionSwing * share;
                            assister.statistics.roundSwing = (assister.statistics.roundSwing || 0) + assistSwing;
                            break; 
                        }
                    }
                }
            }
        }

        // Killer gets action swing minus assist share, ensuring total kill swing is conserved (HLTV 3.0 standard)
        const killerSwing = Math.max(0.02, actionSwing - assistSwing);
        shooter.statistics.roundSwing = (shooter.statistics.roundSwing || 0) + killerSwing;

        const victimPenalty = RatingSystem.calculateVictimSwingPenalty(actionSwing, shooter, target, isOpeningKill);
        target.statistics.roundSwing = (target.statistics.roundSwing || 0) - victimPenalty;

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
     const sourcePlayer = state.players[sourceId];
     if (!sourceNode || !sourcePlayer) return;

     for (const id in state.players) {
       const p = state.players[id];
       if (!p || !p.alive || p.id === sourceId || p.teamId === sourcePlayer.teamId) continue;
       const pNode = MapSystem.getNode(p.currentNodeId);
       if (pNode) {
           const dist = MapSystem.getDistance(pNode, sourceNode);
           if (dist < 80) { 
               const mem = p.knownEnemies.get(sourceId);
               const conf = Math.max(0.2, 1 - (dist / 80));
               if (mem) {
                   mem.position.x = sourcePlayer.position.x;
                   mem.position.y = sourcePlayer.position.y;
                   mem.nodeId = sourceNode.id;
                   mem.timestamp = state.tick;
                   mem.confidence = Math.max(mem.confidence, conf);
               } else {
                   p.knownEnemies.set(sourceId, {
                       enemyId: sourceId,
                       position: { x: sourcePlayer.position.x, y: sourcePlayer.position.y },
                       nodeId: sourceNode.id,
                       timestamp: state.tick,
                       confidence: conf
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
