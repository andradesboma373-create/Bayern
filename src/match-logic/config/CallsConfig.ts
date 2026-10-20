/**
 * CallsConfig.ts
 * VirtualArena — система рейтинга CALLS для капитанов (0 - 100).
 * Независимая тактическая характеристика: координация, размены, тайминги,
 * ротации, реализация преимущества, игра в меньшинстве, адаптация и исполнение тактики.
 * 
 * ВСЕ формулы строго непрерывны и монотонны (каждый +1 балл CALLS дает ощутимый,
 * но сбалансированный прирост). Никаких ступенчатых порогов.
 * CALLS не трогает напрямую урон, точность стрельбы или индивидуальный аим (OVR).
 */

export const CALLS_CONFIG = {
  // Базовые границы шкалы
  MIN_CALLS: 0,
  MAX_CALLS: 100,
  DEFAULT_CALLS: 70,       // Профессиональный средний уровень тир-1 IGL при отсутствии данных
  NO_CAPTAIN_CALLS: 50,    // Команда без выделенного капитана (микс / разрозненные коллы)

  // Нормализация показателя в диапазон [0.0, 1.0]
  normalize(calls?: number | null): number {
    if (calls === undefined || calls === null || isNaN(Number(calls))) {
      return this.DEFAULT_CALLS / 100;
    }
    const clamped = Math.max(this.MIN_CALLS, Math.min(this.MAX_CALLS, Number(calls)));
    return clamped / 100;
  },

  // 1. Координация: синхронность общих действий команды (0.65 - 1.00)
  // +0.0035 за каждый +1 CALLS
  getCoordination(cNorm: number): number {
    return 0.65 + 0.35 * cNorm;
  },

  // 2. Размены: множитель окна размена (0.75x - 1.10x)
  // +0.0035 за каждый +1 CALLS
  getTradeWindowScale(cNorm: number): number {
    return 0.75 + 0.35 * cNorm;
  },

  // 2. Размены: вероятность моментального коллаута союзникам о позиции убийцы (50% - 95%)
  // +0.0045 за каждый +1 CALLS
  getTradeCommsChance(cNorm: number, teamSynergy: number = 100): number {
    const synergyFactor = 0.85 + (Math.max(10, Math.min(100, teamSynergy)) / 100) * 0.15;
    const baseChance = 0.50 + 0.45 * cNorm;
    return Math.min(0.98, baseChance * synergyFactor);
  },

  // 2. Размены: готовность прицела при выходе на размен (0.68 - 0.94)
  getTradeAimReadiness(cNorm: number): number {
    return 0.68 + 0.26 * cNorm;
  },

  // 3. Тайминги: разброс выхода на точки при совместном выходе (в тиках)
  // CALLS 100: 0 тиков (идеально синхронный выход)
  // CALLS 90: 2 тика
  // CALLS 70: 7 тиков
  // CALLS 50: 12 тиков
  // CALLS 0: 24 тика (растянутый рассинхронизированный выход)
  getTimingStaggerTicks(cNorm: number): number {
    return Math.max(0, Math.round(24 * (1.0 - cNorm)));
  },

  // 4. Ротации: задержка реакции команды на подтвержденную информацию (в тиках)
  // CALLS 100: 0 тиков (мгновенный и четкий колл на перетяжку)
  // CALLS 0: 20 тиков задержки
  getRotationDelayTicks(cNorm: number): number {
    return Math.max(0, Math.round(20 * (1.0 - cNorm)));
  },

  // 4. Ротации: устойчивость опорников к ложным звукам/фейкам (60% - 96%)
  // Капитан не дает опорнику бросить плент при одиночном шуме
  getAnchorPatience(cNorm: number): number {
    return 0.60 + 0.36 * cNorm;
  },

  // 5. Реализация преимущества: фактор дисциплины (снижение глупых соло-поджимов в большинстве)
  // В 5v4, 4v3 снижает шанс агрессивного соло-выпада на 0%..18%
  getAdvantageDisciplineBonus(cNorm: number): number {
    return 0.18 * cNorm;
  },

  // 6. Игра в меньшинстве: точность оценки ситуации для сейва vs ретейка (+0%..+30%)
  // Грамотный IGL лучше считает шансы выбить 2v4/3v5 и вовремя сохраняет экономику
  getDisadvantageDecisionClarity(cNorm: number): number {
    return 0.30 * cNorm;
  },

  // 7. Адаптация: вероятность смены тактики на серии поражений (40% - 94%)
  // При 2+ поражениях подряд IGL ломает игру оппонента (сплиты, фейки, сбивание темпа)
  getTacticalAdaptationChance(cNorm: number): number {
    return 0.40 + 0.54 * cNorm;
  },

  // 8. Исполнение тактики: вероятность того, что игроки займут правильные тактические позиции
  // и выбросят грамотную саппорт-утилиту (62% - 98%)
  getTacticalFidelity(cNorm: number): number {
    return 0.62 + 0.36 * cNorm;
  }
};
