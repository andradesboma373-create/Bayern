import { MatchState, Player, TeamSide } from '../models';
import { RATING_CONFIG } from '../config/RatingConfig';
import { WEAPONS } from '../config/Weapons';

/**
 * Markov-style Man-Advantage Base Probability Matrix:
 * P(Alive_Friendly vs Alive_Enemy)
 * Index: [friendlyAlive][enemyAlive], friendlyAlive and enemyAlive in [0..5]
 */
const MAN_ADVANTAGE_MATRIX: number[][] = [
  // 0 friendly alive
  [0.50, 0.00, 0.00, 0.00, 0.00, 0.00],
  // 1 friendly alive
  [1.00, 0.50, 0.18, 0.08, 0.04, 0.02],
  // 2 friendly alive
  [1.00, 0.82, 0.50, 0.24, 0.10, 0.06],
  // 3 friendly alive
  [1.00, 0.92, 0.76, 0.50, 0.26, 0.13],
  // 4 friendly alive
  [1.00, 0.96, 0.90, 0.74, 0.50, 0.28],
  // 5 friendly alive
  [1.00, 0.98, 0.94, 0.87, 0.72, 0.50]
];

export interface PlayerRatingBreakdown {
  rating: number;           // Final comprehensive Rating (e.g. 1.24)
  impact: number;           // Combined Impact rating (HLTV 2.0+ standard)
  roundSwing: number;       // Average Round Swing per round in % (e.g. +3.4%)
  totalSwing: number;       // Total accumulated Round Swing
  kast: number;             // KAST percentage (e.g. 74.5%)
  kpr: number;              // Kills per round
  dpr: number;              // Deaths per round
  adr: number;              // Average damage per round
  kd: number;               // K/D ratio
  multiKillFactor: number;  // Multi-kill non-linear bonus
  clutchFactor: number;     // Clutch difficulty score
  openingFactor: number;    // Opening duel net contribution
}

export class RatingSystem {
  /**
   * Deterministically calculates current instantaneous win probability for a given team
   * based on alive counts, bomb state, weapons, and economy buy tiers.
   */
  static calculateWinProbability(state: MatchState, teamId: string): number {
    const targetTeam = state.teams[teamId];
    if (!targetTeam) return 0.5;

    const otherTeamId = Object.keys(state.teams).find(id => id !== teamId);
    const otherTeam = otherTeamId ? state.teams[otherTeamId] : null;
    if (!otherTeam) return 0.5;

    // 1. Alive player counts
    let friendlyAlive = 0;
    let enemyAlive = 0;
    let friendlyHasAwp = false;
    let enemyHasAwp = false;

    for (const pId in state.players) {
      const p = state.players[pId];
      if (!p || !p.alive) continue;

      const isAwp = p.weaponId === 'awp' || (p.primaryWeaponId && p.primaryWeaponId === 'awp');
      if (p.teamId === teamId) {
        friendlyAlive++;
        if (isAwp) friendlyHasAwp = true;
      } else {
        enemyAlive++;
        if (isAwp) enemyHasAwp = true;
      }
    }

    // Clamp indices
    const fIdx = Math.min(5, Math.max(0, friendlyAlive));
    const eIdx = Math.min(5, Math.max(0, enemyAlive));

    if (fIdx === 0 && eIdx === 0) return 0.5;
    if (fIdx === 0) return 0.01;
    if (eIdx === 0) return 0.99;

    // Base probability from man-advantage matrix
    let pWin = MAN_ADVANTAGE_MATRIX[fIdx][eIdx];

    // 2. Bomb state impact
    const isFriendlyT = targetTeam.side === 'T';
    const bombState = state.bomb.state;

    if (bombState === 'EXPLODED') {
      return isFriendlyT ? 0.99 : 0.01;
    }
    if (bombState === 'DEFUSED') {
      return isFriendlyT ? 0.01 : 0.99;
    }

    if (bombState === 'PLANTED' || bombState === 'DEFUSING') {
      // Once bomb is planted, Ts have a decisive strategic advantage
      const plantedTBonus = 0.28;
      if (isFriendlyT) {
        pWin = Math.min(0.98, pWin + plantedTBonus * (1.0 - pWin));
      } else {
        pWin = Math.max(0.02, pWin - plantedTBonus * pWin);
      }

      // If CT is actively defusing, CT chance increases depending on remaining Ts
      if (bombState === 'DEFUSING') {
        const defuseShift = fIdx > 0 ? 0.15 : 0.40;
        if (!isFriendlyT) pWin = Math.min(0.95, pWin + defuseShift);
        else pWin = Math.max(0.05, pWin - defuseShift);
      }
    } else if (bombState === 'DROPPED') {
      // Dropped bomb slightly favors CTs holding angles
      const dropShift = 0.05;
      if (!isFriendlyT) pWin = Math.min(0.95, pWin + dropShift);
      else pWin = Math.max(0.05, pWin - dropShift);
    }

    // 3. Weapon advantage (AWP impact in gun fights)
    if (friendlyHasAwp && !enemyHasAwp) {
      pWin = Math.min(0.98, pWin + 0.035);
    } else if (!friendlyHasAwp && enemyHasAwp) {
      pWin = Math.max(0.02, pWin - 0.035);
    }

    // 4. Economy / Buy tier context
    const friendlyBuyTier = this.getBuyTier(targetTeam);
    const enemyBuyTier = this.getBuyTier(otherTeam);
    const friendlyBuyWeight = RATING_CONFIG.BUY_TIER_WEIGHTS[friendlyBuyTier] || 1.0;
    const enemyBuyWeight = RATING_CONFIG.BUY_TIER_WEIGHTS[enemyBuyTier] || 1.0;

    const buyDelta = (friendlyBuyWeight - enemyBuyWeight) * 0.08;
    pWin = Math.min(0.98, Math.max(0.02, pWin + buyDelta));

    return Math.min(0.99, Math.max(0.01, pWin));
  }

