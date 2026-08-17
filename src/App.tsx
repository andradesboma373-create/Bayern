import { loadTournaments } from './components/setka_tourn/storage';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Gamepad2, Users, Trophy, BarChart2, Calendar, User, Newspaper, Database, Settings, Layout, LogOut, ChevronDown, Check, Zap, RefreshCw, Sparkles } from 'lucide-react';
import { auth, logout, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from './firebase';
import { collection, query, where, getDocs, onSnapshot } from './firebase';
import { saveMatchesToLocalStorage } from './lib/utils';

import TournamentBracket from './components/setka_tourn/TournamentBracket';
import Simulator from './components/Simulator';
import Statistics from './components/Statistics';
import Matches from './components/Matches';
import Teams from './components/Teams';
import Players from './components/Players';
import News from './components/News';
import SettingsComponent from './components/Settings';
import TgUsers from './components/TgUsers';
import Transfers from './components/Transfers';

function Sidebar() {
  const location = useLocation();
  
  const navItems = [
    { icon: Gamepad2, label: 'Симулятор', path: '/' },
    { icon: BarChart2, label: 'Статистика', path: '/stats' },
    { icon: Calendar, label: 'Матчи', path: '/matches' },
    { icon: Trophy, label: 'Турниры', path: '/tournaments' },
        { icon: Users, label: 'Команды', path: '/teams' },
    { icon: User, label: 'Игроки', path: '/players' },
    { icon: Newspaper, label: 'Новости', path: '/news' },
    { icon: Zap, label: 'Трансферы', path: '/transfers' },
    { icon: Database, label: 'База ТГ Бота', path: '/tg-users' },
    { icon: Settings, label: 'Настройки', path: '/settings' },
  ];

  return (
    <div className="w-64 bg-[#12121a] border-r border-white/5 h-full flex flex-col">
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <div className="text-blue-500">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13h-13L12 6.5z"/>
          </svg>
        </div>
        <div className="font-black tracking-widest text-lg text-white">MATCH<br/><span className="text-sm font-semibold tracking-[0.2em] text-white/50">SIMULATOR</span></div>
      </div>
      
      <div className="flex-1 py-6 px-4 flex flex-col gap-2">
        {navItems.map((item, idx) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={idx} to={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-blue-600/10 text-blue-500' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
              <item.icon className="w-5 h-5" />
              <span className="font-semibold text-sm">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  );
}


const CHANNELS = [
  { username: 'simu', password: 'si0607', channelId: 'channel_simu', channelName: 'simu' },
  { username: 'bamep', password: 'bamepys06', channelId: 'channel_bamep_cs2', channelName: 'bamep cs2' },
  { username: 'zeixst', password: 'ze0707', channelId: 'channel_bamep_cs2', channelName: 'bamep cs2' }
];

function TopBar({ user, onCustomLogin, onLogout }: { user: any, onCustomLogin: () => void, onLogout: () => void }) {
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [dbUser, setDbUser] = useState<any>(() => {
    if (!user) return null;
    try {
      const cached = localStorage.getItem(`cached_db_user_${user.name}`);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    if (!user) {
      setDbUser(null);
      setIsQuotaExceeded(false);
      return;
    }

    const loadLocalDbUser = () => {
      try {
        const raw = localStorage.getItem(`tgUsers_${user.uid}`);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const found = list.find((u: any) => 
              (u.username && u.username.toLowerCase() === user.name?.toLowerCase()) ||
              (u.firstName && u.firstName.toLowerCase() === user.name?.toLowerCase())
            );
            if (found) {
              setDbUser(found);
              localStorage.setItem(`cached_db_user_${user.name}`, JSON.stringify(found));
              return;
            }
          }
        }
        
        // Fallback to cached_db_user
        const cached = localStorage.getItem(`cached_db_user_${user.name}`);
        if (cached) {
          setDbUser(JSON.parse(cached));
        } else {
          setDbUser(null);
        }
      } catch (e) {
        console.warn("Failed to load local dbUser:", e);
      }
    };

    loadLocalDbUser();

    // Listen to custom db-user-updated event to update the TopBar balance instantly
    window.addEventListener('db-user-updated', loadLocalDbUser);
    return () => {
      window.removeEventListener('db-user-updated', loadLocalDbUser);
    };
  }, [user]);

  const rawStatus = dbUser && dbUser.status ? dbUser.status : 'Участник';
  const currentStatus = (rawStatus === 'Менеджер (Лидер)' || rawStatus === 'Менеджер' || rawStatus === 'Лидер') ? 'Участник' : rawStatus;

  return (
    <div className="h-20 border-b border-white/5 px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl text-sm font-semibold text-white">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span>Турниры</span>
        </div>
        {isQuotaExceeded && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 px-3.5 py-1.5 rounded-xl text-xs font-semibold animate-pulse" title="Суточный лимит запросов к базе данных Firestore исчерпан. Приложение временно использует локально сохраненный кэш.">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Офлайн-режим (Кэш)</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-6">
        {user ? (
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
            <div className="text-right hidden md:block">
              <div className="text-sm font-bold text-white flex items-center gap-1.5 justify-end">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                {user.displayName || user.name}
              </div>
              <div className="text-[10px] text-blue-400 font-mono font-black uppercase tracking-wider leading-none mt-1">
                {currentStatus}
              </div>
            </div>
            <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.name}&background=random`} className="w-10 h-10 rounded-full border border-white/10" />
            <button onClick={onLogout} className="p-2 text-white/50 hover:text-white cursor-pointer ml-1" title="Выйти">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={onCustomLogin} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.2)] cursor-pointer">
              <User className="w-4 h-4" />
              <span>Вход по каналу</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    // Check if there is already a custom user saved in localStorage (including local demo ones)
    try {
      const savedCustom = localStorage.getItem('customUser');
      if (savedCustom) {
        const parsed = JSON.parse(savedCustom);
        parsed.isLocalDemo = true;
        setUser(parsed);
      }
    } catch (err) {
      console.error("Failed to parse custom user", err);
    }

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        let saved = null;
        try { saved = localStorage.getItem('customUser'); } catch (e) {}
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setUser({
              uid: firebaseUser.uid,
              name: parsed.name,
              displayName: parsed.displayName,
              isCustom: true,
              channelName: parsed.channelName,
              isLocalDemo: true
            });
          } catch (e) {
            setUser({
              uid: firebaseUser.uid,
              name: firebaseUser.email?.split('@')[0] || 'Участник',
              displayName: firebaseUser.email?.split('@')[0] || 'Участник',
              isCustom: true,
              channelName: 'bamep cs2',
              isLocalDemo: true
            });
          }
        } else {
          setUser({
            uid: firebaseUser.uid,
            name: firebaseUser.email?.split('@')[0] || 'Участник',
            displayName: firebaseUser.email?.split('@')[0] || 'Участник',
            isCustom: true,
            channelName: 'bamep cs2',
            isLocalDemo: true
          });
        }
      } else {
        // If there is no custom user in localStorage, set user to null
        let hasCustom = false;
        try { hasCustom = !!localStorage.getItem('customUser'); } catch (e) {}
        if (!hasCustom) {
          setUser(null);
        }
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

    const restoreBackupFromServer = async () => {
      try {
        const res = await fetch(`/api/backup-data/${user.uid}`);
        const data = await res.json();
        if (isCancelled) return;

        if (data && data.success) {
          const collections = [
            { prop: 'settings', cacheKey: `settings_${user.uid}`, isObject: true },
            { prop: 'players', cacheKey: `players_${user.uid}` },
            { prop: 'teams', cacheKey: `teams_${user.uid}` },
            { prop: 'swapOffers', cacheKey: `swapOffers_${user.uid}` },
            { prop: 'tournaments', cacheKey: `tournaments_${user.uid}` },
            { prop: 'matches', cacheKey: `matches_${user.uid}` },
            { prop: 'tgUsers', cacheKey: `tgUsers_${user.uid}` },
            { prop: 'tgVetos', cacheKey: `tgVetos_${user.uid}` },
            { prop: 'mapStats', cacheKey: `mapStats_${user.uid}` }
          ];

          let hasUpdatedAny = false;

          for (const col of collections) {
            const serverItems = data[col.prop];
            if (!serverItems) continue;

            if (col.isObject) {
              const localRaw = localStorage.getItem(col.cacheKey);
              const localObj = localRaw ? JSON.parse(localRaw) : {};
              const merged = { ...serverItems, ...localObj };
              const mergedStr = JSON.stringify(merged);
              if (mergedStr !== localRaw) {
                try {
                  localStorage.setItem(col.cacheKey, mergedStr);
                  hasUpdatedAny = true;
                } catch (e) {}
              }
            } else if (Array.isArray(serverItems)) {
              const localRaw = localStorage.getItem(col.cacheKey);
              const localArray = localRaw ? JSON.parse(localRaw) : [];
              
              const mergedMap = new Map();
              // Server first (backup data is authoritative if local is missing or has defaults)
              for (const sItem of serverItems) {
                if (sItem) {
                  const key = sItem.id || `${user.uid}_${sItem.chatId}`;
                  if (key) mergedMap.set(key, sItem);
                }
              }
              // Local second (could be newer)
              for (const lItem of localArray) {
                if (lItem) {
                  const key = lItem.id || `${user.uid}_${lItem.chatId}`;
                  if (key) {
                    const sItem = mergedMap.get(key);
                    mergedMap.set(key, sItem ? { ...sItem, ...lItem } : lItem);
                  }
                }
              }

              const finalArray = Array.from(mergedMap.values());
              if (col.cacheKey === `matches_${user.uid}`) {
                const prevRaw = localStorage.getItem(col.cacheKey);
                saveMatchesToLocalStorage(user.uid, finalArray);
                const nextRaw = localStorage.getItem(col.cacheKey);
                if (prevRaw !== nextRaw) {
                  hasUpdatedAny = true;
                }
              } else if (col.cacheKey === `tournaments_${user.uid}`) {
                const prevRaw = localStorage.getItem(col.cacheKey);
                const deletedIdsRaw = localStorage.getItem(`deleted_tournaments_${user.uid}`);
                const deletedSet = new Set<string>(deletedIdsRaw ? JSON.parse(deletedIdsRaw) : []);

                // Filter out deleted items from finalArray
                const validArray = finalArray.filter((t: any) => t && t.id && !deletedSet.has(t.id));

                // Preserve isolated tournament files and background images
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
                      localStorage.setItem(`tournament_item_${user.uid}_${tourney.id}`, JSON.stringify(tourney));
                    } catch (e) {}
                  }
                }
                
                let jsonStr = JSON.stringify(validArray);
                if (jsonStr !== prevRaw) {
                  try {
                    localStorage.setItem(col.cacheKey, jsonStr);
                    hasUpdatedAny = true;
                  } catch (err) {
                    try {
                      const compact = jsonStr.replace(/"data:image\/[^;]+;base64,[^"]{1000,}"/g, 'null');
                      localStorage.setItem(col.cacheKey, compact);
                      hasUpdatedAny = true;
                    } catch (err2) {}
                  }
                }
                window.dispatchEvent(new Event('tournaments-updated'));
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
                      const compact = jsonStr.replace(/"data:image\/[^;]+;base64,[^"]{1000,}"/g, 'null');
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
        const payload: any = { userId: user.uid };
        
        const keys = [
          { prop: 'settings', cacheKey: `settings_${user.uid}` },
          { prop: 'players', cacheKey: `players_${user.uid}` },
          { prop: 'teams', cacheKey: `teams_${user.uid}` },
          { prop: 'swapOffers', cacheKey: `swapOffers_${user.uid}` },
          { prop: 'tournaments', cacheKey: `tournaments_${user.uid}` },
          { prop: 'matches', cacheKey: `matches_${user.uid}` },
          { prop: 'tgUsers', cacheKey: `tgUsers_${user.uid}` },
          { prop: 'tgVetos', cacheKey: `tgVetos_${user.uid}` },
          { prop: 'mapStats', cacheKey: `mapStats_${user.uid}` }
        ];
        
        let hasAnyData = false;
        
        for (const item of keys) {
          let raw = localStorage.getItem(item.cacheKey);
          if (item.prop === 'tournaments') {
            const mem = loadTournaments(user.uid);
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
          console.log("Synchronizing offline cache with backend server...");
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
    const found = CHANNELS.find(c => c.username === loginForm.username && c.password === loginForm.password);
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

        const u = {
          uid: firebaseAuthUser ? firebaseAuthUser.uid : found.channelId,
          name: found.username,
          displayName: found.username,
          isCustom: true,
          channelName: found.channelName,
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

  return (
    <Router>
      <div className="flex h-screen bg-[#08080c] font-sans text-white overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none translate-y-1/3 -translate-x-1/3"></div>
          
          <TopBar user={user} onCustomLogin={() => setShowLoginModal(true)} onLogout={handleLogout} />
          
          <div className="flex-1 overflow-y-auto z-10 p-8">
            <Routes>
              <Route path="/" element={<Simulator user={user} />} />
              <Route path="/stats" element={<Statistics user={user} />} />
              <Route path="/matches" element={<Matches user={user} />} />
              <Route path="/tournaments" element={<TournamentBracket user={user} />} />
                            <Route path="/teams" element={<Teams user={user} />} />
              <Route path="/players" element={<Players user={user} />} />
              <Route path="/news" element={<News user={user} />} />
              <Route path="/transfers" element={<Transfers user={user} />} />
              <Route path="/tg-users" element={<TgUsers user={user} />} />
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
                <input 
                  type="password" 
                  value={loginForm.password} 
                  onChange={e => setLoginForm({...loginForm, password: e.target.value})} 
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Введите пароль"
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl mt-4 transition-colors">
                Войти
              </button>
            </form>
          </div>
        </div>
      )}
    </Router>
  );
}