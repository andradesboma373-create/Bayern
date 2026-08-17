import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, getDocs, collection, updateDoc, query, where, writeBatch } from '../firebase';
import { Settings as SettingsIcon, Bot, Coins, CheckCircle, AlertTriangle, Save, ShieldAlert, Sliders, UserCheck, Lock, Unlock, Key, Trash2, Plus, Star, Award } from 'lucide-react';
import { DEFAULT_ROLES_CS2, DEFAULT_ROLES_S2, setSimulationRoles } from '../lib/simulation';
import { getAllPlayerPerks, savePlayerPerk, deletePlayerPerk, PlayerPerk } from '../lib/playerPerks';

export default function Settings({ user }: { user: any }) {
  const [botToken, setBotToken] = useState('');
  const [clubBudget, setClubBudget] = useState<number>(1000000);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Custom Roles
  const [customRolesCS2, setCustomRolesCS2] = useState<any[]>(DEFAULT_ROLES_CS2);
  const [customRolesS2, setCustomRolesS2] = useState<any[]>(DEFAULT_ROLES_S2);
  const [activeTab, setActiveTab] = useState<'general' | 'roles' | 'individual'>('general');
  const [activeRoleGame, setActiveRoleGame] = useState<'cs2' | 's2'>('cs2');

  // Bamep Room & Individual Perks State
  const BAMEP_MASTER_PASSWORD = 'bamep2026';
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [isBamepUnlocked, setIsBamepUnlocked] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState('');

  // Individual perk form state
  const [individualPerksList, setIndividualPerksList] = useState<PlayerPerk[]>([]);
  const [editNickname, setEditNickname] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editKillMult, setEditKillMult] = useState('1.00');
  const [editDeathMult, setEditDeathMult] = useState('1.00');
  const [editAssistMult, setEditAssistMult] = useState('1.00');
  const [editSkillMult, setEditSkillMult] = useState('1.00');
  const [editClutchBonus, setEditClutchBonus] = useState('0.00');

  useEffect(() => {
    // Check if user account is naturally bamep/bamepys or previously unlocked
    const userEmail = (user?.email || '').toLowerCase();
    const userName = (user?.displayName || user?.nickname || '').toLowerCase();
    if (userEmail.includes('bamep') || userName.includes('bamep') || localStorage.getItem('bamep_room_unlocked') === 'true') {
      setIsBamepUnlocked(true);
    }

    setIndividualPerksList(getAllPlayerPerks());
  }, [user]);

  const handleUnlockBamepRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput.trim() === BAMEP_MASTER_PASSWORD || adminPasswordInput.trim() === 'bamepys2026') {
      setIsBamepUnlocked(true);
      localStorage.setItem('bamep_room_unlocked', 'true');
      setPasswordError('');
      setAdminPasswordInput('');
    } else {
      setPasswordError('Неверный пароль! Попробуйте: bamep2026');
    }
  };

  const handleSaveIndividualPerk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNickname.trim()) return;

    const perkToSave: PlayerPerk = {
      nickname: editNickname.trim(),
      customTitle: editTitle.trim() || undefined,
      killMultiplier: parseFloat(editKillMult) || 1.0,
      deathMultiplier: parseFloat(editDeathMult) || 1.0,
      assistMultiplier: parseFloat(editAssistMult) || 1.0,
      skillMultiplier: parseFloat(editSkillMult) || 1.0,
      clutchBonus: parseFloat(editClutchBonus) || 0.0
    };

    const updated = savePlayerPerk(perkToSave);
    setIndividualPerksList(updated);

    // Reset form
    setEditNickname('');
    setEditTitle('');
    setEditKillMult('1.00');
    setEditDeathMult('1.00');
    setEditAssistMult('1.00');
    setEditSkillMult('1.00');
    setEditClutchBonus('0.00');

    setStatusMsg({
      type: 'success',
      text: `Индивидуальный рейтинг для игрока ${perkToSave.nickname} успешно сохранен!`
    });
  };

  const handleDeleteIndividualPerk = (nickname: string) => {
    const updated = deletePlayerPerk(nickname);
    setIndividualPerksList(updated);
    setStatusMsg({
      type: 'success',
      text: `Индивидуальный рейтинг для игрока ${nickname} удален.`
    });
  };

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // 1. Try fetching from Express API (uses firebase-admin bypass)
        const response = await fetch(`/api/settings/${user.uid}`);
        if (response.ok) {
          const data = await response.json();
          setBotToken(data.botToken || '');
          if (data.clubBudget !== undefined) setClubBudget(Number(data.clubBudget));
          else if (data.money !== undefined) setClubBudget(Number(data.money));
          
          const cleanRoles = (r: any[]) => {
            if (!Array.isArray(r)) return [];
            const banned = ['captain_sniper', 'captain_frag', 'captain_support', 'krabeni_frag', 'krabeni_individual', 'krabeni', 'igl_support', 'igl_frag', 'igl_sniper'];
            return r.filter(role => !banned.includes(role.id));
          };

          if (data.customRolesCS2) setCustomRolesCS2(cleanRoles(data.customRolesCS2));
          if (data.customRolesS2) setCustomRolesS2(cleanRoles(data.customRolesS2));
          setLoading(false);
          return;
        }

        // 2. Fallback to direct client-side firestore if API not available
        const docRef = doc(db, 'settings', user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setBotToken(data.botToken || '');
          if (data.clubBudget !== undefined) setClubBudget(Number(data.clubBudget));
          else if (data.money !== undefined) setClubBudget(Number(data.money));
          
          const cleanRoles = (r: any[]) => {
            if (!Array.isArray(r)) return [];
            const banned = ['captain_sniper', 'captain_frag', 'captain_support', 'krabeni_frag', 'krabeni_individual', 'krabeni', 'igl_support', 'igl_frag', 'igl_sniper'];
            return r.filter(role => !banned.includes(role.id));
          };
          if (data.customRolesCS2) setCustomRolesCS2(cleanRoles(data.customRolesCS2));
          if (data.customRolesS2) setCustomRolesS2(cleanRoles(data.customRolesS2));
        } else {
          throw new Error("No settings doc");
        }
      } catch (err: any) {
        console.warn("Failed to load settings from DB/API, trying localStorage:", err);
        const local = localStorage.getItem(`settings_${user.uid}`);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            setBotToken(parsed.botToken || '');
            if (parsed.clubBudget !== undefined) setClubBudget(Number(parsed.clubBudget));
            else if (parsed.money !== undefined) setClubBudget(Number(parsed.money));
            
            const cleanRoles = (r: any[]) => {
              if (!Array.isArray(r)) return [];
              const banned = ['captain_sniper', 'captain_frag', 'captain_support', 'krabeni_frag', 'krabeni_individual', 'krabeni', 'igl_support', 'igl_frag', 'igl_sniper'];
              return r.filter(role => !banned.includes(role.id));
            };
            if (parsed.customRolesCS2) setCustomRolesCS2(cleanRoles(parsed.customRolesCS2));
            if (parsed.customRolesS2) setCustomRolesS2(cleanRoles(parsed.customRolesS2));
          } catch (e) {
            console.error("Failed to parse local settings:", e);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [user]);

  // Synchronize with global simulation right after loading
  useEffect(() => {
      setSimulationRoles(activeRoleGame === 'cs2' ? customRolesCS2 : customRolesS2);
  }, [customRolesCS2, customRolesS2, activeRoleGame]);


  const handleSave = async (e: any) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      // Send directly to Express backend API which writes to Firestore via adminDb and runs the bot
      const response = await fetch('/api/settings/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.uid,
          botToken: botToken.trim(),
          clubBudget,
          money: clubBudget,
          customRolesCS2,
          customRolesS2
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Не удалось запустить бота на сервере");
      }

      // Save locally to ensure sync doesn't overwrite it
      localStorage.setItem(`settings_${user.uid}`, JSON.stringify({
        botToken: botToken.trim(),
        clubBudget,
        money: clubBudget,
        customRolesCS2,
        customRolesS2
      }));

      setStatusMsg({
        type: 'success',
        text: 'Настройки успешно сохранены! Бот автоматически запущен на сервере и готов отвечать в Telegram.'
      });
    } catch (err: any) {
      console.warn("Error saving settings via API, saving locally as backup:", err);
      localStorage.setItem(`settings_${user.uid}`, JSON.stringify({
        botToken: botToken.trim(),
        
        customRolesCS2,
        customRolesS2
      }));

      setStatusMsg({
        type: 'error',
        text: `Ошибка при запуске бота на сервере: ${err.message || err}`
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto bg-[#12121a] border border-white/5 rounded-2xl p-8 text-center mt-12">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-wider mb-2">Доступ ограничен</h2>
        <p className="text-white/50 text-sm mb-6 max-w-md mx-auto">
          Для управления настройками, подключения Telegram-бота и изменения бюджетов команд необходимо выполнить вход по вашему каналу.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-600/10 text-blue-500 rounded-xl">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-widest">НАСТРОЙКИ КАНАЛА</h2>
          <p className="text-white/40 text-sm font-semibold uppercase">Управление Telegram-ботом и бюджетом клуба</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6 border-b border-white/10 pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0 ${activeTab === 'general' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-white/50 hover:bg-white/5'}`}
        >
          <SettingsIcon className="w-4 h-4" />
          Основные настройки
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0 ${activeTab === 'roles' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-white/50 hover:bg-white/5'}`}
        >
          <Sliders className="w-4 h-4" />
          Коэффициенты Ролей
        </button>
        <button
          onClick={() => setActiveTab('individual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0 ${activeTab === 'individual' ? 'bg-[#ff8f00]/20 text-[#ff8f00] border border-[#ff8f00]/40' : 'text-white/50 hover:bg-white/5'}`}
        >
          <UserCheck className="w-4 h-4" />
          Индивидуальные Рейты {isBamepUnlocked ? '👑' : '🔒'}
        </button>
      </div>

      {loading ? (
        <div className="bg-[#12121a] border border-white/5 rounded-2xl p-12 text-center text-white/50">
          Загрузка ваших настроек...
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {(activeTab === 'general' || activeTab === 'roles') && (
            <form onSubmit={handleSave} className="flex flex-col gap-6">
              {activeTab === 'general' && (
                <>
                  {/* Telegram Bot Setup */}
          <div className="bg-[#12121a] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-2xl rounded-full pointer-events-none"></div>
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Telegram Бот</h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  Подключите своего собственного бота для канала. Вставьте токен, полученный у <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">@BotFather</a>. Бот будет автоматически запущен и настроен под ваш канал!
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Токен Бота</label>
              <input 
                type="text" 
                value={botToken} 
                onChange={e => setBotToken(e.target.value)} 
                placeholder="1234567890:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
              />
            </div>
          </div>
          <div className="bg-[#12121a] border border-white/5 rounded-2xl p-6 relative overflow-hidden mt-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-2xl rounded-full pointer-events-none"></div>
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2.5 bg-yellow-500/10 text-yellow-500 rounded-lg">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Стартовый Бюджет Команд</h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  Укажите стартовую сумму денег для команд вашего канала в симуляциях и Telegram-боте.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Бюджет Бот-Клуба</label>
                <span className="text-sm font-mono font-black text-yellow-400">${clubBudget.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="100000"
                max="10000000"
                step="50000"
                value={clubBudget}
                onChange={(e) => setClubBudget(Number(e.target.value))}
                className="w-full h-2 bg-black/60 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
              <div className="flex justify-between text-[10px] text-white/30 font-mono font-bold">
                <span>$100,000</span>
                <span>$5,000,000</span>
                <span>$10,000,000</span>
              </div>
            </div>
          </div>
            </>
          )}

          {activeTab === 'roles' && (
            <div className="bg-[#12121a] border border-white/5 rounded-2xl p-6">
              <div className="flex gap-4 mb-6 border-b border-white/5 pb-4">
                <button
                  type="button"
                  onClick={() => setActiveRoleGame('cs2')}
                  className={`px-4 py-2 font-black uppercase text-sm rounded-lg transition-colors ${activeRoleGame === 'cs2' ? 'bg-orange-500 text-white' : 'text-white/40 hover:bg-white/5'}`}
                >
                  CS2
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRoleGame('s2')}
                  className={`px-4 py-2 font-black uppercase text-sm rounded-lg transition-colors ${activeRoleGame === 's2' ? 'bg-blue-500 text-white' : 'text-white/40 hover:bg-white/5'}`}
                >
                  Standoff 2
                </button>
              </div>

              <div className="space-y-6">
                {(activeRoleGame === 'cs2' ? customRolesCS2 : customRolesS2).map((role, idx) => (
                  <div key={role.id} className="bg-black/40 border border-white/5 rounded-xl p-4">
                    <div className="font-bold text-white mb-4 text-lg">{role.name} <span className="text-white/30 text-xs ml-2 uppercase">({role.id})</span></div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-white/50 uppercase font-bold">Kills (KD)</label>
                        <input
                          type="number"
                          step="0.05"
                          value={role.killMultiplier || 1.0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 1.0;
                            const setter = activeRoleGame === 'cs2' ? setCustomRolesCS2 : setCustomRolesS2;
                            setter(prev => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], killMultiplier: val };
                              return next;
                            });
                          }}
                          className="bg-[#12121a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-white/50 uppercase font-bold">Deaths</label>
                        <input
                          type="number"
                          step="0.05"
                          value={role.deathMultiplier || 1.0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 1.0;
                            const setter = activeRoleGame === 'cs2' ? setCustomRolesCS2 : setCustomRolesS2;
                            setter(prev => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], deathMultiplier: val };
                              return next;
                            });
                          }}
                          className="bg-[#12121a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-white/50 uppercase font-bold">Assists</label>
                        <input
                          type="number"
                          step="0.05"
                          value={role.assistMultiplier || 1.0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 1.0;
                            const setter = activeRoleGame === 'cs2' ? setCustomRolesCS2 : setCustomRolesS2;
                            setter(prev => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], assistMultiplier: val };
                              return next;
                            });
                          }}
                          className="bg-[#12121a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-white/50 uppercase font-bold">Team Buff</label>
                        <input
                          type="number"
                          step="0.05"
                          value={role.skillMultiplier || 1.0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 1.0;
                            const setter = activeRoleGame === 'cs2' ? setCustomRolesCS2 : setCustomRolesS2;
                            setter(prev => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], skillMultiplier: val };
                              return next;
                            });
                          }}
                          className="bg-[#12121a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={saving}
            className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-lg tracking-widest rounded-xl shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-5 h-5" />
            {saving ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ НАСТРОЙКИ'}
          </button>
        </form>
      )}

      {activeTab === 'individual' && (
        <div className="bg-[#12121a] border border-white/5 rounded-2xl p-6 space-y-6">
              {!isBamepUnlocked ? (
                /* LOCKED BAMEP ROOM VIEW */
                <div className="bg-black/50 border border-amber-500/30 rounded-2xl p-8 text-center space-y-5 relative overflow-hidden">
                  <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/30">
                    <Lock className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-wider mb-1">
                      👑 Комната bamep (Главная база)
                    </h3>
                    <p className="text-xs text-white/50 max-w-md mx-auto">
                      Индивидуальные коэффициенты игроков доступны только для администратора главной базы (bamepys).
                    </p>
                  </div>

                  <form onSubmit={handleUnlockBamepRoom} className="max-w-sm mx-auto space-y-3">
                    <div className="flex flex-col gap-1 text-left">
                      <label className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                        <Key className="w-3 h-3" /> Пароль доступа bamep
                      </label>
                      <input
                        type="password"
                        value={adminPasswordInput}
                        onChange={(e) => setAdminPasswordInput(e.target.value)}
                        placeholder="Введите пароль..."
                        className="w-full bg-black border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-400 focus:outline-none font-mono"
                      />
                    </div>

                    {passwordError && (
                      <p className="text-xs text-red-400 font-bold bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                        {passwordError}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black uppercase text-sm py-3 rounded-xl tracking-wider transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
                    >
                      <Unlock className="w-4 h-4" /> Разблокировать доступ
                    </button>

                    <p className="text-[11px] text-amber-400/80 font-mono font-bold mt-2">
                      💡 Мастер-пароль: <span className="bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">bamep2026</span>
                    </p>
                  </form>
                </div>
              ) : (
                /* UNLOCKED BAMEP ROOM VIEW */
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/30">
                        <Award className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                          👑 Комната bamep: Индивидуальные Рейты
                        </h3>
                        <p className="text-xs text-white/40">
                          Индивидуальные коэффициенты складываются и перемножаются с ролевыми коэффициентами во всех симуляциях.
                        </p>
                      </div>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Unlock className="w-3 h-3" /> Разблокировано
                    </span>
                  </div>

                  {/* FORM TO ADD OR EDIT PLAYER PERK */}
                  <form onSubmit={handleSaveIndividualPerk} className="bg-black/40 border border-white/10 rounded-2xl p-5 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Добавить / Изменить индивидуальный рейтинг игрока
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">
                          Никнейм игрока <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={editNickname}
                          onChange={(e) => setEditNickname(e.target.value)}
                          placeholder="Например: s1mple, donk, bamep..."
                          className="w-full bg-[#12121a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-amber-400 focus:outline-none font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">
                          Уникальное звание / Титул (опционально)
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Например: Godlike, Clutch King..."
                          className="w-full bg-[#12121a] border border-white/15 rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-emerald-400 uppercase block mb-1">Коэф. Убийств (KD)</label>
                        <input
                          type="number"
                          step="0.05"
                          value={editKillMult}
                          onChange={(e) => setEditKillMult(e.target.value)}
                          className="w-full bg-[#12121a] border border-white/10 rounded-xl px-2.5 py-2 text-white text-xs text-center font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-red-400 uppercase block mb-1">Коэф. Смертей</label>
                        <input
                          type="number"
                          step="0.05"
                          value={editDeathMult}
                          onChange={(e) => setEditDeathMult(e.target.value)}
                          className="w-full bg-[#12121a] border border-white/10 rounded-xl px-2.5 py-2 text-white text-xs text-center font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-cyan-400 uppercase block mb-1">Коэф. Ассистов</label>
                        <input
                          type="number"
                          step="0.05"
                          value={editAssistMult}
                          onChange={(e) => setEditAssistMult(e.target.value)}
                          className="w-full bg-[#12121a] border border-white/10 rounded-xl px-2.5 py-2 text-white text-xs text-center font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-amber-400 uppercase block mb-1">Буст Скилла</label>
                        <input
                          type="number"
                          step="0.05"
                          value={editSkillMult}
                          onChange={(e) => setEditSkillMult(e.target.value)}
                          className="w-full bg-[#12121a] border border-white/10 rounded-xl px-2.5 py-2 text-white text-xs text-center font-mono"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[9px] font-bold text-purple-400 uppercase block mb-1">Бонус Клатчей</label>
                        <input
                          type="number"
                          step="0.05"
                          value={editClutchBonus}
                          onChange={(e) => setEditClutchBonus(e.target.value)}
                          className="w-full bg-[#12121a] border border-white/10 rounded-xl px-2.5 py-2 text-white text-xs text-center font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs py-2.5 rounded-xl tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
                    >
                      <Save className="w-4 h-4" /> Сохранить индивидуальный рейтинг игрока
                    </button>
                  </form>

                  {/* SAVED INDIVIDUAL RATES LIST */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-white/50 flex items-center justify-between">
                      <span>Сохраненные индивидуальные рейты ({individualPerksList.length})</span>
                      <span className="text-[10px] text-amber-400">Складываются с ролевой статой</span>
                    </h4>

                    {individualPerksList.length === 0 ? (
                      <div className="bg-black/30 border border-white/5 rounded-xl p-6 text-center text-white/40 text-xs">
                        Индивидуальные рейтинги пока не добавлены. Добавьте первого игрока выше!
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {individualPerksList.map((p) => (
                          <div key={p.nickname} className="bg-black/50 border border-white/10 rounded-xl p-3.5 space-y-2 hover:border-amber-500/40 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-white text-sm font-mono">{p.nickname}</span>
                                {p.customTitle && (
                                  <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                    {p.customTitle}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditNickname(p.nickname);
                                    setEditTitle(p.customTitle || '');
                                    setEditKillMult(String(p.killMultiplier ?? 1.0));
                                    setEditDeathMult(String(p.deathMultiplier ?? 1.0));
                                    setEditAssistMult(String(p.assistMultiplier ?? 1.0));
                                    setEditSkillMult(String(p.skillMultiplier ?? 1.0));
                                    setEditClutchBonus(String(p.clutchBonus ?? 0.0));
                                  }}
                                  className="text-xs text-blue-400 hover:text-blue-300 font-bold px-2 py-1 rounded bg-blue-500/10 cursor-pointer"
                                >
                                  Изм.
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteIndividualPerk(p.nickname)}
                                  className="text-xs text-red-400 hover:text-red-300 p-1 rounded bg-red-500/10 cursor-pointer"
                                  title="Удалить"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-5 gap-1 text-center bg-black/40 p-2 rounded-lg text-[10px] font-mono border border-white/5">
                              <div>
                                <span className="text-white/40 block text-[8px] uppercase">Kills</span>
                                <span className="font-bold text-emerald-400">x{p.killMultiplier || 1.0}</span>
                              </div>
                              <div>
                                <span className="text-white/40 block text-[8px] uppercase">Deaths</span>
                                <span className="font-bold text-red-400">x{p.deathMultiplier || 1.0}</span>
                              </div>
                              <div>
                                <span className="text-white/40 block text-[8px] uppercase">Assists</span>
                                <span className="font-bold text-cyan-400">x{p.assistMultiplier || 1.0}</span>
                              </div>
                              <div>
                                <span className="text-white/40 block text-[8px] uppercase">Skill</span>
                                <span className="font-bold text-amber-400">x{p.skillMultiplier || 1.0}</span>
                              </div>
                              <div>
                                <span className="text-white/40 block text-[8px] uppercase">Clutch</span>
                                <span className="font-bold text-purple-400">+{p.clutchBonus || 0.0}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {statusMsg && (
            <div className={`p-4 rounded-xl border flex gap-3 items-center ${
              statusMsg.type === 'success' 
                ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {statusMsg.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
              <span className="text-sm font-semibold">{statusMsg.text}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
