import React, { useState, useEffect } from 'react';
import { Match, Tournament, Team } from './types';
import MatchCard from './MatchCard';
import { generateSingleEliminationBracket, BYE_TEAM } from './doubleEliminationLogic';
import { getBracketQualifiedTeams } from './stageGenerator';
import { recordTournamentMatchResult } from '../../lib/tournamentMatchRecorder';
import { 
  LayoutGrid, Users, Trophy, ChevronRight, CheckCircle2, AlertCircle, 
  Plus, ArrowRight, Sparkles, RotateCcw, Eye, EyeOff, Layers, ShieldCheck 
} from 'lucide-react';

interface Props {
  tournament: Tournament;
  onUpdate: (updated: Tournament) => void;
  isExporting?: boolean;
  isSwapMode?: boolean;
  onVetoMatch?: (team1: Team, team2: Team, matchInfo?: any) => void;
  onAdvanceToNextStage?: (teams: Team[]) => void;
  nextStageName?: string;
}

/**
 * Ensures brackets is ALWAYS a well-formed array of brackets (Match[][][]).
 * Prevents any "brackets is not iterable" runtime errors from Firestore objects or undefined values.
 */
function getSafeBrackets(raw: any): Match[][][] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((b: any) => {
      if (!b) return [];
      if (Array.isArray(b)) {
        return b.map((r: any) => (Array.isArray(r) ? r : Object.values(r || {})));
      }
      if (typeof b === 'object') {
        const roundKeys = Object.keys(b).sort((x, y) => Number(x) - Number(y));
        return roundKeys.map(rk => (Array.isArray(b[rk]) ? b[rk] : Object.values(b[rk] || {})));
      }
      return [];
    });
  }
  if (typeof raw === 'object') {
    const keys = Object.keys(raw).sort((x, y) => Number(x) - Number(y));
    return keys.map(k => {
      const b = raw[k];
      if (!b) return [];
      if (Array.isArray(b)) return b;
      if (typeof b === 'object') return Object.values(b);
      return [];
    }) as Match[][][];
  }
  return [];
}

