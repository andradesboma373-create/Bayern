import { MatchState } from '../models';
import { EconomySystem } from '../systems/EconomySystem';
import { MapSystem } from '../systems/MapSystem';
import { PlayerAI } from '../ai/PlayerAI';
import { TeamAI } from '../ai/TeamAI';
import { CombatSystem } from '../systems/CombatSystem';
import { BombSystem } from '../systems/BombSystem';
import { RATING_CONFIG } from '../config/RatingConfig';
import { WEAPONS } from '../config/Weapons';

export class RoundEngine {
  static startRound(state: MatchState) {
    state.round++;
    (state as any).recentDeaths = [];
    (state as any).roundFirstKillId = null;
    (state as any).roundFirstKillTeamId = null;
    (state as any).roundFirstDeathId = null;
    (state as any).roundFirstKillTraded = false;

    Object.values(state.players).forEach(p => {
        if (p && p.statistics) {
            (p as any).lastRoundKills = p.statistics.kills;
            (p as any).lastRoundAssists = p.statistics.assists;
            (p as any).lastRoundDamage = p.statistics.damage;
            (p as any).roundKills = 0;
            (p as any).roundAssists = 0;
            (p as any).roundDamageDealt = 0;
            (p as any).wasTradedInRound = false;
            (p as any).contributedObjectiveInRound = false;
            (p as any).roundClutchWon = false;
            (p as any).clutchOpponentsAtStart = null;
            (p as any).killsInClutch = 0;
        }
    });
    state.phase = 'FREEZE';
    state.tick = 0;
    
    const isMR12 = state.format === 'MR12';
    const halfRound = isMR12 ? 13 : 16;
    const regulationMax = isMR12 ? 24 : 30;
    const teamIds = Object.keys(state.teams);
    const t1Orig = (state as any).t1StartedAs || 'T';
    const t2Orig = (state as any).t2StartedAs || 'CT';
    
    if (state.round === 1) {
      if (teamIds[0] && state.teams[teamIds[0]]) state.teams[teamIds[0]].side = t1Orig;
      if (teamIds[1] && state.teams[teamIds[1]]) state.teams[teamIds[1]].side = t2Orig;
      for (const p of Object.values(state.players)) {
        if (p) {
          p.side = state.teams[p.teamId]?.side || 'T';
          p.weaponId = p.side === 'T' ? 'glock' : 'usp';
        }
      }
    } else if (state.round === halfRound) {
      if (teamIds[0] && state.teams[teamIds[0]]) {
        state.teams[teamIds[0]].side = t1Orig === 'T' ? 'CT' : 'T';
        state.teams[teamIds[0]].lossStreak = 0;
      }
      if (teamIds[1] && state.teams[teamIds[1]]) {
        state.teams[teamIds[1]].side = t2Orig === 'T' ? 'CT' : 'T';
        state.teams[teamIds[1]].lossStreak = 0;
      }
      
      for (const p of Object.values(state.players)) {
        if (p) {
          p.side = state.teams[p.teamId]?.side || 'T';
          p.money = 800;
          p.primaryWeaponId = null;
          p.secondaryWeaponId = p.side === 'T' ? 'glock' : 'usp';
          p.weaponId = p.secondaryWeaponId;
          p.armor = 0;
          p.hasDefuseKit = false;
          p.grenades = [];
        }
      }
    } else if (state.round > regulationMax) {
      const otRound = state.round - regulationMax;
      // In CS2: MR3 format (3 rounds per half, side switch every 3 rounds)
      // In SO2 (Standoff 2): side switch every 2 rounds (смена сторон каждые 2 раунда)
      const roundsPerHalf = state.isCS2 ? 3 : 2;
      const roundsPerOT = roundsPerHalf * 2;
      if (otRound === 1 || (otRound - 1) % roundsPerOT === 0) {
        if (teamIds[0] && state.teams[teamIds[0]]) state.teams[teamIds[0]].side = t1Orig;
        if (teamIds[1] && state.teams[teamIds[1]]) state.teams[teamIds[1]].side = t2Orig;
        for (const p of Object.values(state.players)) {
          if (p) {
            p.side = state.teams[p.teamId]?.side || 'T';
            p.money = 10000;
            p.primaryWeaponId = null;
            p.secondaryWeaponId = p.side === 'T' ? 'glock' : 'usp';
            p.weaponId = p.secondaryWeaponId;
            p.armor = 0;
            p.hasDefuseKit = false;
            p.grenades = [];
          }
        }
      } else if ((otRound - 1) % roundsPerHalf === 0) {
        if (teamIds[0] && state.teams[teamIds[0]]) state.teams[teamIds[0]].side = t1Orig === 'T' ? 'CT' : 'T';
        if (teamIds[1] && state.teams[teamIds[1]]) state.teams[teamIds[1]].side = t2Orig === 'T' ? 'CT' : 'T';
        for (const p of Object.values(state.players)) {
          if (p) {
            p.side = state.teams[p.teamId]?.side || 'T';
            p.money = 10000;
            p.primaryWeaponId = null;
            p.secondaryWeaponId = p.side === 'T' ? 'glock' : 'usp';
            p.weaponId = p.secondaryWeaponId;
            p.armor = 0;
            p.hasDefuseKit = false;
            p.grenades = [];
          }
        }
      }
    }
    
    MapSystem.initializeMap(state.mapId);
    
    // Give bomb to non-sniper T
    const tPlayers = Object.values(state.players).filter(p => p && state.teams[p.teamId]?.side === 'T');
    const nonSniperTs = tPlayers.filter(p => {
        const r = (p.role || '').toLowerCase();
        return r !== 'sniper' && r !== 'awper' && r !== 'awp' && r !== 'снайпер';
    });
    const candidates = nonSniperTs.length > 0 ? nonSniperTs : tPlayers;
    const bombCarrier = candidates.length > 0 ? candidates[Math.floor(CombatSystem.random() * candidates.length)] : null;
    state.bomb = {
        state: 'CARRIED',
        position: null,
        nodeId: null,
        carrierId: bombCarrier ? bombCarrier.id : null,
        timer: 0
    };
    
    for (const p of Object.values(state.players)) {
      if (!p) continue;
      // If player died in previous round, reset weapons & armor so economy buys fresh
      if (!p.alive) {
        p.primaryWeaponId = null;
        p.secondaryWeaponId = state.teams[p.teamId]?.side === 'T' ? 'glock' : 'usp';
        p.armor = 0;
        p.hasDefuseKit = false;
        p.grenades = [];
      }
      p.alive = true;
      p.hp = 100;
      p.state = 'IDLE';
      p.path = [];
      if (p.originalRole) {
        p.role = p.originalRole;
        p.isAdaptedRole = false;
      }
      p.targetNodeId = null;
      p.targetEnemyId = null;
      p.aimProgress = 0;
      p.shootTimer = 0;
      p.reactionTimer = 0;
      p.actionTimer = 0;
      p.knownEnemies.clear();
      (p as any).damageTaken = new Map();
      (p as any).flashedById = null;
      (p as any).flashedTick = 0;
      
      const team = state.teams[p.teamId];
      p.side = team ? team.side : 'T';
      
      const spawns = MapSystem.getSpawns(p.side);
      const spawnIdx = Object.values(state.players).filter(x => x && x.teamId === p.teamId).indexOf(p);
      p.currentNodeId = spawns[Math.max(0, spawnIdx) % spawns.length];
      const spawnNode = MapSystem.getNode(p.currentNodeId);
      p.position = { x: spawnNode ? spawnNode.x : 0, y: spawnNode ? spawnNode.y : 0 };
    }
    
    
    EconomySystem.processBuyPhase(state);

    // Competitive Realism: Trailing teams adapt tactically and buy utility when trailing heavily
    const t1Score = state.teams['t1']?.score || 0;
    const t2Score = state.teams['t2']?.score || 0;
    const leaderTeamId = t1Score > t2Score ? 't1' : (t2Score > t1Score ? 't2' : null);
    const trailingTeamId = leaderTeamId ? (leaderTeamId === 't1' ? 't2' : 't1') : null;
    const leaderScore = Math.max(t1Score, t2Score);
    const trailingScore = Math.min(t1Score, t2Score);

    if (trailingTeamId && trailingScore <= 1 && leaderScore >= 7) {
      for (const p of Object.values(state.players)) {
        if (!p) continue;
        if (p.teamId === trailingTeamId) {
          p.focus = 1.08;
          if (!p.grenades || p.grenades.length === 0) {
            p.grenades = ['flash', 'smoke'];
          }
        }
      }
    }
    
    // Reset strategies
    for (const team of Object.values(state.teams)) {
        team.strategy = 'DEFAULT';
    }
    
    (state as any).roundFirstKillId = null;

    
    state.events.push({
      type: 'ROUND_STARTED',
      tick: state.tick,
      data: { round: state.round }
    });
  }
  
