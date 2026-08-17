import { MatchState } from '../models';

export class BombSystem {
  static update(state: MatchState) {
    if (state.bomb.state === 'PLANTING') {
       if (state.tick >= state.bomb.timer) {
           state.bomb.state = 'PLANTED';
           state.bomb.explosionTimer = state.tick + 350; // 35 seconds
           state.bomb.carrierId = null;
           state.events.push({ type: 'BOMB_PLANTED', tick: state.tick, data: { nodeId: state.bomb.nodeId } });
           
           const planter = Object.values(state.players).find(p => p.state === 'PLANTING');
           if (planter) {
               planter.state = 'IDLE';
               planter.statistics.plants++;
           }
       } else {
           const planter = Object.values(state.players).find(p => p.state === 'PLANTING');
           if (!planter || !planter.alive) {
               state.bomb.state = 'DROPPED';
           }
       }
    } else if (state.bomb.state === 'DEFUSING') {
       if (state.bomb.explosionTimer && state.tick >= state.bomb.explosionTimer) {
           state.bomb.state = 'EXPLODED';
           state.events.push({ type: 'BOMB_EXPLODED', tick: state.tick, data: null });
       } else if (state.bomb.defuseTimer && state.tick >= state.bomb.defuseTimer) {
           state.bomb.state = 'DEFUSED';
           state.events.push({ type: 'BOMB_DEFUSED', tick: state.tick, data: null });
           
           if (state.bomb.defuserPlayerId) {
               const defuser = state.players[state.bomb.defuserPlayerId];
               if (defuser) {
                   defuser.state = 'IDLE';
                   defuser.statistics.defuses++;
               }
           }
       } else {
           const defuser = state.bomb.defuserPlayerId ? state.players[state.bomb.defuserPlayerId] : null;
           if (!defuser || !defuser.alive || defuser.state !== 'DEFUSING') {
               state.bomb.state = 'PLANTED'; 
               state.bomb.defuserPlayerId = null;
           }
       }
    } else if (state.bomb.state === 'PLANTED') {
       if (state.bomb.explosionTimer && state.tick >= state.bomb.explosionTimer) {
           state.bomb.state = 'EXPLODED';
           state.events.push({ type: 'BOMB_EXPLODED', tick: state.tick, data: null });
       }
    }

    if (state.bomb.state === 'DROPPED' && state.bomb.nodeId) {
        const tPlayers = Object.values(state.players).filter(p => p.alive && p.side === 'T');
        for (const p of tPlayers) {
            if (p.currentNodeId === state.bomb.nodeId) {
                state.bomb.state = 'CARRIED';
                state.bomb.carrierId = p.id;
                state.bomb.nodeId = null;
                break;
            }
        }
    }
  }
}