export default function QualifierStage({ 
  tournament, 
  onUpdate, 
  isExporting, 
  isSwapMode, 
  onVetoMatch, 
  onAdvanceToNextStage, 
  nextStageName 
}: Props) {
  const numQuals = tournament.settings?.numQuals || 1;
  const advancePerQual = tournament.settings?.advancePerQual || 1;
  
  const [activeQualIdx, setActiveQualIdx] = useState(0);
  const [hiddenRounds, setHiddenRounds] = useState<Record<number, boolean>>({});

  const brackets = getSafeBrackets(tournament.qualifiersBrackets);

  // Initialize qualifiers brackets if they don't exist
  useEffect(() => {
    const current = getSafeBrackets(tournament.qualifiersBrackets);
    if (current.length === 0 || !current[0] || current[0].length === 0) {
      if (tournament.teams && tournament.teams.length >= 2) {
        const initialBrackets: Match[][][] = [];
        // 1-я квала: играют ВСЕ команды, приглашенные в эту стадию!
        const bracket1 = generateSingleEliminationBracket(tournament.teams);
        initialBrackets.push(bracket1);
        
        // Последующие квалы изначально пустые (будут созданы без победителей 1 квалы)
        for (let i = 1; i < numQuals; i++) {
          initialBrackets.push([]);
        }
        
        onUpdate({
          ...tournament,
          qualifiersBrackets: initialBrackets
        });
      }
    }
  }, [tournament.id, tournament.teams?.length]);

  const getQualifiedTeams = (qualIdx: number): Team[] => {
    const bracket = brackets[qualIdx];
    if (!bracket || !Array.isArray(bracket) || bracket.length === 0) return [];

    return getBracketQualifiedTeams(bracket, advancePerQual);
  };

  const getAllQualifiedSoFar = (): Team[] => {
    let all: Team[] = [];
    for (let i = 0; i < brackets.length; i++) {
      all = [...all, ...getQualifiedTeams(i)];
    }
    return all;
  };

  const handleGenerateNextQual = (idx: number) => {
    const currentBrackets = getSafeBrackets(tournament.qualifiersBrackets);
    const qualifiedIds = new Set(getAllQualifiedSoFar().map(t => t.id));
    
    // БЕЗ команд, которые уже прошли квалификацию!
    const remainingTeams = (tournament.teams || []).filter(t => !qualifiedIds.has(t.id));
    
    if (remainingTeams.length < 2) {
      alert("Недостаточно оставшихся команд для формирования следующей квалификации (минимум 2 команды)!");
      return;
    }
    
    const newBracket = generateSingleEliminationBracket(remainingTeams);
    const newBrackets = [...currentBrackets];
    while (newBrackets.length <= idx) {
      newBrackets.push([]);
    }
    newBrackets[idx] = newBracket;
    
    onUpdate({
      ...tournament,
      qualifiersBrackets: newBrackets
    });
  };

  const handleRegenerateCurrentQual = (idx: number) => {
    if (!window.confirm(`Пересобрать турнирную сетку плей-офф для Квалификации #${idx + 1}? Все текущие результаты этой квалификации будут сброшены.`)) {
      return;
    }
    const currentBrackets = getSafeBrackets(tournament.qualifiersBrackets);
    let previousQualified: Team[] = [];
    for (let i = 0; i < idx; i++) {
      previousQualified = [...previousQualified, ...getQualifiedTeams(i)];
    }
    const prevQIds = new Set(previousQualified.map(t => t.id));
    const teamsForThisQual = (tournament.teams || []).filter(t => !prevQIds.has(t.id));
    
    if (teamsForThisQual.length < 2) {
      alert("Недостаточно команд для генерации сетки плей-офф (минимум 2)!");
      return;
    }

    const newBracket = generateSingleEliminationBracket(teamsForThisQual);
    const newBrackets = [...currentBrackets];
    while (newBrackets.length <= idx) {
      newBrackets.push([]);
    }
    newBrackets[idx] = newBracket;

    onUpdate({
      ...tournament,
      qualifiersBrackets: newBrackets
    });
  };

  const handleFinishEarly = (qualIdx: number) => {
    const winners = getQualifiedTeams(qualIdx);
    if (winners.length < advancePerQual) {
      alert(`Необходимо выявить ${advancePerQual} победителей квалификации (сейчас определено: ${winners.length})`);
      return;
    }

    if (qualIdx < numQuals - 1) {
      const nextIdx = qualIdx + 1;
      setActiveQualIdx(nextIdx);

      // Автоматически генерируем сетку для следующей квалы, исключая победителей!
      const currentBrackets = getSafeBrackets(tournament.qualifiersBrackets);
      if (!currentBrackets[nextIdx] || currentBrackets[nextIdx].length === 0) {
        const qualifiedIds = new Set(getAllQualifiedSoFar().map(t => t.id));
        const remainingTeams = (tournament.teams || []).filter(t => !qualifiedIds.has(t.id));
        if (remainingTeams.length >= 2) {
          const newBracket = generateSingleEliminationBracket(remainingTeams);
          const newBrackets = [...currentBrackets];
          while (newBrackets.length <= nextIdx) {
            newBrackets.push([]);
          }
          newBrackets[nextIdx] = newBracket;
          onUpdate({
            ...tournament,
            qualifiersBrackets: newBrackets
          });
        }
      }
    } else {
      const allQ = getAllQualifiedSoFar();
      if (onAdvanceToNextStage && allQ.length > 0) {
        if (window.confirm(`Все квалификации (${numQuals}) завершены! Выявлено ${allQ.length} прошедших команд. Перенести их в следующую стадию турнира?`)) {
          onAdvanceToNextStage(allQ);
        }
      }
    }
  };

  const handleUpdateScore = (qualIdx: number, rIdx: number, mIdx: number, teamNum: 1 | 2, score: number) => {
    const currentBrackets = getSafeBrackets(tournament.qualifiersBrackets);
    if (!currentBrackets[qualIdx]) return;

    const newBrackets = [...currentBrackets];
    const bracket = JSON.parse(JSON.stringify(newBrackets[qualIdx]));
    const match = bracket[rIdx]?.[mIdx];
    if (!match) return;
    
    if (teamNum === 1) match.score1 = score;
    else match.score2 = score;
    
    // Reset winner if scores changed
    match.winnerId = null;
    match.isFinished = false;

    newBrackets[qualIdx] = bracket;
    onUpdate({ ...tournament, qualifiersBrackets: newBrackets });
  };

  const handleAdvanceWinner = (qualIdx: number, rIdx: number, mIdx: number) => {
    const currentBrackets = getSafeBrackets(tournament.qualifiersBrackets);
    if (!currentBrackets[qualIdx]) return;

    const newBrackets = [...currentBrackets];
    const bracket = JSON.parse(JSON.stringify(newBrackets[qualIdx]));
    const match = bracket[rIdx]?.[mIdx];
    if (!match) return;

    if (match.score1 > match.score2) {
      match.winnerId = match.team1?.id || null;
      match.isFinished = true;
    } else if (match.score2 > match.score1) {
      match.winnerId = match.team2?.id || null;
      match.isFinished = true;
    } else {
      alert("Сначала укажите счет матча!");
      return;
    }

    const winningTeam = match.score1 > match.score2 ? match.team1 : match.team2;

    // Standard Single Elimination progression to the next round
    if (rIdx < bracket.length - 1) {
      const nextRoundIdx = rIdx + 1;
      const nextMatchIdx = Math.floor(mIdx / 2);
      const isTeam1 = mIdx % 2 === 0;
      
      const nextMatch = bracket[nextRoundIdx]?.[nextMatchIdx];
      if (nextMatch) {
        if (isTeam1) nextMatch.team1 = winningTeam;
        else nextMatch.team2 = winningTeam;
      }
    }

    newBrackets[qualIdx] = bracket;
    onUpdate({ ...tournament, qualifiersBrackets: newBrackets });
  };

  const handleSwapTeam = (type: any, rIdx: number, mIdx: number, teamNum: 1 | 2, teamId: string) => {
    const currentBrackets = getSafeBrackets(tournament.qualifiersBrackets);
    if (!currentBrackets[activeQualIdx]) return;

    const newBrackets = [...currentBrackets];
    const bracket = JSON.parse(JSON.stringify(newBrackets[activeQualIdx]));
    const match = bracket[rIdx]?.[mIdx];
    if (!match) return;

    let team = tournament.teams.find(t => t.id === teamId) || null;
    if (teamId === 'BYE') team = { id: 'BYE', name: 'BYE' };

    if (teamNum === 1) match.team1 = team;
    else match.team2 = team;

    newBrackets[activeQualIdx] = bracket;
    onUpdate({ ...tournament, qualifiersBrackets: newBrackets });
  };

  const toggleRoundHidden = (rIdx: number, hide?: boolean) => {
    setHiddenRounds(prev => ({
      ...prev,
      [rIdx]: hide !== undefined ? hide : !prev[rIdx]
    }));
  };

  const activeBracket = brackets[activeQualIdx] || [];
  const qualifiedThisQual = getQualifiedTeams(activeQualIdx);
  const allQualified = getAllQualifiedSoFar();

  // Playoff Round Labels standard naming (1/16, 1/8, 1/4, 1/2, Финал / Матч за слот)
  const getRoundLabel = (rIdx: number, totalRounds: number) => {
    const remaining = totalRounds - rIdx;
    if (remaining === 1) {
      return advancePerQual === 1 ? "Финал (Матч за слот)" : "Финал";
    }
    if (remaining === 2) {
      return advancePerQual === 2 ? "Полуфинал (Матчи за 2 слота)" : "Полуфинал";
    }
    if (remaining === 3) {
      return advancePerQual === 4 ? "1/4 Финала (Матчи за 4 слота)" : "1/4 Финала";
    }
    if (remaining === 4) return "1/8 Финала";
    if (remaining === 5) return "1/16 Финала";
    if (remaining === 6) return "1/32 Финала";
    return `Раунд ${rIdx + 1}`;
  };

  const getRoundShortLabel = (rIdx: number, totalRounds: number) => {
    const remaining = totalRounds - rIdx;
    if (remaining === 1) return advancePerQual === 1 ? "Слот" : "Финал";
    if (remaining === 2) return advancePerQual === 2 ? "1/2 (Слоты)" : "1/2";
    if (remaining === 3) return "1/4";
    if (remaining === 4) return "1/8";
    if (remaining === 5) return "1/16";
    if (remaining === 6) return "1/32";
    return `R${rIdx + 1}`;
  };

  const collapsibleRounds = activeBracket
    .map((round, rIdx) => {
      const remaining = activeBracket.length - rIdx;
      if (remaining < 3) return null;
      const isFinished = Array.isArray(round) && round.every(m => m && (m.isFinished || !!m.winnerId));
      return {
        rIdx,
        remaining,
        label: getRoundLabel(rIdx, activeBracket.length),
        shortLabel: getRoundShortLabel(rIdx, activeBracket.length),
        isFinished,
        matchCount: round.length
      };
    })
    .filter(Boolean) as {
      rIdx: number;
      remaining: number;
      label: string;
      shortLabel: string;
      isFinished: boolean;
      matchCount: number;
    }[];

  return (
    <div className="w-full flex flex-col gap-8">
      {/* Qualifiers Navigation Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto pb-3 custom-scrollbar">
        {Array.from({ length: numQuals }).map((_, i) => {
          const isGenerated = brackets[i] && Array.isArray(brackets[i]) && brackets[i].length > 0;
          const qualWinners = getQualifiedTeams(i);
          const isDone = qualWinners.length >= advancePerQual;
          
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActiveQualIdx(i)}
              className={`shrink-0 px-5 py-3.5 rounded-2xl border-2 transition-all flex flex-col gap-1 min-w-[210px] cursor-pointer text-left ${
                activeQualIdx === i 
                  ? 'border-blue-500 bg-blue-600/15 shadow-xl shadow-blue-500/10' 
                  : 'border-white/10 bg-black/40 hover:border-white/20 hover:bg-black/60'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[11px] font-black uppercase tracking-wider ${activeQualIdx === i ? 'text-blue-400' : 'text-zinc-400'}`}>
                  Квалификация #{i + 1}
                </span>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isGenerated ? (
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                ) : (
                  <span className="text-[10px] text-zinc-600 font-bold uppercase">Ожидание</span>
                )}
              </div>
              <div className="text-white font-black text-sm uppercase tracking-tight truncate">
                {isDone ? `Слоты разыграны (${qualWinners.length})` : isGenerated ? 'Сетка плей-офф активна' : 'Сетка не создана'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Playoff Bracket Container */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl">
        {/* Header toolbar */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl">🏆</span>
              <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                Сетка Плей-офф • Квалификация #{activeQualIdx + 1}
              </h3>
              {qualifiedThisQual.length >= advancePerQual && (
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Слоты определены
                </span>
              )}
            </div>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mt-2 flex items-center gap-2 flex-wrap">
              <span>Слотов в след. этап: <span className="text-blue-400 font-black">{advancePerQual}</span></span>
              <span className="opacity-30">•</span>
              <span>Формат: <span className="text-zinc-300">Single Elimination (на вылет)</span></span>
              {activeQualIdx > 0 && (
                <>
                  <span className="opacity-30">•</span>
                  <span className="text-emerald-400">Победители прошлых квал исключены</span>
                </>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {activeBracket.length > 0 && !isExporting && (
              <button
                type="button"
                onClick={() => handleRegenerateCurrentQual(activeQualIdx)}
                className="text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border border-white/10 cursor-pointer flex items-center gap-1.5 active:scale-95"
                title="Пересобрать сетку этой квалификации"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Пересобрать сетку
              </button>
            )}

            {onAdvanceToNextStage && (activeQualIdx === numQuals - 1 || allQualified.length >= numQuals * advancePerQual) && allQualified.length > 0 && (
              <button
                type="button"
                onClick={() => onAdvanceToNextStage(allQualified)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-xl shadow-blue-600/20 active:scale-95 cursor-pointer text-xs uppercase tracking-wider"
              >
                <Sparkles className="w-4 h-4 text-yellow-400" />
                В стейдж 2 ({allQualified.length})
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {!activeBracket.length && (
              <button
                type="button"
                onClick={() => handleGenerateNextQual(activeQualIdx)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-3 rounded-xl flex items-center gap-2.5 transition-all shadow-xl shadow-blue-600/20 cursor-pointer text-xs uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" /> СФОРМИРОВАТЬ СЕТКУ ПЛЕЙ-ОФФ
              </button>
            )}

            {activeBracket.length > 0 && qualifiedThisQual.length >= advancePerQual && (
              <button
                type="button"
                onClick={() => handleFinishEarly(activeQualIdx)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3 rounded-xl flex items-center gap-2.5 transition-all shadow-xl shadow-emerald-600/20 cursor-pointer text-xs uppercase tracking-wider animate-in zoom-in-95 duration-200"
              >
                <CheckCircle2 className="w-4 h-4" /> 
                {activeQualIdx < numQuals - 1 ? 'В НЕКСТ КВАЛУ' : 'В СТЕЙДЖ 2'}
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            )}
          </div>
        </div>

        {activeBracket.length > 0 ? (
          <div className="space-y-8">
            {/* Qualified Teams Banner - only when this qual is ACTUALLY WON */}
            {qualifiedThisQual.length >= advancePerQual && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 animate-in fade-in slide-in-from-top-4 duration-500 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-emerald-400 font-black uppercase text-xs tracking-widest mb-3 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> 
                    {activeQualIdx < numQuals - 1 
                      ? `Победитель(и) Квалификации #${activeQualIdx + 1} (получили слот в Стейдж 2):` 
                      : `Победители финальной Квалификации #${activeQualIdx + 1}:`}
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {qualifiedThisQual.map((t, i) => (
                      <div key={i} className="bg-zinc-900 border border-emerald-500/40 px-3.5 py-2 rounded-xl flex items-center gap-2.5 shadow-lg">
                        <div className="w-6 h-6 rounded bg-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                          {t.logoUrl ? <img src={t.logoUrl} className="w-full h-full object-cover" alt="" /> : <Trophy className="w-3.5 h-3.5 text-yellow-500" />}
                        </div>
                        <span className="text-white font-black uppercase text-xs">{t.name}</span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-black px-1.5 py-0.5 rounded uppercase">Слот</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleFinishEarly(activeQualIdx)}
                  className="self-start md:self-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
                >
                  {activeQualIdx < numQuals - 1 ? (
                    <>
                      <span>В некст квалу</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-yellow-300" />
                      <span>В стейдж 2</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Collapsible Rounds Toolbar */}
            {collapsibleRounds.length > 0 && !isExporting && (
              <div className="flex items-center justify-between gap-3 flex-wrap bg-zinc-900/80 border border-zinc-800 px-4 py-2.5 rounded-2xl mb-2 backdrop-blur-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mr-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    Раунды:
                  </span>
                  {collapsibleRounds.map(({ rIdx, shortLabel, isFinished }) => {
                    const isHidden = !!hiddenRounds[rIdx];
                    return (
                      <label
                        key={rIdx}
                        className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl cursor-pointer transition-all border select-none ${
                          isHidden
                            ? 'bg-zinc-800/40 text-zinc-500 border-zinc-800 line-through'
                            : 'bg-zinc-800 text-white border-zinc-700 shadow-sm'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!isHidden}
                          onChange={() => toggleRoundHidden(rIdx)}
                          className="w-3.5 h-3.5 rounded bg-zinc-900 border-zinc-700 accent-blue-600 cursor-pointer"
                        />
                        <span>{shortLabel}</span>
                        {isFinished && (
                          <span className="text-[10px] text-emerald-400 font-black ml-0.5">✓</span>
                        )}
                      </label>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...hiddenRounds };
                      activeBracket.forEach((round, rIdx) => {
                        const remaining = activeBracket.length - rIdx;
                        if (remaining >= 3) {
                          const isFinished = round.every(m => m && (m.isFinished || !!m.winnerId));
                          if (isFinished) updated[rIdx] = true;
                        }
                      });
                      setHiddenRounds(updated);
                    }}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                    title="Скрыть завершенные ранние раунды"
                  >
                    <span>⚡</span> Скрыть сыгранные
                  </button>
                  {Object.values(hiddenRounds).some(Boolean) && (
                    <button
                      type="button"
                      onClick={() => setHiddenRounds({})}
                      className="text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-xl border border-zinc-700 transition-all cursor-pointer flex items-center gap-1"
                      title="Показать все раунды"
                    >
                      <Eye className="w-3.5 h-3.5" /> Показать все
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Playoff Bracket Tree Rendering with Connectors */}
            <div 
              className="flex gap-0 overflow-x-auto overflow-y-auto items-stretch w-full bg-black/40 p-6 rounded-3xl border border-white/5 custom-scrollbar" 
              style={{ minHeight: '440px' }}
            >
              {activeBracket.map((round, rIdx) => {
                const totalRounds = activeBracket.length;
                const isFinalRound = rIdx === totalRounds - 1;
                const canCollapse = (totalRounds - rIdx) >= 3;
                const isHidden = !!hiddenRounds[rIdx];
                const nextRound = activeBracket[rIdx + 1];

                if (isHidden && canCollapse) {
                  return (
                    <div key={`col-${rIdx}`} className="flex flex-col w-[64px] shrink-0 border-r border-white/10 bg-black/60 py-2 px-1 relative z-10 select-none">
                      {/* Compact Header */}
                      <div className="h-10 flex flex-col items-center justify-center mb-4">
                        {!isExporting ? (
                          <button
                            type="button"
                            onClick={() => toggleRoundHidden(rIdx, false)}
                            title={`Развернуть ${getRoundLabel(rIdx, totalRounds)} (${round.length} матчей)`}
                            className="w-full py-1.5 px-1 bg-[#ff8f00]/15 hover:bg-[#ff8f00]/30 text-[#ff8f00] text-[10px] font-black uppercase rounded-lg border border-[#ff8f00]/40 flex flex-col items-center justify-center transition-all cursor-pointer shadow-sm group"
                          >
                            <span className="text-xs group-hover:scale-125 transition-transform">➕</span>
                            <span className="tracking-tight">{getRoundShortLabel(rIdx, totalRounds)}</span>
                          </button>
                        ) : (
                          <div className="w-full py-1 px-1 bg-[#ff8f00]/15 text-[#ff8f00] text-[10px] font-black uppercase rounded-lg border border-[#ff8f00]/30 text-center tracking-tight">
                            {getRoundShortLabel(rIdx, totalRounds)}
                          </div>
                        )}
                      </div>

                      {/* Conductors Leading into Next Round */}
                      <div className="flex flex-col flex-1">
                        {(nextRound || round).map((_, nextMIdx) => {
                          const m1 = round[2 * nextMIdx];
                          const m2 = round[2 * nextMIdx + 1];
                          const hasWinner1 = !!m1?.winnerId;
                          const hasWinner2 = !!m2?.winnerId;
                          const hasBothWinners = hasWinner1 && hasWinner2;

                          return (
                            <div key={`stub-${rIdx}-${nextMIdx}`} className="flex-1 min-h-[140px] flex items-center justify-end relative group">
                              <div 
                                className={`absolute right-4 w-7 top-[20%] bottom-[50%] border-r-2 border-t-2 rounded-tr-lg pointer-events-none transition-colors ${
                                  hasWinner1 ? 'border-[#ff8f00]' : 'border-white/20'
                                }`} 
                              />
                              <div 
                                className={`absolute right-4 w-7 top-[50%] bottom-[20%] border-r-2 border-b-2 rounded-br-lg pointer-events-none transition-colors ${
                                  hasWinner2 ? 'border-[#ff8f00]' : 'border-white/20'
                                }`} 
                              />
                              <div 
                                className={`absolute right-0 w-4 top-[50%] border-t-2 pointer-events-none transition-colors ${
                                  hasBothWinners ? 'border-[#ff8f00]' : 'border-white/30'
                                }`} 
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={rIdx} className="flex flex-col w-[320px] shrink-0">
                    <div className="h-10 flex items-center justify-between font-black text-white/50 uppercase tracking-widest text-xs mb-4 px-3 border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[#ff8f00] text-sm">🏆</span>
                        <span className="text-white font-black">{getRoundLabel(rIdx, totalRounds)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-400 font-bold bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                          {round.length} {round.length === 1 ? 'матч' : 'матчей'}
                        </span>
                        {canCollapse && !isExporting && (
                          <button
                            type="button"
                            onClick={() => toggleRoundHidden(rIdx, true)}
                            className="text-[10px] font-bold text-zinc-400 hover:text-[#ff8f00] bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                            title="Свернуть раунд"
                          >
                            <EyeOff className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col flex-1">
                      {round.map((match, mIdx) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          bracketType="winners"
                          rIdx={rIdx}
                          mIdx={mIdx}
                          onUpdateScore={(type, ri, mi, tn, s) => handleUpdateScore(activeQualIdx, ri, mi, tn, s)}
                          onAdvanceWinner={(type, ri, mi) => handleAdvanceWinner(activeQualIdx, ri, mi)}
                          onVetoMatch={onVetoMatch}
                          isFinal={isFinalRound}
                          isTop={mIdx % 2 === 0}
                          hasInConnector={rIdx > 0}
                          hasOutConnector={!isFinalRound}
                          boxStyle={tournament.settings?.boxStyle as any || 'dark'}
                          cardThemeColor={tournament.settings?.cardThemeColor || '#ff8f00'}
                          btnStyle={tournament.settings?.btnStyle}
                          bracketMode={tournament.settings?.bracketMode}
                          isExporting={isExporting}
                          isSwapMode={isSwapMode}
                          onSwapTeam={handleSwapTeam}
                          allTeams={tournament.teams}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="bg-zinc-800/40 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 text-zinc-600 border border-white/5">
              <Users className="w-10 h-10 text-zinc-500" />
            </div>
            <h4 className="text-xl font-black text-white mb-2">Сетка плей-офф еще не создана</h4>
            <p className="text-zinc-400 max-w-sm mx-auto text-xs font-semibold mb-6">
              {activeQualIdx === 0 
                ? 'Нажмите кнопку ниже, чтобы сгенерировать стартовую сетку плей-офф со всеми приглашенными командами.' 
                : `Нажмите кнопку ниже, чтобы сформировать сетку Квалификации #${activeQualIdx + 1} из оставшихся команд (без победителей предыдущих квал).`}
            </p>
            
            <button
              type="button"
              onClick={() => handleGenerateNextQual(activeQualIdx)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-3.5 rounded-2xl inline-flex items-center gap-3 transition-all shadow-xl shadow-blue-600/20 active:scale-95 cursor-pointer text-xs uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" /> СФОРМИРОВАТЬ СЕТКУ ПЛЕЙ-ОФФ
            </button>
            
            {activeQualIdx > 0 && !(brackets[activeQualIdx - 1]?.length) && (
              <div className="mt-6 flex items-center justify-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-widest bg-amber-500/10 px-5 py-2.5 rounded-xl border border-amber-500/20 inline-flex">
                <AlertCircle className="w-4 h-4" /> Сначала завершите предыдущую квалификацию
              </div>
            )}
          </div>
        )}
      </div>

      {/* Global Summary of Qualified Teams & Remaining Teams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900/60 border border-zinc-800 p-6 sm:p-8 rounded-3xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-5">
            <h4 className="text-zinc-400 font-black uppercase text-xs tracking-widest flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" /> Общий список прошедших команд
            </h4>
            <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              {allQualified.length} / {numQuals * advancePerQual}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {allQualified.map((t, i) => (
              <div key={i} className="bg-zinc-800/60 border border-emerald-500/30 p-3 rounded-xl flex items-center gap-2.5 shadow-sm">
                <div className="w-7 h-7 rounded-lg bg-zinc-900 overflow-hidden flex items-center justify-center shrink-0">
                  {t.logoUrl ? <img src={t.logoUrl} className="w-full h-full object-cover" alt="" /> : <Trophy className="w-4 h-4 text-zinc-600" />}
                </div>
                <span className="text-white font-bold text-xs truncate">{t.name}</span>
              </div>
            ))}
            {Array.from({ length: Math.max(0, (numQuals * advancePerQual) - allQualified.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="border-2 border-dashed border-zinc-800 p-3 rounded-xl flex items-center justify-center">
                <span className="text-[10px] font-black text-zinc-700 tracking-widest uppercase italic">Слот #{allQualified.length + i + 1} TBD</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 p-6 sm:p-8 rounded-3xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-5">
            <h4 className="text-zinc-400 font-black uppercase text-xs tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" /> Борются за следующие слоты
            </h4>
            <span className="text-xs font-bold text-zinc-500">
              {(tournament.teams || []).length - allQualified.length} команд
            </span>
          </div>

          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
            {(tournament.teams || []).filter(t => !allQualified.find(q => q.id === t.id)).map((t, i) => (
              <div key={i} className="bg-zinc-800/40 px-3 py-1.5 rounded-lg text-xs text-zinc-300 font-semibold border border-white/5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                <span>{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
