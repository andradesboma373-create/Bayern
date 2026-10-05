import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, setLogLevel } from 'firebase/firestore';

try {
  setLogLevel('silent');
} catch (e) {}

export let isCloudQuotaExhausted = false;
let quotaCooldownUntil = 0;

export function markQuotaExhausted() {
  if (!isCloudQuotaExhausted) {
    console.warn('[QuotaTracker] Cloud Firestore write quota reached. Switching seamlessly to resilient local database mode.');
  }
  isCloudQuotaExhausted = true;
  // 1 hour cooldown before attempting Cloud write sync again
  quotaCooldownUntil = Date.now() + 60 * 60 * 1000;
  currentTelemetry.remainingWrites = 0;
  currentTelemetry.writesToday = currentTelemetry.maxWrites;
  recalculateDerivedValues();
  persistLocalTelemetry();
}

export function isQuotaExhausted(): boolean {
  if (isCloudQuotaExhausted && Date.now() > quotaCooldownUntil) {
    // Cooldown elapsed, allow retry
    isCloudQuotaExhausted = false;
  }
  return isCloudQuotaExhausted;
}

export interface QuotaTelemetry {
  date: string;
  readsToday: number;
  writesToday: number;
  maxReads: number;
  maxWrites: number;
  remainingReads: number;
  remainingWrites: number;
  percentReads: number;
  percentWrites: number;
  percentReadsFormatted: string;
  percentWritesFormatted: string;
  lastUpdated: string;
  lastSyncWithFirestore: string | null;
  firestoreConnected: boolean;
  firestoreDatabaseId: string;
  projectId: string;
  collectionCounts: Record<string, number>;
  roomActivity: Record<string, { reads: number; writes: number; lastActive: string }>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const TELEMETRY_FILE = path.join(DATA_DIR, 'firebase_quota_telemetry.json');

let firestoreInstance: any = null;
let databaseId = 'ai-studio-matchsimulator-cf882484-249e-4726-9c8b-046071d33a59';
let projectId = 'conductive-state-tf6jr';

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

const currentTelemetry: QuotaTelemetry = {
  date: getTodayString(),
  readsToday: 0,
  writesToday: 0,
  maxReads: 50000,
  maxWrites: 20000,
  remainingReads: 50000,
  remainingWrites: 20000,
  percentReads: 0,
  percentWrites: 0,
  percentReadsFormatted: '0.00%',
  percentWritesFormatted: '0.00%',
  lastUpdated: new Date().toISOString(),
  lastSyncWithFirestore: null,
  firestoreConnected: false,
  firestoreDatabaseId: databaseId,
  projectId: projectId,
  collectionCounts: {
    teams: 20,
    players: 99,
    matches: 8,
    tournaments: 1,
    settings: 8,
    rooms: 4
  },
  roomActivity: {
    channel_bamep_cs2: { reads: 0, writes: 0, lastActive: new Date().toISOString() },
    channel_airy: { reads: 0, writes: 0, lastActive: new Date().toISOString() },
    channel_simu: { reads: 0, writes: 0, lastActive: new Date().toISOString() }
  }
};

// Initialize Firebase connection
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    databaseId = config.firestoreDatabaseId || databaseId;
    projectId = config.projectId || projectId;
    currentTelemetry.firestoreDatabaseId = databaseId;
    currentTelemetry.projectId = projectId;

    const app = getApps().length > 0 ? getApp() : initializeApp(config);
    firestoreInstance = getFirestore(app, databaseId);
    currentTelemetry.firestoreConnected = true;
    console.log(`[QuotaTracker] Connected to Firestore database: ${databaseId}`);
  }
} catch (err: any) {
  console.warn('[QuotaTracker] Firebase connection initialization warning:', err.message);
}

