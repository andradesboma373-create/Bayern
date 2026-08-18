import { MatchState, Player, Team, MatchEvent } from '../models';
import { RoundEngine } from './RoundEngine';
import { CombatSystem } from '../systems/CombatSystem';

export class MatchEngine {
  static createInitialState(
    team1Input: any[], team2Input: any[], 
    isCS2: boolean, mapId: string, format: string, seed: number
  ): MatchState {
    
    CombatSystem.setSeed(seed);
    
    const state: MatchState = {
      matchId: CombatSystem.random().toString(36).substring(2, 9),
      seed,
      mapId,
      isCS2,
      format,
      phase: 'FREEZE',
      round: 0,
      half: 1,
      tick: 0,
      teams: {},
      players: {},
      bomb: {
        state: 'CARRIED',
        position: {x: 0, y: 0},
        carrierId: null,
        timer: 0
      },
      events: [],
      roundLogs: []
    };
    
    const t1Id = 't1';
    const t2Id = 't2';
    
    let t1Side: 'T' | 'CT' = 'T';
    let t2Side: 'T' | 'CT' = 'CT';
    
    if (typeof process !== 'undefined' && process?.env?.RANDOMIZE_SIDES === 'true') {
      if (Math.random() > 0.5) {
        t1Side = 'CT';
        t2Side = 'T';
      }
    }
    
    (state as any).t1StartedAs = t1Side;
    (state as any).t2StartedAs = t2Side;
    
    state.teams[t1Id] = {
      id: t1Id,
      name: 'Team 1',
      score: 0,
      money: 4000,
      side: t1Side,
      players: [],
      tactic: 'DEFAULT',
      strategy: 'DEFAULT'
    };
    
    state.teams[t2Id] = {
      id: t2Id,
      name: 'Team 2',
      score: 0,
      money: 4000,
      side: t2Side,
      players: [],
      tactic: 'DEFAULT',
      strategy: 'DEFAULT'
    };
    
    const initPlayer = (pData: any, teamId: string) => {
      const pId = pData.id || pData.nickname;
      const role = pData.role || 'Rifler';
      let rawRating = parseFloat(pData.rating) || parseFloat(pData.valRating) || 100;
      if (rawRating < 10) rawRating = rawRating * 100; // Map HLTV 1.15 to 115
      
      // Pro-tier competitive compression: baseline 100 with realistic variance
      const rating = Math.max(75, Math.min(135, rawRating));
      const skillVal = 100 + (rating - 100) * 0.35; // e.g. 125 rating -> 108.75 skill, 85 rating -> 94.75 skill
      
      let speedBonus = 0;
      let aim = skillVal;
      let reaction = skillVal;
      let iq = skillVal;
      
      const roleLower = role.toLowerCase().trim();
      if (roleLower === 'sniper' || roleLower === 'awper' || roleLower === 'awp' || roleLower === 'снайпер' || roleLower === 'авапер') {
          aim = skillVal * 1.01;
          reaction = skillVal * 1.00;
          iq = skillVal;
          speedBonus = 0.00;
      } else if (roleLower === 'entry' || roleLower === 'opener' || roleLower === 'энтри' || roleLower === 'открывающий') {
          aim = skillVal * 1.005;
          reaction = skillVal * 1.005;
          iq = skillVal;
          speedBonus = 0.01;
      } else if (roleLower === 'support' || roleLower === 'саппорт' || roleLower === 'помощник') {
          aim = skillVal;
          reaction = skillVal;
          iq = skillVal * 1.01;
          speedBonus = 0.00;
      } else if (roleLower === 'lurker' || roleLower === 'люркер') {
          aim = skillVal * 1.005;
          reaction = skillVal;
          iq = skillVal * 1.01;
          speedBonus = 0.00;
      } else if (roleLower === 'igl' || roleLower === 'captain' || roleLower === 'капитан' || roleLower === 'кэп' || roleLower === 'leader') {
          aim = skillVal;
          reaction = skillVal;
          iq = skillVal * 1.02;
          speedBonus = 0.00;
      } else {
          aim = skillVal;
          reaction = skillVal;
          iq = skillVal;
          speedBonus = 0.00;
      }
      
      const p: Player = {
        id: pId,
        name: pData.nickname,
        teamId: teamId,
        side: state.teams[teamId].side,
        role,
        rating,
        aim: Math.max(70, aim),
        iq: Math.max(70, iq),
        movement: skillVal,
        reaction: Math.max(70, reaction),
        roleSkill: skillVal,
        hp: 100,
        armor: 0,
        money: 800,
        weaponId: 'glock',
        hasDefuseKit: false,
        grenades: [],
        position: {x: 0, y: 0},
        targetPosition: null,
        speed: 1.6 + (skillVal / 600) + speedBonus,
        alive: true,
        state: 'IDLE',
        targetEnemyId: null,
        knownEnemies: new Map(),
        reactionTimer: 0,
        shootTimer: 0,
        actionTimer: 0,
        statistics: {
          kills: 0, deaths: 0, assists: 0, damage: 0, headshots: 0, shots: 0, hits: 0,
          openingKills: 0, openingDeaths: 0, trades: 0, tradeDeaths: 0, plants: 0, defuses: 0, utilityDamage: 0
        }
      };
      state.players[pId] = p;
      state.teams[teamId].players.push(pId);
    };
    
    team1Input.slice(0, 5).forEach(p => initPlayer(p, t1Id));
    team2Input.slice(0, 5).forEach(p => initPlayer(p, t2Id));
    
    return state;
  }
  
