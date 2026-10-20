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
  ASSIST_MIN_DAMAGE: 38,
  ASSIST_SWING_SHARE: 0.10,
  TRADE_SWING_BONUS: 1.35,

  // Objective and tactical event swing bonuses (real probability modifiers)
  EVENT_SWING: {
    BOMB_PLANT: 0.025,
    BOMB_DEFUSE: 0.035,
    CLUTCH: {
      '1v1': 0.025,
      '1v2': 0.045,
      '1v3': 0.055,
      '1v4': 0.065,
      '1v5': 0.075
    },
    MULTI_KILL: {
      k2: 0.012,
      k3: 0.024,
      k4: 0.038,
      k5: 0.06
    }
  },

  // Multi-kill non-linear impact weights
  MULTI_KILL_WEIGHTS: {
    k1: 1.0,
    k2: 2.1,
    k3: 4.0,
    k4: 6.8,
    k5: 11.0 // Ace
  },

  // Clutch difficulty weights (1vX situations won)
  CLUTCH_WEIGHTS: {
    '1v1': 1.0,
    '1v2': 2.2,
    '1v3': 4.2,
    '1v4': 7.2,
    '1v5': 12.0
  },

  // Economic Buy Tier multipliers for Round Swing context
  BUY_TIER_WEIGHTS: {
    FULL_BUY: 1.0,
    FORCE_BUY: 0.88,
    SEMI_ECO: 0.68,
    ECO: 0.45,
    PISTOL: 0.72
  },

  // Weapon category tier multipliers (eliminating high-threat weapon yields higher swing)
  WEAPON_TIER_WEIGHTS: {
    SNIPER: 1.25,  // Reduced from 1.35
    RIFLE: 1.00,   // AK, M4, Galil, Famas
    SMG: 0.78,     
    SHOTGUN: 0.75,
    HEAVY: 0.78,
    PISTOL: 0.50,
    DEFAULT: 0.85
  },

  // Penalty multipliers for losing high-value weapon to eco/pistol (e.g. AWP lost to pistol)
  BLUNDER_DEATH_PENALTY: {
    AWP_LOST_TO_PISTOL: 1.30,   // Reduced
    RIFLE_LOST_TO_PISTOL: 1.10, // Reduced
    DEFAULT: 0.75
  },

  // Opening duel modifiers
  OPENING_DUEL: {
    BASE_VALUE: 1.0,
    // If the opening killer is traded within trade window, opening advantage is reduced
    TRADED_DISCOUNT: 0.45,
    // If the team converts the opening kill into a round win, opening kill is boosted
    CONVERTED_ROUND_BONUS: 1.25
  },

  // Base Rating formulation parameters (normalized to ~1.00 baseline)
    RATING_WEIGHTS: {
    KPR_COEFFICIENT: 0.30,        // Balanced fragging impact
    DPR_PENALTY: 0.35,           
    ADR_COEFFICIENT: 0.0025,      // Increased to reward damage impact
    KAST_COEFFICIENT: 0.005,      // Increased for support value
    SWING_COEFFICIENT: 0.70,       // Reduced to stabilize rating swings
    MULTI_KILL_COEFFICIENT: 0.04,  
    CLUTCH_COEFFICIENT: 0.06,      
    OPENING_COEFFICIENT: 0.04,     
    BASE_OFFSET: 0.38              
  },

  // Smoothing coefficient for normalizing performance gaps within a team (0.0 to 1.0)
  // 1.0 = no normalization, 0.0 = all players have team average stats
  STAT_NORMALIZATION_FACTOR: 0.65
};