// Load local telemetry file if present
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(TELEMETRY_FILE)) {
    const raw = fs.readFileSync(TELEMETRY_FILE, 'utf8');
    const saved = JSON.parse(raw);
    if (saved && saved.date === getTodayString()) {
      currentTelemetry.readsToday = Math.max(currentTelemetry.readsToday, saved.readsToday || 0);
      currentTelemetry.writesToday = Math.max(currentTelemetry.writesToday, saved.writesToday || 0);
      if (saved.roomActivity) {
        currentTelemetry.roomActivity = { ...currentTelemetry.roomActivity, ...saved.roomActivity };
      }
      if (saved.collectionCounts) {
        currentTelemetry.collectionCounts = { ...currentTelemetry.collectionCounts, ...saved.collectionCounts };
      }
    }
  }
} catch (e) {}

recalculateDerivedValues();

function recalculateDerivedValues() {
  const today = getTodayString();
  if (currentTelemetry.date !== today) {
    // Reset for new day
    currentTelemetry.date = today;
    currentTelemetry.readsToday = 0;
    currentTelemetry.writesToday = 0;
    for (const r of Object.keys(currentTelemetry.roomActivity)) {
      currentTelemetry.roomActivity[r].reads = 0;
      currentTelemetry.roomActivity[r].writes = 0;
    }
  }

  currentTelemetry.remainingReads = Math.max(0, currentTelemetry.maxReads - currentTelemetry.readsToday);
  currentTelemetry.remainingWrites = Math.max(0, currentTelemetry.maxWrites - currentTelemetry.writesToday);

  const rawReadsPct = (currentTelemetry.readsToday / currentTelemetry.maxReads) * 100;
  const rawWritesPct = (currentTelemetry.writesToday / currentTelemetry.maxWrites) * 100;

  currentTelemetry.percentReads = Number(rawReadsPct.toFixed(2));
  currentTelemetry.percentWrites = Number(rawWritesPct.toFixed(2));
  currentTelemetry.percentReadsFormatted = `${rawReadsPct.toFixed(2)}%`;
  currentTelemetry.percentWritesFormatted = `${rawWritesPct.toFixed(2)}%`;
  currentTelemetry.lastUpdated = new Date().toISOString();
}

function persistLocalTelemetry() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(TELEMETRY_FILE, JSON.stringify(currentTelemetry, null, 2), 'utf8');
  } catch (err) {
    console.warn('[QuotaTracker] Failed to write local telemetry:', err);
  }
}

let syncTimeout: NodeJS.Timeout | null = null;
function scheduleFirestoreSync() {
  if (isQuotaExhausted()) return;
  if (syncTimeout) return;
  syncTimeout = setTimeout(async () => {
    syncTimeout = null;
    await syncToFirestore();
  }, 2000);
}

export async function syncToFirestore(): Promise<boolean> {
  if (!firestoreInstance || isQuotaExhausted()) return false;
  try {
    recalculateDerivedValues();
    const metricsRef = doc(firestoreInstance, 'system_metrics', 'firestore_quota');
    await setDoc(metricsRef, {
      date: currentTelemetry.date,
      readsToday: currentTelemetry.readsToday,
      writesToday: currentTelemetry.writesToday,
      maxReads: currentTelemetry.maxReads,
      maxWrites: currentTelemetry.maxWrites,
      remainingReads: currentTelemetry.remainingReads,
      remainingWrites: currentTelemetry.remainingWrites,
      percentReadsFormatted: currentTelemetry.percentReadsFormatted,
      percentWritesFormatted: currentTelemetry.percentWritesFormatted,
      lastUpdated: currentTelemetry.lastUpdated,
      collectionCounts: currentTelemetry.collectionCounts,
      roomActivity: currentTelemetry.roomActivity,
      projectId: currentTelemetry.projectId,
      firestoreDatabaseId: currentTelemetry.firestoreDatabaseId
    }, { merge: true });

    currentTelemetry.lastSyncWithFirestore = new Date().toISOString();
    currentTelemetry.firestoreConnected = true;
    persistLocalTelemetry();
    return true;
  } catch (e: any) {
    if (
      e?.code === 'resource-exhausted' ||
      (typeof e?.message === 'string' && (
        e.message.includes('RESOURCE_EXHAUSTED') ||
        e.message.includes('Quota limit exceeded') ||
        e.message.includes('Free daily write units per project')
      ))
    ) {
      markQuotaExhausted();
      return false;
    }
    return false;
  }
}

