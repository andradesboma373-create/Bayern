import { MatchState, Player, Team, MatchEvent } from '../models';
import { RoundEngine } from './RoundEngine';
import { CombatSystem } from '../systems/CombatSystem';
import { getPlayerPerks } from '../../lib/playerPerks';

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

    const teamRatingDiff = t1Overall - t2Overall;

    (state as any).t1Overall = t1Overall;
    (state as any).t2Overall = t2Overall;
    (state as any).teamRatingDiff = teamRatingDiff;

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

    let seedCounter = state.seed || 12345;
    const rng = () => {
      seedCounter = (seedCounter * 9301 + 49297) % 233280;
      return seedCounter / 233280;
    };

    const adaptTeamRosterRoles = (teamPlayers: any[]) => {
      // Create shallow copy with parsed ratings and detected roles
      const enriched = teamPlayers.slice(0, 5).map(p => {
        const rawRole = (p?.role || 'Rifler').toString();
        const roleLower = rawRole.toLowerCase().trim();
        const isSniper = roleLower === 'sniper' || roleLower === 'awper' || roleLower === 'awp' || roleLower === 'снайпер' || roleLower === 'авапер';
        const isCaptain = roleLower === 'igl' || roleLower === 'captain' || roleLower === 'капитан' || roleLower === 'кэп' || roleLower === 'leader';
        let rawRating = parseFloat(p?.rating) || parseFloat(p?.valRating) || 100;
        if (rawRating < 10) rawRating *= 100;
        return {
          ...p,
          rawRole,
          roleLower,
          isSniper,
          isCaptain,
          rawRating,
          assignedRole: null as any,
          originalRole: rawRole,
          isAdaptedRole: false
        };
      });

      // 1. Sniper resolution: exactly 1 primary sniper per team
      const snipers = enriched.filter(p => p.isSniper);
      if (snipers.length > 1) {
        // Best sniper by rating becomes Primary Sniper (AWP)
        snipers.sort((a, b) => b.rawRating - a.rawRating);
        snipers[0].assignedRole = 'Sniper';
        snipers[0].isAdaptedRole = false;

        // Other snipers adapt to play as Riflers (with realistic rifling proficiency)
        for (let i = 1; i < snipers.length; i++) {
          snipers[i].assignedRole = 'Rifler';
          snipers[i].originalRole = 'Sniper';
          snipers[i].isAdaptedRole = true;
        }
      } else if (snipers.length === 1) {
        snipers[0].assignedRole = 'Sniper';
        snipers[0].isAdaptedRole = false;
      }

      // 2. Captain resolution: exactly 1 primary IGL/Captain per team
      const captains = enriched.filter(p => p.isCaptain);
      if (captains.length > 1) {
        // Best captain by rating/IQ remains Captain
        captains.sort((a, b) => b.rawRating - a.rawRating);
        captains[0].assignedRole = 'Captain';
        captains[0].isAdaptedRole = false;

        // Other captains adapt to play as Riflers (with realistic rifling proficiency)
        for (let i = 1; i < captains.length; i++) {
          captains[i].assignedRole = 'Rifler';
          captains[i].originalRole = 'Captain';
          captains[i].isAdaptedRole = true;
        }
      } else if (captains.length === 1) {
        captains[0].assignedRole = 'Captain';
        captains[0].isAdaptedRole = false;
      }

      // Default remaining players to their role or Rifler
      enriched.forEach(p => {
        if (!p.assignedRole) {
          p.assignedRole = p.rawRole;
          p.isAdaptedRole = false;
        }
      });

      return enriched;
    };

    const initPlayer = (pData: any, teamId: string) => {
      const pId = pData.id || pData.nickname;
      const nickname = pData.nickname || pData.name || pId;
      const role = pData.assignedRole || pData.role || 'Rifler';
      const originalRole = pData.originalRole || pData.role || role;
      const isAdaptedRole = !!pData.isAdaptedRole;
      let rawRating = parseFloat(pData.rating) || parseFloat(pData.valRating) || 100;
      if (rawRating < 10) rawRating = rawRating * 100; // Map HLTV 1.15 to 115

      // Load individual player perks from Settings -> Индивидуальные Рейты
      const perk = getPlayerPerks(nickname);
      if (perk && perk.skillMultiplier) {
        rawRating *= perk.skillMultiplier;
      }
      
      const teamOverall = teamId === t1Id ? t1Overall : t2Overall;
      const teamForm = (teamId === t1Id ? options?.team1Form : options?.team2Form) || 0;
      const synergyMod = teamId === t1Id ? t1SynergyMod : t2SynergyMod;
      const mapExpMod = teamId === t1Id ? t1MapExpMod : t2MapExpMod;
      
      // Realistic match day form & situational variance:
      // In esports, players have good and bad games (bell curve distribution)
      let matchFormLuck = (rng() + rng() + rng() - 1.5) * 5.0; // range -7.5 to +7.5
      
      // "Игра жизни" (Game of their life) & Off-game dynamics:
      // Any player (especially underdogs or close rating teammates) can have a pop-off match!
      let playerFocusMod = 1.0;
      const popOffRoll = rng();
      if (popOffRoll < 0.12) {
        // 12% chance of a monster pop-off game (+9 to +13 rating boost)
        matchFormLuck += 9 + rng() * 4;
        playerFocusMod = 1.05;
      } else if (popOffRoll > 0.92) {
        // 8% chance of an off-day / cold match (-7 to -10)
        matchFormLuck -= 7 + rng() * 3;
        playerFocusMod = 0.95;
      }

      // Team-wide influence (Captain's calls / Team cohesion):
      const teamOverallWeight = isCS2 ? 0.12 : 0.10; // Reduced from 0.18/0.15 to make individual skill more decisive
      const individualWeight = 1.0 - teamOverallWeight;

      const baseRating = (rawRating * individualWeight) + (teamOverall * teamOverallWeight) + teamForm + matchFormLuck;
      const effectiveRating = baseRating * synergyMod * mapExpMod;
      const rating = Math.max(1, effectiveRating);
      const skillVal = rating;
      
      let speedBonus = 0;
      let aim = skillVal;
      let reaction = skillVal;
      let iq = skillVal;
      let movement = skillVal;
      let utility = skillVal;
      let focus = playerFocusMod;
      let aggression = 1.0;
      let impact = 1.0;
      
      const roleLower = role.toLowerCase().trim();
      const isSniper = roleLower === 'sniper' || roleLower === 'awper' || roleLower === 'awp' || roleLower === 'снайпер' || roleLower === 'авапер';
      const isEntry = roleLower === 'entry' || roleLower === 'opener' || roleLower === 'энтри' || roleLower === 'открывающий';
      const isSupport = roleLower === 'support' || roleLower === 'саппорт' || roleLower === 'помощник';
      const isLurker = roleLower === 'lurker' || roleLower === 'люркер';
      const isCaptain = roleLower === 'igl' || roleLower === 'captain' || roleLower === 'капитан' || roleLower === 'кэп' || roleLower === 'leader';

      if (isSniper) {
          aim = skillVal * 1.01;
          iq = skillVal * 1.01;
          movement = skillVal * 1.00;
          utility = skillVal * 0.95;
          focus *= 1.04;
          aggression = 0.88;
          impact = 1.02;
          reaction = skillVal * 1.10; // Increased from 1.07
          speedBonus = 0.00;
      } else if (isEntry) {
          // Entry goes in first, purely relying on strong aim now.
          aim = skillVal * 1.18; // Increased from 1.15
          iq = skillVal * 1.10;
          movement = skillVal * 1.06;
          utility = skillVal * 0.96;
          focus *= 1.02;
          aggression = 1.12;
          impact = 1.25;
          reaction = skillVal * 1.08;
          speedBonus = 0.00;
      } else if (isLurker) {
          aim = skillVal * 1.01;
          iq = skillVal * 1.03;
          movement = skillVal * 1.01;
          utility = skillVal * 0.92;
          focus *= 1.02;
          aggression = 0.90;
          impact = 1.02;
          reaction = skillVal * 1.01;
          speedBonus = 0.01;
      } else if (isSupport) {
          // Support is a standard rifler who also contributes heavy utility setups
          aim = skillVal * 1.00;
          iq = skillVal * 1.02;
          movement = skillVal * 1.01;
          utility = skillVal * 1.35;
          focus *= 1.01;
          aggression = 0.82;
          impact = 1.00;
          reaction = skillVal * 1.00;
          speedBonus = 0.00;
      } else if (isCaptain) {
          // Captain / IGL focuses on calling strats; frags less unless their rating is superstar tier ("имба" 115+)
          const isStarCaptain = rawRating >= 115;
          const isStrongCaptain = rawRating >= 105;
          if (isStarCaptain) {
              aim = skillVal * 1.00;
              reaction = skillVal * 1.00;
              aggression = 0.85;
              impact = 1.00;
          } else if (isStrongCaptain) {
              aim = skillVal * 0.93;
              reaction = skillVal * 0.94;
              aggression = 0.76;
              impact = 0.93;
          } else {
              aim = skillVal * 0.88;
              reaction = skillVal * 0.89;
              aggression = 0.70;
              impact = 0.88;
          }
          iq = skillVal * 1.10;
          movement = skillVal * 0.96;
          utility = skillVal * 1.12;
          focus = 1.00;
          speedBonus = -0.01;
      } else {
          // Rifler (including adapted snipers and adapted captains)
          if (isAdaptedRole) {
            const origLower = (originalRole || '').toLowerCase();
            if (origLower.includes('sniper') || origLower.includes('awp') || origLower.includes('снайпер')) {
              aim = skillVal * 0.99;
              iq = skillVal * 1.01;
              movement = skillVal * 1.00;
              utility = skillVal * 0.96;
              focus = 1.02;
              aggression = 0.96;
              impact = 1.00;
              reaction = skillVal * 1.01;
              speedBonus = 0.00;
            } else if (origLower.includes('captain') || origLower.includes('igl') || origLower.includes('капитан')) {
              const isStar = rawRating >= 115;
              aim = skillVal * (isStar ? 1.00 : 0.89);
              iq = skillVal * 1.10;
              movement = skillVal * 0.96;
              utility = skillVal * 1.10;
              focus = 1.00;
              aggression = isStar ? 0.84 : 0.72;
              impact = isStar ? 1.00 : 0.89;
              reaction = skillVal * (isStar ? 1.00 : 0.89);
              speedBonus = 0.00;
            } else {
              aim = skillVal * 1.02;
              iq = skillVal * 1.01;
              movement = skillVal * 1.02;
              utility = skillVal * 0.98;
              focus = 1.01;
              aggression = 1.00;
              impact = 1.02;
              reaction = skillVal * 1.02;
              speedBonus = 0.01;
            }
          } else {
            // Dedicated native Rifler
            aim = skillVal * 1.03;
            iq = skillVal * 1.01;
            movement = skillVal * 1.02;
            utility = skillVal * 0.98;
            focus = 1.01;
            aggression = 1.00;
            impact = 1.03;
            reaction = skillVal * 1.03;
            speedBonus = 0.01;
          }
      }

      // Apply individual player perks across all roles if configured in Settings
      if (perk) {
        if (perk.killMultiplier) aim *= perk.killMultiplier;
        if (perk.deathMultiplier) reaction *= (1.0 / Math.max(0.5, perk.deathMultiplier));
      }
      
      const p: Player = {
        id: pId,
        name: pData.nickname,
        teamId: teamId,
        side: state.teams[teamId].side,
        role,
        originalRole,
        isAdaptedRole,
        rating,
        aim: Math.max(40, aim),
        iq: Math.max(40, iq),
        movement: Math.max(40, movement),
        reaction: Math.max(40, reaction),
        roleSkill: skillVal,
        utility: Math.max(40, utility),
        focus,
        aggression,
        impact,
        perk,
        hp: 100,
        armor: 0,
        money: 800,
        weaponId: state.teams[teamId].side === 'T' ? 'glock' : 'usp',
        hasDefuseKit: false,
        grenades: [],
        position: {x: 0, y: 0},
        targetPosition: null,
        speed: 1.80 + speedBonus,
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
    
    const adaptedTeam1 = adaptTeamRosterRoles(team1Input);
    const adaptedTeam2 = adaptTeamRosterRoles(team2Input);

    adaptedTeam1.forEach(p => initPlayer(p, t1Id));
    adaptedTeam2.forEach(p => initPlayer(p, t2Id));
    
    return state;
  }
  
  static isMatchOver(s1: number, s2: number, format: string, isCS2: boolean = true): boolean {
    const regTarget = format === 'MR15' ? 16 : 13;
    const regTie = regTarget - 1; // 12 in MR12, 15 in MR15
    
    // 1. Regular regulation win (13:0 - 13:11 in MR12, 16:0 - 16:14 in MR15)
    if (s1 === regTarget && s2 < regTie) return true;
    if (s2 === regTarget && s1 < regTie) return true;
    
    // 2. Overtime logic
    if (s1 >= regTie && s2 >= regTie) {
      if (!isCS2) {
        // Standoff 2 (SO2) Overtime Rules:
        // Regulation tie at 12:12. Matches go up to at least 15.
        // Victory condition: Must win with a 3-round lead (отрыв в 3 раунда):
        // 15:12, 16:13, 17:14, 18:15, 19:16, etc.
        const minOtTarget = regTie + 3; // 15 in MR12
        if (s1 >= minOtTarget && (s1 - s2) >= 3) return true;
        if (s2 >= minOtTarget && (s2 - s1) >= 3) return true;
        return false;
      }

      // CS2: MR3 format (6 rounds per OT set, win by 2 rounds, e.g. 16:12, 16:13, 16:14, 19:15, etc.)
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
         
         if (this.isMatchOver(t1.score, t2.score, state.format, state.isCS2)) {
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
        hs: st.headshots || 0, role: p.originalRole || p.role || 'rifler', rating: p.rating || 100,
        fk: st.openingKills || 0, fd: st.openingDeaths || 0,
        k1: st.k1 || 0, k2: st.k2 || 0, k3: st.k3 || 0, k4: st.k4 || 0, k5: st.k5 || 0,
        kastRounds: st.kastRounds || 0,
        roundSwing: st.roundSwing || 0,
        trades: st.trades || 0,
        tradeDeaths: st.tradeDeaths || 0,
        clutches: st.clutches || 0,
        clutchesWon1v1: st.clutchesWon1v1 || 0,
        clutchesWon1v2: st.clutchesWon1v2 || 0,
        clutchesWon1v3: st.clutchesWon1v3 || 0,
        clutchesWon1v4: st.clutchesWon1v4 || 0,
        clutchesWon1v5: st.clutchesWon1v5 || 0,
        openingKillsConverted: st.openingKillsConverted || 0,
        openingKillsTraded: st.openingKillsTraded || 0
      }
    }).filter(Boolean);
    
    const t2Stats = t2.players.map(id => {
      const p = state.players[id];
      if (!p) return null;
      const st = (p.statistics || {}) as any;
      return {
        id: p.id, nickname: p.name, kills: st.kills || 0, deaths: st.deaths || 0, assists: st.assists || 0, damage: st.damage || 0,
        hs: st.headshots || 0, role: p.originalRole || p.role || 'rifler', rating: p.rating || 100,
        fk: st.openingKills || 0, fd: st.openingDeaths || 0,
        k1: st.k1 || 0, k2: st.k2 || 0, k3: st.k3 || 0, k4: st.k4 || 0, k5: st.k5 || 0,
        kastRounds: st.kastRounds || 0,
        roundSwing: st.roundSwing || 0,
        trades: st.trades || 0,
        tradeDeaths: st.tradeDeaths || 0,
        clutches: st.clutches || 0,
        clutchesWon1v1: st.clutchesWon1v1 || 0,
        clutchesWon1v2: st.clutchesWon1v2 || 0,
        clutchesWon1v3: st.clutchesWon1v3 || 0,
        clutchesWon1v4: st.clutchesWon1v4 || 0,
        clutchesWon1v5: st.clutchesWon1v5 || 0,
        openingKillsConverted: st.openingKillsConverted || 0,
        openingKillsTraded: st.openingKillsTraded || 0
      }
    }).filter(Boolean);
    
    return {
      mapName: state.mapId,
      name: state.mapId,
      mapId: state.mapId,
      team1Score: t1.score,
      team2Score: t2.score,
      winner: t1.score > t2.score ? 1 : 2,
      team1Stats: t1Stats,
      team2Stats: t2Stats,
      events: [],
      roundLogs: []
    };
  }
}
