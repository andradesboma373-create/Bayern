import React, { useState, useRef, useEffect } from 'react';
import { Trophy, Image as ImageIcon, Users, Sliders, Plus, Trash2, Check, AlertCircle, Sparkles, Layers } from 'lucide-react';
import { Team, TournamentSettings, TournamentStageConfig } from './types';
import TeamLogo from '../TeamLogo';
import { getAutoMatchedVectorLogo } from '../../lib/logoMatcher';
import { optimizeImageForUpload } from '../../lib/imageOptimizer';
import { generateStageData } from './stageGenerator';

interface Props {
  user: any;
  onSave: (data: {
    name: string;
    logoUrl: string;
    prizePool: string;
    game: string;
    settings: any;
    teams: Team[];
  }) => void;
  submitLabel?: string;
  initialGame?: string;
  initialName?: string;
  initialLogoUrl?: string;
  initialPrizePool?: string;
  initialSettings?: TournamentSettings;
  initialTeams?: Team[];
}

const PRESET_PRIZES = ['$50,000', '$100,000', '$250,000', '$500,000', '$1,000,000', '1,500,000 ₽'];

export default function TournamentSettingsForm({
  user: _user,
  onSave,
  submitLabel = 'Сохранить',
  initialGame = 'cs2',
  initialName = '',
  initialLogoUrl = '',
  initialPrizePool = '$100,000',
  initialSettings,
  initialTeams = []
}: Props) {
  const [tab, setTab] = useState<'general' | 'teams' | 'stages'>('general');
  const [name, setName] = useState(initialName);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [prizePool, setPrizePool] = useState(initialPrizePool);
  const [game, setGame] = useState(initialGame || 'cs2');
  const [error, setError] = useState('');

  const [mode, setMode] = useState<'single_stage' | 'two_stage' | string>(initialSettings?.mode || 'single_stage');
  const [stage1Type, setStage1Type] = useState<string>(initialSettings?.stage1Type || 'playoff');
  const [stage2Type, setStage2Type] = useState<string>(initialSettings?.stage2Type || 'tiered');
  const [eliminationType, setEliminationType] = useState<'single' | 'double' | string>(initialSettings?.eliminationType || 'single');
  const [matchFormat, setMatchFormat] = useState<string>(initialSettings?.matchFormat || 'BO3');
  const [swissWins, setSwissWins] = useState<number>(initialSettings?.swissWinsToAdvance || 3);
  const [swissLosses, setSwissLosses] = useState<number>(initialSettings?.swissLossesToEliminate || 3);
  const [gslAdvanceCount, setGslAdvanceCount] = useState<number>(initialSettings?.gslAdvanceCount || 3);

  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [newTeamName, setNewTeamName] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Sync initial teams if passed
  useEffect(() => {
    if (initialTeams && initialTeams.length > 0 && teams.length === 0) {
      setTeams(initialTeams);
    }
  }, [initialTeams]);

  const handleAddTeam = () => {
    if (!newTeamName.trim()) return;
    const clean = newTeamName.trim();
    const autoLogo = getAutoMatchedVectorLogo(clean) || undefined;
    const newTeam: Team = {
      id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: clean,
      logoUrl: autoLogo
    };
    setTeams([...teams, newTeam]);
    setNewTeamName('');
  };

  const handleRemoveTeam = (id: string) => {
    setTeams(teams.filter(t => t.id !== id));
  };

  const handleLogoUpload = async (file: File) => {
    try {
      const optimized = await optimizeImageForUpload(file, 'logo');
      setLogoUrl(optimized);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Укажите название турнира');
      setTab('general');
      return;
    }

    if (teams.length < 2) {
      setError('Добавьте минимум 2 команды для турнира');
      setTab('teams');
      return;
    }

    const stages: TournamentStageConfig[] = [];
    if (mode === 'two_stage') {
      const s1Data = generateStageData(stage1Type, teams, {
        eliminationType,
        matchFormat,
        swissWinsToAdvance: swissWins,
        swissLossesToEliminate: swissLosses,
        gslAdvanceCount
      });
      stages.push({
        id: 'stage_1',
        name: 'Этап 1',
        type: stage1Type,
        ...s1Data,
        teams
      });

      stages.push({
        id: 'stage_2',
        name: 'Этап 2 (Плей-офф)',
        type: stage2Type,
        teams: []
      });
    } else {
      const sData = generateStageData(stage1Type, teams, {
        eliminationType,
        matchFormat,
        swissWinsToAdvance: swissWins,
        swissLossesToEliminate: swissLosses,
        gslAdvanceCount
      });
      stages.push({
        id: 'stage_1',
        name: 'Основной этап',
        type: stage1Type,
        ...sData,
        teams
      });
    }

    const settingsData: TournamentSettings = {
      ...(initialSettings || {}),
      mode,
      stage1Type,
      stage2Type,
      stages,
      eliminationType,
      matchFormat,
      swissWinsToAdvance: swissWins,
      swissLossesToEliminate: swissLosses,
      gslAdvanceCount,
      game
    };

    onSave({
      name: name.trim(),
      logoUrl: logoUrl.trim(),
      prizePool: prizePool.trim(),
      game,
      settings: settingsData,
      teams
    });
  };

  return (
    <div className="bg-[#0f1015] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-6 mb-6">
        <button
          type="button"
          onClick={() => setTab('general')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            tab === 'general'
              ? 'bg-[#ff8f00] text-black shadow-[0_0_15px_rgba(255,143,0,0.3)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Trophy className="w-4 h-4" /> 1. Главное
        </button>
        <button
          type="button"
          onClick={() => setTab('teams')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            tab === 'teams'
              ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" /> 2. Команды ({teams.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('stages')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            tab === 'stages'
              ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4" /> 3. Формат и Стадии
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/40 text-red-300 p-4 rounded-2xl mb-6 flex items-center gap-3 font-bold text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tab 1: General */}
        {tab === 'general' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row gap-6 items-start bg-black/30 p-6 rounded-2xl border border-white/5">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleLogoUpload(f);
                }}
              />
              <div
                onClick={() => logoInputRef.current?.click()}
                className="w-28 h-28 rounded-2xl bg-black/60 border-2 border-dashed border-white/20 hover:border-[#ff8f00] flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all group shrink-0 relative"
                title="Загрузить логотип"
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="text-center p-2 text-white/40 group-hover:text-white">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1 text-[#ff8f00] opacity-70 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Фото</span>
                  </div>
                )}
              </div>

              <div className="flex-1 w-full space-y-4">
                <div>
                  <label className="text-xs font-black uppercase text-white/50 tracking-wider flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-[#ff8f00]" />
                    Название турнира *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => {
                      setName(e.target.value);
                      setError('');
                    }}
                    placeholder="Например: PGL Major Copenhagen 2026"
                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-3 text-white text-base font-bold placeholder:text-white/20 focus:border-[#ff8f00] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-white/50 tracking-wider mb-2 block">
                    Дисциплина
                  </label>
                  <div className="grid grid-cols-2 gap-3 max-w-sm">
                    <button
                      type="button"
                      onClick={() => setGame('cs2')}
                      className={`py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        game === 'cs2'
                          ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                          : 'bg-black/40 border border-white/5 text-white/50 hover:text-white'
                      }`}
                    >
                      🔫 CS2
                    </button>
                    <button
                      type="button"
                      onClick={() => setGame('so2')}
                      className={`py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        game === 'so2'
                          ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                          : 'bg-black/40 border border-white/5 text-white/50 hover:text-white'
                      }`}
                    >
                      🎯 Standoff 2
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Prize Pool */}
            <div className="bg-black/30 p-6 rounded-2xl border border-white/5 space-y-3">
              <label className="text-xs font-black uppercase text-white/50 tracking-wider flex items-center gap-2">
                💰 Призовой фонд
              </label>
              <input
                type="text"
                value={prizePool}
                onChange={e => setPrizePool(e.target.value)}
                placeholder="$100,000"
                className="w-full sm:w-1/2 bg-black/60 border border-white/10 rounded-2xl px-5 py-3 text-white font-bold placeholder:text-white/20 focus:border-[#ff8f00] outline-none"
              />
              <div className="flex flex-wrap gap-2 pt-2">
                {PRESET_PRIZES.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPrizePool(p)}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Teams */}
        {tab === 'teams' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex gap-3">
              <input
                type="text"
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTeam())}
                placeholder="Введите название команды..."
                className="flex-1 bg-black/60 border border-white/10 rounded-2xl px-5 py-3 text-white font-bold placeholder:text-white/20 focus:border-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={handleAddTeam}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(37,99,235,0.3)]"
              >
                <Plus className="w-4 h-4" /> Добавить
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
              {teams.map((t, idx) => (
                <div
                  key={t.id}
                  className="bg-black/40 border border-white/5 hover:border-white/15 rounded-2xl p-3 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="text-white/30 text-xs font-mono font-bold w-5">{idx + 1}.</span>
                    <TeamLogo teamName={t.name} logoUrl={t.logoUrl} sizeClassName="w-6 h-6" />
                    <span className="text-white font-bold text-sm truncate">{t.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTeam(t.id)}
                    className="text-red-400 hover:text-red-300 p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Stages & Format */}
        {tab === 'stages' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-black/30 p-6 rounded-2xl border border-white/5 space-y-4">
              <label className="text-xs font-black uppercase text-white/50 tracking-wider block">
                Формат турнира
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('single_stage')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    mode === 'single_stage'
                      ? 'bg-purple-600/20 border-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.3)] text-white'
                      : 'bg-black/40 border-white/5 text-white/50 hover:text-white'
                  }`}
                >
                  <div className="font-black text-sm">Один этап</div>
                  <div className="text-xs text-white/40 mt-1">Только плей-офф, группы или швейцарка</div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('two_stage')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    mode === 'two_stage'
                      ? 'bg-purple-600/20 border-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.3)] text-white'
                      : 'bg-black/40 border-white/5 text-white/50 hover:text-white'
                  }`}
                >
                  <div className="font-black text-sm">Два этапа</div>
                  <div className="text-xs text-white/40 mt-1">Группы/Швейцарка + Финальный плей-офф</div>
                </button>
              </div>
            </div>

            <div className="bg-black/30 p-6 rounded-2xl border border-white/5 space-y-4">
              <label className="text-xs font-black uppercase text-white/50 tracking-wider block">
                Тип этапа 1
              </label>
              <select
                value={stage1Type}
                onChange={e => setStage1Type(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-3 text-white font-bold outline-none"
              >
                <option value="playoff">Олимпийская сетка (Playoff)</option>
                <option value="groups">Круговой групповой этап (Round Robin)</option>
                <option value="gsl_groups">GSL Группы</option>
                <option value="swiss">Швейцарская система (Swiss)</option>
                <option value="qualifier">Квалификации (Qualifiers)</option>
              </select>

              {stage1Type === 'playoff' && (
                <div className="pt-2">
                  <label className="text-xs font-black uppercase text-white/50 tracking-wider block mb-2">
                    Сетка выбывания
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEliminationType('single')}
                      className={`py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        eliminationType === 'single'
                          ? 'bg-[#ff8f00] text-black font-black'
                          : 'bg-black/40 border border-white/5 text-white/50'
                      }`}
                    >
                      Single Elimination
                    </button>
                    <button
                      type="button"
                      onClick={() => setEliminationType('double')}
                      className={`py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        eliminationType === 'double'
                          ? 'bg-[#ff8f00] text-black font-black'
                          : 'bg-black/40 border border-white/5 text-white/50'
                      }`}
                    >
                      Double Elimination
                    </button>
                  </div>
                </div>
              )}

              {mode === 'two_stage' && (
                <div className="pt-4 border-t border-white/5">
                  <label className="text-xs font-black uppercase text-white/50 tracking-wider block mb-2">
                    Тип этапа 2 (Плей-офф)
                  </label>
                  <select
                    value={stage2Type}
                    onChange={e => setStage2Type(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-3 text-white font-bold outline-none"
                  >
                    <option value="playoff">Стандартный плей-офф</option>
                    <option value="tiered">Ступенчатый плей-офф (Tiered)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="bg-black/30 p-6 rounded-2xl border border-white/5 space-y-3">
              <label className="text-xs font-black uppercase text-white/50 tracking-wider block">
                Формат матчей
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['BO1', 'BO3', 'BO5'].map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setMatchFormat(f)}
                    className={`py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      matchFormat === f
                        ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                        : 'bg-black/40 border border-white/5 text-white/50 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-white/10 flex items-center justify-between">
          <div className="text-xs text-white/40">
            {teams.length} команд выбрано • {game.toUpperCase()}
          </div>
          <button
            type="submit"
            className="px-8 py-3.5 bg-[#ff8f00] hover:bg-[#ff8f00]/90 text-black font-black text-sm uppercase rounded-2xl transition-all shadow-[0_0_20px_rgba(255,143,0,0.35)] cursor-pointer"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
