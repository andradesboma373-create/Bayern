import { MatchState, Player, Vector2D } from '../models';
import { MapSystem } from '../systems/MapSystem';
import { CombatSystem } from '../systems/CombatSystem';

export interface BehaviorPriorities {
  aggression: number; // Seek duels, push sites
  caution: number;    // Hold angles, wait for info
  support: number;    // Stay with team, trade
  lurk: number;       // Go separate ways, rotate late
  objective: number;  // Focus on bomb/defuse
}

export class PlayerAI {
  static update(state: MatchState) {
    const alivePlayers = Object.values(state.players).filter(p => p.alive);
    PlayerAI.updatePerception(state, alivePlayers);
    for (const p of alivePlayers) {
      PlayerAI.checkRoleAdaptation(state, p);
      PlayerAI.makeDecision(state, p);
    }
    for (const p of alivePlayers) {
      PlayerAI.executeMovement(p);
    }
  }

  static checkRoleAdaptation(state: MatchState, p: Player) {
    if (!p.originalRole) p.originalRole = p.role;
    const team = state.teams[p.teamId];
    const teamAlive = Object.values(state.players).filter(pl => pl.teamId === p.teamId && pl.alive);
    
    // 1. Sniper -> Rifler Adaptation
    if (p.role === 'Sniper') {
        const hasAWP = p.primaryWeaponId === 'awp';
        // If lost AWP or it's a very tight situation where AWP is a liability
        if (!hasAWP || (teamAlive.length <= 2 && state.tick > 800)) {
            p.role = 'Rifler';
            p.isAdaptedRole = true;
        }
    }

    // 2. Lurker -> Entry/Support Adaptation
    if (p.role === 'Lurker') {
        // If team is executing and lurker is close to them or if team is dying
        const isExecuting = team.strategy.includes('EXECUTE') || team.strategy.includes('FAST');
        if (isExecuting && teamAlive.length <= 3) {
            p.role = 'Entry';
            p.isAdaptedRole = true;
        }
    }

    // 3. Rifler -> Entry Adaptation (2nd entry / trade fragger pushes if primary entry fell)
    if (p.role === 'Rifler') {
        const isExecuting = team.strategy.includes('EXECUTE') || team.strategy.includes('FAST');
        const entryAlive = teamAlive.some(pl => pl.role === 'Entry' || (pl as any).originalRole === 'Entry');
        if (isExecuting && !entryAlive) {
            p.role = 'Entry';
            p.isAdaptedRole = true;
        }
    }

    // 4. Revert to original role if situation normalizes (e.g. next round or found AWP)
    if (p.isAdaptedRole && p.role === 'Rifler' && p.originalRole === 'Sniper' && p.primaryWeaponId === 'awp') {
        p.role = 'Sniper';
        p.isAdaptedRole = false;
    }
  }
  
  static updatePerception(state: MatchState, alivePlayers: Player[]) {
    // 1. Direct visual detection
    // Track shared spots per team per tick to avoid redundant multi-broadcasts
    const sharedSpotsTeamT = new Set<string>();
    const sharedSpotsTeamCT = new Set<string>();

    for (const p1 of alivePlayers) {
      for (const p2 of alivePlayers) {
        if (p1.teamId !== p2.teamId) {
          if (MapSystem.hasLineOfSight(p1.currentNodeId, p2.currentNodeId)) {
             const existingMem = p1.knownEnemies.get(p2.id);
             if (existingMem) {
                 existingMem.position.x = p2.position.x;
                 existingMem.position.y = p2.position.y;
                 existingMem.nodeId = p2.currentNodeId;
                 existingMem.timestamp = state.tick;
                 existingMem.confidence = 1.0;
             } else {
                 p1.knownEnemies.set(p2.id, { 
                     enemyId: p2.id,
                     position: { x: p2.position.x, y: p2.position.y }, 
                     nodeId: p2.currentNodeId,
                     timestamp: state.tick,
                     confidence: 1.0
                 });
             }

             // Team radar & voice comms: share spotted enemy info once per team per tick
             const teamSharedSet = p1.side === 'T' ? sharedSpotsTeamT : sharedSpotsTeamCT;
             if (!teamSharedSet.has(p2.id)) {
               teamSharedSet.add(p2.id);
               for (const teammate of alivePlayers) {
                 if (teammate.teamId === p1.teamId && teammate.id !== p1.id) {
                   const tMem = teammate.knownEnemies.get(p2.id);
                   if (tMem) {
                     tMem.position.x = p2.position.x;
                     tMem.position.y = p2.position.y;
                     tMem.nodeId = p2.currentNodeId;
                     tMem.timestamp = state.tick;
                     tMem.confidence = Math.max(tMem.confidence, 0.9);
                   } else {
                     teammate.knownEnemies.set(p2.id, {
                       enemyId: p2.id,
                       position: { x: p2.position.x, y: p2.position.y },
                       nodeId: p2.currentNodeId,
                       timestamp: state.tick,
                       confidence: 0.9
                     });
                   }
                 }
               }
             }
          }
        }
      }
      
      // Decay memory
      for (const [enemyId, memory] of p1.knownEnemies.entries()) {
          const age = state.tick - memory.timestamp;
          memory.confidence -= 0.008; 
          if (memory.confidence <= 0 || age > 200) p1.knownEnemies.delete(enemyId);
      }
    }
  }
  
