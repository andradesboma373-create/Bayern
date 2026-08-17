import fs from 'fs';
import sharp from 'sharp';
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocketServer } from "ws";
import http from "http";
import multer from "multer";
import { GoogleGenAI, Modality, GenerateVideosOperation, Type, ThinkingLevel, LiveServerMessage } from "@google/genai";
import "dotenv/config";

// =========================================================================
// КРИТИЧЕСКИЕ НАСТРОЙКИ: ПРЯМАЯ НАСТРОЙКА TELEGRAM БОТА (ВСТАВЬТЕ СВОЙ ТОКЕН СЮДА)
// =========================================================================
// Если у вас не работает бот или вы хотите запустить его на 100% напрямую,
// просто вставьте токен вашего бота в переменную ниже.
// Пример: "8993403294:AAELhlfhAU2iG6xW8cAj5qoihpx2uI9JtUE"
export const DIRECT_TELEGRAM_BOT_TOKEN: string = ""; 

// Идентификатор лиги/менеджера (по умолчанию: "channel_bamep_cs2@matchsimulator.com" для аккаунта bamep)
export const DIRECT_BOT_USER_ID: string = "channel_bamep_cs2@matchsimulator.com";
// =========================================================================

// ==========================================
// RESILIENT DISK LOGGER FOR TELEMETRY
// ==========================================
const logPath = path.join(process.cwd(), "server_logs.txt");
try {
  fs.writeFileSync(logPath, `=== Server Log Started at ${new Date().toISOString()} ===
`, "utf8");
} catch (e) {}

function appendToLogFile(level: string, args: any[]) {
  try {
    const time = new Date().toISOString();
    const str = args.map(a => {
      if (a instanceof Error) {
        return a.stack || a.message;
      }
      return typeof a === 'object' ? JSON.stringify(a) : String(a);
    }).join(' ');
    fs.appendFileSync(logPath, `[${time}] [${level}] ${str}
`, "utf8");
  } catch (e) {}
}

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args: any[]) => {
  originalLog(...args);
  appendToLogFile("INFO", args);
};
console.error = (...args: any[]) => {
  originalError(...args);
  appendToLogFile("ERROR", args);
};
console.warn = (...args: any[]) => {
  originalWarn(...args);
  appendToLogFile("WARN", args);
};
// ==========================================

import { MAP_POOL_CS2, MAP_POOL_S2 } from "./src/lib/simulation";
// Suppress benign Firebase idle stream warnings
const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes("GrpcConnection RPC") && args[0].includes("CANCELLED: Disconnecting idle stream")) {
    return; // Ignore benign timeout warnings
  }
  originalConsoleError(...args);
};


const db = "localdb";

// ==========================================
// RESILIENT LOCAL DISK DATABASE FALLBACK
// ==========================================
class FallbackDB {
  private cachePath = path.join(process.cwd(), "local_database_cache.json");
  private data: Record<string, Record<string, any>> = {};

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.cachePath)) {
        const raw = fs.readFileSync(this.cachePath, 'utf8');
        this.data = JSON.parse(raw);
        console.log("Successfully loaded local database cache from disk.");
      } else {
        this.data = {
          settings: {}, tgUsers: {}, teams: {}, players: {}, swapOffers: {},
          tgVetos: {}, matches: {}, tournaments: {}, freeAgents: {}, mapStats: {}
        };
      }
    } catch (err: any) {
      console.error("Error loading local database cache:", err.message);
      this.data = {};
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.cachePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err: any) {
      console.error("Error saving local database cache to disk:", err.message);
    }
  }

  public get(collectionName: string, id: string): any {
    return this.data[collectionName]?.[id] || null;
  }

  public set(collectionName: string, id: string, docData: any) {
    if (!this.data[collectionName]) {
      this.data[collectionName] = {};
    }
    this.data[collectionName][id] = { ...this.data[collectionName][id], ...docData, id };
    this.save();
  }

  public delete(collectionName: string, id: string) {
    if (this.data[collectionName] && this.data[collectionName][id]) {
      delete this.data[collectionName][id];
      this.save();
    }
  }

  public getAll(collectionName: string): any[] {
    return Object.values(this.data[collectionName] || {});
  }
}

const fallbackDb = new FallbackDB();

function collection(db: any, path: string) { return { path }; }
function doc(db: any, path?: any, id?: string) {
  if (db && typeof db === 'object' && db.path && !path) {
    const colPath = db.path;
    const generatedId = 'local_' + Math.random().toString(36).substring(2, 15);
    return { path: `${colPath}/${generatedId}`, id: generatedId };
  }
  if (typeof path === 'string') {
    const finalId = id || 'local_' + Math.random().toString(36).substring(2, 15);
    return { path: `${path}/${finalId}`, id: finalId };
  }
  return { path: String(db), id: 'local_doc' };
}
function query(col: any, ...filters: any[]) { return { path: col.path, filters }; }
function where(field: string, op: string, value: any) { return { field, op, value }; }
function orderBy(field: string, direction: string = 'asc') { return { field, op: 'orderBy', value: direction }; }
function limit(count: number) { return { field: 'limit', op: 'limit', value: count }; }
const increment = (n: number) => ({ __op: 'increment', value: n });
const runTransaction = async (db: any, callback: any) => {
  // A very mock transaction that just runs the callback with a mock transaction object
  const mockTx = {
    get: async (ref: any) => getDoc(ref),
    set: (ref: any, data: any, opts: any) => setDoc(ref, data, opts),
    update: (ref: any, data: any) => updateDoc(ref, data),
    delete: (ref: any) => deleteDoc(ref)
  };
  return callback(mockTx);
};


function getCollectionPath(ref: any): string {
  if (!ref) return '';
  if (typeof ref.path === 'string') return ref.path;
  if (ref._query?.path?.segments) {
    return ref._query.path.segments.join('/');
  }
  if (ref.query?.path?.segments) {
    return ref.query.path.segments.join('/');
  }
  return '';
}

function extractFilterValue(valObj: any): any {
  if (valObj === null || valObj === undefined) return valObj;
  if (typeof valObj !== 'object') return valObj;
  if ('stringValue' in valObj) return valObj.stringValue;
  if ('integerValue' in valObj) return Number(valObj.integerValue);
  if ('booleanValue' in valObj) return !!valObj.booleanValue;
  if ('doubleValue' in valObj) return Number(valObj.doubleValue);
  if ('nullValue' in valObj) return null;
  return valObj;
}

function parseQueryFilters(queryRef: any): { collectionPath: string; filters: Array<{ field: string; op: string; value: any }> } {
  let collectionPath = '';
  const filters: Array<{ field: string; op: string; value: any }> = [];

  if (!queryRef) return { collectionPath, filters };

  if (queryRef.path) {
    collectionPath = queryRef.path;
    if (Array.isArray(queryRef.filters)) {
      filters.push(...queryRef.filters);
    }
  } else if (queryRef._query) {
    if (queryRef._query.path) {
      collectionPath = queryRef._query.path.segments.join('/');
    }
    if (Array.isArray(queryRef._query.filters)) {
      for (const f of queryRef._query.filters) {
        const field = f.field?.segments?.join('.') || f.field?.canonicalString?.() || '';
        const op = f.op || '==';
        const value = extractFilterValue(f.value);
        if (field) {
          filters.push({ field, op, value });
        }
      }
    }
  }
  return { collectionPath, filters };
}

function matchDocWithFilters(docData: any, filters: Array<{ field: string; op: string; value: any }>): boolean {
  for (const f of filters) {
    const val = docData[f.field];
    if (val === undefined) {
      if (f.value !== undefined && f.value !== null) return false;
      continue;
    }
    
    const expected = f.value;
    if (f.op === '==' || f.op === 'EQUAL') {
      if (val !== expected) return false;
    } else if (f.op === '!=' || f.op === 'NOT_EQUAL') {
      if (val === expected) return false;
    } else if (f.op === '>' || f.op === 'GREATER_THAN') {
      if (!(val > expected)) return false;
    } else if (f.op === '>=' || f.op === 'GREATER_THAN_OR_EQUAL') {
      if (!(val >= expected)) return false;
    } else if (f.op === '<' || f.op === 'LESS_THAN') {
      if (!(val < expected)) return false;
    } else if (f.op === '<=' || f.op === 'LESS_THAN_OR_EQUAL') {
      if (!(val <= expected)) return false;
    } else if (f.op === 'array-contains') {
      if (!Array.isArray(val) || !val.includes(expected)) return false;
    }
  }
  return true;
}

class MockDocumentSnapshot {
  public id: string;
  private docData: any;
  constructor(id: string, docData: any) {
    this.id = id;
    this.docData = docData;
  }
  exists() {
    return this.docData !== null && this.docData !== undefined;
  }
  data() {
    return this.docData;
  }
}

class MockQuerySnapshot {
  public docs: MockDocumentSnapshot[];
  public size: number;
  public empty: boolean;
  constructor(docs: MockDocumentSnapshot[]) {
    this.docs = docs;
    this.size = docs.length;
    this.empty = docs.length === 0;
  }
  forEach(callback: (doc: MockDocumentSnapshot) => void) {
    this.docs.forEach(callback);
  }
}

const loadedCollections = new Set<string>();

async function getDoc(docRef: any): Promise<any> {
  const pathParts = (typeof docRef === "string" ? docRef : docRef.path).split('/');
  const collectionName = pathParts[0];
  const id = pathParts[pathParts.length - 1];
  const cachedData = fallbackDb.get(collectionName, id);
  return new MockDocumentSnapshot(id, cachedData);
}

async function setDoc(docRef: any, data: any, options?: any): Promise<any> {
  const pathParts = (typeof docRef === "string" ? docRef : docRef.path).split('/');
  const collectionName = pathParts[0];
  const id = pathParts[pathParts.length - 1];
  
  const newData = { ...data };
  const existing = fallbackDb.get(collectionName, id) || {};
  
  for (const key in newData) {
    if (newData[key] && newData[key].__op === 'increment') {
      newData[key] = (existing[key] || 0) + newData[key].value;
    }
  }

  if (options && options.merge) {
    fallbackDb.set(collectionName, id, { ...existing, ...newData });
  } else {
    fallbackDb.set(collectionName, id, newData);
  }
  return { success: true };
}

async function updateDoc(docRef: any, data: any): Promise<any> {
  const pathParts = (typeof docRef === "string" ? docRef : docRef.path).split('/');
  const collectionName = pathParts[0];
  const id = pathParts[pathParts.length - 1];
  const existing = fallbackDb.get(collectionName, id);
  if (!existing) throw new Error("Document not found");
  
  const newData = { ...data };
  for (const key in newData) {
    if (newData[key] && newData[key].__op === 'increment') {
      newData[key] = (existing[key] || 0) + newData[key].value;
    }
  }
  
  fallbackDb.set(collectionName, id, { ...existing, ...newData });
  return { success: true };
}

async function deleteDoc(docRef: any): Promise<any> {
  const pathParts = (typeof docRef === "string" ? docRef : docRef.path).split('/');
  const collectionName = pathParts[0];
  const id = pathParts[pathParts.length - 1];
  fallbackDb.delete(collectionName, id);
  return { success: true };
}

async function addDoc(collectionRef: any, data: any): Promise<any> {
  const collectionName = typeof collectionRef === "string" ? collectionRef : collectionRef.path;
  const id = 'local_' + Math.random().toString(36).substring(2, 15);
  fallbackDb.set(collectionName, id, data);
  return { id, path: `${collectionName}/${id}` };
}

async function getDocs(queryRef: any): Promise<any> {
  const { collectionPath, filters } = parseQueryFilters(queryRef);
  const cachedDocs = fallbackDb.getAll(collectionPath);
  const filteredDocs = cachedDocs.filter(docData => matchDocWithFilters(docData, filters));
  const mockSnaps = filteredDocs.map(docData => new MockDocumentSnapshot(docData.id || 'local_doc', docData));
  return new MockQuerySnapshot(mockSnaps);
}
// ==========================================

export function getVetoSteps(format: string, game: string): Array<{ action: 'ban' | 'pick' | 'decider', teamIndex: 1 | 2 }> {
  const isCS2 = game === 'cs2';
  if (format === 'BO1') {
    if (isCS2) {
      return [
        { action: 'ban', teamIndex: 1 },
        { action: 'ban', teamIndex: 2 },
        { action: 'ban', teamIndex: 1 },
        { action: 'ban', teamIndex: 2 },
        { action: 'ban', teamIndex: 1 },
        { action: 'ban', teamIndex: 2 },
      ];
    } else {
      return [
        { action: 'ban', teamIndex: 1 },
        { action: 'ban', teamIndex: 2 },
        { action: 'ban', teamIndex: 1 },
        { action: 'ban', teamIndex: 2 },
        { action: 'ban', teamIndex: 1 },
      ];
    }
  } else if (format === 'BO3') {
    if (isCS2) {
      return [
        { action: 'ban', teamIndex: 1 },
        { action: 'ban', teamIndex: 2 },
        { action: 'pick', teamIndex: 1 },
        { action: 'pick', teamIndex: 2 },
        { action: 'ban', teamIndex: 1 },
        { action: 'ban', teamIndex: 2 },
      ];
    } else {
      return [
        { action: 'ban', teamIndex: 1 },
        { action: 'ban', teamIndex: 2 },
        { action: 'pick', teamIndex: 1 },
        { action: 'pick', teamIndex: 2 },
        { action: 'ban', teamIndex: 1 },
      ];
    }
  } else { // BO5
    if (isCS2) {
      return [
        { action: 'ban', teamIndex: 1 },
        { action: 'ban', teamIndex: 2 },
        { action: 'pick', teamIndex: 1 },
        { action: 'pick', teamIndex: 2 },
        { action: 'pick', teamIndex: 1 },
        { action: 'pick', teamIndex: 2 },
      ];
    } else {
      return [
        { action: 'ban', teamIndex: 1 },
        { action: 'pick', teamIndex: 1 },
        { action: 'pick', teamIndex: 2 },
        { action: 'pick', teamIndex: 1 },
        { action: 'pick', teamIndex: 2 },
      ];
    }
  }
}

export function getMapName(mapId: string, game: string): string {
  const pool = game === 'cs2' ? MAP_POOL_CS2 : MAP_POOL_S2;
  const found = pool.find(m => m.id === mapId);
  return found ? found.name : mapId;
}