  /**
   * Helper to categorize buy tier from team tactic and economy
   */
  static getBuyTier(team: any): 'FULL_BUY' | 'FORCE_BUY' | 'SEMI_ECO' | 'ECO' | 'PISTOL' {
    if (!team) return 'FULL_BUY';
    const tactic = (team.tactic || '').toUpperCase();
    if (tactic.includes('ECO')) return 'ECO';
    if (tactic.includes('FORCE')) return 'FORCE_BUY';
    if (tactic.includes('SEMI')) return 'SEMI_ECO';
    if (team.economy < 2000) return 'ECO';
    if (team.economy < 3800) return 'FORCE_BUY';
    return 'FULL_BUY';
  }

  /**
   * Helper to retrieve weapon tier weight for context valuation
   */
  static getWeaponWeight(weaponId?: string): number {
    if (!weaponId) return RATING_CONFIG.WEAPON_TIER_WEIGHTS.DEFAULT;
    const w = WEAPONS[weaponId];
    if (!w) return RATING_CONFIG.WEAPON_TIER_WEIGHTS.DEFAULT;
    const type = (w.type || '').toUpperCase();
    if (type === 'SNIPER') return RATING_CONFIG.WEAPON_TIER_WEIGHTS.SNIPER;
    if (type === 'RIFLE') return RATING_CONFIG.WEAPON_TIER_WEIGHTS.RIFLE;
    if (type === 'SMG') return RATING_CONFIG.WEAPON_TIER_WEIGHTS.SMG;
    if (type === 'SHOTGUN') return RATING_CONFIG.WEAPON_TIER_WEIGHTS.SHOTGUN;
    if (type === 'PISTOL') return RATING_CONFIG.WEAPON_TIER_WEIGHTS.PISTOL;
    return RATING_CONFIG.WEAPON_TIER_WEIGHTS.DEFAULT;
  }

