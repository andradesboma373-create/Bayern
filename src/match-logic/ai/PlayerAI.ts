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
              // Priority 1: Trade / Refrag bonus - if this enemy is currently fighting a teammate, immediately focus them!
              if (enemy.targetEnemyId && state.players[enemy.targetEnemyId]?.teamId === p.teamId) {
                  score -= isSupport ? 300 : 150;
              }
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
       
       // Pre-aim & crosshair placement
       if (wasHolding) {
           p.aimProgress = 0.90;
       } else if (isEntry) {
           p.aimProgress = 0.85; // Pro entry pre-aims common angles
       } else if (isLurker) {
           p.aimProgress = 0.85; // Lurker crosshair placement
       } else if (isSupport) {
           p.aimProgress = 0.85; // Support refragger instant trade aim
       } else if (isSniper) {
           p.aimProgress = 0.88;
       } else {
           p.aimProgress = 0.82;
       }
       
       let delay = 1.7 - (p.reaction / 100);
       if (wasHolding) delay -= 0.45;
       if (isEntry) delay -= 0.35; // Peeker's advantage
       if (isLurker) delay -= 0.35; // Lurker trigger readiness
       if (isSupport) delay -= 0.35; // Support trade timing
       if (isSniper) delay -= 0.40;
       
       p.reactionTimer = state.tick + Math.max(1, delay); 
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
            // Tactical Lurker AI:
            // 1. If fighting has begun on the map, bomb is planted, or mid-round reached (tick >= 45),
            // the lurker immediately pushes forward through the flank / connector / jungle / short to pinch CTs!
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
                // Early phase (tick < 45): control opposite flank or mid entrance to catch aggressive CT pushes
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
            // Sniper controls mid first, or supports site push from range
            if (state.tick < 65) {
                if (p.currentNodeId === 'mid') {
                    p.state = 'HOLDING';
                    p.actionTimer = state.tick + 40;
                } else {
                    this.routeTo(p, 'mid');
                }
            } else {
                const targetSite = (team.strategy === 'EXECUTE_B' || team.strategy === 'MID_SPLIT_B' || team.strategy === 'FAST_B') ? 'b_site' : 'a_site';
                if (p.currentNodeId === targetSite) {
                    p.state = 'HOLDING';
                    p.actionTimer = state.tick + 50;
                } else {
                    this.routeTo(p, targetSite);
                }
            }
            return;
        }

        if (team.strategy === 'MID_SPLIT_A') {
            if (isEntry || pRoleLower.includes('support') || pRoleLower.includes('саппорт') || isLurker) {
                const targetSite = p.currentNodeId === 'connector' ? 'a_site' : (p.currentNodeId === 'mid' ? 'connector' : 'mid');
                if (p.currentNodeId === 'a_site') {
                    p.state = 'HOLDING';
                    p.actionTimer = state.tick + 40;
                } else {
                    this.routeTo(p, targetSite);
                }
            } else {
                if (p.currentNodeId === 'a_site') {
                    p.state = 'HOLDING';
                    p.actionTimer = state.tick + 40;
                } else {
                    this.routeTo(p, 'a_site');
                }
            }
            return;
        }

        if (team.strategy === 'MID_SPLIT_B') {
            if (isEntry || pRoleLower.includes('support') || pRoleLower.includes('саппорт') || isLurker) {
                const targetSite = p.currentNodeId === 'short' ? 'b_site' : (p.currentNodeId === 'mid' ? 'short' : 'mid');
                if (p.currentNodeId === 'b_site') {
                    p.state = 'HOLDING';
                    p.actionTimer = state.tick + 40;
                } else {
                    this.routeTo(p, targetSite);
                }
            } else {
                if (p.currentNodeId === 'b_site') {
                    p.state = 'HOLDING';
                    p.actionTimer = state.tick + 40;
                } else {
                    this.routeTo(p, 'b_site');
                }
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

        // Fast CT Rotation if pressure is spotted
        if (enemiesOnA >= 1 && (p.currentNodeId === 'b_site' || p.currentNodeId === 'short' || p.currentNodeId === 'window' || p.currentNodeId === 'jungle' || p.currentNodeId === 'connector')) {
            this.routeTo(p, 'a_site');
            return;
        }
        if (enemiesOnB >= 1 && (p.currentNodeId === 'a_site' || p.currentNodeId === 'jungle' || p.currentNodeId === 'connector' || p.currentNodeId === 'window' || p.currentNodeId === 'short')) {
            this.routeTo(p, 'b_site');
            return;
        }

        // Default CT Defense positions (Balanced 2 A, 1 Mid, 2 B)
        if (p.currentNodeId === 'a_site' || p.currentNodeId === 'b_site' || p.currentNodeId === 'window' || p.currentNodeId === 'jungle' || p.currentNodeId === 'connector' || p.currentNodeId === 'short') {
            p.state = 'HOLDING';
            p.actionTimer = state.tick + 40;
        } else {
            let siteToHold = 'a_site';
            if (isSniper) {
                siteToHold = 'window'; // Mid sniper
            } else if (isLurker) {
                siteToHold = 'b_site'; // B anchor
            } else if (isEntry) {
                siteToHold = 'a_site'; // A anchor
            } else if (pRoleLower.includes('support') || pRoleLower.includes('саппорт')) {
                siteToHold = 'jungle'; // A support crossfire
            } else if (isIGL) {
                siteToHold = 'connector'; // Mid / A rotator
            } else {
                siteToHold = (myIdx % 2 === 0) ? 'short' : 'a_site';
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

