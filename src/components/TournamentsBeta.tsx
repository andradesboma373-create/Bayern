import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Trophy, Sparkles, Plus, Search, Calendar, Users, ChevronRight, 
  Trash2, Check, X, Layers, RotateCcw, Download, Database, Flame, 
  Eye, Image as ImageIcon, ArrowLeft, Upload, Save, Copy, Edit3, 
  Settings, Play, ArrowUpDown, FileText, Swords, Shield, Wand2
} from 'lucide-react';
import { loadTournaments, deleteTournament, getCanonicalRoomId, saveTournament } from './setka_tourn/storage';
import { TeamLogo } from './TeamLogo';
import { Tournament, Team, TournamentStageConfig } from './setka_tourn/types';
import TournamentManager from './setka_tourn/TournamentManager';
import { getAutoMatchedVectorLogo } from '../lib/logoMatcher';
import { generateStageData } from './setka_tourn/stageGenerator';

// Default presets for 1-click tournament creation
const TOURNAMENT_PRESETS = [
  {
    id: 'cs2_major_16',
    name: 'Major Championship CS2',
    game: 'cs2' as const,
    badge: '🏆 Major',
    desc: 'Швейцарка (16 команд) → Топ-8 Play-off',
    stages: [
      {
        type: 'swiss' as const,
        name: 'Этап 1: Швейцарская система',
        teamNames: [
          'Natus Vincere', 'FaZe Clan', 'Team Spirit', 'Team Vitality',
          'G2 Esports', 'MOUZ', 'Astralis', 'Heroic',
          'Virtus.pro', 'Eternal Fire', 'Complexity', 'Team Liquid',
          'The MongolZ', 'paiN Gaming', 'FURIA Esports', 'Imperial Esports'
        ]
      },
      {
        type: 'playoff' as const,
        name: 'Этап 2: Плей-офф (Топ-8)',
        teamNames: []
      }
    ]
  },
  {
    id: 'cs2_playoff_8',
    name: 'CS2 Masters Play-off (8)',
    game: 'cs2' as const,
    badge: '⚔️ Play-off 8',
    desc: 'Классическая сетка на выбывание (1/4 → Финал)',
    stages: [
      {
        type: 'playoff' as const,
        name: 'Плей-офф',
        teamNames: [
          'Natus Vincere', 'FaZe Clan', 'Team Spirit', 'Team Vitality',
          'G2 Esports', 'MOUZ', 'Virtus.pro', 'Astralis'
        ]
      }
    ]
  },
  {
    id: 'cs2_playoff_16',
    name: 'CS2 Open Cup (16)',
    game: 'cs2' as const,
    badge: '⚡ Play-off 16',
    desc: 'Большая олимпийская сетка (1/8 → Финал)',
    stages: [
      {
        type: 'playoff' as const,
        name: 'Плей-офф (16 команд)',
        teamNames: [
          'Natus Vincere', 'FaZe Clan', 'Team Spirit', 'Team Vitality',
          'G2 Esports', 'MOUZ', 'Virtus.pro', 'Astralis',
          'Heroic', 'Cloud9', 'Team Liquid', 'Complexity',
          'FURIA Esports', 'The MongolZ', 'BetBoom Team', 'Team Falcons'
        ]
      }
    ]
  },
  {
    id: 'cs2_gsl_8',
    name: 'CS2 GSL Cup (8)',
    game: 'cs2' as const,
    badge: '🛡️ GSL Группы',
    desc: '2 GSL группы по 4 команды → Плей-офф (4)',
    stages: [
      {
        type: 'gsl_groups' as const,
        name: 'GSL Групповой этап',
        teamNames: [
          'Natus Vincere', 'FaZe Clan', 'Team Spirit', 'Team Vitality',
          'G2 Esports', 'MOUZ', 'Virtus.pro', 'Heroic'
        ]
      },
      {
        type: 'playoff' as const,
        name: 'Плей-офф',
        teamNames: []
      }
    ]
  },
  {
    id: 'cs2_quals_16',
    name: 'CS2 Road to Major Qualifiers',
    game: 'cs2' as const,
    badge: '🎯 Квалификации',
    desc: '4 отборочные квалификации → Финал',
    stages: [
      {
        type: 'qualifier' as const,
        name: 'Отборочные квалификации',
        numQuals: 4,
        advancePerQual: 2,
        teamNames: [
          'Natus Vincere', 'FaZe Clan', 'Team Spirit', 'Team Vitality',
          'G2 Esports', 'MOUZ', 'Virtus.pro', 'Astralis',
          'Heroic', 'Cloud9', 'Team Liquid', 'Complexity',
          'FURIA Esports', 'The MongolZ', 'BetBoom Team', 'Team Falcons'
        ]
      },
      {
        type: 'playoff' as const,
        name: 'Основной турнир',
        teamNames: []
      }
    ]
  },
  {
    id: 'so2_championship_8',
    name: 'Standoff 2 Pro Series',
    game: 'so2' as const,
    badge: '📱 SO2 Cup',
    desc: 'Турнир Standoff 2 (8 команд)',
    stages: [
      {
        type: 'playoff' as const,
        name: 'Play-off SO2',
        teamNames: [
          'SaiNts', 'Horizon', 'Necessary', 'Virtus.pro SO2',
          'Forze SO2', 'RevialGG', 'Absolute', 'Bulldog Esports'
        ]
      }
    ]
  }
];