  /**
   * Calculates the exact Round Swing (probability delta) caused by an action
   */
  static calculateActionSwing(
    pWinBefore: number,
    pWinAfter: number,
    killer: Player,
    victim: Player,
    isOpening: boolean,
    isTrade: boolean = false
  ): number {
    let rawDelta = Math.max(0.04, pWinAfter - pWinBefore);

    // Apply weapon context: eliminating high-threat AWP yields additional swing
    const victimWeaponWeight = this.getWeaponWeight(victim.weaponId || victim.primaryWeaponId || undefined);
    const killerWeaponWeight = this.getWeaponWeight(killer.weaponId || killer.primaryWeaponId || undefined);

    let contextMultiplier = 1.0;
    if (victimWeaponWeight > 1.2) {
      // Killed an AWP/Sniper
      contextMultiplier *= 1.15;
    } else if (victimWeaponWeight < 0.6) {
      // Killed an eco/pistol player
      contextMultiplier *= 0.85;
    }

    if (killerWeaponWeight < 0.6 && victimWeaponWeight >= 1.0) {
      // Pistol/Eco player fragged a rifle/AWP (upset swing)
      contextMultiplier *= 1.30;
    }

    if (isOpening) {
      contextMultiplier *= 1.15;
    }

    if (isTrade) {
      contextMultiplier *= (RATING_CONFIG.TRADE_SWING_BONUS || 1.15);
    }

    // Cap the action swing at 8% (0.08) as requested by the user
    return Math.min(0.08, rawDelta * contextMultiplier);
  }

  /**
   * Calculates the negative Round Swing penalty for the victim.
   * In HLTV 3.0 win-probability theory, eliminating an opponent gains probability (+swing),
   * while losing a teammate forfeits that probability (-swing).
   * Blunders (losing AWP to pistol) or getting eliminated first (opening death 4v5)
   * severely damage team win probability.
   */
  static calculateVictimSwingPenalty(
    actionSwing: number,
    killer: Player,
    victim: Player,
    isOpening: boolean = false
  ): number {
    const victimWeaponWeight = this.getWeaponWeight(victim.weaponId || victim.primaryWeaponId || undefined);
    const killerWeaponWeight = this.getWeaponWeight(killer.weaponId || killer.primaryWeaponId || undefined);

    let penaltyMultiplier = 1.0; // Base symmetric swing penalty

    // Victim had AWP/Sniper and got killed by pistol/eco:
    // Blunder: threw away $4750 AWP to a pistol
    if (victimWeaponWeight > 1.2 && killerWeaponWeight < 0.6) {
      penaltyMultiplier = 1.35;
    }
    // Victim had Rifle and got killed by pistol/eco:
    else if (victimWeaponWeight >= 1.0 && killerWeaponWeight < 0.6) {
      penaltyMultiplier = 1.20;
    }
    // Victim had AWP/Sniper and got killed by Rifle:
    else if (victimWeaponWeight > 1.2) {
      penaltyMultiplier = 1.10;
    }
    // Victim was on pure eco/pistol and died to Rifle/AWP:
    // Standard expected death on eco: slightly smaller penalty
    else if (victimWeaponWeight < 0.6 && killerWeaponWeight >= 1.0) {
      penaltyMultiplier = 0.80;
    }

    // Opening death penalty: getting eliminated first creates an immediate 4v5 deficit
    if (isOpening) {
      penaltyMultiplier *= 1.30;
    }

    const penalty = Math.abs(actionSwing) * penaltyMultiplier;
    // Cap the victim penalty at 8% (0.08) as requested
    return Math.min(0.08, penalty);
  }

  /**
   * Calculates non-linear multi-kill factor:
   * 1K < 2K < 3K < 4K < 5K with exponential scaling
   */
  static calculateMultiKillFactor(
    k1: number = 0,
    k2: number = 0,
    k3: number = 0,
    k4: number = 0,
    k5: number = 0,
    totalRounds: number = 1
  ): number {
    const rounds = Math.max(1, totalRounds);
    const w = RATING_CONFIG.MULTI_KILL_WEIGHTS;

    const weightedSum =
      k1 * w.k1 * 0.15 +
      k2 * w.k2 +
      k3 * w.k3 +
      k4 * w.k4 +
      k5 * w.k5;

    return weightedSum / rounds;
  }

  /**
   * Calculates clutch factor across all difficulty tiers: 1v1, 1v2, 1v3, 1v4, 1v5
   */
  static calculateClutchFactor(
    c1v1: number = 0,
    c1v2: number = 0,
    c1v3: number = 0,
    c1v4: number = 0,
    c1v5: number = 0,
    totalRounds: number = 1
  ): number {
    const rounds = Math.max(1, totalRounds);
    const w = RATING_CONFIG.CLUTCH_WEIGHTS;

    const totalClutchScore =
      c1v1 * w['1v1'] +
      c1v2 * w['1v2'] +
      c1v3 * w['1v3'] +
      c1v4 * w['1v4'] +
      c1v5 * w['1v5'];

    return (totalClutchScore * 10) / rounds;
  }

