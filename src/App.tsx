import { loadTournaments, compactTournamentForStorage, cleanupTournamentStorageQuota, getCanonicalRoomId } from './components/setka_tourn/storage';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { MoreVertical, X, Gamepad2, Users, Trophy, BarChart2, Calendar, User, Newspaper, Database, Settings, Layout, LogOut, ChevronDown, Check, Zap, RefreshCw, Sparkles, Eye, EyeOff, Activity, Folder, Flame, Image } from 'lucide-react';
import { auth, logout, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from './firebase';
import { collection, query, where, getDocs, onSnapshot } from './firebase';
import { saveMatchesToLocalStorage } from './lib/utils';
import { filterItemsForRoom } from './lib/roomIsolation';
import { useGameUniverse } from './lib/gameUniverse';
import So2MediaLibraryModal from './components/So2MediaLibraryModal';
import { RATING_CONFIG } from './match-logic/config/RatingConfig';

import TournamentBracket from './components/setka_tourn/TournamentBracket';
import Simulator from './components/Simulator';
import Statistics from './components/Statistics';
import Matches from './components/Matches';
import Teams from './components/Teams';
import Players from './components/Players';
import News from './components/News';
import SettingsComponent from './components/Settings';
import MapCenter from './components/MapCenter';
import Transfers from './components/Transfers';
import TournamentsBeta from './components/TournamentsBeta';
import AdminAnalytics from './components/AdminAnalytics';
import ChannelLogin from './components/ChannelLogin';
import AccessDenied from './components/AccessDenied';

function NavPanel({ user, onLogout, onShowLogin, onOpenMedia }: { user: any, onLogout: () => void, onShowLogin: () => void, onOpenMedia: () => void }) {
  const location = useLocation();
  const [game, setGame] = useGameUniverse();
  
  const isBamepAdmin = 
    (user?.name || user?.username || user?.displayName || '').toLowerCase() === 'bamep' ||
    user?.role === 'superadmin' ||
    (user?.channelName || '').toLowerCase().includes('bamep');

  const navItems = [
    { icon: Gamepad2, label: 'Симулятор', path: '/', color: 'text-blue-400' },
    { icon: BarChart2, label: 'Статистика', path: '/stats', color: 'text-emerald-400' },
    { icon: Calendar, label: 'Матчи', path: '/matches', color: 'text-amber-400' },
    { icon: Trophy, label: 'Турниры', path: '/tournaments', color: 'text-purple-400' },
    { icon: Sparkles, label: 'Турниры Бета', path: '/tournaments-beta', color: 'text-orange-400' },
  ];

  const adminItems = isBamepAdmin ? [
    { icon: Database, label: 'Карты', path: '/map-center' },
    { icon: Activity, label: 'Аналитика', path: '/analytics' },
  ] : [];

  const secondaryItems = [
    { icon: Users, label: 'Команды', path: '/teams' },
    { icon: User, label: 'Игроки', path: '/players' },
    { icon: Settings, label: 'Настройки', path: '/settings' },
  ];

  return (
    <div className="w-64 h-screen bg-[#0a0a0f] border-r border-white/5 flex flex-col py-6 z-50 shrink-0">
      {/* Logo */}
      <div className="px-6 mb-10 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13h-13L12 6.5z"/>
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-black uppercase tracking-tighter leading-none">Match</span>
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest leading-none">Simulator</span>
        </div>
      </div>

      {/* Main Nav */}
      <div className="flex-1 flex flex-col gap-1 w-full px-3 overflow-y-auto custom-scrollbar no-scrollbar">
        <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] px-4 mb-2">Основное</div>
        {navItems.map((item, idx) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={idx} 
              to={item.path} 
              className={`group flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-600/10 text-white shadow-[inset_0_0_20px_rgba(37,99,235,0.05)]' 
                  : 'text-white/40 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? item.color : ''}`} />
              <span className={`text-[13px] font-bold uppercase tracking-wide ${isActive ? 'text-white' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              )}
            </Link>
          );
        })}

        <div className="my-6 border-t border-white/5 mx-4" />

        {/* Secondary Nav */}
        <div className="flex flex-col gap-1">
          <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] px-4 mb-2">Управление</div>
          {( [...secondaryItems, ...adminItems] as any[]).map((item, idx) => {
            const isActive = item.path ? location.pathname === item.path : false;
            const content = (
              <>
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="text-[13px] font-bold uppercase tracking-wide">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/20" />
                )}
              </>
            );

            const className = `group flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all duration-200 ${
              isActive 
                ? 'bg-white/5 text-white' 
                : 'text-white/30 hover:text-white hover:bg-white/5'
            }`;

            if (item.path) {
              return (
                <Link key={idx} to={item.path} className={className}>
                  {content}
                </Link>
              );
            }

            return (
              <button key={idx} onClick={item.onClick} className={className}>
                {content}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-auto flex flex-col gap-4 pt-6 px-4">
        {/* Game Selector */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5">
          <button 
            onClick={() => setGame('cs2')} 
            className={`py-2 rounded-xl text-[10px] font-black transition-all ${game === 'cs2' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-white/20 hover:text-white'}`}
          >
            CS2
          </button>
          <button 
            onClick={() => setGame('so2')} 
            className={`py-2 rounded-xl text-[10px] font-black transition-all ${game === 'so2' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-white/20 hover:text-white'}`}
          >
            SO2
          </button>
        </div>

        {/* User Profile */}
        {user ? (
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 group relative">
            <div className="w-10 h-10 rounded-xl border border-white/10 overflow-hidden shrink-0">
              <img src={user.photoURL || `/api/avatar/${encodeURIComponent(user.displayName || user.name || "?")}`} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black text-white truncate uppercase tracking-tight">{user.displayName || user.name}</div>
              <div className="text-[9px] text-blue-400 font-bold uppercase tracking-widest">{user.role || 'Player'}</div>
            </div>
            
            <button 
              onClick={onLogout}
              className="p-2 text-white/20 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
              title="Выйти"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button 
            onClick={onShowLogin}
            className="w-full flex items-center gap-3 p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all shadow-lg shadow-blue-600/20"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest">Войти</span>
          </button>
        )}
      </div>
    </div>
  );
}



const CHANNELS = [
  { username: 'simu', password: 'si0607', channelId: 'channel_simu', channelName: 'simu' },
  { username: 'bamep', password: 'bamepys06', channelId: 'channel_bamep_cs2', channelName: 'bamep cs2' },
  { username: 'zeixst', password: 'ze0707', channelId: 'channel_bamep_cs2', channelName: 'bamep cs2' },
  { username: 'airy', password: '212121', channelId: 'channel_airy', channelName: 'бомбардиро крокодило' }
];

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSo2Media, setShowSo2Media] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Check if there is already a custom user saved in localStorage
    try {
      const savedCustom = localStorage.getItem('customUser');
      if (savedCustom) {
        const parsed = JSON.parse(savedCustom);
        setUser(parsed);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Failed to parse custom user", err);
      setUser(null);
    }

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      let saved = null;
      try { saved = localStorage.getItem('customUser'); } catch (e) {}
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const canonicalRoomId = parsed.channelId || parsed.uid || parsed.name;
          setUser({
            uid: canonicalRoomId,
            name: parsed.name,
            username: parsed.username || parsed.name,
            displayName: parsed.displayName || parsed.name,
            isCustom: true,
            channelName: parsed.channelName,
            channelId: canonicalRoomId,
            role: parsed.role,
            isLocalDemo: parsed.isLocalDemo !== undefined ? parsed.isLocalDemo : false
          });
        } catch (e) {
          setUser(null);
        }
      } else {
        // No custom user in localStorage -> user is strictly null (showing channel entrance)
        setUser(null);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user || !user.uid) return;
    
    // Proactive cleanup of existing localStorage matches bloating to resolve quota limit
    const rawMatches = localStorage.getItem(`matches_${user.uid}`);
    if (rawMatches) {
      try {
        const parsed = JSON.parse(rawMatches);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const needsCleanup = parsed.length > 40 || parsed.some(m => m && m.maps && m.maps.some((map: any) => map && map.roundLogs));
          if (needsCleanup) {
            console.log("Proactively cleaning up matches in localStorage to resolve quota limit...");
            saveMatchesToLocalStorage(user.uid, parsed);
          }
        }
      } catch (e) {}
    }
    
    let isCancelled = false;
    const roomId = getCanonicalRoomId(user.channelId || user.uid);
    cleanupTournamentStorageQuota(roomId);

    const restoreBackupFromServer = async () => {
      try {
        const res = await fetch(`/api/backup-data/${roomId}`);
        const data = await res.json();
        if (isCancelled) return;

        if (data && data.success) {
          const collections = [
            { prop: 'settings', cacheKey: `settings_${roomId}`, isObject: true },
            { prop: 'players', cacheKey: `players_${roomId}` },
            { prop: 'teams', cacheKey: `teams_${roomId}` },
            { prop: 'swapOffers', cacheKey: `swapOffers_${roomId}` },
            { prop: 'tournaments', cacheKey: `tournaments_${roomId}` },
            { prop: 'matches', cacheKey: `matches_${roomId}` },
            { prop: 'tgUsers', cacheKey: `tgUsers_${roomId}` },
            { prop: 'tgVetos', cacheKey: `tgVetos_${roomId}` },
            { prop: 'mapStats', cacheKey: `mapStats_${roomId}` }
          ];

          let hasUpdatedAny = false;

          for (const col of collections) {
            const serverItems = data[col.prop];
            if (!serverItems) continue;

            if (col.isObject) {
              const localRaw = localStorage.getItem(col.cacheKey) || localStorage.getItem(`settings_${user.uid}`);
              const localObj = localRaw ? JSON.parse(localRaw) : {};
              const merged = { ...serverItems, ...localObj };
              const mergedStr = JSON.stringify(merged);
              
              // Apply rating settings if present
              if (merged.useKast !== undefined || merged.useSwing !== undefined) {
                RATING_CONFIG.applyRatingSettings({
                  useKast: merged.useKast,
                  useSwing: merged.useSwing
                });
              }

              if (mergedStr !== localRaw) {
                try {
                  localStorage.setItem(col.cacheKey, mergedStr);
                  if (roomId !== user.uid) localStorage.setItem(`settings_${user.uid}`, mergedStr);
                  hasUpdatedAny = true;
                } catch (e) {}
              }
            } else if (Array.isArray(serverItems)) {
              const localRaw = localStorage.getItem(col.cacheKey) || localStorage.getItem(`${col.prop}_${user.uid}`);
              const localArray = localRaw ? JSON.parse(localRaw) : [];
              
              const mergedMap = new Map();
              // Server first (backup data is authoritative if local is missing or has defaults)
              for (const sItem of serverItems) {
                if (sItem) {
                  const key = sItem.id || `${roomId}_${sItem.chatId}`;
                  if (key) mergedMap.set(key, sItem);
                }
              }
              // Local second (could be newer)
              for (const lItem of localArray) {
                if (lItem) {
                  const key = lItem.id || `${roomId}_${lItem.chatId}`;
                  if (key) {
                    const sItem = mergedMap.get(key);
                    mergedMap.set(key, sItem ? { ...sItem, ...lItem } : lItem);
                  }
                }
              }

              const rawFinalArray = Array.from(mergedMap.values());
              const finalArray = (col.prop === 'players' || col.prop === 'teams') 
                ? filterItemsForRoom(rawFinalArray, roomId)
                : rawFinalArray;
              if (col.cacheKey === `matches_${roomId}`) {
                const prevRaw = localStorage.getItem(col.cacheKey);
                const deletedIdsRaw = localStorage.getItem(`deleted_matches_${roomId}`) || localStorage.getItem(`deleted_matches_${user.uid}`);
                const deletedSet = new Set<string>(deletedIdsRaw ? JSON.parse(deletedIdsRaw) : []);
                
                // Filter out any matches deleted by the user
                const validArray = finalArray.filter((m: any) => {
                  if (!m) return false;
                  const mId = m.id || m._id;
                  return mId && !deletedSet.has(mId);
                });

                saveMatchesToLocalStorage(roomId, validArray);
                if (roomId !== user.uid) saveMatchesToLocalStorage(user.uid, validArray);
                const nextRaw = localStorage.getItem(col.cacheKey);
                if (prevRaw !== nextRaw) {
                  hasUpdatedAny = true;
                }
              } else if (col.cacheKey === `tournaments_${roomId}`) {
                const deletedIdsRaw = localStorage.getItem(`deleted_tournaments_${roomId}`);
                const deletedSet = new Set<string>(deletedIdsRaw ? JSON.parse(deletedIdsRaw) : []);

                // Filter out deleted items from finalArray
                const validArray = finalArray.filter((t: any) => t && t.id && !deletedSet.has(t.id));

                // Preserve isolated tournament files and background images cleanly
                for (const tourney of validArray) {
                  if (tourney && tourney.id) {
                    const isolatedBg = localStorage.getItem(`tournament_bg_${tourney.id}`);
                    const bgImg = (isolatedBg && isolatedBg !== 'null' && isolatedBg !== 'undefined') 
                      ? isolatedBg 
                      : tourney.settings?.bgImage;
                    
                    if (bgImg) {
                      try { localStorage.setItem(`tournament_bg_${tourney.id}`, bgImg); } catch (e) {}
                      if (!tourney.settings) tourney.settings = {};
                      tourney.settings.bgImage = bgImg;
                    }
                    try {
                      const compacted = compactTournamentForStorage(tourney);
                      localStorage.setItem(`tournament_item_${roomId}_${tourney.id}`, JSON.stringify(compacted));
                    } catch (e) {
                      try {
                        const stripped = JSON.stringify(tourney).replace(/"data:image\/[^;]+;base64,[^"]+"/g, 'null');
                        localStorage.setItem(`tournament_item_${roomId}_${tourney.id}`, stripped);
                      } catch (e2) {}
                    }
                  }
                }
                
                // Save lightweight index in tournaments_${roomId} to prevent quota overflow
                try {
                  const lightweightTourneys = validArray.map((t: any) => {
                    const { bracketRounds, losersBracketRounds, swissRounds, groups, tieredBracketRounds, ...lightweight } = t;
                    return lightweight;
                  });
                  localStorage.setItem(col.cacheKey, JSON.stringify(lightweightTourneys));
                  hasUpdatedAny = true;
                } catch (err) {
                  try {
                    localStorage.removeItem(col.cacheKey);
                  } catch (e) {}
                }
                window.dispatchEvent(new Event('tournaments-updated'));
              } else if (col.prop === 'teams') {
                const deletedIdsRaw = localStorage.getItem(`deleted_teams_${roomId}`) || localStorage.getItem(`deleted_teams_${user.uid}`);
                const deletedList: string[] = deletedIdsRaw ? JSON.parse(deletedIdsRaw) : [];
                const deletedSet = new Set<string>(deletedList.map(s => String(s).toLowerCase().trim()));
                const validArray = finalArray.filter((t: any) => {
                  if (!t) return false;
                  const tId = String(t.id || t._id || '').toLowerCase().trim();
                  const tName = String(t.name || '').toLowerCase().trim();
                  return !deletedSet.has(tId) && !deletedSet.has(tName);
                });

                let jsonStr = JSON.stringify(validArray);
                if (jsonStr !== localRaw) {
                  try {
                    localStorage.setItem(col.cacheKey, jsonStr);
                    if (roomId !== user.uid) localStorage.setItem(`teams_${user.uid}`, jsonStr);
                    hasUpdatedAny = true;
                  } catch (e) {}
                }
              } else if (col.prop === 'players') {
                const deletedIdsRaw = localStorage.getItem(`deleted_players_${roomId}`) || localStorage.getItem(`deleted_players_${user.uid}`);
                const deletedList: string[] = deletedIdsRaw ? JSON.parse(deletedIdsRaw) : [];
                const deletedSet = new Set<string>(deletedList.map(s => String(s).toLowerCase().trim()));
                const validArray = finalArray.filter((p: any) => {
                  if (!p) return false;
                  const pId = String(p.id || p._id || '').toLowerCase().trim();
                  const pNick = String(p.nickname || p.name || '').toLowerCase().trim();
                  return !deletedSet.has(pId) && !deletedSet.has(pNick);
                });

                let jsonStr = JSON.stringify(validArray);
                if (jsonStr !== localRaw) {
                  try {
                    localStorage.setItem(col.cacheKey, jsonStr);
                    if (roomId !== user.uid) localStorage.setItem(`players_${user.uid}`, jsonStr);
                    hasUpdatedAny = true;
                  } catch (e) {}
                }
              } else {
                let jsonStr = JSON.stringify(finalArray);
                if (jsonStr.length > 1500000) {
                    jsonStr = jsonStr.replace(/"data:image\/[^;]+;base64,[^"]{20000,}"/g, 'null');
                }
                if (jsonStr !== localRaw) {
                  try {
                    localStorage.setItem(col.cacheKey, jsonStr);
                    hasUpdatedAny = true;
                  } catch (err) {
                    try {
                      const compact = jsonStr.replace(/"data:image\/[^;]+;base64,[^"]{20000,}"/g, 'null');
                      localStorage.setItem(col.cacheKey, compact);
                      hasUpdatedAny = true;
                    } catch (err2) {}
                  }
                }
              }
            }
          }

          if (hasUpdatedAny) {
            console.log("Resilient backup restored and merged successfully.");
            window.dispatchEvent(new Event('db-user-updated'));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch resilient backup from server:", err);
      }
    };

    const syncCacheWithServer = async () => {
      try {
        const payload: any = { userId: roomId };
        
        const keys = [
          { prop: 'settings', cacheKey: `settings_${roomId}` },
          { prop: 'players', cacheKey: `players_${roomId}` },
          { prop: 'teams', cacheKey: `teams_${roomId}` },
          { prop: 'swapOffers', cacheKey: `swapOffers_${roomId}` },
          { prop: 'tournaments', cacheKey: `tournaments_${roomId}` },
          { prop: 'matches', cacheKey: `matches_${roomId}` },
          { prop: 'tgUsers', cacheKey: `tgUsers_${roomId}` },
          { prop: 'tgVetos', cacheKey: `tgVetos_${roomId}` },
          { prop: 'mapStats', cacheKey: `mapStats_${roomId}` }
        ];
        
        let hasAnyData = false;
        
        for (const item of keys) {
          let raw = localStorage.getItem(item.cacheKey) || (roomId !== user.uid ? localStorage.getItem(`${item.prop}_${user.uid}`) : null);
          if (item.prop === 'tournaments') {
            const mem = loadTournaments(roomId);
            if (mem && mem.length > 0) raw = JSON.stringify(mem);
          }
          if (raw) {
            try {
              payload[item.prop] = JSON.parse(raw);
              hasAnyData = true;
            } catch (e) {}
          }
        }
        
        if (hasAnyData && !isCancelled) {
          console.log("Synchronizing offline cache with backend server for room:", roomId);
          await fetch('/api/sync-cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
      } catch (err) {
        console.warn("Failed to automatically synchronize local cache with server:", err);
      }
    };
    
    // First retrieve backup, then set timer to sync local back
    restoreBackupFromServer().then(() => {
      if (!isCancelled) {
        setTimeout(syncCacheWithServer, 1500);
      }
    });

    // Start a background polling of backup-data every 30 seconds
    // This is 100% free (server memory cache) and avoids any heavy direct Firestore reads!
    const pollInterval = setInterval(() => {
      if (!isCancelled) {
        restoreBackupFromServer();
      }
    }, 30000);

    return () => {
      isCancelled = true;
      clearInterval(pollInterval);
    };
  }, [user]);

  const handleCustomLogin = async (e: any) => {
    e.preventDefault();
    const cleanUser = loginForm.username.trim().toLowerCase();
    const cleanPass = loginForm.password.trim();

    let localRooms: any[] = [];
    try {
      const raw = localStorage.getItem('persistent_admin_rooms');
      if (raw) localRooms = JSON.parse(raw);
    } catch (e) {}

    const allChannels = [...CHANNELS, ...localRooms];
    let found = allChannels.find(c => c && c.username?.toLowerCase() === cleanUser && c.password === cleanPass);

    if (!found) {
      try {
        const resp = await fetch('/api/auth/channel-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUser, password: cleanPass })
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.success && data.room) {
            found = data.room;
          }
        }
      } catch (e) {}
    }

    if (found) {
      try {
        setLoginError('');
        const email = `${found.channelId}@matchsimulator.com`;
        const password = `pwd_${found.channelId}`; // consistent password
        
        let firebaseAuthUser;
        let isLocalDemo = false;
        try {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          firebaseAuthUser = cred.user;
        } catch (authErr: any) {
          if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/invalid-email') {
            try {
              const cred = await createUserWithEmailAndPassword(auth, email, password);
              firebaseAuthUser = cred.user;
            } catch (createErr: any) {
              console.warn("Could not create Firebase user, using Firestore with client ID", createErr);
              isLocalDemo = false;
            }
          } else {
            console.warn("Could not sign in Firebase user, using Firestore with client ID", authErr);
            isLocalDemo = false;
          }
        }

        const canonicalRoomId = found.channelId || found.username;
        const u = {
          uid: canonicalRoomId,
          name: found.username,
          username: found.username,
          displayName: found.username,
          isCustom: true,
          channelName: found.channelName,
          channelId: canonicalRoomId,
          role: found.role || (cleanUser === 'bamep' ? 'superadmin' : 'user'),
          isLocalDemo: isLocalDemo
        };
        localStorage.setItem('customUser', JSON.stringify(u));
        setUser(u);
        setShowLoginModal(false);
        setLoginForm({ username: '', password: '' });
      } catch (err: any) {
        console.error(err);
        setLoginError('Ошибка авторизации: ' + (err.message || 'неизвестная ошибка'));
      }
    } else {
      setLoginError('Неверный логин или пароль');
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('customUser');
      setUser(null);
      await logout();
    } catch (err) {
      console.error(err);
    }
  };

  const isBamepAdmin = 
    (user?.name || user?.username || user?.displayName || '').toLowerCase() === 'bamep' ||
    user?.role === 'superadmin' ||
    (user?.channelName || '').toLowerCase().includes('bamep');

  if (!user) {
    return <ChannelLogin onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-[#08080c] font-sans text-white overflow-hidden">
        <NavPanel 
          user={user} 
          onLogout={handleLogout} 
          onShowLogin={() => setShowLoginModal(true)} 
          onOpenMedia={() => setShowSo2Media(true)}
        />
        
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none translate-y-1/3 -translate-x-1/3"></div>
          
          <div className="flex-1 overflow-y-auto z-10 p-4 lg:p-8 custom-scrollbar">
            <Routes>
              <Route path="/" element={<Simulator user={user} />} />
              <Route path="/stats" element={<Statistics user={user} />} />
              <Route path="/matches" element={<Matches user={user} />} />
              <Route path="/tournaments" element={<TournamentBracket user={user} />} />
              <Route path="/tournaments-beta" element={<TournamentsBeta user={user} />} />
              <Route path="/teams" element={<Teams user={user} />} />
              <Route path="/players" element={<Players user={user} />} />
              <Route path="/news" element={<News user={user} />} />
              <Route path="/transfers" element={<Transfers user={user} />} />
              <Route 
                path="/map-center" 
                element={isBamepAdmin ? <MapCenter user={user} /> : <AccessDenied sectionName="Карты и Тактики" roomName={user?.name} />} 
              />
              <Route 
                path="/analytics" 
                element={isBamepAdmin ? <AdminAnalytics user={user} /> : <AccessDenied sectionName="Аналитика и Управление Комнатами" roomName={user?.name} />} 
              />
              <Route path="/settings" element={<SettingsComponent user={user} />} />
            </Routes>
          </div>
        </div>
      </div>
      
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#12121a] p-8 rounded-2xl max-w-md w-full border border-white/10 relative">
            <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-white/50 hover:text-white">
              <Sparkles className="w-5 h-5 rotate-45" />
            </button>
            <h2 className="text-2xl font-black uppercase tracking-wider mb-6">Вход по каналу</h2>
            {loginError && <div className="mb-4 text-red-400 text-sm font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">{loginError}</div>}
            <form onSubmit={handleCustomLogin} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Логин</label>
                <input 
                  type="text" 
                  value={loginForm.username} 
                  onChange={e => setLoginForm({...loginForm, username: e.target.value})} 
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Введите логин"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Пароль</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={loginForm.password} 
                    onChange={e => setLoginForm({...loginForm, password: e.target.value})} 
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors pr-10"
                    placeholder="Введите пароль"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl mt-4 transition-colors">
                Войти
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Official Standoff 2 Logos & Player Photos Media Library */}
      <So2MediaLibraryModal
        isOpen={showSo2Media}
        onClose={() => setShowSo2Media(false)}
      />
    </Router>
  );
}