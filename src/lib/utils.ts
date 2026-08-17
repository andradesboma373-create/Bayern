import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cleanupLocalStorage() {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      // Remove legacy or transient avatar cache keys which take massive MBs of base64
      if (key.startsWith('player_avatar_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn("Cleanup localStorage failed:", e);
  }
}

export function sanitizeStoragePayload(data: any): any {
  if (!data) return data;
  if (typeof data === 'string') {
    if (data.startsWith('data:image/') && data.length > 1000) return null;
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeStoragePayload(item));
  }
  if (typeof data === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(data)) {
      const val = data[key];
      if (typeof val === 'string' && val.startsWith('data:image/') && val.length > 1000) {
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
    console.warn(`localStorage quota exceeded for key "${key}". Cleaning up...`);
  }

  // 2. Perform cleanup of temporary/cached keys
  cleanupLocalStorage();

  // 3. Sanitize payload (strip large base64 image strings)
  try {
    const sanitized = sanitizeStoragePayload(data);
    jsonStr = typeof sanitized === 'string' ? sanitized : JSON.stringify(sanitized);
    localStorage.setItem(key, jsonStr);
    return true;
  } catch (e) {
    console.warn(`Sanitized write failed for key "${key}". Trying stripped string replacement...`);
  }

  // 4. Fallback string regex stripping for any embedded data URLs
  try {
    const stripped = jsonStr.replace(/"data:image\/[^;]+;base64,[^"]+"/g, 'null');
    localStorage.setItem(key, stripped);
    return true;
  } catch (e) {
    console.error(`Safe localStorage write failed completely for key "${key}"`, e);
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

  // Keep up to 50 newest matches. Preserve all fields needed for rendering match list and details.
  const cleaned = sorted.slice(0, 50).map((m: any) => {
    if (!m) return m;
    
    const t1Name = m.team1Name || m.team1?.name || (typeof m.team1 === 'string' ? m.team1 : 'Команда 1');
    const t2Name = m.team2Name || m.team2?.name || (typeof m.team2 === 'string' ? m.team2 : 'Команда 2');
    const t1Score = m.team1Score ?? m.score1 ?? 0;
    const t2Score = m.team2Score ?? m.score2 ?? 0;

    return {
      ...m,
      team1Name: t1Name,
      team2Name: t2Name,
      team1Score: t1Score,
      team2Score: t2Score,
      // Strip only heavy roundLogs inside maps if present to save space
      maps: Array.isArray(m.maps) ? m.maps.map((map: any) => {
        if (!map) return map;
        const { roundLogs, ...mapRest } = map;
        return {
          ...mapRest,
          mapName: mapRest.mapName || mapRest.name || 'de_inferno',
          team1Score: mapRest.team1Score ?? mapRest.score1 ?? 0,
          team2Score: mapRest.team2Score ?? mapRest.score2 ?? 0,
        };
      }) : []
    };
  });

  // Safe fallback writer loop using safeLocalStorageSet
  const sliceCounts = [50, 35, 20, 10, 5, 0];
  for (const count of sliceCounts) {
    const payload = count === 0 ? [] : cleaned.slice(0, count);
    if (safeLocalStorageSet(`matches_${userId}`, payload)) {
      break;
    }
  }
}
