import React, { useState, useEffect } from 'react';
import { TeamAutocompleteInput } from '../TeamAutocompleteInput';
import { TournamentSettings, Team, TournamentStageConfig } from './types';
import { 
  Trash2, Upload, X, Check, Shuffle, Plus, Layers, Sparkles, 
  Settings, Trophy, Image as ImageIcon, Sliders, ArrowRight, 
  HelpCircle, AlertTriangle, RefreshCw, Users, Shield, Globe, Coins,
  ChevronRight, ArrowLeftRight, Eye, Grid, ListFilter, Camera
} from 'lucide-react';
import TeamLogo from '../TeamLogo';
import { getAutoMatchedVectorLogo } from '../../lib/logoMatcher';
import { safeLocalStorageSet, shuffleArray } from '../../lib/utils';
import { getCanonicalRoomId } from './storage';
import { BG_THEMES } from './TournamentManager';

const PRESET_TOURNAMENT_LOGOS = [
  { id: 'blast', name: 'BLAST', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80' },
  { id: 'iem', name: 'IEM', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=150&auto=format&fit=crop&q=80' },
  { id: 'major', name: 'Major', url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=150&auto=format&fit=crop&q=80' },
  { id: 'esl', name: 'ESL', url: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=150&auto=format&fit=crop&q=80' },
  { id: 'starladder', name: 'StarLadder', url: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=150&auto=format&fit=crop&q=80' },
  { id: 'pgl', name: 'PGL', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=150&auto=format&fit=crop&q=80' },
];

const PRIZE_PRESETS = [
  '$50,000',
  '$100,000',
  '$250,000',
  '$500,000',
  '$1,000,000',
  '1,500,000 ₽'
];

interface Props {
  user?: any;
  initialName?: string;
  initialLogoUrl?: string;
  initialPrizePool?: string;
  initialSettings?: TournamentSettings;
  initialTeams?: Team[];
  initialGame?: 'cs2' | 'so2';
  onSave: (name: string, settings: TournamentSettings, teams: Team[], logoUrl?: string, prizePool?: string, isTeamsOrFormatModified?: boolean) => void;
  submitLabel: string;
}

export default function TournamentSettingsForm({
  user,
  initialName = "",
  initialLogoUrl = "",
  initialPrizePool = "$100,000",
  initialSettings,
  initialTeams = [],
  initialGame = 'cs2',
  onSave,
  submitLabel
}: Props) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'general' | 'teams' | 'other'>('general');
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const bgInputRef = React.useRef<HTMLInputElement>(null);
  const [teamsTouched, setTeamsTouched] = useState(false);
  const [formatTouched, setFormatTouched] = useState(false);

  // TAB 1: General Info
  const [name, setName] = useState(initialName);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [prizePool, setPrizePool] = useState(initialPrizePool);
  const [game, setGame] = useState<'cs2' | 'so2'>((initialSettings?.game as any) || initialGame || 'cs2');
  const [bgImage, setBgImage] = useState<string>(initialSettings?.bgImage || '');
  const [bgTheme, setBgTheme] = useState<string>(initialSettings?.bgTheme || 'cyber_grid');
  const [bgBlur, setBgBlur] = useState<number>(initialSettings?.bgBlur ?? 0);
  const [bgOpacity, setBgOpacity] = useState<number>(initialSettings?.bgOpacity ?? 50);

  // TAB 2: Stages & Teams
  // Initialize stages: either from initialSettings.stages or convert existing single/two stage structure
  const [stages, setStages] = useState<TournamentStageConfig[]>(() => {
    if (initialSettings?.stages && Array.isArray(initialSettings.stages) && initialSettings.stages.length > 0) {
      return initialSettings.stages.map((stg, idx) => ({
        ...stg,
        id: stg.id || `stage_${idx + 1}`,
        name: stg.name || `Стадия ${idx + 1}`,
        type: stg.type || 'playoff',
        teams: Array.isArray(stg.teams) ? stg.teams : []
      }));
    }

    // Fallback: create default stages based on settings
    if (initialSettings?.mode === 'two_stage' || initialSettings?.stage1Type === 'groups' || initialSettings?.stage1Type === 'gsl_groups' || initialSettings?.stage1Type === 'swiss') {
      return [
        {
          id: 'stage_1',
          name: 'Стадия 1 (Групповой этап)',
          type: initialSettings.stage1Type || 'groups',
          teams: initialTeams || []
        },
        {
          id: 'stage_2',
          name: 'Стадия 2 (Плей-офф)',
          type: 'playoff',
          teams: []
        }
      ];
    }

    return [
      {
        id: 'stage_1',
        name: 'Стадия 1 (Основная сетка)',
        type: (initialSettings?.stage1Type as any) || 'playoff',
        teams: initialTeams || []
      }
    ];
  });

  const [activeStageIdx, setActiveStageIdx] = useState<number>(0);
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedTeamsForMove, setSelectedTeamsForMove] = useState<string[]>([]);
  const [globalTeams, setGlobalTeams] = useState<any[]>([]);

  // TAB 3: Other settings
  const [matchFormat, setMatchFormat] = useState(initialSettings?.matchFormat || 'BO3');
  const [eliminationType, setEliminationType] = useState<'single' | 'double'>(initialSettings?.eliminationType || 'single');
  const [boxStyle, setBoxStyle] = useState<any>(initialSettings?.boxStyle || 'classic');
  const [bracketScale, setBracketScale] = useState<number>(initialSettings?.bracketScale || 100);
  
  // Group settings
  const [numberOfGroups, setNumberOfGroups] = useState<number>(initialSettings?.numberOfGroups || 2);
  const [matchesPerPairing, setMatchesPerPairing] = useState<1 | 2>(initialSettings?.matchesPerPairing || 1);
  const [advancingPerGroup, setAdvancingPerGroup] = useState<number>(initialSettings?.advancingPerGroup || 2);
  const [winPoints, setWinPoints] = useState<number>(initialSettings?.winPoints ?? 3);
  const [drawPoints, setDrawPoints] = useState<number>(initialSettings?.drawPoints ?? 1);
  const [lossPoints, setLossPoints] = useState<number>(initialSettings?.lossPoints ?? 0);
  const [gslAdvanceCount, setGslAdvanceCount] = useState<2 | 3 | 4>(initialSettings?.gslAdvanceCount || 2);

  // Swiss settings
  const [swissWinsToAdvance, setSwissWinsToAdvance] = useState<number>(initialSettings?.swissWinsToAdvance || 3);
  const [swissLossesToEliminate, setSwissLossesToEliminate] = useState<number>(initialSettings?.swissLossesToEliminate || 3);
  const [swissLogosOnly, setSwissLogosOnly] = useState<boolean>(initialSettings?.swissLogosOnly || false);

  const [error, setError] = useState('');

  // Load saved teams from local room database
  useEffect(() => {
    if (user?.uid) {
      const roomId = getCanonicalRoomId(user.channelId || user.uid);
      const loadGlobal = () => {
        const stored = localStorage.getItem(`teams_${roomId}`) || localStorage.getItem(`teams_${user.uid}`);
        if (stored) {
          try {
            setGlobalTeams(JSON.parse(stored));
          } catch (e) {}
        }
      };
      loadGlobal();
      window.addEventListener("db-user-updated", loadGlobal);
      return () => window.removeEventListener("db-user-updated", loadGlobal);
    }
  }, [user]);

  // Stage Management
  const addStage = () => {
    setTeamsTouched(true);
    setFormatTouched(true);
    const nextIdx = stages.length + 1;
    const newStage: TournamentStageConfig = {
      id: `stage_${Date.now()}`,
      name: `Стадия ${nextIdx}`,
      type: 'playoff',
      teams: []
    };
    setStages([...stages, newStage]);
    setActiveStageIdx(stages.length);
  };

  const removeStage = (idxToRemove: number) => {
    if (stages.length <= 1) {
      alert("В турнире должна быть минимум одна стадия!");
      return;
    }
    if (confirm(`Удалить стадию ${idxToRemove + 1}? Все команды этой стадии будут перенесены в Стадию 1.`)) {
      setTeamsTouched(true);
      setFormatTouched(true);
      const removedStageTeams = stages[idxToRemove].teams || [];
      const updated = stages.filter((_, i) => i !== idxToRemove);
      
      // Move removed stage teams to stage 0 if not already present
      if (removedStageTeams.length > 0 && updated[0]) {
        const existingNames = new Set(updated[0].teams.map(t => t.name.toLowerCase()));
        const toAdd = removedStageTeams.filter(t => !existingNames.has(t.name.toLowerCase()));
        updated[0].teams = [...updated[0].teams, ...toAdd];
      }

      setStages(updated);
      setActiveStageIdx(Math.max(0, idxToRemove - 1));
    }
  };

  // Team Management inside the active stage
  const handleAddTeamToActiveStage = (teamNameToAdd?: string, logo?: string, optionalPlayers?: any[]) => {
    const rawName = (teamNameToAdd || newTeamName).trim();
    if (!rawName) return;

    const currentStage = stages[activeStageIdx];
    if (!currentStage) return;

    // Check if team with this name already exists in active stage
    if (currentStage.teams.some(t => t.name.toLowerCase() === rawName.toLowerCase())) {
      alert(`Команда "${rawName}" уже присутствует в Стадии ${activeStageIdx + 1}!`);
      return;
    }

    setTeamsTouched(true);
    const autoLogo = logo || getAutoMatchedVectorLogo(rawName);
    const newTeam: Team = {
      id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name: rawName,
      logoUrl: autoLogo || undefined,
      players: optionalPlayers || []
    };

    const updatedStages = [...stages];
    updatedStages[activeStageIdx].teams = [...currentStage.teams, newTeam];
    setStages(updatedStages);
    setNewTeamName("");
  };

  const handleRemoveTeamFromStage = (stageIdx: number, teamId: string) => {
    setTeamsTouched(true);
    const updatedStages = [...stages];
    updatedStages[stageIdx].teams = updatedStages[stageIdx].teams.filter(t => t.id !== teamId);
    setStages(updatedStages);
  };

  const handleMoveTeamToStage = (fromStageIdx: number, targetStageIdx: number, team: Team) => {
    if (fromStageIdx === targetStageIdx) return;
    setTeamsTouched(true);
    const updatedStages = [...stages];

    // Remove from source
    updatedStages[fromStageIdx].teams = updatedStages[fromStageIdx].teams.filter(t => t.id !== team.id);

    // Add to target if not exists
    if (!updatedStages[targetStageIdx].teams.some(t => t.name.toLowerCase() === team.name.toLowerCase())) {
      updatedStages[targetStageIdx].teams = [...updatedStages[targetStageIdx].teams, team];
    }

    setStages(updatedStages);
  };

  const handleShuffleStageTeams = (stageIdx: number) => {
    setTeamsTouched(true);
    const updatedStages = [...stages];
    updatedStages[stageIdx].teams = shuffleArray([...updatedStages[stageIdx].teams]);
    setStages(updatedStages);
  };

  const handleClearStageTeams = (stageIdx: number) => {
    if (confirm(`Очистить список команд в Стадии ${stageIdx + 1}?`)) {
      setTeamsTouched(true);
      const updatedStages = [...stages];
      updatedStages[stageIdx].teams = [];
      setStages(updatedStages);
    }
  };

  // Upload teams from JSON for the active stage
  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (re) => {
      try {
        const content = re.target?.result as string;
        const parsed = JSON.parse(content);

        // 1. Full tournament structure check
        if (parsed.stages && Array.isArray(parsed.stages) && parsed.stages.length > 0) {
          if (confirm("В файле обнаружена полная структура турнира со стадиями. Заменить текущие настройки турнира данными из файла?")) {
            setStages(parsed.stages);
            if (parsed.name) setName(parsed.name);
            
            // If there are matches in the stages, also backfill them to Top Skleyki for convenience
            const allMatches: any[] = [];
            parsed.stages.forEach((stg: any) => {
              if (stg.bracketRounds) stg.bracketRounds.flat().forEach((m: any) => m && allMatches.push(m));
              if (stg.groups) stg.groups.forEach((g: any) => g.matches && allMatches.push(...g.matches));
              if (stg.swissRounds) stg.swissRounds.flat().forEach((m: any) => m && allMatches.push(m));
              if (stg.gslGroups) stg.gslGroups.forEach((g: any) => {
                if (g.upperBracket) g.upperBracket.flat().forEach((m: any) => m && allMatches.push(m));
                if (g.lowerBracket) g.lowerBracket.flat().forEach((m: any) => m && allMatches.push(m));
              });
            });

            if (allMatches.length > 0) {
              const existingSkleyka = JSON.parse(localStorage.getItem('skleyka_matches') || '[]');
              const combined = [...allMatches.filter(m => m.isFinished || m.winnerId), ...existingSkleyka];
              // De-duplicate by id
              const unique = Array.from(new Map(combined.map(m => [m.id, m])).values());
              localStorage.setItem('skleyka_matches', JSON.stringify(unique));
            }

            setTeamsTouched(true);
            alert("Структура турнира и матчи успешно импортированы!");
            return;
          }
        }

        // 2. Standard teams extraction
        let incoming: any[] = [];
        if (Array.isArray(parsed)) incoming = parsed;
        else if (parsed.teams && Array.isArray(parsed.teams)) incoming = parsed.teams;
        else if (parsed.teamName || parsed.name || parsed.players || parsed.roster || parsed.lineup) incoming = [parsed];

        if (incoming.length > 0) {
          setTeamsTouched(true);
          const norm: Team[] = incoming.map((t: any) => {
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
              id: t.id || 't_' + Math.random().toString(36).slice(2, 8),
              name: t.teamName || t.name || t.nickname || 'Unknown Team',
              logoUrl: t.logoUrl || t.logo || t.avatar || getAutoMatchedVectorLogo(t.teamName || t.name || t.nickname || ''),
              players: normPlayers
            };
          });

          const updatedStages = [...stages];
          const currentStage = updatedStages[activeStageIdx];
          const existingNames = new Set(currentStage.teams.map(t => t.name.toLowerCase()));
          const newUnique = norm.filter(t => !existingNames.has(t.name.toLowerCase()));

          updatedStages[activeStageIdx].teams = [...currentStage.teams, ...newUnique];
          setStages(updatedStages);
          alert(`Успешно добавлено ${newUnique.length} команд с составами в Стадию ${activeStageIdx + 1}!`);
        } else {
          alert("Команды в файле не найдены. Проверьте структуру JSON.");
        }
      } catch (err) {
        alert("Ошибка чтения JSON файла.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Save handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Пожалуйста, введите название турнира.");
      setActiveTab('general');
      return;
    }

    const isTeamsOrFormatModified = teamsTouched || formatTouched;
    let finalTeams = initialTeams;
    let finalStages = initialSettings?.stages && !teamsTouched ? initialSettings.stages : stages;

    if (teamsTouched) {
      // Collect all unique teams across all stages
      const allTeamsMap = new Map<string, Team>();
      stages.forEach(stg => {
        stg.teams.forEach(t => {
          const key = (t.id || t.name).toLowerCase().trim();
          if (!allTeamsMap.has(key)) {
            allTeamsMap.set(key, t);
          }
        });
      });
      finalTeams = Array.from(allTeamsMap.values());
      finalStages = stages;
    }

    const finalSettings: TournamentSettings = {
      ...initialSettings,
      game,
      matchFormat,
      eliminationType,
      numStages: finalStages.length,
      stages: finalStages,
      stage1Type: finalStages[0]?.type || initialSettings?.stage1Type || 'playoff',
      mode: formatTouched
        ? (finalStages.length > 1 ? 'two_stage' : (finalStages[0]?.type === 'swiss' ? 'swiss' : 'single_stage'))
        : (initialSettings?.mode || (finalStages.length > 1 ? 'two_stage' : 'single_stage')),
      hasStage2: finalStages.length > 1,
      numberOfGroups,
      matchesPerPairing,
      advancingPerGroup,
      winPoints,
      drawPoints,
      lossPoints,
      gslAdvanceCount,
      swissWinsToAdvance,
      swissLossesToEliminate,
      swissLogosOnly,
      boxStyle,
      bracketScale,
      bgTheme: bgImage ? 'custom' : bgTheme,
      bgImage,
      bgBlur,
      bgOpacity
    };

    onSave(name.trim(), finalSettings, finalTeams, logoUrl, prizePool, isTeamsOrFormatModified);
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-[#0a0a0f] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="bg-[#ff8f00]/20 text-[#ff8f00] border border-[#ff8f00]/40 text-xs px-3 py-1 rounded-xl font-black uppercase tracking-wider">
              Настройки Турнира
            </span>
            <span className="text-white/40 text-xs font-bold uppercase tracking-widest">
              Бета / Мультистадии
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-2 uppercase tracking-tight">
            {name || "Новый турнир"}
          </h2>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-black/50 p-1.5 rounded-2xl border border-white/10 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'bg-[#ff8f00] text-black shadow-[0_0_15px_rgba(255,143,0,0.3)]'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy className="w-4 h-4" />
            1. Главное
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'teams'
                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            2. Команды ({stages.reduce((acc, s) => acc + (s.teams?.length || 0), 0)})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('other')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'other'
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders className="w-4 h-4" />
            3. Прочее
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/40 text-red-300 p-4 rounded-2xl mb-8 flex items-center gap-3 font-bold text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ========================================================================= */}
        {/* TAB 1: ГЛАВНОЕ (Аватарка, дисциплина, призовой, фон турнира) */}
        {/* ========================================================================= */}
        {activeTab === 'general' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Аватарка (квадратик перед названием) + Название и Дисциплина */}
            <div className="bg-black/30 p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row gap-6 items-start">
              {/* Скрытый инпут для логотипа */}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (re) => setLogoUrl(re.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />

              {/* Квадратик аватарки турнира перед названием */}
              <div className="flex flex-col items-center gap-2 shrink-0 self-center md:self-start">
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-black/60 border-2 ${
                    logoUrl ? 'border-white/20 hover:border-[#ff8f00]/60' : 'border-dashed border-white/20 hover:border-[#ff8f00]'
                  } flex flex-col items-center justify-center overflow-hidden shrink-0 shadow-lg cursor-pointer transition-all group relative`}
                  title={logoUrl ? "Нажмите для смены фото" : "Нажмите для загрузки фото"}
                >
                  {logoUrl ? (
                    <>
                      <img src={logoUrl} alt="Логотип турнира" className="w-full h-full object-contain p-2" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-[10px] font-black uppercase text-center p-1">
                        <Camera className="w-5 h-5 mb-1 text-[#ff8f00]" />
                        <span>Сменить</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-2 text-white/40 group-hover:text-white transition-colors flex flex-col items-center justify-center">
                      <Camera className="w-8 h-8 mx-auto mb-1.5 opacity-60 group-hover:scale-110 transition-transform text-[#ff8f00]" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-center leading-tight">Добавить фото</span>
                    </div>
                  )}
                </div>

                {/* Кнопка под квадратиком */}
                {logoUrl ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                    >
                      Заменить фото
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Удалить фото"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-white/30 font-medium">Нажмите на квадрат</span>
                )}
              </div>

              {/* Название и Дисциплина */}
              <div className="flex-1 w-full space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-white/50 tracking-wider flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#ff8f00]" />
                    Название турнира *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(''); }}
                    placeholder="Например: PGL Major Copenhagen 2026"
                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 text-white text-lg font-bold placeholder:text-white/20 focus:border-[#ff8f00] outline-none transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-white/50 tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    Дисциплина
                  </label>
                  <div className="grid grid-cols-2 gap-3 max-w-md">
                    <button
                      type="button"
                      onClick={() => setGame('cs2')}
                      className={`py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        game === 'cs2'
                          ? 'bg-blue-600 text-white border border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                          : 'bg-black/40 border border-white/5 text-white/50 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>🔫 CS2</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGame('so2')}
                      className={`py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        game === 'so2'
                          ? 'bg-amber-500 text-black border border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                          : 'bg-black/40 border border-white/5 text-white/50 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>🎯 Standoff 2</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Призовой фонд */}
            <div className="bg-black/30 p-6 rounded-3xl border border-white/5 space-y-4">
              <label className="text-xs font-black uppercase text-white/50 tracking-wider flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#ff8f00]" />
                Призовой фонд турнира
              </label>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={prizePool}
                  onChange={(e) => setPrizePool(e.target.value)}
                  placeholder="$100,000"
                  className="w-full sm:w-1/2 bg-black/60 border border-white/10 rounded-2xl px-5 py-3.5 text-white font-bold text-lg outline-none focus:border-[#ff8f00]"
                />
                
                {/* Prize presets */}
                <div className="flex flex-wrap items-center gap-2">
                  {PRIZE_PRESETS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setPrizePool(amount)}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        prizePool === amount
                          ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                          : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/5'
                      }`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Фон турнира: просто квадратик где будет показан фон */}
            <div className="bg-black/30 p-6 rounded-3xl border border-white/5 space-y-6">
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Фон турнира
                </h4>
                <p className="text-xs text-white/40 mt-1">
                  Загрузите фоновое изображение для арены турнира
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {/* Скрытый инпут для фона */}
                <input
                  ref={bgInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (re) => setBgImage(re.target?.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                />

                {/* Квадратик фона */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div
                    onClick={() => bgInputRef.current?.click()}
                    className={`w-40 h-28 sm:w-48 sm:h-32 rounded-2xl bg-black/60 border-2 ${
                      bgImage ? 'border-white/20 hover:border-purple-500/60' : 'border-dashed border-white/20 hover:border-purple-500'
                    } flex flex-col items-center justify-center overflow-hidden shrink-0 shadow-lg cursor-pointer transition-all group relative`}
                    title={bgImage ? "Нажмите для смены фона" : "Нажмите для загрузки фона"}
                  >
                    {bgImage ? (
                      <>
                        <img src={bgImage} alt="Фон турнира" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-[10px] font-black uppercase text-center p-1">
                          <Upload className="w-5 h-5 mb-1 text-purple-400" />
                          <span>Сменить фон</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-3 text-white/40 group-hover:text-white transition-colors flex flex-col items-center justify-center">
                        <Upload className="w-7 h-7 mx-auto mb-1.5 opacity-60 group-hover:scale-110 transition-transform text-purple-400" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-center leading-tight">Загрузить фон</span>
                      </div>
                    )}
                  </div>

                  {bgImage ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => bgInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                      >
                        Заменить фото
                      </button>
                      <button
                        type="button"
                        onClick={() => setBgImage('')}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Убрать фон"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-white/30 font-medium">Нажмите на квадрат</span>
                  )}
                </div>

                {/* Настройки эффектов фона (Затемнение и Размытие) */}
                <div className="flex-1 w-full space-y-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-white/50 uppercase">Затемнение фона:</span>
                      <span className="text-purple-400">{bgOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      value={bgOpacity}
                      onChange={(e) => setBgOpacity(Number(e.target.value))}
                      className="w-full accent-purple-500 h-1.5 bg-black/60 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-white/50 uppercase">Размытие (Blur):</span>
                      <span className="text-purple-400">{bgBlur}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={bgBlur}
                      onChange={(e) => setBgBlur(Number(e.target.value))}
                      className="w-full accent-purple-500 h-1.5 bg-black/60 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: КОМАНДЫ И СТАДИИ (Стадия 1, Стадия 2, разделение, инвайты) */}
        {/* ========================================================================= */}
        {activeTab === 'teams' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Stage Selector Header */}
            <div className="bg-black/30 p-6 rounded-3xl border border-white/5 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                <div>
                  <h4 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-500" />
                    Стадии турнира и распределение команд
                  </h4>
                  <p className="text-xs text-white/50 mt-1">
                    Разделите команды по стадиям: приглашенные во 2-ю или 3-ю стадию сидят и ждут своего этапа!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addStage}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider py-3 px-5 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  + Добавить стадию
                </button>
              </div>

              {/* Stage Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {stages.map((stage, idx) => {
                  const isActive = activeStageIdx === idx;
                  const isWaitingStage = idx > 0;
                  return (
                    <div
                      key={stage.id || idx}
                      onClick={() => setActiveStageIdx(idx)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between gap-3 ${
                        isActive
                          ? 'border-blue-500 bg-blue-600/10 shadow-lg shadow-blue-500/10'
                          : 'border-white/5 bg-black/40 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-blue-400' : 'text-white/40'}`}>
                          Стадия {idx + 1}
                        </span>
                        {isWaitingStage ? (
                          <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-lg uppercase">
                            Ожидание инвайтов
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-lg uppercase">
                            Стартовая
                          </span>
                        )}
                      </div>

                      <div>
                        <h5 className="font-black text-sm text-white truncate">{stage.name}</h5>
                        <p className="text-[11px] text-white/50 uppercase mt-0.5">
                          {stage.type === 'playoff' ? 'Плей-офф (Сетка)' :
                           stage.type === 'gsl_groups' ? 'GSL Группы' :
                           stage.type === 'swiss' ? 'Швейцарка' :
                           stage.type === 'qualifier' ? 'Квалификации' : 'Групповой этап'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs font-bold">
                        <span className="text-white/40">Команд:</span>
                        <span className="bg-white/10 px-2 py-0.5 rounded-md text-white font-mono">
                          {stage.teams?.length || 0}
                        </span>
                      </div>

                      {stages.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeStage(idx);
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow-md transition-all cursor-pointer"
                          title="Удалить стадию"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Stage Details & Team Allocation */}
            {stages[activeStageIdx] && (
              <div className="bg-black/30 p-6 sm:p-8 rounded-3xl border border-blue-500/30 space-y-8">
                {/* Stage Info Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase">
                        Стадия {activeStageIdx + 1}
                      </span>
                      {activeStageIdx > 0 && (
                        <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase">
                          ⏳ Команды сидят во {activeStageIdx + 1}-й стадии и ждут
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={stages[activeStageIdx].name}
                      onChange={(e) => {
                        const updated = [...stages];
                        updated[activeStageIdx].name = e.target.value;
                        setStages(updated);
                      }}
                      className="bg-transparent border-none text-2xl font-black text-white outline-none uppercase tracking-tight w-full focus:ring-0"
                    />
                  </div>

                  {/* Format Selector */}
                  <div className="flex items-center gap-3 bg-black/60 p-2 rounded-2xl border border-white/10">
                    <span className="text-[10px] font-black text-white/50 uppercase pl-2">ФОРМАТ СТАДИИ:</span>
                    <select
                      value={stages[activeStageIdx].type}
                      onChange={(e) => {
                        const updated = [...stages];
                        updated[activeStageIdx].type = e.target.value as any;
                        setStages(updated);
                      }}
                      className="bg-zinc-900 text-white font-black uppercase text-xs outline-none px-4 py-2 rounded-xl border border-white/10 cursor-pointer"
                    >
                      <option value="playoff">Play-off (Сетка)</option>
                      <option value="groups">Групповой этап</option>
                      <option value="gsl_groups">GSL Группы</option>
                      <option value="swiss">Швейцарская система</option>
                      <option value="qualifier">Квалификации</option>
                    </select>
                  </div>
                </div>

                {/* Qualifier Settings */}
                {stages[activeStageIdx].type === 'qualifier' && (
                  <div className="p-4 bg-zinc-900/60 rounded-2xl border border-white/5 flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase text-white/50">Количество квалификаций:</span>
                      <select
                        value={stages[activeStageIdx].numQuals || 1}
                        onChange={(e) => {
                          const updated = [...stages];
                          updated[activeStageIdx].numQuals = Number(e.target.value);
                          setStages(updated);
                        }}
                        className="bg-black/60 text-white font-bold text-xs px-3 py-1.5 rounded-xl border border-white/10 outline-none cursor-pointer"
                      >
                        <option value={1}>1 квалификация</option>
                        <option value={2}>2 квалификации</option>
                        <option value={3}>3 квалификации</option>
                        <option value={4}>4 квалификации</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase text-white/50">Выходит из каждой:</span>
                      <select
                        value={stages[activeStageIdx].advancePerQual || 1}
                        onChange={(e) => {
                          const updated = [...stages];
                          updated[activeStageIdx].advancePerQual = Number(e.target.value);
                          setStages(updated);
                        }}
                        className="bg-black/60 text-white font-bold text-xs px-3 py-1.5 rounded-xl border border-white/10 outline-none cursor-pointer"
                      >
                        <option value={1}>1 команда (Победитель)</option>
                        <option value={2}>2 команды (Финалисты)</option>
                        <option value={4}>4 команды (Полуфиналисты)</option>
                      </select>
                    </div>

                    <div className="w-full text-[11px] text-white/40 italic">
                      💡 1-я квала: играют все команды этой стадии. 2-я квала: оставшиеся (без победителей 1-й). Прошедшие команды переходят в следующую стадию.
                    </div>
                  </div>
                )}

                {/* Add Team Toolbar */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: Quick Input & Global Room Teams */}
                  <div className="lg:col-span-6 space-y-4">
                    <h5 className="text-xs font-black uppercase tracking-wider text-white/60 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-blue-400" />
                      Пригласить / Добавить команду в Стадию {activeStageIdx + 1}
                    </h5>

                    {/* Autocomplete Input */}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <TeamAutocompleteInput
                          value={newTeamName}
                          onChange={setNewTeamName}
                          placeholder="Введите название команды..."
                          className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddTeamToActiveStage()}
                        disabled={!newTeamName.trim()}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-blue-600/20"
                      >
                        Пригласить
                      </button>
                    </div>

                    {/* Quick Room Teams Picker */}
                    {globalTeams.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] font-black uppercase text-white/40 tracking-wider block mb-2">
                          Быстрый инвайт из базы комьюнити (кликните, чтобы добавить):
                        </span>
                        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                          {globalTeams.map((gt) => {
                            const isAlreadyInThisStage = stages[activeStageIdx].teams.some(
                              (t) => t.name.toLowerCase() === gt.name.toLowerCase()
                            );
                            const otherStageIdx = stages.findIndex(
                              (stg, sIdx) => sIdx !== activeStageIdx && stg.teams.some(t => t.name.toLowerCase() === gt.name.toLowerCase())
                            );

                            return (
                              <button
                                key={gt.id || gt.name}
                                type="button"
                                onClick={() => handleAddTeamToActiveStage(gt.name, gt.logoUrl, gt.players)}
                                disabled={isAlreadyInThisStage}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                  isAlreadyInThisStage
                                    ? 'bg-blue-600/20 border border-blue-500/40 text-blue-300 opacity-60 cursor-not-allowed'
                                    : otherStageIdx !== -1
                                    ? 'bg-white/5 border border-amber-500/30 text-amber-300 hover:bg-amber-500/10'
                                    : 'bg-white/5 hover:bg-blue-600/20 border border-white/10 hover:border-blue-500/50 text-white/90'
                                }`}
                              >
                                {gt.logoUrl ? (
                                  <img src={gt.logoUrl} alt="" className="w-4 h-4 rounded object-contain" />
                                ) : (
                                  <Trophy className="w-3.5 h-3.5 text-white/40" />
                                )}
                                <span>{gt.name}</span>
                                {isAlreadyInThisStage && <Check className="w-3.5 h-3.5 text-blue-400" />}
                                {otherStageIdx !== -1 && !isAlreadyInThisStage && (
                                  <span className="text-[9px] opacity-60">
                                    (в Ст.{otherStageIdx + 1})
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: JSON Upload & Stage Actions */}
                  <div className="lg:col-span-6 flex flex-col justify-between gap-4 bg-black/40 p-5 rounded-2xl border border-white/5">
                    <div>
                      <h5 className="text-xs font-black uppercase tracking-wider text-white/60 mb-2">
                        Импорт и управление составом
                      </h5>
                      <p className="text-[11px] text-white/40 leading-relaxed">
                        Загрузите готовый список команд из JSON-файла для Стадии {activeStageIdx + 1} или перемешайте порядок посева.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl py-3 px-4 text-xs font-black uppercase tracking-wider text-white transition-all cursor-pointer">
                        <Upload className="w-4 h-4 text-blue-400" />
                        <span>Загрузить JSON для стадии {activeStageIdx + 1}</span>
                        <input
                          type="file"
                          accept=".json"
                          className="hidden"
                          onChange={handleJsonUpload}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => handleShuffleStageTeams(activeStageIdx)}
                        className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white/60 hover:text-white transition-all cursor-pointer"
                        title="Перемешать команды"
                      >
                        <Shuffle className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleClearStageTeams(activeStageIdx)}
                        className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-2xl text-red-400 transition-all cursor-pointer"
                        title="Очистить команды этой стадии"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Team Roster Grid of Active Stage */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-black uppercase text-white/60 tracking-wider flex items-center gap-3">
                      <span>Список команд Стадии {activeStageIdx + 1}</span>
                      <span className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-lg text-xs font-mono">
                        {stages[activeStageIdx].teams.length} команд
                      </span>
                    </div>

                    {activeStageIdx > 0 && (
                      <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        Ожидают старта своего этапа
                      </span>
                    )}
                  </div>

                  {stages[activeStageIdx].teams.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                      {stages[activeStageIdx].teams.map((team, tIdx) => (
                        <div
                          key={team.id || tIdx}
                          className="bg-black/50 border border-white/10 hover:border-blue-500/50 rounded-2xl p-3 flex items-center justify-between gap-3 group transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                              {team.logoUrl ? (
                                <img src={team.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                              ) : (
                                <Trophy className="w-4 h-4 text-white/30" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-black text-white uppercase truncate block group-hover:text-blue-400 transition-colors">
                                {team.name}
                              </span>
                              <span className="text-[9px] text-white/40 uppercase block">
                                Посев #{tIdx + 1}
                              </span>
                            </div>
                          </div>

                          {/* Actions: Move between stages & Delete */}
                          <div className="flex items-center gap-1">
                            {stages.length > 1 && (
                              <select
                                value={activeStageIdx}
                                onChange={(e) => {
                                  const targetIdx = Number(e.target.value);
                                  handleMoveTeamToStage(activeStageIdx, targetIdx, team);
                                }}
                                className="bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[10px] font-bold rounded-lg px-1.5 py-1 outline-none border border-white/5 cursor-pointer"
                                title="Перенести в другую стадию"
                              >
                                {stages.map((_, sIdx) => (
                                  <option key={sIdx} value={sIdx} className="bg-zinc-900 text-white">
                                    В Ст.{sIdx + 1}
                                  </option>
                                ))}
                              </select>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveTeamFromStage(activeStageIdx, team.id)}
                              className="text-white/30 hover:text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Удалить из стадии"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-black/20 border-2 border-dashed border-white/5 rounded-3xl space-y-3">
                      <Users className="w-10 h-10 text-white/20 mx-auto" />
                      <p className="text-sm font-bold text-white/40 uppercase tracking-wider">
                        В Стадии {activeStageIdx + 1} пока нет команд
                      </p>
                      <p className="text-xs text-white/30 max-w-sm mx-auto">
                        Пригласите команды из базы комьюнити выше или добавьте по названию
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ПРОЧЕЕ (Формат матчей, сетка, очки, стиль, масштаб) */}
        {/* ========================================================================= */}
        {activeTab === 'other' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Формат плей-офф и матчей */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-black/30 p-6 rounded-3xl border border-white/5">
              <div className="space-y-3">
                <label className="text-xs font-black uppercase text-white/50 tracking-wider flex items-center gap-2">
                  <Grid className="w-4 h-4 text-purple-400" />
                  Тип сетки плей-офф
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEliminationType('single')}
                    className={`py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      eliminationType === 'single'
                        ? 'bg-purple-600 text-white border border-purple-400 shadow-md'
                        : 'bg-black/40 border border-white/5 text-white/50 hover:text-white'
                    }`}
                  >
                    Single Elimination
                  </button>
                  <button
                    type="button"
                    onClick={() => setEliminationType('double')}
                    className={`py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      eliminationType === 'double'
                        ? 'bg-purple-600 text-white border border-purple-400 shadow-md'
                        : 'bg-black/40 border border-white/5 text-white/50 hover:text-white'
                    }`}
                  >
                    Double Elimination
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black uppercase text-white/50 tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  Формат матчей по умолчанию
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['BO1', 'BO3', 'BO5'].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setMatchFormat(fmt)}
                      className={`py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        matchFormat === fmt
                          ? 'bg-[#ff8f00] text-black shadow-md'
                          : 'bg-black/40 border border-white/5 text-white/50 hover:text-white'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Настройки групп и очков */}
            <div className="bg-black/30 p-6 rounded-3xl border border-white/5 space-y-6">
              <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-blue-400" />
                Настройки группового этапа
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-white/50 tracking-wider block">
                    Количество групп:
                  </label>
                  <select
                    value={numberOfGroups}
                    onChange={(e) => setNumberOfGroups(Number(e.target.value))}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-bold"
                  >
                    <option value={2}>2 Группы</option>
                    <option value={4}>4 Группы</option>
                    <option value={8}>8 Групп</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-white/50 tracking-wider block">
                    Выходят в плей-офф:
                  </label>
                  <select
                    value={advancingPerGroup}
                    onChange={(e) => setAdvancingPerGroup(Number(e.target.value))}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-bold"
                  >
                    <option value={1}>Топ-1</option>
                    <option value={2}>Топ-2</option>
                    <option value={3}>Топ-3</option>
                    <option value={4}>Топ-4</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-white/50 tracking-wider block">
                    Кругов в группе:
                  </label>
                  <select
                    value={matchesPerPairing}
                    onChange={(e) => setMatchesPerPairing(Number(e.target.value) as any)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-bold"
                  >
                    <option value={1}>1 круг</option>
                    <option value={2}>2 круга</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-white/50 tracking-wider block">
                    Очки за победу:
                  </label>
                  <input
                    type="number"
                    value={winPoints}
                    onChange={(e) => setWinPoints(Number(e.target.value))}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Швейцарка и GSL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-black/30 p-6 rounded-3xl border border-white/5">
              <div className="space-y-4">
                <h5 className="text-xs font-black uppercase text-white/60 tracking-wider">
                  Швейцарская система (Swiss)
                </h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-white/40 block mb-1">ПОБЕД ДЛЯ ПРОХОДА</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={swissWinsToAdvance}
                      onChange={(e) => setSwissWinsToAdvance(Number(e.target.value))}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-white/40 block mb-1">ПОРАЖЕНИЙ ДЛЯ ВЫЛЕТА</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={swissLossesToEliminate}
                      onChange={(e) => setSwissLossesToEliminate(Number(e.target.value))}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-xs font-black uppercase text-white/60 tracking-wider">
                  Стиль оформления карточек сетки
                </h5>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'classic', label: 'Классический' },
                    { id: 'minimalist', label: 'Минимализм' },
                    { id: 'cyber', label: 'Кибер' },
                    { id: 'retro', label: 'Ретро' }
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setBoxStyle(st.id)}
                      className={`p-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                        boxStyle === st.id
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-black/40 border border-white/5 text-white/60 hover:text-white'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Масштаб сетки */}
            <div className="bg-black/30 p-6 rounded-3xl border border-white/5 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-white/60 uppercase">Масштаб отображения сетки (Zoom):</span>
                <span className="text-[#ff8f00] font-mono">{bracketScale}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                step="5"
                value={bracketScale}
                onChange={(e) => setBracketScale(Number(e.target.value))}
                className="w-full accent-[#ff8f00] h-1.5 bg-black/60 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-white/40 font-medium">
            * Изменения сразу сохраняются в локальное хранилище и синхронизируются с сервером
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="submit"
              className="w-full sm:w-auto bg-[#ff8f00] hover:bg-[#ff8f00]/90 text-black font-black py-4 px-8 rounded-2xl shadow-xl shadow-[#ff8f00]/20 uppercase tracking-wider text-xs transition-all transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
