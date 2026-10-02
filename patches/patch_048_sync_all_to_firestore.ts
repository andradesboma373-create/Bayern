import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

interface SyncResult {
  collection: string;
  total: number;
  synced: number;
  errors: number;
}

export async function syncAllToFirestore(): Promise<{ success: boolean; results: SyncResult[]; error?: string }> {
  console.log('--- STARTING COMPREHENSIVE FIRESTORE DATA SYNC ---');

  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('firebase-applet-config.json not found');
  }

  const fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log(`Connecting to Firestore database: ${fbConfig.firestoreDatabaseId}`);

  const app = initializeApp(fbConfig);
  const db = getFirestore(app, fbConfig.firestoreDatabaseId);

  // 1. Load local cache
  const cachePath = path.join(process.cwd(), 'local_database_cache.json');
  if (!fs.existsSync(cachePath)) {
    throw new Error('local_database_cache.json not found');
  }
  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

  // 2. Load rooms
  let rooms: any[] = [];
  const roomsPath = path.join(process.cwd(), 'data', 'rooms_storage.json');
  if (fs.existsSync(roomsPath)) {
    try {
      rooms = JSON.parse(fs.readFileSync(roomsPath, 'utf8'));
    } catch (e) {}
  }

  const results: SyncResult[] = [];

function sanitizeForFirestore(val: any): any {
  if (val === null || val === undefined) return val;
  if (Array.isArray(val)) {
    // If it's a 2D array: array of arrays
    if (val.some(item => Array.isArray(item))) {
      const obj: Record<string, any> = { _isNestedArray: true };
      val.forEach((sub, idx) => {
        obj[`item_${idx}`] = Array.isArray(sub) ? sub.map(sanitizeForFirestore) : sanitizeForFirestore(sub);
      });
      return obj;
    }
    return val.map(sanitizeForFirestore);
  }
  if (typeof val === 'object') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (Array.isArray(v) && v.some(sub => Array.isArray(sub))) {
        const obj: Record<string, any> = { _isNestedArray: true };
        v.forEach((sub, idx) => {
          obj[`round_${idx}`] = Array.isArray(sub) ? sub.map(sanitizeForFirestore) : sanitizeForFirestore(sub);
        });
        res[k] = obj;
      } else {
        res[k] = sanitizeForFirestore(v);
      }
    }
    return res;
  }
  return val;
}

  // Helper to sync collection
  const syncItems = async (colName: string, items: Record<string, any> | any[]) => {
    const list = Array.isArray(items) ? items : Object.entries(items).map(([k, v]) => ({ id: k, ...v }));
    const result: SyncResult = { collection: colName, total: list.length, synced: 0, errors: 0 };
    console.log(`Syncing collection "${colName}" (${list.length} documents)...`);

    for (const item of list) {
      if (!item) continue;
      const itemId = item.id || (item.chatId ? `chat_${item.chatId}` : null);
      if (!itemId) continue;

      try {
        const cleanItem = sanitizeForFirestore(JSON.parse(JSON.stringify(item)));
        await setDoc(doc(db, colName, String(itemId)), cleanItem, { merge: true });
        result.synced++;
      } catch (err: any) {
        console.error(`Error syncing ${colName}/${itemId}:`, err.message);
        result.errors++;
      }
    }
    results.push(result);
    console.log(`✓ Collection "${colName}": ${result.synced}/${result.total} synced (errors: ${result.errors})`);
  };

  // Sync teams (all 20 teams including restored tournament teams and club rosters)
  if (cache.teams) {
    await syncItems('teams', cache.teams);
  }

  // Sync players (all 33 players with ratings, roles, and teams)
  if (cache.players) {
    await syncItems('players', cache.players);
  }

  // Sync tournaments
  if (cache.tournaments) {
    await syncItems('tournaments', cache.tournaments);
  }

  // Sync settings
  if (cache.settings) {
    await syncItems('settings', cache.settings);
  }

  // Sync matches
  if (cache.matches) {
    await syncItems('matches', cache.matches);
  }

  // Sync rooms
  if (rooms.length > 0) {
    const safeRooms = rooms.map(({ password, ...rest }) => rest);
    await syncItems('rooms', safeRooms);
  }

  // Verify by reading back a test doc
  const sampleTeam = Object.values(cache.teams || {})[0] as any;
  if (sampleTeam && sampleTeam.id) {
    const snap = await getDoc(doc(db, 'teams', sampleTeam.id));
    console.log(`Verification read back for team "${sampleTeam.id}": exists = ${snap.exists()}`);
  }

  console.log('--- FIRESTORE DATA SYNC FINISHED SUCCESSFULLY ---');
  return { success: true, results };
}

// Allow direct CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  syncAllToFirestore()
    .then(r => {
      console.log('Result:', JSON.stringify(r.results, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('Fatal sync failure:', err);
      process.exit(1);
    });
}