export function renderVetoMessageStatic(vetoDoc: any, teamIndex: number) {
  const isFinished = vetoDoc.status === 'finished';
  const steps = getVetoSteps(vetoDoc.format, vetoDoc.game);
  const currentStepIndex = vetoDoc.stage - 1; // stage starts at 1
  
  let headerText = `⚔️ *СТАДИЯ ВЕТО (${vetoDoc.format})* ⚔️\n\n`;
  headerText += `🏆 Турнир: *${vetoDoc.tourneyName || 'Турнир'}*\n`;
  headerText += `🆚 Матч: *${vetoDoc.team1Name}* vs *${vetoDoc.team2Name}*\n`;
  headerText += `🎮 Дисциплина: *${vetoDoc.game === 'cs2' ? 'CS2' : 'Standoff 2'}*\n\n`;

  // Append history logs
  headerText += `📊 *Журнал выборов:*\n`;
  if (!vetoDoc.logs || vetoDoc.logs.length === 0) {
    headerText += `• Стадия вето началась\n`;
  } else {
    vetoDoc.logs.forEach((log: string) => {
      headerText += `• ${log}\n`;
    });
  }
  headerText += `\n`;

  if (isFinished) {
    headerText += `🎉 *ВЕТО ЗАВЕРШЕНО!* 🎉\n`;
    const mapsText = (vetoDoc.picked || []).map((p: any, i: number) => {
      const mapName = getMapName(p.mapId, vetoDoc.game);
      return `${i + 1}. *${mapName}* (${p.type === 'decider' ? 'Десайдер' : `Пик ${p.teamName}`})`;
    }).join('\n');
    headerText += `🗺 Выбранные карты:\n${mapsText}\n\n`;
    headerText += `👉 Администратор теперь может запустить симуляцию матча на сайте!`;
    return { text: headerText, reply_markup: { inline_keyboard: [] } };
  }

  // Active state
  const currentStep = steps[currentStepIndex];
  const isMyTurn = currentStep.teamIndex === teamIndex;
  const turnTeamName = currentStep.teamIndex === 1 ? vetoDoc.team1Name : vetoDoc.team2Name;

  if (isMyTurn) {
    headerText += `🔴 *ВАШ ХОД!* Вы должны *${currentStep.action === 'ban' ? 'ЗАБАНИТЬ ❌' : 'ВЫБРАТЬ ✅'}* карту.`;
  } else {
    headerText += `⏳ *Ожидание хода соперника...* Команда *${turnTeamName}* делает выбор.`;
  }

  // Create buttons for maps
  const pool = vetoDoc.game === 'cs2' ? MAP_POOL_CS2 : MAP_POOL_S2;
  const bannedIds = vetoDoc.banned || [];
  const pickedIds = (vetoDoc.picked || []).map((p: any) => p.mapId);

  const inline_keyboard: any[] = [];
  
  if (isMyTurn) {
    // Show only active, non-chosen maps
    const availableMaps = pool.filter(m => !bannedIds.includes(m.id) && !pickedIds.includes(m.id));
    
    // Group buttons in rows of 2
    for (let i = 0; i < availableMaps.length; i += 2) {
      const row: any[] = [];
      const m1 = availableMaps[i];
      row.push({
        text: `${currentStep.action === 'ban' ? '❌' : '✅'} ${m1.name}`,
        callback_data: `veto_act_${vetoDoc.id}_${m1.id}`
      });
      if (i + 1 < availableMaps.length) {
        const m2 = availableMaps[i + 1];
        row.push({
          text: `${currentStep.action === 'ban' ? '❌' : '✅'} ${m2.name}`,
          callback_data: `veto_act_${vetoDoc.id}_${m2.id}`
        });
      }
      inline_keyboard.push(row);
    }
  }

  return { text: headerText, reply_markup: { inline_keyboard } };
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/api/gemini/live" });
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const upload = multer({ storage: multer.memoryStorage() });

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});



// --- FILE UPLOAD ENDPOINT ---
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });
    
    const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.webp';
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    
    const distDir = path.join(process.cwd(), 'dist', 'uploads');
    const hasDist = fs.existsSync(path.join(process.cwd(), 'dist'));
    if (hasDist && !fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
    
    const isAvatar = req.query.type === 'avatar';
    const isBg = req.query.type === 'background' || req.query.type === 'bg';
    const width = isBg ? 1920 : (isAvatar ? 256 : 512);
    const height = isBg ? 1080 : (isAvatar ? 256 : 512);
    const quality = isBg ? 85 : (isAvatar ? 70 : 80);

    const buf = await sharp(req.file.buffer)
      .resize({ width, height, fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
      
    fs.writeFileSync(path.join(uploadDir, filename), buf);
    if (hasDist) fs.writeFileSync(path.join(distDir, filename), buf);
    
    res.json({ url: `/uploads/${filename}` });
  } catch (err: any) {
    console.error("Upload error:", err.message);
    res.status(500).json({ error: err.message });
  }
});
// --- END FILE UPLOAD ENDPOINT ---

