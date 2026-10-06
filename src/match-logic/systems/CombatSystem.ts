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
        // Desperation boost for the last survivor (clutch situation)
        effectiveAim += (targetTeamAlive * 1.5);
        effectiveIq += (targetTeamAlive * 1.2);
        
        // Clutch Luck: ANY player has a 20% chance to "lock in" and get a massive boost
        if (this.random() < 0.20) {
          effectiveAim += 6;
          effectiveIq += 5;
        }

        if (shooter.perk?.clutchBonus) {
          effectiveAim += shooter.perk.clutchBonus * 20; 
        }
      }
    }
    
    // Rating Scaling: ensure higher rated players (110+) naturally outperform lower rated players (80)
    // while keeping team contribution and trading healthy
    const baseAimRatio = Math.max(0.10, effectiveAim / 100);
    const aimRatio = 1.0 + (baseAimRatio - 1.0) * 1.00; // Reduced from 1.15 to prevent invincibility
    
    const baseIqRatio = Math.max(0.10, effectiveIq / 100);
    const pRoleLower = (shooter.role || '').toLowerCase();
    const isShooterEntry = pRoleLower.includes('entry') || pRoleLower.includes('opener') || pRoleLower.includes('энтри');
    const isShooterSupport = pRoleLower.includes('support') || pRoleLower.includes('саппорт');
    const isShooterLurker = pRoleLower.includes('lurker') || pRoleLower.includes('люркер');
    const isShooterCaptain = pRoleLower.includes('captain') || pRoleLower.includes('igl') || pRoleLower.includes('капитан');
    const isShooterSniper = pRoleLower.includes('sniper') || pRoleLower.includes('awp') || pRoleLower.includes('снайпер');

    const isTargetCaptain = (target.role || '').toLowerCase().includes('captain') || (target.role || '').toLowerCase().includes('igl');
    // Captain tactical IQ is for strat calling, not personal superhuman bullet evasion
    const targetIqRatio = isTargetCaptain 
      ? 1.0 + (Math.min(1.04, baseIqRatio) - 1.0) * 0.20 
      : 1.0 + (baseIqRatio - 1.0) * 0.35;

    const progress = Math.min(1.0, Math.max(0.40, shooter.aimProgress || 0.70));
    
    // Baseline hit chance scaling
    let hitChance = 0.50 + (aimRatio - 1.0) * 0.45 * progress;
    if (state.game === 'so2') hitChance += 0.05;

    // Role-specific Hit Chance Tweaks
    if (isShooterEntry) {
      // Entry fraggers: Strong opening duel potential
      hitChance = 0.58 + (aimRatio - 1.0) * 0.50 * progress;
      if (state.tick < (shooter.reactionTimer + 15)) {
        hitChance *= 1.10; // Extra sharp at the very start of entry
      }
    } else if (isShooterSupport) {
      // Support players are standard riflers, no artificial penalty
    }

    // Captain / IGL balance: standard captains focus on tactical commands rather than over-fragging
    if (isShooterCaptain && (shooter.rating || 100) < 112) {
      const rKills = (shooter as any).roundKills || 0;
      if (rKills >= 1) {
        hitChance *= 0.85;
      }
    }

    // Soft multi-kill fatigue (scales after each kill in the round so aces are rare and teammates contribute)
    const roundKills = (shooter as any).roundKills || 0;
    if (roundKills >= 1) {
      // Entry fraggers have slightly better multi-kill stamina to avoid "sucking" too hard after 1st kill
      const multiKillPenalty = isShooterEntry ? 0.08 : 0.12;
      hitChance *= (1.0 - (Math.min(4, roundKills) * multiKillPenalty));
    }
    
    if (weapon.type === 'SNIPER') {
        // High-rated snipers (110+) are sharp, while low-rated snipers (80) miss shots and can be punished
        hitChance = 0.68 + (aimRatio - 1.0) * 0.55 * Math.max(0.70, progress);
        hitChance *= (weapon.accuracy / 100);
        
        // Snipe rating sensitivity: 130 rating sniper vs 80 rating sniper difference should be huge
        if (aimRatio < 0.95) hitChance *= 0.85; // Low skill snipers miss more
        
        if (dist < 15) {
            // Close range un-scoped penalty
            hitChance *= 0.50;
        } else {
            hitChance *= Math.max(0.80, 1 - (dist / (weapon.range * 4.5)));
        }
    } else {
        hitChance *= (weapon.accuracy / 100);
        hitChance *= Math.max(0.38, 1 - (dist / (weapon.range * 1.25)));
    }
    
    // Target defensive movement / IQ positioning: high movement and IQ help evade incoming fire
    const targetMoveRatio = Math.max(0.10, (target.movement || 100) / 100);
    const targetEvasion = Math.max(0.82, Math.min(1.15, 1.0 - (targetIqRatio - 1.0) * 0.05 - (targetMoveRatio - 1.0) * 0.04));
    hitChance *= targetEvasion;
    
    // Support teammate flash utility: support throws flashbang to set up teammate
    const supportMates = Object.values(state.players).filter(pl => 
      pl.alive && pl.teamId === shooter.teamId && pl.id !== shooter.id &&
      ((pl.role || '').toLowerCase().includes('support') || (pl.role || '').toLowerCase().includes('саппорт')) &&
      pl.grenades && pl.grenades.includes('flash')
    );
    if (supportMates.length > 0) {
      const supp = supportMates[0];
      const utilityMult = Math.max(0.5, (supp.utility || 100) / 100);
      const flashChance = 0.20 * utilityMult; // Supports (135 utility) will flash ~27% of the time, Riflers ~20%
      
      if (this.random() < flashChance) {
        supp.grenades = supp.grenades.filter(g => g !== 'flash');
        hitChance *= 1.15; // Flashed target!
        // Record flash assist attribution with timestamp
        (target as any).flashedById = supp.id;
        (target as any).flashedTick = state.tick;
      }
    }
    
    // Stationary / angle holding advantage
    if (shooter.state === 'HOLDING') {
        hitChance *= isShooterSniper ? 1.10 : 1.14;
    }

    // Site anchor defensive advantage: CT holding site zone against attackers emerging from chokes
    if (shooter.side === 'CT' && shooter.state === 'HOLDING' && (shooter.currentNodeId === 'a_site' || shooter.currentNodeId === 'b_site' || shooter.currentNodeId === 'jungle' || shooter.currentNodeId === 'window')) {
        hitChance *= 1.15;
    }

    // Attacking through narrow choke entries penalty while moving
    if (shooter.side === 'T' && shooter.state === 'MOVING' && (shooter.currentNodeId === 'a_main' || shooter.currentNodeId === 'b_apps' || shooter.currentNodeId === 't_ramp')) {
        hitChance *= 0.85;
    }

    // Sniper cover mechanic: mild cover advantage only if holding stationary behind site cover
    const targetWeapon = WEAPONS[target.weaponId] || WEAPONS['glock'];
    if (targetWeapon.type === 'SNIPER' && state.tick < (target.shootTimer || 0)) {
        if (target.state === 'HOLDING') {
            hitChance *= 0.88;
        }
    }
    
    // Movement penalties
    if (shooter.state === 'MOVING') {
        hitChance *= weapon.type === 'SNIPER' ? 0.30 : 0.75;
    }
    if (target.state === 'MOVING') hitChance *= 0.88;
    
    // Flank / Distraction / Crossfire bonus: only when attacking from a different angle/node than where the target is facing
    if (target.targetEnemyId && target.targetEnemyId !== shooter.id) {
        const primaryEnemy = state.players[target.targetEnemyId];
        // If shooter is at a different position/node than the primary enemy, it's a true flank/crossfire
        if (primaryEnemy && primaryEnemy.currentNodeId !== shooter.currentNodeId) {
            const flankBonus = isShooterLurker ? 1.25 : 1.18;
            hitChance *= flankBonus;
        } else if (target.state !== 'HOLDING') {
            hitChance *= 1.08;
        }
    }
    
    // Tactical Entry & Support Synergy:
    // Entry fraggers get a boost during site execution when entering a site,
    // especially if a support teammate is alive and nearby to throw utility ("под раскид").
    const isExecuting = shooterTeam?.strategy?.includes('EXECUTE') || shooterTeam?.strategy?.includes('FAST');
    const isOnSite = shooter.currentNodeId?.includes('site');
    
    if (shooter.side === 'T' && isExecuting && isOnSite) {
      if (isShooterEntry) {
        hitChance *= 1.12; // Entry fragger confidence on site
      }
      
      const nearbySupport = Object.values(state.players).find(pl => 
        pl.alive && pl.teamId === shooter.teamId && pl.id !== shooter.id &&
        ((pl.role || '').toLowerCase().includes('support') || (pl.role || '').toLowerCase().includes('саппорт')) &&
        MapSystem.getDistance(MapSystem.getNode(pl.currentNodeId), MapSystem.getNode(shooter.currentNodeId)) < 40
      );
      
      if (nearbySupport) {
        hitChance *= 1.10; // "Под раскид" bonus
      }
    }

    // Balanced hit chance caps
    hitChance = weapon.type === 'SNIPER' ? Math.min(0.98, Math.max(0.35, hitChance)) : Math.min(0.85, Math.max(0.25, hitChance)); 
    
    const roll = this.random();
    this.createSoundEvent(state, shooter.currentNodeId, shooter.id);
    
    if (!target.damageTaken) target.damageTaken = new Map();
    
    // Utility usage: HE grenade in contested node (scaled by player's utility stat)
    if (shooter.grenades && shooter.grenades.includes('he') && !target.damageTaken.has(shooter.id)) {
        shooter.grenades = shooter.grenades.filter(g => g !== 'he');
        const utilityMult = Math.max(0.7, (shooter.utility || 100) / 100);
        const nadeHitChance = Math.min(0.50, 0.35 * utilityMult);
        if (this.random() < nadeHitChance) {
            const nadeDamage = Math.floor((15 + this.random() * 20) * utilityMult);
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
    
    // Lucky timing & situational randomness ("на лаки убьют"):
    // In live CS2 matches, even an underdog or 101-rating player can hit a lucky 1-tap or timing,
    // while favorites can occasionally whiff a spray.
    let finalHitChance = hitChance;
    const luckyRoll = this.random();
    let isLuckyShot = false;
    if (luckyRoll < 0.06) {
      finalHitChance = Math.max(finalHitChance, 0.72);
      isLuckyShot = true;
    } else if (luckyRoll > 0.95) {
      finalHitChance *= 0.65; // Whiff / unlucky spray transfer
    }

    if (roll < finalHitChance) {
      shooter.statistics.hits++;
      let baseHsChance = Math.min(0.50, Math.max(0.12, 0.24 + (aimRatio - 1.0) * 0.35));
      if (isLuckyShot) baseHsChance = Math.max(baseHsChance, 0.55);
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
        // Mutual Fire logic: In a 1v1 duel, both players are usually shooting.
        // If the target was also engaging the shooter, they deal some "trade damage" 
        // during the final exchange before being eliminated.
        if (target.state === 'ENGAGING' && target.targetEnemyId === shooter.id && shooter.hp > 2) {
          const targetWeapon = WEAPONS[target.weaponId] || WEAPONS['glock'];
          
          // Chance to land a final blow/damage depends on weapon type and reaction
          const tradeChance = targetWeapon.type === 'SNIPER' ? 0.25 : 0.75;
          
          if (this.random() < tradeChance) {
            // Scale damage by target's skill and duel intensity
            const skillFactor = (target.aim || 100) / 100;
            const finalExchangeDamage = Math.floor((12 + this.random() * 28) * skillFactor);
            
            // Strictly non-lethal to avoid frequent simultaneous deaths
            const actualTradeDamage = Math.min(shooter.hp - 1, finalExchangeDamage);
            
            if (actualTradeDamage > 0) {
              shooter.hp -= actualTradeDamage;
              target.statistics.damage += actualTradeDamage;
              (target as any).roundDamageDealt = ((target as any).roundDamageDealt || 0) + actualTradeDamage;
              if (!shooter.damageTaken) shooter.damageTaken = new Map();
              shooter.damageTaken.set(target.id, (shooter.damageTaken.get(target.id) || 0) + actualTradeDamage);
              
              state.events.push({
                type: 'DAMAGE',
                tick: state.tick,
                data: { shooterId: target.id, targetId: shooter.id, damage: actualTradeDamage, isHeadshot: false, isTradeExchange: true }
              });
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

        // Alert victim's nearby teammates for immediate trade opportunity
        // (Allows trading star players so they are not immortal and die in realistic round skirmishes)
        for (const tm of Object.values(state.players)) {
          if (tm && tm.alive && tm.teamId === target.teamId && tm.id !== target.id) {
            if (MapSystem.hasLineOfSight(tm.currentNodeId, shooter.currentNodeId) || tm.currentNodeId === target.currentNodeId) {
              tm.targetEnemyId = shooter.id;
              tm.state = 'ENGAGING';
              tm.path = [];
              tm.targetNodeId = null;
              tm.knownEnemies.set(shooter.id, {
                enemyId: shooter.id,
                position: { ...shooter.position },
                nodeId: shooter.currentNodeId,
                timestamp: state.tick,
                confidence: 1.0
              });
              // Immediate trade reaction advantage (peeker / trader swing)
              tm.reactionTimer = state.tick;
              tm.aimProgress = Math.max(0.85, tm.aimProgress || 0);
            }
          }
        }

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
        let assistCredited = false;
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
                            assistCredited = true;
                            break; 
                        }
                    }
                }
            }
        }

        // Flash assist credit if victim was blinded by a teammate within the last 40 ticks and no regular damage assist was credited
        if (!assistCredited && (target as any).flashedById && (state.tick - ((target as any).flashedTick || 0) <= 40)) {
          const flasherId = (target as any).flashedById;
          if (flasherId !== shooter.id) {
            const flasher = state.players[flasherId];
            if (flasher && flasher.teamId === shooter.teamId) {
              flasher.statistics.assists++;
              (flasher as any).roundAssists = ((flasher as any).roundAssists || 0) + 1;
              const flashShare = 0.15;
              assistSwing = actionSwing * flashShare;
              flasher.statistics.roundSwing = (flasher.statistics.roundSwing || 0) + assistSwing;
            }
          }
        }
        (target as any).flashedById = null;
        (target as any).flashedTick = 0;

        // Killer gets action swing minus assist share, ensuring total kill swing is conserved (HLTV 3.0 standard)
        const killerSwing = Math.max(0.02, actionSwing - assistSwing);
        shooter.statistics.roundSwing = (shooter.statistics.roundSwing || 0) + killerSwing;

        const victimPenalty = RatingSystem.calculateVictimSwingPenalty(actionSwing, shooter, target, isOpeningKill);
        target.statistics.roundSwing = (target.statistics.roundSwing || 0) - victimPenalty;

        // Killer recoil recovery and re-aiming delay
        if (weapon.type === 'SNIPER') {
          shooter.aimProgress = 0.85;
          shooter.shootTimer = state.tick + 7;
          // Sniper tactically steps behind cover / cycles bolt
          shooter.state = 'HOLDING';
        } else {
          shooter.aimProgress = 0.45;
          shooter.shootTimer = state.tick + 6;
        }

        // Alert killer teammates to crossfire and engage remaining spotted enemies
        for (const ally of Object.values(state.players)) {
          if (ally.alive && ally.teamId === shooter.teamId && ally.id !== shooter.id) {
            for (const [eId, mem] of ally.knownEnemies.entries()) {
              if (mem.confidence > 0.5) {
                const enemy = state.players[eId];
                if (enemy && enemy.alive) {
                  if (ally.state !== 'ENGAGING') {
                    ally.state = 'ENGAGING';
                    ally.targetEnemyId = eId;
                    ally.aimProgress = 0.70;
                    ally.reactionTimer = state.tick + 1;
                    break;
                  }
                }
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
