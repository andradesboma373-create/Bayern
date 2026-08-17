import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, writeBatch, onSnapshot } from '../firebase';
import { User, Plus, Trash2, Edit2, ShieldAlert, RefreshCw, Search, ExternalLink, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import PlayerAvatar from './PlayerAvatar';
import PlayerProfileModal from './PlayerProfileModal';
import { safeLocalStorageSet } from '../lib/utils';

export default function Players({ user }: { user: any }) {
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'regular' | 'academy'>('regular');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ nickname: '', role: 'rifler', rating: 100, valRating: 0, isAcademy: false, avatarUrl: '' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [selectedProfilePlayer, setSelectedProfilePlayer] = useState<any | null>(null);

  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState('');
  const [editRole, setEditRole] = useState('rifler');
  const [editRating, setEditRating] = useState(100);
  const [editValRating, setEditValRating] = useState(0);
  const [editIsAcademy, setEditIsAcademy] = useState(false);
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const startEdit = (player: any) => {
    setEditingPlayerId(player.id);
    setEditNickname(player.nickname);
    setEditRole(player.role);
    setEditRating(player.rating);
    setEditValRating(player.valRating || 0);
    setEditIsAcademy(!!player.isAcademy);
    setEditAvatarUrl(player.avatarUrl || null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editNickname.trim()) return;
    const newNick = editNickname.trim();
    const newRatingVal = Number(editRating) || 100;
    const newVacVal = Number(editValRating) || 0;

    // 1. Instant update in local React state & localStorage
    const updatedGlobalPlayers = players.map((p: any) => {
      if (p.id === id) {
        return { ...p, nickname: newNick, role: editRole, rating: newRatingVal, valRating: newVacVal, isAcademy: editIsAcademy };
      }
      return p;
    });
    setPlayers(updatedGlobalPlayers);
    safeLocalStorageSet(`players_${user.uid}`, updatedGlobalPlayers);

    // Update teams containing this player locally
    const teamsToUpdateDocs: { id: string; players: any[]; totalValRating: number }[] = [];
    const updatedTeams = teams.map((t: any) => {
      let changed = false;
      const updatedRoster = (t.players || []).map((tp: any) => {
        if (tp.id === id || (tp.nickname && tp.nickname.trim().toLowerCase() === newNick.toLowerCase())) {
          changed = true;
          return { ...tp, nickname: newNick, role: editRole, rating: newRatingVal, valRating: newVacVal, isAcademy: editIsAcademy };
        }
        return tp;
      });
      if (changed) {
        const totalVal = updatedRoster.slice(0, 5).reduce((acc: number, p: any) => acc + (p?.valRating || 0), 0);
        const newTeamObj = { ...t, players: updatedRoster, totalValRating: totalVal };
        if (t.id) teamsToUpdateDocs.push({ id: t.id, players: updatedRoster, totalValRating: totalVal });
        return newTeamObj;
      }
      return t;
    });
    setTeams(updatedTeams);
    safeLocalStorageSet(`teams_${user.uid}`, updatedTeams);

    setEditingPlayerId(null);
    window.dispatchEvent(new Event("db-user-updated"));

    // Sync to server cache/db immediately
    if (user && !user.isLocalDemo) {
      fetch('/api/sync-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, players: updatedGlobalPlayers, teams: updatedTeams })
      }).catch(() => {});
    }

    // 2. Non-blocking background sync to Firestore via writeBatch
    if (user && !user.isLocalDemo) {
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'players', id), {
          nickname: newNick,
          role: editRole,
          rating: newRatingVal,
          valRating: newVacVal,
          isAcademy: editIsAcademy
        });
        for (const tDoc of teamsToUpdateDocs) {
          batch.update(doc(db, 'teams', tDoc.id), {
            players: tDoc.players,
            totalValRating: tDoc.totalValRating
          });
        }
        batch.commit().catch(e => console.warn("Background player edit batch failed:", e));
      } catch (err) {
        console.warn("Error queuing player update batch in firestore:", err);
      }
    }
  };

  const fetchPlayers = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const localPlayers = JSON.parse(localStorage.getItem(`players_${user.uid}`) || '[]');
    if (localPlayers.length) setPlayers(localPlayers);
    const localTeams = JSON.parse(localStorage.getItem(`teams_${user.uid}`) || '[]');
    if (localTeams.length) setTeams(localTeams);

    if (user.isLocalDemo) {
      setLoading(false);
      return;
    }

    try {
      const qPlayers = query(collection(db, 'players'), where('channelId', '==', user.uid));
      const qsPlayers = await getDocs(qPlayers);
      const dbPlayers = qsPlayers.docs.map(d => ({ id: d.id, ...d.data() }));
      setPlayers(dbPlayers);
      safeLocalStorageSet(`players_${user.uid}`, dbPlayers);
      fetch('/api/sync-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, players: dbPlayers })
      }).catch(() => {});

      const qTeams = query(collection(db, 'teams'), where('channelId', '==', user.uid));
      const qsTeams = await getDocs(qTeams);
      const dbTeams = qsTeams.docs.map(d => ({ id: d.id, ...d.data() }));
      setTeams(dbTeams);
      safeLocalStorageSet(`teams_${user.uid}`, dbTeams);
      fetch('/api/sync-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, teams: dbTeams })
      }).catch(() => {});
    } catch (e) {
      console.warn("Failed to fetch from Firestore, relying on local cache", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (user.isLocalDemo) {
      fetchPlayers();
      return;
    }

    setLoading(true);

    // Pre-populate with cached data for instant loading / fallback if offline/quota exceeded
    try {
      const cachedPlayers = localStorage.getItem(`players_${user.uid}`);
      if (cachedPlayers) setPlayers(JSON.parse(cachedPlayers));
      const cachedTeams = localStorage.getItem(`teams_${user.uid}`);
      if (cachedTeams) setTeams(JSON.parse(cachedTeams));
    } catch (e) {}

    const handleDbUpdated = () => {
      try {
        const cachedPlayers = localStorage.getItem(`players_${user.uid}`);
        if (cachedPlayers) setPlayers(JSON.parse(cachedPlayers));
        const cachedTeams = localStorage.getItem(`teams_${user.uid}`);
        if (cachedTeams) setTeams(JSON.parse(cachedTeams));
        setLoading(false);
      } catch (e) {
        console.warn("Failed to load from local storage", e);
      }
    };

    handleDbUpdated();

    window.addEventListener('db-user-updated', handleDbUpdated);

    return () => {
      window.removeEventListener('db-user-updated', handleDbUpdated);
    };
  }, [user]);


  const compressImage = (base64Str: string, maxWidth = 128, maxHeight = 128): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = (err) => reject(err);
    });
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPlayer.nickname.trim()) return;
    try {
      if (user.isLocalDemo) {
        throw new Error("Local demo mode");
      }
      await addDoc(collection(db, 'players'), {
        channelId: user.uid,
        nickname: newPlayer.nickname.trim(),
        role: newPlayer.role,
        rating: newPlayer.rating,
        valRating: newPlayer.valRating || 0,
        isAcademy: !!newPlayer.isAcademy,
        avatarUrl: newPlayer.avatarUrl,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Fallback: saving player locally", e);
      const localPlayers = JSON.parse(localStorage.getItem(`players_${user.uid}`) || '[]');
      localPlayers.push({
        id: 'p_' + Math.random().toString(36).substr(2, 9),
        channelId: user.uid,
        nickname: newPlayer.nickname.trim(),
        role: newPlayer.role,
        rating: newPlayer.rating,
        valRating: newPlayer.valRating || 0,
        isAcademy: !!newPlayer.isAcademy,
        avatarUrl: newPlayer.avatarUrl,
        createdAt: new Date().toISOString()
      });
      safeLocalStorageSet(`players_${user.uid}`, localPlayers);
    } finally {
      setNewPlayer({ nickname: '', role: 'rifler', rating: 100, valRating: 0, isAcademy: false, avatarUrl: '' });
      setShowAddForm(false);
      fetchPlayers();
    }
  };

  const handleDeletePlayer = async (id: string) => {
    try {
      if (user.isLocalDemo) {
        throw new Error("Local demo mode");
      }
      await deleteDoc(doc(db, 'players', id));
    } catch (e) {
      console.warn("Fallback: deleting player locally", e);
      const localPlayers = JSON.parse(localStorage.getItem(`players_${user.uid}`) || '[]');
      const filtered = localPlayers.filter((p: any) => p.id !== id);
      safeLocalStorageSet(`players_${user.uid}`, filtered);
    } finally {
      setConfirmDeleteId(null);
      fetchPlayers();
    }
  };

  if (!user || !user.isCustom) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/50 gap-4">
        <ShieldAlert className="w-16 h-16" />
        <h2 className="text-xl font-bold">Войдите через админ-канал, чтобы управлять игроками.</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="bg-[#12121a] rounded-2xl p-8 border border-white/5 flex-1">
          <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <User className="text-blue-500" />
            База Игроков ({user.channelName})
          </h1>
          <p className="text-white/40 text-sm mt-2 font-semibold">Создавайте и настраивайте игроков для симуляции</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="ml-6 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-2xl font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Добавить Игрока</span>
        </button>
        <Link 
          to="/transfers"
          className="ml-4 flex items-center gap-2 bg-[#ff8f00] hover:bg-[#ff9e1a] text-white px-6 py-4 rounded-2xl font-bold transition-all shadow-[0_0_20px_rgba(255,143,0,0.2)] cursor-pointer"
        >
          <RefreshCw className="w-5 h-5" />
          <span>Трансферы</span>
        </Link>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddPlayer} className="bg-[#12121a] p-6 rounded-2xl border border-white/10 flex gap-4 items-end flex-wrap md:flex-nowrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Никнейм</label>
            <div className="flex gap-4">
              <div 
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                      const res = await fetch('/api/upload?type=avatar', { method: 'POST', body: formData });
                      const data = await res.json();
                      if (data.url) setNewPlayer({...newPlayer, avatarUrl: data.url});
                    } catch(e) {}
                  };
                  input.click();
                }}
                className="w-[50px] h-[50px] shrink-0 rounded-xl bg-black/50 border border-white/10 hover:border-blue-500/50 flex items-center justify-center cursor-pointer transition-colors relative overflow-hidden group"
                title="Загрузить аватарку"
              >
                {newPlayer.avatarUrl ? (
                  <img src={newPlayer.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <span className="text-[10px] font-black text-white/30 uppercase">Фото</span>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-[8px] font-bold uppercase text-white">Изменить</span>
                </div>
              </div>
              <input required type="text" value={newPlayer.nickname} onChange={e => setNewPlayer({...newPlayer, nickname: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" placeholder="s1mple" />
            </div>
          </div>
          <div className="w-48">
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Роль</label>
            <select value={newPlayer.role} onChange={e => setNewPlayer({...newPlayer, role: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none">
              <option value="rifler">Rifler / Рифлер</option>
              <option value="sniper">Sniper / Снайпер</option>
              <option value="lurker">Lurker / Люркер</option>
              <option value="opener">Entry / Опенер</option>
              <option value="support">Support / Саппорт</option>
              <option value="captain">IGL / Капитан</option>
            </select>
          </div>
          <div className="w-32">
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Рейтинг</label>
            <input 
              required 
              type="number" 
              min="50" 
              max="200" 
              value={newPlayer.rating} 
              onChange={e => {
                let val = parseInt(e.target.value) || 0;
                if (val > 200) val = 200;
                setNewPlayer({...newPlayer, rating: val});
              }} 
              onBlur={e => {
                let val = parseInt(e.target.value) || 0;
                if (val < 50) val = 50;
                if (val > 200) val = 200;
                setNewPlayer({...newPlayer, rating: val});
              }}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-mono" 
            />
          </div>
          <div className="w-32">
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">VAC Pts</label>
            <input 
              required 
              type="number" 
              min="0" 
              max="100000" 
              value={newPlayer.valRating} 
              onChange={e => {
                let val = parseInt(e.target.value);
                if (isNaN(val)) val = 0;
                setNewPlayer({...newPlayer, valRating: val});
              }} 
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-mono" 
            />
          </div>
          <div className="flex items-center gap-2 h-[50px] px-2">
            <input
              type="checkbox"
              id="new_is_academy"
              checked={newPlayer.isAcademy}
              onChange={e => setNewPlayer({...newPlayer, isAcademy: e.target.checked})}
              className="w-4 h-4 rounded border-white/10 bg-black/50 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="new_is_academy" className="text-xs font-bold text-white/70 select-none cursor-pointer whitespace-nowrap">Академия</label>
          </div>
          <button type="submit" className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl transition-colors h-[50px] whitespace-nowrap">
            Сохранить
          </button>
        </form>
      )}

      <div className="flex flex-col md:flex-row gap-4 justify-between border-b border-white/5 pb-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setActiveTab('regular'); setCurrentPage(1); }}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
            activeTab === 'regular'
              ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/15'
              : 'bg-[#12121a] text-white/50 border-white/5 hover:text-white hover:bg-white/5'
          }`}
        >
          Обычные игроки
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('academy'); setCurrentPage(1); }}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
            activeTab === 'academy'
              ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/15'
              : 'bg-[#12121a] text-white/50 border-white/5 hover:text-white hover:bg-white/5'
          }`}
        >
          Академия
        </button>
        </div>
        <div className="relative w-full md:w-64">
           <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
           <input type="text" placeholder="Поиск игроков..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full bg-[#12121a] border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors" />
        </div>
      </div>

      {loading ? (
        <div className="text-center p-8 text-white/50">Загрузка...</div>
      ) : (() => {
        const filteredPlayers = players
          .filter(p => activeTab === 'academy' ? p.isAcademy === true : !p.isAcademy)
          .filter(p => p.nickname.toLowerCase().includes(searchQuery.toLowerCase()));

        if (filteredPlayers.length === 0) {
          return (
            <div className="text-center p-16 bg-[#12121a] border border-white/5 rounded-2xl text-white/30 font-bold">
              {activeTab === 'academy' ? 'В академии пока нет игроков.' : 'Нет обычных игроков.'}
            </div>
          );
        }

        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        const currentPlayers = filteredPlayers.slice(indexOfFirstItem, indexOfLastItem);
        const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage);

        return (
          <div className="flex flex-col">
            <div className="flex text-[10px] font-bold text-white/40 uppercase tracking-widest bg-black/40 p-3 md:px-4 md:py-3 rounded-t-xl border border-white/5">
              <div className="w-10 text-center">#</div>
              <div className="flex-1 min-w-0">Игрок</div>
              <div className="w-16 md:w-24 text-center">Роль</div>
              <div className="w-16 md:w-20 text-center">CS</div>
              <div className="w-16 md:w-24 text-right">VAC Pts</div>
              <div className="w-24 md:w-32 text-right">Действия</div>
            </div>
            <div className="flex flex-col border border-white/5 rounded-b-xl border-t-0 bg-[#0f0f18]">
              {currentPlayers.map((p, idx) => {
                const globalIdx = indexOfFirstItem + idx;
                const pTeam = teams.find(t => t.players?.some((tp: any) => tp.id === p.id));
                
                return (
                  <div key={p.id} className="group flex items-center p-3 md:px-4 md:py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.05] transition-colors relative overflow-hidden">
                    {confirmDeleteId === p.id && (
                      <div className="absolute inset-0 bg-black/95 flex items-center justify-between px-6 text-center z-10 animate-fade-in">
                        <div className="text-sm font-bold text-white uppercase tracking-wider">Удалить {p.nickname}?</div>
                        <div className="flex gap-2 w-full max-w-[160px]">
                          <button 
                            onClick={() => handleDeletePlayer(p.id)} 
                            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors"
                          >Да</button>
                          <button 
                            onClick={() => setConfirmDeleteId(null)} 
                            className="flex-1 bg-white/10 hover:bg-white/20 text-white/80 font-bold py-1.5 px-3 rounded-lg text-xs transition-colors"
                          >Нет</button>
                        </div>
                      </div>
                    )}
                    
                    {/* Rank */}
                    <div className="text-sm md:text-base font-black font-mono w-10 text-center text-white/40 group-hover:text-white transition-colors">
                      {globalIdx + 1}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <div onClick={() => setSelectedProfilePlayer(p)} className="cursor-pointer">
                        <PlayerAvatar playerName={p.nickname} avatarUrl={p.avatarUrl} sizeClassName="w-8 h-8 md:w-10 md:h-10" />
                      </div>
                      <div className="flex flex-col">
                        <div 
                          onClick={() => setSelectedProfilePlayer(p)}
                          className="font-black text-white text-sm md:text-base cursor-pointer hover:text-blue-400 transition-colors flex items-center gap-2 flex-wrap"
                        >
                          {p.nickname}
                          {pTeam ? (
                            <span className="text-[9px] bg-white/5 border border-white/10 text-white/60 px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
                              {pTeam.name}
                            </span>
                          ) : (
                            <span className="text-[9px] bg-amber-500/10 border border-amber-500/30 text-amber-500 px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
                              FFT
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Role */}
                    <div className="w-16 md:w-24 text-center">
                      <span className="text-[10px] md:text-xs text-white/50 uppercase tracking-widest">{p.role}</span>
                    </div>

                    {/* CS Rating */}
                    <div className="w-16 md:w-20 text-center">
                      <span className="font-black text-blue-400 font-mono text-xs md:text-sm">{Number(p.rating).toFixed(2)}</span>
                    </div>

                    {/* VAC Pts */}
                    <div className="w-16 md:w-24 text-right">
                      <span className="font-black text-[#ff8f00] font-mono text-xs md:text-sm">{(p.valRating || 0).toLocaleString()}</span>
                    </div>

                    {/* Actions */}
                    <div className="w-24 md:w-32 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setSelectedProfilePlayer(p)} className="text-white/20 hover:text-blue-400 transition-colors cursor-pointer" title="Профиль">
                        <ExternalLink className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                      <button onClick={() => setConfirmDeleteId(p.id)} className="text-white/20 hover:text-red-500 transition-colors cursor-pointer" title="Удалить">
                        <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center justify-between bg-[#12121a] border border-white/5 rounded-2xl p-4 mt-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-2 px-4 py-2.5 bg-black/40 hover:bg-black/60 disabled:bg-transparent disabled:opacity-20 text-white/80 disabled:text-white/20 border border-white/5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Назад
              </button>
              
              <div className="text-sm font-bold text-white/50">
                Страница <span className="text-white bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 font-mono text-sm mx-1">{currentPage}</span> из <span className="text-white bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 font-mono text-sm mx-1">{totalPages}</span>
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-2 px-4 py-2.5 bg-black/40 hover:bg-black/60 disabled:bg-transparent disabled:opacity-20 text-white/80 disabled:text-white/20 border border-white/5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Вперед
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })()}
      {selectedProfilePlayer && (
        <PlayerProfileModal
          player={selectedProfilePlayer}
          user={user}
          onClose={() => setSelectedProfilePlayer(null)}
          onUpdatePlayer={(updated) => {
            fetchPlayers();
            setSelectedProfilePlayer(null);
          }}
        />
      )}
    </div>
  );
}
