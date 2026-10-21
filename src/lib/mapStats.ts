import { safeLocalStorageSet } from './utils';
import { db, doc, setDoc } from '../firebase';

export async function updateMapStats(
  userId: string,
  match: any,
  skipRemote: boolean = false,
  batch?: any
): Promise<void> {
  if (!userId || userId === 'anonymous') return;
  const maps = match.maps || [];
  if (maps.length === 0) return;

  const currentRaw = localStorage.getItem(`mapStats_${userId}`);
  const currentList = currentRaw ? JSON.parse(currentRaw) : [];
  const mapStatsMap = new Map<string, any>();
  currentList.forEach((item: any) => {
    if (item && item.id) mapStatsMap.set(item.id, item);
  });

  const t1 = match.team1Name;
  const t2 = match.team2Name;

  for (const m of maps) {
    const mapName = m.mapName;
    if (!mapName) continue;

    const id1 = `${t1.toLowerCase().trim()}_${mapName.toLowerCase().trim()}`;
    const won1 = m.team1Score > m.team2Score;
    const stat1 = mapStatsMap.get(id1) || {
      id: id1,
      userId,
      teamName: t1,
      mapName,
      played: 0,
      wins: 0
    };
    stat1.played += 1;
    if (won1) stat1.wins += 1;
    mapStatsMap.set(id1, stat1);

    const id2 = `${t2.toLowerCase().trim()}_${mapName.toLowerCase().trim()}`;
    const won2 = m.team2Score > m.team1Score;
    const stat2 = mapStatsMap.get(id2) || {
      id: id2,
      userId,
      teamName: t2,
      mapName,
      played: 0,
      wins: 0
    };
    stat2.played += 1;
    if (won2) stat2.wins += 1;
    mapStatsMap.set(id2, stat2);
  }

  const allStats = Array.from(mapStatsMap.values());
  safeLocalStorageSet(`mapStats_${userId}`, allStats);

  if (!skipRemote) {
    try {
      const affectedIds = new Set<string>();
      for (const m of maps) {
        if (m.mapName) {
          affectedIds.add(`${t1.toLowerCase().trim()}_${m.mapName.toLowerCase().trim()}`);
          affectedIds.add(`${t2.toLowerCase().trim()}_${m.mapName.toLowerCase().trim()}`);
        }
      }
      const toSync = allStats.filter(s => affectedIds.has(s.id));
      if (batch) {
        toSync.forEach(s => {
          batch.set(doc(db, 'mapStats', `${userId}_${s.id}`), s, { merge: true });
        });
      } else {
        await Promise.all(
          toSync.map(s => setDoc(doc(db, 'mapStats', `${userId}_${s.id}`), s, { merge: true }))
        );
      }
    } catch (e) {
      console.warn('Failed to save mapStats to Firestore, kept locally:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('db-user-updated'));
  }
}

export function migrateMatchesToMapStats(userId: string, matches: any[]): void {
  if (!userId || !Array.isArray(matches) || matches.length === 0) return;
  const current = localStorage.getItem(`mapStats_${userId}`);
  if (current) {
    try {
      const parsed = JSON.parse(current);
      if (Array.isArray(parsed) && parsed.length > 0) return;
    } catch {}
  }

  const statsMap = new Map<string, any>();
  for (const match of matches) {
    if (!match || !match.maps || !match.team1Name || !match.team2Name) continue;
    const t1 = match.team1Name;
    const t2 = match.team2Name;

    for (const m of match.maps) {
      const mapName = m.mapName;
      if (!mapName) continue;

      const id1 = `${t1.toLowerCase().trim()}_${mapName.toLowerCase().trim()}`;
      const won1 = m.team1Score > m.team2Score;
      const stat1 = statsMap.get(id1) || {
        id: id1,
        userId,
        teamName: t1,
        mapName,
        played: 0,
        wins: 0
      };
      stat1.played += 1;
      if (won1) stat1.wins += 1;
      statsMap.set(id1, stat1);

      const id2 = `${t2.toLowerCase().trim()}_${mapName.toLowerCase().trim()}`;
      const won2 = m.team2Score > m.team1Score;
      const stat2 = statsMap.get(id2) || {
        id: id2,
        userId,
        teamName: t2,
        mapName,
        played: 0,
        wins: 0
      };
      stat2.played += 1;
      if (won2) stat2.wins += 1;
      statsMap.set(id2, stat2);
    }
  }

  const finalStats = Array.from(statsMap.values());
  safeLocalStorageSet(`mapStats_${userId}`, finalStats);
  console.log(`Successfully migrated ${matches.length} historical matches to separate mapStats.`);
}