  static update(state: MatchState) {
    if (state.phase === 'FREEZE') {
      if (state.tick >= 50) { 
        state.phase = 'LIVE';
        state.events.push({ type: 'ROUND_LIVE', tick: state.tick, data: null });
      }
    } else if (state.phase === 'LIVE') {
      
      TeamAI.update(state);
      PlayerAI.update(state);
      CombatSystem.update(state);
      BombSystem.update(state);
      
      // Keep bomb position synced with carrier
      if (state.bomb.state === 'CARRIED' && state.bomb.carrierId) {
          const carrier = state.players[state.bomb.carrierId];
          if (carrier && carrier.alive) {
              state.bomb.nodeId = carrier.currentNodeId;
          } else {
              state.bomb.state = 'DROPPED';
              state.bomb.carrierId = null;
              state.events.push({ type: 'BOMB_DROPPED', tick: state.tick, data: { nodeId: state.bomb.nodeId }});
          }
      }
      
      this.checkRoundEnd(state);
      
      // If bomb is planted, normal round time limit is ignored.
      if (state.tick >= 1150 && state.phase === 'LIVE' && state.bomb.state !== 'PLANTED' && state.bomb.state !== 'DEFUSING') { 
         this.endRound(state, 'TIME');
      }
    } else if (state.phase === 'POST_ROUND_COMBAT') {
      // Continue simulation for 5 seconds (50 ticks) after round end for exit kills
      TeamAI.update(state);
      PlayerAI.update(state);
      CombatSystem.update(state);
      
      const startTick = (state as any).postRoundTickStart || 0;
      if (state.tick - startTick >= 50) {
        state.phase = 'ROUND_END';
      }
    }
    state.tick++;
  }
  
