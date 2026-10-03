/**
 * RatingConfig.ts
 * Centralized, fully configurable parameters for the context-aware Rating, Round Swing,
 * KAST, Trade, Multi-kill, and Clutch calculations.
 */

export const RATING_CONFIG = {
  // Runtime toggles (can be updated from Settings)
  USE_KAST: true,
  USE_SWING: true,
  
  applyRatingSettings(settings: { useKast?: boolean; useSwing?: boolean }) {
    if (settings.useKast !== undefined) this.USE_KAST = settings.useKast;
    if (settings.useSwing !== undefined) this.USE_SWING = settings.useSwing;
  },

  // Trade window definition
  // Maximum time in seconds between victim death and killer elimination to qualify as a trade
  TRADE_WINDOW_SECONDS: 5.5,
  SIMULATION_TICKS_PER_SECOND: 10,
  get TRADE_WINDOW_TICKS(): number {
    return Math.round(this.TRADE_WINDOW_SECONDS * this.SIMULATION_TICKS_PER_SECOND);
  },

  // Assist damage threshold: minimum damage dealt to an enemy to be credited as assist
  ASSIST_MIN_DAMAGE: 50,
  ASSIST_SWING_SHARE: 0.40,
  TRADE_SWING_BONUS: 1.45,

  // Objective and tactical event swing bonuses (real probability modifiers)
  EVENT_SWING: {
    BOMB_PLANT: 0.25,
    BOMB_DEFUSE: 0.35,
    CLUTCH: {
      '1v1': 0.40,
      '1v2': 0.65,
      '1v3': 0.90,
      '1v4': 1.20,
      '1v5': 1.60
    },
    MULTI_KILL: {
      k2: 0.15,
      k3: 0.35,
      k4: 0.65,
      k5: 1.10
    }
  },

  // Multi-kill non-linear impact weights
  MULTI_KILL_WEIGHTS: {
    k1: 1.0,
    k2: 2.2,
    k3: 4.2,
    k4: 7.2,
    k5: 12.0 // Ace
  },

  // Clutch difficulty weights (1vX situations won)
  CLUTCH_WEIGHTS: {
    '1v1': 1.0,
    '1v2': 2.4,
    '1v3': 4.6,
    '1v4': 8.0,
    '1v5': 13.5
  },

  // Economic Buy Tier multipliers for Round Swing context
  BUY_TIER_WEIGHTS: {
    FULL_BUY: 1.0,
    FORCE_BUY: 0.85,
    SEMI_ECO: 0.65,
    ECO: 0.40,
    PISTOL: 0.70
  },

  // Weapon category tier multipliers (eliminating high-threat weapon yields higher swing)
  WEAPON_TIER_WEIGHTS: {
    SNIPER: 1.35,  // AWP, SSG
    RIFLE: 1.00,   // AK, M4, Galil, Famas
    SMG: 0.75,     // MP9, Mac10
    SHOTGUN: 0.70,
    HEAVY: 0.75,
    PISTOL: 0.45,
    DEFAULT: 0.80
  },

  // Penalty multipliers for losing high-value weapon to eco/pistol (e.g. AWP lost to pistol)
  BLUNDER_DEATH_PENALTY: {
    AWP_LOST_TO_PISTOL: 1.45,   // Dying with AWP against eco pistol
    RIFLE_LOST_TO_PISTOL: 1.15, // Dying with Rifle against eco pistol
    DEFAULT: 0.75
  },

  // Opening duel modifiers
  OPENING_DUEL: {
    BASE_VALUE: 1.0,
    // If the opening killer is traded within trade window, opening advantage is reduced
    TRADED_DISCOUNT: 0.45,
    // If the team converts the opening kill into a round win, opening kill is boosted
    CONVERTED_ROUND_BONUS: 1.35
  },

  // Base Rating formulation parameters (normalized to ~1.00 baseline)
  RATING_WEIGHTS: {
    KPR_COEFFICIENT: 0.40,
    DPR_PENALTY: 0.48,
    ADR_COEFFICIENT: 0.0035,
    KAST_COEFFICIENT: 0.0075,
    SWING_COEFFICIENT: 1.8,        // Weight for average round swing contribution (HLTV 3.0 scale)
    MULTI_KILL_COEFFICIENT: 0.08,  // Bonus for non-linear multi-kills
    CLUTCH_COEFFICIENT: 0.12,      // Bonus for clutches won
    OPENING_COEFFICIENT: 0.09,     // Net opening impact
    BASE_OFFSET: 0.16              // Anchor constant
  }
};
