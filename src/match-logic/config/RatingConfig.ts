/**
 * RatingConfig.ts
 * Centralized, fully configurable parameters for the context-aware Rating, Round Swing,
 * KAST, Trade, Multi-kill, and Clutch calculations.
 */

export const RATING_CONFIG = {
  // Trade window definition
  // Maximum time in seconds between victim death and killer elimination to qualify as a trade
  TRADE_WINDOW_SECONDS: 5.5,
  SIMULATION_TICKS_PER_SECOND: 10,
  get TRADE_WINDOW_TICKS(): number {
    return Math.round(this.TRADE_WINDOW_SECONDS * this.SIMULATION_TICKS_PER_SECOND);
  },

  // Assist damage threshold: minimum damage dealt to an enemy to be credited as assist
  ASSIST_MIN_DAMAGE: 26,
  ASSIST_SWING_SHARE: 0.50,
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
    KPR_COEFFICIENT: 0.36,
    DPR_PENALTY: 0.52,
    ADR_COEFFICIENT: 0.0035,
    KAST_COEFFICIENT: 0.0075,
    SWING_COEFFICIENT: 2.2,        // Weight for average round swing contribution (HLTV 3.0 scale)
    MULTI_KILL_COEFFICIENT: 0.08,  // Bonus for non-linear multi-kills
    CLUTCH_COEFFICIENT: 0.12,      // Bonus for clutches won
    OPENING_COEFFICIENT: 0.09,     // Net opening impact
    BASE_OFFSET: 0.16              // Anchor constant
  }
};

/**
 * FormatWeightProfile: Specialized esports weights for Swing (luck / comebacks / upset variance)
 * and Cast (roster baseline strength / KAST discipline) depending on match format (Bo1 vs Bo3 vs Bo5).
 */
export interface FormatWeightProfile {
  format: 'BO1' | 'BO3' | 'BO5';
  name: string;
  shortLabel: string;
  swingMultiplier: number;     // Вес "Свинга": удача, клатчи, камбеки, эко-раунды, апсеты
  castMultiplier: number;      // Вес "Каста": фундаментальная сила ростера, скилл и синергия
  momentumWeight: number;      // Влияние винстриков и психологического моментума
  kastMultiplier: number;      // Вес системной стабильности и разменов KAST
  upsetPotential: number;      // Процентная оценка вероятности сенсации (апсета)
  upsetChanceDescription: string;
  summary: string;
}

export const MATCH_FORMAT_PROFILES: Record<string, FormatWeightProfile> = {
  BO1: {
    format: 'BO1',
    name: 'Best of 1 (Матч на одной карте)',
    shortLabel: 'Bo1 • Высокий свинг / Апсеты',
    swingMultiplier: 1.35,      // +35% влияние удачи, камбеков, пистолеток и клатчей
    castMultiplier: 0.82,       // Разрыв в базовой силе команд сглажен (андердог опасен)
    momentumWeight: 1.30,       // Повышенный моментум раундов
    kastMultiplier: 0.88,       // Хаос раундов снижает долю чистой системности
    upsetPotential: 42,
    upsetChanceDescription: 'Высокая (до 42% апсетов)',
    summary: 'Удача и камбеки (Свинг 1.35x) решают исход матча. Преимущество фаворита сглажено (Каст 0.82x).'
  },
  BO3: {
    format: 'BO3',
    name: 'Best of 3 (Турнирный стандарт)',
    shortLabel: 'Bo3 • Турнирный эталон',
    swingMultiplier: 1.00,      // Эталонный киберспортивный баланс HLTV
    castMultiplier: 1.00,       // Базовая сила ростера и синергия раскрываются полностью
    momentumWeight: 1.00,       // Сбалансированный моментум
    kastMultiplier: 1.00,       // Стандартный вес KAST
    upsetPotential: 22,
    upsetChanceDescription: 'Сбалансированная (~22% апсетов)',
    summary: 'Золотой стандарт киберспорта: баланс базовой мощи команд (Каст 1.0x) и тактических камбеков (Свинг 1.0x).'
  },
  BO5: {
    format: 'BO5',
    name: 'Best of 5 (Гранд-финал / Выносливость)',
    shortLabel: 'Bo5 • Доминирование базы',
    swingMultiplier: 0.85,      // Случайные флюки нивелируются на длинной дистанции
    castMultiplier: 1.18,       // Побеждает фундаментальный скилл, мап-пул и выносливость
    momentumWeight: 0.85,       // Высокая дисциплина
    kastMultiplier: 1.15,       // Высочайшая ценность выживаемости и трейдов (KAST)
    upsetPotential: 9,
    upsetChanceDescription: 'Минимальная (<10% апсетов)',
    summary: 'Дистанция исключает случайности. Доминирует фундаментальный скилл ростера (Каст 1.18x) и KAST-дисциплина.'
  }
};

export function getFormatProfile(formatInput?: string, mapCount?: number): FormatWeightProfile {
  const norm = (formatInput || '').toUpperCase().trim();
  if (norm === 'BO1' || norm.includes('1') || mapCount === 1) {
    return MATCH_FORMAT_PROFILES.BO1;
  }
  if (norm === 'BO5' || norm.includes('5') || mapCount === 5) {
    return MATCH_FORMAT_PROFILES.BO5;
  }
  return MATCH_FORMAT_PROFILES.BO3;
}

