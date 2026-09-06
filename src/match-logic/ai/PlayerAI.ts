import { MatchState, Player, Vector2D } from '../models';
import { MapSystem } from '../systems/MapSystem';
import { CombatSystem } from '../systems/CombatSystem';

export class PlayerAI {
  static update(state: MatchState) {
    const alivePlayers = Object.values(state.players).filter(p => p.alive);
    this.updatePerception(state, alivePlayers);
    for (const p of alivePlayers) {
      this.makeDecision(state, p);
    }
    for (const p of alivePlayers) {
      this.executeMovement(p);
    }
  }
  
  static updatePerception(state: MatchState, alivePlayers: Player[]) {
    // 1. Direct visual detection
    for (const p1 of alivePlayers) {
      for (const p2 of alivePlayers) {
        if (p1.teamId !== p2.teamId) {
          if (MapSystem.hasLineOfSight(p1.currentNodeId, p2.currentNodeId)) {
             p1.knownEnemies.set(p2.id, { 
                 enemyId: p2.id,
                 position: { ...p2.position }, 
                 nodeId: p2.currentNodeId,
                 timestamp: state.tick,
                 confidence: 1.0
             });

             // Team radar & voice comms: share spotted enemy info with all alive teammates
             for (const teammate of alivePlayers) {
               if (teammate.teamId === p1.teamId && teammate.id !== p1.id) {
                 teammate.knownEnemies.set(p2.id, {
                   enemyId: p2.id,
                   position: { ...p2.position },
                   nodeId: p2.currentNodeId,
                   timestamp: state.tick,
                   confidence: 0.9
                 });
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
    
    // If currently engaging
    if (p.state === 'ENGAGING' && p.targetEnemyId) {
       const target = state.players[p.targetEnemyId];
       if (!target || !target.alive || !MapSystem.hasLineOfSight(p.currentNodeId, target.currentNodeId)) {
          p.state = 'IDLE';
          p.targetEnemyId = null;
          p.aimProgress = 0;
       } else {
          // Tactical fall-back when heavily wounded
          if (p.hp < 30 && CombatSystem.random() < 0.08) {
              p.state = 'MOVING';
              p.targetEnemyId = null;
              this.routeTo(p, this.getSafeNode(p));
              return;
          }
          return;
       }
    }
    
    // If planting or defusing
    if (p.state === 'PLANTING') {
        // If an enemy enters direct line of sight within close range and shoots, abort plant to fight
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

    // Check for direct combat targets with high confidence in line of sight
    let bestEnemyId: string | null = null;
    let minScore = Infinity;
    const isSupport = (p.role || '').toLowerCase().includes('support') || (p.role || '').toLowerCase().includes('саппорт');

    for (const [enemyId, mem] of p.knownEnemies.entries()) {
       if (mem.confidence > 0.6) {
          const enemy = state.players[enemyId];
          if (enemy && enemy.alive && MapSystem.hasLineOfSight(p.currentNodeId, enemy.currentNodeId)) {
              let score = MapSystem.getDistance(MapSystem.getNode(p.currentNodeId), MapSystem.getNode(enemy.currentNodeId));
              
              // Highest priority: Enemy that is actively shooting / targeting ME
              if (enemy.targetEnemyId === p.id) {
                  score -= 60;
              }
              // Trade / Refrag bonus: Enemy currently engaged with a teammate
              else if (enemy.targetEnemyId && state.players[enemy.targetEnemyId]?.teamId === p.teamId) {
                  score -= isSupport ? 50 : 35;
              }
              
              // Finish off wounded enemies
              if (enemy.hp < 40) {
                  score -= 20;
              }
              
              // Natural tactical angle split so multiple enemies in the same spot aren't all targeted by the same index
              score += CombatSystem.random() * 25;
              
              if (score < minScore) {
                  minScore = score;
                  bestEnemyId = enemyId;
              }
          }
       }
    }

    if (bestEnemyId) {
       const wasHolding = p.state === 'HOLDING';
       const pRole = (p.role || '').toLowerCase();
       const isEntry = pRole.includes('entry') || pRole.includes('opener') || pRole.includes('энтри');
       const isLurker = pRole.includes('lurker') || pRole.includes('люркер');
       const isSniper = pRole.includes('sniper') || pRole.includes('awp') || pRole.includes('снайпер');
       
       p.state = 'ENGAGING';
       p.targetEnemyId = bestEnemyId;
       p.path = [];
       p.targetNodeId = null;
       
       // Pro-level crosshair placement and reaction readiness across all roles
       p.aimProgress = wasHolding ? (isSniper ? 0.98 : 0.90) : 0.86;
       
       // Dynamic reaction delay based on holding vs peeking and individual reaction stat
       let delay = 1.0 - (p.reaction / 180);
       if (wasHolding) delay -= isSniper ? 0.40 : 0.25;
       
       p.reactionTimer = state.tick + Math.max(0, Math.round(delay));
       return;
    }
    
    // Team SAVE strategy
    if (team.strategy === 'SAVE') {
        if (p.state !== 'HOLDING' && p.state !== 'MOVING') {
            this.routeTo(p, this.getSafeNode(p));
        }
        return;
    }
    
    // Movement and pathing decisions
    if (p.state !== 'MOVING' || (p.path.length === 0 && !p.targetNodeId)) {
        if (p.state === 'HOLDING' && state.tick < p.actionTimer) {
            // Check if rotation is needed even while holding
            const shouldRotate = this.checkRotationTrigger(state, p, team);
            if (shouldRotate) {
                p.state = 'IDLE';
                p.actionTimer = 0;
            } else {
                return; 
            }
        }
        
        this.determineNextNode(state, p, team);
    }
  }

  static checkRotationTrigger(state: MatchState, p: Player, team: any): boolean {
    if (p.side === 'CT') {
      if (team.strategy === 'RETAKE') return true;
      if (state.bomb.state === 'PLANTED' || state.bomb.state === 'PLANTING') return true;
      
      let knownEnemiesOnA = 0;
      let knownEnemiesOnB = 0;
      for (const [, mem] of p.knownEnemies.entries()) {
        if (mem.confidence > 0.5) {
          if (mem.nodeId === 'a_site' || mem.nodeId === 'a_main' || mem.nodeId === 't_ramp' || mem.nodeId === 'connector') knownEnemiesOnA++;
          if (mem.nodeId === 'b_site' || mem.nodeId === 'b_apps' || mem.nodeId === 'b_apps_entrance' || mem.nodeId === 'short') knownEnemiesOnB++;
        }
      }
      if (knownEnemiesOnA >= 1 && (p.currentNodeId === 'b_site' || p.currentNodeId === 'short')) return true;
      if (knownEnemiesOnB >= 1 && (p.currentNodeId === 'a_site' || p.currentNodeId === 'connector' || p.currentNodeId === 'jungle')) return true;
    }
    return false;
  }

  static getSafeNode(p: Player): string {
      return p.side === 'T' ? 't_spawn' : 'ct_spawn';
  }
  
  static determineNextNode(state: MatchState, p: Player, team: any) {
     const pRoleLower = (p.role || '').toLowerCase();
     const isSniper = pRoleLower.includes('sniper') || pRoleLower.includes('awp') || pRoleLower.includes('снайпер');
     const isLurker = pRoleLower.includes('lurker') || pRoleLower.includes('люркер');
     const isEntry = pRoleLower.includes('entry') || pRoleLower.includes('opener') || pRoleLower.includes('энтри');
     const isIGL = pRoleLower.includes('igl') || pRoleLower.includes('captain') || pRoleLower.includes('капитан');
     const teamPlayers = team?.players ? team.players.map((id: string) => state.players[id]).filter(Boolean) : [];
     const myIdx = team?.players ? team.players.indexOf(p.id) : 0;

     if (p.side === 'T') {
        // Bomb carrier logic
        if (state.bomb.state === 'CARRIED' && state.bomb.carrierId === p.id) {
            let targetSite = (team.strategy === 'EXECUTE_B' || team.strategy === 'FAST_B' || team.strategy === 'MID_SPLIT_B') ? 'b_site' : 'a_site';
            
            if (p.currentNodeId === targetSite) {
                let siteHasEnemies = false;
                for (const [enemyId, mem] of p.knownEnemies.entries()) {
                    if (mem.confidence > 0.6) {
                        const enemy = state.players[enemyId];
                        if (enemy && enemy.alive && MapSystem.hasLineOfSight(p.currentNodeId, enemy.currentNodeId)) {
                            siteHasEnemies = true;
                            break;
                        }
                    }
                }
                if (!siteHasEnemies) {
                    p.state = 'PLANTING';
                    state.bomb.state = 'PLANTING';
                    state.bomb.nodeId = targetSite;
                    state.bomb.timer = state.tick + 35; 
                } else {
                    p.state = 'HOLDING';
                    p.actionTimer = state.tick + 10;
                }
            } else {
                this.routeTo(p, targetSite);
            }
            return;
        }
        
        // Post-plant defense
        if (team.strategy === 'DEFEND_BOMB') {
            const bombNode = state.bomb.nodeId || 'a_site';
            if (p.currentNodeId === bombNode) {
                p.state = 'HOLDING';
                p.actionTimer = state.tick + 60;
            } else if (MapSystem.hasLineOfSight(p.currentNodeId, bombNode)) {
                p.state = 'HOLDING';
                p.actionTimer = state.tick + 60;
            } else {
                this.routeTo(p, bombNode);
            }
            return;
        }

        // Recover dropped bomb
        if (team.strategy === 'RECOVER_BOMB') {
            if (state.bomb.nodeId) {
                if (p.currentNodeId === state.bomb.nodeId) {
                    state.bomb.state = 'CARRIED';
                    state.bomb.carrierId = p.id;
                    team.strategy = 'DEFAULT';
                } else {
                    this.routeTo(p, state.bomb.nodeId);
                    return;
                }
            }
        }

        // Main T attack tactics
        const shouldLurkThisRound = (state.round % 2 !== 0) && team.strategy !== 'FAST_A' && team.strategy !== 'FAST_B';
        const anyTeammateFightingOrDead = teamPlayers.some((mate: Player) => mate.id !== p.id && (!mate.alive || mate.state === 'ENGAGING'));
        const bombIsPlantedOrPlanting = state.bomb.state === 'PLANTED' || state.bomb.state === 'PLANTING';

        if (isLurker && shouldLurkThisRound) {
            // Tactical Lurker AI: pushes flank when fight starts or mid-round
            if (anyTeammateFightingOrDead || bombIsPlantedOrPlanting || state.tick >= 45) {
                const flankTarget = (team.strategy === 'EXECUTE_B' || team.strategy === 'MID_SPLIT_B') ? 'b_site' : 'a_site';
                if (p.currentNodeId === flankTarget) {
                    p.state = 'HOLDING';
                    p.actionTimer = state.tick + 40;
                } else {
                    this.routeTo(p, flankTarget);
                }
                return;
            } else {
                const lurkHoldNode = (team.strategy === 'EXECUTE_B' || team.strategy === 'MID_SPLIT_B') ? 'a_main' : 'b_apps';
                if (p.currentNodeId === lurkHoldNode) {
                    p.state = 'HOLDING';
                    p.actionTimer = state.tick + 25;
                } else {
                    this.routeTo(p, lurkHoldNode);
                }
                return;
            }
        }

        if (isSniper) {
            // T-side Sniper: provide long-range overwatch and angle control
            let sniperTarget = 'mid';
            if (team.strategy === 'EXECUTE_A' || team.strategy === 'FAST_A') {
                sniperTarget = p.currentNodeId === 'a_main' ? 'a_site' : 'a_main';
            } else if (team.strategy === 'EXECUTE_B' || team.strategy === 'FAST_B') {
                sniperTarget = p.currentNodeId === 'b_apps' ? 'b_site' : 'b_apps';
            } else if (team.strategy === 'MID_SPLIT_A') {
                sniperTarget = p.currentNodeId === 'mid' ? 'connector' : 'mid';
            } else if (team.strategy === 'MID_SPLIT_B') {
                sniperTarget = p.currentNodeId === 'mid' ? 'short' : 'mid';
            } else {
                sniperTarget = (state.round % 2 === 0) ? 'mid' : 'a_main';
            }

            if (p.currentNodeId === sniperTarget) {
                p.state = 'HOLDING';
                p.actionTimer = state.tick + 35;
            } else {
                this.routeTo(p, sniperTarget);
            }
            return;
        }

        if (team.strategy === 'MID_SPLIT_A') {
            const targetSite = p.currentNodeId === 'connector' ? 'a_site' : (p.currentNodeId === 'mid' ? 'connector' : 'mid');
            if (p.currentNodeId === 'a_site') {
                p.state = 'HOLDING';
                p.actionTimer = state.tick + 40;
            } else {
                this.routeTo(p, targetSite);
            }
            return;
        }

        if (team.strategy === 'MID_SPLIT_B') {
            const targetSite = p.currentNodeId === 'short' ? 'b_site' : (p.currentNodeId === 'mid' ? 'short' : 'mid');
            if (p.currentNodeId === 'b_site') {
                p.state = 'HOLDING';
                p.actionTimer = state.tick + 40;
            } else {
                this.routeTo(p, targetSite);
            }
            return;
        }

        if (team.strategy === 'DEFAULT') {
            // Default setup: probe map control before committing
            let defaultSpot = 'a_main';
            if (isSniper) defaultSpot = 'mid';
            else if (isLurker) defaultSpot = 'b_apps';
            else if (isEntry) defaultSpot = 'a_main';
            else if (pRoleLower.includes('support') || pRoleLower.includes('саппорт')) defaultSpot = 'mid_t_entrance';
            else {
                const spots = ['a_main', 'mid', 'b_apps', 't_ramp'];
                defaultSpot = spots[myIdx % spots.length];
            }

            if (p.currentNodeId === defaultSpot) {
                p.state = 'HOLDING';
                p.actionTimer = state.tick + 30;
            } else {
                this.routeTo(p, defaultSpot);
            }
            return;
        }

        const mainSite = (team.strategy === 'EXECUTE_B' || team.strategy === 'FAST_B') ? 'b_site' : 'a_site';
        if (p.currentNodeId === mainSite) {
            p.state = 'HOLDING';
            p.actionTimer = state.tick + 40;
        } else {
            this.routeTo(p, mainSite);
        }

     } else {
        // CT Side Logic
        if (team.strategy === 'RETAKE') {
            if (state.bomb.nodeId) {
                if (state.bomb.state === 'DEFUSING' && state.bomb.defuserPlayerId !== p.id) {
                    if (p.currentNodeId === state.bomb.nodeId) {
                        p.state = 'HOLDING';
                        p.actionTimer = state.tick + 100;
                    } else {
                        this.routeTo(p, state.bomb.nodeId);
                    }
                } else if (p.currentNodeId === state.bomb.nodeId) {
                    p.state = 'DEFUSING';
                    state.bomb.state = 'DEFUSING';
                    state.bomb.defuserPlayerId = p.id;
                    state.bomb.defuseTimer = state.tick + (p.hasDefuseKit ? 50 : 100);
                } else {
                    this.routeTo(p, state.bomb.nodeId);
                }
            }
            return;
        }

        // Check for active enemy sightings for rotation
        let enemiesOnA = 0;
        let enemiesOnB = 0;
        for (const [, mem] of p.knownEnemies.entries()) {
            if (mem.confidence > 0.5) {
                if (mem.nodeId === 'a_site' || mem.nodeId === 'a_main' || mem.nodeId === 't_ramp' || mem.nodeId === 'connector') enemiesOnA++;
                if (mem.nodeId === 'b_site' || mem.nodeId === 'b_apps' || mem.nodeId === 'b_apps_entrance' || mem.nodeId === 'short') enemiesOnB++;
            }
        }

        // Tactical CT Rotation: Mid/Connector rotators assist first; opposite site anchor holds site unless confirmed execute (3+ enemies) or bomb planted
        const bombPlantedOrExecA = enemiesOnA >= 3 || state.bomb.state === 'PLANTED';
        const bombPlantedOrExecB = enemiesOnB >= 3 || state.bomb.state === 'PLANTED';

        // Sniper tactical repositioning: if holding window and mid is rushed by 2+ enemies or sniper took damage, fall back to Jungle
        if (isSniper && p.currentNodeId === 'window') {
            const enemiesAtMid = Array.from(p.knownEnemies.values()).filter(mem => mem.confidence > 0.5 && (mem.nodeId === 'mid' || mem.nodeId === 'mid_t_entrance')).length;
            if (enemiesAtMid >= 2 || p.hp < 70) {
                this.routeTo(p, 'jungle');
                return;
            }
        }

        if ((enemiesOnA >= 2 || bombPlantedOrExecA) && (p.currentNodeId === 'window' || p.currentNodeId === 'jungle' || p.currentNodeId === 'connector')) {
            this.routeTo(p, 'a_site');
            return;
        }
        if (bombPlantedOrExecA && (p.currentNodeId === 'b_site' || p.currentNodeId === 'short')) {
            this.routeTo(p, 'a_site');
            return;
        }

        if ((enemiesOnB >= 2 || bombPlantedOrExecB) && (p.currentNodeId === 'short' || p.currentNodeId === 'window')) {
            this.routeTo(p, 'b_site');
            return;
        }
        if (bombPlantedOrExecB && (p.currentNodeId === 'a_site' || p.currentNodeId === 'jungle' || p.currentNodeId === 'connector')) {
            this.routeTo(p, 'b_site');
            return;
        }

        // CT Defense positions based on team strategy (Stacking, Mid control, or Balanced default)
        if (p.currentNodeId === 'a_site' || p.currentNodeId === 'b_site' || p.currentNodeId === 'window' || p.currentNodeId === 'jungle' || p.currentNodeId === 'short' || p.currentNodeId === 'connector') {
            p.state = 'HOLDING';
            p.actionTimer = state.tick + 40;
        } else {
            let siteToHold = 'a_site';
            if (team.strategy === 'STACK_A') {
                const aSpots = ['a_site', 'jungle', 'connector', 'window', 'a_site'];
                siteToHold = aSpots[myIdx % aSpots.length];
            } else if (team.strategy === 'STACK_B') {
                const bSpots = ['b_site', 'short', 'window', 'b_site', 'short'];
                siteToHold = bSpots[myIdx % bSpots.length];
            } else if (team.strategy === 'MID_CONTROL') {
                const midSpots = ['window', 'connector', 'short', 'jungle', 'a_site'];
                siteToHold = midSpots[myIdx % midSpots.length];
            } else {
                if (isSniper) {
                    siteToHold = 'window'; // Mid sniper
                } else if (isLurker) {
                    siteToHold = 'b_site'; // B site anchor
                } else if (isEntry) {
                    siteToHold = 'a_site'; // A site anchor
                } else if (pRoleLower.includes('support') || pRoleLower.includes('саппорт')) {
                    siteToHold = 'jungle'; // A jungle crossfire
                } else {
                    // Distributed based on player index to prevent congestion
                    const defaultSpots = ['connector', 'short', 'a_site', 'b_site', 'jungle'];
                    siteToHold = defaultSpots[myIdx % defaultSpots.length];
                }
            }
            
            this.routeTo(p, siteToHold);
        }
     }
  }

  static routeTo(p: Player, targetNodeId: string) {
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