  static checkRoundEnd(state: MatchState) {
    const teams = Object.values(state.teams);
    if (teams.length < 2) return;

    const tTeam = teams.find(t => t.side === 'T');
    const ctTeam = teams.find(t => t.side === 'CT');
    if (!tTeam || !ctTeam) return;
    
    let tAlive = 0;
    let ctAlive = 0;
    const players = Object.values(state.players);
    if (players.length === 0) return; // No players, no round end logic

    for (const p of players) {
      if (p && p.alive) {
        if (p.teamId === tTeam.id) tAlive++;
        else if (p.teamId === ctTeam.id) ctAlive++;
      }
    }
    
    if (state.bomb.state === 'EXPLODED') {
        this.endRound(state, 'EXPLOSION');
        return;
    }
    if (state.bomb.state === 'DEFUSED') {
        this.endRound(state, 'DEFUSE');
        return;
    }
    
    // Only end by elimination if at least one team was actually present
    const tTotal = players.filter(p => p.teamId === tTeam.id).length;
    const ctTotal = players.filter(p => p.teamId === ctTeam.id).length;

    if (tTotal > 0 && tAlive === 0 && state.bomb.state !== 'PLANTED' && state.bomb.state !== 'PLANTING' && state.bomb.state !== 'DEFUSING') {
      this.endRound(state, 'ELIMINATION');
    } else if (ctTotal > 0 && ctAlive === 0) {
      this.endRound(state, 'ELIMINATION');
    }
  }
  