// --- LOCAL DB API FOR FRONTEND ---
app.post("/api/db/getDocs", async (req, res) => {
  try {
    const queryRef = req.body;
    const snaps = await getDocs(queryRef);
    const docs = snaps.docs.map((d: any) => ({ id: d.id, data: d.data() }));
    res.json(docs);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post("/api/db/getDoc", async (req, res) => {
  try {
    const docRef = req.body;
    const snap = await getDoc(docRef);
    res.json(snap.exists() ? { id: snap.id, data: snap.data() } : null);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post("/api/db/setDoc", async (req, res) => {
  try {
    const { docRef, data, options } = req.body;
    await setDoc(docRef, data, options);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post("/api/db/updateDoc", async (req, res) => {
  try {
    const { docRef, data } = req.body;
    await updateDoc(docRef, data);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post("/api/db/addDoc", async (req, res) => {
  try {
    const { collectionRef, data } = req.body;
    const result = await addDoc(collectionRef, data);
    res.json(result);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post("/api/db/deleteDoc", async (req, res) => {
  try {
    const { docRef } = req.body;
    await deleteDoc(docRef);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// 1. Text-to-Speech

app.post("/api/gemini/tts", async (req, res) => {
  try {
    const { text, voice } = req.body;
    const interaction = await ai.interactions.create({
      model: 'gemini-3.1-flash-tts-preview',
      input: text,
      response_modalities: ['AUDIO'],
      generation_config: {
        speech_config: {
          voice_config: {
            prebuilt_voice_config: {
              voice_name: voice || "kore"
            }
          }
        }
      } as any
    });

    let audioBase64 = null;
    for (const step of interaction.steps) {
      if (step.type === 'model_output') {
        const audioContent = step.content?.find(c => c.type === 'audio');
        if (audioContent && audioContent.data) {
          audioBase64 = audioContent.data;
        }
      }
    }
    
    if (audioBase64) {
      res.json({ audio: audioBase64 });
    } else {
      res.status(500).json({ error: "Failed to generate TTS" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Music Generation (Lyria)
app.post("/api/gemini/music", async (req, res) => {
  try {
    const { prompt, duration } = req.body;
    const model = duration === 'clip' ? 'lyria-3-clip-preview' : 'lyria-3-pro-preview';
    
    const response = await ai.models.generateContentStream({
      model,
      contents: prompt,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of response) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;

      for (const part of parts) {
        if (part.inlineData?.data) {
          res.write(`data: ${JSON.stringify({ audio: part.inlineData.data, mimeType: part.inlineData.mimeType })}\n\n`);
        }
        if (part.text) {
          res.write(`data: ${JSON.stringify({ text: part.text })}\n\n`);
        }
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Image Generation and Editing
app.post("/api/gemini/image", upload.single('image'), async (req, res) => {
  try {
    const { prompt, aspectRatio, quality } = req.body;
    const isHQ = quality === 'high';
    const model = isHQ ? 'gemini-3-pro-image' : 'gemini-3.1-flash-image';
    
    const input: any[] = [];
    if (req.file) {
      input.push({
        type: "image",
        data: req.file.buffer.toString('base64'),
        mime_type: req.file.mimetype,
      });
    }
    if (prompt) {
      input.push({ type: "text", text: prompt });
    }

    const interaction = await ai.interactions.create({
      model,
      input: input.length === 1 ? input[0] : input,
      generation_config: {
        image_config: {
          aspect_ratio: aspectRatio || "1:1",
          image_size: isHQ ? "4K" : "1K"
        },
      },
    });

    let imageUrl = null;
    for (const step of interaction.steps) {
      if (step.type === 'model_output') {
        const imageContent = step.content?.find(c => c.type === 'image');
        if (imageContent && imageContent.data) {
          imageUrl = `data:${imageContent.mime_type || 'image/png'};base64,${imageContent.data}`;
        }
      }
    }

    if (imageUrl) {
      res.json({ imageUrl });
    } else {
      res.status(500).json({ error: "Failed to generate image" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Video Generation
app.post("/api/gemini/video/generate", upload.single('image'), async (req, res) => {
  try {
    const { prompt, aspectRatio } = req.body;
    const model = 'veo-3.1-generate-preview'; // required for extending or high quality

    const config: any = {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio || '16:9'
    };

    const args: any = { model, prompt, config };
    if (req.file) {
      args.image = {
        imageBytes: req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype
      };
    }

    const operation = await ai.models.generateVideos(args);
    res.json({ operationName: operation.name });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/gemini/video/status", async (req, res) => {
  try {
    const { operationName } = req.body;
    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });
    res.json({ done: updated.done });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/gemini/video/download", async (req, res) => {
  try {
    const { operationName } = req.body;
    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
    
    if (!uri) {
      return res.status(404).json({ error: "Video URI not found" });
    }

    const videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY! },
    });
    
    res.setHeader('Content-Type', 'video/mp4');
    if (videoRes.body) {
      const reader = videoRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      res.status(500).json({ error: "Failed to download video" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Chatbot (Multi-turn chat)
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { messages, thinking } = req.body;
    // messages is array of { role, content }
    
    const config: any = {
      systemInstruction: "You are a professional Standoff 2 and CS2 match analyst and coach.",
    };

    if (thinking) {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    }

    const chat = ai.chats.create({
      model: thinking ? "gemini-3.1-pro-preview" : "gemini-3.5-flash",
      config
    });

    // Replay history if needed (SDK chats need manual history replay or you just pass the whole thing)
    // Actually, @google/genai chat doesn't let you easily hydrate history unless you pass history array to config.
    // Let's just use generateContent with contents array for multi-turn
    const contents = messages.map((m: any) => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));

    const response = await ai.models.generateContent({
      model: thinking ? "gemini-3.1-pro-preview" : "gemini-3.5-flash",
      contents,
      config
    });

    res.json({ text: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Search and Maps Grounding
app.post("/api/gemini/grounding", async (req, res) => {
  try {
    const { prompt, type } = req.body;
    
    const tools: any[] = [];
    if (type === 'maps') tools.push({ googleMaps: {} });
    else tools.push({ googleSearch: {} });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { tools }
    });

    res.json({ 
      text: response.text, 
      grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Analyze Images / Video
app.post("/api/gemini/analyze", upload.single('media'), async (req, res) => {
  try {
    const { prompt } = req.body;
    const contents: any = { parts: [] };
    
    if (req.file) {
      contents.parts.push({
        inlineData: {
          data: req.file.buffer.toString('base64'),
          mimeType: req.file.mimetype,
        }
      });
    }
    contents.parts.push({ text: prompt || "Analyze this media in detail." });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents
    });

    res.json({ text: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Transcribe Audio
app.post("/api/gemini/transcribe", upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio provided" });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [
          { inlineData: { data: req.file.buffer.toString('base64'), mimeType: req.file.mimetype } },
          { text: "Transcribe the audio accurately." }
        ]
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Live API WebSocket Setup
wss.on("connection", async (clientWs) => {
  try {
    const session = await ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio) clientWs.send(JSON.stringify({ audio }));
          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
        } as any, // Cast to any to bypass TS error on speechConfig format
        systemInstruction: "You are an expert Standoff 2 and CS2 commentator and coach. Speak concisely.",
      },
    });

    clientWs.on("message", (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.audio) {
          session.sendRealtimeInput({
            audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
          });
        }
      } catch (e) {
        console.error("Live API WS message error", e);
      }
    });

    clientWs.on("close", () => {
      session.close();
    });
  } catch (error) {
    console.error("Failed to connect to Live API", error);
    clientWs.close();
  }
});

// --- TELEGRAM BOT POLLING ENGINE ---

class TelegramBotInstance {
  private token: string;
  private userId: string;
  private abortController: AbortController;
  private offset: number = 0;
  private running: boolean = false;
  private states: Map<number, any> = new Map();

  constructor(token: string, userId: string) {
    this.token = token;
    this.userId = userId;
    this.abortController = new AbortController();
  }

  async start() {
    if (this.running) return;
    this.running = true;
    console.log(`Starting Telegram bot with token: ${this.token.slice(0, 10)}...`);
    this.poll();
  }

  async stop() {
    this.running = false;
    this.abortController.abort();
    console.log(`Stopping Telegram bot...`);
  }

  private async poll() {
    while (this.running) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${this.token}/getUpdates?offset=${this.offset}&timeout=15`, {
          signal: this.abortController.signal
        });
        if (!response.ok) {
          throw new Error(`Telegram API responded with ${response.status}`);
        }
        const data: any = await response.json();
        if (data.ok && data.result && data.result.length > 0) {
          for (const update of data.result) {
            this.offset = update.update_id + 1;
            if (update.message) {
              await this.handleMessage(update.message);
            } else if (update.callback_query) {
              await this.handleCallbackQuery(update.callback_query);
            }
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError' || !this.running) {
          break;
        }
        if (error.message !== 'fetch failed') {
          console.error(`Error in bot poll (Token: ${this.token.slice(0, 10)}...):`, error.message);
        }
        // Wait 1 second before retrying to prevent rapid loops on error
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  private async showProfile(chatId: number, username: string, editMessageId?: number) {
    try {
      const tgUserRef = doc(db, 'tgUsers', `${this.userId}_${chatId}`);
      let tgUserSnap = await getDoc(tgUserRef);
      
      if (!tgUserSnap.exists()) {
        const newUserData = {
          id: `${this.userId}_${chatId}`,
          chatId: chatId,
          botUserId: this.userId,
          username: username,
          firstName: username,
          lastName: '',
          status: 'Менеджер (Лидер)',
          money: 0,
          teamId: null,
          teamName: null,
          createdAt: new Date().toISOString()
        };
        await setDoc(tgUserRef, newUserData);
        tgUserSnap = await getDoc(tgUserRef);
      }

      const tgUser = tgUserSnap.data() || {};
      const status = tgUser.status || 'Менеджер (Лидер)';
      const orgName = tgUser.teamName || 'Без организации 🚫';
      const leader = tgUser.teamName ? `@${tgUser.username || username}` : 'Нет лидера';
      
      let moneyVal = tgUser.money !== undefined ? tgUser.money : 0;
      if (tgUser.teamId) {
        try {
          const teamSnap = await getDoc(doc(db, 'teams', tgUser.teamId));
          if (teamSnap.exists() && teamSnap.data().budget !== undefined) {
            moneyVal = Number(teamSnap.data().budget) || 0;
          }
        } catch (e) {}
      }
      
      let rankingStr = 'Без команды (0 VAC Pts)';
      try {
        let fetchedTeams: any[] = [];
        try {
          const teamsQuery = query(collection(db, 'teams'), where('channelId', '==', this.userId));
          const teamsSnapshot = await getDocs(teamsQuery);
          teamsSnapshot.forEach((d) => {
            const data = d.data();
            const players = data.players || [];
            const totalVal = data.totalValRating !== undefined && data.totalValRating !== null
              ? Number(data.totalValRating)
              : players.slice(0, 5).reduce((acc: number, p: any) => acc + (p && p.id ? (Number(p.valRating) || 0) : 0), 0);
            fetchedTeams.push({
              id: d.id,
              name: data.name || 'Команда',
              totalValRating: totalVal
            });
          });
        } catch (e) {
          const cached = fallbackDb.getAll('teams').filter((t: any) => t.channelId === this.userId);
          fetchedTeams = cached.map((data: any) => {
            const players = data.players || [];
            const totalVal = data.totalValRating !== undefined && data.totalValRating !== null
              ? Number(data.totalValRating)
              : players.slice(0, 5).reduce((acc: number, p: any) => acc + (p && p.id ? (Number(p.valRating) || 0) : 0), 0);
            return {
              id: data.id,
              name: data.name || 'Команда',
              totalValRating: totalVal
            };
          });
        }

        fetchedTeams.sort((a, b) => b.totalValRating - a.totalValRating);

        if (tgUser.teamId) {
          const teamIndex = fetchedTeams.findIndex(t => t.id === tgUser.teamId);
          if (teamIndex !== -1) {
            const userTeam = fetchedTeams[teamIndex];
            rankingStr = `#${teamIndex + 1} (${(userTeam.totalValRating || 0).toLocaleString()} VAC Pts)`;
          } else {
            rankingStr = 'Нет в рейтинге (0 VAC Pts)';
          }
        }
      } catch (err: any) {
        console.error("Error calculating team rank for profile:", err.message);
      }

      const profileText = `⚡ *ПРОФИЛЬ* ⚡\n\n👤 *Статус:* ${status}\n🏷 *Организация:* ${orgName}\n👑 *Лидер:* ${leader}\n🧢 *Тренер:* Нет тренера\n💰 *Деньги:* $ ${moneyVal.toLocaleString()}\n🏆 *Место в рейтинге:* ${rankingStr}\n\n_by virtual VirtualArena_`;

      const inlineKeyboard = {
        inline_keyboard: [
          [{ text: orgName, callback_data: 'team_info' }],
          [{ text: '📂 Состав', callback_data: 'view_squad' }, { text: 'Soon ⚡', callback_data: 'soon_info' }],
          [{ text: '⬅️ Назад', callback_data: 'back_to_profile' }]
        ]
      };

      if (editMessageId) {
        await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: editMessageId,
            text: profileText,
            parse_mode: 'Markdown',
            reply_markup: inlineKeyboard
          })
        });
      } else {
        await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: profileText,
            parse_mode: 'Markdown',
            reply_markup: inlineKeyboard
          })
        });
      }
    } catch (e: any) {
      console.error("Error showing profile in bot:", e.message);
    }
  }

  private async handleCallbackQuery(cb: any) {
    const chatId = cb.message?.chat?.id;
    const messageId = cb.message?.message_id;
    const data = cb.data;
    const fromUser = cb.from;
    const username = fromUser.username || fromUser.first_name || 'Менеджер';

    try {
      await fetch(`https://api.telegram.org/bot${this.token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: cb.id })
      });
    } catch (e: any) {
      console.error("Failed to answer callback query:", e.message);
    }

    if (!chatId || !messageId) return;

    if (data.startsWith('rating_page_')) {
      const page = parseInt(data.replace('rating_page_', ''), 10);
      if (!isNaN(page)) {
        await this.showRatingPage(chatId, page, messageId);
      }
      return;
    }

    if (data === 'view_squad') {
      try {
        const tgUserRef = doc(db, 'tgUsers', `${this.userId}_${chatId}`);
        const tgUserSnap = await getDoc(tgUserRef);
        if (tgUserSnap.exists()) {
          const tgUser = tgUserSnap.data();
          if (tgUser.teamId) {
            const teamSnap = await getDoc(doc(db, 'teams', tgUser.teamId));
            if (teamSnap.exists()) {
              const teamData = teamSnap.data();
              const playersList = teamData.players || [];
              
              let playersText = '';
              for (let i = 0; i < 5; i++) {
                const p = playersList[i];
                if (p && p.nickname && p.nickname !== 'Пусто') {
                  playersText += `   ${i+1}. *${p.nickname}*\n`;
                } else {
                  playersText += `   ${i+1}. Слот ${i+1} (Пусто)\n`;
                }
              }

              let benchText = '';
              for (let i = 5; i < 8; i++) {
                const p = playersList[i];
                if (p && p.nickname && p.nickname !== 'Пусто') {
                  benchText += `   ${i-4}. *${p.nickname}*\n`;
                } else {
                  benchText += `   ${i-4}. Замена ${i-4} (Свободно)\n`;
                }
              }

              const squadText = `📂 *СОСТАВ КОМАНДЫ* ${teamData.name || 'Без названия'} 📂\n\n👑 *Лидер:* @${tgUser.username || username}\n\n🏃 *ОСНОВНОЙ СОСТАВ (5/5):*\n${playersText}\n🪑 *СКАМЕЙКА ЗАПАСНЫХ / БЕНЧ (3/3):*\n${benchText}\n\nГлава организации может обменивать и изменять игроков основы и скамейки.`;

              const keyboard = {
                inline_keyboard: [
                  [{ text: '⬅️ Назад в профиль', callback_data: 'back_to_profile' }]
                ]
              };

              await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  message_id: messageId,
                  text: squadText,
                  parse_mode: 'Markdown',
                  reply_markup: keyboard
                })
              });
              return;
            }
          }
        }

        const noTeamText = `У вас пока нет активной организации! 🚫\n\nПожалуйста, обратитесь к главному администратору на сайте, чтобы вам выдали команду и стартовый бюджет.`;
        const keyboard = {
          inline_keyboard: [
            [{ text: '⬅️ Назад', callback_data: 'back_to_profile' }]
          ]
        };
        await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: noTeamText,
            parse_mode: 'Markdown',
            reply_markup: keyboard
          })
        });

      } catch (err: any) {
        console.error("Error showing squad in bot:", err.message);
      }
    } else if (data === 'soon_info') {
      const soonText = `⚡ *Скоро здесь будет новый функционал!* 🚀\n\nВы сможете участвовать в трансферах, тренировать состав, участвовать в турнирах прямо из Telegram-бота!\nСледите за обновлениями на нашем сайте.`;
      const keyboard = {
        inline_keyboard: [
          [{ text: '⬅️ Назад', callback_data: 'back_to_profile' }]
        ]
      };
      await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: soonText,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        })
      });
    } else if (data === 'back_to_profile' || data === 'team_info') {
      await this.showProfile(chatId, username, messageId);
    } else if (data === 'refresh_transfers') {
      await this.showTransferDashboard(chatId, messageId);
    } else if (data === 'view_academy_tg') {
      await this.showAcademyTg(chatId, messageId);
    } else if (data.startsWith('view_academy_team_')) {
      const teamId = data.replace('view_academy_team_', '');
      await this.showAcademyTeamTg(chatId, messageId, teamId);
    } else if (data === 'view_fft_tg') {
      await this.showFftTg(chatId, messageId);
    } else if (data === 'view_incoming') {
      await this.showIncomingSwaps(chatId, messageId);
    } else if (data === 'view_outgoing') {
      await this.showOutgoingSwaps(chatId, messageId);
    } else if (data === 'create_swap_start') {
      await this.startSwapWizard(chatId, messageId);
    } else if (data === 'cancel_swap_creation') {
      this.states.delete(chatId);
      await this.showTransferDashboard(chatId, messageId);
    } else if (data.startsWith('swap_sel_team_')) {
      const teamId = data.replace('swap_sel_team_', '');
      await this.selectTargetPlayer(chatId, messageId, teamId);
    } else if (data.startsWith('swap_sel_target_player_')) {
      const playerId = data.replace('swap_sel_target_player_', '');
      await this.selectMyPlayer(chatId, messageId, playerId);
    } else if (data.startsWith('swap_sel_my_player_')) {
      const playerId = data.replace('swap_sel_my_player_', '');
      await this.selectSurcharge(chatId, messageId, playerId);
    } else if (data.startsWith('swap_surcharge_')) {
      if (data === 'swap_surcharge_enter') {
        const state = this.states.get(chatId);
        if (state) {
          state.step = 'enter_surcharge';
          this.states.set(chatId, state);
          await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: '✍️ *Введите сумму доплаты цифрами* (например, 50000) ответным сообщением:',
              parse_mode: 'Markdown'
            })
          });
        }
      } else {
        const value = Number(data.replace('swap_surcharge_', '')) || 0;
        await this.confirmSwap(chatId, messageId, value);
      }
    } else if (data === 'swap_confirm_send') {
      await this.executeSendSwap(chatId, messageId);
    } else if (data.startsWith('show_swap_in_')) {
      const offerId = data.replace('show_swap_in_', '');
      await this.showSwapDetailsIn(chatId, messageId, offerId);
    } else if (data.startsWith('show_swap_out_')) {
      const offerId = data.replace('show_swap_out_', '');
      await this.showSwapDetailsOut(chatId, messageId, offerId);
    } else if (data.startsWith('swap_accept_exec_')) {
      const offerId = data.replace('swap_accept_exec_', '');
      await this.acceptSwapOffer(chatId, messageId, offerId);
    } else if (data.startsWith('swap_reject_exec_')) {
      const offerId = data.replace('swap_reject_exec_', '');
      await this.rejectSwapOffer(chatId, messageId, offerId);
    } else if (data.startsWith('swap_cancel_exec_')) {
      const offerId = data.replace('swap_cancel_exec_', '');
      await this.cancelSwapOffer(chatId, messageId, offerId);
    } else if (data.startsWith('raise_sal_')) {
      // Format: raise_sal_teamId_index_demandedSalary
      const parts = data.replace('raise_sal_', '').split('_');
      const teamId = parts[0];
      const index = parseInt(parts[1], 10);
      const demandedSalary = parseInt(parts[2], 10);
      await this.increaseSalaryFromBot(chatId, messageId, teamId, index, demandedSalary);
    } else if (data.startsWith('veto_act_')) {
      // Format: veto_act_${vetoId}_${mapId}
      const parts = data.replace('veto_act_', '').split('_');
      const vetoId = parts[0];
      const mapId = parts[1];
      await this.handleVetoActionFromBot(chatId, messageId, vetoId, mapId);
    }
  }

  private async showTransferDashboard(chatId: number, editMessageId?: number) {
    try {
      const tgUserRef = doc(db, 'tgUsers', `${this.userId}_${chatId}`);
      const tgUserSnap = await getDoc(tgUserRef);
      const tgUser = tgUserSnap.exists() ? tgUserSnap.data() : null;

      if (!tgUser || !tgUser.teamId) {
        const replyText = `🔄 *ТРАНСФЕРНЫЙ ЦЕНТР* 🔄\n\n⚠️ У вас пока нет привязанной организации (команды). Вы можете просматривать все активные обмены в системе, но не можете создавать или подтверждать их.\n\nПопросите главного администратора привязать вам команду на сайте!`;
        
        // Show general swaps
        const transfersQuery = query(collection(db, 'swapOffers'), where('channelId', '==', this.userId));
        const transfersSnapshot = await getDocs(transfersQuery);
        const offers: any[] = [];
        transfersSnapshot.forEach((d) => {
          const data = d.data();
          if (data.status === 'pending') {
            offers.push(data);
          }
        });

        let listText = `\n\n📌 *Все активные обмены в системе (${offers.length}):*\n`;
        if (offers.length === 0) {
          listText += `Нет активных обменов. 📭`;
        } else {
          offers.forEach((offer, idx) => {
            listText += `• *${offer.senderTeamName}* ⇄ *${offer.receiverTeamName}*\n  _${offer.senderPlayerName} ⇄ ${offer.receiverPlayerName}_ (Доплата: $${(offer.surcharge || 0).toLocaleString()})\n`;
          });
        }

        const fullText = replyText + listText;
        const inlineKeyboard = {
          inline_keyboard: [
            [{ text: '🔄 Обновить', callback_data: 'refresh_transfers' }]
          ]
        };

        if (editMessageId) {
          await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: editMessageId,
              text: fullText,
              parse_mode: 'Markdown',
              reply_markup: inlineKeyboard
            })
          });
        } else {
          await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: fullText,
              parse_mode: 'Markdown',
              reply_markup: inlineKeyboard
            })
          });
        }
        return;
      }

      // If they have a team:
      const teamId = tgUser.teamId;
      const teamName = tgUser.teamName || 'Ваш клуб';
      let balance = tgUser.money !== undefined ? Number(tgUser.money) : 0;
      if (teamId) {
        try {
          const teamSnap = await getDoc(doc(db, 'teams', teamId));
          if (teamSnap.exists() && teamSnap.data().budget !== undefined) {
            balance = Number(teamSnap.data().budget) || 0;
          }
        } catch (e) {}
      }

      // Query active swap offers where team is sender or receiver
      const transfersQuery = query(collection(db, 'swapOffers'), where('channelId', '==', this.userId));
      const transfersSnapshot = await getDocs(transfersQuery);
      
      const incoming: any[] = [];
      const outgoing: any[] = [];
      transfersSnapshot.forEach((d) => {
        const data = d.data();
        if (data.status === 'pending') {
          const item = { id: d.id, ...data };
          if (data.receiverTeamId === teamId) {
            incoming.push(item);
          } else if (data.senderTeamId === teamId) {
            outgoing.push(item);
          }
        }
      });

      const replyText = `🔄 *ТРАНСФЕРНЫЙ ЦЕНТР* 🔄\n\n` +
        `🏷 *Ваш клуб:* ${teamName}\n` +
        `💰 *Баланс:* $${balance.toLocaleString()}\n\n` +
        `📥 Входящие обмены: *${incoming.length}* шт.\n` +
        `📤 Исходящие обмены: *${outgoing.length}* шт.\n\n` +
        `💡 _Вы можете предложить обмен любому другому клубу в лиге, выбрать игроков и указать доплату со своего баланса!_`;

      const inlineKeyboard = {
        inline_keyboard: [
          [{ text: `📥 Входящие (${incoming.length})`, callback_data: 'view_incoming' }, { text: `📤 Исходящие (${outgoing.length})`, callback_data: 'view_outgoing' }],
          [{ text: '➕ Предложить обмен', callback_data: 'create_swap_start' }],
          [{ text: '🔄 Обновить данные', callback_data: 'refresh_transfers' }]
        ]
      };

      if (editMessageId) {
        await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: editMessageId,
            text: replyText,
            parse_mode: 'Markdown',
            reply_markup: inlineKeyboard
          })
        });
      } else {
        await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
            parse_mode: 'Markdown',
            reply_markup: inlineKeyboard
          })
        });
      }
    } catch (err: any) {
      console.error("Error in showTransferDashboard:", err.message);
    }
  }

  private async showIncomingSwaps(chatId: number, messageId: number) {
    try {
      const tgUserRef = doc(db, 'tgUsers', `${this.userId}_${chatId}`);
      const tgUserSnap = await getDoc(tgUserRef);
      if (!tgUserSnap.exists() || !tgUserSnap.data().teamId) return;
      const tgUser = tgUserSnap.data();

      const transfersQuery = query(collection(db, 'swapOffers'), where('channelId', '==', this.userId));
      const transfersSnapshot = await getDocs(transfersQuery);
      
      const incoming: any[] = [];
      transfersSnapshot.forEach((d) => {
        const data = d.data();
        if (data.status === 'pending' && data.receiverTeamId === tgUser.teamId) {
          incoming.push({ id: d.id, ...data });
        }
      });

      let text = `📥 *ВХОДЯЩИЕ ОБМЕНЫ* 📥\n\n`;
      const buttons: any[] = [];
      if (incoming.length === 0) {
        text += `У вашей команды нет активных входящих предложений обмена. 📭`;
      } else {
        text += `Выберите предложение для просмотра деталей:`;
        incoming.forEach((offer, idx) => {
          buttons.push([{
            text: `📝 #${idx + 1}: ${offer.senderPlayerName} ⇄ ${offer.receiverPlayerName}`,
            callback_data: `show_swap_in_${offer.id}`
          }]);
        });
      }

      buttons.push([{ text: '⬅️ Назад в трансферы', callback_data: 'refresh_transfers' }]);

      await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        })
      });
    } catch (err: any) {
      console.error("Error showing incoming swaps:", err.message);
    }
  }

  private async showOutgoingSwaps(chatId: number, messageId: number) {
    try {
      const tgUserRef = doc(db, 'tgUsers', `${this.userId}_${chatId}`);
      const tgUserSnap = await getDoc(tgUserRef);
      if (!tgUserSnap.exists() || !tgUserSnap.data().teamId) return;
      const tgUser = tgUserSnap.data();

      const transfersQuery = query(collection(db, 'swapOffers'), where('channelId', '==', this.userId));
      const transfersSnapshot = await getDocs(transfersQuery);
      
      const outgoing: any[] = [];
      transfersSnapshot.forEach((d) => {
        const data = d.data();
        if (data.status === 'pending' && data.senderTeamId === tgUser.teamId) {
          outgoing.push({ id: d.id, ...data });
        }
      });

      let text = `📤 *ИСХОДЯЩИЕ ОБМЕНЫ* 📤\n\n`;
      const buttons: any[] = [];
      if (outgoing.length === 0) {
        text += `Вы пока не отправляли предложений обмена другим клубам. 📭`;
      } else {
        text += `Выберите предложение для просмотра деталей или отмены:`;
        outgoing.forEach((offer, idx) => {
          buttons.push([{
            text: `📝 #${idx + 1} для ${offer.receiverTeamName}`,
            callback_data: `show_swap_out_${offer.id}`
          }]);
        });
      }

      buttons.push([{ text: '⬅️ Назад в трансферы', callback_data: 'refresh_transfers' }]);

      await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        })
      });
    } catch (err: any) {
      console.error("Error showing outgoing swaps:", err.message);
    }
  }

  private async startSwapWizard(chatId: number, messageId: number) {
    try {
      const tgUserRef = doc(db, 'tgUsers', `${this.userId}_${chatId}`);
      const tgUserSnap = await getDoc(tgUserRef);
      if (!tgUserSnap.exists() || !tgUserSnap.data().teamId) return;
      const tgUser = tgUserSnap.data();

      // Clear any state and start
      this.states.set(chatId, { step: 'select_target_team' });

      const teamsQuery = query(collection(db, 'teams'), where('channelId', '==', this.userId));
      const teamsSnapshot = await getDocs(teamsQuery);
      
      const otherTeams: any[] = [];
      teamsSnapshot.forEach((d) => {
        if (d.id !== tgUser.teamId && !d.data().isAcademy) {
          otherTeams.push({ id: d.id, ...d.data() });
        }
      });

      let text = `🤝 *НОВОЕ ПРЕДЛОЖЕНИЕ ОБМЕНА* 🤝\n\n` +
        `Шаг 1 из 5: Выберите *клуб*, которому хотите предложить обмен:`;

      const buttons: any[] = [];
      if (otherTeams.length === 0) {
        text = `🤝 *НОВОЕ ПРЕДЛОЖЕНИЕ ОБМЕНА* 🤝\n\n⚠️ В лиге пока нет других зарегистрированных клубов для совершения обменов.`;
      } else {
        const teamButtons: any[] = [];
        otherTeams.forEach((team) => {
          teamButtons.push({
            text: `🎮 ${team.name || 'Без названия'}`,
            callback_data: `swap_sel_team_${team.id}`
          });
        });
        
        // Chunk into rows of 3
        for (let i = 0; i < teamButtons.length; i += 3) {
          buttons.push(teamButtons.slice(i, i + 3));
        }
      }

      buttons.push([{ text: '❌ Отмена', callback_data: 'cancel_swap_creation' }]);

      await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        })
      });
    } catch (err: any) {
      console.error("Error starting swap wizard:", err.message);
    }
  }

  private async selectTargetPlayer(chatId: number, messageId: number, targetTeamId: string) {
    try {
      const state = this.states.get(chatId);
      if (!state) return;

      const teamSnap = await getDoc(doc(db, 'teams', targetTeamId));
      if (!teamSnap.exists()) return;
      const teamData = teamSnap.data();
      const players = teamData.players || [];

      state.targetTeamId = targetTeamId;
      state.targetTeamName = teamData.name || 'Чужой Клуб';
      state.step = 'select_target_player';
      this.states.set(chatId, state);

      let text = `🤝 *НОВОЕ ПРЕДЛОЖЕНИЕ ОБМЕНА* 🤝\n` +
        `Клуб-получатель: *${state.targetTeamName}*\n\n` +
        `Шаг 2 из 5: Выберите *игрока*, которого вы хотите получить из их состава:`;

      const buttons: any[] = [];
      const validPlayers = players.filter((p: any) => p && p.id);
      if (validPlayers.length === 0) {
        text += `\n\n⚠️ В составе этого клуба нет зарегистрированных игроков.`;
      } else {
        validPlayers.forEach((player: any) => {
          const salary = player.salary || 1000;
          const matchesLeft = player.matchesLeft !== undefined ? player.matchesLeft : 15;
          buttons.push([{
            text: `🏃 ${player.nickname}`,
            callback_data: `swap_sel_target_player_${player.id}`
          }]);
        });
      }

      buttons.push([{ text: '⬅️ Назад', callback_data: 'create_swap_start' }]);

      await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        })
      });
    } catch (err: any) {
      console.error("Error in selectTargetPlayer:", err.message);
    }
  }

  private async selectMyPlayer(chatId: number, messageId: number, targetPlayerId: string) {
    try {
      const state = this.states.get(chatId);
      if (!state) return;

      const tgUserRef = doc(db, 'tgUsers', `${this.userId}_${chatId}`);
      const tgUserSnap = await getDoc(tgUserRef);
      if (!tgUserSnap.exists() || !tgUserSnap.data().teamId) return;
      const tgUser = tgUserSnap.data();

      // Find the player nickname
      const targetTeamSnap = await getDoc(doc(db, 'teams', state.targetTeamId));
      if (!targetTeamSnap.exists()) return;
      const targetTeamData = targetTeamSnap.data();
      const targetPlayer = (targetTeamData.players || []).find((p: any) => p && p.id === targetPlayerId);
      if (!targetPlayer) return;

      state.targetPlayerId = targetPlayerId;
      state.targetPlayerName = targetPlayer.nickname;
      state.step = 'select_my_player';
      this.states.set(chatId, state);

      const myTeamSnap = await getDoc(doc(db, 'teams', tgUser.teamId));
      if (!myTeamSnap.exists()) return;
      const myTeamData = myTeamSnap.data();
      const myPlayers = myTeamData.players || [];

      let text = `🤝 *НОВОЕ ПРЕДЛОЖЕНИЕ ОБМЕНА* 🤝\n` +
        `Клуб-получатель: *${state.targetTeamName}*\n` +
        `Вы получаете: *${state.targetPlayerName}*\n\n` +
        `Шаг 3 из 5: Выберите *вашего игрока*, которого вы готовы отдать взамен:`;

      const buttons: any[] = [];
      const validMyPlayers = myPlayers.filter((p: any) => p && p.id);
      if (validMyPlayers.length === 0) {
        text += `\n\n⚠️ В составе вашего клуба нет игроков для обмена.`;
      } else {
        validMyPlayers.forEach((player: any) => {
          const salary = player.salary || 1000;
          const matchesLeft = player.matchesLeft !== undefined ? player.matchesLeft : 15;
          buttons.push([{
            text: `🏃 ${player.nickname}`,
            callback_data: `swap_sel_my_player_${player.id}`
          }]);
        });
        
        buttons.push([{
          text: '❌ Без игрока (купить за деньги)',
          callback_data: `swap_sel_my_player_skip`
        }]);
      }

      buttons.push([{ text: '⬅️ Назад', callback_data: `swap_sel_team_${state.targetTeamId}` }]);

      await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        })
      });
    } catch (err: any) {
      console.error("Error in selectMyPlayer:", err.message);
    }
  }

  private async selectSurcharge(chatId: number, messageId: number, myPlayerId: string) {
    try {
      const state = this.states.get(chatId);
      if (!state) return;

      const tgUserRef = doc(db, 'tgUsers', `${this.userId}_${chatId}`);
      const tgUserSnap = await getDoc(tgUserRef);
      if (!tgUserSnap.exists() || !tgUserSnap.data().teamId) return;
      const tgUser = tgUserSnap.data();

      // Find my player nickname or handle skip (money only)
      let myPlayerName = 'Без игрока (только доплата деньгами)';
      if (myPlayerId !== 'skip') {
        const myTeamSnap = await getDoc(doc(db, 'teams', tgUser.teamId));
        if (!myTeamSnap.exists()) return;
        const myTeamData = myTeamSnap.data();
        const myPlayer = (myTeamData.players || []).find((p: any) => p && p.id === myPlayerId);
        if (!myPlayer) return;
        myPlayerName = myPlayer.nickname;
      }

      state.myPlayerId = myPlayerId;
      state.myPlayerName = myPlayerName;
      state.step = 'select_surcharge';
      this.states.set(chatId, state);

      let text = `🤝 *НОВОЕ ПРЕДЛОЖЕНИЕ ОБМЕНА* 🤝
` +
        `Клуб-получатель: *${state.targetTeamName}*
` +
        `Вы получаете: *${state.targetPlayerName}*
` +
        `Вы отдаете: *${state.myPlayerName}*

` +
        `Шаг 4 из 5: Выберите хотите ли вы предложить *доплату* (она будет списана с вашего баланса):`;

      const buttons = [
        [{ text: '❌ Без ДП ($0)', callback_data: 'swap_surcharge_0' }],
        [{ text: '💵 С ДП (Ввести сумму)', callback_data: 'swap_surcharge_enter' }],
        [{ text: '⬅️ Назад', callback_data: `swap_sel_target_player_${state.targetPlayerId}` }]
      ];

      await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        })
      });
    } catch (err: any) {
      console.error("Error in selectSurcharge:", err.message);
    }
  }

  private async confirmSwapNewMessage(chatId: number, surchargeValue: number) {
    try {
      const state = this.states.get(chatId);
      if (!state) return;

      state.surcharge = surchargeValue;
      state.step = 'confirm_swap';
      this.states.set(chatId, state);

      let text = `📝 *ПОДТВЕРЖДЕНИЕ ОБМЕНА (Шаг 5 из 5)* 📝

` +
        `Вы предлагаете обмен клубу *${state.targetTeamName}*:

` +
        `👉 Вы отдаете: *${state.myPlayerName}*
` +
        `👈 Вы получаете: *${state.targetPlayerName}*
` +
        `💰 Ваша доплата: *$${surchargeValue.toLocaleString()}*

` +
        `Вы уверены, что хотите отправить этот запрос? Обмен будет выполнен автоматически сразу же, как только лидер другого клуба подтвердит его в своём боте!`;

      const buttons = [
        [{ text: '✅ Подтвердить и отправить', callback_data: 'swap_confirm_send' }],
        [{ text: '❌ Отмена', callback_data: 'cancel_swap_creation' }]
      ];

      await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        })
      });
    } catch (err: any) {
      console.error("Error in confirmSwapNewMessage:", err.message);
    }
  }

  private async confirmSwap(chatId: number, messageId: number, surchargeValue: number) {
    try {
      const state = this.states.get(chatId);
      if (!state) return;

      state.surcharge = surchargeValue;
      state.step = 'confirm_swap';
      this.states.set(chatId, state);

      let text = `📝 *ПОДТВЕРЖДЕНИЕ ОБМЕНА (Шаг 5 из 5)* 📝\n\n` +
        `Вы предлагаете обмен клубу *${state.targetTeamName}*:\n\n` +
        `👉 Вы отдаете: *${state.myPlayerName}*\n` +
        `👈 Вы получаете: *${state.targetPlayerName}*\n` +
        `💰 Ваша доплата: *$${surchargeValue.toLocaleString()}*\n\n` +
        `Вы уверены, что хотите отправить этот запрос? Обмен будет выполнен автоматически сразу же, как только лидер другого клуба подтвердит его в своём боте!`;

      const buttons = [
        [{ text: '✅ Подтвердить и отправить', callback_data: 'swap_confirm_send' }],
        [{ text: '❌ Отмена', callback_data: 'cancel_swap_creation' }]
      ];

      await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        })
      });
    } catch (err: any) {
      console.error("Error in confirmSwap:", err.message);
    }
  }

  private async executeSendSwap(chatId: number, messageId: number) {
    try {
      const state = this.states.get(chatId);
      if (!state) return;

      const tgUserRef = doc(db, 'tgUsers', `${this.userId}_${chatId}`);
      const tgUserSnap = await getDoc(tgUserRef);
      if (!tgUserSnap.exists() || !tgUserSnap.data().teamId) return;
      const tgUser = tgUserSnap.data();

      let balance = tgUser.money !== undefined ? Number(tgUser.money) : 0;
      if (tgUser.teamId) {
        try {
          const teamSnap = await getDoc(doc(db, 'teams', tgUser.teamId));
          if (teamSnap.exists() && teamSnap.data().budget !== undefined) {
            balance = Number(teamSnap.data().budget) || 0;
          }
        } catch (e) {}
      }
      if (state.surcharge > 0 && balance < state.surcharge) {
        const text = `❌ *ОШИБКА ПРЕДЛОЖЕНИЯ ОБМЕНА*\n\nУ вас недостаточно средств на балансе клуба для осуществления доплаты в размере *$${state.surcharge.toLocaleString()}*.\nВаш текущий баланс: *$${balance.toLocaleString()}*.\n\nПожалуйста, уменьшите сумму доплаты или заработайте больше средств.`;
        const buttons = [[{ text: '⬅️ В трансферный центр', callback_data: 'refresh_transfers' }]];
        
        await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: buttons }
          })
        });
        return;
      }

      // Create pending trade transaction document
      const pendingTradeRef = doc(collection(db, 'pendingTrades'));
      const pendingTradeId = pendingTradeRef.id;
      await setDoc(pendingTradeRef, {
        id: pendingTradeId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Add to LocalDB
      await addDoc(collection(db, 'swapOffers'), {
        channelId: this.userId,
        senderTeamId: tgUser.teamId,
        senderTeamName: tgUser.teamName,
        senderPlayerId: state.myPlayerId,
        senderPlayerName: state.myPlayerName,
        receiverTeamId: state.targetTeamId,
        receiverTeamName: state.targetTeamName,
        receiverPlayerId: state.targetPlayerId,
        receiverPlayerName: state.targetPlayerName,
        surcharge: Number(state.surcharge) || 0,
        status: 'pending',
        pendingTradeId: pendingTradeId,
        createdAt: new Date().toISOString()
      });

      // Notify target team managers
      await this.notifyTeamManager(state.targetTeamId, `🔔 *Новое предложение обмена!* Клуб *${tgUser.teamName}* предлагает вам обменять *${state.targetPlayerName}* на своего *${state.myPlayerName}* с доплатой вам *$${state.surcharge.toLocaleString()}*.\n\nПроверить предложение и ответить можно в меню \`🔄 Трэйд-лист\` прямо в боте!`);

      this.states.delete(chatId);

      const successText = `✅ *УСПЕШНО ОТПРАВЛЕНО!* 🚀\n\nВаше предложение обмена было успешно отправлено руководству клуба *${state.targetTeamName}*!\n\nОни получат уведомление и смогут принять или отклонить его прямо в своем Telegram-боте. Вы получите уведомление, как только они примут решение!`;
      const buttons = [[{ text: '⬅️ В трансферный центр', callback_data: 'refresh_transfers' }]];

      await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: successText,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        })
      });
    } catch (err: any) {
      console.error("Error in executeSendSwap:", err.message);
    }
  }

  private async notifyTeamManager(teamId: string, text: string, replyMarkup?: any) {
    if (!teamId || typeof teamId !== 'string' || teamId.trim() === '' || teamId === 'null' || teamId === 'undefined') {
      console.log(`[Notification Alert] Skipping notifyTeamManager because teamId is invalid: "${teamId}"`);
      return;
    }
    try {
      const managerQuery = query(
        collection(db, 'tgUsers'),
        where('botUserId', '==', this.userId),
        where('teamId', '==', teamId)
      );
      const managerSnapshot = await getDocs(managerQuery);
      managerSnapshot.forEach(async (d) => {
        const mgr = d.data();
        if (mgr.chatId) {
          try {
            await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: mgr.chatId,
                text: text,
                parse_mode: 'Markdown',
                reply_markup: replyMarkup
              })
            });
          } catch (err: any) {
            console.error(`Failed to notify manager ${mgr.username}:`, err.message);
          }
        }
      });
    } catch (e: any) {
      console.error("Error sending notification:", e.message);
    }
  }

  private async showSwapDetailsIn(chatId: number, messageId: number, offerId: string) {
    try {
      const offerSnap = await getDoc(doc(db, 'swapOffers', offerId));
      if (!offerSnap.exists()) return;
      const offer = offerSnap.data();

      // Fetch player details dynamically
      const senderTeamSnap = await getDoc(doc(db, 'teams', offer.senderTeamId));
      const receiverTeamSnap = await getDoc(doc(db, 'teams', offer.receiverTeamId));
      let senderPlayerDetails = '';
      let receiverPlayerDetails = '';
      
      if (senderTeamSnap.exists()) {
        const p = (senderTeamSnap.data().players || []).find((x: any) => x && x.id === offer.senderPlayerId);
        if (p) {
          const salary = p.salary || 1000;
          const matchesLeft = p.matchesLeft !== undefined ? p.matchesLeft : 15;
          senderPlayerDetails = ``;
        }
      }
      if (receiverTeamSnap.exists()) {
        const p = (receiverTeamSnap.data().players || []).find((x: any) => x && x.id === offer.receiverPlayerId);
        if (p) {
          const salary = p.salary || 1000;
          const matchesLeft = p.matchesLeft !== undefined ? p.matchesLeft : 15;
          receiverPlayerDetails = ``;
        }
      }

      const text = `📥 *ДЕТАЛИ ВХОДЯЩЕГО ОБМЕНА* 📥\n\n` +
        `Откуда: *${offer.senderTeamName}*\n` +
        `👉 Вы отдаете: *${offer.receiverPlayerName}* ${receiverPlayerDetails}\n` +
        `👈 Вы получаете: *${offer.senderPlayerName}* ${senderPlayerDetails}\n` +
        `💰 Вы получите доплату: *$${(offer.surcharge || 0).toLocaleString()}*\n\n` +
        `Вы хотите принять или отклонить этот обмен? После принятия составы обновятся автоматически.`;

      const buttons = [
        [
          { text: '✅ Принять обмен', callback_data: `swap_accept_exec_${offerId}` },
          { text: '❌ Отклонить', callback_data: `swap_reject_exec_${offerId}` }
        ],
        [{ text: '⬅️ Назад к списку', callback_data: 'view_incoming' }]
      ];

      await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        })
      });
    } catch (err: any) {
      console.error("Error showing incoming swap details:", err.message);
    }
  }

  private async showSwapDetailsOut(chatId: number, messageId: number, offerId: string) {
    try {
      const offerSnap = await getDoc(doc(db, 'swapOffers', offerId));
      if (!offerSnap.exists()) return;
      const offer = offerSnap.data();

      const text = `📤 *ДЕТАЛИ ИСХОДЯЩЕГО ОБМЕНА* 📤\n\n` +
        `Кому: *${offer.receiverTeamName}*\n` +
        `👉 Вы отдаете: *${offer.senderPlayerName}*\n` +
        `👈 Вы получаете: *${offer.receiverPlayerName}*\n` +
        `💰 Ваша доплата: *$${(offer.surcharge || 0).toLocaleString()}*\n\n` +
        `Ожидание ответа от другой команды... Вы можете отозвать запрос в любой момент.`;

      const buttons = [
        [{ text: '❌ Отозвать обмен', callback_data: `swap_cancel_exec_${offerId}` }],
        [{ text: '⬅️ Назад к списку', callback_data: 'view_outgoing' }]
      ];

      await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        })
      });
    } catch (err: any) {
      console.error("Error showing outgoing swap details:", err.message);
    }
  }

  private async acceptSwapOffer(chatId: number, messageId: number, offerId: string) {
    try {
      const offerDocRef = doc(db, 'swapOffers', offerId);
      
      // We need to fetch manager documents outside/before transaction to get their precise document IDs
      // because querying inside runTransaction is not supported/recommended by the LocalDB Web SDK.
      const offerSnapBefore = await getDoc(offerDocRef);
      if (!offerSnapBefore.exists()) {
        const text = `⚠️ *Ошибка:* Предложение обмена не найдено. Возможно, оно уже было обработано или удалено.`;
        const buttons = [[{ text: '⬅️ Назад', callback_data: 'refresh_transfers' }]];
        await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } })
        });
        return;
      }

      const offerBefore = offerSnapBefore.data();

      const senderManagerQuery = query(collection(db, 'tgUsers'), where('botUserId', '==', this.userId), where('teamId', '==', offerBefore.senderTeamId));
      const receiverManagerQuery = query(collection(db, 'tgUsers'), where('botUserId', '==', this.userId), where('teamId', '==', offerBefore.receiverTeamId));

      const senderManagerSnap = await getDocs(senderManagerQuery);
      const receiverManagerSnap = await getDocs(receiverManagerQuery);

      if (senderManagerSnap.empty || receiverManagerSnap.empty) {
        const text = `⚠️ *Ошибка:* У одной из команд нет активного лидера в системе.`;
        const buttons = [[{ text: '⬅️ Назад', callback_data: 'refresh_transfers' }]];
        await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } })
        });
        return;
      }

      const senderManagerDocId = senderManagerSnap.docs[0].id;
      const receiverManagerDocId = receiverManagerSnap.docs[0].id;

      const activeTourneysQuery = query(collection(db, 'tournaments'), where('userId', '==', this.userId), where('isTourActive', '==', true));
      const activeTourneysSnap = await getDocs(activeTourneysQuery);
      const isAnyTourneyActive = !activeTourneysSnap.empty;

      const matchesQuery = query(collection(db, 'matches'), where('userId', '==', this.userId));
      const matchesSnap = await getDocs(matchesQuery);
      const allMatches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const lockedTeamIds = new Set<string>();
      activeTourneysSnap.docs.forEach(doc => {
        const t = doc.data();
        const mIds = t.matchIds || [];
        allMatches.forEach((m: any) => {
          if (mIds.includes(m.id)) {
            if (m.team1) lockedTeamIds.add(m.team1);
            if (m.team2) lockedTeamIds.add(m.team2);
          }
        });
      });

      // Executing LocalDB Transaction
      await runTransaction(db, async (transaction) => {
        // 1. Get the offer snapshot to ensure status hasn't changed
        const offerDoc = await transaction.get(offerDocRef);
        if (!offerDoc.exists()) {
          throw new Error('offer_not_found');
        }
        const offer = offerDoc.data();
        if (offer.status !== 'pending') {
          throw new Error('already_processed');
        }

        // Check transaction state in pendingTrades
        let pendingTradeRef;
        if (offer.pendingTradeId) {
          pendingTradeRef = doc(db, 'pendingTrades', offer.pendingTradeId);
          const pendingTradeSnap = await transaction.get(pendingTradeRef);
          if (!pendingTradeSnap.exists() || (pendingTradeSnap.data() as any).status !== 'pending') {
            throw new Error('trade_invalid');
          }
        }

        // 2. Get tour settings
        const settingsSnap = await transaction.get(doc(db, 'settings', this.userId));
        const settings = settingsSnap.exists() ? settingsSnap.data() : {};
        const tourActive = settings.tourActive || false;
        const tourTeams = settings.tourTeams || [];
        if (tourActive && (tourTeams.includes(offer.senderTeamId) || tourTeams.includes(offer.receiverTeamId))) {
          throw new Error('tour_active');
        }
        if (isAnyTourneyActive && (tourTeams.includes(offer.senderTeamId) || tourTeams.includes(offer.receiverTeamId) || lockedTeamIds.has(offer.senderTeamId) || lockedTeamIds.has(offer.receiverTeamId))) {
          throw new Error('tour_active');
        }

        // 3. Get team docs
        const senderTeamRef = doc(db, 'teams', offer.senderTeamId);
        const receiverTeamRef = doc(db, 'teams', offer.receiverTeamId);
        
        const senderTeamSnap = await transaction.get(senderTeamRef);
        const receiverTeamSnap = await transaction.get(receiverTeamRef);

        if (!senderTeamSnap.exists() || !receiverTeamSnap.exists()) {
          throw new Error('team_not_found');
        }

        const senderTeam = senderTeamSnap.data();
        const receiverTeam = receiverTeamSnap.data();

        // 4. Validate rosters still contain the specified players (extremely important to avoid duplicates/stale trades)
        const senderPlayers = senderTeam.players || [];
        const receiverPlayers = receiverTeam.players || [];

        const senderPlayerIdx = offer.senderPlayerId === 'skip' ? -2 : senderPlayers.findIndex((p: any) => p && p.id === offer.senderPlayerId);
        const receiverPlayerIdx = receiverPlayers.findIndex((p: any) => p && p.id === offer.receiverPlayerId);

        if ((offer.senderPlayerId !== 'skip' && senderPlayerIdx === -1) || receiverPlayerIdx === -1) {
          throw new Error('players_roster_changed');
        }

        // 5. Get manager details
        const senderManagerRef = doc(db, 'tgUsers', senderManagerDocId);
        const receiverManagerRef = doc(db, 'tgUsers', receiverManagerDocId);

        const senderManagerSnap = await transaction.get(senderManagerRef);
        const receiverManagerSnap = await transaction.get(receiverManagerRef);

        if (!senderManagerSnap.exists() || !receiverManagerSnap.exists()) {
          throw new Error('manager_not_found');
        }

        const senderManager = senderManagerSnap.data();
        const receiverManager = receiverManagerSnap.data();

        let senderBudget = Number(senderManager.money) || 0;
        if (senderTeam.budget !== undefined) {
          senderBudget = Number(senderTeam.budget) || 0;
        }
        let receiverBudget = Number(receiverManager.money) || 0;
        if (receiverTeam.budget !== undefined) {
          receiverBudget = Number(receiverTeam.budget) || 0;
        }

        // 6. Check budget sufficiency
        if (offer.surcharge > 0 && senderBudget < offer.surcharge) {
          throw new Error('insufficient_funds');
        }

        if (pendingTradeRef) {
          transaction.update(pendingTradeRef, { status: 'completed' });
        }

        // 7. Swap players and compute new values
        const playerBData = receiverPlayers[receiverPlayerIdx];

        const updatedSenderPlayers = [...senderPlayers];
        if (offer.senderPlayerId !== 'skip') {
          updatedSenderPlayers[senderPlayerIdx] = playerBData;
        } else {
          updatedSenderPlayers.push(playerBData);
        }

        const updatedReceiverPlayers = [...receiverPlayers];
        if (offer.senderPlayerId !== 'skip') {
          const playerAData = senderPlayers[senderPlayerIdx];
          updatedReceiverPlayers[receiverPlayerIdx] = playerAData;
        } else {
          updatedReceiverPlayers.splice(receiverPlayerIdx, 1);
        }

        const newSenderBudget = Math.max(0, senderBudget - (offer.surcharge || 0));
        const newReceiverBudget = receiverBudget + (offer.surcharge || 0);

        // 8. Write updates to transaction (updating BOTH team budget and tgUser money)
        transaction.update(senderTeamRef, {
          players: updatedSenderPlayers,
          budget: newSenderBudget,
          totalValRating: updatedSenderPlayers.slice(0, 5).reduce((acc: number, p: any) => acc + (p && p.id ? (p.valRating != null && String(p.valRating) !== '' ? Number(p.valRating) : 0) : 0), 0)
        });

        transaction.update(receiverTeamRef, {
          players: updatedReceiverPlayers,
          budget: newReceiverBudget,
          totalValRating: updatedReceiverPlayers.slice(0, 5).reduce((acc: number, p: any) => acc + (p && p.id ? (p.valRating != null && String(p.valRating) !== '' ? Number(p.valRating) : 0) : 0), 0)
        });

        transaction.update(senderManagerRef, { money: newSenderBudget });
        transaction.update(receiverManagerRef, { money: newReceiverBudget });

        // 9. Mark status as accepted
        transaction.update(offerDocRef, { status: 'accepted' });
      });

      // Notify sender manager
      await this.notifyTeamManager(offerBefore.senderTeamId, `🔔 *Обмен принят!* Клуб *${offerBefore.receiverTeamName}* принял ваше предложение обмена: *${offerBefore.senderPlayerName}* ⇄ *${offerBefore.receiverPlayerName}*!\n\nИгроки перешли в новые составы, баланс скорректирован.`);

      // Show success
      const successText = `✅ *ОБМЕН УСПЕШНО СОВЕРШЕН!* 🎉\n\nВы приняли предложение. Игрок *${offerBefore.senderPlayerName}* перешёл к вам в состав вместо *${offerBefore.receiverPlayerName}*.\n\nФинансовые средства и составы на сайте обновлены автоматически!`;
      const buttons = [[{ text: '⬅️ В трансферный центр', callback_data: 'refresh_transfers' }]];
      await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: successText,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        })
      });

    } catch (err: any) {
      if (!['already_processed', 'players_roster_changed', 'offer_not_found', 'trade_invalid', 'tour_active', 'insufficient_funds', 'team_not_found', 'manager_not_found'].includes(err.message)) {
        console.error("Error accepting swap in bot:", err.message);
      }
      
      let errorMsg = `⚠️ *Ошибка:* Не удалось завершить обмен. Попробуйте еще раз.`;
      if (err.message === 'already_processed' || err.message === 'players_roster_changed' || err.message === 'offer_not_found' || err.message === 'trade_invalid') {
        errorMsg = `⚠️ *ОБМЕН БОЛЕЕ НЕ ДЕЙСТВИТЕЛЕН!*\n\nТрейд недействителен. Возможно, один из игроков уже перешел в другой клуб в результате другого обмена, или предложение было отозвано/отклонено. Бот предотвратил повторную операцию!`;
      } else if (err.message === 'tour_active') {
        errorMsg = `⚠️ *ОБМЕН ЗАБЛОКИРОВАН*\n\nОдин из клубов заблокирован, так как сейчас идет активный тур. Обмены временно невозможны!`;
      } else if (err.message === 'insufficient_funds') {
        errorMsg = `⚠️ *Ошибка:* У команды-отправителя недостаточно денег на доплату для завершения этого обмена.`;
      } else if (err.message === 'team_not_found' || err.message === 'manager_not_found') {
        errorMsg = `⚠️ *Ошибка:* Клуб или его менеджер не найден в системе.`;
      }

      const buttons = [[{ text: '⬅️ Назад в меню', callback_data: 'refresh_transfers' }]];
      await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: errorMsg,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        })
      });
    }
  }

  private async rejectSwapOffer(chatId: number, messageId: number, offerId: string) {
    try {
      const offerDocRef = doc(db, 'swapOffers', offerId);
      const offerSnap = await getDoc(offerDocRef);
      if (offerSnap.exists()) {
        const offer = offerSnap.data();
        await updateDoc(offerDocRef, { status: 'rejected' });
        
        // Notify sender manager
        await this.notifyTeamManager(offer.senderTeamId, `🔔 *Обмен отклонен.* Клуб *${offer.receiverTeamName}* отклонил ваше предложение обмена: *${offer.senderPlayerName}* ⇄ *${offer.receiverPlayerName}*.`);
      }

      const text = `❌ *Обмен отклонен.* Предложение удалено из активных.`;
      const buttons = [[{ text: '⬅️ Назад', callback_data: 'refresh_transfers' }]];
      await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        })
      });
    } catch (err: any) {
      console.error("Error rejecting swap in bot:", err.message);
    }
  }

  private async cancelSwapOffer(chatId: number, messageId: number, offerId: string) {
    try {
      const offerDocRef = doc(db, 'swapOffers', offerId);
      await updateDoc(offerDocRef, { status: 'cancelled' });

      const text = `🗑 *Обмен отозван.* Вы успешно отозвали свое предложение обмена.`;
      const buttons = [[{ text: '⬅️ Назад', callback_data: 'refresh_transfers' }]];
      await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        })
      });
    } catch (err: any) {
      console.error("Error cancelling swap in bot:", err.message);
    }
  }

  private async increaseSalaryFromBot(chatId: number, messageId: number, teamId: string, index: number, demandedSalary: number) {
    try {
      const teamRef = doc(db, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      if (!teamSnap.exists()) {
        throw new Error('team_not_found');
      }

      const team = teamSnap.data();
      const players = team.players || [];
      if (!players[index]) {
        throw new Error('player_not_found');
      }

      const p = players[index];
      players[index] = {
        ...p,
        salary: demandedSalary,
        matchesLeft: 15,
        demandsIncrease: false,
        demandedSalary: 0
      };

      await updateDoc(teamRef, { players });

      const text = `✅ *Контракт успешно обновлен!* 📝\n\nДля игрока *${p.nickname}* из вашей команды *${team.name}* была успешно повышена зарплата через Telegram:\nновая зарплата *$${demandedSalary.toLocaleString()} за контракт*, контракт продлен на *15 матчей*.`;
      const buttons = [[{ text: '⬅️ В профиль', callback_data: 'back_to_profile' }]];
      await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        })
      });
    } catch (err: any) {
      console.error("Error raising salary from bot:", err.message);
      const text = `⚠️ *Ошибка при повышении зарплаты:* ${err.message}`;
      const buttons = [[{ text: '⬅️ Назад в меню', callback_data: 'back_to_profile' }]];
      await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons }
        })
      });
    }
  }


  private async fetchImageAsDataUri(
    url?: string, 
    fallbackText: string = '?', 
    bgColor: string = '#222338', 
    isTeam: boolean = false
  ): Promise<string> {
    const tryReadDiskFile = (filePath: string): string | null => {
      try {
        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            const fileBuf = fs.readFileSync(filePath);
            const ext = path.extname(filePath).toLowerCase();
            let mime = 'image/png';
            if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
            else if (ext === '.webp') mime = 'image/webp';
            else if (ext === '.svg') mime = 'image/svg+xml';
            return `data:${mime};base64,${fileBuf.toString('base64')}`;
          }
        }
      } catch (e) {}
      return null;
    };

    // 1. Direct Data URI
    if (url && url.startsWith('data:image/')) {
      return url;
    }

    // 2. Relative URL (e.g. /uploads/..., /logos/..., /avatars/...)
    if (url && url.startsWith('/')) {
      const relPath = url.startsWith('/') ? url.slice(1) : url;
      const candidatesOnDisk = [
        path.join(process.cwd(), 'public', relPath),
        path.join(process.cwd(), relPath),
        path.join(process.cwd(), 'dist', relPath),
      ];
      for (const diskPath of candidatesOnDisk) {
        const dataUri = tryReadDiskFile(diskPath);
        if (dataUri) return dataUri;
      }
    }

    // 3. HTTP / HTTPS URL
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const base64 = Buffer.from(arrayBuf).toString('base64');
          const mime = res.headers.get('content-type') || 'image/png';
          return `data:${mime};base64,${base64}`;
        }
      } catch (e) {
        // Fallback below
      }
    }

    // 4. Automatic folder resolution by nickname or team name
    const cleanName = (fallbackText || '').trim();
    if (cleanName && cleanName !== '?') {
      const lowerName = cleanName.toLowerCase();
      const underscoreName = lowerName.replace(/\s+/g, '_');
      const hyphenName = lowerName.replace(/\s+/g, '-');
      const noSpacesName = lowerName.replace(/\s+/g, '');

      const nameVariations = Array.from(new Set([lowerName, underscoreName, hyphenName, noSpacesName]));
      const extensions = ['png', 'jpg', 'jpeg', 'webp', 'svg'];

      const searchDirs = isTeam
        ? ['public/optimized', 'public/logos', 'public/logos2', 'public/uploads', 'public/avatars']
        : ['public/avatars', 'public/avatars2', 'public/optimized', 'public/uploads', 'public/logos'];

      for (const dir of searchDirs) {
        for (const ext of extensions) {
          for (const nameVar of nameVariations) {
            const diskPath = path.join(process.cwd(), dir, `${nameVar}.${ext}`);
            const dataUri = tryReadDiskFile(diskPath);
            if (dataUri) return dataUri;
          }
        }
      }
    }

    // 5. Remote UI-Avatars fallback for players
    if (!isTeam && cleanName && cleanName !== '?') {
      try {
        const uiAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=222338&color=ff8f00&bold=true`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(uiAvatarUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const base64 = Buffer.from(arrayBuf).toString('base64');
          return `data:image/png;base64,${base64}`;
        }
      } catch (e) {}
    }

    // 6. SVG Letter fallback
    const char = (cleanName || '?').trim().charAt(0).toUpperCase() || '?';
    const svg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <text x="50" y="65" font-family="sans-serif" font-size="50" font-weight="900" fill="#ffffff" text-anchor="middle">${char}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  private async showRatingPage(chatId: string, page: number, messageId?: string) {
    try {
      const teamsQuery = query(collection(db, 'teams'), where('channelId', '==', this.userId));
      const teamsSnapshot = await getDocs(teamsQuery);
      
      const fetchedTeams: any[] = [];
      teamsSnapshot.forEach((d) => {
        const data = d.data();
        const players = data.players || [];
        const totalValRating = players.slice(0, 5).reduce((acc: number, p: any) => acc + (p && p.id ? (p.valRating != null && String(p.valRating) !== '' ? Number(p.valRating) : 0) : 0), 0);
        
        fetchedTeams.push({
          id: d.id,
          name: data.name || 'Неизвестная команда',
          logoUrl: data.logoUrl || '',
          totalValRating,
          players
        });
      });

      // Sort by total VAL rating descending
      fetchedTeams.sort((a, b) => b.totalValRating - a.totalValRating);

      const itemsPerPage = 8;
      const totalPages = Math.ceil(fetchedTeams.length / itemsPerPage);
      const currentPage = Math.max(1, Math.min(page, totalPages));
      
      let buttons: any[] = [];

      if (fetchedTeams.length === 0) {
        await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `В вашей системе пока не создано ни одной команды! 🚫\nСоздайте их в панели управления на сайте.`,
            parse_mode: 'Markdown'
          })
        });
        return;
      }

      const startIndexP = (currentPage - 1) * itemsPerPage;
      const endIndexP = Math.min(startIndexP + itemsPerPage, fetchedTeams.length);
      const pageItems = fetchedTeams.slice(startIndexP, endIndexP);

      let defsSvg = '';
      let rowsSvg = '';
      let y = 160;

      for (let i = 0; i < pageItems.length; i++) {
        const t = pageItems[i];
        const rank = startIndexP + i + 1;
        const safeName = (t.name || 'Команда').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        let rankBg = '#222338';
        let rankTextColor = '#ffffff';
        if (rank === 1) { rankBg = '#FFD700'; rankTextColor = '#000000'; }
        else if (rank === 2) { rankBg = '#C0C0C0'; rankTextColor = '#000000'; }
        else if (rank === 3) { rankBg = '#CD7F32'; rankTextColor = '#000000'; }

        // Fetch team logo (supports relative paths and automatic folder lookup by team name)
        const teamLogoUri = await this.fetchImageAsDataUri(t.logoUrl, t.name, '#25263a', true);

        const teamClipId = `clip-team-${currentPage}-${i}`;
        defsSvg += `<clipPath id="${teamClipId}"><circle cx="120" cy="${y + 44}" r="22"/></clipPath>`;

        let playersSvg = '';
        const validPlayers = (t.players || []).filter((p: any) => p && (p.id || p.nickname)).slice(0, 5);

        for (let pIdx = 0; pIdx < validPlayers.length; pIdx++) {
          const p = validPlayers[pIdx];
          const px = 380 + pIdx * 100;
          const playerClipId = `clip-p-${currentPage}-${i}-${pIdx}`;
          
          // Fetch player avatar (supports relative paths, automatic folder lookup by nickname, or UI-Avatars)
          const playerAvatarUri = await this.fetchImageAsDataUri(p.avatarUrl, p.nickname || 'P', '#1c1c2b', false);

          defsSvg += `<clipPath id="${playerClipId}"><circle cx="${px + 20}" cy="${y + 28}" r="20"/></clipPath>`;

          const safeNick = (p.nickname || 'Player').substring(0, 10).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const pValRating = (p.valRating != null && String(p.valRating) !== '' ? Number(p.valRating) : 0).toLocaleString();

          playersSvg += `
            <circle cx="${px + 20}" cy="${y + 28}" r="21" fill="#1f1f30" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1.5"/>
            <image href="${playerAvatarUri}" x="${px}" y="${y + 8}" width="40" height="40" clip-path="url(#${playerClipId})"/>
            <text x="${px + 20}" y="${y + 58}" font-family="sans-serif" font-size="11" font-weight="800" fill="#ffffff" text-anchor="middle">${safeNick}</text>
            <text x="${px + 20}" y="${y + 70}" font-family="sans-serif" font-size="9" font-weight="800" fill="#ff8f00" text-anchor="middle">${pValRating} pts</text>
          `;
        }

        if (validPlayers.length === 0) {
          playersSvg = `<text x="380" y="${y + 48}" font-family="sans-serif" font-size="13" font-style="italic" fill="#555566">Нет игроков в составе</text>`;
        }

        rowsSvg += `
          <rect x="40" y="${y}" width="920" height="88" fill="#141421" rx="14" stroke="#ffffff" stroke-opacity="0.05"/>
          
          <circle cx="65" cy="${y + 44}" r="18" fill="${rankBg}"/>
          <text x="65" y="${y + 50}" font-family="sans-serif" font-size="14" font-weight="900" fill="${rankTextColor}" text-anchor="middle">${rank}</text>
          
          <circle cx="120" cy="${y + 44}" r="23" fill="#25263a" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1.5"/>
          <image href="${teamLogoUri}" x="96" y="${y + 20}" width="48" height="48" clip-path="url(#${teamClipId})"/>
          
          <text x="156" y="${y + 50}" font-family="sans-serif" font-size="17" font-weight="900" fill="#ffffff">${safeName}</text>
          
          ${playersSvg}
          
          <text x="940" y="${y + 45}" font-family="sans-serif" font-size="20" font-weight="900" fill="#ff8f00" text-anchor="end">${t.totalValRating.toLocaleString()}</text>
          <text x="940" y="${y + 60}" font-family="sans-serif" font-size="10" font-weight="800" fill="#666680" text-anchor="end">VAC PTS</text>
        `;

        y += 100;
      }

      const svgHeight = 160 + (pageItems.length * 100) + 20;
      const svgString = `
      <svg width="1000" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#ff8f00"/>
            <stop offset="100%" stop-color="#ffaa00"/>
          </linearGradient>
          ${defsSvg}
        </defs>

        <rect width="100%" height="100%" fill="#0d0d15" rx="24"/>
        
        <text x="40" y="52" font-family="sans-serif" font-size="28" font-weight="900" fill="url(#headerGrad)">🏆 ТАБЛИЦА VAC PTS</text>
        <text x="40" y="80" font-family="sans-serif" font-size="14" font-weight="700" fill="#7a7a95">Официальный рейтинг киберспортивных организаций и состав игроков</text>
        
        <rect x="40" y="105" width="920" height="36" fill="#161624" rx="8"/>
        <text x="65" y="128" font-family="sans-serif" font-size="12" font-weight="800" fill="#666680" text-anchor="middle">#</text>
        <text x="110" y="128" font-family="sans-serif" font-size="12" font-weight="800" fill="#666680">КОМАНДА</text>
        <text x="380" y="128" font-family="sans-serif" font-size="12" font-weight="800" fill="#666680">СОСТАВ ИГРОКОВ (VAC PTS)</text>
        <text x="940" y="128" font-family="sans-serif" font-size="12" font-weight="800" fill="#666680" text-anchor="end">ОЧКИ</text>
        
        ${rowsSvg}
      </svg>`;

      const imageBuffer = await sharp(Buffer.from(svgString)).png().toBuffer();

      const row = [];
      if (currentPage > 1) {
        row.push({ text: '⬅️ Пред.', callback_data: `rating_page_${currentPage - 1}` });
      }
      if (currentPage < totalPages) {
        row.push({ text: 'След. ➡️', callback_data: `rating_page_${currentPage + 1}` });
      }
      if (row.length > 0) {
        buttons.push(row);
      }

      if (messageId) {
        await fetch(`https://api.telegram.org/bot${this.token}/deleteMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, message_id: messageId })
        }).catch(e => console.error(e));
      }

      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', new Blob([imageBuffer], { type: 'image/png' }), 'rating.png');
      if (buttons.length > 0) {
        formData.append('reply_markup', JSON.stringify({ inline_keyboard: [row] }));
      }

      await fetch(`https://api.telegram.org/bot${this.token}/sendPhoto`, {
        method: 'POST',
        body: formData
      });

    } catch (err: any) {
      console.error("Error showing rating in TG bot:", err.message);
      if (!messageId) {
        await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `⚠️ *Ошибка при получении рейтинга.*\n\nПожалуйста, попробуйте позже.`,
            parse_mode: 'Markdown'
          })
        });
      }
    }
  }

  private async handleMoneyCommand(chatId: number, text: string, fromUser: any) {
    const parts = text.trim().split(/\s+/);
    const command = parts[0].toLowerCase();

    // /money or /budget
    if (command === '/money' || command === '/budget' || command === '💰 бюджет' || command === '💰 деньги') {
      try {
        const tgUserRef = doc(db, 'tgUsers', `${this.userId}_${chatId}`);
        const tgUserSnap = await getDoc(tgUserRef);
        const tgUser = tgUserSnap.exists() ? tgUserSnap.data() : {};
        let currentBudget = tgUser.money || 0;
        let teamName = tgUser.teamName || 'Без команды';

        if (tgUser.teamId) {
          const teamSnap = await getDoc(doc(db, 'teams', tgUser.teamId));
          if (teamSnap.exists() && teamSnap.data().budget !== undefined) {
            currentBudget = Number(teamSnap.data().budget) || 0;
          }
        }

        const msgText = `💰 *ФИНАНСОВЫЙ БАЛАНС* 💰\n\n👤 *Пользователь:* @${fromUser.username || fromUser.first_name}\n🏷 *Организация:* ${teamName}\n💵 *Бюджет:* *$${currentBudget.toLocaleString()}*\n\n📌 *Команды для управления (для админа):*\n• \`/givemoney @username <сумма>\` — выдать деньги\n• \`/takemoney @username <сумма>\` — забрать деньги\n• \`/setmoney @username <сумма>\` — установить бюджет`;

        await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: msgText,
            parse_mode: 'Markdown'
          })
        });
      } catch (err: any) {
        console.error("Error showing money status:", err.message);
      }
      return true;
    }

    if (['/givemoney', '/addmoney', '/takemoney', '/removemoney', '/setmoney'].includes(command)) {
      try {
        let targetUsername = '';
        let amountStr = '';

        if (parts.length >= 3) {
          targetUsername = parts[1].replace('@', '').trim();
          amountStr = parts[2];
        } else if (parts.length === 2) {
          targetUsername = fromUser.username || '';
          amountStr = parts[1];
        } else {
          await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `⚠️ *Использование команды:*\n\n\`${command} @username <сумма>\`\nПример: \`${command} @leader123 50000\``,
              parse_mode: 'Markdown'
            })
          });
          return true;
        }

        const amountNum = Number(amountStr.replace(/[^0-9]/g, ''));
        if (isNaN(amountNum) || amountNum <= 0) {
          await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: '⚠️ Пожалуйста, укажите корректную сумму цифрами (например, 50000).',
              parse_mode: 'Markdown'
            })
          });
          return true;
        }

        // Search user in tgUsers collection
        let targetDocId = `${this.userId}_${chatId}`;
        let targetUserObj: any = null;

        const q = query(collection(db, 'tgUsers'), where('botUserId', '==', this.userId));
        const snap = await getDocs(q);
        
        snap.forEach(d => {
          const data = d.data();
          if (data.username && data.username.toLowerCase() === targetUsername.toLowerCase()) {
            targetDocId = d.id;
            targetUserObj = { id: d.id, ...data };
          }
        });

        if (!targetUserObj && targetUsername === (fromUser.username || '')) {
          const selfSnap = await getDoc(doc(db, 'tgUsers', `${this.userId}_${chatId}`));
          if (selfSnap.exists()) {
            targetUserObj = { id: selfSnap.id, ...selfSnap.data() };
            targetDocId = selfSnap.id;
          }
        }

        if (!targetUserObj) {
          await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `❌ Пользователь *@${targetUsername}* не найден в базе бота! Пусть он сначала напишет боту /start.`,
              parse_mode: 'Markdown'
            })
          });
          return true;
        }

        let currentVal = targetUserObj.money || 0;
        if (targetUserObj.teamId) {
          const tSnap = await getDoc(doc(db, 'teams', targetUserObj.teamId));
          if (tSnap.exists() && tSnap.data().budget !== undefined) {
            currentVal = Number(tSnap.data().budget) || 0;
          }
        }

        let newVal = currentVal;
        if (command === '/givemoney' || command === '/addmoney') {
          newVal = currentVal + amountNum;
        } else if (command === '/takemoney' || command === '/removemoney') {
          newVal = Math.max(0, currentVal - amountNum);
        } else if (command === '/setmoney') {
          newVal = Math.max(0, amountNum);
        }

        // Update tgUser
        await updateDoc(doc(db, 'tgUsers', targetDocId), { money: newVal });

        // Update team if assigned
        let teamName = targetUserObj.teamName || 'Без команды';
        if (targetUserObj.teamId) {
          await updateDoc(doc(db, 'teams', targetUserObj.teamId), { budget: newVal });
        }

        const actionText = (command === '/givemoney' || command === '/addmoney') ? 'выдано' : (command === '/takemoney' || command === '/removemoney') ? 'списано' : 'установлен бюджет';
        const diffText = (command === '/givemoney' || command === '/addmoney') ? `+ $${amountNum.toLocaleString()}` : (command === '/takemoney' || command === '/removemoney') ? `- $${amountNum.toLocaleString()}` : `$${newVal.toLocaleString()}`;

        const adminReply = `✅ Успешно! У лидера *@${targetUserObj.username || targetUsername}* (${teamName}) ${actionText} *$${amountNum.toLocaleString()}*.\n\n💰 Новый бюджет: *$${newVal.toLocaleString()}*`;
        await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: adminReply,
            parse_mode: 'Markdown'
          })
        });

        // Notify target user if different chat
        if (targetUserObj.chatId && targetUserObj.chatId !== chatId) {
          const notifyUserText = `💰 *ИЗМЕНЕНИЕ БЮДЖЕТА* 💰\n\nАдминистратор изменил бюджет вашей организации *${teamName}*!\n\nДействие: ${diffText}\nНовый бюджет: *$${newVal.toLocaleString()}*`;
          await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: targetUserObj.chatId,
              text: notifyUserText,
              parse_mode: 'Markdown'
            })
          }).catch(() => {});
        }

      } catch (err: any) {
        console.error("Error executing money command:", err.message);
        await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `❌ Ошибка при выполнении команды: ${err.message}`,
            parse_mode: 'Markdown'
          })
        });
      }
      return true;
    }

    return false;
  }

  private async handleMessage(msg: any) {
    const chatId = msg.chat.id;
    const text = msg.text || '';
    const username = msg.from.username || msg.from.first_name || 'Менеджер';

    // Check financial commands
    const isMoneyCmd = await this.handleMoneyCommand(chatId, text, msg.from);
    if (isMoneyCmd) return;

    const state = this.states.get(chatId);
    if (state && state.step === 'enter_surcharge') {
      const cleaned = text.replace(/[^0-9]/g, '');
      const amount = cleaned ? Number(cleaned) : NaN;
      if (isNaN(amount) || amount < 0) {
        await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '⚠️ Пожалуйста, введите корректную сумму доплаты цифрами (например, 50000):'
          })
        });
        return;
      }
      await this.confirmSwapNewMessage(chatId, amount);
      return;
    }

    const keyboard = {
      keyboard: [
        [{ text: '👤 Профиль' }],
        [{ text: '🔄 Трэйд-лист' }, { text: '⚔️ Матчи' }],
        [{ text: '🏆 Рейтинг' }]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    };

    if (text === '/start') {
      try {
        const tgUserRef = doc(db, 'tgUsers', `${this.userId}_${chatId}`);
        const existingDoc = await getDoc(tgUserRef);
        if (!existingDoc.exists()) {
          await setDoc(tgUserRef, {
            id: `${this.userId}_${chatId}`,
            chatId: chatId,
            botUserId: this.userId,
            username: msg.from.username || '',
            firstName: msg.from.first_name || '',
            lastName: msg.from.last_name || '',
            status: 'Менеджер (Лидер)',
            money: 0,
            teamId: null,
            teamName: null,
            createdAt: new Date().toISOString()
          });
        }
      } catch (err: any) {
        console.error("Error creating tgUser on start:", err.message);
      }

      const replyText = `Приветствуем тебя, *${username}*, на профессиональной киберспортивной сцене как нового менеджера команды! 👔🎮🏆\n\nИспользуй кнопки меню ниже, чтобы управлять своим клубом, смотреть трансферы и следить за матчами!`;
      try {
        await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
            parse_mode: 'Markdown',
            reply_markup: keyboard
          })
        });
      } catch (e: any) {
        console.error(`Failed to send message:`, e.message);
      }
    } else if (text === '👤 Профиль') {
      await this.showProfile(chatId, username);
    } else if (text === '🔄 Трэйд-лист' || text === '🔄 Трансферы') {
      await this.showTransferDashboard(chatId);
    } else if (text === '⚔️ Матчи') {
      const replyText = `SOON: тут что то будет`;
      try {
        await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
            parse_mode: 'Markdown',
            reply_markup: keyboard
          })
        });
      } catch (e: any) {
        console.error(`Failed to send message:`, e.message);
      }
    } else if (text === '🏆 Рейтинг') {
      await this.showRatingPage(chatId, 1);
    } else {
      const replyText = `Извините, я не понимаю эту команду. Пожалуйста, используйте кнопки на клавиатуре:`;
      try {
        await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
            parse_mode: 'Markdown',
            reply_markup: keyboard
          })
        });
      } catch (e: any) {
        console.error(`Failed to send message:`, e.message);
      }
    }
  }





  private async showAcademyTg(chatId: number, messageId: number) {
    try {
      const teamsq = query(collection(db, 'teams'), where('channelId', '==', this.userId));
      const teamsSnapshot = await getDocs(teamsq);
      const academyTeams: any[] = [];
      teamsSnapshot.forEach((d) => {
        const t = d.data();
        if (t.isAcademy) {
          academyTeams.push({ id: d.id, ...t });
        }
      });

      let text = `🏫 *АКАДЕМИЧЕСКИЕ КОМАНДЫ* 🏫

`;
      if (academyTeams.length === 0) {
        text += `В вашей системе пока нет зарегистрированных академий. 🏫`;
      } else {
        text += `Выберите академию для просмотра состава:
`;
      }

      const keyboard: any = {
        inline_keyboard: []
      };
      
      if (academyTeams.length > 0) {
        academyTeams.forEach(team => {
            keyboard.inline_keyboard.push([{ text: `🛡 ${team.name}`, callback_data: `view_academy_team_${team.id}` }]);
        });
      }
      
      keyboard.inline_keyboard.push([{ text: '⬅️ Назад в трансферы', callback_data: 'refresh_transfers' }]);

      await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        })
      });
    } catch (err: any) {
      console.error("Error showing academy tg:", err.message);
    }
  }

  private async showAcademyTeamTg(chatId: number, messageId: number, teamId: string) {
    try {
      const teamRef = doc(db, 'teams', teamId);
      const teamDoc = await getDoc(teamRef);
      
      if (!teamDoc.exists()) return;
      const team = teamDoc.data();
      
      const tgUserRef = doc(db, 'tgUsers', `${this.userId}_${chatId}`);
      const tgUserSnap = await getDoc(tgUserRef);
      const tgUser = tgUserSnap.exists() ? tgUserSnap.data() : null;

      const players = team.players || [];
      let playersText = '';
      for (let i = 0; i < 5; i++) {
        const p = players[i];
        const pName = p && p.nickname && p.nickname !== 'Пусто' ? p.nickname : `Игрок ${i+1} (Свободен)`;
        playersText += `   ${i+1}. ${pName}\n`;
      }
      
      let text = `📂 *СОСТАВ АКАДЕМИИ* ${team.name || 'Без названия'} 📂\n\n👑 *Лидер:* @${tgUser?.username || 'Скрыто'}\n\n🏃 *ЮНИОРЫ (5/5):*\n${playersText}\n📦 *РЕЗЕРВ (Запасные):* 0 чел.`;

      const keyboard: any = {
        inline_keyboard: [
          [{ text: '⬅️ Назад к списку академий', callback_data: 'view_academy_tg' }]
        ]
      };

      await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        })
      });
    } catch (err: any) {
      console.error("Error showing academy team tg:", err.message);
    }
  }

  private async showFftTg(chatId: number, messageId: number) {
    try {
      const pq = query(collection(db, 'players'), where('channelId', '==', this.userId));
      const playersSnapshot = await getDocs(pq);
      const allPlayers: any[] = [];
      playersSnapshot.forEach((d) => {
        allPlayers.push({ id: d.id, ...d.data() });
      });

      const tq = query(collection(db, 'teams'), where('channelId', '==', this.userId));
      const teamsSnapshot = await getDocs(tq);
      const allTeams: any[] = [];
      teamsSnapshot.forEach((d) => {
        allTeams.push(d.data());
      });

      const assignedPlayerIds = allTeams.flatMap(t => t.players?.map((p: any) => p.id)).filter(Boolean);
      const fftPlayers = allPlayers.filter(p => !assignedPlayerIds.includes(p.id));

      let text = `👥 *СВОБОДНЫЕ ИГРОКИ (ФФТ)* 👥\n\n`;
      if (fftPlayers.length === 0) {
        text += `Свободных игроков (ФФТ) в базе нет. Все игроки заняты в клубах.`;
      } else {
        text += `Список свободных агентов:\n\n`;
        fftPlayers.forEach((p, idx) => {
          text += `${idx + 1}. *${p.nickname}*\n   Рейтинг CS: ${Number(p.rating).toFixed(0)} | VAL: ${p.valRating != null && String(p.valRating) !== '' ? p.valRating : 0}\n   Слот: ${p.role || 'Rifler'}\n\n`;
        });
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: '⬅️ Назад в трансферы', callback_data: 'refresh_transfers' }]
        ]
      };

      await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        })
      });
    } catch (err: any) {
      console.error("Error showing FFT tg:", err.message);
    }
  }

  private async handleVetoActionFromBot(chatId: number, messageId: number, vetoId: string, mapId: string) {
    try {
      const vetoRef = doc(db, 'tgVetos', vetoId);
      const vetoSnap = await getDoc(vetoRef);
      if (!vetoSnap.exists()) {
        await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: "⚠️ Ошибка: Данное вето не найдено или удалено." })
        });
        return;
      }

      const veto = vetoSnap.data();
      if (veto.status === 'finished') {
        await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: "⚠️ Вето уже завершено!" })
        });
        return;
      }

      // Check current step
      const steps = getVetoSteps(veto.format, veto.game);
      const currentStepIdx = veto.stage - 1;
      if (currentStepIdx >= steps.length) {
        return;
      }

      const currentStep = steps[currentStepIdx];
      const expectedChatId = currentStep.teamIndex === 1 ? veto.manager1ChatId : veto.manager2ChatId;
      
      if (chatId !== expectedChatId) {
        // Not their turn! Send brief notification
        await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: "⚠️ Сейчас не ваш ход! Ожидайте хода соперника." })
        });
        return;
      }

      // Valid turn!
      const mapName = getMapName(mapId, veto.game);
      const actingTeamName = currentStep.teamIndex === 1 ? veto.team1Name : veto.team2Name;
      const actingTeamId = currentStep.teamIndex === 1 ? veto.team1Id : veto.team2Id;

      const banned = veto.banned || [];
      const picked = veto.picked || [];
      const logs = veto.logs || [];

      if (currentStep.action === 'ban') {
        banned.push(mapId);
        logs.push(`❌ Команда *${actingTeamName}* забанила карту *${mapName}*`);
      } else {
        picked.push({
          mapId,
          teamId: actingTeamId,
          teamName: actingTeamName,
          type: 'pick'
        });
        logs.push(`✅ Команда *${actingTeamName}* выбрала карту *${mapName}*`);
      }

      const nextStage = veto.stage + 1;
      let nextStatus = 'active';

      // Check if finished
      if (nextStage > steps.length) {
        // Automatic decider map
        const pool = veto.game === 'cs2' ? MAP_POOL_CS2 : MAP_POOL_S2;
        const pickedIds = picked.map((p: any) => p.mapId);
        const remaining = pool.filter((m: any) => !banned.includes(m.id) && !pickedIds.includes(m.id));
        if (remaining.length > 0) {
          const deciderMap = remaining[0];
          picked.push({
            mapId: deciderMap.id,
            teamId: 'decider',
            teamName: 'Десайдер',
            type: 'decider'
          });
          logs.push(`🔮 Оставшаяся карта *${deciderMap.name}* выбрана десайдером!`);
        }
        nextStatus = 'finished';
      }

      const updatedVeto = {
        ...veto,
        stage: nextStage,
        banned,
        picked,
        logs,
        status: nextStatus
      };

      // Save to LocalDB
      await setDoc(vetoRef, updatedVeto);

      // Now edit messages for both managers with updated state!
      const updateMessage = async (mgrChatId: number, mgrMsgId: number, playerIdx: number) => {
        if (!mgrChatId || !mgrMsgId) return;
        const render = renderVetoMessageStatic(updatedVeto, playerIdx);
        try {
          await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: mgrChatId,
              message_id: mgrMsgId,
              text: render.text,
              parse_mode: 'Markdown',
              reply_markup: render.reply_markup
            })
          });
        } catch (e: any) {
          console.error(`Failed to update veto message for manager ${playerIdx}:`, e.message);
        }
      };

      await updateMessage(veto.manager1ChatId, veto.manager1MessageId, 1);
      await updateMessage(veto.manager2ChatId, veto.manager2MessageId, 2);

    } catch (err: any) {
      console.error("Error handling veto action from bot:", err);
    }
  }
}