  static simulateEntireMatch(state: MatchState) {
    let roundsToWin = state.format === 'MR15' ? 16 : (state.format === 'MR12' ? 13 : 10);
    if (!state.isCS2) roundsToWin = 13;
    
    state.events.push({ type: 'MATCH_STARTED', tick: 0, data: { map: state.mapId, format: state.format }});
    
    while (state.phase !== 'MATCH_END') {
       if (state.phase === 'ROUND_END' || state.round === 0) {
         
         const t1 = state.teams['t1'];
         const t2 = state.teams['t2'];
         
         let currentRtw = roundsToWin;
         const regulationTies = roundsToWin - 1;
         
         if (t1.score >= regulationTies && t2.score >= regulationTies) {
             const totalScore = t1.score + t2.score;
             const otRoundsPlayed = Math.max(0, totalScore - (regulationTies * 2));
             const otNumber = Math.floor(otRoundsPlayed / 6);
             currentRtw = regulationTies + 4 + (otNumber * 3);
         }

         if (t1.score >= currentRtw || t2.score >= currentRtw) {
           state.phase = 'MATCH_END';
           break;
         }
         
         RoundEngine.startRound(state);
       }
       
       RoundEngine.update(state);
       
       // Fallback against infinite loop
       if (state.tick > 2000) {
         RoundEngine.endRound(state, 'TIME');
       }
    }
    
    state.events.push({ type: 'MATCH_ENDED', tick: state.tick, data: { scoreT1: state.teams['t1'].score, scoreT2: state.teams['t2'].score }});
    
    return this.generateResult(state);
  }
  
  static generateResult(state: MatchState) {
    const t1 = state.teams['t1'];
    const t2 = state.teams['t2'];
    
    
    
      
      
    
      
      
    const t1Stats = t1.players.map(id => {
      const p = state.players[id];
      if (!p) return null;
      const st = (p.statistics || {}) as any;
      return {
        id: p.id, nickname: p.name, kills: st.kills || 0, deaths: st.deaths || 0, assists: st.assists || 0, damage: st.damage || 0,
        hs: st.headshots || 0, role: p.role || 'rifler', rating: p.rating || 100,
        fk: st.openingKills || 0, fd: st.openingDeaths || 0,
        k1: st.k1 || 0, k2: st.k2 || 0, k3: st.k3 || 0, k4: st.k4 || 0, k5: st.k5 || 0,
        kastRounds: st.kastRounds || 0
      }
    }).filter(Boolean);
    
    const t2Stats = t2.players.map(id => {
      const p = state.players[id];
      if (!p) return null;
      const st = (p.statistics || {}) as any;
      return {
        id: p.id, nickname: p.name, kills: st.kills || 0, deaths: st.deaths || 0, assists: st.assists || 0, damage: st.damage || 0,
        hs: st.headshots || 0, role: p.role || 'rifler', rating: p.rating || 100,
        fk: st.openingKills || 0, fd: st.openingDeaths || 0,
        k1: st.k1 || 0, k2: st.k2 || 0, k3: st.k3 || 0, k4: st.k4 || 0, k5: st.k5 || 0,
        kastRounds: st.kastRounds || 0
      }
    }).filter(Boolean);


    // Append aces to round logs if needed

    return {
      mapName: state.mapId,
      team1Score: t1.score,
      team2Score: t2.score,
      winner: t1.score > t2.score ? 1 : 2,
      team1Stats: t1Stats,
      team2Stats: t2Stats,
      roundLogs: state.roundLogs,
      t1StartedAs: (state as any).t1StartedAs,
      t2StartedAs: (state as any).t2StartedAs
    };
  }
}
