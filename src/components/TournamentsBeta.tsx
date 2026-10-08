import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Sparkles, Plus, Search, Calendar, Users, ChevronRight, LayoutGrid, List, Filter, Trash2, Check, X, Layers, RotateCcw, Download, Database, Flame, Eye, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { loadTournaments, deleteTournament, getCanonicalRoomId, saveTournament } from './setka_tourn/storage';
import { Tournament } from './setka_tourn/types';
import TournamentManager from './setka_tourn/TournamentManager';
import { getAutoMatchedVectorLogo } from '../lib/logoMatcher';
import { generateStageData } from './setka_tourn/stageGenerator';

export default function TournamentsBeta({ user }: { user: any }) {
  const { tournamentId } = useParams<{ tournamentId?: string }>();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'manager' | 'create'>(tournamentId ? 'manager' : 'list');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(tournamentId || null);
  const [searchQuery, setSearchQuery] = useState('');

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const roomId = getCanonicalRoomId(user?.channelId || user?.uid);

  useEffect(() => {
    refreshTournaments();
    
    const handleUpdate = () => refreshTournaments();
    window.addEventListener('tournaments-updated', handleUpdate);
    return () => window.removeEventListener('tournaments-updated', handleUpdate);
  }, [user]);

  const refreshTournaments = () => {
    setLoading(true);
    try {
      const data = loadTournaments(user?.channelId || user?.uid, true);
      setTournaments(data.sort((a, b) => {
        const dateA = a.createdAt ? (typeof a.createdAt === 'string' ? a.createdAt : new Date(a.createdAt).toISOString()) : '';
        const dateB = b.createdAt ? (typeof b.createdAt === 'string' ? b.createdAt : new Date(b.createdAt).toISOString()) : '';
        return dateB.localeCompare(dateA);
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setView('create');
  };

  const handleSelectTournament = (id: string) => {
    setSelectedTournamentId(id);
    setView('manager');
    navigate(`/tournaments-beta/${id}`);
  };

  const confirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    console.log(`[TournamentsBeta] !!! CLICK RECEIVED FOR DELETE: ${id} !!!`);
    setDeletingId(id);
  };

  const handleDelete = () => {
    if (deletingId) {
      deleteTournament(user?.channelId || user?.uid, deletingId);
      setDeletingId(null);
      refreshTournaments();
    }
  };

  if (view === 'manager' && selectedTournamentId) {
    return (
      <div className="w-full h-full">
        <TournamentManager 
          user={user} 
          tournamentId={selectedTournamentId} 
          onBack={() => {
            setView('list');
            setSelectedTournamentId(null);
            navigate('/tournaments-beta');
            refreshTournaments();
          }} 
        />
      </div>
    );
  }

  if (view === 'create') {
    return (
      <TournamentCreationFlow 
        user={user} 
        onCancel={() => setView('list')} 
        onComplete={(id) => {
          setSelectedTournamentId(id);
          setView('manager');
        }}
      />
    );
  }

  const filteredTournaments = tournaments.filter(t => 
    (t.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      <div className="max-w-[1800px] mx-auto p-4 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-red-500/10 w-16 h-16 rounded-2xl flex items-center justify-center text-red-500 mb-6">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Удалить турнир?</h3>
            <p className="text-zinc-500 mb-8 font-medium">Это действие необратимо. Все данные о матчах и сетках будут полностью удалены.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeletingId(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-black py-4 rounded-2xl transition-all"
              >
                ОТМЕНА
              </button>
              <button 
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-red-600/20"
              >
                УДАЛИТЬ
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-3 tracking-tight">
            ТУРНИРЫ <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded font-black uppercase shadow-[0_0_15px_rgba(234,179,8,0.4)]">BETA</span>
            <Sparkles className="text-yellow-400 w-6 h-6 animate-pulse" />
          </h1>
          <p className="text-zinc-500 mt-2 font-medium">Создавайте сетки, проводите квалификации и управляйте хабом</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={refreshTournaments}
            className="p-4 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-2xl transition-all hover:bg-zinc-800"
            title="Обновить список"
          >
            <RotateCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={handleCreateNew}
            className="bg-blue-600 hover:bg-blue-500 text-white font-black px-6 sm:px-12 py-3.5 sm:py-4.5 rounded-2xl flex items-center justify-center gap-3 transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-blue-600/20 group text-xs sm:text-sm tracking-wider cursor-pointer sm:min-w-[220px]"
          >
            <div className="bg-white/20 p-1.5 rounded-lg group-hover:rotate-90 transition-transform shrink-0">
              <Plus className="w-5 h-5" />
            </div>
            СОЗДАТЬ ТУРНИР
          </button>
        </div>
      </div>

      {/* Stats/Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl">
          <div className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-1">Всего турниров</div>
          <div className="text-3xl font-black text-white">{tournaments.length}</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl">
          <div className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-1">Активных</div>
          <div className="text-3xl font-black text-green-500">{tournaments.filter(t => !t.completed).length}</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl">
          <div className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-1">Завершено</div>
          <div className="text-3xl font-black text-blue-500">{tournaments.filter(t => t.completed).length}</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text"
            placeholder="Поиск турнира по названию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-blue-500/50 transition-all font-medium"
          />
        </div>
      </div>

      {/* Tournament Grid/List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-zinc-500 mt-4 font-bold animate-pulse">Загрузка турниров...</p>
        </div>
      ) : filteredTournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map(t => (
            <div 
              key={t.id}
              onClick={() => handleSelectTournament(t.id)}
              className="group bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-blue-500/50 hover:bg-zinc-800 transition-all cursor-pointer relative overflow-hidden shadow-2xl hover:shadow-blue-500/10"
            >
              <div className="absolute top-4 right-4 z-[60]">
                <button 
                  onClick={(e) => confirmDelete(e, t.id)}
                  className="p-3 bg-zinc-800/90 hover:bg-red-600 text-zinc-400 hover:text-white rounded-2xl transition-all transform hover:scale-110 active:scale-95 border border-zinc-700 hover:border-red-500 shadow-xl backdrop-blur-md group/trash pointer-events-auto"
                  title="Удалить турнир"
                >
                  <Trash2 className="w-5 h-5 transition-transform group-hover/trash:rotate-12" />
                </button>
              </div>

              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center border border-zinc-700/50 overflow-hidden shrink-0">
                  {t.logoUrl ? (
                    <img src={t.logoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Trophy className="w-8 h-8 text-zinc-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-black text-white truncate group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                    {t.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${t.game === 'so2' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {t.game === 'so2' ? 'Standoff 2' : 'CS2'}
                    </span>
                    {t.completed ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase bg-green-500/10 text-green-500">Завершен</span>
                    ) : (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase bg-blue-500/10 text-blue-500 animate-pulse">В процессе</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-zinc-600" />
                  <div className="text-xs">
                    <div className="text-zinc-500 font-black uppercase tracking-tighter">Команды</div>
                    <div className="text-white font-bold">{t.teams?.length || 0}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-zinc-600" />
                  <div className="text-xs">
                    <div className="text-zinc-500 font-black uppercase tracking-tighter">Дата</div>
                    <div className="text-white font-bold truncate">
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString('ru-RU') : 'Неизвестно'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between text-blue-500 font-black text-xs uppercase tracking-widest group-hover:gap-2 transition-all">
                Открыть управление
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900/30 border-2 border-dashed border-zinc-800 rounded-3xl p-12 text-center">
          <div className="bg-zinc-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-600">
            <Trophy className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-white mb-2">Турниров пока нет</h3>
          <p className="text-zinc-500 mb-8 max-w-sm mx-auto">Создайте свой первый турнир, чтобы начать управлять сетками и матчами!</p>
          <button 
            onClick={handleCreateNew}
            className="bg-zinc-800 hover:bg-zinc-700 text-white font-black px-8 py-3 rounded-2xl transition-all"
          >
            Создать первый турнир
          </button>
        </div>
      )}
    </div>
  </div>
);
}

/**
 * Tournament Creation Flow Component
 */
function TournamentCreationFlow({ user, onCancel, onComplete }: { user: any, onCancel: () => void, onComplete: (id: string) => void }) {
  const [step, setStep] = useState(1);
  const [selectedStageIdx, setSelectedStageIdx] = useState<number>(0);
  const [formData, setFormData] = useState({
    name: '',
    logoUrl: '',
    game: 'cs2' as 'cs2' | 'so2',
    stages: [{ type: 'playoff', teams: [] }] as any[]
  });

  const [inputTeamName, setInputTeamName] = useState('');
  const [globalTeams, setGlobalTeams] = useState<any[]>([]);
  const [showGlobalDb, setShowGlobalDb] = useState(false);
  const [stageFilterQuery, setStageFilterQuery] = useState('');
  const [teamTournamentCounts, setTeamTournamentCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (user?.uid) {
      const roomId = getCanonicalRoomId(user.channelId || user.uid);
      const stored = localStorage.getItem(`teams_${roomId}`) || localStorage.getItem(`teams_${user.uid}`);
      if (stored) {
        try {
          setGlobalTeams(JSON.parse(stored));
        } catch (e) {}
      }

      // Calculate tournament appearances count for every team
      try {
        const allTournaments = loadTournaments(user.channelId || user.uid, true) || [];
        const counts = new Map<string, number>();
        allTournaments.forEach(t => {
          (t.teams || []).forEach(tm => {
            if (tm?.name) {
              const k = tm.name.toLowerCase().trim();
              counts.set(k, (counts.get(k) || 0) + 1);
            }
          });
          (t.settings?.stages || []).forEach(stg => {
            (stg.teams || []).forEach(tm => {
              if (tm?.name) {
                const k = tm.name.toLowerCase().trim();
                counts.set(k, (counts.get(k) || 0) + 1);
              }
            });
          });
        });
        setTeamTournamentCounts(counts);
      } catch (e) {}
    }
  }, [user]);

  // Filter teams that actually appeared in tournaments, sorted by frequency
  const tournamentInviteTeams = React.useMemo(() => {
    const teamMap = new Map<string, { id?: string; name: string; logoUrl?: string; players?: any[]; count: number }>();

    try {
      const allTournaments = loadTournaments(user?.channelId || user?.uid, true) || [];
      const registerTeam = (tm: any) => {
        if (!tm) return;
        const name = (tm.name || tm.nickname || '').trim();
        if (!name) return;
        const key = name.toLowerCase();
        const existing = teamMap.get(key);
        if (existing) {
          existing.count += 1;
          if (!existing.logoUrl && tm.logoUrl) existing.logoUrl = tm.logoUrl;
          if ((!existing.players || existing.players.length === 0) && Array.isArray(tm.players) && tm.players.length > 0) {
            existing.players = tm.players;
          }
        } else {
          teamMap.set(key, {
            id: tm.id,
            name,
            logoUrl: tm.logoUrl || getAutoMatchedVectorLogo(name),
            players: Array.isArray(tm.players) ? tm.players : [],
            count: 1
          });
        }
      };

      allTournaments.forEach(t => {
        (t.teams || []).forEach(registerTeam);
        (t.settings?.stages || []).forEach(stg => (stg.teams || []).forEach(registerTeam));
      });
    } catch (e) {}

    // Augment with globalTeams if available
    globalTeams.forEach(gt => {
      if (!gt) return;
      const name = (gt.name || gt.nickname || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      const existing = teamMap.get(key);
      if (existing) {
        if (gt.logoUrl) existing.logoUrl = gt.logoUrl;
        if (Array.isArray(gt.players) && gt.players.length > 0) existing.players = gt.players;
      }
    });

    // "если команду не разу на турик не взяли то лучше ее не показывать"
    const usedTeams = Array.from(teamMap.values()).filter(t => t.count > 0);
    return usedTeams.sort((a, b) => b.count - a.count);
  }, [user, globalTeams]);

  const [selectedTeamsForDeletion, setSelectedTeamsForDeletion] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [previewRosterTeam, setPreviewRosterTeam] = useState<any | null>(null);

  const toggleTeamSelection = (teamId: string) => {
    setSelectedTeamsForDeletion(prev => 
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    );
  };

  const deleteSelectedTeams = () => {
    const newStages = [...formData.stages];
    const stage = newStages[selectedStageIdx!];
    stage.teams = stage.teams.filter((t: any) => !selectedTeamsForDeletion.includes(t.id));
    setFormData({...formData, stages: newStages});
    setSelectedTeamsForDeletion([]);
    setShowDeleteConfirm(false);
  };

  const removeTeamFromCurrentStage = (teamId: string) => {
    if (selectedStageIdx === null || !formData.stages[selectedStageIdx]) return;
    const newStages = [...formData.stages];
    newStages[selectedStageIdx].teams = (newStages[selectedStageIdx].teams || []).filter((t: any) => t.id !== teamId);
    setFormData({ ...formData, stages: newStages });
    setSelectedTeamsForDeletion(prev => prev.filter(id => id !== teamId));
  };

  const addTeamToCurrentStage = (nameToAdd?: string, logoUrl?: string, players?: any[]) => {
    if (selectedStageIdx === null || !formData.stages[selectedStageIdx]) return;
    const finalName = (nameToAdd || inputTeamName).trim();
    if (!finalName) return;

    const currentStage = formData.stages[selectedStageIdx];
    if (currentStage.teams.some((t: any) => (t.name || t.nickname || '').toLowerCase() === finalName.toLowerCase())) {
      alert(`Команда "${finalName}" уже добавлена в эту стадию!`);
      return;
    }

    const autoLogo = logoUrl || getAutoMatchedVectorLogo(finalName);
    const newTeam = {
      id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name: finalName,
      logoUrl: autoLogo || undefined,
      players: players || []
    };

    const newStages = [...formData.stages];
    newStages[selectedStageIdx].teams = [...(newStages[selectedStageIdx].teams || []), newTeam];
    setFormData({ ...formData, stages: newStages });
    setInputTeamName('');
  };

  const handleCreate = () => {
    const newId = 'tourn_' + Date.now();
    
    // Flatten all teams from stages for the global teams list (avoiding duplicates)
    const allTeamsMap = new Map();
    formData.stages.forEach(s => {
      if (Array.isArray(s.teams)) {
        s.teams.forEach((t: any) => {
          if (t && (t.name || t.nickname)) {
            const key = (t.name || t.nickname).toLowerCase().trim();
            allTeamsMap.set(key, {
              ...t,
              id: t.id || 't_' + Math.random().toString(36).slice(2, 8),
              name: t.name || t.nickname
            });
          }
        });
      }
    });

    const finalTeams = Array.from(allTeamsMap.values());

    // Generate bracket and matches for every stage independently based on ITS teams!
    const stagesWithData = formData.stages.map((stg: any, sIdx: number) => {
      const stageTeams = Array.isArray(stg.teams) ? stg.teams : [];
      const built = generateStageData(stg.type, stageTeams, {
        numQuals: stg.numQuals,
        advancePerQual: stg.advancePerQual
      });
      return {
        ...stg,
        id: `stage_${sIdx + 1}`,
        name: stg.name || `Стадия ${sIdx + 1}`,
        teams: stageTeams,
        bracketRounds: built.bracketRounds,
        losersBracketRounds: built.losersBracketRounds,
        grandFinal: built.grandFinal,
        groups: built.groups,
        gslGroups: built.gslGroups,
        swissRounds: built.swissRounds,
        qualifiersBrackets: built.qualifiersBrackets
      };
    });

    const stage1Data = stagesWithData[0] || {};

    const tournament: any = {
      id: newId,
      name: formData.name || 'Новый турнир',
      logoUrl: formData.logoUrl,
      game: formData.game,
      createdAt: new Date().toISOString(),
      teams: (stage1Data.teams && stage1Data.teams.length > 0) ? stage1Data.teams : finalTeams,
      bracketRounds: stage1Data.bracketRounds,
      losersBracketRounds: stage1Data.losersBracketRounds,
      grandFinal: stage1Data.grandFinal,
      groups: stage1Data.groups,
      gslGroups: stage1Data.gslGroups,
      swissRounds: stage1Data.swissRounds,
      qualifiersBrackets: stage1Data.qualifiersBrackets,
      settings: {
        mode: formData.stages.length > 1 ? 'two_stage' : 'single_stage',
        stage1Type: formData.stages[0]?.type || 'playoff',
        eliminationType: 'single',
        game: formData.game,
        numStages: formData.stages.length,
        stages: stagesWithData,
        numQuals: formData.stages[0]?.numQuals,
        advancePerQual: formData.stages[0]?.advancePerQual,
        rosters: finalTeams.map(t => ({
          id: t.id,
          name: t.name,
          players: t.players || []
        }))
      },
      activeStage: 1,
      completed: false
    };

    saveTournament(user?.channelId || user?.uid, tournament);
    onComplete(newId);
  };

  return (
    <div className="w-full max-w-full sm:max-w-5xl lg:max-w-6xl xl:max-w-[1600px] 2xl:max-w-[1780px] mx-auto p-3 sm:p-6 lg:p-8 pb-32">
      {/* Roster Preview Modal */}
      {previewRosterTeam && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-800/30">
                 <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                       {previewRosterTeam.logoUrl ? (
                         <img src={previewRosterTeam.logoUrl} alt="" className="w-full h-full object-cover" />
                       ) : (
                         <Trophy className="w-8 h-8 text-zinc-700" />
                       )}
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{previewRosterTeam.name}</h3>
                       <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Состав команды</p>
                    </div>
                 </div>
                 <button onClick={() => setPreviewRosterTeam(null)} className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl">
                    <X className="w-8 h-8" />
                 </button>
              </div>
              <div className="p-8 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                 {Array.isArray(previewRosterTeam.players) && previewRosterTeam.players.length > 0 ? (
                   previewRosterTeam.players.map((p: any, i: number) => (
                     <div key={i} className="flex items-center justify-between bg-zinc-800/50 px-5 py-3 rounded-2xl border border-zinc-700/50 group hover:border-blue-500/30 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                           <span className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{p.nickname || p.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{p.role || 'Player'}</span>
                     </div>
                   ))
                 ) : (
                   <div className="text-center py-12">
                      <Users className="w-12 h-12 text-zinc-800 mx-auto mb-4 opacity-20" />
                      <p className="text-zinc-600 font-bold italic">Игроки не найдены в JSON</p>
                   </div>
                 )}
              </div>
              <div className="p-6 border-t border-zinc-800 bg-zinc-800/20 text-center">
                 <button onClick={() => setPreviewRosterTeam(null)} className="text-zinc-500 hover:text-white text-xs font-black uppercase tracking-[0.2em] transition-colors">
                    ЗАКРЫТЬ ПРОСМОТР
                 </button>
              </div>
           </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-12">
        <button onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors flex items-center gap-2 font-bold uppercase text-xs tracking-widest">
          <ChevronRight className="w-4 h-4 rotate-180" /> Назад к списку
        </button>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 w-12 rounded-full transition-all ${s <= step ? 'bg-blue-500' : 'bg-zinc-800'}`}></div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 sm:p-12 animate-in slide-in-from-bottom-8 duration-500">
        {step === 1 && (
          <div className="animate-in fade-in duration-300">
            {/* Banner-like Header */}
            <div className="relative h-48 rounded-3xl overflow-hidden mb-12 bg-gradient-to-br from-blue-600/20 to-zinc-900 border border-zinc-800">
               <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]"></div>
               <div className="absolute inset-0 flex items-center p-8 gap-8">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-2xl bg-zinc-800/80 backdrop-blur-md border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center text-zinc-500 hover:border-blue-500/50 hover:bg-zinc-800 transition-all cursor-pointer overflow-hidden group shadow-2xl">
                      {formData.logoUrl ? (
                        <img src={formData.logoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Trophy className="w-8 h-8 mb-2 group-hover:text-blue-500 transition-colors" />
                          <span className="text-[10px] font-black uppercase">Аватарка</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (re) => setFormData({...formData, logoUrl: re.target?.result as string});
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <input 
                      type="text"
                      placeholder="Название турнира..."
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="bg-transparent border-none text-4xl font-black text-white outline-none placeholder:text-white/20 w-full uppercase tracking-tighter mb-2"
                    />
                    <div className="flex items-center gap-6">
                       <div className="flex items-center gap-2 text-zinc-400">
                          <Layers className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-widest">{formData.stages.length} СТАДИЙ</span>
                       </div>
                       <div className="flex items-center gap-2 text-zinc-400">
                          <Users className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-widest">
                            {formData.stages.reduce((acc, s) => acc + (s.teams?.length || 0), 0)} КОМАНД
                          </span>
                       </div>
                       <div className="flex bg-zinc-800/80 backdrop-blur-md p-1 rounded-xl border border-zinc-700">
                          <button 
                            onClick={() => setFormData({...formData, game: 'cs2'})}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${formData.game === 'cs2' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                          >
                            CS2
                          </button>
                          <button 
                            onClick={() => setFormData({...formData, game: 'so2'})}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${formData.game === 'so2' ? 'bg-amber-500 text-black' : 'text-zinc-500 hover:text-white'}`}
                          >
                            SO2
                          </button>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
            
            <div className="space-y-10">
              {/* Combined Stages Section */}
              <div>
                <div className="flex items-center justify-between mb-8 bg-zinc-800/30 p-6 rounded-2xl border border-zinc-800">
                   <div>
                     <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Структура турнира</h3>
                     <p className="text-zinc-500 text-sm font-medium">Добавляйте стадии и загружайте команды для каждой из них</p>
                   </div>
                   <button 
                      onClick={() => setFormData({...formData, stages: [...formData.stages, { type: 'playoff', teams: [] }]})}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-3 rounded-2xl flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/20"
                    >
                      <Plus className="w-5 h-5" /> ДОБАВИТЬ СТАДИЮ
                    </button>
                </div>

              {/* Sequential Stages Navigation */}
              <div className="flex flex-wrap gap-4 mb-8">
                {formData.stages.map((stage, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedStageIdx(idx)}
                    className={`flex-1 min-w-[200px] p-6 rounded-3xl border-2 transition-all flex flex-col gap-2 relative group ${
                      selectedStageIdx === idx 
                        ? 'border-blue-500 bg-blue-600/5 shadow-lg shadow-blue-500/10' 
                        : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${selectedStageIdx === idx ? 'text-blue-400' : 'text-zinc-600'}`}>
                        Стадия {idx + 1}
                      </span>
                      {selectedStageIdx === idx && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <h4 className={`font-black uppercase text-base truncate ${selectedStageIdx === idx ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-400'}`}>
                        {stage.type === 'playoff' ? 'Play-off (Сетка)' : 
                         stage.type === 'qualifier' ? 'Квалификации' :
                         stage.type === 'gsl_groups' ? 'GSL Группы' :
                         stage.type === 'swiss' ? 'Швейцарка' : 'Групповой этап'}
                      </h4>
                      <span className="text-[10px] font-bold bg-zinc-800 text-zinc-400 px-2 py-1 rounded-lg border border-white/5">
                        {stage.teams?.length || 0}
                      </span>
                    </div>
                    {formData.stages.length > 1 && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          const newStages = formData.stages.filter((_, i) => i !== idx);
                          setFormData({...formData, stages: newStages});
                          if (selectedStageIdx === idx) setSelectedStageIdx(null);
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-800 hover:bg-red-600 text-zinc-500 hover:text-white rounded-full flex items-center justify-center border border-zinc-700 transition-all opacity-0 group-hover:opacity-100 z-10 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                ))}
                
                <button 
                  onClick={() => {
                    const newStages = [...formData.stages, { type: 'playoff', teams: [] }];
                    setFormData({...formData, stages: newStages});
                    setSelectedStageIdx(newStages.length - 1);
                  }}
                  className="flex-1 min-w-[200px] p-6 rounded-3xl border-2 border-dashed border-zinc-800 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex flex-col items-center justify-center gap-2 group"
                >
                  <Plus className="w-6 h-6 text-zinc-700 group-hover:text-blue-500 transition-colors" />
                  <span className="text-[10px] font-black text-zinc-600 group-hover:text-blue-400 transition-colors uppercase tracking-widest">Добавить стадию</span>
                </button>
              </div>

              {selectedStageIdx !== null && formData.stages[selectedStageIdx] && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500 bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] pointer-events-none"></div>
                  
                  <div className="relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12 pb-8 border-b border-zinc-800/50">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                           <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">Настройка</span>
                           <span className="text-zinc-600 font-bold uppercase text-[10px] tracking-[0.2em]">Стадия {selectedStageIdx + 1}</span>
                        </div>
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter">
                          {formData.stages[selectedStageIdx].type === 'playoff' ? 'Плей-офф Сетка' : 
                           formData.stages[selectedStageIdx].type === 'qualifier' ? 'Квалификации' :
                           formData.stages[selectedStageIdx].type === 'gsl_groups' ? 'GSL Группы' :
                           formData.stages[selectedStageIdx].type === 'swiss' ? 'Швейцарская система' : 'Групповой этап'}
                        </h3>
                      </div>

                      <div className="flex items-center gap-3">
                         <div className="bg-zinc-800 p-1.5 rounded-2xl flex items-center border border-zinc-700 shadow-inner">
                            <span className="text-[10px] font-black text-zinc-500 px-4">ФОРМАТ:</span>
                            <select 
                              value={formData.stages[selectedStageIdx].type}
                              onChange={(e) => {
                                const newStages = [...formData.stages];
                                newStages[selectedStageIdx].type = e.target.value;
                                if (e.target.value === 'qualifier') {
                                  newStages[selectedStageIdx].numQuals = 4;
                                  newStages[selectedStageIdx].advancePerQual = 2;
                                }
                                setFormData({...formData, stages: newStages});
                              }}
                              className="bg-zinc-900 text-white font-black uppercase text-xs outline-none cursor-pointer px-4 py-2 rounded-xl border border-white/5 focus:border-blue-500/50 transition-colors [color-scheme:dark]"
                            >
                              <option value="playoff">Play-off</option>
                              <option value="qualifier">Квалификации</option>
                              <option value="gsl_groups">GSL Groups</option>
                              <option value="swiss">Швейцарка</option>
                              <option value="groups">Групповой этап</option>
                            </select>
                         </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                       <div className="lg:col-span-4 space-y-8">
                          {formData.stages[selectedStageIdx].type === 'qualifier' && (
                            <div className="space-y-6 bg-zinc-800/40 p-6 rounded-3xl border border-zinc-800 shadow-xl">
                               <div>
                                 <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                                   <span>Количество квалификаций</span>
                                   <span className="text-blue-500 font-black">{formData.stages[selectedStageIdx].numQuals || 1}</span>
                                 </label>
                                 <div className="grid grid-cols-4 gap-2">
                                   {[1, 2, 3, 4].map(n => (
                                     <button
                                       key={n}
                                       type="button"
                                       onClick={() => {
                                         const newStages = [...formData.stages];
                                         newStages[selectedStageIdx].numQuals = n;
                                         setFormData({...formData, stages: newStages});
                                       }}
                                       className={`py-2 rounded-xl text-xs font-black transition-all ${((formData.stages[selectedStageIdx].numQuals || 1) === n) ? 'bg-blue-600 text-white shadow-lg' : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'}`}
                                     >
                                       {n} квал.
                                     </button>
                                   ))}
                                 </div>
                               </div>

                               <div>
                                 <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                                   <span>Проходят в следующую стадию</span>
                                   <span className="text-blue-500 font-black">{formData.stages[selectedStageIdx].advancePerQual || 1} из каждой</span>
                                 </label>
                                 <div className="grid grid-cols-3 gap-2">
                                   {[1, 2, 4].map(n => (
                                     <button
                                       key={n}
                                       type="button"
                                       onClick={() => {
                                         const newStages = [...formData.stages];
                                         newStages[selectedStageIdx].advancePerQual = n;
                                         setFormData({...formData, stages: newStages});
                                       }}
                                       className={`py-2 rounded-xl text-xs font-black transition-all ${((formData.stages[selectedStageIdx].advancePerQual || 1) === n) ? 'bg-blue-600 text-white shadow-lg' : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'}`}
                                     >
                                       {n === 1 ? '1 (Победитель)' : n === 2 ? '2 (Финалисты)' : '4 (1/2 финала)'}
                                     </button>
                                   ))}
                                 </div>
                               </div>

                               <p className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
                                 💡 <span className="font-bold text-white">Правило квалификаций:</span> В 1-й квале играют все приглашенные команды. Во 2-й — оставшиеся (без победителей 1-й). Все прошедшие команды переходят в следующую стадию турнира.
                               </p>
                            </div>
                          )}

                          <div className="bg-zinc-800/40 p-6 rounded-3xl border border-zinc-800 shadow-xl space-y-6">
                             <div>
                               <h5 className="text-white font-black uppercase text-sm mb-1 flex items-center gap-2">
                                 <Layers className="w-4 h-4 text-blue-500" />
                                 Сводка Стадии {(selectedStageIdx ?? 0) + 1}
                               </h5>
                               <p className="text-zinc-500 text-xs">
                                 {formData.stages[selectedStageIdx].type === 'playoff' ? 'Олимпийская сетка плей-офф на выбывание' : 
                                  formData.stages[selectedStageIdx].type === 'qualifier' ? 'Квалификационный отборочный этап' :
                                  formData.stages[selectedStageIdx].type === 'gsl_groups' ? 'Формат GSL групп (Double-Elimination в группах)' :
                                  formData.stages[selectedStageIdx].type === 'swiss' ? 'Швейцарская система раундов' : 'Классический групповой этап'}
                               </p>
                             </div>

                             <div className="p-4 bg-zinc-900/80 rounded-2xl border border-zinc-800 space-y-2.5 text-xs">
                               <div className="flex justify-between items-center">
                                 <span className="text-zinc-500 font-bold uppercase text-[10px]">Команд в стадии:</span>
                                 <span className="text-white font-black">{formData.stages[selectedStageIdx].teams?.length || 0}</span>
                               </div>
                               <div className="flex justify-between items-center">
                                 <span className="text-zinc-500 font-bold uppercase text-[10px]">Формат этапа:</span>
                                 <span className="text-blue-400 font-black uppercase text-[11px]">
                                   {formData.stages[selectedStageIdx].type}
                                 </span>
                               </div>
                               {selectedStageIdx > 0 && (
                                 <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400">
                                   Команды, приглашенные сюда, будут ждать завершения предыдущих стадий.
                                 </div>
                               )}
                             </div>

                             {/* JSON Upload */}
                             <div className="pt-2 border-t border-zinc-800/60">
                               <label className="block">
                                 <div className="bg-zinc-800 hover:bg-zinc-700 text-white font-black text-[10px] uppercase tracking-wider py-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 border border-zinc-700 shadow-md hover:border-blue-500/50">
                                   <Download className="w-3.5 h-3.5 text-blue-400" /> ИМПОРТ ИЗ JSON
                                 </div>
                                 <input 
                                   type="file" 
                                   accept=".json"
                                   className="hidden"
                                   onChange={(e) => {
                                     const file = e.target.files?.[0];
                                     if (file) {
                                       const reader = new FileReader();
                                       reader.onload = (re) => {
                                         try {
                                           const content = re.target?.result as string;
                                           const parsed = JSON.parse(content);
                                           let incoming: any[] = [];
                                           if (Array.isArray(parsed)) incoming = parsed;
                                           else if (parsed.teams && Array.isArray(parsed.teams)) incoming = parsed.teams;
                                           else if (parsed.teamName || parsed.name || parsed.players || parsed.roster || parsed.lineup) incoming = [parsed];

                                           if (incoming.length > 0) {
                                             const newStages = [...formData.stages];
                                             const norm = incoming.map((t: any) => {
                                               const rawPlayers = (Array.isArray(t.players) && t.players.length > 0)
                                                 ? t.players
                                                 : ((Array.isArray(t.roster) && t.roster.length > 0)
                                                   ? t.roster
                                                   : (Array.isArray(t.lineup) ? t.lineup : []));

                                               const normPlayers = rawPlayers.map((p: any, idx: number) => ({
                                                 id: p.id || `p_${Date.now()}_${idx}`,
                                                 nickname: p.nickname || p.name || p.nick || p.playerName || `Игрок #${idx + 1}`,
                                                 role: p.role || p.position || p.pos || (idx === 0 ? 'awper' : idx === 1 ? 'entry' : idx === 2 ? 'captain' : 'rifler'),
                                                 rating: Number(p.rating ?? p.rate ?? p.skill ?? p.rank ?? 130) || 130
                                               }));

                                               return {
                                                 ...t,
                                                 id: t.id || 't_' + Math.random().toString(36).slice(2, 8),
                                                 name: t.teamName || t.name || t.nickname || 'Unknown Team',
                                                 logoUrl: t.logoUrl || t.logo || t.avatar || getAutoMatchedVectorLogo(t.teamName || t.name || t.nickname || ''),
                                                 players: normPlayers
                                               };
                                             });
                                             newStages[selectedStageIdx!].teams = [...(newStages[selectedStageIdx!].teams || []), ...norm];
                                             setFormData({...formData, stages: newStages});
                                             alert(`Успешно загружено команд с составами: ${norm.length}`);
                                           } else {
                                             alert("Команды в файле не обнаружены. Проверьте структуру JSON.");
                                           }
                                         } catch (err) {
                                           alert("Ошибка при чтении или парсинге JSON файла.");
                                         }
                                       };
                                       reader.readAsText(file);
                                     }
                                   }}
                                 />
                               </label>
                             </div>
                          </div>
                       </div>

                       <div className="lg:col-span-8">
                          {/* Team Search, Quick Invite, and Stage Management Bar */}
                          <div className="bg-zinc-800/40 p-5 rounded-3xl border border-zinc-800 shadow-xl mb-6 space-y-4">
                             <div className="flex flex-col sm:flex-row gap-3">
                               <div className="relative flex-1 group">
                                 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
                                 <input
                                   type="text"
                                   value={inputTeamName}
                                   onChange={(e) => setInputTeamName(e.target.value)}
                                   onKeyDown={(e) => {
                                     if (e.key === 'Enter') {
                                       e.preventDefault();
                                       addTeamToCurrentStage();
                                     }
                                   }}
                                   placeholder="Введите команду для приглашения или поиска..."
                                   className="w-full bg-zinc-900 border border-zinc-700/60 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder:text-zinc-500 outline-none focus:border-blue-500 transition-all font-medium"
                                 />
                               </div>
                               <button
                                 type="button"
                                 onClick={() => addTeamToCurrentStage()}
                                 disabled={!inputTeamName.trim()}
                                 className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95 shrink-0"
                               >
                                 <Plus className="w-4 h-4" />
                                 Пригласить
                               </button>
                             </div>

                             {/* Toggle: Нужны ли команды из базы данных */}
                             <div className="pt-3 border-t border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                               <label className="flex items-center gap-3 cursor-pointer select-none group">
                                 <input
                                   type="checkbox"
                                   checked={showGlobalDb}
                                   onChange={(e) => setShowGlobalDb(e.target.checked)}
                                   className="w-4 h-4 rounded text-blue-600 bg-zinc-900 border-zinc-700 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-blue-600"
                                 />
                                 <span className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors flex items-center gap-2">
                                   <Database className="w-3.5 h-3.5 text-blue-400" />
                                   Нужны ли команды из базы данных (быстрый инвайт)
                                 </span>
                               </label>
                               {showGlobalDb && (
                                 <span className="text-[11px] text-zinc-500 font-medium">
                                   Только проверенные в турнирах ({tournamentInviteTeams.length})
                                 </span>
                               )}
                             </div>

                             {/* Quick invite chips (shown only when checkbox is checked) */}
                             {showGlobalDb && (
                               <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                 {tournamentInviteTeams.length > 0 ? (
                                   <div className="space-y-2">
                                     <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">
                                       Часто используемые команды в турнирах (клик для быстрого добавления):
                                     </span>
                                     <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                       {tournamentInviteTeams.map((gt) => {
                                         const currentStageTeams = formData.stages[selectedStageIdx]?.teams || [];
                                         const isAlreadyInStage = currentStageTeams.some(
                                           (t: any) => (t.name || t.nickname || '').toLowerCase() === gt.name.toLowerCase()
                                         );

                                         return (
                                           <button
                                             key={gt.id || gt.name}
                                             type="button"
                                             onClick={() => addTeamToCurrentStage(gt.name, gt.logoUrl, gt.players)}
                                             disabled={isAlreadyInStage}
                                             className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
                                               isAlreadyInStage
                                                 ? "bg-blue-600/20 text-blue-300 border border-blue-500/30 opacity-60 cursor-not-allowed"
                                                 : "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700/70 hover:border-blue-500/40 hover:-translate-y-0.5"
                                             }`}
                                           >
                                             {gt.logoUrl ? (
                                               <img src={gt.logoUrl} alt="" className="w-4 h-4 rounded object-contain" />
                                             ) : (
                                               <Trophy className="w-3.5 h-3.5 text-yellow-500/70" />
                                             )}
                                             <span>{gt.name}</span>
                                             <span className="text-[10px] font-black text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 border border-amber-500/20">
                                               <Flame className="w-3 h-3 text-amber-400" />
                                               {gt.count}
                                             </span>
                                             {isAlreadyInStage && <Check className="w-3.5 h-3.5 text-blue-400" />}
                                           </button>
                                         );
                                       })}
                                     </div>
                                   </div>
                                 ) : (
                                   <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 text-center">
                                     <p className="text-zinc-400 text-xs font-semibold">
                                       В базе пока нет команд, участвовавших в турнирах.
                                     </p>
                                     <p className="text-zinc-600 text-[11px] mt-1">
                                       Команды появятся здесь автоматически после проведения турниров.
                                     </p>
                                   </div>
                                 )}
                               </div>
                             )}
                          </div>

                          <div className="flex items-center justify-between mb-4">
                             <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-3">
                                <span>Список команд в стадии {(selectedStageIdx ?? 0) + 1}</span>
                                <div className="h-px w-12 bg-zinc-800"></div>
                                <span className="text-white bg-zinc-800 px-2 py-0.5 rounded-lg border border-white/5">{formData.stages[selectedStageIdx].teams?.length || 0}</span>
                             </div>
                             {formData.stages[selectedStageIdx].teams?.length > 0 && (
                               <div className="flex items-center gap-2">
                                  {selectedTeamsForDeletion.length > 0 && (
                                    <div 
                                      onClick={() => setShowDeleteConfirm(true)}
                                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all font-black text-[10px] uppercase cursor-pointer"
                                      role="button"
                                      tabIndex={0}
                                    >
                                      УДАЛИТЬ ({selectedTeamsForDeletion.length})
                                    </div>
                                  )}
                                  
                                  {showDeleteConfirm && (
                                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                                      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl">
                                        <h3 className="text-xl font-black text-white mb-4">Удаление команд</h3>
                                        <p className="text-zinc-400 mb-8 font-medium">Вы уверены, что хотите удалить {selectedTeamsForDeletion.length} выбранных команд?</p>
                                        <div className="flex gap-4">
                                          <div 
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-xl transition-all cursor-pointer text-center"
                                            role="button"
                                            tabIndex={0}
                                          >
                                            ОТМЕНА
                                          </div>
                                          <div 
                                            onClick={deleteSelectedTeams}
                                            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition-all cursor-pointer text-center"
                                            role="button"
                                            tabIndex={0}
                                          >
                                            УДАЛИТЬ
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  <button 
                                    onClick={() => {
                                      const newStages = [...formData.stages];
                                      newStages[selectedStageIdx].teams = [...newStages[selectedStageIdx].teams].sort(() => Math.random() - 0.5);
                                      setFormData({...formData, stages: newStages});
                                    }}
                                    className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all"
                                    title="Перемешать"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      if (confirm('Очистить список команд этой стадии?')) {
                                        const newStages = [...formData.stages];
                                        newStages[selectedStageIdx].teams = [];
                                        setFormData({...formData, stages: newStages});
                                      }
                                    }}
                                    className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                    title="Очистить"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                               </div>
                             )}
                          </div>

                          {/* Teams Grid */}
                          {(() => {
                            const currentTeams = formData.stages[selectedStageIdx].teams || [];
                            const searchFilter = inputTeamName.trim().toLowerCase();
                            const filteredTeams = (searchFilter && currentTeams.some((t: any) => (t.name || t.nickname || '').toLowerCase().includes(searchFilter)))
                              ? currentTeams.filter((t: any) => (t.name || t.nickname || '').toLowerCase().includes(searchFilter))
                              : currentTeams;

                            return (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 min-h-[300px] p-6 bg-black/20 rounded-[2rem] border border-zinc-800/50 content-start">
                                 {filteredTeams.slice(0, 100).map((t: any, ti: number) => (
                                   <div 
                                     key={t.id || ti} 
                                     className={`bg-zinc-800/80 hover:bg-zinc-750 px-3.5 py-2.5 rounded-2xl text-[11px] text-white font-bold border ${selectedTeamsForDeletion.includes(t.id) ? "border-red-500 bg-red-950/20" : "border-white/5"} transition-all flex items-center justify-between gap-2.5 group shadow-lg hover:border-blue-500/50 hover:-translate-y-0.5`}
                                   >
                                     <div 
                                       onClick={() => toggleTeamSelection(t.id)} 
                                       className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                                     >
                                       <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0 border border-white/10 shadow-inner">
                                         {t.logoUrl ? (
                                           <img src={t.logoUrl} alt="" className="w-full h-full object-cover" />
                                         ) : (
                                           <Trophy className="w-4 h-4 text-zinc-700" />
                                         )}
                                       </div>
                                       <span className="truncate group-hover:text-blue-400 transition-colors uppercase tracking-tight flex-1 font-black">{t.name}</span>
                                       {selectedTeamsForDeletion.includes(t.id) && <Check className="w-4 h-4 text-red-500 shrink-0" />}
                                     </div>

                                     <div className="flex items-center gap-1 shrink-0">
                                       {Array.isArray(t.players) && t.players.length > 0 && (
                                         <button
                                           type="button"
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             setPreviewRosterTeam(t);
                                           }}
                                           className="p-1 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors"
                                           title="Посмотреть состав"
                                         >
                                           <Eye className="w-3.5 h-3.5" />
                                         </button>
                                       )}
                                       <button
                                         type="button"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           removeTeamFromCurrentStage(t.id);
                                         }}
                                         className="p-1 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                                         title="Удалить из этой стадии"
                                       >
                                         <X className="w-3.5 h-3.5" />
                                       </button>
                                     </div>
                                   </div>
                                 ))}
                                 
                                 {filteredTeams.length > 100 && (
                                   <div className="flex items-center justify-center text-[10px] font-black text-zinc-500 bg-zinc-900 rounded-2xl border border-zinc-800 border-dashed py-3">
                                     +{filteredTeams.length - 100} ЕЩЕ КОМАНД
                                   </div>
                                 )}

                                 {filteredTeams.length === 0 && (
                                   <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-700 gap-4 opacity-70">
                                     <Users className="w-16 h-16 text-zinc-600" />
                                     <p className="font-black uppercase tracking-[0.2em] text-xs text-zinc-400">В этой стадии пока нет команд</p>
                                     <p className="text-xs font-medium max-w-[280px] text-center text-zinc-500 leading-relaxed">
                                       Введите команду выше, воспользуйтесь быстрым инвайтом или импортируйте JSON файл.
                                     </p>
                                   </div>
                                 )}
                              </div>
                            );
                          })()}
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {formData.stages.length === 0 && (
                <div className="text-center py-24 bg-zinc-900/20 border-2 border-dashed border-zinc-800 rounded-[2.5rem] animate-in zoom-in-95 duration-500">
                   <Layers className="w-20 h-20 text-zinc-700 mx-auto mb-8 opacity-20" />
                   <h4 className="text-xl font-black text-zinc-600 mb-8 uppercase tracking-widest">Начните с первой стадии</h4>
                   <button 
                      onClick={() => {
                        const s = [{ type: 'playoff', teams: [] }];
                        setFormData({...formData, stages: s});
                        setSelectedStageIdx(0);
                      }}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white font-black px-12 py-5 rounded-[2rem] transition-all shadow-2xl active:scale-95"
                    >
                      СОЗДАТЬ СТРУКТУРУ ТУРНИРА
                    </button>
                </div>
              )}
            </div>

            <div className="pt-12 border-t border-zinc-800 flex justify-between items-center">
                <p className="text-zinc-600 text-xs font-bold italic">* Настройки можно будет изменить позже в панели управления турниром</p>
                <button 
                  onClick={() => setStep(2)}
                  disabled={!formData.name || formData.stages.length === 0}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black px-12 py-5 rounded-3xl flex items-center gap-4 transition-all shadow-2xl shadow-blue-600/30 transform hover:scale-105 active:scale-95"
                >
                  ДАЛЕЕ К ЗАПУСКУ <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-300 text-center">
            <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8 text-green-500 border border-green-500/20">
               <Check className="w-12 h-12" />
            </div>
            <h2 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">Готов к созданию!</h2>
            <p className="text-zinc-500 mb-12 max-w-sm mx-auto font-medium">Вы настроили структуру и загрузили составы. Турнир готов к запуску.</p>

            <div className="bg-zinc-800/30 border border-zinc-800 rounded-3xl p-8 mb-12 text-left space-y-5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Название:</span>
                <span className="text-white font-black uppercase tracking-tight text-lg">{formData.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Дисциплина:</span>
                <span className={`px-3 py-1 rounded-lg font-black uppercase text-xs ${formData.game === 'so2' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>{formData.game === 'so2' ? 'Standoff 2' : 'CS2'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Всего стадий:</span>
                <span className="text-white font-black text-lg">{formData.stages.length}</span>
              </div>
              
              <div className="space-y-2 pt-4 border-t border-zinc-800/50">
                 {formData.stages.map((s, i) => (
                   <div key={i} className="flex justify-between items-center bg-zinc-900/50 px-4 py-2.5 rounded-xl border border-zinc-800/30">
                      <div className="flex items-center gap-3">
                         <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-500">{i+1}</div>
                         <span className="text-[10px] font-black uppercase text-white/70">{s.type}</span>
                      </div>
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-tighter">{s.teams?.length || 0} команд</span>
                   </div>
                 ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setStep(1)}
                className="flex-1 text-zinc-500 hover:text-white font-black py-4 rounded-2xl transition-all hover:bg-white/5"
              >
                ИЗМЕНИТЬ
              </button>
              <button 
                onClick={handleCreate}
                className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-2xl shadow-blue-600/40 transition-all flex items-center justify-center gap-3 transform hover:scale-105"
              >
                ЗАПУСТИТЬ ТУРНИР <Trophy className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
