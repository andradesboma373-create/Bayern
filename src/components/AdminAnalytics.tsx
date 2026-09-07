import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Users, 
  Lock, 
  Unlock, 
  RefreshCw, 
  Plus, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Database,
  Copy,
  Check,
  Clock,
  Search
} from 'lucide-react';

interface RoomData {
  id: string;
  username: string;
  channelName: string;
  role: 'superadmin' | 'admin' | 'user';
  createdAt: string;
  isLocked: boolean;
  lockReason?: string;
  totalRequestsToday: number;
  lastActive: string;
}

interface QuotaStats {
  date: string;
  readsToday: number;
  writesToday: number;
  maxReads: number;
  maxWrites: number;
  percentReads: number;
  percentWrites: number;
  totalRooms: number;
  activeRooms: number;
  lockedRooms: number;
}

interface AuditLog {
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

interface AdminAnalyticsProps {
  user: any;
}

export default function AdminAnalytics({ user }: AdminAnalyticsProps) {
  const [stats, setStats] = useState<QuotaStats | null>(null);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create Room modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createSuccessData, setCreateSuccessData] = useState<any>(null);

  // Audit Log modal
  const [selectedRoomForLog, setSelectedRoomForLog] = useState<RoomData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [filterAbuseOnly, setFilterAbuseOnly] = useState(false);