const botInstances = new Map<string, TelegramBotInstance>();

async function loadAllBots() {
  try {
    const querySnapshot = await getDocs(collection(db, 'settings'));
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.botToken && data.botToken.trim() !== '') {
        const userId = data.userId || docSnap.id;
        if (botInstances.has(userId)) {
          botInstances.get(userId)?.stop();
        }
        const bot = new TelegramBotInstance(data.botToken.trim(), userId);
        bot.start();
        botInstances.set(userId, bot);
      }
    });

    // Support DIRECT_TELEGRAM_BOT_TOKEN setup directly in the code
    if (DIRECT_TELEGRAM_BOT_TOKEN && DIRECT_TELEGRAM_BOT_TOKEN.trim() !== '') {
      const token = DIRECT_TELEGRAM_BOT_TOKEN.trim();
      const userId = DIRECT_BOT_USER_ID || 'channel_bamep_cs2@matchsimulator.com';
      console.log(`[BOT] Запуск Telegram бота по прямому токену из кода для пользователя: ${userId}`);
      if (botInstances.has(userId)) {
        botInstances.get(userId)?.stop();
      }
      const bot = new TelegramBotInstance(token, userId);
      bot.start();
      botInstances.set(userId, bot);

      // Auto-save this direct token into database settings so it stays perfectly in sync with frontend settings screen
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', userId));
        const currentData = settingsSnap && settingsSnap.exists() ? settingsSnap.data() : {};
        if (currentData.botToken !== token) {
          await setDoc(doc(db, 'settings', userId), {
            ...currentData,
            userId,
            botToken: token,
            startingMoney: currentData.startingMoney || 500000,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          console.log(`[BOT] Прямой токен успешно сохранен в базу данных для ${userId}`);
        }
      } catch (dbErr: any) {
        console.warn("[BOT] Не удалось обновить настройки в БД для прямого токена:", dbErr.message);
      }
    }

    console.log(`Loaded ${botInstances.size} Telegram bots from LocalDB.`);
  } catch (err: any) {
    console.error("Failed to load Telegram bots from LocalDB on startup:", err.message);
  }
}

