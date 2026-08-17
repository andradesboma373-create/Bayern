import { MatchState } from '../models';
import { EconomySystem } from '../systems/EconomySystem';
import { MapSystem } from '../systems/MapSystem';
import { PlayerAI } from '../ai/PlayerAI';
import { TeamAI } from '../ai/TeamAI';
import { CombatSystem } from '../systems/CombatSystem';
import { BombSystem } from '../systems/BombSystem';

export class RoundEngine {
  static startRound(state: MatchState) {
    state.round++;
    Object.values(state.players).forEach(p => {
        if (p && p.statistics) {
            (p as any).lastRoundKills = p.statistics.kills;
            (p as any).lastRoundAssists = p.statistics.assists;
            (p as any).tradedInRound = false;
        }
    });
    state.phase = 'FREEZE';
    state.tick = 0;
    
    if (state.round === 1) {
      const teamIds = Object.keys(state.teams);
      state.teams[teamIds[0]].side = 'T';
      state.teams[teamIds[1]].side = 'CT';
    } else if (state.round === 13 && state.format === 'MR12') {
      const teamIds = Object.keys(state.teams);
      state.teams[teamIds[0]].side = state.teams[teamIds[0]].side === 'T' ? 'CT' : 'T';
      state.teams[teamIds[1]].side = state.teams[teamIds[1]].side === 'T' ? 'CT' : 'T';
      
      state.teams[teamIds[0]].lossStreak = 0;
      state.teams[teamIds[1]].lossStreak = 0;
      for (const p of Object.values(state.players)) {
        if (p) {
          p.money = 800;
          p.primaryWeaponId = null;
          p.secondaryWeaponId = state.teams[p.teamId]?.side === 'T' ? 'glock' : 'usp';
          p.armor = 0;
          p.hasDefuseKit = false;
          p.grenades = [];
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
      p.alive = true;
      p.hp = 100;
      p.state = 'IDLE';
      p.path = [];
      p.targetNodeId = null;
      p.targetEnemyId = null;
      p.aimProgress = 0;
      p.shootTimer = 0;
      p.reactionTimer = 0;
      p.actionTimer = 0;
      p.knownEnemies.clear();
      (p as any).damageTaken = new Map();
      
      const team = state.teams[p.teamId];
      p.side = team ? team.side : 'T';
      
      const spawns = MapSystem.getSpawns(p.side);
      const spawnIdx = Object.values(state.players).filter(x => x && x.teamId === p.teamId).indexOf(p);
      p.currentNodeId = spawns[Math.max(0, spawnIdx) % spawns.length];
      const spawnNode = MapSystem.getNode(p.currentNodeId);
      p.position = { x: spawnNode ? spawnNode.x : 0, y: spawnNode ? spawnNode.y : 0 };
    }
    
    
    EconomySystem.processBuyPhase(state);
    
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
    }
    state.tick++;
  }
  
  static checkRoundEnd(state: MatchState) {
    const tTeams = Object.values(state.teams).filter(t => t && t.side === 'T');
    const ctTeams = Object.values(state.teams).filter(t => t && t.side === 'CT');
    const tTeam = tTeams[0];
    const ctTeam = ctTeams[0];
    
    const tAlive = Object.values(state.players).filter(p => p && tTeam && p.teamId === tTeam.id && p.alive).length;
    const ctAlive = Object.values(state.players).filter(p => p && ctTeam && p.teamId === ctTeam.id && p.alive).length;
    
    if (state.bomb.state === 'EXPLODED') {
        this.endRound(state, 'EXPLOSION');
        return;
    }
    if (state.bomb.state === 'DEFUSED') {
        this.endRound(state, 'DEFUSE');
        return;
    }
    
    if (tAlive === 0 && state.bomb.state !== 'PLANTED' && state.bomb.state !== 'PLANTING' && state.bomb.state !== 'DEFUSING') {
      this.endRound(state, 'ELIMINATION');
    } else if (ctAlive === 0) {
      // If bomb planted, wait for explosion or defuse (but defuse is impossible with 0 CTs, so wait for explode or time)
      // Actually if CT is 0 and bomb is planted, T wins
      this.endRound(state, 'ELIMINATION');
    }
  }
  
  static endRound(state: MatchState, reason: 'ELIMINATION' | 'DEFUSE' | 'EXPLOSION' | 'TIME') {
    state.phase = 'ROUND_END';
    
    const tTeam = Object.values(state.teams).find(t => t && t.side === 'T');
    const ctTeam = Object.values(state.teams).find(t => t && t.side === 'CT');
    
    const tAlive = Object.values(state.players).filter(p => p && tTeam && p.teamId === tTeam.id && p.alive).length;
    const ctAlive = Object.values(state.players).filter(p => p && ctTeam && p.teamId === ctTeam.id && p.alive).length;
    
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
    
    const winner = winnerId ? state.teams[winnerId] : null;
    if (winner) winner.score++;
    
    if (winnerId) {
      EconomySystem.distributeRoundEndMoney(state, winnerId, reason);
    }
    
    const teamsList = Object.values(state.teams);
    
    for (const p of Object.values(state.players)) {
      if (!p || !p.statistics) continue;
      const rKills = p.statistics.kills - ((p as any).lastRoundKills || 0);
      const rAssists = p.statistics.assists - ((p as any).lastRoundAssists || 0);
      if (rKills === 1) (p.statistics as any).k1 = ((p.statistics as any).k1 || 0) + 1;
      else if (rKills === 2) (p.statistics as any).k2 = ((p.statistics as any).k2 || 0) + 1;
      else if (rKills === 3) (p.statistics as any).k3 = ((p.statistics as any).k3 || 0) + 1;
      else if (rKills === 4) (p.statistics as any).k4 = ((p.statistics as any).k4 || 0) + 1;
      else if (rKills >= 5) (p.statistics as any).k5 = ((p.statistics as any).k5 || 0) + 1;

      const contributed = rKills > 0 || rAssists > 0 || p.alive || (p as any).tradedInRound;
      if (contributed) {
        (p.statistics as any).kastRounds = ((p.statistics as any).kastRounds || 0) + 1;
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