  static makeDecision(state: MatchState, p: Player) {
    if (!p || !p.alive) return;
    const team = state.teams[p.teamId];
    if (!team) return;
    
    // 1. Combat & Immediate Actions (Highest Priority)
    const priorities = PlayerAI.calculatePriorities(state, p, team);
    
    if (p.state === 'ENGAGING' && p.targetEnemyId) {
       const target = state.players[p.targetEnemyId];
       if (!target || !target.alive || !MapSystem.hasLineOfSight(p.currentNodeId, target.currentNodeId)) {
          p.state = 'IDLE';
          p.targetEnemyId = null;
          p.aimProgress = 0;
       } else {
          // Dynamic tactical retreat: if team strategy is SAVE or heavily wounded
          if (team.strategy === 'SAVE') {
              // If already holding a safe position or in post-round, hold angle and ambush greedy hunters!
              const isHoldingSafe = !!(p as any).wasHoldingBeforeEngage || p.currentNodeId === PlayerAI.getSafeNode(p) || state.phase === 'POST_ROUND_COMBAT';
              if (!isHoldingSafe) {
                const dist = MapSystem.getDistance(MapSystem.getNode(p.currentNodeId), MapSystem.getNode(target.currentNodeId));
                if (dist > 40) {
                  p.state = 'MOVING';
                  p.targetEnemyId = null;
                  PlayerAI.routeTo(p, PlayerAI.getSafeNode(p));
                  return;
                }
              }
              // If holding safe spot, stay engaged and ambush the hunter!
          } else if (p.hp < 30 && priorities.caution > 0.75 && CombatSystem.random() < 0.20) {
              p.state = 'MOVING';
              p.targetEnemyId = null;
              PlayerAI.routeTo(p, PlayerAI.getSafeNode(p));
              return;
          }
          return;
       }
    }
    
    if (p.state === 'PLANTING') {
        for (const [enemyId, mem] of p.knownEnemies.entries()) {
            if (mem.confidence > 0.8) {
                const enemy = state.players[enemyId];
                if (enemy && enemy.alive && MapSystem.hasLineOfSight(p.currentNodeId, enemy.currentNodeId)) {
                    p.state = 'IDLE';
                    state.bomb.state = 'CARRIED';
                    break;
                }
            }
        }
        if (p.state === 'PLANTING') return;
    }
    if (p.state === 'DEFUSING') return;

    // 2. Target Selection
    let bestEnemyId: string | null = null;
    let minScore = Infinity;
    const pRole = (p.role || '').toLowerCase();
    const isSupport = pRole.includes('support') || pRole.includes('саппорт');

    for (const [enemyId, mem] of p.knownEnemies.entries()) {
       if (mem.confidence > 0.6) {
          const enemy = state.players[enemyId];
          if (enemy && enemy.alive && MapSystem.hasLineOfSight(p.currentNodeId, enemy.currentNodeId)) {
              let score = MapSystem.getDistance(MapSystem.getNode(p.currentNodeId), MapSystem.getNode(enemy.currentNodeId));
              
              if (enemy.targetEnemyId === p.id) score -= 70; // High threat
              else if (enemy.targetEnemyId && state.players[enemy.targetEnemyId]?.teamId === p.teamId) {
                  score -= isSupport ? 60 : 40; // Trade logic
              }
              if (enemy.hp < 40) score -= 25;
              
              // HVT (High Value Target) Priority:
              // If an enemy is carrying the round (2+ kills), opponents focus on shutting them down
              const enemyRoundKills = (enemy as any).roundKills || 0;
              if (enemyRoundKills >= 2) {
                score -= 30; // Focus on the carry
              }

              // Teamwork & Frag Distribution:
              // Teammates with fewer kills in round actively step up to duel,
              // while players who already have 2+ round kills provide crossfire cover.
              const pRoundKills = (p as any).roundKills || 0;
              if (pRoundKills === 0) {
                score -= 40; // Even more eager to find duel and contribute
              } else if (pRoundKills >= 2) {
                score += 35; // Hold crossfire, allow teammates to engage
              }

              score += CombatSystem.random() * 40; // Increased randomness in target selection
              
              if (score < minScore) {
                  minScore = score;
                  bestEnemyId = enemyId;
              }
          }
       }
    }

    if (bestEnemyId) {
       const wasHolding = p.state === 'HOLDING';
       (p as any).wasHoldingBeforeEngage = wasHolding;
       p.state = 'ENGAGING';
       p.targetEnemyId = bestEnemyId;
       p.path = [];
       p.targetNodeId = null;
       
       const playerAimRatio = ((p.aim || 100) - 100) * 0.002;
       const isEntry = pRole.includes('entry') || pRole.includes('opener') || pRole.includes('энтри');
       if (wasHolding) {
         p.aimProgress = Math.min(0.96, Math.max(0.82, 0.90 + playerAimRatio));
       } else if (isEntry) {
         p.aimProgress = Math.min(0.95, Math.max(0.86, 0.90 + playerAimRatio));
       } else {
         p.aimProgress = Math.min(0.92, Math.max(0.75, 0.85 + playerAimRatio));
       }
       
       let delay = 1.0 - ((p.reaction || 100) / 160);
       if (wasHolding) delay -= 0.25;
       else if (isEntry) delay -= 0.15;
       p.reactionTimer = state.tick + Math.max(0, Math.round(delay));
       return;
    }
    
    // 3. Strategic decisions
    if (team.strategy === 'SAVE') {
        if (p.state !== 'HOLDING' && p.state !== 'MOVING') {
            PlayerAI.routeTo(p, PlayerAI.getSafeNode(p));
        }
        return;
    }
    
    // 4. Movement and pathing based on Dynamic Priorities
    if (p.state !== 'MOVING' || (p.path && p.path.length === 0 && !p.targetNodeId)) {
        if (p.state === 'HOLDING' && state.tick < p.actionTimer) {
            const shouldRotate = PlayerAI.checkRotationTrigger(state, p, team);
            if (shouldRotate) {
                p.state = 'IDLE';
                p.actionTimer = 0;
            } else {
                return; 
            }
        }
        
        PlayerAI.determineNextNode(state, p, team);
    }
  }

