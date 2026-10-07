import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, deleteDoc, doc, limit, addDoc, updateDoc } from '../firebase';
import { saveMatchesToLocalStorage, safeLocalStorageSet } from '../lib/utils';
import { Calendar, Trophy, Crosshair, Trash2, FolderPlus, Folder, FolderOpen, MoreVertical, Edit2, Check, X, ChevronRight, LayoutGrid, List, Layers, Plus } from 'lucide-react';
import MatchDetails from './MatchDetails';
import TeamLogo from './TeamLogo';
import { useGameUniverse } from '../lib/gameUniverse';
import { getCanonicalRoomId, loadTournaments } from './setka_tourn/storage';
import { syncAndBackfillTournamentMatches } from '../lib/tournamentMatchRecorder';
import { MatchFolder, MatchStage } from '../types';

export default function Matches({ user }: { user: any }) {
  const [game] = useGameUniverse();
  const [matches, setMatches] = useState<any[]>([]);
  const [folders, setFolders] = useState<MatchFolder[]>([]);
  const [stages, setStages] = useState<MatchStage[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingStage, setIsCreatingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState('');
  const [movingMatchId, setMovingMatchId] = useState<string | null>(null);
  const [movingToStageMatchId, setMovingToStageMatchId] = useState<string | null>(null);

  const roomId = useMemo(() => user ? getCanonicalRoomId(user.uid, game) : 'guest', [user, game]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchMatchesAndFolders = async () => {
      // 1. Fetch Folders
      const fetchFolders = async () => {
        try {
          const q = query(collection(db, 'matchFolders'), where('userId', '==', roomId), where('gameMode', '==', game));
          const qs = await getDocs(q);
          const dbFolders = qs.docs.map(d => ({ id: d.id, ...d.data() } as MatchFolder));
          
          if (dbFolders.length > 0) {
            setFolders(dbFolders);
            safeLocalStorageSet(`match_folders_${roomId}_${game}`, dbFolders);
          } else {
            const localFolders = JSON.parse(localStorage.getItem(`match_folders_${roomId}_${game}`) || '[]');
            setFolders(localFolders);
          }
        } catch (e) {
          const localFolders = JSON.parse(localStorage.getItem(`match_folders_${roomId}_${game}`) || '[]');
          setFolders(localFolders);
        }
      };

      await fetchFolders();

      // 1.5 Fetch Stages
      const fetchStages = async () => {
        try {
          const q = query(collection(db, 'matchStages'), where('userId', '==', roomId));
          const qs = await getDocs(q);
          const dbStages = qs.docs.map(d => ({ id: d.id, ...d.data() } as MatchStage));
          
          if (dbStages.length > 0) {
            setStages(dbStages);
            safeLocalStorageSet(`match_stages_${roomId}`, dbStages);
          } else {
            const localStages = JSON.parse(localStorage.getItem(`match_stages_${roomId}`) || '[]');
            setStages(localStages);
          }
        } catch (e) {
          const localStages = JSON.parse(localStorage.getItem(`match_stages_${roomId}`) || '[]');
          setStages(localStages);
        }
      };

      await fetchStages();

      const deletedRaw = localStorage.getItem(`deleted_matches_${roomId}`) || localStorage.getItem(`deleted_matches_${user.uid}`);
      const deletedSet = new Set<string>(deletedRaw ? JSON.parse(deletedRaw) : []);

      // 1. Proactively backfill any finished tournament matches if available
      try {
        const userTournaments = loadTournaments(roomId);
        userTournaments.forEach(t => {
          if (t && t.id) {
            syncAndBackfillTournamentMatches(roomId, t);
          }
        });
      } catch (err) {}

      // 2. Load from localStorage immediately for high responsiveness
      let rawLocalMatches = JSON.parse(localStorage.getItem(`matches_${roomId}`) || localStorage.getItem(`matches_${user.uid}`) || '[]');

      // 3. If local matches are empty, immediately query backup data from server
      if (!Array.isArray(rawLocalMatches) || rawLocalMatches.length === 0) {
        try {
          const res = await fetch(`/api/backup-data/${roomId}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.success && Array.isArray(data.matches) && data.matches.length > 0) {
              rawLocalMatches = data.matches;
              saveMatchesToLocalStorage(roomId, rawLocalMatches);
              if (roomId !== user.uid) saveMatchesToLocalStorage(user.uid, rawLocalMatches);
            }
          }
        } catch (e) {}
      }

      const isGameMatch = (m: any) => {
        const mGame = (m.gameMode || '').toLowerCase();
        
        // If tournament name contains SO2 or S2, it's likely SO2
        const tName = (m.tournamentName || '').toLowerCase();
        const isLikelySO2 = mGame === 'so2' || mGame === 's2' || mGame === 'standoff2' || mGame === 'standoff 2' || 
                           tName.includes('standoff') || tName.includes('so2') || tName.includes(' s2');

        if (game === 'so2') {
          return isLikelySO2;
        }
        
        // Default to CS2 if not explicitly SO2 and we are in CS2 world
        if (game === 'cs2') {
          return !isLikelySO2 || mGame === 'cs2' || mGame === 'csgo' || mGame === '5v5';
        }
        
        return mGame === game;
      };

      const localMatches = (rawLocalMatches || [])
        .filter((m: any) => m !== null && m !== undefined)
        .map((m: any, idx: number) => ({
          ...m,
          id: m.id || m._id || `local_match_${m.date ? new Date(m.date).getTime() : idx}`,
          team1Name: m.team1Name || m.team1?.name || (typeof m.team1 === 'string' ? m.team1 : '') || 'Команда 1',
          team2Name: m.team2Name || m.team2?.name || (typeof m.team2 === 'string' ? m.team2 : '') || 'Команда 2',
          team1Score: m.team1Score ?? m.score1 ?? (m.maps?.[0] ? (m.maps[0].team1Score ?? m.maps[0].score1 ?? 0) : 0),
          team2Score: m.team2Score ?? m.score2 ?? (m.maps?.[0] ? (m.maps[0].team2Score ?? m.maps[0].score2 ?? 0) : 0),
          gameMode: m.gameMode || 'cs2',
          format: m.format || (m.bo ? `BO${m.bo}` : 'BO1')
        }))
        .filter((m: any) => !deletedSet.has(m.id))
        .filter(isGameMatch);

      setMatches(localMatches.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);

      try {
        if (user.isLocalDemo) {
          return;
        }
        // Safe query without composite index requirement (sort in-memory)
        const q = query(collection(db, 'matches'), where('userId', '==', roomId), limit(150));
        const qs = await getDocs(q);
        
        let allDocs = qs.docs;
        if (allDocs.length === 0) {
          const qChannel = query(collection(db, 'matches'), where('channelId', '==', roomId), limit(150));
          const qsChannel = await getDocs(qChannel);
          allDocs = qsChannel.docs;
        }

        const dbMatches = allDocs
          .map(d => {
            const m = d.data();
            return {
              ...m,
              id: d.id || m.id || m._id,
              team1Name: m.team1Name || m.team1?.name || (typeof m.team1 === 'string' ? m.team1 : '') || 'Команда 1',
              team2Name: m.team2Name || m.team2?.name || (typeof m.team2 === 'string' ? m.team2 : '') || 'Команда 2',
              team1Score: m.team1Score ?? m.score1 ?? (m.maps?.[0] ? (m.maps[0].team1Score ?? m.maps[0].score1 ?? 0) : 0),
              team2Score: m.team2Score ?? m.score2 ?? (m.maps?.[0] ? (m.maps[0].team2Score ?? m.maps[0].score2 ?? 0) : 0),
              gameMode: m.gameMode || 'cs2',
              format: m.format || (m.bo ? `BO${m.bo}` : 'BO1')
            };
          })
          .filter((m: any) => m && m.id && !deletedSet.has(m.id))
          .filter(isGameMatch)
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (dbMatches.length > 0) {
          setMatches(dbMatches);
          try {
            saveMatchesToLocalStorage(roomId, dbMatches);
          } catch (e) {}
        }
      } catch (e) {
        console.warn("Using localStorage/server fallback for matches", e);
      }
    };
    fetchMatchesAndFolders();

    const handleDbUpdated = () => {
      fetchMatchesAndFolders();
    };

    window.addEventListener('db-user-updated', handleDbUpdated);

    return () => {
      window.removeEventListener('db-user-updated', handleDbUpdated);
    };
  }, [user, game]);

  const handleDelete = async (matchId: string) => {
    if (!matchId) return;
    const roomId = getCanonicalRoomId(user.uid, game);

    // 1. Mark in deleted_matches set immediately
    const deletedRaw = localStorage.getItem(`deleted_matches_${roomId}`) || localStorage.getItem(`deleted_matches_${user.uid}`);
    const deletedSet = new Set<string>(deletedRaw ? JSON.parse(deletedRaw) : []);
    deletedSet.add(matchId);
    try {
      localStorage.setItem(`deleted_matches_${roomId}`, JSON.stringify(Array.from(deletedSet)));
    } catch (e) {}

    // 2. Filter local state and save to localStorage
    const filtered = matches.filter(m => m.id !== matchId && m._id !== matchId);
    saveMatchesToLocalStorage(roomId, filtered);
    setMatches(filtered);
    setConfirmingDelete(null);
    if (selectedMatch?.id === matchId || selectedMatch?._id === matchId) {
      setSelectedMatch(null);
    }

    // 3. Dispatch update event immediately for instant UI reaction
    window.dispatchEvent(new Event('db-user-updated'));

    // 4. Perform async backup & server deletions
    try {
      try {
        const { migrateMatchesToMapStats } = await import('../lib/mapStats');
        migrateMatchesToMapStats(roomId, matches);
      } catch (e) {}

      // Delete from Firestore / Local DB
      await deleteDoc(doc(db, 'matches', matchId));

      // Delete from backend server storage
      await fetch('/api/matches/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: roomId, matchId })
      }).catch(() => {});

      // Sync updated array with server
      await fetch('/api/sync-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: roomId, matches: filtered })
      }).catch(() => {});
    } catch (e) {
      console.warn("Match deletion backend sync:", e);
    }
  };

  const handleDeleteAll = async () => {
    const roomId = getCanonicalRoomId(user.uid, game);

    // 1. Mark all existing match IDs as deleted
    const deletedRaw = localStorage.getItem(`deleted_matches_${roomId}`) || localStorage.getItem(`deleted_matches_${user.uid}`);
    const deletedSet = new Set<string>(deletedRaw ? JSON.parse(deletedRaw) : []);
    matches.forEach(m => {
      if (m.id) deletedSet.add(m.id);
      if (m._id) deletedSet.add(m._id);
    });
    try {
      localStorage.setItem(`deleted_matches_${roomId}`, JSON.stringify(Array.from(deletedSet)));
    } catch (e) {}

    // 2. Clear localStorage and local state immediately
    saveMatchesToLocalStorage(roomId, []);
    setMatches([]);
    setConfirmingDeleteAll(false);
    setSelectedMatch(null);

    // 3. Dispatch update event immediately
    window.dispatchEvent(new Event('db-user-updated'));

    // 4. Async background cleanup across database and backend
    try {
      // Migrate matches to map stats so maps winrate data is preserved separately forever
      try {
        const { migrateMatchesToMapStats } = await import('../lib/mapStats');
        migrateMatchesToMapStats(roomId, matches);
      } catch (migrateErr) {
        console.error("Migration during delete all failed", migrateErr);
      }

      if (!user.isLocalDemo) {
        // Delete all matches from Firestore for this user
        const q1 = query(collection(db, 'matches'), where('userId', '==', roomId));
        const qs1 = await getDocs(q1);
        const batchPromises1 = qs1.docs.map(d => deleteDoc(doc(db, 'matches', d.id)));

        const q2 = query(collection(db, 'matches'), where('channelId', '==', roomId));
        const qs2 = await getDocs(q2);
        const batchPromises2 = qs2.docs.map(d => deleteDoc(doc(db, 'matches', d.id)));

        await Promise.allSettled([...batchPromises1, ...batchPromises2]);
      }

      // Clear all matches on backend server
      await fetch(`/api/matches/clear/${roomId}`, { method: 'POST' }).catch(() => {});

      // Sync empty array to server
      await fetch('/api/sync-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: roomId, matches: [] })
      }).catch(() => {});
    } catch (e) {
      console.warn("Delete all matches backend sync:", e);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const folder: Partial<MatchFolder> = {
      name: newFolderName.trim(),
      userId: roomId,
      gameMode: game,
      createdAt: Date.now()
    };
    try {
      const res = await addDoc(collection(db, 'matchFolders'), folder);
      const fullFolder = { id: res.id, ...folder } as MatchFolder;
      const updatedFolders = [...folders, fullFolder];
      setFolders(updatedFolders);
      safeLocalStorageSet(`match_folders_${roomId}_${game}`, updatedFolders);
      setNewFolderName('');
      setIsCreatingFolder(false);
    } catch (e) {
      console.error("Create folder error:", e);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!window.confirm("Удалить папку? Матчи из нее не удалятся, а просто станут без папки.")) return;
    try {
      await deleteDoc(doc(db, 'matchFolders', folderId));
      const updatedFolders = folders.filter(f => f.id !== folderId);
      setFolders(updatedFolders);
      safeLocalStorageSet(`match_folders_${roomId}_${game}`, updatedFolders);
      if (selectedFolderId === folderId) setSelectedFolderId(null);
      
      // Update matches that were in this folder
      const updatedMatches = matches.map(m => m.folderId === folderId ? { ...m, folderId: undefined } : m);
      setMatches(updatedMatches);
    } catch (e) {
      console.error("Delete folder error:", e);
    }
  };

  const handleRenameFolder = async (folderId: string) => {
    if (!editingFolderName.trim()) return;
    try {
      await updateDoc(doc(db, 'matchFolders', folderId), { name: editingFolderName.trim() });
      const updatedFolders = folders.map(f => f.id === folderId ? { ...f, name: editingFolderName.trim() } : f);
      setFolders(updatedFolders);
      safeLocalStorageSet(`match_folders_${roomId}_${game}`, updatedFolders);
      setEditingFolderId(null);
    } catch (e) {
      console.error("Rename folder error:", e);
    }
  };

  const handleCreateStage = async () => {
    if (!newStageName.trim() || !selectedFolderId) return;
    const stage: Partial<MatchStage> = {
      name: newStageName.trim(),
      folderId: selectedFolderId,
      userId: roomId,
      createdAt: Date.now()
    };
    try {
      const res = await addDoc(collection(db, 'matchStages'), stage);
      const fullStage = { id: res.id, ...stage } as MatchStage;
      const updatedStages = [...stages, fullStage];
      setStages(updatedStages);
      safeLocalStorageSet(`match_stages_${roomId}`, updatedStages);
      setNewStageName('');
      setIsCreatingStage(false);
    } catch (e) {
      console.error("Create stage error:", e);
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!window.confirm("Удалить стадию? Матчи из нее не удалятся, а просто останутся в папке без стадии.")) return;
    try {
      await deleteDoc(doc(db, 'matchStages', stageId));
      const updatedStages = stages.filter(s => s.id !== stageId);
      setStages(updatedStages);
      safeLocalStorageSet(`match_stages_${roomId}`, updatedStages);
      if (selectedStageId === stageId) setSelectedStageId(null);
      
      // Update matches that were in this stage
      const updatedMatches = matches.map(m => m.stageId === stageId ? { ...m, stageId: undefined } : m);
      setMatches(updatedMatches);
    } catch (e) {
      console.error("Delete stage error:", e);
    }
  };

  const handleRenameStage = async (stageId: string) => {
    if (!editingStageName.trim()) return;
    try {
      await updateDoc(doc(db, 'matchStages', stageId), { name: editingStageName.trim() });
      const updatedStages = stages.map(s => s.id === stageId ? { ...s, name: editingStageName.trim() } : s);
      setStages(updatedStages);
      safeLocalStorageSet(`match_stages_${roomId}`, updatedStages);
      setEditingStageId(null);
    } catch (e) {
      console.error("Rename stage error:", e);
    }
  };

  const handleMoveMatchToFolder = async (matchId: string, folderId: string | null) => {
    try {
      // Clear stageId when moving to a different folder or none
      const updates: any = { folderId: folderId || null };
      if (folderId === null) updates.stageId = null;

      await updateDoc(doc(db, 'matches', matchId), updates);
      const updatedMatches = matches.map(m => m.id === matchId ? { ...m, folderId: folderId || undefined, stageId: folderId === null ? undefined : m.stageId } : m);
      setMatches(updatedMatches);
      saveMatchesToLocalStorage(roomId, updatedMatches);
      setMovingMatchId(null);
    } catch (e) {
      console.error("Move match error:", e);
      const updatedMatches = matches.map(m => m.id === matchId ? { ...m, folderId: folderId || undefined, stageId: folderId === null ? undefined : m.stageId } : m);
      setMatches(updatedMatches);
      saveMatchesToLocalStorage(roomId, updatedMatches);
      setMovingMatchId(null);
    }
  };

  const handleMoveMatchToStage = async (matchId: string, stageId: string | null) => {
    try {
      await updateDoc(doc(db, 'matches', matchId), { stageId: stageId || null });
      const updatedMatches = matches.map(m => m.id === matchId ? { ...m, stageId: stageId || undefined } : m);
      setMatches(updatedMatches);
      saveMatchesToLocalStorage(roomId, updatedMatches);
      setMovingToStageMatchId(null);
    } catch (e) {
      console.error("Move match to stage error:", e);
      const updatedMatches = matches.map(m => m.id === matchId ? { ...m, stageId: stageId || undefined } : m);
      setMatches(updatedMatches);
      saveMatchesToLocalStorage(roomId, updatedMatches);
      setMovingToStageMatchId(null);
    }
  };

  const filteredMatches = useMemo(() => {
    let result = matches;
    if (selectedFolderId === 'none') {
      result = result.filter(m => !m.folderId);
    } else if (selectedFolderId) {
      result = result.filter(m => m.folderId === selectedFolderId);
    }

    if (selectedStageId === 'none') {
      result = result.filter(m => !m.stageId);
    } else if (selectedStageId) {
      result = result.filter(m => m.stageId === selectedStageId);
    }

    return result;
  }, [matches, selectedFolderId, selectedStageId]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/50 gap-4">
        <Calendar className="w-16 h-16" />
        <h2 className="text-xl font-bold">Войдите, чтобы просматривать историю матчей.</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {selectedMatch && (
        <MatchDetails match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      )}
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-2xl p-8 border border-white/10 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 uppercase tracking-widest flex items-center gap-3">
              <Calendar className="text-blue-400" />
              История матчей ({game === 'so2' ? 'SO2' : 'CS2'})
            </h1>
            <p className="text-white/60 text-sm mt-2 font-medium">Организуйте свои матчи по папкам и категориям</p>
          </div>
          
          <div className="flex gap-2">
            {matches.length > 0 && (
              <div className="relative">
                {confirmingDeleteAll ? (
                  <div className="flex flex-col md:flex-row items-center gap-3 bg-[#13131c] p-3 rounded-xl border border-red-500/30 shadow-lg animate-fade-in z-20">
                    <span className="text-xs text-red-400 font-bold px-2 text-center">
                      Удалить ВСЕ матчи? Винрейт карт сохранится отдельно.
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleDeleteAll} 
                        className="px-3 py-1.5 bg-red-500/20 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500/40 transition-colors cursor-pointer"
                      >
                        Да, удалить
                      </button>
                      <button 
                        onClick={() => setConfirmingDeleteAll(false)} 
                        className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/20 transition-colors cursor-pointer"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setConfirmingDeleteAll(true)}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl font-bold text-sm transition-colors border border-red-500/20 flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    УДАЛИТЬ ВСЕ
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar: Folders */}
        <div className="lg:w-64 shrink-0 flex flex-col gap-4">
          <div className="bg-[#12121a] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Папки</span>
              <button 
                onClick={() => setIsCreatingFolder(true)}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-blue-400 transition-colors"
                title="Создать папку"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            </div>

            {isCreatingFolder && (
              <div className="flex flex-col gap-2 bg-black/40 p-2 rounded-xl border border-blue-500/30 animate-fade-in">
                <div className="flex items-center gap-2">
                  <input 
                    autoFocus
                    type="text"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    placeholder="Название..."
                    className="bg-transparent border-none outline-none text-xs font-bold text-white w-full"
                    onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                  />
                  <button onClick={handleCreateFolder} className="text-emerald-400"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setIsCreatingFolder(false)} className="text-red-400"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {['Квалификации', 'Групповой этап', 'Плей-офф'].map(suggested => (
                    <button 
                      key={suggested}
                      onClick={() => { setNewFolderName(suggested); }}
                      className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold text-white/40 hover:text-blue-400 transition-colors border border-white/5"
                    >
                      + {suggested}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button 
              onClick={() => setSelectedFolderId(null)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${!selectedFolderId ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Все матчи</span>
              <span className="ml-auto text-[10px] bg-white/5 px-1.5 py-0.5 rounded-lg">{matches.length}</span>
            </button>

            <button 
              onClick={() => setSelectedFolderId('none')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedFolderId === 'none' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
            >
              <Folder className="w-4 h-4" />
              <span>Без папки</span>
              <span className="ml-auto text-[10px] bg-white/5 px-1.5 py-0.5 rounded-lg">{matches.filter(m => !m.folderId).length}</span>
            </button>

            <div className="h-px bg-white/5 my-1" />

            <div className="flex flex-col gap-1 overflow-y-auto max-h-[400px] pr-1 custom-scrollbar">
              {folders.map(folder => (
                <div key={folder.id} className="group relative">
                  <button 
                    onClick={() => { setSelectedFolderId(folder.id); setSelectedStageId(null); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedFolderId === folder.id ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(147,51,234,0.1)]' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
                  >
                    {selectedFolderId === folder.id ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                    {editingFolderId === folder.id ? (
                      <input 
                        autoFocus
                        value={editingFolderName}
                        onChange={e => setEditingFolderName(e.target.value)}
                        onBlur={() => handleRenameFolder(folder.id)}
                        onKeyDown={e => e.key === 'Enter' && handleRenameFolder(folder.id)}
                        className="bg-black/40 border-none outline-none text-sm font-bold text-white w-full"
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span className="truncate">{folder.name}</span>
                    )}
                    <span className="ml-auto text-[10px] bg-white/5 px-1.5 py-0.5 rounded-lg">{matches.filter(m => m.folderId === folder.id).length}</span>
                  </button>
                  
                  <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingFolderId(folder.id); setEditingFolderName(folder.name); }}
                      className="p-1 hover:text-blue-400 transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                      className="p-1 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content: Matches List */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="text-blue-400/50 p-8 text-center font-bold animate-pulse flex flex-col items-center gap-3 bg-[#12121a] rounded-2xl border border-white/5">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Загрузка истории...</span>
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="text-white/30 p-20 text-center font-bold bg-[#12121a] rounded-3xl border border-white/5 flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                <Crosshair className="w-10 h-10 opacity-30" />
              </div>
              <div>
                <h3 className="text-xl text-white/80 mb-2">Матчи не найдены</h3>
                <p className="text-sm font-medium max-w-xs mx-auto">
                  {selectedStageId 
                    ? "В этой стадии пока пусто. Переместите сюда матчи."
                    : selectedFolderId === 'none' 
                      ? "У всех ваших матчей уже есть папки! Отличная организация."
                      : selectedFolderId 
                        ? "В этой папке пока пусто. Переместите сюда матчи из общей истории."
                        : "Пока нет сыгранных матчей. Время запустить симуляцию!"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest">
                  <List className="w-3 h-3" />
                  <span>Список ({filteredMatches.length})</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {filteredMatches.map((m, i) => {
                  const isBO1 = m.bo === 1 || m.bo === '1' || m.format === 'BO1' || (m.maps && m.maps.length === 1);
                  const actualT1Score = (isBO1 && m.maps?.length > 0) ? m.maps[0].team1Score : m.team1Score;
                  const actualT2Score = (isBO1 && m.maps?.length > 0) ? m.maps[0].team2Score : m.team2Score;
                  const t1Wins = actualT1Score > actualT2Score;
                  const t2Wins = actualT2Score > actualT1Score;
                  
                  const folder = folders.find(f => f.id === m.folderId);
                  const stage = stages.find(s => s.id === m.stageId);
                  
                  return (
                    <div key={m.id || i} onClick={() => setSelectedMatch(m)} className="cursor-pointer group bg-gradient-to-r from-[#161622] to-[#1a1a24] rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all duration-300 overflow-hidden shadow-md hover:shadow-2xl hover:shadow-blue-500/10">
                      <div className="flex flex-col md:flex-row">
                        {/* Info Section */}
                        <div className="p-5 md:w-1/4 border-b md:border-b-0 md:border-r border-white/5 flex flex-col justify-center bg-black/20">
                          <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">
                            {new Date(m.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                              {m.gameMode === 'so2' ? 'SO2' : 'CS2'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              {m.format}
                            </span>
                          </div>
                          {m.tournamentName && (
                            <div className="text-xs font-bold text-white/60 flex items-center gap-2 truncate">
                              <Trophy className="w-3 h-3 text-yellow-500 shrink-0" />
                              <span className="truncate">{m.tournamentName}</span>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {folder && (
                              <div className="text-[10px] font-black text-purple-400 flex items-center gap-1.5 bg-purple-500/10 w-fit px-2 py-1 rounded-lg border border-purple-500/20">
                                <Folder className="w-3 h-3" />
                                {folder.name}
                              </div>
                            )}
                            {stage && (
                              <div className="text-[10px] font-black text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 w-fit px-2 py-1 rounded-lg border border-emerald-500/20">
                                <Layers className="w-3 h-3" />
                                {stage.name}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Score Section */}
                        <div className="p-6 md:w-1/2 flex items-center justify-between relative">
                          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="relative">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setMovingMatchId(movingMatchId === m.id ? null : m.id); }}
                                className="p-2 text-blue-400/50 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                title="Переместить в папку"
                              >
                                <FolderPlus className="w-4 h-4" />
                              </button>
                              
                              {movingMatchId === m.id && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl z-30 p-2 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                                  <div className="text-[10px] font-black text-white/30 uppercase tracking-widest p-2 border-b border-white/5 mb-1">Переместить в:</div>
                                  <button 
                                    onClick={() => handleMoveMatchToFolder(m.id, null)}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-white/60 hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2"
                                  >
                                    <Folder className="w-3.5 h-3.5 text-amber-500" /> Без папки
                                  </button>
                                  {folders.map(f => (
                                    <button 
                                      key={f.id}
                                      onClick={() => handleMoveMatchToFolder(m.id, f.id)}
                                      className="w-full text-left px-3 py-2 text-xs font-bold text-white/60 hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2"
                                    >
                                      <Folder className="w-3.5 h-3.5 text-purple-400" /> {f.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Move to Stage button (only if folder selected) */}
                            {m.folderId && (
                               <div className="relative">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); setMovingToStageMatchId(movingToStageMatchId === m.id ? null : m.id); }}
                                   className="p-2 text-emerald-400/50 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                   title="Переместить в стадию"
                                 >
                                   <Layers className="w-4 h-4" />
                                 </button>
                                 
                                 {movingToStageMatchId === m.id && (
                                   <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl z-30 p-2 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                                     <div className="text-[10px] font-black text-white/30 uppercase tracking-widest p-2 border-b border-white/5 mb-1">Стадия:</div>
                                     <button 
                                       onClick={() => handleMoveMatchToStage(m.id, null)}
                                       className="w-full text-left px-3 py-2 text-xs font-bold text-white/60 hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2"
                                     >
                                       <Layers className="w-3.5 h-3.5 text-gray-400" /> Без стадии
                                     </button>
                                     {stages.filter(s => s.folderId === m.folderId).map(s => (
                                       <button 
                                         key={s.id}
                                         onClick={() => handleMoveMatchToStage(m.id, s.id)}
                                         className="w-full text-left px-3 py-2 text-xs font-bold text-white/60 hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2"
                                       >
                                         <Layers className="w-3.5 h-3.5 text-emerald-400" /> {s.name}
                                       </button>
                                     ))}
                                   </div>
                                 )}
                               </div>
                            )}

                            <button 
                              onClick={(e) => { e.stopPropagation(); setConfirmingDelete(m.id); }}
                              className="p-2 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Удалить матч"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {confirmingDelete === m.id && (
                            <div className="absolute top-2 right-12 flex items-center gap-2 bg-[#1a1a24] p-1 rounded-lg border border-red-500/30 z-10 shadow-lg" onClick={(e) => e.stopPropagation()}>
                               <span className="text-xs text-red-400 font-bold px-2">Удалить?</span>
                               <button onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }} className="px-2 py-1 bg-red-500/20 text-red-500 rounded text-xs font-bold hover:bg-red-500/40 cursor-pointer">Да</button>
                               <button onClick={(e) => { e.stopPropagation(); setConfirmingDelete(null); }} className="px-2 py-1 bg-white/10 text-white rounded text-xs font-bold hover:bg-white/20 cursor-pointer">Нет</button>
                            </div>
                          )}
                          
                          <div className={`flex-1 text-right ${t1Wins ? 'text-white font-black drop-shadow-[0_0_15px_rgba(255,143,0,0.4)]' : 'text-white/40 font-bold'}`}>
                            <div className="flex items-center justify-end gap-3">
                              <div className={`text-lg md:text-xl truncate ${t1Wins ? 'text-[#ff8f00]' : ''}`}>{m.team1Name}</div>
                              <TeamLogo game={m.gameMode} teamName={m.team1Name} sizeClassName="w-8 h-8 md:w-10 md:h-10 text-xs" />
                            </div>
                          </div>
                          
                          <div className="px-6 flex flex-col items-center">
                            <div className="text-2xl md:text-3xl font-black tracking-widest flex items-center gap-2">
                              <span className={t1Wins ? 'text-[#ff8f00]' : 'text-white/40'}>{actualT1Score}</span>
                              <span className="text-white/10 text-xl">:</span>
                              <span className={t2Wins ? 'text-blue-400' : 'text-white/40'}>{actualT2Score}</span>
                            </div>
                          </div>
                          
                          <div className={`flex-1 text-left ${t2Wins ? 'text-white font-black drop-shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'text-white/40 font-bold'}`}>
                            <div className="flex items-center justify-start gap-3">
                              <TeamLogo game={m.gameMode} teamName={m.team2Name} sizeClassName="w-8 h-8 md:w-10 md:h-10 text-xs" />
                              <div className={`text-lg md:text-xl truncate ${t2Wins ? 'text-blue-400' : ''}`}>{m.team2Name}</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* MVP Section */}
                        <div className="p-5 md:w-1/4 flex flex-col justify-center items-center md:items-end border-t md:border-t-0 md:border-l border-white/5 bg-gradient-to-l from-yellow-500/5 to-transparent">
                          {m.mvp ? (
                            <div className="flex flex-col items-center md:items-end group-hover:scale-105 transition-transform">
                              <div className="text-[10px] font-black text-yellow-500/80 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Trophy className="w-3 h-3" /> MVP
                              </div>
                              <div className="font-bold text-white text-base md:text-lg truncate max-w-full">{m.mvp.nickname}</div>
                              <div className="text-[10px] font-bold text-white/40 mt-1">
                                <span className="text-yellow-400/80">{m.mvp.hltvRating} Rating</span> • {m.mvp.kills}K
                              </div>
                            </div>
                          ) : (
                            <div className="text-white/10 text-[10px] font-black uppercase tracking-[0.2em]">
                              MVP N/A
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Stages (Right) */}
        {selectedFolderId && selectedFolderId !== 'none' && (
          <div className="lg:w-64 shrink-0 flex flex-col gap-4 animate-fade-in">
            <div className="bg-[#12121a] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Стадии</span>
                <button 
                  onClick={() => setIsCreatingStage(true)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-emerald-400 transition-colors"
                  title="Создать стадию"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {isCreatingStage && (
                <div className="flex flex-col gap-2 bg-black/40 p-2 rounded-xl border border-emerald-500/30 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <input 
                      autoFocus
                      type="text"
                      value={newStageName}
                      onChange={e => setNewStageName(e.target.value)}
                      placeholder="Название..."
                      className="bg-transparent border-none outline-none text-xs font-bold text-white w-full"
                      onKeyDown={e => e.key === 'Enter' && handleCreateStage()}
                    />
                    <button onClick={handleCreateStage} className="text-emerald-400"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setIsCreatingStage(false)} className="text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {['Квалификации', 'Группа', 'Плей-офф'].map(suggested => (
                      <button 
                        key={suggested}
                        onClick={() => { setNewStageName(suggested); }}
                        className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold text-white/40 hover:text-emerald-400 transition-colors border border-white/5"
                      >
                        + {suggested}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={() => setSelectedStageId(null)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${!selectedStageId ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Все стадии</span>
                <span className="ml-auto text-[10px] bg-white/5 px-1.5 py-0.5 rounded-lg">{matches.filter(m => m.folderId === selectedFolderId).length}</span>
              </button>

              <button 
                onClick={() => setSelectedStageId('none')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedStageId === 'none' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
              >
                <Layers className="w-4 h-4" />
                <span>Без стадии</span>
                <span className="ml-auto text-[10px] bg-white/5 px-1.5 py-0.5 rounded-lg">{matches.filter(m => m.folderId === selectedFolderId && !m.stageId).length}</span>
              </button>

              <div className="h-px bg-white/5 my-1" />

              <div className="flex flex-col gap-1 overflow-y-auto max-h-[400px] pr-1 custom-scrollbar">
                {stages.filter(stage => stage.folderId === selectedFolderId).map(stage => (
                  <div key={stage.id} className="group relative">
                    <button 
                      onClick={() => setSelectedStageId(stage.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedStageId === stage.id ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
                    >
                      <Layers className="w-4 h-4" />
                      {editingStageId === stage.id ? (
                        <input 
                          autoFocus
                          value={editingStageName}
                          onChange={e => setEditingStageName(e.target.value)}
                          onBlur={() => handleRenameStage(stage.id)}
                          onKeyDown={e => e.key === 'Enter' && handleRenameStage(stage.id)}
                          className="bg-black/40 border-none outline-none text-sm font-bold text-white w-full"
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span className="truncate">{stage.name}</span>
                      )}
                      <span className="ml-auto text-[10px] bg-white/5 px-1.5 py-0.5 rounded-lg">{matches.filter(m => m.stageId === stage.id).length}</span>
                    </button>
                    
                    <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingStageId(stage.id); setEditingStageName(stage.name); }}
                        className="p-1 hover:text-blue-400 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteStage(stage.id); }}
                        className="p-1 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
