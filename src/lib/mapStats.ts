import { db } from '../firebase';
import { collection, doc, setDoc, getDoc } from '../firebase';
import { safeLocalStorageSet } from './utils';

export async function updateMapStats(userId: string, matchResult: any, isLocal: boolean = false) {
  if (!userId || userId === 'anonymous') return;
  const mapsPlayed = matchResult.maps || [];
  if (mapsPlayed.length === 0) return;

  const localStats = JSON.parse(localStorage.getItem(`mapStats_${userId}`) || '[]');
  const statsMap = new Map();
  localStats.forEach((s: any) => {
    if (s && s.id) {
      statsMap.set(s.id, s);
    }
  });

  const team1Name = matchResult.team1Name;
  const team2Name = matchResult.team2Name;

  for (const m of mapsPlayed) {
    const mapName = m.mapName;
    if (!mapName) continue;

    // Update for Team 1
    const t1Id = `${team1Name.toLowerCase().trim()}_${mapName.toLowerCase().trim()}`;
    const t1Wins = m.team1Score > m.team2Score;
    const t1Stat = statsMap.get(t1Id) || {
      id: t1Id,
      userId,
      teamName: team1Name,
      mapName: mapName,
      played: 0,
      wins: 0
    };
    t1Stat.played += 1;
    if (t1Wins) t1Stat.wins += 1;
    statsMap.set(t1Id, t1Stat);

    // Update for Team 2
    const t2Id = `${team2Name.toLowerCase().trim()}_${mapName.toLowerCase().trim()}`;
    const t2Wins = m.team2Score > m.team1Score;
    const t2Stat = statsMap.get(t2Id) || {
      id: t2Id,
      userId,
      teamName: team2Name,
      mapName: mapName,
      played: 0,
      wins: 0
    };
    t2Stat.played += 1;
    if (t2Wins) t2Stat.wins += 1;
    statsMap.set(t2Id, t2Stat);
  }

  const updatedStats = Array.from(statsMap.values());
  safeLocalStorageSet(`mapStats_${userId}`, updatedStats);

  // Sync to Firestore if not local demo
  if (!isLocal) {
    try {
      for (const stat of updatedStats) {
        const docId = `${userId}_${stat.id}`;
        await setDoc(doc(db, 'mapStats', docId), stat, { merge: true });
      }
    } catch (e) {
      console.warn("Failed to save mapStats to Firestore, kept locally:", e);
    }
  }

  // Trigger cache sync
  window.dispatchEvent(new Event('db-user-updated'));
}

export function migrateMatchesToMapStats(userId: string, historyMatches: any[]) {
  if (!userId || !Array.isArray(historyMatches) || historyMatches.length === 0) return;
  const localStats = localStorage.getItem(`mapStats_${userId}`);
  
  // If mapStats already exists and is non-empty, we don't overwrite it unless empty
  if (localStats) {
    try {
      const parsed = JSON.parse(localStats);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return; // Already migrated/populated
      }
    } catch (e) {}
  }

  const statsMap = new Map();

  for (const match of historyMatches) {
    if (!match || !match.maps || !match.team1Name || !match.team2Name) continue;
    const team1Name = match.team1Name;
    const team2Name = match.team2Name;

    for (const m of match.maps) {
      const mapName = m.mapName;
      if (!mapName) continue;

      const t1Id = `${team1Name.toLowerCase().trim()}_${mapName.toLowerCase().trim()}`;
      const t1Wins = m.team1Score > m.team2Score;
      const t1Stat = statsMap.get(t1Id) || {
        id: t1Id,
        userId,
        teamName: team1Name,
        mapName: mapName,
        played: 0,
        wins: 0
      };
      t1Stat.played += 1;
      if (t1Wins) t1Stat.wins += 1;
      statsMap.set(t1Id, t1Stat);

      const t2Id = `${team2Name.toLowerCase().trim()}_${mapName.toLowerCase().trim()}`;
      const t2Wins = m.team2Score > m.team1Score;
      const t2Stat = statsMap.get(t2Id) || {
        id: t2Id,
        userId,
        teamName: team2Name,
        mapName: mapName,
        played: 0,
        wins: 0
      };
      t2Stat.played += 1;
      if (t2Wins) t2Stat.wins += 1;
      statsMap.set(t2Id, t2Stat);
    }
  }

  const updatedStats = Array.from(statsMap.values());
  safeLocalStorageSet(`mapStats_${userId}`, updatedStats);
  console.log(`Successfully migrated ${historyMatches.length} historical matches to separate mapStats.`);
}
