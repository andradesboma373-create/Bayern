import React, { useState, useEffect } from 'react';
import { TeamAutocompleteInput } from './TeamAutocompleteInput';
import { db, doc, updateDoc, writeBatch } from '../firebase';
import { Users, Plus, Trash2, Edit2, Download, Trophy, ChevronLeft, ChevronRight, Check, ShieldAlert } from 'lucide-react';
import PlayerAvatar from './PlayerAvatar';
import TeamLogo from './TeamLogo';
import TeamProfileModal from './TeamProfileModal';
import { safeLocalStorageSet } from '../lib/utils';

export default function Teams({ user }: { user: any }) {
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeamProfile, setSelectedTeamProfile] = useState<any | null>(null);
  
  const [activeTab, setActiveTab] = useState<'regular' | 'academy'>('regular');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLogo, setNewTeamLogo] = useState<string | null>(null);
  const [newTeamIsAcademy, setNewTeamIsAcademy] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(['', '', '', '', '']);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  
  const [selectedTeamRoster, setSelectedTeamRoster] = useState<any | null>(null);
  const [editingValRatings, setEditingValRatings] = useState<{ [playerId: string]: number }>({});
  const [editingRatings, setEditingRatings] = useState<{ [playerId: string]: number }>({});
  const [activeAddingSlot, setActiveAddingSlot] = useState<{ teamId: string, index: number } | null>(null);
  
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [tourActive, setTourActive] = useState(false);
  const [tourTeams, setTourTeams] = useState<string[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const loadData = () => {
      try {
        const p = localStorage.getItem(`players_${user.uid}`);
        if (p) setPlayers(JSON.parse(p));
        const t = localStorage.getItem(`teams_${user.uid}`);
        if (t) setTeams(JSON.parse(t));
        const trn = localStorage.getItem(`tournaments_${user.uid}`);
        if (trn) setTournaments(JSON.parse(trn));
        const s = localStorage.getItem(`settings_${user.uid}`);
        if (s) {
          const parsed = JSON.parse(s);
          setTourActive(!!parsed.tourActive);
          setTourTeams(parsed.tourTeams || []);
        }
      } catch (err) {
        console.error("Failed to load local data:", err);
      }
      setLoading(false);
    };
    loadData();
    window.addEventListener("db-user-updated", loadData);
    return () => window.removeEventListener("db-user-updated", loadData);
  }, [user]);

  const compressImage = (base64Str: string, maxWidth = 128, maxHeight = 128): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
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
          resolve(canvas.toDataURL('image/png', 0.8));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = (err) => reject(err);
      img.src = base64Str;
    });
  };

  const handleLogoUploadClick = () => {
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
      logoInputRef.current.click();
    }
  };

  const isTeamLocked = (teamId: string) => {
    if (tourActive && tourTeams.includes(teamId)) return true;
    const activeTournament = tournaments.find(t => t.isTourActive === true);
    if (activeTournament) {
      if (tourTeams.includes(teamId)) return true;
    }
    return false;
  };

  const handleDownloadTeam = (team: any) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(team, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `team_${team.name}.json`);
    dlAnchorElem.click();
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    const roster = selectedPlayers.map(pid => players.find(p => p.id === pid) || { id: '' });
    
    let updatedTeams = [...teams];
    if (editingTeamId) {
      updatedTeams = updatedTeams.map(t => {
        if (t.id === editingTeamId) {
          return {
            ...t,
            name: newTeamName.trim(),
            isAcademy: !!newTeamIsAcademy,
            players: roster,
            ...(newTeamLogo !== null ? { logoUrl: newTeamLogo } : {})
          };
        }
        return t;
      });
    } else {
      const newTeam = {
        id: "t_" + Math.random().toString(36).substring(2, 9),
        name: newTeamName.trim(),
        isAcademy: !!newTeamIsAcademy,
        players: roster,
        ...(newTeamLogo !== null ? { logoUrl: newTeamLogo } : {})
      };
      updatedTeams.push(newTeam);
    }
    
    setTeams(updatedTeams);
    safeLocalStorageSet(`teams_${user.uid}`, updatedTeams);
    window.dispatchEvent(new Event("db-user-updated"));
    
    fetch('/api/sync-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.uid, teams: updatedTeams })
    }).catch(() => {});
    
    setShowAddForm(false);
    setEditingTeamId(null);
    setNewTeamName('');
    setNewTeamLogo(null);
    setNewTeamIsAcademy(false);
    setSelectedPlayers(['', '', '', '', '']);
  };

  const handleDeleteTeam = async (id: string) => {
    const updated = teams.filter(t => t.id !== id);
    setTeams(updated);
    safeLocalStorageSet(`teams_${user.uid}`, updated);
    window.dispatchEvent(new Event("db-user-updated"));
    setConfirmDeleteId(null);
  };

  const handleUpdateTeamRoster = async () => {
    if (!selectedTeamRoster) return;
    const teamId = typeof selectedTeamRoster === 'string' ? selectedTeamRoster : selectedTeamRoster.id;
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    // 1. Map updated player objects with new valRatings & ratings
    const updatedTeamPlayers = team.players.map((p: any) => {
      if (p && p.id) {
        const newVal = editingValRatings[p.id] !== undefined ? Number(editingValRatings[p.id]) : p.valRating;
        const newRating = editingRatings[p.id] !== undefined ? Number(editingRatings[p.id]) : p.rating;
        return {
          ...p,
          valRating: newVal !== undefined ? newVal : 0,
          rating: newRating !== undefined ? newRating : 100
        };
      }
      return p;
    });

    const totalValRating = updatedTeamPlayers.slice(0, 5).reduce((acc: number, p: any) => acc + (p?.valRating || 0), 0);
    const changedPlayerIds = Array.from(new Set([...Object.keys(editingValRatings), ...Object.keys(editingRatings)]));

    // 2. Update global players array & localStorage
    let updatedGlobalPlayers = players;
    if (changedPlayerIds.length > 0) {
      updatedGlobalPlayers = players.map((p: any) => {
        if (p && p.id && (editingValRatings[p.id] !== undefined || editingRatings[p.id] !== undefined)) {
          const newVal = editingValRatings[p.id] !== undefined ? Number(editingValRatings[p.id]) : p.valRating;
          const newRating = editingRatings[p.id] !== undefined ? Number(editingRatings[p.id]) : p.rating;
          return {
            ...p,
            valRating: newVal !== undefined ? newVal : 0,
            rating: newRating !== undefined ? newRating : 100
          };
        }
        return p;
      });
      setPlayers(updatedGlobalPlayers);
      safeLocalStorageSet(`players_${user.uid}`, updatedGlobalPlayers);
    }

    // 3. Update all teams in state and localStorage
    const updatedTeams = teams.map(t => {
      if (t.id === teamId) {
        return { ...t, players: updatedTeamPlayers, totalValRating };
      }
      let changedOther = false;
      const otherPlayers = (t.players || []).map((tp: any) => {
        if (tp && tp.id && (editingValRatings[tp.id] !== undefined || editingRatings[tp.id] !== undefined)) {
          changedOther = true;
          const newVal = editingValRatings[tp.id] !== undefined ? Number(editingValRatings[tp.id]) : tp.valRating;
          const newRating = editingRatings[tp.id] !== undefined ? Number(editingRatings[tp.id]) : tp.rating;
          return {
            ...tp,
            valRating: newVal !== undefined ? newVal : 0,
            rating: newRating !== undefined ? newRating : 100
          };
        }
        return tp;
      });
      if (changedOther) {
        const otherTotalVal = otherPlayers.slice(0, 5).reduce((acc: number, p: any) => acc + (p?.valRating || 0), 0);
        return { ...t, players: otherPlayers, totalValRating: otherTotalVal };
      }
      return t;
    });

    setTeams(updatedTeams);
    safeLocalStorageSet(`teams_${user.uid}`, updatedTeams);

    // Clear editing states & notify UI INSTANTLY
    const changedValCopy = { ...editingValRatings };
    const changedRatingCopy = { ...editingRatings };
    setEditingValRatings({});
    setEditingRatings({});
    setSelectedTeamRoster(null);
    window.dispatchEvent(new Event("db-user-updated"));

    // Sync to server cache/db
    if (user && !user.isLocalDemo) {
      fetch('/api/sync-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, players: updatedGlobalPlayers, teams: updatedTeams })
      }).catch(() => {});
    }

    // 4. Background non-blocking sync to Firestore
    if (user && !user.isLocalDemo) {
      try {
        const batch = writeBatch(db);
        // Update all teams that have modified player rosters/ratings
        for (const t of updatedTeams) {
          if (t && t.id) {
            batch.update(doc(db, 'teams', t.id), {
              players: t.players || [],
              totalValRating: t.totalValRating || 0
            });
          }
        }
        for (const pid of changedPlayerIds) {
          const updateObj: any = {};
          if (changedValCopy[pid] !== undefined) updateObj.valRating = Number(changedValCopy[pid]) || 0;
          if (changedRatingCopy[pid] !== undefined) updateObj.rating = Number(changedRatingCopy[pid]) || 100;
          if (Object.keys(updateObj).length > 0) {
            batch.update(doc(db, 'players', pid), updateObj);
          }
        }
        batch.commit().catch(e => console.warn("Background batch commit failed:", e));
      } catch (e) {
        console.warn("Error queuing batch update in firestore", e);
      }
    }
  };

  const handleAddPlayerToTeamSlot = async (teamId: string, index: number, player: any) => {
    const targetTeam = teams.find(t => t.id === teamId);
    if (!targetTeam) return;

    const newPlayers = [...(targetTeam.players || [])];
    newPlayers[index] = { ...player };
    const totalValRating = newPlayers.slice(0, 5).reduce((acc: number, p: any) => acc + (p?.valRating || 0), 0);

    const updatedTeams = teams.map(t => {
      if (t.id === teamId) {
        return { ...t, players: newPlayers, totalValRating };
      }
      return t;
    });

    setTeams(updatedTeams);
    safeLocalStorageSet(`teams_${user.uid}`, updatedTeams);

    if (user && !user.isLocalDemo) {
      try {
        await updateDoc(doc(db, 'teams', teamId), {
          players: newPlayers,
          totalValRating
        });
      } catch (e) {
        console.warn("Firestore team slot update error:", e);
      }
      fetch('/api/sync-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, teams: updatedTeams })
      }).catch(() => {});
    }

    window.dispatchEvent(new Event("db-user-updated"));
    setActiveAddingSlot(null);
  };

  const handleRemovePlayerFromTeam = async (teamId: string, index: number) => {
    const targetTeam = teams.find(t => t.id === teamId);
    if (!targetTeam) return;

    const newPlayers = [...(targetTeam.players || [])];
    newPlayers[index] = { id: '' };
    const totalValRating = newPlayers.slice(0, 5).reduce((acc: number, p: any) => acc + (p?.valRating || 0), 0);

    const updatedTeams = teams.map(t => {
      if (t.id === teamId) {
        return { ...t, players: newPlayers, totalValRating };
      }
      return t;
    });

    setTeams(updatedTeams);
    safeLocalStorageSet(`teams_${user.uid}`, updatedTeams);

    if (user && !user.isLocalDemo) {
      try {
        await updateDoc(doc(db, 'teams', teamId), {
          players: newPlayers,
          totalValRating
        });
      } catch (e) {
        console.warn("Firestore team remove slot error:", e);
      }
      fetch('/api/sync-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, teams: updatedTeams })
      }).catch(() => {});
    }

    window.dispatchEvent(new Event("db-user-updated"));
  };

  const fftPlayers = players.filter(p => p && p.id && !teams.some(t => t && t.players && t.players.some((tp: any) => tp && tp.id === p.id)));

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/40 p-4 md:p-6 rounded-2xl border border-white/5 shadow-lg">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-wider flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Команды
          </h2>
          <p className="text-white/50 text-sm mt-1">
            Управление клубами и академиями
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTeamId(null);
            setNewTeamName('');
            setNewTeamLogo(null);
            setNewTeamIsAcademy(false);
            setSelectedPlayers(['', '', '', '', '']);
            setShowAddForm(!showAddForm);
          }}
          className="flex items-center gap-2 bg-[#ff8f00] hover:bg-[#ff8f00]/90 text-black px-4 py-2 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(255,143,0,0.3)] w-full sm:w-auto justify-center"
        >
          {showAddForm ? <Trash2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAddForm ? 'Отмена' : 'Добавить'}
        </button>
      </div>

      <div className="flex bg-black/40 p-1 rounded-xl w-full max-w-sm border border-white/5">
        <button
          onClick={() => { setActiveTab('regular'); setCurrentPage(1); }}
          className={`flex-1 py-2 text-sm font-bold uppercase tracking-wider rounded-lg transition-all ${
            activeTab === 'regular'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          Основы
        </button>
        <button
          onClick={() => { setActiveTab('academy'); setCurrentPage(1); }}
          className={`flex-1 py-2 text-sm font-bold uppercase tracking-wider rounded-lg transition-all ${
            activeTab === 'academy'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          Академии
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSaveTeam} className="bg-black/40 border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Users className="w-32 h-32" />
          </div>
          
          <h3 className="text-xl font-black uppercase tracking-wider mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#ff8f00]" />
            {editingTeamId ? 'Редактировать команду' : 'Создать команду'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="md:col-span-3">
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Название команды</label>
              <div className="flex gap-4">
                <div 
                  onClick={handleLogoUploadClick}
                  className="w-[52px] h-[52px] shrink-0 rounded-xl bg-black/50 border border-white/10 hover:border-[#ff8f00]/50 flex items-center justify-center cursor-pointer transition-colors relative overflow-hidden group"
                  title="Загрузить логотип"
                >
                  <input
                    type="file"
                    ref={logoInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const res = await fetch('/api/upload', { method: 'POST', body: formData });
                        const data = await res.json();
                        if (data.url) setNewTeamLogo(data.url);
                      } catch (err) { console.error(err); }
                    }}
                  />
                  {newTeamLogo ? (
                    <img src={newTeamLogo} className="w-full h-full object-cover" alt="Logo" />
                  ) : (
                    <span className="text-[10px] font-black text-white/30 uppercase">Лого</span>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-[8px] font-bold uppercase text-white">Изменить</span>
                  </div>
                </div>
                <TeamAutocompleteInput required value={newTeamName} onChange={setNewTeamName} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ff8f00] font-black text-xl" placeholder="Название команды (NAVI)" />
              </div>
            </div>
            <div className="flex items-center gap-2 h-[50px] px-2 mb-1 mt-6">
              <input
                type="checkbox"
                id="new_team_is_academy"
                checked={newTeamIsAcademy}
                onChange={e => setNewTeamIsAcademy(e.target.checked)}
                className="w-5 h-5 rounded border-white/10 bg-black/50 text-[#ff8f00] focus:ring-[#ff8f00]"
              />
              <label htmlFor="new_team_is_academy" className="text-sm font-bold text-white/70 select-none cursor-pointer whitespace-nowrap">Академия (АКД)</label>
            </div>
          </div>

          {/* Main Roster (5 slots) */}
          <div className="mt-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#ff8f00] mb-3">Основной состав (5/5)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {[0, 1, 2, 3, 4].map(idx => {
                const usedInOtherTeamsIds = teams
                  .filter(t => t.id !== editingTeamId)
                  .flatMap(t => t.players?.map((p: any) => p.id))
                  .filter(Boolean);

                const availablePlayers = players.filter(p => {
                  if (usedInOtherTeamsIds.includes(p.id)) return false;
                  return !selectedPlayers.includes(p.id) || selectedPlayers[idx] === p.id;
                });

                return (
                  <div key={idx}>
                    <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-1 block">Основа {idx + 1}</label>
                    <select 
                      value={selectedPlayers[idx] || ''}
                      onChange={e => {
                        const newSelection = [...selectedPlayers];
                        newSelection[idx] = e.target.value;
                        setSelectedPlayers(newSelection);
                      }}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#ff8f00] text-xs font-bold"
                    >
                      <option value="">(Пусто)</option>
                      {availablePlayers.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nickname} ({p.role})
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bench / Substitutes (3 slots) */}
          <div className="mt-4 pt-4 border-t border-white/5">
            <h4 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-3">Скамейка запасных / Замена (3/3)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[5, 6, 7].map(idx => {
                const usedInOtherTeamsIds = teams
                  .filter(t => t.id !== editingTeamId)
                  .flatMap(t => t.players?.map((p: any) => p.id))
                  .filter(Boolean);

                const availablePlayers = players.filter(p => {
                  if (usedInOtherTeamsIds.includes(p.id)) return false;
                  return !selectedPlayers.includes(p.id) || selectedPlayers[idx] === p.id;
                });

                return (
                  <div key={idx}>
                    <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-1 block">Замена {idx - 4}</label>
                    <select 
                      value={selectedPlayers[idx] || ''}
                      onChange={e => {
                        const newSelection = [...selectedPlayers];
                        newSelection[idx] = e.target.value;
                        setSelectedPlayers(newSelection);
                      }}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-400 text-xs font-bold"
                    >
                      <option value="">(Свободно)</option>
                      {availablePlayers.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nickname} ({p.role})
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 w-full py-4 bg-[#ff8f00] hover:bg-[#ff8f00]/90 text-black rounded-xl font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(255,143,0,0.2)]"
          >
            {editingTeamId ? 'Сохранить изменения' : 'Создать команду'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center p-8 text-white/50">Загрузка...</div>
      ) : (() => {
        const filteredTeams = teams.filter(t => activeTab === 'academy' ? t.isAcademy === true : !t.isAcademy);
        if (filteredTeams.length === 0) {
          return (
            <div className="text-center p-16 bg-[#12121a] border border-white/5 rounded-2xl text-white/30 font-bold">
              {activeTab === 'academy' ? 'В академии пока нет команд.' : 'В этом канале пока нет обычных команд.'}
            </div>
          );
        }
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        const currentTeams = filteredTeams.slice(indexOfFirstItem, indexOfLastItem);
        const totalPages = Math.ceil(filteredTeams.length / itemsPerPage);
        return (
          <div className="flex flex-col">
            <div className="flex text-[10px] font-bold text-white/40 uppercase tracking-widest bg-black/40 p-3 md:px-4 md:py-3 rounded-t-xl border border-white/5">
              <div className="w-10 text-center">#</div>
              <div className="flex-1 min-w-0">Команда</div>
              <div className="w-1/3 md:w-2/5 text-center hidden sm:block">Состав</div>
              <div className="w-16 md:w-20 text-center">TP</div>
            </div>
            <div className="flex flex-col border border-t-0 border-white/5 rounded-b-xl overflow-hidden">
              {currentTeams.map((t, idx) => {
                const globalIdx = indexOfFirstItem + idx;
                const mainPlayers = (t.players || []).slice(0, 5).filter((p: any) => p && p.id);
                const teamplay = mainPlayers.length > 0 
                  ? mainPlayers.reduce((sum: number, p: any) => sum + (Number(p.rating) || 100), 0) / mainPlayers.length 
                  : 0;
                const mainTotalVal = (t.players || []).slice(0, 5).reduce((acc: number, p: any) => acc + (p?.valRating || 0), 0);
                return (
                  <div key={t.id} className="flex flex-col sm:flex-row items-stretch sm:items-center bg-[#1a1a24]/80 hover:bg-[#222230] border-b border-white/5 last:border-0 transition-colors group p-3 md:px-4 md:py-3 gap-3 md:gap-0">
                    <div className="flex items-center flex-1 min-w-0 gap-3">
                      <div className="w-10 text-center text-white/20 font-mono text-sm hidden sm:block">
                        {globalIdx + 1}
                      </div>
                      <div className="relative group/logo cursor-pointer shrink-0" onClick={() => handleLogoUploadClick()} title="Нажмите, чтобы загрузить логотип">
                        <TeamLogo teamName={t.name} logoUrl={t.logoUrl} sizeClassName="w-12 h-12 text-lg shadow-[0_0_15px_rgba(255,143,0,0.15)] transition-all group-hover/logo:scale-105" />
                        <div className="absolute inset-0 bg-black/70 rounded-full opacity-0 group-hover/logo:opacity-100 transition-all flex flex-col items-center justify-center text-[7px] text-white font-black uppercase tracking-wider border border-[#ff8f00]/50 select-none">
                          LOG
                        </div>
                      </div>
                      <div className="cursor-pointer flex-1" onClick={() => setSelectedTeamProfile(t)} title="Открыть профиль команды">
                        <h3 className="text-lg font-black text-white uppercase tracking-wider hover:text-blue-400 transition-colors flex items-center gap-1.5 truncate">
                          <span className="text-white/30 text-xs font-mono w-6 sm:hidden">#{globalIdx + 1}</span>
                          <span className="truncate">{t.name}</span>
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-white/40 mt-1">
                          <span>Игроков: {(t.players || []).filter((p: any) => p && p.id).length}/5</span>
                          <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                          <span>TP: {teamplay.toFixed(0)}</span>
                          <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                          <span>VAC: {(mainTotalVal || t.totalValRating || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-1.5 p-2 bg-black/40 rounded-xl border border-white/5 sm:w-1/3 md:w-2/5">
                      {t.players?.map((p: any, pIdx: number) => {
                        const isEmpty = !p || !p.id;
                        return (
                          <div key={pIdx} className="relative group/player cursor-help">
                            {isEmpty ? (
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                <span className="text-[10px] text-white/20">?</span>
                              </div>
                            ) : (
                              <>
                                <PlayerAvatar 
                                   playerName={p.nickname} 
                                   avatarUrl={p.avatarUrl} 
                                   sizeClassName="w-8 h-8 md:w-10 md:h-10" 
                                   className="border border-white/10 hover:border-white/30 transition-colors"
                                />
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 px-2 py-1 rounded text-[10px] font-bold text-white whitespace-nowrap opacity-0 group-hover/player:opacity-100 pointer-events-none transition-opacity z-10 flex flex-col items-center">
                                  <span>{p.nickname}</span>
                                  <span className="text-[#ff8f00] font-mono text-[9px]">{p.valRating || 0} pts</span>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 sm:mt-0 sm:ml-4 sm:w-24 md:w-32">
                      <button onClick={() => setSelectedTeamRoster(t)} className="flex items-center justify-center bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded py-1.5 text-[10px] font-bold uppercase cursor-pointer" title="Состав">
                        <Users className="w-3 h-3" />
                      </button>
                      <button onClick={() => {
                        setEditingTeamId(t.id);
                        setNewTeamName(t.name);
                        setNewTeamIsAcademy(!!t.isAcademy);
                        setNewTeamLogo(t.logoUrl || null);
                        const pids = t.players?.map((p: any) => p.id || '');
                        while (pids.length < 8) pids.push('');
                        setSelectedPlayers(pids);
                        setShowAddForm(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }} className="flex items-center justify-center bg-[#ff8f00]/10 hover:bg-[#ff8f00]/20 text-[#ff8f00] border border-[#ff8f00]/30 rounded py-1.5 text-[10px] font-bold uppercase cursor-pointer" title="Редактировать">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleDownloadTeam(t)} className="flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/50 border border-white/10 rounded py-1.5 text-[10px] font-bold uppercase cursor-pointer" title="Скачать .json">
                        <Download className="w-3 h-3" />
                      </button>
                      <button onClick={() => setConfirmDeleteId(t.id)} className="flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded py-1.5 text-[10px] font-bold uppercase cursor-pointer" title="Удалить">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-xl bg-black/50 border border-white/10 text-white hover:bg-white/5 disabled:opacity-30">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-white/50 text-sm font-bold font-mono">
                  {currentPage} / {totalPages}
                </div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-xl bg-black/50 border border-white/10 text-white hover:bg-white/5 disabled:opacity-30">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-red-950/40 p-8 rounded-2xl max-w-sm w-full border border-red-500/20 relative shadow-[0_0_50px_rgba(239,68,68,0.15)] text-center">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-2xl font-black uppercase tracking-wider text-white mb-2">Удалить команду?</h3>
            <p className="text-red-200/60 text-sm font-bold mb-6">Это действие нельзя отменить. Все данные команды будут удалены.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all uppercase tracking-wider text-sm">
                Отмена
              </button>
              <button onClick={() => handleDeleteTeam(confirmDeleteId)} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all uppercase tracking-wider text-sm shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTeamProfile && (
        <TeamProfileModal
          team={selectedTeamProfile}
          allPlayers={players}
          user={user}
          onClose={() => setSelectedTeamProfile(null)}
          onUpdateTeam={(updated) => {
            const up = teams.map(t => t.id === updated.id ? updated : t);
            setTeams(up);
            safeLocalStorageSet(`teams_${user.uid}`, up);
            window.dispatchEvent(new Event("db-user-updated"));
          }}
        />
      )}

      {(() => {
        const currentRosterTeam = selectedTeamRoster ? teams.find((t: any) => t.id === (typeof selectedTeamRoster === 'string' ? selectedTeamRoster : selectedTeamRoster.id)) : null;
        if (!currentRosterTeam) return null;
        return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#12121a] p-8 rounded-2xl max-w-2xl w-full border border-white/10 relative shadow-[0_0_50px_rgba(37,99,235,0.15)] flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-wider text-white">Состав команды {currentRosterTeam.name}</h2>
                  <p className="text-white/40 text-xs font-semibold mt-1">Редактируйте состав и VAC Pts игроков</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedTeamRoster(null);
                    setEditingValRatings({});
                    setActiveAddingSlot(null);
                  }} 
                  className="text-white/50 hover:text-white font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {currentRosterTeam.players.map((p: any, i: number) => {
                  const hasPlayer = p && p.id;
                  const isAddingThisSlot = activeAddingSlot && activeAddingSlot.teamId === currentRosterTeam.id && activeAddingSlot.index === i;
                  if (!hasPlayer) {
                    return (
                      <div key={i} className="flex flex-col items-center justify-center text-center gap-2 p-4 bg-black/40 border border-dashed border-white/10 rounded-xl relative min-h-[80px]">
                        {isAddingThisSlot ? (
                          <div className="absolute inset-0 bg-[#0c0c12] rounded-xl border border-[#ff8f00]/50 flex flex-col p-2 z-20">
                            <div className="text-xs font-bold text-white/50 mb-2 flex justify-between items-center px-1">
                              <span>Свободные агенты (FFT)</span>
                              <button onClick={() => setActiveAddingSlot(null)} className="text-red-500 hover:text-red-400 text-xs font-bold cursor-pointer">✕</button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 text-left">
                              {fftPlayers.length === 0 ? (
                                <div className="text-xs text-white/30 text-center py-2">Нет свободных агентов</div>
                              ) : (
                                fftPlayers.map((player) => (
                                  <button
                                    key={player.id}
                                    onClick={() => handleAddPlayerToTeamSlot(currentRosterTeam.id, i, player)}
                                    className="text-xs font-bold text-white hover:bg-[#ff8f00]/20 rounded px-2 py-1.5 w-full text-left flex justify-between items-center cursor-pointer transition-colors"
                                  >
                                    <span>{player.nickname} <span className="text-white/40 font-normal">({player.role})</span></span>
                                    <span className="text-[#ff8f00] font-mono text-[10px]">CS: {Number(player.rating).toFixed(2)}</span>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setActiveAddingSlot({ teamId: currentRosterTeam.id, index: i })}
                            className="flex items-center justify-center gap-2 cursor-pointer w-full h-full text-white/40 hover:text-white transition-colors"
                          >
                            <Plus className="w-5 h-5 text-[#ff8f00]" />
                            <span className="text-sm font-black uppercase tracking-wider">Слот {i + 1} (Добавить игрока)</span>
                          </button>
                        )}
                      </div>
                    );
                  }
                  const currentValRating = editingValRatings[p.id] !== undefined ? editingValRatings[p.id] : (p.valRating || 0);
                  const currentRating = editingRatings[p.id] !== undefined ? editingRatings[p.id] : (p.rating || 100);
                  
                  return (
                    <div key={i} className="flex flex-wrap items-center gap-3 bg-[#1a1a24]/80 border border-white/5 p-3 rounded-xl">
                      <PlayerAvatar playerName={p.nickname} avatarUrl={p.avatarUrl} sizeClassName="w-12 h-12" />
                      <div className="flex-1 min-w-[120px]">
                        <div className="text-sm font-black uppercase text-white tracking-wider">{p.nickname}</div>
                        <div className="text-[10px] text-white/40 font-bold mt-1">Роль: {p.role}</div>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5" title="Рейтинг для матчей (CS)">
                          <span className="text-[10px] text-blue-400 uppercase font-bold tracking-widest">CS:</span>
                          <input
                            type="number"
                            value={currentRating}
                            onChange={(e) => setEditingRatings(prev => ({ ...prev, [p.id]: Number(e.target.value) }))}
                            className="w-16 bg-black/50 border border-white/10 rounded text-center text-blue-400 font-mono focus:border-blue-500/50 outline-none p-1 text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-1.5" title="Рейтинг VAC (Pts)">
                          <span className="text-[10px] text-[#ff8f00] uppercase font-bold tracking-widest">VAC:</span>
                          <input
                            type="number"
                            value={currentValRating}
                            onChange={(e) => setEditingValRatings(prev => ({ ...prev, [p.id]: Number(e.target.value) }))}
                            className="w-20 bg-black/50 border border-white/10 rounded text-center text-[#ff8f00] font-mono focus:border-[#ff8f00]/50 outline-none p-1 text-xs"
                          />
                        </div>
                      </div>
                      <button onClick={() => {
                        if (window.confirm(`Вы уверены, что хотите убрать игрока ${p.nickname} из команды? Он станет свободным агентом.`)) {
                          handleRemovePlayerFromTeam(currentRosterTeam.id, i);
                        }
                      }} className="ml-auto text-white/20 hover:text-red-500 cursor-pointer p-2 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <button 
                onClick={handleUpdateTeamRoster}
                className="w-full py-4 bg-[#ff8f00] hover:bg-[#ff8f00]/90 text-black font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,143,0,0.2)]"
              >
                <Check className="w-5 h-5" />
                Сохранить состав и рейтинги
              </button>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