export async function fetchLiveQuotaFromFirestore(): Promise<QuotaTelemetry> {
  recalculateDerivedValues();
  if (!firestoreInstance || isQuotaExhausted()) {
    return { ...currentTelemetry };
  }

  try {
    const metricsRef = doc(firestoreInstance, 'system_metrics', 'firestore_quota');
    const snap = await getDoc(metricsRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.date === getTodayString()) {
        // Merge with highest numbers
        currentTelemetry.readsToday = Math.max(currentTelemetry.readsToday, Number(data.readsToday) || 0);
        currentTelemetry.writesToday = Math.max(currentTelemetry.writesToday, Number(data.writesToday) || 0);
        if (data.collectionCounts) {
          currentTelemetry.collectionCounts = { ...currentTelemetry.collectionCounts, ...data.collectionCounts };
        }
        if (data.roomActivity) {
          currentTelemetry.roomActivity = { ...currentTelemetry.roomActivity, ...data.roomActivity };
        }
        currentTelemetry.lastSyncWithFirestore = new Date().toISOString();
      }
    }
  } catch (err: any) {
    if (
      err?.code === 'resource-exhausted' ||
      (typeof err?.message === 'string' && (
        err.message.includes('RESOURCE_EXHAUSTED') ||
        err.message.includes('Quota limit exceeded')
      ))
    ) {
      markQuotaExhausted();
    }
  }

  recalculateDerivedValues();
  persistLocalTelemetry();
  return { ...currentTelemetry };
}

export function recordFirestoreRead(count: number = 1, roomId?: string, collectionName?: string) {
  currentTelemetry.readsToday += count;
  if (roomId) {
    const roomKey = roomId.replace('@matchsimulator.com', '');
    if (!currentTelemetry.roomActivity[roomKey]) {
      currentTelemetry.roomActivity[roomKey] = { reads: 0, writes: 0, lastActive: new Date().toISOString() };
    }
    currentTelemetry.roomActivity[roomKey].reads += count;
    currentTelemetry.roomActivity[roomKey].lastActive = new Date().toISOString();
  }
  recalculateDerivedValues();
  persistLocalTelemetry();
  scheduleFirestoreSync();
}

export function recordFirestoreWrite(count: number = 1, roomId?: string, collectionName?: string) {
  currentTelemetry.writesToday += count;
  if (roomId) {
    const roomKey = roomId.replace('@matchsimulator.com', '');
    if (!currentTelemetry.roomActivity[roomKey]) {
      currentTelemetry.roomActivity[roomKey] = { reads: 0, writes: 0, lastActive: new Date().toISOString() };
    }
    currentTelemetry.roomActivity[roomKey].writes += count;
    currentTelemetry.roomActivity[roomKey].lastActive = new Date().toISOString();
  }
  if (collectionName && currentTelemetry.collectionCounts[collectionName] !== undefined) {
    // If saving document, ensure collection count is up to date
  }
  recalculateDerivedValues();
  persistLocalTelemetry();
  scheduleFirestoreSync();
}

export function updateCollectionCounts(counts: Record<string, number>) {
  currentTelemetry.collectionCounts = { ...currentTelemetry.collectionCounts, ...counts };
  persistLocalTelemetry();
  scheduleFirestoreSync();
}

export function getTelemetrySnapshot(): QuotaTelemetry {
  recalculateDerivedValues();
  return { ...currentTelemetry };
}

// Initial sync with Firestore on startup
setTimeout(() => {
  fetchLiveQuotaFromFirestore().catch(() => {});
}, 1000);
