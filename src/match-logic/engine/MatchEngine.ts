import { MatchState, Player, Team, MatchEvent } from '../models';
import { RoundEngine } from './RoundEngine';
import { CombatSystem } from '../systems/CombatSystem';
import { getPlayerPerks } from '../../lib/playerPerks';
import { CALLS_CONFIG } from '../config/CallsConfig';

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

    // Team synergy: meaningful competitive impact on communication, trades and teamwork
    const t1NewPlayersCount = (team1Input || []).filter((p: any) => p && p.isNewPlayer).length;
    const t2NewPlayersCount = (team2Input || []).filter((p: any) => p && p.isNewPlayer).length;

    // Team synergy: use explicit value if passed, otherwise compute from fresh additions
    let team1Synergy = options?.team1Synergy !== undefined
      ? options.team1Synergy
      : (t1NewPlayersCount > 0 ? Math.max(25, 100 - (t1NewPlayersCount * 15)) : 100);
    let team2Synergy = options?.team2Synergy !== undefined
      ? options.team2Synergy
      : (t2NewPlayersCount > 0 ? Math.max(25, 100 - (t2NewPlayersCount * 15)) : 100);

    // 100% synergy = +4.5% boost (tier-1 squad), 70% = 1.00 (standard baseline), 40% = -4.5% (uncoordinated), 10% = -9% (mix)
    const t1SynergyMod = 1.0 + ((team1Synergy - 70) / 30) * 0.045;
    const t2SynergyMod = 1.0 + ((team2Synergy - 70) / 30) * 0.045;

    // Map experience: 50 is default (1.00), 100 is Signature map (+5.5%), 10 is Permaban (-4.4%)
    const team1MapExp = options?.team1MapExp ?? 50;
    const team2MapExp = options?.team2MapExp ?? 50;
    const t1MapExpMod = 1.0 + ((team1MapExp - 50) / 50) * 0.055;
    const t2MapExpMod = 1.0 + ((team2MapExp - 50) / 50) * 0.055;

    // Persist to team state for combat trade checks and AI decisions
    if (state.teams[t1Id]) {
      state.teams[t1Id].synergy = team1Synergy;
      state.teams[t1Id].mapExp = team1MapExp;
    }
    if (state.teams[t2Id]) {
      state.teams[t2Id].synergy = team2Synergy;
      state.teams[t2Id].mapExp = team2MapExp;
    }

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
        // Best captain by CALLS (tactical leadership), then rating/IQ remains Captain
        captains.sort((a, b) => (Number(b.calls || 70) - Number(a.calls || 70)) || (b.rawRating - a.rawRating));
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
      const isNewPlayer = !!pData.isNewPlayer;
      let rawRating = parseFloat(pData.rating) || parseFloat(pData.valRating) || 100;
      if (rawRating < 10) rawRating = rawRating * 100; // Map HLTV 1.15 to 115

      // New player adaptation penalty: стреляет так же, но плохо выдает обязанности команде
      if (isNewPlayer) {
        rawRating *= 0.95; // Минимальное снижение общего скилла (тайминги разменов)
      }

      // Load individual player perks from Settings -> Индивидуальные Рейты
      const perk = getPlayerPerks(nickname);
      if (perk && perk.skillMultiplier) {
        rawRating *= perk.skillMultiplier;
      }
      
      const teamOverall = teamId === t1Id ? t1Overall : t2Overall;
      const teamForm = (teamId === t1Id ? options?.team1Form : options?.team2Form) || 0;
      const synergyMod = teamId === t1Id ? t1SynergyMod : t2SynergyMod;
      const mapExpMod = teamId === t1Id ? t1MapExpMod : t2MapExpMod;
      
      // Team-wide influence (Captain's calls / Team cohesion):
      // Team-wide influence (Captain's calls / Team cohesion):
      const teamOverallWeight = isCS2 ? 0.12 : 0.10; // Reduced from 0.22 to make individual skill more decisive
      const individualWeight = 1.0 - teamOverallWeight;

      // Realistic match day form & situational variance:
      // Pro players have subtle good/bad days (tight bell curve distribution within ±3-4 points)
      let matchFormLuck = (rng() + rng() + rng() - 1.5) * 1.8; // Reduced range for more stability
      
      let playerFocusMod = 1.0;
      const popOffRoll = rng();
      if (popOffRoll < 0.10) {
        // 10% chance of a solid form boost (+2.5 to +4.0)
        matchFormLuck += 2.5 + rng() * 1.5;
        playerFocusMod = 1.02;
      } else if (popOffRoll > 0.90) {
        // 10% chance of a tough game (-2.0 to -3.5)
        matchFormLuck -= 2.0 + rng() * 1.5;
        playerFocusMod = 0.98;
      }

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
          utility = skillVal * 0.98;
          focus *= 1.01;
          aggression = 0.94;
          impact = 1.02;
          reaction = skillVal * 1.02;
          speedBonus = 0.00;
      } else if (isEntry) {
          // Entry goes in first; takes aggressive opening duels
          aim = skillVal * 1.01;
          iq = skillVal * 1.01;
          movement = skillVal * 1.02;
          utility = skillVal * 0.99;
          focus *= 1.01;
          aggression = 1.04;
          impact = 1.03;
          reaction = skillVal * 1.02;
          speedBonus = 0.00;
      } else if (isLurker) {
          aim = skillVal * 1.01;
          iq = skillVal * 1.02;
          movement = skillVal * 1.01;
          utility = skillVal * 0.97;
          focus *= 1.01;
          aggression = 0.96;
          impact = 1.01;
          reaction = skillVal * 1.01;
          speedBonus = 0.01;
      } else if (isSupport) {
          // Support / Anchor: plays disciplined crossfires & utility, trades effectively
          aim = skillVal * 0.99;
          iq = skillVal * 1.04;
          movement = skillVal * 0.99;
          utility = skillVal * 1.06;
          focus *= 1.01;
          aggression = 0.92;
          impact = 0.98;
          reaction = skillVal * 0.99;
          speedBonus = 0.00;
      } else if (isCaptain) {
          // Captain / IGL focuses on calling strats; mechanical skill is preserved close to team level
          aim = skillVal * 1.00;
          reaction = skillVal * 1.00;
          aggression = 0.96;
          impact = 0.98;
          iq = skillVal * 1.04; // Reduced from 1.06
          movement = skillVal * 0.99;
          utility = skillVal * 1.03; // Reduced from 1.04
          focus = 1.00;
          speedBonus = 0.00;
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
              iq = skillVal * 1.08; // Reduced from 1.10
              movement = skillVal * 0.96;
              utility = skillVal * 1.06; // Reduced from 1.10
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

      // New player adaptation penalty (shoots fine but plays for himself / poor coordination)
      if (isNewPlayer) {
        aim *= 1.04;       // Reduced boost
        reaction *= 0.88;  // Better reaction
        utility *= 0.70;   
        iq *= 0.75;        
        impact *= 0.82;    
        focus *= 0.88;     
        aggression *= 1.15; 
      }
      
      let callsVal = pData.calls !== undefined && pData.calls !== null
        ? Math.max(0, Math.min(100, Math.round(Number(pData.calls))))
        : (isCaptain ? CALLS_CONFIG.DEFAULT_CALLS : undefined);

      // Handle captain subclasses (Капитан-стрелок vs Коллер vs Обычный)
      if (isCaptain) {
        const sub = pData.subclass || 'classic_igl';
        if (sub === 'fragging_igl' || sub === 'shooter') {
          // Капитан-стрелок: коллит меньше, но аим и фраги на уровне рифлера
          aim = Math.round(skillVal * 1.03); // Reduced from 1.05
          reaction = Math.round(skillVal * 1.02); // Reduced from 1.03
          aggression = 1.02;
          callsVal = 45;
        } else if (sub === 'caller_igl' || sub === 'tactician_igl' || sub === 'caller') {
          // Коллер капитан: больше коллов для победы команды, но меньше личного аима
          aim = Math.round(skillVal * 0.96);
          iq = Math.round(skillVal * 1.08); // Reduced from 1.15
          utility = Math.round(utility * 1.06); // Reduced from 1.12
          aggression = 0.92;
          callsVal = 95;
        } else {
          // Капитан обычный (базовый)
          aim = Math.round(skillVal * 1.00);
          iq = Math.round(skillVal * 1.04); // Reduced from 1.06
          callsVal = 70;
        }
      }

      const p: Player = {
        id: pId,
        name: pData.nickname,
        teamId: teamId,
        side: state.teams[teamId].side,
        role,
        originalRole,
        isAdaptedRole,
        isNewPlayer,
        rating,
        subclass: pData.subclass || (isCaptain ? 'classic_igl' : undefined),
        calls: callsVal,
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

    // Resolve team captain and tactical CALLS rating
    this.refreshTeamCaptainCalls(state, t1Id);
    this.refreshTeamCaptainCalls(state, t2Id);
    
    return state;
  }

  static refreshTeamCaptainCalls(state: MatchState, teamId: string) {
    const team = state.teams[teamId];
    if (!team) return;
    const players = Object.values(state.players).filter(p => p && p.teamId === teamId);
    const isCaptainRole = (role: string) => {
        const r = role.toLowerCase().trim();
        return r === 'igl' || r === 'captain' || r === 'капитан' || r === 'кэп' || r === 'leader';
    };
    let cap = players.find(p => isCaptainRole(p.role)) ||
              players.find(p => p.originalRole && isCaptainRole(p.originalRole));
    const calls = cap && cap.calls !== undefined ? cap.calls : (cap ? CALLS_CONFIG.DEFAULT_CALLS : CALLS_CONFIG.NO_CAPTAIN_CALLS);
    team.calls = calls;
    team.callsNorm = CALLS_CONFIG.normalize(calls);
    team.captainPlayerId = cap ? cap.id : null;
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
    
    // Realistic Map Kill Margin Enforcement:
    // In competitive CS2 / Standoff 2, the team that wins more rounds on a map has a positive kill margin.
    if (t1.score !== t2.score) {
      const mapWinner = t1.score > t2.score ? 1 : 2;
      const winStats = mapWinner === 1 ? t1Stats : t2Stats;
      const loseStats = mapWinner === 1 ? t2Stats : t1Stats;
      
      const scoreDiff = Math.abs(t1.score - t2.score);
      const minExpectedLead = Math.max(2, Math.round(scoreDiff * 1.3));
      
      let winK = winStats.reduce((sum, p) => sum + (p?.kills || 0), 0);
      let loseK = loseStats.reduce((sum, p) => sum + (p?.kills || 0), 0);
      
      if (winK < loseK + minExpectedLead) {
        const shift = Math.ceil((loseK + minExpectedLead - winK) / 2);
        for (let i = 0; i < shift; i++) {
          const sortedWinners = [...winStats].sort((a, b) => (b.kills - a.kills) || (b.rating - a.rating));
          const luckyWinner = sortedWinners[i % sortedWinners.length];
          luckyWinner.kills++;
          luckyWinner.damage += 90 + Math.floor(CombatSystem.random() * 20);
          
          const sortedLosersDeaths = [...loseStats].sort((a, b) => (b.deaths - a.deaths) || (a.rating - b.rating));
          const unluckyLoser = sortedLosersDeaths[i % sortedLosersDeaths.length];
          unluckyLoser.deaths++;
          
          const loserWithKills = [...loseStats].filter(p => p.kills >= 2).sort((a, b) => (a.rating - b.rating) || (a.kills - b.kills));
          if (loserWithKills.length > 0) {
            const removedLoser = loserWithKills[0];
            removedLoser.kills--;
            removedLoser.damage = Math.max(0, removedLoser.damage - 85);
            
            const winnerWithDeaths = [...winStats].filter(p => p.deaths >= 1).sort((a, b) => (b.rating - a.rating));
            if (winnerWithDeaths.length > 0) {
              winnerWithDeaths[0].deaths--;
            }
          }
        }
      }
    }

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