  static calculatePriorities(state: MatchState, p: Player, team: any): BehaviorPriorities {
    const pRole = (p.role || '').toLowerCase();
    const isSniper = pRole.includes('sniper') || pRole.includes('awp') || pRole.includes('снайпер');
    const isLurker = pRole.includes('lurker') || pRole.includes('люркер');
    const isEntry = pRole.includes('entry') || pRole.includes('opener') || pRole.includes('энтри');
    const isSupport = pRole.includes('support') || pRole.includes('саппорт');
    const isIGL = pRole.includes('igl') || pRole.includes('captain') || pRole.includes('капитан');

    // 1. Base weights from role specialization
    const priorities: BehaviorPriorities = {
      aggression: isEntry ? 1.00 : (isSniper ? 0.40 : (isSupport ? 0.42 : (isIGL ? 0.45 : 0.70))),
      caution: isEntry ? 0.35 : (isSniper ? 0.90 : (isLurker ? 0.85 : (isIGL ? 0.75 : (isSupport ? 0.80 : 0.38)))),
      support: isSupport ? 1.00 : (isIGL ? 0.80 : 0.40),
      lurk: isLurker ? 0.95 : 0.05,
      objective: 0.75
    };

    // 2. HP influence (Survival instinct)
    if (p.hp < 40) {
      priorities.caution += 0.3;
      priorities.aggression -= 0.4;
    }

    // 3. Situational awareness (teammates/enemies)
    const aliveTeammates = Object.values(state.players).filter(pl => pl.teamId === p.teamId && pl.alive && pl.id !== p.id);
    const aliveEnemies = Object.values(state.players).filter(pl => pl.teamId !== p.teamId && pl.alive);
    
    const advantage = aliveTeammates.length - aliveEnemies.length;
    
    // Man down: be more cautious or lurk more to find opening
    if (advantage < 0) {
      priorities.caution += 0.2;
      priorities.lurk += 0.1;
    } else if (advantage > 0) {
      priorities.aggression += 0.15; // Confidence boost
    }

    // 4. Weapon specialization
    const hasAWP = p.primaryWeaponId === 'awp';
    if (hasAWP) {
      priorities.caution += 0.2; // Sniper plays more for position
      priorities.aggression -= 0.1; 
    }

    // 5. Strategy adjustment
    if (team.strategy.includes('FAST')) {
      priorities.aggression += 0.4;
      priorities.caution -= 0.3;
    } else if (team.strategy === 'DEFAULT') {
      priorities.caution += 0.2;
    } else if (team.strategy === 'SAVE') {
      priorities.caution = 1.0;
      priorities.aggression = 0;
    }

    // Normalize
    const keys = Object.keys(priorities) as (keyof BehaviorPriorities)[];
    for (const key of keys) {
      priorities[key] = Math.max(0, Math.min(1.0, priorities[key]));
    }

    return priorities;
  }

