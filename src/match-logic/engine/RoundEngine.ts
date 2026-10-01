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
    (state as any).recentDeaths = [];
    (state as any).roundFirstKillId = null;
    (state as any).roundFirstKillTeamId = null;
    (state as any).roundFirstDeathId = null;
    (state as any).roundFirstKillTraded = false;

    Object.values(state.players).forEach(p => {
        if (p && p.statistics) {
            (p as any).lastRoundKills = p.statistics.kills;
            (p as any).lastRoundAssists = p.statistics.assists;
            (p as any).roundKills = 0;
            (p as any).roundAssists = 0;
            (p as any).wasTradedInRound = false;
            (p as any).clutchOpponentsAtStart = null;
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
      const roundsPerHalf = state.isCS2 ? 3 : 2;
      const roundsPerOT = roundsPerHalf * 2;
      if (otRound === 1 || (otRound - 1) % roundsPerOT === 0) {
        if (teamIds[0] && state.teams[teamIds[0]]) state.teams[teamIds[0]].side = t1Orig;
        if (teamIds[1] && state.teams[teamIds[1]]) state.teams[teamIds[1]].side = t2Orig;
        for (const p of Object.values(state.players)) {
          if (p) {
            p.side = state.teams[p.teamId]?.side || 'T';
            p.money = 10000;
          }
        }
      } else if ((otRound - 1) % roundsPerHalf === 0) {
        if (teamIds[0] && state.teams[teamIds[0]]) state.teams[teamIds[0]].side = t1Orig === 'T' ? 'CT' : 'T';
        if (teamIds[1] && state.teams[teamIds[1]]) state.teams[teamIds[1]].side = t2Orig === 'T' ? 'CT' : 'T';
        for (const p of Object.values(state.players)) {
          if (p) {
            p.side = state.teams[p.teamId]?.side || 'T';
            p.money = 10000;
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

    // Anti-Blowout & Competitive Realism: make 13:0 and 13:1 shutouts extremely rare
    const t1Score = state.teams['t1']?.score || 0;
    const t2Score = state.teams['t2']?.score || 0;
    const leaderTeamId = t1Score > t2Score ? 't1' : (t2Score > t1Score ? 't2' : null);
    const trailingTeamId = leaderTeamId ? (leaderTeamId === 't1' ? 't2' : 't1') : null;
    const leaderScore = Math.max(t1Score, t2Score);
    const trailingScore = Math.min(t1Score, t2Score);

    if (trailingTeamId && leaderScore >= 7 && trailingScore <= 1) {
      for (const p of Object.values(state.players)) {
        if (!p) continue;
        if (p.teamId === trailingTeamId) {
          p.focus = 1.15;
          (p as any).isAntiBlowoutBuffed = true;
          if (!p.grenades || p.grenades.length === 0) {
            p.grenades = ['flash', 'smoke'];
          }
        } else if (leaderScore >= 11 && p.teamId === leaderTeamId) {
          // Leading team experiences psychological pressure / anti-stratting on shutout verge
          p.focus = 0.95;
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
    }
    state.tick++;
  }
  
  static checkRoundEnd(state: MatchState) {
    const tTeam = state.teams['t1']?.side === 'T' ? state.teams['t1'] : state.teams['t2'];
    const ctTeam = state.teams['t1']?.side === 'CT' ? state.teams['t1'] : state.teams['t2'];
    if (!tTeam || !ctTeam) return;
    
    let tAlive = 0;
    let ctAlive = 0;
    for (const id in state.players) {
      const p = state.players[id];
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
        if (opponentsFaced && opponentsFaced >= 1 && clutchCloser.statistics) {
          if (opponentsFaced === 1) clutchCloser.statistics.clutchesWon1v1 = (clutchCloser.statistics.clutchesWon1v1 || 0) + 1;
          else if (opponentsFaced === 2) clutchCloser.statistics.clutchesWon1v2 = (clutchCloser.statistics.clutchesWon1v2 || 0) + 1;
          else if (opponentsFaced === 3) clutchCloser.statistics.clutchesWon1v3 = (clutchCloser.statistics.clutchesWon1v3 || 0) + 1;
          else if (opponentsFaced === 4) clutchCloser.statistics.clutchesWon1v4 = (clutchCloser.statistics.clutchesWon1v4 || 0) + 1;
          else if (opponentsFaced >= 5) clutchCloser.statistics.clutchesWon1v5 = (clutchCloser.statistics.clutchesWon1v5 || 0) + 1;
          clutchCloser.statistics.clutches = (clutchCloser.statistics.clutches || 0) + 1;
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

      if (rKills === 1) p.statistics.k1 = (p.statistics.k1 || 0) + 1;
      else if (rKills === 2) p.statistics.k2 = (p.statistics.k2 || 0) + 1;
      else if (rKills === 3) p.statistics.k3 = (p.statistics.k3 || 0) + 1;
      else if (rKills === 4) p.statistics.k4 = (p.statistics.k4 || 0) + 1;
      else if (rKills >= 5) p.statistics.k5 = (p.statistics.k5 || 0) + 1;

      // Strict KAST: exactly +1 per round if ANY condition (K or A or S or T) is met
      const hasKill = rKills > 0;
      const hasAssist = rAssists > 0;
      const hasSurvived = p.alive;
      const hasBeenTraded = !!(p as any).wasTradedInRound;

      if (hasKill || hasAssist || hasSurvived || hasBeenTraded) {
        p.statistics.kastRounds = (p.statistics.kastRounds || 0) + 1;
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