  static endRound(state: MatchState, reason: 'ELIMINATION' | 'DEFUSE' | 'EXPLOSION' | 'TIME') {
    const tTeam = state.teams['t1']?.side === 'T' ? state.teams['t1'] : state.teams['t2'];
    const ctTeam = state.teams['t1']?.side === 'CT' ? state.teams['t1'] : state.teams['t2'];
    
    let tAlive = 0;
    let ctAlive = 0;
    for (const id in state.players) {
      const p = state.players[id];
      if (p && p.alive) {
        if (tTeam && p.teamId === tTeam.id) tAlive++;
        else if (ctTeam && p.teamId === ctTeam.id) ctAlive++;
      }
    }

    const hasBothAlive = tAlive > 0 && ctAlive > 0;
    state.phase = (reason !== 'ELIMINATION' && hasBothAlive) ? 'POST_ROUND_COMBAT' : 'ROUND_END';
    (state as any).postRoundTickStart = state.tick;
    
    let winnerId = '';
    if (reason === 'ELIMINATION') {
       if (tAlive === 0 && ctTeam) winnerId = ctTeam.id;
       else if (tTeam) winnerId = tTeam.id;
    } else if (reason === 'TIME' && ctTeam) {
       winnerId = ctTeam.id; 
    } else if (reason === 'DEFUSE' && ctTeam) {
       winnerId = ctTeam.id;
    } else if (reason === 'EXPLOSION' && tTeam) {
       winnerId = tTeam.id;
    }

    // 13:0 / 16:0 Shutout Guard:
    // A complete shutout is strictly impossible if rating difference is < 20.
    // Even if rating difference >= 20, 13:0 is extremely rare (~2.5% chance).
    const regTarget = state.format === 'MR15' ? 16 : 13;
    const opponentTeamId = winnerId === 't1' ? 't2' : (winnerId === 't2' ? 't1' : '');
    const currentWinnerTeam = winnerId ? state.teams[winnerId] : null;
    const opponentTeam = opponentTeamId ? state.teams[opponentTeamId] : null;

    if (currentWinnerTeam && opponentTeam && currentWinnerTeam.score === regTarget - 1 && opponentTeam.score === 0) {
      const t1Overall = (state as any).t1Overall || 100;
      const t2Overall = (state as any).t2Overall || 100;
      const leaderRating = winnerId === 't1' ? t1Overall : t2Overall;
      const trailingRating = winnerId === 't1' ? t2Overall : t1Overall;
      const ratingDiff = leaderRating - trailingRating;

      let allowShutout = false;
      if (ratingDiff >= 20) {
        const seedVal = (state.seed || 12345) + (state.round * 137);
        const rngRoll = ((seedVal * 9301 + 49297) % 233280) / 233280;
        const shutoutChance = Math.min(0.04, 0.015 + (ratingDiff - 20) * 0.001);
        if (rngRoll < shutoutChance) {
          allowShutout = true;
        }
      }

      if (!allowShutout) {
        // Trailing team tactically breaks the shutout! Score becomes 12:1 (or 15:1)
        winnerId = opponentTeamId;
        reason = 'TIME';
      }
    }

    const winner = winnerId ? state.teams[winnerId] : null;
    if (winner) winner.score++;
    
    if (winnerId) {
      EconomySystem.distributeRoundEndMoney(state, winnerId, reason);
    }
    
    // Check if team with opening kill converted to round win
    if ((state as any).roundFirstKillTeamId && (state as any).roundFirstKillTeamId === winnerId) {
      const openerId = (state as any).roundFirstKillId;
      const opener = openerId ? state.players[openerId] : null;
      if (opener && opener.statistics) {
        opener.statistics.openingKillsConverted = (opener.statistics.openingKillsConverted || 0) + 1;
      }
    }

    // Check if any surviving winner player closed out a clutch
    if (winnerId) {
      const winnerAlivePlayers = Object.values(state.players).filter(p => p && p.alive && p.teamId === winnerId);
      if (winnerAlivePlayers.length === 1) {
        const clutchCloser = winnerAlivePlayers[0];
        const opponentsFaced = (clutchCloser as any).clutchOpponentsAtStart;
        const killsInClutch = (clutchCloser as any).killsInClutch || 0;
        const opponentsAliveAtEnd = Object.values(state.players).filter(p => p && p.alive && p.teamId !== winnerId).length;

        // Validating genuine clutch:
        // 1. Elimination: player defeated enemies (opponentsAliveAtEnd === 0)
        // 2. Defuse: lone player defused bomb
        // 3. Explosion / Time: valid only if lone player actively fought/killed enemies or remaining enemies were <= 1
        let isLegitimateClutch = false;
        let effectiveOpponentsFaced = opponentsFaced;

        if (reason === 'ELIMINATION') {
          isLegitimateClutch = true;
        } else if (reason === 'DEFUSE') {
          isLegitimateClutch = true;
        } else if (reason === 'EXPLOSION' || reason === 'TIME') {
          if (opponentsFaced === 1) {
            isLegitimateClutch = true;
          } else if (killsInClutch >= 1 || opponentsAliveAtEnd <= 1) {
            isLegitimateClutch = true;
            effectiveOpponentsFaced = Math.min(opponentsFaced, killsInClutch + (opponentsAliveAtEnd === 0 ? 0 : 1));
          }
        }

        if (isLegitimateClutch && effectiveOpponentsFaced >= 1 && clutchCloser.statistics) {
          let clutchBonus = 0;
          if (effectiveOpponentsFaced === 1) {
            clutchCloser.statistics.clutchesWon1v1 = (clutchCloser.statistics.clutchesWon1v1 || 0) + 1;
            clutchBonus = RATING_CONFIG.EVENT_SWING?.CLUTCH['1v1'] || 0.03;
          } else if (effectiveOpponentsFaced === 2) {
            clutchCloser.statistics.clutchesWon1v2 = (clutchCloser.statistics.clutchesWon1v2 || 0) + 1;
            clutchBonus = RATING_CONFIG.EVENT_SWING?.CLUTCH['1v2'] || 0.05;
          } else if (effectiveOpponentsFaced === 3) {
            clutchCloser.statistics.clutchesWon1v3 = (clutchCloser.statistics.clutchesWon1v3 || 0) + 1;
            clutchBonus = RATING_CONFIG.EVENT_SWING?.CLUTCH['1v3'] || 0.06;
          } else if (effectiveOpponentsFaced === 4) {
            clutchCloser.statistics.clutchesWon1v4 = (clutchCloser.statistics.clutchesWon1v4 || 0) + 1;
            clutchBonus = RATING_CONFIG.EVENT_SWING?.CLUTCH['1v4'] || 0.07;
          } else if (effectiveOpponentsFaced >= 5) {
            clutchCloser.statistics.clutchesWon1v5 = (clutchCloser.statistics.clutchesWon1v5 || 0) + 1;
            clutchBonus = RATING_CONFIG.EVENT_SWING?.CLUTCH['1v5'] || 0.08;
          }
          clutchCloser.statistics.clutches = (clutchCloser.statistics.clutches || 0) + 1;
          clutchCloser.statistics.roundSwing = (clutchCloser.statistics.roundSwing || 0) + clutchBonus;
          (clutchCloser as any).roundClutchWon = true;
          (clutchCloser as any).contributedObjectiveInRound = true;
        }
      }
    }

    // Valuable Weapon Recovery Logic: If expensive weapons (AWP, AK, M4) are on the ground (fallen players),
      // surviving players with cheaper weapons should try to recover them.
      // This applies to ALL round end types, including ELIMINATION (winners scavenge before next round).
      const valuableWeaponIds = ['awp', 'ak47', 'm4a1s', 'm4a4', 'aug', 'sg553'];
      const allDeadBodies = Object.values(state.players).filter(p => !p.alive && p.primaryWeaponId && valuableWeaponIds.includes(p.primaryWeaponId));
      
      if (allDeadBodies.length > 0) {
        const allSurvivors = Object.values(state.players).filter(p => p.alive);
        
        // Sort bodies by weapon value (most expensive first)
        const sortedBodies = [...allDeadBodies].sort((a, b) => {
          const priceA = WEAPONS[a.primaryWeaponId!]?.price || 0;
          const priceB = WEAPONS[b.primaryWeaponId!]?.price || 0;
          return priceB - priceA;
        });

        for (const deadBody of sortedBodies) {
          const weaponId = deadBody.primaryWeaponId!;
          const weaponPrice = WEAPONS[weaponId]?.price || 0;

          // Find the survivor who would benefit most from this weapon
          // Rules:
          // 1. Must be alive
          // 2. Weapon must be a significant upgrade (+$500) OR the player has NO primary weapon
          // 3. Snipers ALWAYS prioritize picking up an AWP if they don't have one
          const candidate = allSurvivors
            .filter(s => {
              const rLower = (s.role || '').toLowerCase();
              const isSniper = rLower.includes('sniper') || rLower.includes('awp') || rLower.includes('снайпер');
              
              if (isSniper && weaponId === 'awp' && s.primaryWeaponId !== 'awp') return true;
              
              const myWeaponPrice = s.primaryWeaponId ? (WEAPONS[s.primaryWeaponId]?.price || 0) : 0;
              return myWeaponPrice < (weaponPrice - 500);
            })
            .sort((a, b) => {
              const rA = (a.role || '').toLowerCase();
              const rB = (b.role || '').toLowerCase();
              const isSniperA = rA.includes('sniper') || rA.includes('awp');
              const isSniperB = rB.includes('sniper') || rB.includes('awp');

              // Snipers get priority for AWP
              if (weaponId === 'awp') {
                if (isSniperA && !isSniperB) return -1;
                if (!isSniperA && isSniperB) return 1;
              }

              // Otherwise prioritize players with NO primary weapon
              const hasA = !!a.primaryWeaponId;
              const hasB = !!b.primaryWeaponId;
              if (hasA !== hasB) return hasA ? 1 : -1;

              // Then by price (poorer players first)
              const priceA = a.primaryWeaponId ? (WEAPONS[a.primaryWeaponId]?.price || 0) : 0;
              const priceB = b.primaryWeaponId ? (WEAPONS[b.primaryWeaponId]?.price || 0) : 0;
              if (priceA !== priceB) return priceA - priceB;
              
              // Then by proximity
              const distA = MapSystem.getDistance(MapSystem.getNode(a.currentNodeId), MapSystem.getNode(deadBody.currentNodeId));
              const distB = MapSystem.getDistance(MapSystem.getNode(b.currentNodeId), MapSystem.getNode(deadBody.currentNodeId));
              return distA - distB;
            })[0];

          if (candidate) {
            const dist = MapSystem.getDistance(MapSystem.getNode(candidate.currentNodeId), MapSystem.getNode(deadBody.currentNodeId));
            
            // Pickup chance:
            // Winners always pick up if they are reasonably close (< 100 distance).
            // Losers only pick up if they are very close or it's a non-elimination round (saving).
            const isWinner = candidate.teamId === winnerId;
            let baseChance = isWinner ? 0.98 : 0.4;
            if (reason === 'TIME' || reason === 'DEFUSE' || reason === 'EXPLOSION') {
               if (!isWinner) baseChance = 0.85; // Losers saving in non-elimination rounds
            }

            const distPenalty = Math.max(0, (dist - 60) / 400);
            const pickupChance = Math.max(0.1, baseChance - distPenalty);
            
            if (CombatSystem.random() < pickupChance) {
              const oldWeapon = candidate.primaryWeaponId;
              candidate.primaryWeaponId = weaponId;
              deadBody.primaryWeaponId = null; 
              
              state.events.push({
                type: 'WEAPON_SAVED',
                tick: state.tick,
                data: { 
                  playerId: candidate.id, 
                  weaponId: weaponId, 
                  fromPlayerId: deadBody.id,
                  droppedWeaponId: oldWeapon,
                  isEnemyWeapon: deadBody.teamId !== candidate.teamId
                }
              });
              
              // Remove candidate from scavengers list so they don't pick up 2 guns
              const idx = allSurvivors.indexOf(candidate);
              if (idx > -1) allSurvivors.splice(idx, 1);
            }
          }
        }
      }

    const teamsList = Object.values(state.teams);
    
    for (const p of Object.values(state.players)) {
      if (!p || !p.statistics) continue;
      const rKills = (p as any).roundKills !== undefined
        ? (p as any).roundKills
        : Math.max(0, p.statistics.kills - ((p as any).lastRoundKills || 0));
      const rAssists = (p as any).roundAssists !== undefined
        ? (p as any).roundAssists
        : Math.max(0, p.statistics.assists - ((p as any).lastRoundAssists || 0));

      if (rKills === 1) {
        p.statistics.k1 = (p.statistics.k1 || 0) + 1;
      } else if (rKills === 2) {
        p.statistics.k2 = (p.statistics.k2 || 0) + 1;
        p.statistics.roundSwing = (p.statistics.roundSwing || 0) + (RATING_CONFIG.EVENT_SWING?.MULTI_KILL.k2 || 0.02);
      } else if (rKills === 3) {
        p.statistics.k3 = (p.statistics.k3 || 0) + 1;
        p.statistics.roundSwing = (p.statistics.roundSwing || 0) + (RATING_CONFIG.EVENT_SWING?.MULTI_KILL.k3 || 0.04);
      } else if (rKills === 4) {
        p.statistics.k4 = (p.statistics.k4 || 0) + 1;
        p.statistics.roundSwing = (p.statistics.roundSwing || 0) + (RATING_CONFIG.EVENT_SWING?.MULTI_KILL.k4 || 0.06);
      } else if (rKills >= 5) {
        p.statistics.k5 = (p.statistics.k5 || 0) + 1;
        p.statistics.roundSwing = (p.statistics.roundSwing || 0) + (RATING_CONFIG.EVENT_SWING?.MULTI_KILL.k5 || 0.08);
      }

      // KAST: Strict HLTV CS2 standards (Kill, Assist on killed enemy, Survived a won round, or Traded within window)
      const hasKill = rKills > 0;
      const hasAssist = rAssists > 0;
      const hasSurvived = p.alive && p.teamId === winnerId;
      const hasBeenTraded = !p.alive && !!(p as any).wasTradedInRound;

      if (hasKill || hasAssist || hasSurvived || hasBeenTraded) {
        p.statistics.kastRounds = (p.statistics.kastRounds || 0) + 1;
      } else {
        // Zero-contribution round: died without kill, assist, survival or trade in a lost round
        // Player negatively impacted team's chances in this round
        if (!p.alive && p.teamId !== winnerId) {
          p.statistics.roundSwing = (p.statistics.roundSwing || 0) - 0.025;
        }
      }
    }
    
    state.roundLogs.push({
      round: state.round,
      winnerTeamId: winnerId,
      reason,
      duration: state.tick,
      t1Score: teamsList[0]?.score || 0,
      t2Score: teamsList[1]?.score || 0,
      kills: Object.values(state.players).reduce((sum, p) => sum + (p?.statistics?.kills || 0), 0),
      firstKillId: (state as any).roundFirstKillId,
      t1EcoType: teamsList[0]?.tactic || 'ECO',
      t2EcoType: teamsList[1]?.tactic || 'ECO',
      aces: Object.values(state.players).filter(p => p && p.statistics && p.statistics.kills - (p.lastRoundKills || 0) >= 5).map(p => p.name)
    });
    
    state.events.push({
      type: 'ROUND_ENDED',
      tick: state.tick,
      data: { winnerId, reason }
    });
  }
}