  // Action status
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isSuperAdmin = user?.name === 'bamep' || user?.role === 'superadmin';

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, roomsRes] = await Promise.all([
        fetch('/api/admin/quota-stats'),
        fetch('/api/admin/rooms')
      ]);

      if (!statsRes.ok || !roomsRes.ok) {
        throw new Error('Ошибка при загрузке аналитики серверов');
      }

      const statsData = await statsRes.json();
      const roomsData = await roomsRes.json();

      setStats(statsData);
      setRooms(roomsData.rooms || []);
    } catch (e: any) {
      setError(e.message || 'Не удалось получить данные');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // 15s auto-refresh for admin
    return () => clearInterval(interval);
  }, []);

  const handleToggleLock = async (room: RoomData) => {
    try {
      const willLock = !room.isLocked;
      const reason = willLock 
        ? prompt('Укажите причину блокировки комнаты:', 'Блокировка администратором на проверку') 
        : undefined;

      if (willLock && reason === null) return; // User cancelled

      const res = await fetch('/api/admin/rooms/toggle-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          lock: willLock,
          reason: reason || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка изменения статуса');

      setActionFeedback(willLock ? `Комната ${room.username} заблокирована!` : `Доступ для ${room.username} восстановлен!`);
      setTimeout(() => setActionFeedback(null), 4000);
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleResetQuota = async (room: RoomData) => {
    if (!confirm(`Сбросить счетчик активности и разблокировать комнату "${room.username}"?`)) return;
    try {
      const res = await fetch('/api/admin/rooms/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка сброса');

      setActionFeedback(`Счетчик для ${room.username} сброшен, комната разблокирована.`);
      setTimeout(() => setActionFeedback(null), 4000);
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const openAuditLogs = async (room: RoomData) => {
    setSelectedRoomForLog(room);
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/admin/rooms/${room.id}/audit-logs`);
      const data = await res.json();
      setAuditLogs(data.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;

    try {
      setCreateLoading(true);
      const res = await fetch('/api/admin/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim().toLowerCase(),
          password: newPassword.trim(),
          channelName: newChannelName.trim() || newUsername.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Не удалось создать комнату');

      setCreateSuccessData({
        username: newUsername.trim().toLowerCase(),
        password: newPassword.trim(),
        channelName: newChannelName.trim() || newUsername.trim()
      });
      setNewUsername('');
      setNewPassword('');
      setNewChannelName('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const copyCredentials = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff8f00]/20 border border-[#ff8f00]/40 flex items-center justify-center text-[#ff8f00]">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-wider">
                Аналитика & Управление Комнатами
              </h1>
              <p className="text-xs text-white/50">
                Мониторинг квот Firebase (50 000 чтений/день), защита от абуза и аудит активности
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <button
              onClick={() => { setShowCreateModal(true); setCreateSuccessData(null); }}
              className="px-4 py-2.5 bg-[#ff8f00] hover:bg-[#ffa733] text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,143,0,0.3)] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Создать комнату
            </button>
          )}
        </div>
      </div>

      {loading && !stats && (
        <div className="flex flex-col items-center justify-center p-12 text-[#ff8f00]">
          <RefreshCw className="w-8 h-8 animate-spin mb-4" />
          <p className="text-white/50 text-sm font-bold uppercase">Загрузка данных...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {actionFeedback && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5" />
          {actionFeedback}
        </div>
      )}

      {/* Quota Gauges Section */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Reads Card */}
          <div className="bg-[#161726] border border-white/10 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-black text-white/60 uppercase tracking-wider">Чтения (Reads)</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold">
                Лимит: 50k / день
              </span>
            </div>

            <div className="my-2">
              <div className="flex flex-col mb-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-white font-mono">
                    {stats.readsToday.toLocaleString()}
                  </span>
                  <span className="text-sm text-white/60 font-mono">
                    ({stats.percentReads}%)
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-white/40">Использовано</span>
                  <span className="text-xs font-bold text-emerald-400">Осталось: {(stats.maxReads - stats.readsToday).toLocaleString()}</span>
                </div>
              </div>
              <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div 
                  className={`h-full transition-all duration-500 ${
                    stats.percentReads > 90 ? 'bg-red-500' : stats.percentReads > 70 ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.max(2, stats.percentReads)}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-white/40 mt-2">
              Операции чтения из Firebase (Spark Plan: 50,000 в сутки). Сбрасывается каждые 24ч.
            </p>
          </div>

          {/* Writes Card */}
          <div className="bg-[#161726] border border-white/10 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                <span className="text-xs font-black text-white/60 uppercase tracking-wider">Записи (Writes)</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold">
                Лимит: 20k / день
              </span>
            </div>

            <div className="my-2">
              <div className="flex flex-col mb-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-white font-mono">
                    {stats.writesToday.toLocaleString()}
                  </span>
                  <span className="text-sm text-white/60 font-mono">
                    ({stats.percentWrites}%)
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-white/40">Использовано</span>
                  <span className="text-xs font-bold text-emerald-400">Осталось: {(stats.maxWrites - stats.writesToday).toLocaleString()}</span>
                </div>
              </div>
              <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div 
                  className={`h-full transition-all duration-500 ${
                    stats.percentWrites > 90 ? 'bg-red-500' : stats.percentWrites > 70 ? 'bg-amber-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${Math.max(2, stats.percentWrites)}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-white/40 mt-2">
              Операции сохранения команд, трансферов и результатов турниров.
            </p>
          </div>

          {/* Abuse Shield Status */}
          <div className="bg-[#161726] border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-black text-white/60 uppercase tracking-wider">Защита от абуза</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                ВКЛЮЧЕНА
              </span>
            </div>

            <div className="space-y-1.5 my-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">Всего комнат:</span>
                <span className="text-white font-bold">{stats.totalRooms}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">Активные:</span>
                <span className="text-emerald-400 font-bold">{stats.activeRooms}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">Заблокировано (на проверке):</span>
                <span className={stats.lockedRooms > 0 ? 'text-red-400 font-bold' : 'text-white/40'}>
                  {stats.lockedRooms}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-white/40 mt-1">
              Автоматический лок при превышении 90 запросов/мин любой комнатой.
            </p>
          </div>
        </div>
      )}

      {isSuperAdmin && ( <>
      {/* Rooms Table */}
      <div className="bg-[#161726] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[#ff8f00]" />
            <h3 className="font-black text-white text-base uppercase tracking-wider">
              Все комнаты сервера ({rooms.length})
            </h3>
          </div>
          <span className="text-xs text-white/40">
            Данные хранятся только на защищенном сервере и скрыты от внешних посетителей
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-black/20 text-[11px] uppercase tracking-wider text-white/50">
                <th className="py-3 px-4 font-bold">Комната / Канал</th>
                <th className="py-3 px-4 font-bold">Логин</th>
                <th className="py-3 px-4 font-bold">Роль</th>
                <th className="py-3 px-4 font-bold">Статус</th>
                <th className="py-3 px-4 font-bold">Запросов сегодня</th>
                <th className="py-3 px-4 font-bold">Последняя активность</th>
                <th className="py-3 px-4 font-bold text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {rooms.map((room) => {
                const isMaster = room.username === 'bamep';
                return (
                  <tr key={room.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white flex items-center gap-2">
                        {room.channelName}
                        {isMaster && (
                          <span className="px-1.5 py-0.5 bg-[#ff8f00]/20 text-[#ff8f00] text-[10px] rounded font-black">
                            MASTER
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/40 font-mono">
                        id: {room.id}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-white/80">
                      {room.username}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
                        room.role === 'superadmin' ? 'bg-[#ff8f00]/20 text-[#ff8f00]' :
                        room.role === 'admin' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/60'
                      }`}>
                        {room.role}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {room.isLocked ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 w-fit">
                            <Lock className="w-3 h-3" /> Заблокирована
                          </span>
                          {room.lockReason && (
                            <span className="text-[11px] text-red-300/80 line-clamp-1" title={room.lockReason}>
                              {room.lockReason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Активна
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-white/80">
                      {room.totalRequestsToday || 0}
                    </td>

                    <td className="py-3 px-4 text-xs text-white/50">
                      {new Date(room.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Audit Logs button */}
                        <button
                          onClick={() => openAuditLogs(room)}
                          className="p-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Журнал действий / Аудит"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        {/* Reset Quota */}
                        <button
                          onClick={() => handleResetQuota(room)}
                          className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors cursor-pointer"
                          title="Сбросить счетчик активности"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>

                        {/* Lock / Unlock Toggle */}
                        {!isMaster && (
                          <button
                            onClick={() => handleToggleLock(room)}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              room.isLocked 
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400' 
                                : 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                            }`}
                            title={room.isLocked ? 'Разблокировать (вернуть доступ)' : 'Заблокировать на проверку'}
                          >
                            {room.isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Room */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161726] border border-white/15 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#ff8f00]" />
              Создание новой комнаты
            </h3>
            <p className="text-xs text-white/50 mb-4">
              Создайте изолированную комнату для нового пользователя. Данные доступа можно сразу скопировать.
            </p>

            {createSuccessData ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4">
                <div className="text-emerald-400 font-bold text-sm mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Комната успешно создана!
                </div>
                <div className="bg-black/40 p-3 rounded-lg font-mono text-xs text-white/90 space-y-1 select-all">
                  <div><strong>Логин:</strong> {createSuccessData.username}</div>
                  <div><strong>Пароль:</strong> {createSuccessData.password}</div>
                  <div><strong>Канал:</strong> {createSuccessData.channelName}</div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => copyCredentials(
                      `Match Simulator Доступ:\nЛогин: ${createSuccessData.username}\nПароль: ${createSuccessData.password}`,
                      'created'
                    )}
                    className="flex-1 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copiedId === 'created' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedId === 'created' ? 'Скопировано!' : 'Скопировать для отправки'}
                  </button>
                  <button
                    onClick={() => { setShowCreateModal(false); setCreateSuccessData(null); }}
                    className="py-2 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-1">
                    Название комнаты / Канала
                  </label>
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="Например: Virtus Pro Club"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#ff8f00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/60 mb-1">
                    Логин комнаты (уникальный) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="Например: vp_manager"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm outline-none focus:border-[#ff8f00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/60 mb-1">
                    Пароль комнаты *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Например: vp2026pass"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm outline-none focus:border-[#ff8f00]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="px-5 py-2.5 bg-[#ff8f00] hover:bg-[#ffa733] text-black rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {createLoading ? 'Создание...' : 'Создать комнату'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Audit Logs */}
      {selectedRoomForLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161726] border border-white/15 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#ff8f00]" />
                  Журнал аудита: {selectedRoomForLog.channelName} ({selectedRoomForLog.username})
                </h3>
                <p className="text-xs text-white/50">
                  История выполненных запросов, изменений данных и событий безопасности
                </p>
              </div>
              <button
                onClick={() => setSelectedRoomForLog(null)}
                className="text-white/40 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Sub-bar with quick unblock action */}
            <div className="px-5 py-2.5 bg-black/40 border-b border-white/5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-white/70">
                  <input
                    type="checkbox"
                    checked={filterAbuseOnly}
                    onChange={(e) => setFilterAbuseOnly(e.target.checked)}
                    className="accent-[#ff8f00]"
                  />
                  <span>Показать только подозрительные (Абуз / Блокировки)</span>
                </label>
              </div>

              {selectedRoomForLog.isLocked && (
                <button
                  onClick={async () => {
                    await handleToggleLock(selectedRoomForLog);
                    setSelectedRoomForLog(prev => prev ? { ...prev, isLocked: false } : null);
                  }}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-[11px] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Вернуть доступ прямо сейчас
                </button>
              )}
            </div>

            {/* Logs List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
              {logsLoading ? (
                <div className="p-8 text-center text-white/40">Загрузка журнала аудита...</div>
              ) : auditLogs.length === 0 ? (
                <div className="p-8 text-center text-white/40">
                  Журнал действий пуст для данной комнаты.
                </div>
              ) : (
                auditLogs
                  .filter(log => filterAbuseOnly ? log.isAbuse : true)
                  .map((log) => (
                    <div 
                      key={log.id} 
                      className={`p-3 rounded-xl border flex flex-col gap-1 ${
                        log.isAbuse 
                          ? 'bg-red-500/10 border-red-500/30 text-red-200' 
                          : 'bg-black/30 border-white/5 text-white/80'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded font-bold ${
                            log.isAbuse ? 'bg-red-500 text-black' : 'bg-white/10 text-white/70'
                          }`}>
                            {log.action}
                          </span>
                          <span className="text-white/40">{log.method} {log.path}</span>
                        </span>
                        <span className="text-white/40">
                          {new Date(log.timestamp).toLocaleTimeString()} ({new Date(log.timestamp).toLocaleDateString()})
                        </span>
                      </div>
                      {log.details && (
                        <div className="text-xs text-white/90 pl-1 font-sans">
                          {log.details}
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