export default function TournamentsBeta({ user }: { user: any }) {
  const { tournamentId } = useParams<{ tournamentId?: string }>();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'manager' | 'create'>('list');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(tournamentId || null);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [filterGame, setFilterGame] = useState<'all' | 'cs2' | 'so2'>('all');

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setEditingTournament(null);
    setView('create');
  };

  const handleEditTournament = (e: React.MouseEvent, t: Tournament) => {
    e.stopPropagation();
    setEditingTournament(t);
    setView('create');
  };

  const handleDuplicateTournament = (e: React.MouseEvent, t: Tournament) => {
    e.stopPropagation();
    try {
      const clone: Tournament = JSON.parse(JSON.stringify(t));
      const newId = 'tourn_' + Date.now();
      clone.id = newId;
      clone.name = `${t.name || 'Турнир'} (Копия)`;
      clone.createdAt = Date.now();
      clone.completed = false;
      clone.winnerName = undefined;
      clone.activeStage = 1;

      // Reset matches and scores in stages
      if (clone.settings?.stages && clone.settings.stages.length > 0) {
        clone.settings.stages = clone.settings.stages.map((stg, sIdx) => {
          const stgTeams = Array.isArray(stg.teams) ? stg.teams : [];
          const built = generateStageData(stg.type, stgTeams, {
            numQuals: stg.numQuals,
            advancePerQual: stg.advancePerQual
          });
          return {
            ...stg,
            completed: false,
            bracketRounds: built.bracketRounds,
            losersBracketRounds: built.losersBracketRounds,
            grandFinal: built.grandFinal,
            groups: built.groups,
            gslGroups: built.gslGroups,
            swissRounds: built.swissRounds,
            qualifiersBrackets: built.qualifiersBrackets
          };
        });

        const stg1 = clone.settings.stages[0];
        clone.bracketRounds = stg1.bracketRounds;
        clone.losersBracketRounds = stg1.losersBracketRounds;
        clone.grandFinal = stg1.grandFinal;
        clone.groups = stg1.groups;
        clone.gslGroups = stg1.gslGroups;
        clone.swissRounds = stg1.swissRounds;
        clone.qualifiersBrackets = stg1.qualifiersBrackets;
      }

      saveTournament(user?.channelId || user?.uid, clone);
      refreshTournaments();
    } catch (err: any) {
      alert("Ошибка при клонировании турнира: " + (err?.message || err));
    }
  };

  const handleSelectTournament = (id: string) => {
    setSelectedTournamentId(id);
    setView('manager');
    navigate(`/tournaments-beta/${id}`);
  };

  const confirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setDeletingId(id);
  };

  const handleDelete = () => {
    if (deletingId) {
      deleteTournament(user?.channelId || user?.uid, deletingId);
      setDeletingId(null);
      refreshTournaments();
    }
  };

  const handleExportAll = () => {
    try {
      const dataStr = JSON.stringify(tournaments, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tournaments_beta_backup_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Ошибка при экспорте сеток");
    }
  };

  const handleExportSingle = (e: React.MouseEvent, t: Tournament) => {
    e.stopPropagation();
    try {
      const dataStr = JSON.stringify(t, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(t.name || 'tournament').replace(/[^a-zA-Z0-9а-яА-Я_-]/g, '_')}_bracket.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Ошибка при выгрузке сетки турнира");
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const listToImport = Array.isArray(parsed) ? parsed : [parsed];
        const targetRoom = user?.channelId || user?.uid;
        let count = 0;
        for (const item of listToImport) {
          if (item && item.id && item.name) {
            saveTournament(targetRoom, item);
            count++;
          }
        }
        alert(`Успешно импортировано сеток турниров: ${count}!`);
        refreshTournaments();
      } catch (err: any) {
        alert("Ошибка при чтении файла JSON: " + (err?.message || err));
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
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
        initialTournament={editingTournament}
        onCancel={() => {
          setView('list');
          setEditingTournament(null);
        }} 
        onComplete={(id) => {
          setSelectedTournamentId(id);
          setView('manager');
          setEditingTournament(null);
        }}
      />
    );
  }

  const filteredTournaments = tournaments.filter(t => {
    const matchesSearch = (t.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' 
      ? true 
      : filterStatus === 'active' 
        ? !t.completed 
        : !!t.completed;
    const matchesGame = filterGame === 'all'
      ? true
      : filterGame === 'so2'
        ? t.game === 'so2'
        : t.game !== 'so2';
    return matchesSearch && matchesStatus && matchesGame;
  });

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
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-black py-4 rounded-2xl transition-all cursor-pointer"
                >
                  ОТМЕНА
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-red-600/20 cursor-pointer"
                >
                  УДАЛИТЬ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-black text-white flex items-center gap-3 tracking-tight">
              ТУРНИРЫ <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs px-2.5 py-1 rounded-lg font-black uppercase shadow-[0_0_15px_rgba(234,179,8,0.4)]">BETA</span>
              <Sparkles className="text-amber-400 w-6 h-6 animate-pulse" />
            </h1>
            <p className="text-zinc-500 mt-2 font-medium">
              Быстрое создание турниров по шаблонам, гибкая настройка стадий и удобное управление
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportFile} 
              accept=".json" 
              className="hidden" 
            />
            <button 
              onClick={refreshTournaments}
              className="p-4 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-2xl transition-all hover:bg-zinc-800 cursor-pointer shadow-lg"
              title="Обновить список"
            >
              <RotateCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-4 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-2xl transition-all hover:bg-zinc-800 flex items-center gap-2 text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg"
              title="Импортировать сетку или турнир из JSON файла"
            >
              <Upload className="w-5 h-5 text-emerald-400" />
              <span className="hidden sm:inline">ИМПОРТ СЕТКИ</span>
            </button>
            <button 
              onClick={handleExportAll}
              disabled={tournaments.length === 0}
              className="p-4 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-2xl transition-all hover:bg-zinc-800 flex items-center gap-2 text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-50 shadow-lg"
              title="Скачать все сетки турниров в один JSON бэкап файл"
            >
              <Download className="w-5 h-5 text-blue-400" />
              <span className="hidden sm:inline">ЭКСПОРТ СЕТОК</span>
            </button>
            <button 
              onClick={handleCreateNew}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl flex items-center justify-center gap-3 transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-blue-600/30 group text-xs sm:text-sm tracking-wider cursor-pointer"
            >
              <div className="bg-white/20 p-1.5 rounded-lg group-hover:rotate-90 transition-transform shrink-0">
                <Plus className="w-5 h-5" />
              </div>
              СОЗДАТЬ ТУРНИР
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900/60 border border-zinc-800/80 p-5 rounded-2xl">
            <div className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Всего турниров</div>
            <div className="text-2xl font-black text-white">{tournaments.length}</div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/80 p-5 rounded-2xl">
            <div className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">В процессе</div>
            <div className="text-2xl font-black text-amber-400">{tournaments.filter(t => !t.completed).length}</div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/80 p-5 rounded-2xl">
            <div className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Завершено</div>
            <div className="text-2xl font-black text-emerald-400">{tournaments.filter(t => t.completed).length}</div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/80 p-5 rounded-2xl">
            <div className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Команд в базе</div>
            <div className="text-2xl font-black text-blue-400">
              {tournaments.reduce((acc, t) => acc + (t.teams?.length || 0), 0)}
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text"
              placeholder="Поиск турнира по названию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3.5 text-white outline-none focus:border-blue-500/50 transition-all font-medium text-sm"
            />
          </div>

          {/* Status filters */}
          <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 p-1.5 rounded-2xl">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${filterStatus === 'all' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white'}`}
            >
              Все
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${filterStatus === 'active' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-zinc-500 hover:text-white'}`}
            >
              В процессе
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${filterStatus === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-zinc-500 hover:text-white'}`}
            >
              Завершенные
            </button>
          </div>

          {/* Game filter */}
          <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 p-1.5 rounded-2xl">
            <button
              onClick={() => setFilterGame('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${filterGame === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
            >
              Любая игра
            </button>
            <button
              onClick={() => setFilterGame('cs2')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${filterGame === 'cs2' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white'}`}
            >
              CS2
            </button>
            <button
              onClick={() => setFilterGame('so2')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${filterGame === 'so2' ? 'bg-amber-500 text-black' : 'text-zinc-500 hover:text-white'}`}
            >
              SO2
            </button>
          </div>
        </div>

        {/* Tournament Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-zinc-500 mt-4 font-bold animate-pulse">Загрузка турниров...</p>
          </div>
        ) : filteredTournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map(t => {
              const stagesCount = Array.isArray(t.settings?.stages) && t.settings.stages.length > 0 
                ? t.settings.stages.length 
                : 1;

              return (
                <div 
                  key={t.id}
                  onClick={() => handleSelectTournament(t.id)}
                  className="group bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 hover:border-blue-500/50 hover:bg-zinc-850 transition-all cursor-pointer relative overflow-hidden shadow-2xl hover:shadow-blue-500/10 flex flex-col justify-between"
                >
                  <div>
                    {/* Action buttons on card */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase ${t.game === 'so2' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                          {t.game === 'so2' ? 'Standoff 2' : 'CS2'}
                        </span>
                        {t.completed ? (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-lg uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Завершен</span>
                        ) : (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-lg uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">В процессе</span>
                        )}
                        <span className="text-[10px] font-black px-2 py-0.5 rounded text-zinc-400 bg-zinc-800">
                          {stagesCount} {stagesCount === 1 ? 'стадия' : 'стадии'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={(e) => handleEditTournament(e, t)}
                          className="p-2 bg-zinc-800 hover:bg-blue-600 text-zinc-400 hover:text-white rounded-xl transition-all border border-zinc-700/60 shadow-md cursor-pointer"
                          title="Редактировать структуру, название и участников турнира"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => handleDuplicateTournament(e, t)}
                          className="p-2 bg-zinc-800 hover:bg-purple-600 text-zinc-400 hover:text-white rounded-xl transition-all border border-zinc-700/60 shadow-md cursor-pointer"
                          title="Клонировать (дублировать) турнир"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => handleExportSingle(e, t)}
                          className="p-2 bg-zinc-800 hover:bg-blue-600 text-zinc-400 hover:text-white rounded-xl transition-all border border-zinc-700/60 shadow-md cursor-pointer"
                          title="Скачать JSON бэкап этой сетки"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => confirmDelete(e, t.id)}
                          className="p-2 bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white rounded-xl transition-all border border-zinc-700/60 shadow-md cursor-pointer"
                          title="Удалить турнир"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        <TeamLogo teamName={t.name} logoUrl={t.logoUrl} size="lg" className="w-16 h-16 rounded-2xl" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xl font-black text-white truncate group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                          {t.name}
                        </h3>
                        {t.winnerName ? (
                          <p className="text-xs text-amber-400 font-black mt-1 flex items-center gap-1">
                            👑 Чемпион: {t.winnerName}
                          </p>
                        ) : (
                          <p className="text-xs text-zinc-500 font-medium mt-1">
                            Призовой: {t.prizePool || '$100,000'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800/80">
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-zinc-500" />
                        <div className="text-xs">
                          <div className="text-zinc-500 font-black uppercase tracking-tighter text-[10px]">Команды</div>
                          <div className="text-white font-bold">{t.teams?.length || 0} участников</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                        <div className="text-xs">
                          <div className="text-zinc-500 font-black uppercase tracking-tighter text-[10px]">Создан</div>
                          <div className="text-white font-bold truncate">
                            {t.createdAt ? new Date(t.createdAt).toLocaleDateString('ru-RU') : 'Недавно'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-zinc-800/40 flex items-center justify-between text-blue-400 font-black text-xs uppercase tracking-wider group-hover:gap-2 transition-all">
                      <span>Открыть сетку и матчи</span>
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-zinc-900/30 border-2 border-dashed border-zinc-800 rounded-3xl p-12 text-center">
            <div className="bg-zinc-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-600">
              <Trophy className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Турниров не найдено</h3>
            <p className="text-zinc-500 mb-8 max-w-sm mx-auto">Создайте свой первый турнир в 1 клик по шаблону или настройте свою сетку с нуля!</p>
            <button 
              onClick={handleCreateNew}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-3.5 rounded-2xl transition-all shadow-xl shadow-blue-600/30 cursor-pointer"
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
 * Super Convenient Tournament Creation & Editing Flow
 */
function TournamentCreationFlow({ 
  user, 
  initialTournament, 
  onCancel, 
  onComplete 
}: { 
  user: any; 
  initialTournament?: Tournament | null; 
  onCancel: () => void; 
  onComplete: (id: string) => void;
}) {
  const isEditMode = !!initialTournament;
  const [step, setStep] = useState(1);
  const [selectedStageIdx, setSelectedStageIdx] = useState<number>(0);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    logoUrl: string;
    game: 'cs2' | 'so2';
    prizePool: string;
    matchFormat: string;
    stages: Array<{
      type: 'playoff' | 'qualifier' | 'gsl_groups' | 'swiss' | 'groups';
      name?: string;
      teams: Team[];
      numQuals?: number;
      advancePerQual?: number;
      eliminationType?: 'single' | 'double';
    }>;
  }>(() => {
    if (initialTournament) {
      const initStages = (initialTournament.settings?.stages && initialTournament.settings.stages.length > 0)
        ? initialTournament.settings.stages.map((stg, i) => ({
            type: stg.type || 'playoff',
            name: stg.name || `Стадия ${i + 1}`,
            teams: Array.isArray(stg.teams) ? stg.teams : (i === 0 ? initialTournament.teams || [] : []),
            numQuals: stg.numQuals || 4,
            advancePerQual: stg.advancePerQual || 2,
            eliminationType: initialTournament.settings?.eliminationType || 'single'
          }))
        : [
            {
              type: (initialTournament.settings?.stage1Type as any) || 'playoff',
              name: 'Основная стадия',
              teams: initialTournament.teams || [],
              eliminationType: initialTournament.settings?.eliminationType || 'single'
            }
          ];

      return {
        name: initialTournament.name || '',
        logoUrl: initialTournament.logoUrl || '',
        game: (initialTournament.game as any) || 'cs2',
        prizePool: initialTournament.prizePool || '$100,000',
        matchFormat: initialTournament.settings?.matchFormat || 'BO3',
        stages: initStages
      };
    }

    return {
      name: '',
      logoUrl: '',
      game: 'cs2',
      prizePool: '$100,000',
      matchFormat: 'BO3',
      stages: [{ type: 'playoff', name: 'Плей-офф', teams: [], eliminationType: 'single' }]
    };
  });

  // Team Inputs & Bulk Paste Modal
  const [inputTeamName, setInputTeamName] = useState('');
  const [showBulkPasteModal, setShowBulkPasteModal] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState('');
  const [globalTeams, setGlobalTeams] = useState<any[]>([]);
  const [showGlobalDb, setShowGlobalDb] = useState(false);

  // Inline editing of team
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState('');

  // Roster preview modal
  const [previewRosterTeam, setPreviewRosterTeam] = useState<any | null>(null);

  // Bulk selection
  const [selectedTeamsForDeletion, setSelectedTeamsForDeletion] = useState<string[]>([]);

  useEffect(() => {
    if (user?.uid) {
      const roomId = getCanonicalRoomId(user.channelId || user.uid);
      const stored = localStorage.getItem(`teams_${roomId}`) || localStorage.getItem(`teams_${user.uid}`);
      if (stored) {
        try {
          setGlobalTeams(JSON.parse(stored));
        } catch (e) {}
      }
    }
  }, [user]);

  // Frequently used teams from tournaments
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

    // Augment with globalTeams
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

    const usedTeams = Array.from(teamMap.values()).filter(t => t.count > 0);
    return usedTeams.sort((a, b) => b.count - a.count);
  }, [user, globalTeams]);

  // Apply quick template
  const applyPreset = (preset: typeof TOURNAMENT_PRESETS[0]) => {
    const newStages = preset.stages.map((stg, i) => {
      const teams = stg.teamNames.map(name => ({
        id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name,
        logoUrl: getAutoMatchedVectorLogo(name) || undefined,
        players: []
      }));
      return {
        type: stg.type,
        name: stg.name,
        teams,
        numQuals: (stg as any).numQuals || 4,
        advancePerQual: (stg as any).advancePerQual || 2,
        eliminationType: 'single' as const
      };
    });

    setFormData({
      ...formData,
      name: preset.name,
      game: preset.game,
      stages: newStages
    });
    setSelectedStageIdx(0);
  };

  const addTeamToCurrentStage = (nameToAdd?: string, logoUrl?: string, players?: any[]) => {
    if (selectedStageIdx === null || !formData.stages[selectedStageIdx]) return;
    const finalName = (nameToAdd || inputTeamName).trim();
    if (!finalName) return;

    const currentStage = formData.stages[selectedStageIdx];
    if (currentStage.teams.some((t: any) => (t.name || t.nickname || '').toLowerCase() === finalName.toLowerCase())) {
      alert(`Команда "${finalName}" уже есть в этой стадии!`);
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

  // Bulk paste teams (e.g. from clipboard with newlines)
  const handleApplyBulkPaste = () => {
    if (selectedStageIdx === null || !formData.stages[selectedStageIdx]) return;
    const lines = bulkPasteText
      .split(/[\n,;]+/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) return;

    const currentStage = formData.stages[selectedStageIdx];
    const existingNames = new Set((currentStage.teams || []).map(t => t.name.toLowerCase()));
    const newTeamsToAdd: Team[] = [];

    lines.forEach(name => {
      if (!existingNames.has(name.toLowerCase())) {
        existingNames.add(name.toLowerCase());
        newTeamsToAdd.push({
          id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          name,
          logoUrl: getAutoMatchedVectorLogo(name) || undefined,
          players: []
        });
      }
    });

    const newStages = [...formData.stages];
    newStages[selectedStageIdx].teams = [...(newStages[selectedStageIdx].teams || []), ...newTeamsToAdd];
    setFormData({ ...formData, stages: newStages });
    setBulkPasteText('');
    setShowBulkPasteModal(false);
  };

  const removeTeamFromCurrentStage = (teamId: string) => {
    if (selectedStageIdx === null || !formData.stages[selectedStageIdx]) return;
    const newStages = [...formData.stages];
    newStages[selectedStageIdx].teams = (newStages[selectedStageIdx].teams || []).filter((t: any) => t.id !== teamId);
    setFormData({ ...formData, stages: newStages });
    setSelectedTeamsForDeletion(prev => prev.filter(id => id !== teamId));
  };

  const toggleTeamSelection = (teamId: string) => {
    setSelectedTeamsForDeletion(prev => 
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    );
  };

  const deleteSelectedTeams = () => {
    if (selectedStageIdx === null || !formData.stages[selectedStageIdx]) return;
    const newStages = [...formData.stages];
    newStages[selectedStageIdx].teams = (newStages[selectedStageIdx].teams || []).filter((t: any) => !selectedTeamsForDeletion.includes(t.id));
    setFormData({ ...formData, stages: newStages });
    setSelectedTeamsForDeletion([]);
  };

  const shuffleCurrentStageTeams = () => {
    if (selectedStageIdx === null || !formData.stages[selectedStageIdx]) return;
    const newStages = [...formData.stages];
    newStages[selectedStageIdx].teams = [...newStages[selectedStageIdx].teams].sort(() => Math.random() - 0.5);
    setFormData({ ...formData, stages: newStages });
  };

  const sortCurrentStageTeams = () => {
    if (selectedStageIdx === null || !formData.stages[selectedStageIdx]) return;
    const newStages = [...formData.stages];
    newStages[selectedStageIdx].teams = [...newStages[selectedStageIdx].teams].sort((a, b) => a.name.localeCompare(b.name));
    setFormData({ ...formData, stages: newStages });
  };

  const handleSaveOrLaunch = () => {
    const finalId = initialTournament?.id || ('tourn_' + Date.now());

    // Collect all teams
    const allTeamsMap = new Map<string, Team>();
    formData.stages.forEach(s => {
      (s.teams || []).forEach(t => {
        if (t && t.name) {
          const k = t.name.toLowerCase().trim();
          allTeamsMap.set(k, {
            ...t,
            id: t.id || 't_' + Math.random().toString(36).slice(2, 8),
            name: t.name
          });
        }
      });
    });

    const finalTeams = Array.from(allTeamsMap.values());

    // Generate bracket and matches for every stage
    const stagesWithData = formData.stages.map((stg, sIdx) => {
      const stageTeams = Array.isArray(stg.teams) ? stg.teams : [];
      const built = generateStageData(stg.type, stageTeams, {
        eliminationType: stg.eliminationType,
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

    const stage1Data: any = stagesWithData[0] || {};

    const tournamentToSave: Tournament = {
      ...(initialTournament || {}),
      id: finalId,
      name: formData.name || 'Новый турнир',
      logoUrl: formData.logoUrl,
      game: formData.game,
      prizePool: formData.prizePool,
      createdAt: typeof initialTournament?.createdAt === 'number' ? initialTournament.createdAt : Date.now(),
      teams: (stage1Data.teams && stage1Data.teams.length > 0) ? stage1Data.teams : finalTeams,
      bracketRounds: stage1Data.bracketRounds,
      losersBracketRounds: stage1Data.losersBracketRounds,
      grandFinal: stage1Data.grandFinal,
      groups: stage1Data.groups,
      gslGroups: stage1Data.gslGroups,
      swissRounds: stage1Data.swissRounds,
      qualifiersBrackets: stage1Data.qualifiersBrackets,
      settings: {
        ...(initialTournament?.settings || {}),
        mode: formData.stages.length > 1 
          ? 'two_stage' 
          : (formData.stages[0]?.type === 'swiss' ? 'swiss' : 'single_stage'),
        stage1Type: formData.stages[0]?.type || 'playoff',
        eliminationType: formData.stages[0]?.eliminationType || 'single',
        matchFormat: formData.matchFormat,
        game: formData.game,
        numStages: formData.stages.length,
        stages: stagesWithData,
        numQuals: formData.stages[0]?.numQuals,
        advancePerQual: formData.stages[0]?.advancePerQual,
      } as any,
      activeStage: initialTournament?.activeStage || 1,
      completed: initialTournament?.completed || false
    };

    saveTournament(user?.channelId || user?.uid, tournamentToSave);
    onComplete(finalId);
  };

  // Validation
  const hasEmptyStage = formData.stages.some(s => (s.teams?.length || 0) < 2);
  const totalTeamsCount = formData.stages.reduce((acc, s) => acc + (s.teams?.length || 0), 0);

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-8 pb-32 animate-in fade-in duration-300">
      
      {/* Bulk Paste Modal */}
      {showBulkPasteModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Вставить команды списком
              </h3>
              <button onClick={() => setShowBulkPasteModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Вставьте названия команд (каждое с новой строки или через запятую). Система автоматически подберет официальные векторные логотипы!
            </p>
            <textarea
              rows={8}
              value={bulkPasteText}
              onChange={(e) => setBulkPasteText(e.target.value)}
              placeholder="Natus Vincere&#10;FaZe Clan&#10;Team Spirit&#10;Team Vitality&#10;G2 Esports&#10;MOUZ&#10;Astralis&#10;Virtus.pro"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl p-4 text-sm text-white font-mono placeholder:text-zinc-600 outline-none focus:border-blue-500 transition-colors mb-6"
            />
            <div className="flex gap-4">
              <button
                onClick={() => setShowBulkPasteModal(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3.5 rounded-2xl transition-all cursor-pointer"
              >
                ОТМЕНА
              </button>
              <button
                onClick={handleApplyBulkPaste}
                disabled={!bulkPasteText.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                ДОБАВИТЬ ВСЕ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roster Preview Modal */}
      {previewRosterTeam && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-800/30">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                  {previewRosterTeam.logoUrl ? (
                    <img src={previewRosterTeam.logoUrl} alt="" className="w-full h-full object-contain p-2" />
                  ) : (
                    <Trophy className="w-7 h-7 text-zinc-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">{previewRosterTeam.name}</h3>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Состав участников</p>
                </div>
              </div>
              <button onClick={() => setPreviewRosterTeam(null)} className="text-zinc-500 hover:text-white p-2">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
              {Array.isArray(previewRosterTeam.players) && previewRosterTeam.players.length > 0 ? (
                previewRosterTeam.players.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-zinc-800/50 px-4 py-2.5 rounded-xl border border-zinc-700/50">
                    <span className="font-bold text-sm text-white">{p.nickname || p.name}</span>
                    <span className="text-[10px] font-black text-zinc-500 uppercase">{p.role || 'Player'}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-zinc-500 text-xs font-medium">
                  Состав не указан (будет сгенерирован автоматически)
                </div>
              )}
            </div>
            <div className="p-4 border-t border-zinc-800 text-center">
              <button onClick={() => setPreviewRosterTeam(null)} className="text-zinc-400 hover:text-white text-xs font-black uppercase">
                ЗАКРЫТЬ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Breadcrumb & Step Navigation */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onCancel} 
          className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2 font-bold uppercase text-xs tracking-widest cursor-pointer bg-zinc-900 border border-zinc-800 px-4 py-2.5 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" /> Назад к турнирам
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep(1)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              step === 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-zinc-900 text-zinc-500 hover:text-white'
            }`}
          >
            1. Структура и команды
          </button>
          <button
            onClick={() => setStep(2)}
            disabled={!formData.name.trim() || formData.stages.length === 0}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 ${
              step === 2 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-zinc-900 text-zinc-500 hover:text-white'
            }`}
          >
            2. Формат и запуск
          </button>
        </div>
      </div>

      {/* STEP 1: Tournament Setup */}
      {step === 1 && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Quick 1-Click Presets Bar (Shown prominently when creating new tournament) */}
          {!isEditMode && (
            <div className="bg-gradient-to-r from-blue-950/40 via-zinc-900/60 to-purple-950/40 border border-blue-500/20 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <Wand2 className="w-5 h-5 text-amber-400 animate-pulse" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Быстрый старт по шаблонам в 1 клик
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mb-4">
                Выберите готовый шаблон — название, стадии, формат и топовые команды с официальными логотипами подставятся автоматически:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {TOURNAMENT_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="p-3.5 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/60 hover:border-blue-500/50 rounded-2xl text-left transition-all hover:-translate-y-0.5 shadow-lg group cursor-pointer"
                  >
                    <div className="text-xs font-black text-amber-400 mb-1 group-hover:text-blue-400 transition-colors">
                      {p.badge}
                    </div>
                    <div className="text-[11px] font-bold text-white line-clamp-1">{p.name}</div>
                    <div className="text-[9px] text-zinc-500 line-clamp-2 mt-1">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tournament Header Banner */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              
              {/* Logo / Avatar */}
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-2xl bg-zinc-800 border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center text-zinc-500 hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden shadow-xl">
                  {formData.logoUrl ? (
                    <img src={formData.logoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Trophy className="w-8 h-8 mb-1 group-hover:text-blue-400 transition-colors" />
                      <span className="text-[9px] font-black uppercase text-zinc-500">Логотип</span>
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

              {/* Title & Game selection */}
              <div className="flex-1 w-full">
                <input 
                  type="text"
                  placeholder="Введите название турнира..."
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="bg-transparent border-none text-2xl sm:text-3xl font-black text-white outline-none placeholder:text-zinc-600 w-full uppercase tracking-tighter mb-4"
                />

                <div className="flex flex-wrap items-center gap-4 text-xs">
                  {/* Discipline Selector */}
                  <div className="flex bg-zinc-800 p-1 rounded-xl border border-zinc-700">
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, game: 'cs2'})}
                      className={`px-4 py-1.5 rounded-lg font-black uppercase text-[10px] transition-all cursor-pointer ${formData.game === 'cs2' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
                    >
                      CS2
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, game: 'so2'})}
                      className={`px-4 py-1.5 rounded-lg font-black uppercase text-[10px] transition-all cursor-pointer ${formData.game === 'so2' ? 'bg-amber-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'}`}
                    >
                      Standoff 2
                    </button>
                  </div>

                  {/* Prize pool */}
                  <div className="flex items-center gap-2 bg-zinc-800/80 px-3 py-1.5 rounded-xl border border-zinc-700">
                    <span className="text-zinc-500 text-[10px] font-black uppercase">Призовой:</span>
                    <input
                      type="text"
                      value={formData.prizePool}
                      onChange={(e) => setFormData({...formData, prizePool: e.target.value})}
                      placeholder="$100,000"
                      className="bg-transparent text-amber-400 font-black text-xs outline-none w-24"
                    />
                  </div>

                  {/* Summary badges */}
                  <div className="flex items-center gap-2 text-zinc-400 font-bold">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span>{formData.stages.length} стадий</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400 font-bold">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>{totalTeamsCount} команд всего</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stages Tabs Header */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Layers className="w-6 h-6 text-blue-400" />
                  Структура стадий турнира
                </h3>
                <p className="text-zinc-500 text-xs mt-1">
                  Вы можете настроить 1 стадию (например, сразу плей-офф) или многостадийный турнир (квалификации → швейцарка → плей-офф).
                </p>
              </div>

              <button 
                type="button"
                onClick={() => {
                  const newStages = [...formData.stages, { type: 'playoff' as const, name: `Стадия ${formData.stages.length + 1}`, teams: [], eliminationType: 'single' as const }];
                  setFormData({...formData, stages: newStages});
                  setSelectedStageIdx(newStages.length - 1);
                }}
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md self-start sm:self-auto"
              >
                <Plus className="w-4 h-4 text-blue-400" /> ДОБАВИТЬ СТАДИЮ
              </button>
            </div>

            {/* Stage Selector Pills */}
            <div className="flex flex-wrap gap-3 mb-8">
              {formData.stages.map((stage, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedStageIdx(idx)}
                  className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-4 min-w-[200px] cursor-pointer relative group ${
                    selectedStageIdx === idx 
                      ? 'border-blue-500 bg-blue-600/10 shadow-lg shadow-blue-500/10' 
                      : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="text-[10px] font-black uppercase text-blue-400 mb-0.5">
                      Стадия {idx + 1}
                    </div>
                    <div className="text-sm font-black text-white uppercase truncate max-w-[140px]">
                      {stage.name || (stage.type === 'playoff' ? 'Плей-офф' : stage.type === 'swiss' ? 'Швейцарка' : stage.type === 'gsl_groups' ? 'GSL Группы' : stage.type === 'qualifier' ? 'Квалификации' : 'Группы')}
                    </div>
                  </div>

                  <span className="text-xs font-black bg-zinc-800 px-2.5 py-1 rounded-lg text-white/80">
                    {stage.teams?.length || 0}
                  </span>

                  {formData.stages.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextStages = formData.stages.filter((_, i) => i !== idx);
                        setFormData({...formData, stages: nextStages});
                        if (selectedStageIdx >= nextStages.length) {
                          setSelectedStageIdx(Math.max(0, nextStages.length - 1));
                        }
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-zinc-700"
                      title="Удалить стадию"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Currently Selected Stage Config */}
            {selectedStageIdx !== null && formData.stages[selectedStageIdx] && (
              <div className="bg-zinc-950 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 space-y-6">
                
                {/* Stage Parameters Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
                  <div className="flex-1">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider block mb-1">
                      Настройка Стадии {selectedStageIdx + 1}
                    </span>
                    <input 
                      type="text"
                      value={formData.stages[selectedStageIdx].name || ''}
                      onChange={(e) => {
                        const newStages = [...formData.stages];
                        newStages[selectedStageIdx].name = e.target.value;
                        setFormData({...formData, stages: newStages});
                      }}
                      placeholder="Название стадии..."
                      className="bg-transparent border-none text-xl font-black text-white outline-none placeholder:text-zinc-600 uppercase"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Stage Format Type */}
                    <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-700">
                      <span className="text-[10px] font-black text-zinc-400 uppercase">Формат:</span>
                      <select 
                        value={formData.stages[selectedStageIdx].type}
                        onChange={(e) => {
                          const newStages = [...formData.stages];
                          newStages[selectedStageIdx].type = e.target.value as any;
                          if (e.target.value === 'qualifier') {
                            newStages[selectedStageIdx].numQuals = 4;
                            newStages[selectedStageIdx].advancePerQual = 2;
                          }
                          setFormData({...formData, stages: newStages});
                        }}
                        className="bg-transparent text-white font-black text-xs uppercase outline-none cursor-pointer [color-scheme:dark]"
                      >
                        <option value="playoff">Play-off (Сетка на выбывание)</option>
                        <option value="swiss">Швейцарская система (Swiss)</option>
                        <option value="gsl_groups">GSL Группы (Double-Elim)</option>
                        <option value="groups">Классический групповой этап</option>
                        <option value="qualifier">Отборочные квалификации</option>
                      </select>
                    </div>

                    {/* Elimination Type for playoff */}
                    {formData.stages[selectedStageIdx].type === 'playoff' && (
                      <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-700">
                        <button
                          type="button"
                          onClick={() => {
                            const newStages = [...formData.stages];
                            newStages[selectedStageIdx].eliminationType = 'single';
                            setFormData({...formData, stages: newStages});
                          }}
                          className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                            formData.stages[selectedStageIdx].eliminationType !== 'double' 
                              ? 'bg-blue-600 text-white' 
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          Single-Elim
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newStages = [...formData.stages];
                            newStages[selectedStageIdx].eliminationType = 'double';
                            setFormData({...formData, stages: newStages});
                          }}
                          className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                            formData.stages[selectedStageIdx].eliminationType === 'double' 
                              ? 'bg-blue-600 text-white' 
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          Double-Elim
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Input & Tools Bar */}
                <div className="space-y-4">
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
                        placeholder="Введите название команды и нажмите Enter..."
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-blue-500 transition-all font-medium"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => addTeamToCurrentStage()}
                      disabled={!inputTeamName.trim()}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95 shrink-0"
                    >
                      <Plus className="w-4 h-4" /> Добавить
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowBulkPasteModal(true)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-black px-5 py-3 rounded-2xl text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 transition-all border border-zinc-700 shrink-0"
                      title="Вставить список команд через перенос строки"
                    >
                      <FileText className="w-4 h-4 text-blue-400" /> Вставить списком
                    </button>
                  </div>

                  {/* Secondary Quick Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={shuffleCurrentStageTeams}
                        disabled={(formData.stages[selectedStageIdx].teams?.length || 0) < 2}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-400 hover:text-white border border-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Перемешать команды случайным образом"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-blue-400" /> Рандомный посев
                      </button>
                      <button
                        type="button"
                        onClick={sortCurrentStageTeams}
                        disabled={(formData.stages[selectedStageIdx].teams?.length || 0) < 2}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-zinc-400 hover:text-white border border-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Сортировать по алфавиту"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" /> По алфавиту
                      </button>
                      
                      {selectedTeamsForDeletion.length > 0 && (
                        <button
                          type="button"
                          onClick={deleteSelectedTeams}
                          className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Удалить выбранные ({selectedTeamsForDeletion.length})
                        </button>
                      )}
                    </div>

                    {/* Quick DB Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-zinc-400 hover:text-white transition-colors">
                      <input
                        type="checkbox"
                        checked={showGlobalDb}
                        onChange={(e) => setShowGlobalDb(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 bg-zinc-900 border-zinc-700 cursor-pointer accent-blue-600"
                      />
                      <Database className="w-3.5 h-3.5 text-blue-400" />
                      Показать популярные команды ({tournamentInviteTeams.length})
                    </label>
                  </div>

                  {/* Popular teams quick invite chips */}
                  {showGlobalDb && tournamentInviteTeams.length > 0 && (
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 animate-in fade-in duration-200">
                      <div className="text-[10px] font-black uppercase text-zinc-500 tracking-wider mb-2">
                        Кликните по команде для быстрого добавления в эту стадию:
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto custom-scrollbar">
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
                              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                isAlreadyInStage
                                  ? 'bg-blue-600/10 text-blue-300/60 border border-blue-500/20 cursor-not-allowed'
                                  : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 hover:border-blue-500/50 hover:-translate-y-0.5'
                              }`}
                            >
                              {gt.logoUrl ? (
                                <img src={gt.logoUrl} alt="" className="w-4 h-4 rounded object-contain" />
                              ) : (
                                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                              )}
                              <span>{gt.name}</span>
                              {isAlreadyInStage && <Check className="w-3 h-3 text-blue-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Stage Teams List / Grid */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-3 text-xs">
                      <div className="font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                        <span>Команды в этой стадии:</span>
                        <span className="bg-zinc-800 text-white px-2 py-0.5 rounded-md font-bold">
                          {formData.stages[selectedStageIdx].teams?.length || 0}
                        </span>
                      </div>

                      {/* Ready/warning indicator */}
                      {(formData.stages[selectedStageIdx].teams?.length || 0) < 2 ? (
                        <span className="text-amber-400 font-bold flex items-center gap-1.5 text-[11px]">
                          ⚠️ Нужно минимум 2 команды для сетки
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-[11px]">
                          <Check className="w-3.5 h-3.5" /> Сетка готова к генерации
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 min-h-[160px] p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800/80 content-start">
                      {(formData.stages[selectedStageIdx].teams || []).map((t, tIdx) => {
                        const isSelected = selectedTeamsForDeletion.includes(t.id);
                        const isEditingThis = editingTeamId === t.id;

                        return (
                          <div 
                            key={t.id || tIdx}
                            className={`bg-zinc-850 px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 group ${
                              isSelected ? 'border-red-500 bg-red-950/20' : 'border-zinc-700/60 hover:border-blue-500/50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleTeamSelection(t.id)}
                                className="w-3.5 h-3.5 rounded text-red-600 bg-zinc-900 border-zinc-700 cursor-pointer accent-red-600"
                              />

                              {/* Team Logo */}
                              <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0 border border-zinc-700 relative group/logo">
                                {t.logoUrl ? (
                                  <img src={t.logoUrl} alt="" className="w-full h-full object-contain p-0.5" />
                                ) : (
                                  <Trophy className="w-3.5 h-3.5 text-zinc-600" />
                                )}
                              </div>

                              {/* Team Name or Inline Edit */}
                              {isEditingThis ? (
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingTeamName}
                                  onChange={(e) => setEditingTeamName(e.target.value)}
                                  onBlur={() => {
                                    if (editingTeamName.trim()) {
                                      const newStages = [...formData.stages];
                                      const targetT = newStages[selectedStageIdx].teams.find(tm => tm.id === t.id);
                                      if (targetT) {
                                        targetT.name = editingTeamName.trim();
                                        targetT.logoUrl = getAutoMatchedVectorLogo(targetT.name) || targetT.logoUrl;
                                      }
                                      setFormData({...formData, stages: newStages});
                                    }
                                    setEditingTeamId(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  className="bg-zinc-900 border border-blue-500 rounded px-2 py-0.5 text-xs font-bold text-white outline-none w-full"
                                />
                              ) : (
                                <span 
                                  onClick={() => {
                                    setEditingTeamId(t.id);
                                    setEditingTeamName(t.name);
                                  }}
                                  title="Кликните для переименования"
                                  className="text-xs font-bold text-white truncate cursor-pointer hover:text-blue-400 transition-colors uppercase flex-1"
                                >
                                  {t.name}
                                </span>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTeamId(t.id);
                                  setEditingTeamName(t.name);
                                }}
                                className="p-1 hover:bg-zinc-700 text-zinc-500 hover:text-white rounded transition-colors"
                                title="Переименовать"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeTeamFromCurrentStage(t.id)}
                                className="p-1 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded transition-colors"
                                title="Удалить из стадии"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {(formData.stages[selectedStageIdx].teams || []).length === 0 && (
                        <div className="col-span-full py-10 flex flex-col items-center justify-center text-zinc-600 gap-2">
                          <Users className="w-10 h-10 opacity-30" />
                          <p className="text-xs font-bold">В этой стадии пока нет добавленных команд</p>
                          <p className="text-[11px] text-zinc-500">
                            Введите название выше или воспользуйтесь кнопкой "Вставить списком"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="flex justify-between items-center pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="text-zinc-500 hover:text-white font-bold text-xs uppercase cursor-pointer"
            >
              Отмена
            </button>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!formData.name.trim() || formData.stages.length === 0}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black px-8 py-4 rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-blue-600/30 cursor-pointer"
            >
              ДАЛЕЕ К ПРОВЕРКЕ И ЗАПУСКУ <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Summary & Launch */}
      {step === 2 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 sm:p-12 shadow-2xl max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-600/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400">
              <Trophy className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">
              {isEditMode ? 'Сохранить изменения' : 'Готов к запуску!'}
            </h2>
            <p className="text-xs text-zinc-400 mt-2">
              Проверьте структуру турнира и выберите формат матчей перед финальным сохранением.
            </p>
          </div>

          {/* Summary Box */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
              <span className="text-zinc-500 font-bold uppercase">Название турнира:</span>
              <span className="text-white font-black text-sm uppercase">{formData.name}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
              <span className="text-zinc-500 font-bold uppercase">Дисциплина:</span>
              <span className={`px-2.5 py-0.5 rounded font-black uppercase text-[10px] ${formData.game === 'so2' ? 'bg-amber-500 text-black' : 'bg-blue-600 text-white'}`}>
                {formData.game === 'so2' ? 'Standoff 2' : 'CS2'}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
              <span className="text-zinc-500 font-bold uppercase">Призовой фонд:</span>
              <span className="text-amber-400 font-black">{formData.prizePool || '$100,000'}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
              <span className="text-zinc-500 font-bold uppercase">Формат серии матчей:</span>
              <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-700">
                {['BO1', 'BO3', 'BO5'].map(fmt => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormData({...formData, matchFormat: fmt})}
                    className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all cursor-pointer ${
                      formData.matchFormat === fmt ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Stages overview */}
            <div className="pt-2">
              <span className="text-zinc-500 font-bold uppercase block mb-2">Стадии турнира:</span>
              <div className="space-y-2">
                {formData.stages.map((stg, i) => (
                  <div key={i} className="flex justify-between items-center bg-zinc-900/80 px-4 py-2.5 rounded-xl border border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-zinc-800 text-zinc-400 flex items-center justify-center font-bold text-[10px]">
                        {i + 1}
                      </span>
                      <span className="font-bold text-white uppercase">{stg.name || `Стадия ${i + 1}`}</span>
                      <span className="text-[10px] text-blue-400">({stg.type})</span>
                    </div>
                    <span className="font-black text-zinc-300">{stg.teams?.length || 0} команд</span>
                  </div>
                ))}
              </div>
            </div>

            {hasEmptyStage && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
                ⚠️ В одной из стадий меньше 2 команд. Рекомендуется вернуться на Шаг 1 и добавить участников для корректной генерации сетки.
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-black py-4 rounded-2xl transition-all cursor-pointer text-xs uppercase"
            >
              НАЗАД К НАСТРОЙКАМ
            </button>
            <button
              type="button"
              onClick={handleSaveOrLaunch}
              className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase"
            >
              <Trophy className="w-4 h-4" />
              {isEditMode ? 'СОХРАНИТЬ ИЗМЕНЕНИЯ' : 'ЗАПУСТИТЬ ТУРНИР'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