  static determineNextNode(state: MatchState, p: Player, team: any) {
     const priorities = PlayerAI.calculatePriorities(state, p, team);
     const pRoleLower = (p.role || '').toLowerCase();
     const isSniper = pRoleLower.includes('sniper') || pRoleLower.includes('awp') || pRoleLower.includes('снайпер');
     const isEntry = pRoleLower.includes('entry') || pRoleLower.includes('opener') || pRoleLower.includes('энтри');
     const myIdx = team?.players ? team.players.indexOf(p.id) : 0;
     const teamPlayers = team?.players ? team.players.map((id: string) => state.players[id]).filter(Boolean) : [];

     if (p.side === 'T') {
        // 1. Objective is always top priority for bomb carrier or if bomb is dropped
        if (state.bomb.state === 'CARRIED' && state.bomb.carrierId === p.id) {
            PlayerAI.routeTo(p, (team.strategy.includes('_B')) ? 'b_site' : 'a_site');
            return;
        }
        
        if (state.bomb.state === 'DROPPED' && team.strategy === 'RECOVER_BOMB') {
            PlayerAI.routeTo(p, state.bomb.nodeId || 'mid');
            return;
        }

        // 2. Post-plant behavior
        if (state.bomb.state === 'PLANTED' || team.strategy === 'DEFEND_BOMB') {
            const bombNode = state.bomb.nodeId || 'a_site';
            // If cautious, find a hiding spot or long range angle. If aggressive, peek the bomb.
            if (priorities.caution > 0.6) {
                const safeSpots = p.currentNodeId?.includes('site') ? [p.currentNodeId] : (bombNode === 'a_site' ? ['a_site', 'jungle', 'connector'] : ['b_site', 'short', 'b_apps']);
                PlayerAI.routeTo(p, safeSpots[myIdx % safeSpots.length]);
            } else {
                PlayerAI.routeTo(p, bombNode);
            }
            return;
        }

        // 3. Dynamic tactical movement
        const isExecuting = team.strategy.includes('EXECUTE') || team.strategy.includes('FAST');
        const isHolding = team.strategy === 'MID_ROUND_HOLD' || team.strategy === 'DEFAULT';
        const targetSite = team.strategy.includes('_B') ? 'b_site' : 'a_site';
        const entryNodes = team.strategy.includes('_B') ? ['b_apps', 'short'] : ['a_main', 't_ramp', 'connector'];
        
        // Lurk/Flank logic: some players go opposite site
        const isLurker = pRoleLower.includes('lurker') || pRoleLower.includes('люркер');
        if ((isLurker || priorities.lurk > 0.8) && state.tick > 120) {
            const oppositeSite = team.strategy.includes('_B') ? 'a_site' : 'b_site';
            PlayerAI.routeTo(p, oppositeSite);
            return;
        }

        // MID_ROUND_HOLD logic: players stay at entry nodes and wait for picks
        if (isHolding && !p.currentNodeId.includes('site')) {
            const myHoldNode = entryNodes[myIdx % entryNodes.length];
            if (p.currentNodeId === myHoldNode) {
                p.state = 'HOLDING';
                // Hold longer to search for picks
                p.actionTimer = state.tick + (isSniper ? 60 : 45);
                return;
            }
            PlayerAI.routeTo(p, myHoldNode);
            return;
        }

        // Support role: Tactical movement during execution
        // They stay at entry nodes longer to throw utility before entering site
        const isSupport = pRoleLower.includes('support') || pRoleLower.includes('саппорт');
        if (isSupport && isExecuting && !p.currentNodeId.includes('site')) {
            const myEntryNode = entryNodes[myIdx % entryNodes.length];
            if (p.currentNodeId === myEntryNode && state.tick < 300) {
                // Holding at entry to "throw utility"
                p.state = 'HOLDING';
                p.actionTimer = state.tick + 25;
                return;
            }
            PlayerAI.routeTo(p, myEntryNode);
            return;
        }

        // Aggressive Entry logic: Entry Fragger pushes site on execution
        const isEntry = pRoleLower.includes('entry') || pRoleLower.includes('opener') || pRoleLower.includes('энтри');
        if (isEntry || priorities.aggression > 0.90) {
            const myEntryNode = entryNodes[myIdx % entryNodes.length];
            // If defaulting/holding, stay with team at entry node rather than solo-rushing
            if (isHolding && !isExecuting) {
                if (p.currentNodeId === myEntryNode) {
                    p.state = 'HOLDING';
                    p.actionTimer = state.tick + 35;
                    return;
                }
                PlayerAI.routeTo(p, myEntryNode);
                return;
            }
            PlayerAI.routeTo(p, targetSite);
            return;
        }

        // Support/Hold logic for others (Snipers, etc.)
        if (priorities.caution > 0.6 || isSniper) {
            let holdNode = 'mid';
            if (team.strategy.includes('_A')) holdNode = priorities.aggression > 0.5 ? 'a_main' : 't_ramp';
            else if (team.strategy.includes('_B')) holdNode = priorities.aggression > 0.5 ? 'b_apps' : 'mid_t_entrance';
            
            if (p.currentNodeId === holdNode) {
                p.state = 'HOLDING';
                p.actionTimer = state.tick + (isSniper ? 50 : 30);
            } else {
                PlayerAI.routeTo(p, holdNode);
            }
            return;
        }

        // Default: Move with team
        const isRifler = pRoleLower.includes('rifler') || pRoleLower.includes('рифлер');
        if (isRifler && isExecuting) {
            // Riflers follow the entry fraggers to the site for trading, 
            // but some might hold a flank or stay back slightly
            if (CombatSystem.random() < 0.70) {
              PlayerAI.routeTo(p, targetSite);
              return;
            } else {
              const myHoldNode = entryNodes[myIdx % entryNodes.length];
              PlayerAI.routeTo(p, myHoldNode);
              return;
            }
        }

        const strategyNode = team.strategy.includes('_B') ? 'b_apps' : (team.strategy.includes('_A') ? 'a_main' : 'mid');
        PlayerAI.routeTo(p, strategyNode);

     } else {
        // --- CT Side ---
        if (state.bomb.state === 'PLANTED' || team.strategy === 'RETAKE') {
            PlayerAI.routeTo(p, state.bomb.nodeId || 'a_site');
            return;
        }

        // Rotation logic based on perception
        let enemiesOnA = 0;
        let enemiesOnB = 0;
        for (const [, mem] of p.knownEnemies.entries()) {
            if (mem.confidence > 0.4) {
                if (['a_site', 'a_main', 't_ramp', 'connector'].includes(mem.nodeId)) enemiesOnA++;
                if (['b_site', 'b_apps', 'b_apps_entrance', 'short'].includes(mem.nodeId)) enemiesOnB++;
            }
        }

        if (enemiesOnA >= 2 && !p.currentNodeId?.includes('a_')) {
            PlayerAI.routeTo(p, 'a_site');
            return;
        }
        if (enemiesOnB >= 2 && !p.currentNodeId?.includes('b_')) {
            PlayerAI.routeTo(p, 'b_site');
            return;
        }

        // Defensive positioning: Every CT is assigned to hold a key site or zone
        const ctPositions = [
          'a_site',       // A Site anchor
          'connector',    // A rotator / Connector
          'window',       // Mid sniper / window
          'b_site',       // B Site anchor
          'short'         // B Short / Catwalk
        ];
        
        let assignedSpot = isSniper ? 'window' : ctPositions[myIdx % ctPositions.length];
        
        if (p.currentNodeId === assignedSpot) {
            p.state = 'HOLDING';
            // Hold angle defensively and wait for enemy contact or rotation trigger
            p.actionTimer = state.tick + 100;
        } else {
            PlayerAI.routeTo(p, assignedSpot);
        }
     }
  }

