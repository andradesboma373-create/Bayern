import { MatchState, Player, Team, MatchEvent } from '../models';
import { RoundEngine } from './RoundEngine';
import { CombatSystem } from '../systems/CombatSystem';

export interface MatchEngineOptions {
  team1Synergy?: number;
  team2Synergy?: number;
  team1Tactic?: string;
  team2Tactic?: string;
  team1Form?: number;
  team2Form?: number;
  team1MapExp?: number;
  team2MapExp?: number;
  pickedByTeam?: 1 | 2 | null;
}

export class MatchEngine {
  static createInitialState(
    team1Input: any[],
    team2Input: any[],
    isCS2: boolean = true,
    mapId: string = 'mirage',
    format: string = 'MR12',
    seed: number = 12345,
    options?: MatchEngineOptions
  ): MatchState {
    CombatSystem.setSeed(seed);
    
    const t1Id = 't1';
    const t2Id = 't2';
    
    // Balanced starting side: coin flip based on seed unless pickedByTeam is specified
    let t1StartsAs: 'T' | 'CT' = 'T';
    if (options?.pickedByTeam === 1) {
      // Team 1 picked the map, Team 2 chooses starting side (typically CT)
      t1StartsAs = 'T';
    } else if (options?.pickedByTeam === 2) {
      // Team 2 picked the map, Team 1 chooses starting side (typically CT)
      t1StartsAs = 'CT';
    } else {
      // Coin flip by seed
      t1StartsAs = (seed % 2 === 0) ? 'CT' : 'T';
    }
    const t2StartsAs: 'T' | 'CT' = t1StartsAs === 'T' ? 'CT' : 'T';

    const state: MatchState = {
      round: 0,
      tick: 0,
      phase: 'FREEZE',
      isCS2,
      mapId,
      format,
      teams: {
        [t1Id]: {
          id: t1Id,
          name: 'Team 1',
          side: t1StartsAs,
          score: 0,
          economy: 4000,
          lossStreak: 0,
          players: [],
          tactic: options?.team1Tactic || 'DEFAULT',
          strategy: 'DEFAULT',
          timeoutsRemaining: 4
        },
        [t2Id]: {
          id: t2Id,
          name: 'Team 2',
          side: t2StartsAs,
          score: 0,
          economy: 4000,
          lossStreak: 0,
          players: [],
          tactic: options?.team2Tactic || 'DEFAULT',
          strategy: 'DEFAULT',
          timeoutsRemaining: 4
        }
      },
      players: {},
      bomb: {
        state: 'CARRIED',
        position: null,
        nodeId: null,
        carrierId: null,
        timer: 0
      },
      events: [],
      roundLogs: []
    } as any;
    
    (state as any).t1StartedAs = t1StartsAs;
    (state as any).t2StartedAs = t2StartsAs;

    // Calculate team average overall ratings (team overall baseline)
    const t1Overall = team1Input.slice(0, 5).reduce((acc, p) => {
      let r = parseFloat(p?.rating) || parseFloat(p?.valRating) || 100;
      if (r < 10) r *= 100;
      return acc + r;
    }, 0) / Math.max(1, Math.min(5, team1Input.length));

    const t2Overall = team2Input.slice(0, 5).reduce((acc, p) => {
      let r = parseFloat(p?.rating) || parseFloat(p?.valRating) || 100;
      if (r < 10) r *= 100;
      return acc + r;
    }, 0) / Math.max(1, Math.min(5, team2Input.length));

    // Team synergy: subtle impact (max ±1.5% as requested by user)
    const team1Synergy = options?.team1Synergy ?? 50;
    const team2Synergy = options?.team2Synergy ?? 50;
    const t1SynergyMod = 0.985 + (team1Synergy / 100) * 0.03;
    const t2SynergyMod = 0.985 + (team2Synergy / 100) * 0.03;

    // Map experience: subtle impact (max ±2%)
    const team1MapExp = options?.team1MapExp ?? 50;
    const team2MapExp = options?.team2MapExp ?? 50;
    const t1MapExpMod = 0.98 + (team1MapExp / 100) * 0.04;
    const t2MapExpMod = 0.98 + (team2MapExp / 100) * 0.04;

    const initPlayer = (pData: any, teamId: string) => {
      const pId = pData.id || pData.nickname;
      const role = pData.role || 'Rifler';
      let rawRating = parseFloat(pData.rating) || parseFloat(pData.valRating) || 100;
      if (rawRating < 10) rawRating = rawRating * 100; // Map HLTV 1.15 to 115
      
      const teamOverall = teamId === t1Id ? t1Overall : t2Overall;
      const teamForm = (teamId === t1Id ? options?.team1Form : options?.team2Form) || 0;
      const synergyMod = teamId === t1Id ? t1SynergyMod : t2SynergyMod;
      const mapExpMod = teamId === t1Id ? t1MapExpMod : t2MapExpMod;
      
      // Blend: 70% individual skill + 30% team overall baseline + form
      const baseRating = (rawRating * 0.70) + (teamOverall * 0.30) + teamForm;
      const effectiveRating = baseRating * synergyMod * mapExpMod;
      const rating = Math.max(40, Math.min(250, effectiveRating));
      const skillVal = rating;
      
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
        aim: Math.max(40, aim),
        iq: Math.max(40, iq),
        movement: skillVal,
        reaction: Math.max(40, reaction),
        roleSkill: skillVal,
        hp: 100,
        armor: 0,
        money: 800,
        weaponId: state.teams[teamId].side === 'T' ? 'glock' : 'usp',
        hasDefuseKit: false,
        grenades: [],
        position: {x: 0, y: 0},
        targetPosition: null,
        speed: 1.6 + (skillVal / 800) + speedBonus,
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
  
  static isMatchOver(s1: number, s2: number, format: string): boolean {
    const regTarget = format === 'MR15' ? 16 : 13;
    const regTie = regTarget - 1; // 12 in MR12, 15 in MR15
    
    // 1. Regular regulation win
    if (s1 === regTarget && s2 < regTie) return true;
    if (s2 === regTarget && s1 < regTie) return true;
    
    // 2. Overtime logic
    if (s1 >= regTie && s2 >= regTie) {
      const totalRounds = s1 + s2;
      const otRounds = Math.max(1, totalRounds - (regTie * 2));
      const otNumber = Math.floor((otRounds - 1) / 6);
      const otTarget = regTie + 4 + (otNumber * 3);
      
      if (s1 >= otTarget && (s1 - s2) >= 2) return true;
      if (s2 >= otTarget && (s2 - s1) >= 2) return true;
    }
    return false;
  }

  static simulateEntireMatch(state: MatchState) {
    state.events.push({ type: 'MATCH_STARTED', tick: 0, data: { map: state.mapId, format: state.format }});
    
    while (state.phase !== 'MATCH_END') {
       if (state.phase === 'ROUND_END' || state.round === 0) {
         const t1 = state.teams['t1'];
         const t2 = state.teams['t2'];
         
         if (this.isMatchOver(t1.score, t2.score, state.format)) {
           state.phase = 'MATCH_END';
           break;
         }
         
         RoundEngine.startRound(state);
       }
       
       RoundEngine.update(state);
       
       // Fallback against infinite tick loop
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
    
    return {
      team1Score: t1.score,
      team2Score: t2.score,
      winner: t1.score > t2.score ? 1 : 2,
      team1Stats: t1Stats,
      team2Stats: t2Stats,
      events: state.events,
      roundLogs: (state as any).roundLogs || []
    };
  }
}
