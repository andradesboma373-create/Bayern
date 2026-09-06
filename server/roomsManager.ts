import fs from 'fs';
import path from 'path';

export interface Room {
  id: string;
  username: string;
  password: string;
  channelId: string;
  channelName: string;
  role: 'superadmin' | 'admin' | 'user';
  createdAt: string;
  isLocked: boolean;
  lockReason?: string;
  totalRequestsToday: number;
  lastActive: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  roomId: string;
  username: string;
  action: string;
  method: string;
  path: string;
  ip: string;
  details?: string;
  isAbuse?: boolean;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms_storage.json');

// Default initial rooms
const DEFAULT_ROOMS: Room[] = [
  {
    id: 'room_bamep',
    username: 'bamep',
    password: 'bamepys06',
    channelId: 'channel_bamep_cs2',
    channelName: 'bamep cs2 (Мастер Админ)',
    role: 'superadmin',
    createdAt: '2026-09-01T00:00:00.000Z',
    isLocked: false,
    totalRequestsToday: 0,
    lastActive: new Date().toISOString()
  },
  {
    id: 'room_zeixst',
    username: 'zeixst',
    password: 'ze0707',
    channelId: 'channel_bamep_cs2',
    channelName: 'bamep cs2 (Модератор)',
    role: 'admin',
    createdAt: '2026-09-01T00:00:00.000Z',
    isLocked: false,
    totalRequestsToday: 0,
    lastActive: new Date().toISOString()
  },
  {
    id: 'room_simu',
    username: 'simu',
    password: 'si0607',
    channelId: 'channel_simu',
    channelName: 'simu',
    role: 'user',
    createdAt: '2026-09-02T00:00:00.000Z',
    isLocked: false,
    totalRequestsToday: 0,
    lastActive: new Date().toISOString()
  }
];

// In-memory runtime state
let rooms: Room[] = [];
const auditLogs: AuditLogEntry[] = [];
const requestWindowMap = new Map<string, number[]>(); // roomId -> array of request timestamps in ms

// Quota usage counters
let dailyQuota = {
  date: new Date().toISOString().slice(0, 10),
  readsToday: 1420,
  writesToday: 210,
  maxReads: 50000,
  maxWrites: 20000
};

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ROOMS_FILE)) {
    rooms = [...DEFAULT_ROOMS];
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(rooms, null, 2), 'utf-8');
  } else {
    try {
      const data = fs.readFileSync(ROOMS_FILE, 'utf-8');
      rooms = JSON.parse(data);
      // Ensure default admin always exists
      if (!rooms.some(r => r.username === 'bamep')) {
        rooms.unshift(DEFAULT_ROOMS[0]);
      }
    } catch (e) {
      console.warn("Error reading rooms storage, fallback to defaults", e);
      rooms = [...DEFAULT_ROOMS];
    }
  }
}

function persistRooms() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(rooms, null, 2), 'utf-8');
  } catch (e) {
    console.error("Failed to persist rooms to disk", e);
  }
}

ensureStorage();

// Reset daily quotas at midnight
setInterval(() => {
  const today = new Date().toISOString().slice(0, 10);
  if (dailyQuota.date !== today) {
    dailyQuota = {
      date: today,
      readsToday: 0,
      writesToday: 0,
      maxReads: 50000,
      maxWrites: 20000
    };
    rooms.forEach(r => { r.totalRequestsToday = 0; });
    persistRooms();
  }
}, 60000);

export function authenticateRoom(username: string, password: string): { success: boolean; room?: Room; error?: string } {
  ensureStorage();
  const room = rooms.find(r => r.username.trim().toLowerCase() === username.trim().toLowerCase() && r.password === password);
  if (!room) {
    return { success: false, error: "Неверный логин или пароль комнаты" };
  }
  if (room.isLocked) {
    return { 
      success: false, 
      error: `Комната временно заблокирована на проверку администратором. Причина: ${room.lockReason || 'Превышение лимитов активности'}` 
    };
  }
  room.lastActive = new Date().toISOString();
  persistRooms();
  return { success: true, room };
}

export function getAllRooms(): Omit<Room, 'password'>[] {
  ensureStorage();
  return rooms.map(({ password, ...rest }) => rest);
}