  static getSafeNode(p: Player): string {
    return p.side === 'CT' ? 'ct_spawn' : 't_spawn';
  }

  static checkRotationTrigger(state: MatchState, p: Player, team: any): boolean {
    if (p.side === 'CT') {
      // 1. Bomb spotted at other site
      if (state.bomb.state === 'CARRIED' || state.bomb.state === 'DROPPED') {
        const bombNodeId = state.bomb.nodeId;
        if (bombNodeId) {
          const isAtA = bombNodeId.includes('a_site') || bombNodeId === 'a_main';
          const isAtB = bombNodeId.includes('b_site') || bombNodeId === 'b_apps';
          
          if (isAtA && p.currentNodeId.includes('b_')) return true;
          if (isAtB && p.currentNodeId.includes('a_')) return true;
        }
      }
      
      // 2. Teammates reporting multiple enemies at other site
      let enemiesOnA = 0;
      let enemiesOnB = 0;
      for (const [, mem] of p.knownEnemies.entries()) {
        if (mem.confidence > 0.6) {
          if (['a_site', 'a_main', 't_ramp', 'connector'].includes(mem.nodeId)) enemiesOnA++;
          if (['b_site', 'b_apps', 'b_apps_entrance', 'short'].includes(mem.nodeId)) enemiesOnB++;
        }
      }
      
      if (enemiesOnA >= 2 && p.currentNodeId.includes('b_')) return true;
      if (enemiesOnB >= 2 && p.currentNodeId.includes('a_')) return true;
    } else {
      // T side rotation: follow strategy if out of position
      if (team.strategy.includes('_A') && p.currentNodeId.includes('b_')) return true;
      if (team.strategy.includes('_B') && p.currentNodeId.includes('a_')) return true;
    }
    
    return false;
  }

