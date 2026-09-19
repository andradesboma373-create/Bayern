import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '../firebase';

interface ChannelLoginProps {
  onLoginSuccess: (user: any) => void;
}

export default function ChannelLogin({ onLoginSuccess }: ChannelLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Пожалуйста, введите логин и пароль комнаты');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const cleanUsername = username.trim().toLowerCase();
      const cleanPassword = password.trim();

      let targetChannel: any = null;

      // 1. Попытка аутентификации через серверный API
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUsername, password: cleanPassword })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.room) {
            targetChannel = data.room;
          }
        }
      } catch (err) {
        console.warn('Backend login endpoint unavailable, trying fallback', err);
      }

      // 2. Fallback на локально сохраненные комнаты и встроенные каналы
      if (!targetChannel) {
        const hardcodedList = [
          { username: 'bamep', password: 'bamepys06', channelId: 'channel_bamep_cs2', channelName: 'bamep cs2', role: 'superadmin' },
          { username: 'simu', password: 'si0607', channelId: 'channel_simu', channelName: 'simu', role: 'user' },
          { username: 'zeixst', password: 'ze0707', channelId: 'channel_bamep_cs2', channelName: 'bamep cs2', role: 'admin' },
          { username: 'airy', password: '212121', channelId: 'channel_airy', channelName: 'бомбардиро крокодило', role: 'user' }
        ];

        let localSavedRooms: any[] = [];
        try {
          const raw = localStorage.getItem('persistent_admin_rooms');
          if (raw) localSavedRooms = JSON.parse(raw);
        } catch (e) {}

        const allAvailable = [...hardcodedList, ...localSavedRooms];
        const found = allAvailable.find(c => c && c.username?.toLowerCase() === cleanUsername && c.password === cleanPassword);
        if (found) {
          targetChannel = found;
          // Trigger silent auto-restoration sync on backend
          fetch('/api/admin/rooms/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rooms: [found] })
          }).catch(() => {});
        }
      }

      if (!targetChannel) {
        setErrorMessage('Неверный логин или пароль от комнаты');
        setIsLoading(false);
        return;
      }

      // 3. Синхронизация с Firebase Auth для надежности облачных запросов
      const email = `${targetChannel.channelId || targetChannel.username}@matchsimulator.com`;
      const fbPwd = `pwd_${targetChannel.channelId || targetChannel.username}`;
      let fbUser: any = null;

      try {
        const cred = await signInWithEmailAndPassword(auth, email, fbPwd);
        fbUser = cred.user;
      } catch (authErr: any) {
        if (
          authErr.code === 'auth/user-not-found' || 
          authErr.code === 'auth/invalid-credential' || 
          authErr.code === 'auth/invalid-email'
        ) {
          try {
            const cred = await createUserWithEmailAndPassword(auth, email, fbPwd);
            fbUser = cred.user;
          } catch (createErr) {
            console.warn('Firebase user creation fallback', createErr);
          }
        }
      }

      const sessionUser = {
        uid: fbUser ? fbUser.uid : (targetChannel.channelId || targetChannel.username),
        name: targetChannel.username,
        username: targetChannel.username,
        displayName: targetChannel.username,
        isCustom: true,
        channelName: targetChannel.channelName || targetChannel.username,
        channelId: targetChannel.channelId,
        role: targetChannel.role || (cleanUsername === 'bamep' ? 'superadmin' : 'user'),
        isLocalDemo: false
      };

      localStorage.setItem('customUser', JSON.stringify(sessionUser));
      
      // Если это комната bamep, разблокируем рейты сразу
      if (cleanUsername === 'bamep') {
        localStorage.setItem('bamep_room_unlocked', 'true');
      }

      onLoginSuccess(sessionUser);
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err.message || 'Произошла непредвиденная ошибка при входе');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08080c] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans text-white select-none">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-[450px] h-[450px] bg-purple-600/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-md w-full z-10 flex flex-col items-center gap-7 py-8 animate-fade-in">
        {/* Logo and Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-2.5 rounded-2xl backdrop-blur-md shadow-xl">
            <div className="text-blue-500">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13h-13L12 6.5z"/>
              </svg>
            </div>
            <div className="font-black tracking-widest text-xl text-white">
              MATCH<span className="text-blue-400">SIMULATOR</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-white">
            Вход в канал
          </h1>
          <p className="text-sm text-white/50 max-w-sm">
            Введите логин и пароль комнаты для доступа к симулятору, турнирам и управлению
          </p>
        </div>

        {/* Main Authentication Card */}
        <div className="w-full bg-[#12121a] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
          {errorMessage && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-3 animate-fade-in">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                Логин канала / комнаты
              </label>
              <input
                id="channel-username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Введите логин"
                autoComplete="username"
                className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder:text-white/30 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                Пароль доступа
              </label>
              <div className="relative">
                <input
                  id="channel-password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                  autoComplete="current-password"
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder:text-white/30 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all pr-12 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black uppercase text-sm tracking-widest rounded-xl transition-all shadow-[0_0_25px_rgba(37,99,235,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>ВХОД В КОМНАТУ...</span>
                </>
              ) : (
                <>
                  <span>ВОЙТИ В КАНАЛ</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