export function createRoom(username: string, password: string, channelName: string, role: 'user' | 'admin' = 'user'): { success: boolean; room?: Room; error?: string } {
  ensureStorage();
  const cleanUser = username.trim().toLowerCase();
  if (!cleanUser || cleanUser.length < 3) {
    return { success: false, error: "Логин должен быть не менее 3 символов" };
  }
  if (!password || password.length < 4) {
    return { success: false, error: "Пароль должен быть не менее 4 символов" };
  }
  if (rooms.some(r => r.username.toLowerCase() === cleanUser)) {
    return { success: false, error: "Комната с таким логином уже существует" };
  }

  const newRoom: Room = {
    id: `room_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    username: cleanUser,
    password: password.trim(),
    channelId: `channel_${cleanUser}`,
    channelName: (channelName || cleanUser).trim(),
    role,
    createdAt: new Date().toISOString(),
    isLocked: false,
    totalRequestsToday: 0,
    lastActive: new Date().toISOString()
  };

  rooms.push(newRoom);
  persistRooms();

  logAudit({
    roomId: newRoom.id,
    username: cleanUser,
    action: 'ROOM_CREATED',
    method: 'POST',
    path: '/api/admin/rooms/create',
    ip: 'internal',
    details: `Создана новая комната: ${newRoom.channelName} (${cleanUser})`
  });

  return { success: true, room: newRoom };
}

export function toggleLockRoom(roomId: string, lock: boolean, reason?: string): { success: boolean; room?: Room; error?: string } {
  ensureStorage();
  const room = rooms.find(r => r.id === roomId || r.username === roomId || r.channelId === roomId);
  if (!room) {
    return { success: false, error: "Комната не найдена" };
  }
  if (room.username === 'bamep') {
    return { success: false, error: "Нельзя заблокировать комнату супер-администратора" };
  }

  room.isLocked = lock;
  room.lockReason = lock ? (reason || 'Заблокирована администратором') : undefined;
  persistRooms();

  logAudit({
    roomId: room.id,
    username: room.username,
    action: lock ? 'ROOM_LOCKED' : 'ROOM_UNLOCKED',
    method: 'POST',
    path: '/api/admin/rooms/toggle-lock',
    ip: 'admin',
    details: lock ? `Комната заблокирована. Причина: ${room.lockReason}` : 'Доступ к комнате восстановлен администратором'
  });

  return { success: true, room };
}

export function resetRoomQuota(roomId: string): { success: boolean; error?: string } {
  ensureStorage();
  const room = rooms.find(r => r.id === roomId || r.username === roomId || r.channelId === roomId);
  if (!room) {
    return { success: false, error: "Комната не найдена" };
  }
  room.totalRequestsToday = 0;
  room.isLocked = false;
  room.lockReason = undefined;
  persistRooms();

  logAudit({
    roomId: room.id,
    username: room.username,
    action: 'QUOTA_RESET',
    method: 'POST',
    path: '/api/admin/rooms/reset',
    ip: 'admin',
    details: 'Счетчик активности сброшен, блокировка снята'
  });

  return { success: true };
}

export function logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
  const item: AuditLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry
  };
  auditLogs.unshift(item);
  // Keep last 300 logs
  if (auditLogs.length > 300) {
    auditLogs.pop();
  }
}

export function getRoomAuditLogs(roomIdOrUsername: string): AuditLogEntry[] {
  const search = roomIdOrUsername.toLowerCase();
  return auditLogs.filter(l => 
    l.roomId.toLowerCase() === search || 
    l.username.toLowerCase() === search ||
    search === 'all' ||
    search === 'bamep'
  );
}

export function getQuotaStats() {
  ensureStorage();
  return {
    date: dailyQuota.date,
    readsToday: dailyQuota.readsToday,
    writesToday: dailyQuota.writesToday,
    maxReads: dailyQuota.maxReads,
    maxWrites: dailyQuota.maxWrites,
    percentReads: Math.min(100, Math.round((dailyQuota.readsToday / dailyQuota.maxReads) * 100)),
    percentWrites: Math.min(100, Math.round((dailyQuota.writesToday / dailyQuota.maxWrites) * 100)),
    totalRooms: rooms.length,
    activeRooms: rooms.filter(r => !r.isLocked).length,
    lockedRooms: rooms.filter(r => r.isLocked).length,
    roomBreakdown: rooms.map(r => ({
      id: r.id,
      username: r.username,
      channelName: r.channelName,
      isLocked: r.isLocked,
      lockReason: r.lockReason,
      totalRequestsToday: r.totalRequestsToday,
      lastActive: r.lastActive
    }))
  };
}

/**
 * Middleware tracker: monitors requests, counts operations, and detects rate-limit abuse
 */
export function trackRoomRequest(
  userIdOrChannel: string,
  method: string,
  path: string,
  ip: string,
  opType: 'read' | 'write' = 'read',
  details?: string
): { isAllowed: boolean; error?: string } {
  ensureStorage();
  

  // Find room by channelId or username
  const cleanId = (userIdOrChannel || '').replace('@matchsimulator.com', '');
  const room = rooms.find(r => r.channelId === cleanId || r.username === cleanId || r.id === cleanId);

  if (!room) {
    return { isAllowed: true };
  }
  if (opType === 'read') dailyQuota.readsToday++;
  if (opType === 'write') dailyQuota.writesToday++;
  room.totalRequestsToday = (room.totalRequestsToday || 0) + 1;
  room.lastActive = new Date().toISOString();

  // If already locked, block request
  if (room.isLocked) {
    return { 
      isAllowed: false, 
      error: `Комната временно заморожена: ${room.lockReason || 'Превышение активности'}` 
    };
  }

  // Sliding window rate limit check (1 minute = 60,000ms)
  const now = Date.now();
  let timestamps = requestWindowMap.get(room.id) || [];
  timestamps = timestamps.filter(t => now - t < 60000);
  timestamps.push(now);
  requestWindowMap.set(room.id, timestamps);

  // If non-superadmin exceeds 90 requests per minute -> AUTO-LOCK ROOM FOR ABUSE
  const RATE_LIMIT_PER_MINUTE = 90;
  if (room.role !== 'superadmin' && timestamps.length > RATE_LIMIT_PER_MINUTE) {
    room.isLocked = true;
    room.lockReason = `Превышен порог активности (${timestamps.length} запр/мин). Комната автоматически заморожена для проверки.`;
    persistRooms();

    logAudit({
      roomId: room.id,
      username: room.username,
      action: 'RATE_LIMIT_ABUSE_LOCKED',
      method,
      path,
      ip,
      isAbuse: true,
      details: `Аномальный спам: зафиксировано ${timestamps.length} запросов за 60 секунд. Комната отправлена на проверку.`
    });

    return {
      isAllowed: false,
      error: 'Обнаружен аномальный расход лимитов. Комната закрыта на проверку администратором.'
    };
  }

  // Normal audit log (sampled or on write/sync)
  if (method === 'POST' || path.includes('sync') || path.includes('matches')) {
    logAudit({
      roomId: room.id,
      username: room.username,
      action: opType === 'write' ? 'DATA_WRITE' : 'DATA_READ',
      method,
      path,
      ip,
      details: details || `Запрос: ${method} ${path}`
    });
  }

  return { isAllowed: true };
}