  static routeTo(p: Player, targetNodeId: string) {
     if (p.currentNodeId === targetNodeId) {
         p.state = 'HOLDING';
         p.actionTimer = 0;
         p.path = [];
         p.targetNodeId = null;
         return;
     }
     if (p.state === 'MOVING' && p.path && p.path.length > 0 && p.path[p.path.length - 1] === targetNodeId) {
         return;
     }
     const path = MapSystem.findPath(p.currentNodeId, targetNodeId);
     if (path.length > 1) {
         p.path = path.slice(1);
         p.targetNodeId = p.path[0];
         p.state = 'MOVING';
     } else {
         p.state = 'HOLDING';
         p.actionTimer = 0; 
     }
  }
  
  static executeMovement(p: Player) {
    if (p.state === 'MOVING' && p.targetNodeId) {
       const targetNode = MapSystem.getNode(p.targetNodeId);
       if (!targetNode) { p.state = 'IDLE'; return; }
       
       const dx = targetNode.x - p.position.x;
       const dy = targetNode.y - p.position.y;
       const dist = Math.hypot(dx, dy);
       
       if (dist <= p.speed) {
         p.position.x = targetNode.x;
         p.position.y = targetNode.y;
         p.currentNodeId = p.targetNodeId;
         p.path.shift();
         
         if (p.path.length > 0) {
             p.targetNodeId = p.path[0];
         } else {
             p.targetNodeId = null;
             p.state = 'IDLE';
         }
       } else {
         p.position.x += (dx / dist) * p.speed;
         p.position.y += (dy / dist) * p.speed;
       }
    }
  }
}