// Settings and Telegram Bot restart API Endpoint

app.post("/api/settings/upload-map", upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }
    const mapName = req.body.mapName;
    if (!mapName) {
      return res.status(400).json({ error: "Map name is required" });
    }
    
    // Convert mapName to lowercase and add .jpg
    const fileName = `${mapName.toLowerCase()}.jpg`;
    
    // Save to LocalDB so it persists across container restarts
    const base64Image = req.file.buffer.toString('base64');
    try {
      await setDoc(doc(db, 'customMaps', mapName.toLowerCase()), {
        mapName: mapName,
        fileName: fileName,
        imageBase64: base64Image,
        updatedAt: new Date().toISOString()
      });
    } catch (dbErr: any) {
      console.warn("Failed to save map to LocalDB, only writing to local disk:", dbErr);
    }

    const destPath = path.join(process.cwd(), 'public', 'maps', fileName);
    
    // Make sure public/maps exists
    
    const publicMapsDir = path.join(process.cwd(), 'public', 'maps');
    if (!fs.existsSync(publicMapsDir)) {
      fs.mkdirSync(publicMapsDir, { recursive: true });
    }
    // Write to public
    fs.writeFileSync(path.join(publicMapsDir, fileName), req.file.buffer);

    // If dist exists, also write to dist/maps
    const distMapsDir = path.join(process.cwd(), 'dist', 'maps');
    if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
      if (!fs.existsSync(distMapsDir)) {
        fs.mkdirSync(distMapsDir, { recursive: true });
      }
      fs.writeFileSync(path.join(distMapsDir, fileName), req.file.buffer);
    }
    
    res.json({ success: true, fileName });
  } catch (err: any) {
    console.error("Map upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings/save", async (req, res) => {
  try {
    const { userId, botToken, startingMoney, customRolesCS2, customRolesS2 } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const payload: any = {
      userId,
      botToken: (botToken || "").trim(),
      startingMoney: Number(startingMoney) || 500000,
      updatedAt: new Date().toISOString()
    };
    
    if (customRolesCS2) payload.customRolesCS2 = customRolesCS2;
    if (customRolesS2) payload.customRolesS2 = customRolesS2;

    // Save to LocalDB using Web SDK db
    await setDoc(doc(db, 'settings', userId), payload, { merge: true });

    // Stop existing bot if it exists
    if (botInstances.has(userId)) {
      await botInstances.get(userId)?.stop();
      botInstances.delete(userId);
    }

    // Start new bot if token is provided
    if (botToken && botToken.trim() !== "") {
      const newBot = new TelegramBotInstance(botToken.trim(), userId);
      await newBot.start();
      botInstances.set(userId, newBot);
    }

    console.log(`Settings saved for user ${userId}, botToken provided: ${!!botToken}`); res.json({ success: true });
  } catch (error: any) {
    console.error("Error in settings save endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

// Sync client-side localStorage cache to the resilient fallback DB
app.post("/api/sync-cache", async (req, res) => {
  try {
    const { userId, settings, players, teams, swapOffers, tournaments, matches, tgUsers, tgVetos, mapStats } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    console.log(`Received cache sync request for user: ${userId}`);

    // Helper to merge items into fallbackDb and Firestore to keep all databases up to date
    const syncCollection = async (collectionName: string, incomingItems: any[], userField: string) => {
      if (!Array.isArray(incomingItems)) return;
      
      loadedCollections.add(collectionName); // Mark as loaded since we are syncing it!
      
      // Add or update all incoming items in the server's fast local cache & Firestore
      for (const item of incomingItems) {
        if (!item) continue;
        const itemId = item.id || (item.chatId ? `${userId}_${item.chatId}` : null);
        if (!itemId) continue;
        
        fallbackDb.set(collectionName, itemId, item);

        // Crucial: also save to Firestore so queries from client never revert to old rating!
        try {
          const docData = { ...item, [userField]: item[userField] || userId };
          setDoc(doc(db, collectionName, itemId), docData, { merge: true }).catch(() => {});
        } catch (e) {
          // ignore doc errors
        }
      }
    };

    // 1. Sync settings
    if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
      loadedCollections.add('settings');
      console.log(`Sync settings for user: ${userId}`);
      fallbackDb.set('settings', userId, { userId, ...settings });
      try {
        setDoc(doc(db, 'settings', userId), { userId, ...settings }, { merge: true }).catch(() => {});
      } catch (e) {}

      // If the botToken has changed, restart the bot with the new token
      const token = settings.botToken?.trim();
      if (token && token !== '') {
        const existingBot = botInstances.get(userId);
        if (existingBot) {
          // If the token is different, restart the bot
          if ((existingBot as any).token !== token) {
            console.log(`Bot token changed for ${userId}. Restarting bot...`);
            existingBot.stop();
            const newBot = new TelegramBotInstance(token, userId);
            newBot.start().catch((err: any) => {
              console.error(`Failed to start updated bot for ${userId}:`, err.message);
            });
            botInstances.set(userId, newBot);
          }
        } else {
          console.log(`Starting Telegram Bot for ${userId} with newly synchronized token...`);
          const newBot = new TelegramBotInstance(token, userId);
          newBot.start().catch((err: any) => {
            console.error(`Failed to start new bot for ${userId}:`, err.message);
          });
          botInstances.set(userId, newBot);
        }
      }
    }

    // 2. Sync array collections
    if (players) await syncCollection('players', players, 'channelId');
    if (teams) await syncCollection('teams', teams, 'channelId');
    if (swapOffers) await syncCollection('swapOffers', swapOffers, 'channelId');
    if (tournaments) await syncCollection('tournaments', tournaments, 'channelId');
    if (matches) await syncCollection('matches', matches, 'channelId');
    if (tgUsers) await syncCollection('tgUsers', tgUsers, 'botUserId');
    if (tgVetos) await syncCollection('tgVetos', tgVetos, 'userId');
    if (mapStats) await syncCollection('mapStats', mapStats, 'userId');

    // 3. Fallback start Telegram Bot if settings are in database but it isn't running yet
    const finalSettings = fallbackDb.get('settings', userId);
    if (finalSettings && finalSettings.botToken && finalSettings.botToken.trim() !== '') {
      const token = finalSettings.botToken.trim();
      if (!botInstances.has(userId)) {
        console.log(`Starting Telegram Bot for ${userId} from synchronized cache token (lazy load)...`);
        const newBot = new TelegramBotInstance(token, userId);
        newBot.start().catch((err: any) => {
          console.error(`Failed to start synced bot for ${userId}:`, err.message);
        });
        botInstances.set(userId, newBot);
      }
    }

    console.log(`Successfully synced cache for user ${userId}`);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error in sync-cache API:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Settings load API Endpoint
app.get("/api/settings/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }
    const docSnap = await getDoc(doc(db, 'settings', userId));
    if (docSnap.exists()) {
      res.json(docSnap.data());
    } else {
      res.status(404).json({ error: "Settings not found" });
    }
  } catch (error: any) {
    console.error("Error in settings load endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

// Resilient fallback backup data fetch API Endpoint
app.get("/api/backup-data/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    console.log(`Serving backup-data request for user: ${userId}`);

    const settings = fallbackDb.get('settings', userId) || { userId, startingMoney: 500000 };
    const players = fallbackDb.getAll('players').filter(item => item.channelId === userId);
    const teams = fallbackDb.getAll('teams').filter(item => item.channelId === userId);
    const swapOffers = fallbackDb.getAll('swapOffers').filter(item => item.channelId === userId);
    const tournaments = fallbackDb.getAll('tournaments').filter(item => item.channelId === userId);
    const matches = fallbackDb.getAll('matches').filter(item => item.channelId === userId);
    const tgUsers = fallbackDb.getAll('tgUsers').filter(item => item.botUserId === userId);
    const tgVetos = fallbackDb.getAll('tgVetos').filter(item => item.userId === userId);
    const mapStats = fallbackDb.getAll('mapStats').filter(item => item.userId === userId);

    res.json({
      success: true,
      settings,
      players,
      teams,
      swapOffers,
      tournaments,
      matches,
      tgUsers,
      tgVetos,
      mapStats
    });
  } catch (err: any) {
    console.error("Error in backup-data API:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Bot notifications helper API Endpoint
app.post("/api/bot/notify", async (req, res) => {
  try {
    const { userId, teamId, text, reply_markup } = req.body;
    if (!userId || !teamId || !text) {
      return res.status(400).json({ error: "Missing required fields: userId, teamId, text" });
    }

    if (typeof teamId !== 'string' || teamId.trim() === '' || teamId === 'null' || teamId === 'undefined') {
      console.log(`[Notification API Alert] Aborting notify endpoint because teamId is invalid: "${teamId}"`);
      return res.status(400).json({ error: "Invalid teamId" });
    }

    const botInstance = botInstances.get(userId);
    if (botInstance) {
      await (botInstance as any).notifyTeamManager(teamId, text, reply_markup);
      return res.json({ success: true, method: "botInstance" });
    }

    // Fallback: send directly using token from Settings
    const settingsSnap = await getDoc(doc(db, 'settings', userId));
    if (settingsSnap.exists()) {
      const settings = settingsSnap.data();
      const token = settings.botToken;
      if (token) {
        const managerQuery = query(
          collection(db, 'tgUsers'),
          where('botUserId', '==', userId),
          where('teamId', '==', teamId)
        );
        const managerSnapshot = await getDocs(managerQuery);
        if (managerSnapshot.empty) {
          return res.json({ success: false, reason: "No active manager found for team" });
        }

        for (const d of managerSnapshot.docs) {
          const mgr = d.data();
          if (mgr.chatId) {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: mgr.chatId,
                text: text,
                parse_mode: 'Markdown',
                reply_markup: reply_markup
              })
            });
          }
        }
        return res.json({ success: true, method: "direct" });
      }
    }
    res.json({ success: false, reason: "Bot not running and token not configured" });
  } catch (error: any) {
    console.error("Error in bot notify endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start Veto stage in Telegram Bot API Endpoint
app.post("/api/veto/start", async (req, res) => {
  try {
    const { userId, tourneyId, tourneyName, team1Id, team2Id, team1Name, team2Name, format, game } = req.body;
    if (!userId || !team1Id || !team2Id || !format || !game) {
      return res.status(400).json({ error: "Не все обязательные поля указаны!" });
    }

    // Find manager of team 1
    const m1Snap = await getDocs(query(collection(db, 'tgUsers'), where('botUserId', '==', userId), where('teamId', '==', team1Id)));
    // Find manager of team 2
    const m2Snap = await getDocs(query(collection(db, 'tgUsers'), where('botUserId', '==', userId), where('teamId', '==', team2Id)));

    if (m1Snap.empty && m2Snap.empty) {
      return res.status(400).json({ error: "Ни у одной из команд нет активного лидера в Telegram-боте! Менеджеры должны запустить бот." });
    }

    const mgr1 = m1Snap.empty ? null : m1Snap.docs[0].data();
    const mgr2 = m2Snap.empty ? null : m2Snap.docs[0].data();

    const vetoId = Date.now().toString();
    const vetoDoc: any = {
      id: vetoId,
      userId,
      tourneyId: tourneyId || 'generic',
      tourneyName: tourneyName || 'Турнир',
      team1Id,
      team2Id,
      team1Name,
      team2Name,
      format, // 'BO1', 'BO3', 'BO5'
      game, // 'cs2', 'standoff2'
      stage: 1,
      banned: [],
      picked: [],
      logs: [`⚔️ Стадия Вето началась между командами ${team1Name} и ${team2Name}`],
      status: 'active',
      manager1ChatId: mgr1?.chatId || null,
      manager2ChatId: mgr2?.chatId || null,
      manager1MessageId: null,
      manager2MessageId: null,
      createdAt: new Date().toISOString()
    };

    const settingsSnap = await getDoc(doc(db, 'settings', userId));
    const token = settingsSnap.exists() ? settingsSnap.data().botToken : null;
    if (!token) {
      return res.status(400).json({ error: "Telegram бот не настроен!" });
    }

    // Send to Manager 1
    if (mgr1?.chatId) {
      const render = renderVetoMessageStatic(vetoDoc, 1);
      const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: mgr1.chatId,
          text: render.text,
          parse_mode: 'Markdown',
          reply_markup: render.reply_markup
        })
      });
      const resData: any = await resp.json();
      if (resData.ok) {
        vetoDoc.manager1MessageId = resData.result.message_id;
      }
    }

    // Send to Manager 2
    if (mgr2?.chatId) {
      const render = renderVetoMessageStatic(vetoDoc, 2);
      const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: mgr2.chatId,
          text: render.text,
          parse_mode: 'Markdown',
          reply_markup: render.reply_markup
        })
      });
      const resData: any = await resp.json();
      if (resData.ok) {
        vetoDoc.manager2MessageId = resData.result.message_id;
      }
    }

    await setDoc(doc(db, 'tgVetos', vetoId), vetoDoc);
    res.json({ success: true, vetoId });
  } catch (err: any) {
    console.error("Error in veto start route:", err);
    res.status(500).json({ error: err.message });
  }
});

async function loadCustomMaps() {
  try {
    console.log("Restoring custom maps from LocalDB...");
    const snaps = await getDocs(collection(db, 'customMaps'));
    const publicDir = path.join(process.cwd(), 'public', 'maps');
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
    
    const distDir = path.join(process.cwd(), 'dist', 'maps');
    const hasDist = fs.existsSync(path.join(process.cwd(), 'dist'));
    if (hasDist && !fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
    
    snaps.forEach(snap => {
      const data = snap.data();
      if (data.fileName && data.imageBase64) {
        const buf = Buffer.from(data.imageBase64, 'base64');
        fs.writeFileSync(path.join(publicDir, data.fileName), buf);
        if (hasDist) fs.writeFileSync(path.join(distDir, data.fileName), buf);
      }
    });
    console.log("Custom maps restored.");
  } catch (err: any) {
    console.error("Failed to restore custom maps:", err.message);
  }
}

async function startServer() {
  // Restore persistent custom maps to the filesystem
  loadCustomMaps().catch(err => {
    console.error("Non-blocking loadCustomMaps failed:", err);
  });

  // Load and boot all active Telegram Bots in the background to prevent startup blocking
  loadAllBots().catch(err => {
    console.error("Non-blocking loadAllBots failed:", err);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
