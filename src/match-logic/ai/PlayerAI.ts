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
          }
        }
      }
      
      for (const [enemyId, memory] of p1.knownEnemies.entries()) {
          const age = state.tick - memory.timestamp;
          memory.confidence -= 0.01; 
          if (memory.confidence <= 0) p1.knownEnemies.delete(enemyId);
      }
    }
  }
  
  static makeDecision(state: MatchState, p: Player) {
    if (!p) return;
    const team = state.teams[p.teamId];
    if (!team) return;
    
    if (p.state === 'ENGAGING' && p.targetEnemyId) {
       const target = state.players[p.targetEnemyId];
       if (!target || !target.alive || !MapSystem.hasLineOfSight(p.currentNodeId, target.currentNodeId)) {
          p.state = 'IDLE';
          p.targetEnemyId = null;
          p.aimProgress = 0;
       } else {
          if (p.hp < 40 && CombatSystem.random() < 0.05) {
              p.state = 'MOVING';
              p.targetEnemyId = null;
              this.routeTo(p, this.getSafeNode(p));
              return;
          }
          return;
       }
    }
    
    if (p.state === 'PLANTING' || p.state === 'DEFUSING') return;

    let bestEnemyId = null;
    let minScore = Infinity;
    for (const [enemyId, mem] of p.knownEnemies.entries()) {
       if (mem.confidence > 0.8) {
          const enemy = state.players[enemyId];
          if (enemy && enemy.alive && MapSystem.hasLineOfSight(p.currentNodeId, enemy.currentNodeId)) {
              const dist = MapSystem.getDistance(MapSystem.getNode(p.currentNodeId), MapSystem.getNode(enemy.currentNodeId));
              if (dist < minScore) {
                  minScore = dist;
                  bestEnemyId = enemyId;
              }
          }
       }
    }

    if (bestEnemyId) {
       const wasHolding = p.state === 'HOLDING';
       p.state = 'ENGAGING';
       p.targetEnemyId = bestEnemyId;
       p.path = [];
       p.targetNodeId = null;
       p.aimProgress = wasHolding ? 0.85 : 0.2; 
       
       let delay = 3.0 - (p.reaction / 100);
       if (wasHolding) delay -= 0.8;
       
       p.reactionTimer = state.tick + Math.max(1, delay); 
       return;
    }
    
    if (team.strategy === 'SAVE') {
        if (p.state !== 'HOLDING' && p.state !== 'MOVING') {
            this.routeTo(p, this.getSafeNode(p));
        }
        return;
    }
    
    if (p.state !== 'MOVING' || (p.path.length === 0 && !p.targetNodeId)) {
        if (CombatSystem.random() < 0.2 && p.state !== 'HOLDING') {
            p.state = 'HOLDING';
            p.actionTimer = state.tick + 20 + Math.floor(CombatSystem.random() * 50); 
        }
        
        if (p.state === 'HOLDING' && state.tick < p.actionTimer) {
            return; 
        }
        
        this.determineNextNode(state, p, team);
    }
  }

  static getSafeNode(p: Player): string {
      return p.side === 'T' ? 't_spawn' : 'ct_spawn';
  }
  
  static determineNextNode(state: MatchState, p: Player, team: any) {
     const pRoleLower = (p.role || '').toLowerCase();
     const isSniper = pRoleLower === 'sniper' || pRoleLower === 'awper' || pRoleLower === 'awp' || pRoleLower === 'снайпер';
     const isLurker = pRoleLower === 'lurker' || pRoleLower === 'люркер';
     const isEntry = pRoleLower === 'entry' || pRoleLower === 'opener' || pRoleLower === 'энтри';
     const isIGL = pRoleLower === 'igl' || pRoleLower === 'captain' || pRoleLower === 'капитан';
     const teamPlayers = team?.players ? team.players.map((id: string) => state.players[id]).filter(Boolean) : [];
     const myIdx = team?.players ? team.players.indexOf(p.id) : 0;

     if (p.side === 'T') {
        if (state.bomb.state === 'CARRIED' && state.bomb.carrierId === p.id) {
            let targetSite = 'a_site';
            if (team.strategy === 'EXECUTE_B' || team.strategy === 'FAST_B') targetSite = 'b_site';
            
            if (p.currentNodeId === targetSite) {
                p.state = 'PLANTING';
                state.bomb.state = 'PLANTING';
                state.bomb.timer = state.tick + 35; 
            } else {
                this.routeTo(p, targetSite);
            }
        } else if (team.strategy === 'DEFEND_BOMB') {
            if (state.bomb.nodeId && MapSystem.hasLineOfSight(p.currentNodeId, state.bomb.nodeId)) {
                p.state = 'HOLDING';
                p.actionTimer = state.tick + 100;
            } else if (state.bomb.nodeId) {
                this.routeTo(p, state.bomb.nodeId);
            }
        } else if (team.strategy === 'RECOVER_BOMB') {
            if (state.bomb.nodeId) {
                if (p.currentNodeId === state.bomb.nodeId) {
                    state.bomb.state = 'CARRIED';
                    state.bomb.carrierId = p.id;
                    team.strategy = 'DEFAULT';
                } else {
                    this.routeTo(p, state.bomb.nodeId);
                }
            }
        } else {
            let targetSite = (team.strategy === 'EXECUTE_B' || team.strategy === 'FAST_B') ? 'b_site' : 'a_site';
            
            if (isSniper) {
                // Sniper controls mid first, or supports site push from range
                if (state.tick < 90) {
                    targetSite = 'mid';
                } else {
                    targetSite = targetSite;
                }
            } else if (isLurker) {
                // Lurker splits or plays opposite site / mid
                targetSite = targetSite === 'a_site' ? 'b_site' : 'a_site';
            } else if (isEntry) {
                // Entry rushes site
                targetSite = targetSite;
            } else {
                // Support & IGL follow site execution or mid control
                if (myIdx % 3 === 0 && state.tick < 70) {
                    targetSite = 'mid';
                }
            }
            
            if (p.currentNodeId === targetSite) {
                p.state = 'HOLDING';
                p.actionTimer = state.tick + 100;
            } else {
                this.routeTo(p, targetSite);
            }
        }
     } else {
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
        } else {
            if (p.currentNodeId === 'a_site' || p.currentNodeId === 'b_site' || p.currentNodeId === 'window' || p.currentNodeId === 'jungle' || p.currentNodeId === 'connector' || p.currentNodeId === 'short') {
                p.state = 'HOLDING';
                p.actionTimer = state.tick + 100;
            } else {
                let siteToHold = 'a_site';
                if (isSniper) {
                    siteToHold = 'window';
                } else if (isEntry) {
                    siteToHold = myIdx % 2 === 0 ? 'a_site' : 'b_site';
                } else if (isLurker) {
                    siteToHold = 'b_site';
                } else if (isIGL) {
                    siteToHold = 'a_site';
                } else {
                    siteToHold = myIdx % 2 === 0 ? 'connector' : 'short';
                }
                
                this.routeTo(p, siteToHold);
            }
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
