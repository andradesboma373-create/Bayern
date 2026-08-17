export interface PlayerPerk {
  /**
   * Никнейм игрока (регистр и пробелы игнорируются)
   */
  nickname: string;
  
  /**
   * Красивое название уникальной роли / звания в интерфейсе (например, "Legendary IGL", "Clutch God")
   */
  customTitle?: string;
  
  /**
   * Множитель силы стрельбы / навыка (влияет на общий раундный винрейт команды).
   * 1.0 = норма. Больше 1.0 (например, 1.25) = усиливает команду.
   */
  skillMultiplier?: number;
  
  /**
   * Множитель убийств (КД). Повышает вероятность того, что именно этот игрок сделает фраг в раунде.
   * Больше 1.0 (например, 1.2) = делает больше фрагов.
   */
  killMultiplier?: number;
  
  /**
   * Множитель смертей. Понижает или повышает вероятность умереть.
   * Меньше 1.0 (например, 0.8) = выживает лучше, умирает реже.
   */
  deathMultiplier?: number;
  
  /**
   * Множитель ассистов. Повышает вероятность получить помощь в убийстве.
   * Больше 1.0 = больше ассистов.
   */
  assistMultiplier?: number;
  
  /**
   * Тактический бонус всей команде от IGL (капитана).
   * Добавляется к силе всей команды. Например, +0.15 (+15% к тактической силе состава).
   */
  tacticalBonus?: number;
  
  /**
   * Бонус к шансу выиграть сложный клатч или важный раунд.
   * Добавляется к базовому шансу клатча (например, 0.1 = +10% к шансу затащить раунд).
   */
  clutchBonus?: number;
  
  /**
   * Персональный множитель хэдшотов (если захотите кастомизировать %).
   */
  hsMultiplier?: number;
}

/**
 * =========================================================================
 * ИНДИВИДУАЛЬНЫЕ НАСТРОЙКИ ИГРОКОВ (ПЕРКИ) ПО НИКНЕЙМАМ
 * Вы можете вписывать сюда абсолютно любого игрока и задавать ему любые параметры!
 * =========================================================================
 */
export const CUSTOM_PLAYER_PERKS: PlayerPerk[] = [
  {
    nickname: "karrigan",
    customTitle: "Tactical Mastermind 🧠",
    skillMultiplier: 0.95,
    killMultiplier: 0.85,
    deathMultiplier: 1.05,
    assistMultiplier: 1.35,
    tacticalBonus: 0.25,
    clutchBonus: 0.10
  },
  {
    nickname: "s1mple",
    customTitle: "The GOAT 👑",
    skillMultiplier: 1.35,
    killMultiplier: 1.35,
    deathMultiplier: 0.75,
    assistMultiplier: 1.05,
    clutchBonus: 0.25,
    hsMultiplier: 1.15
  },
  {
    nickname: "zywoo",
    customTitle: "The Chosen One ✨",
    skillMultiplier: 1.35,
    killMultiplier: 1.30,
    deathMultiplier: 0.70,
    assistMultiplier: 1.20,
    clutchBonus: 0.20,
    hsMultiplier: 1.10
  },
  {
    nickname: "donk",
    customTitle: "W-Key Machine ⚡",
    skillMultiplier: 1.30,
    killMultiplier: 1.45,
    deathMultiplier: 1.15,
    assistMultiplier: 0.90,
    clutchBonus: 0.05,
    hsMultiplier: 1.40
  },
  {
    nickname: "m0nesy",
    customTitle: "Baby Goat ⚡",
    skillMultiplier: 1.32,
    killMultiplier: 1.32,
    deathMultiplier: 0.72,
    assistMultiplier: 1.00,
    clutchBonus: 0.22,
    hsMultiplier: 1.12
  }
];

// Key for local storage persistence
const LOCAL_PERKS_KEY = 'custom_player_perks_v1';

export function getAllPlayerPerks(): PlayerPerk[] {
  let dynamic: PlayerPerk[] = [];
  try {
    const raw = localStorage.getItem(LOCAL_PERKS_KEY);
    if (raw) {
      dynamic = JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to parse custom player perks from localStorage:", e);
  }

  // Merge dynamic over base perks
  const mergedMap = new Map<string, PlayerPerk>();
  CUSTOM_PLAYER_PERKS.forEach(p => mergedMap.set(p.nickname.toLowerCase().trim(), p));
  dynamic.forEach(p => mergedMap.set(p.nickname.toLowerCase().trim(), p));

  return Array.from(mergedMap.values());
}

export function savePlayerPerk(perk: PlayerPerk): PlayerPerk[] {
  const current = getAllPlayerPerks();
  const index = current.findIndex(p => p.nickname.toLowerCase().trim() === perk.nickname.toLowerCase().trim());
  
  if (index >= 0) {
    current[index] = perk;
  } else {
    current.push(perk);
  }

  try {
    localStorage.setItem(LOCAL_PERKS_KEY, JSON.stringify(current));
  } catch (e) {
    console.error("Failed to save player perks to localStorage:", e);
  }
  return current;
}

export function deletePlayerPerk(nickname: string): PlayerPerk[] {
  const current = getAllPlayerPerks().filter(
    p => p.nickname.toLowerCase().trim() !== nickname.toLowerCase().trim()
  );

  try {
    localStorage.setItem(LOCAL_PERKS_KEY, JSON.stringify(current));
  } catch (e) {
    console.error("Failed to delete player perk from localStorage:", e);
  }
  return current;
}

/**
 * Получает перки для конкретного игрока по его никнейму
 */
export function getPlayerPerks(nickname: string | undefined): PlayerPerk | null {
  if (!nickname) return null;
  const cleanNickname = nickname.trim().toLowerCase();
  const all = getAllPlayerPerks();
  return all.find(p => p.nickname.trim().toLowerCase() === cleanNickname) || null;
}