  /**
   * Calculates opening duel factor taking into account whether opening kills were traded
   * or converted into round victories.
   */
  static calculateOpeningFactor(
    openingKills: number = 0,
    openingDeaths: number = 0,
    openingKillsTraded: number = 0,
    openingKillsConverted: number = 0,
    totalRounds: number = 1
  ): number {
    const rounds = Math.max(1, totalRounds);

    const nonTradedOpenings = Math.max(0, openingKills - openingKillsTraded);
    const tradedOpenings = openingKillsTraded;

    const openingKillPoints =
      nonTradedOpenings * 1.2 +
      tradedOpenings * RATING_CONFIG.OPENING_DUEL.TRADED_DISCOUNT +
      openingKillsConverted * 0.6;

    const openingDeathPoints = openingDeaths * 0.9;
    const netOpening = openingKillPoints - openingDeathPoints;

    return netOpening / rounds;
  }

  /**
   * Core rating calculation integrating all metrics deterministically.
   */
  static calculatePlayerRating(stats: any, totalRoundsInput?: number): PlayerRatingBreakdown {
    const totalRounds = Math.max(1, Number(totalRoundsInput || stats?.totalRounds) || 1);
    const kills = Number(stats?.kills) || 0;
    const deaths = Number(stats?.deaths) || 0;
    const assists = Number(stats?.assists) || 0;
    const damage = Number(stats?.damage) || 0;

    const kpr = kills / totalRounds;
    const dpr = deaths / totalRounds;
    const apr = assists / totalRounds;
    const adr = damage / totalRounds;
    const kd = deaths > 0 ? kills / deaths : kills;

    // Strict KAST %
    const rawKastRounds = stats?.kastRounds !== undefined ? Number(stats.kastRounds) : undefined;
    const kastRounds = rawKastRounds !== undefined && !isNaN(rawKastRounds)
      ? rawKastRounds
      : Math.round(totalRounds * 0.70);
    const kast = Math.min(100, Math.max(0, (kastRounds / totalRounds) * 100));

    // Multi-kill factor
    const k1 = Number(stats?.k1) || 0;
    const k2 = Number(stats?.k2) || 0;
    const k3 = Number(stats?.k3) || 0;
    const k4 = Number(stats?.k4) || 0;
    const k5 = Number(stats?.k5) || 0;
    const multiKillFactor = this.calculateMultiKillFactor(k1, k2, k3, k4, k5, totalRounds);

    // Clutch factor
    const c1v1 = Number(stats?.clutchesWon1v1) || 0;
    const c1v2 = Number(stats?.clutchesWon1v2) || 0;
    const c1v3 = Number(stats?.clutchesWon1v3) || 0;
    const c1v4 = Number(stats?.clutchesWon1v4) || 0;
    const c1v5 = Number(stats?.clutchesWon1v5) || 0;
    const clutchFactor = this.calculateClutchFactor(c1v1, c1v2, c1v3, c1v4, c1v5, totalRounds);

    // Opening duel factor
    const fk = Number(stats?.openingKills ?? stats?.fk) || 0;
    const fd = Number(stats?.openingDeaths ?? stats?.fd) || 0;
    const fkTraded = Number(stats?.openingKillsTraded) || 0;
    const fkConverted = Number(stats?.openingKillsConverted) || 0;
    const openingFactor = this.calculateOpeningFactor(fk, fd, fkTraded, fkConverted, totalRounds);

    // Round Swing: safely parse number or string formats (e.g. "+3.4%", "3.4", 0.034)
    let totalSwing = 0;
    const rawSwingCandidate = stats?.rawRoundSwing ?? stats?.roundSwingNum ?? stats?.totalSwing ?? stats?.roundSwing;
    if (typeof rawSwingCandidate === 'number') {
      totalSwing = isNaN(rawSwingCandidate) ? 0 : rawSwingCandidate;
    } else if (typeof rawSwingCandidate === 'string') {
      const cleaned = rawSwingCandidate.replace(/%/g, '').replace(/\+/g, '').trim();
      const parsed = parseFloat(cleaned);
      totalSwing = isNaN(parsed) ? 0 : parsed;
    }

    const finalSwingNum = Number(totalSwing) || 0;
    let avgRoundSwing = (finalSwingNum / totalRounds) * 100; // in percent
    // Enforce limits: maximum +8.0%, minimum -8.0% as specified
    avgRoundSwing = Math.max(-8.0, Math.min(8.0, avgRoundSwing));

    // Authentic HLTV 2.0 Impact Rating:
    // Baselines: KPR 0.679, APR 0.14
    // Formula: 2.13 * KPR + 0.12 * APR - 0.41 + Clutches + Multi-kills + Openings
    const rawImpact =
      2.13 * kpr +
      0.12 * apr - 0.41 +
      multiKillFactor * 0.18 +
      clutchFactor * 0.22 +
      openingFactor * 0.20;
    const finalImpact = Math.max(0.20, Math.min(2.30, Number(rawImpact.toFixed(2))));

    // Authentic HLTV 2.0 Rating formula:
    // 5 normalized components centered around 1.00:
    // 1. KPR: (kpr / 0.679) -> weight 0.40 (frags drive rating)
    // 2. Survival: ((1 - dpr) / 0.321) -> weight 0.15 (staying alive is valuable, but doesn't replace frags)
    // 3. Impact: (finalImpact / 1.00) -> weight 0.22 (clutches, multi-kills, openings)
    // 4. ADR: (adr / 75.0) -> weight 0.15 (damage output)
    // 5. KAST: ((kast / 100) / 0.70) -> weight 0.08 (support factor)
    const ratingKpr = kpr / 0.679;
    const rawSurvival = Math.max(0, (1 - dpr)) / 0.321;
    // Survival dampening: staying alive passively cannot carry a rating without kills
    const ratingSurvival = Math.min(1.40, rawSurvival);
    const ratingImpact = finalImpact / 1.00;
    const ratingAdr = adr / 75.0;
    const ratingKast = (kast / 100) / 0.70;

    let computedRating =
      0.40 * ratingKpr +
      0.15 * ratingSurvival +
      0.22 * ratingImpact +
      0.15 * ratingAdr +
      0.08 * ratingKast;

    // Apply subtle round swing modifier (capped at +/- 0.04)
    if (RATING_CONFIG.USE_SWING && avgRoundSwing) {
      const swingContribution = Math.max(-0.04, Math.min(0.04, (avgRoundSwing / 100) * 0.05));
      computedRating += swingContribution;
    }

    // Competitive Balance Guard (Anti-0.8 KD Top Tab):
    // In professional Counter-Strike (HLTV 2.0), a player with negative K/D (< 0.85) and low KPR (< 0.55)
    // cannot hold a 1.00+ rating or take 1st tab over the team's primary fraggers
    if (clutchFactor < 0.15) {
      if (kd < 0.85 && kpr < 0.55) {
        computedRating = Math.min(0.92, computedRating);
      } else if (kd < 0.92 && kpr < 0.60) {
        computedRating = Math.min(0.98, computedRating);
      }
    }

    // Realistic bounds: professional matches stay between 0.30 and 2.30
    computedRating = Math.max(0.30, Math.min(2.30, computedRating));

    return {
      rating: Number(computedRating.toFixed(2)),
      impact: Number(finalImpact.toFixed(2)),
      roundSwing: Number(avgRoundSwing.toFixed(2)),
      totalSwing: Number(finalSwingNum.toFixed(4)),
      kast: Number(kast.toFixed(1)),
      kpr: Number(kpr.toFixed(2)),
      dpr: Number(dpr.toFixed(2)),
      adr: Number(adr.toFixed(1)),
      kd: Number(kd.toFixed(2)),
      multiKillFactor: Number(multiKillFactor.toFixed(3)),
      clutchFactor: Number(clutchFactor.toFixed(3)),
      openingFactor: Number(openingFactor.toFixed(3))
    };
  }
}
