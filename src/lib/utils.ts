import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cleanupLocalStorage(aggressive = false) {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    const oversizedKeysToCompact: { key: string; val: string }[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // 1. Transient / temporary / legacy / preview keys
      if (
        key.startsWith('player_avatar_') ||
        key.startsWith('cached_db_user_') ||
        key.startsWith('temp_') ||
        key.startsWith('preview_') ||
        key.startsWith('backup_')
      ) {
        keysToRemove.push(key);
        continue;
      }

      // 2. Tournament background images (which are heavy base64 data URLs)
      if (key.startsWith('tournament_bg_')) {
        keysToRemove.push(key);
        continue;
      }

      // 3. Isolated duplicate tournament items if aggressive
      if (aggressive && key.startsWith('tournament_item_')) {
        keysToRemove.push(key);
        continue;
      }

      // 4. Compact oversized keys with embedded base64 data URLs
      try {
        const val = localStorage.getItem(key);
        if (val && val.length > 30000 && val.includes('data:image/')) {
          oversizedKeysToCompact.push({ key, val });
        }
      } catch (e) {}
    }

    keysToRemove.forEach(k => {
      try { localStorage.removeItem(k); } catch (e) {}
    });

    // Compact oversized keys by stripping base64 images
    for (const { key, val } of oversizedKeysToCompact) {
      try {
        const compacted = val.replace(/"data:image\/[^;]+;base64,[^"]+"/g, 'null');
        localStorage.setItem(key, compacted);
      } catch (e) {
        if (aggressive) {
          try { localStorage.removeItem(key); } catch (err) {}
        }
      }
    }
  } catch (e) {
    console.warn("Cleanup localStorage failed:", e);
  }
}

export function sanitizeStoragePayload(data: any): any {
  if (!data) return data;
  if (typeof data === 'string') {
    if (data.startsWith('data:image/') && data.length > 500) return null;
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeStoragePayload(item));
  }
  if (typeof data === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(data)) {
      // Exclude heavy roundLogs from stored objects
      if (key === 'roundLogs') continue;
      const val = data[key];
      if (typeof val === 'string' && val.startsWith('data:image/') && val.length > 500) {
        cleaned[key] = null;
      } else {
        cleaned[key] = sanitizeStoragePayload(val);
      }
    }
    return cleaned;
  }
  return data;
}

export function safeLocalStorageSet(key: string, data: any): boolean {
  if (typeof window === 'undefined') return false;

  let jsonStr = typeof data === 'string' ? data : JSON.stringify(data);

  // 1. Direct try
  try {
    localStorage.setItem(key, jsonStr);
    return true;
  } catch (e) {
    // Quota reached, continue with cleanup
  }

  // 2. Perform standard cleanup
  cleanupLocalStorage(false);

  // 3. Sanitize payload (strip large base64 image strings & round logs)
  try {
    const sanitized = sanitizeStoragePayload(data);
    jsonStr = typeof sanitized === 'string' ? sanitized : JSON.stringify(sanitized);
    localStorage.setItem(key, jsonStr);
    return true;
  } catch (e) {}

  // 4. Fast string regex stripping for any embedded data URLs
  try {
    const stripped = jsonStr.replace(/"data:image\/[^;]+;base64,[^"]+"/g, 'null');
    localStorage.setItem(key, stripped);
    return true;
  } catch (e) {}

  // 5. Aggressive cleanup of localStorage (remove tournament item caches & old backgrounds)
  cleanupLocalStorage(true);

  try {
    const stripped = jsonStr.replace(/"data:image\/[^;]+;base64,[^"]+"/g, 'null');
    localStorage.setItem(key, stripped);
    return true;
  } catch (e) {}

  // 6. If data is an array, try smaller slices
  if (Array.isArray(data)) {
    const sliceSteps = [
      Math.min(25, Math.floor(data.length * 0.7)),
      Math.min(15, Math.floor(data.length * 0.5)),
      10,
      5,
      2,
      1
    ];
    for (const count of sliceSteps) {
      if (count <= 0 || count >= data.length) continue;
      try {
        const sliced = data.slice(0, count);
        const sanitized = sanitizeStoragePayload(sliced);
        const compactStr = JSON.stringify(sanitized).replace(/"data:image\/[^;]+;base64,[^"]+"/g, 'null');
        localStorage.setItem(key, compactStr);
        return true;
      } catch (err) {}
    }
  }

  return false;
}

export function saveMatchesToLocalStorage(userId: string, matchesArray: any[]) {
  if (!userId) return;
  
  // Sort by date descending (newest first)
  const sorted = [...matchesArray].sort((a, b) => {
    const dA = a && a.date ? new Date(a.date).getTime() : 0;
    const dB = b && b.date ? new Date(b.date).getTime() : 0;
    return dB - dA;
  });

  // Keep up to 30 newest matches. Strip heavy base64 and round logs to guarantee small footprint.
  const cleaned = sorted.slice(0, 30).map((m: any) => {
    if (!m) return m;
    
    const t1Name = m.team1Name || m.team1?.name || (typeof m.team1 === 'string' ? m.team1 : 'Команда 1');
    const t2Name = m.team2Name || m.team2?.name || (typeof m.team2 === 'string' ? m.team2 : 'Команда 2');
    const t1Score = m.team1Score ?? m.score1 ?? 0;
    const t2Score = m.team2Score ?? m.score2 ?? 0;

    // Strip heavy base64 logos
    const t1Logo = (m.team1Logo && typeof m.team1Logo === 'string' && m.team1Logo.startsWith('data:image/')) ? null : m.team1Logo;
    const t2Logo = (m.team2Logo && typeof m.team2Logo === 'string' && m.team2Logo.startsWith('data:image/')) ? null : m.team2Logo;

    // Strip base64 avatars from stats
    const stripPlayerAvatars = (statsArr: any[]) => {
      if (!Array.isArray(statsArr)) return [];
      return statsArr.map(p => {
        if (!p) return p;
        const { avatar, photo, ...rest } = p;
        return rest;
      });
    };

    return {
      ...m,
      team1Name: t1Name,
      team2Name: t2Name,
      team1Score: t1Score,
      team2Score: t2Score,
      team1Logo: t1Logo,
      team2Logo: t2Logo,
      team1Stats: stripPlayerAvatars(m.team1Stats),
      team2Stats: stripPlayerAvatars(m.team2Stats),
      // Strip roundLogs inside maps if present to save space
      maps: Array.isArray(m.maps) ? m.maps.map((map: any) => {
        if (!map) return map;
        const { roundLogs, ...mapRest } = map;
        return {
          ...mapRest,
          mapName: mapRest.mapName || mapRest.name || 'de_inferno',
          team1Score: mapRest.team1Score ?? mapRest.score1 ?? 0,
          team2Score: mapRest.team2Score ?? mapRest.score2 ?? 0,
          team1Stats: stripPlayerAvatars(mapRest.team1Stats),
          team2Stats: stripPlayerAvatars(mapRest.team2Stats),
        };
      }) : []
    };
  });

  // Safe fallback writer loop using safeLocalStorageSet
  const sliceCounts = [30, 20, 15, 10, 5, 2, 1, 0];
  for (const count of sliceCounts) {
    const payload = count === 0 ? [] : cleaned.slice(0, count);
    if (safeLocalStorageSet(`matches_${userId}`, payload)) {
      break;
    }
  }
}
