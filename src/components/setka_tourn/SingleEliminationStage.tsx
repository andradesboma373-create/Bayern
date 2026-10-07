import React, { useState } from 'react';
import { Match, Tournament, Team } from './types';
import BracketRenderer from './BracketRenderer';
import MatchCard from './MatchCard';
import { recordTournamentMatchResult } from '../../lib/tournamentMatchRecorder';

import { cascadeAdvancements, advanceDoubleElimMatch, generateDoubleElimination, generateSingleEliminationBracket } from './doubleEliminationLogic';

interface Props {
  tournament: Tournament;
  onUpdate: (updated: Tournament) => void;
  isExporting?: boolean;
  isSwapMode?: boolean;
  onVetoMatch?: (team1: Team, team2: Team, matchInfo?: any) => void;
  onToggleImportance?: (type: 'winners' | 'losers' | 'gf', rIdx: number, mIdx: number) => void;
}

export default function SingleEliminationStage({ tournament, onUpdate, isExporting, isSwapMode, onVetoMatch, onToggleImportance }: Props) {
  const wRounds = Array.isArray(tournament.bracketRounds) ? tournament.bracketRounds : [];
  const lRounds = Array.isArray(tournament.losersBracketRounds) ? tournament.losersBracketRounds : [];
  const gf = Array.isArray(tournament.grandFinal) ? tournament.grandFinal : [];
  
  const isDouble = tournament.settings?.eliminationType === 'double';

  const [hiddenRounds, setHiddenRounds] = useState<Record<number, boolean>>(() => {
    return (tournament.settings as any)?.hiddenRounds || {};
  });

  const toggleRoundHidden = (rIdx: number, hide?: boolean) => {
    const nextVal = hide !== undefined ? hide : !hiddenRounds[rIdx];
    const updated = { ...hiddenRounds, [rIdx]: nextVal };
    setHiddenRounds(updated);
    if (tournament.settings) {
      onUpdate({
        ...tournament,
        settings: {
          ...tournament.settings,
          hiddenRounds: updated
        } as any
      });
    }
  };

  const hideAllFinishedRounds = () => {
    const updated = { ...hiddenRounds };
    wRounds.forEach((round, rIdx) => {
      const remaining = wRounds.length - rIdx;
      if (remaining >= 3) {
        const isFinished = round.every(m => m && (m.isFinished || !!m.winnerId));
        if (isFinished) {
          updated[rIdx] = true;
        }
      }
    });
    setHiddenRounds(updated);
    if (tournament.settings) {
      onUpdate({
        ...tournament,
        settings: {
          ...tournament.settings,
          hiddenRounds: updated
        } as any
      });
    }
  };

  const showAllRounds = () => {
    setHiddenRounds({});
    if (tournament.settings) {
      onUpdate({
        ...tournament,
        settings: {
          ...tournament.settings,
          hiddenRounds: {}
        } as any
      });
    }
  };

  const handleUpdateScore = (type: 'winners' | 'losers' | 'gf', rIdx: number, mIdx: number, teamNum: 1 | 2, score: number) => {
    let newTournament = { ...tournament };
    let matchToUpdate: Match;

    if (type === 'winners') {
        const newRounds = [...wRounds];
        newRounds[rIdx] = [...newRounds[rIdx]];
        matchToUpdate = { ...newRounds[rIdx][mIdx] };
        if (teamNum === 1) matchToUpdate.score1 = score;
        else matchToUpdate.score2 = score;
        newRounds[rIdx][mIdx] = matchToUpdate;
        newTournament.bracketRounds = newRounds;
    } else if (type === 'losers') {
        const newRounds = [...lRounds];
        newRounds[rIdx] = [...newRounds[rIdx]];
        matchToUpdate = { ...newRounds[rIdx][mIdx] };
        if (teamNum === 1) matchToUpdate.score1 = score;
        else matchToUpdate.score2 = score;
        newRounds[rIdx][mIdx] = matchToUpdate;
        newTournament.losersBracketRounds = newRounds;
    } else if (type === 'gf') {
        const newGf = [...gf];
        matchToUpdate = { ...newGf[rIdx] };
        if (teamNum === 1) matchToUpdate.score1 = score;
        else matchToUpdate.score2 = score;
        newGf[rIdx] = matchToUpdate;
        newTournament.grandFinal = newGf;
    }

    onUpdate(newTournament);
  };

  const handleAdvanceWinner = (type: 'winners' | 'losers' | 'gf', rIdx: number, mIdx: number) => {
    let wBracket = tournament.bracketRounds ? JSON.parse(JSON.stringify(tournament.bracketRounds)) : [];
    let lBracket = tournament.losersBracketRounds ? JSON.parse(JSON.stringify(tournament.losersBracketRounds)) : [];
    let gFinal = tournament.grandFinal ? JSON.parse(JSON.stringify(tournament.grandFinal)) : [];

    let match: Match;
    let typeChar: 'w' | 'l' | 'gf';

    if (type === 'winners') {
        if (!wBracket[rIdx] || !wBracket[rIdx][mIdx]) return;
        match = wBracket[rIdx][mIdx];
        typeChar = 'w';
    } else if (type === 'losers') {
        if (!lBracket[rIdx] || !lBracket[rIdx][mIdx]) return;
        match = lBracket[rIdx][mIdx];
        typeChar = 'l';
    } else {
        if (!gFinal[rIdx]) return;
        match = gFinal[rIdx];
        typeChar = 'gf';
    }

    if (match.score1 > match.score2) match.winnerId = match.team1?.id || null;
    else if (match.score2 > match.score1) match.winnerId = match.team2?.id || null;

    const winningTeam = match.score1 > match.score2 ? match.team1 : match.team2;
    const losingTeam = match.score1 > match.score2 ? match.team2 : match.team1;

    // Immediately record match to global match history and tournament stats
    try {
        recordTournamentMatchResult(tournament.userId || 'guest', tournament, match, type);
    } catch (e) {
        console.warn("Could not record match result:", e);
    }

    if (isDouble) {
        advanceDoubleElimMatch(wBracket, lBracket, gFinal, typeChar, rIdx, mIdx, winningTeam, losingTeam);
        const cascaded = cascadeAdvancements(wBracket, lBracket, gFinal);
        onUpdate({ 
            ...tournament, 
            bracketRounds: cascaded.winnersBracket,
            losersBracketRounds: cascaded.losersBracket,
            grandFinal: cascaded.grandFinal
        });
    } else {
        // Simple Single Elimination logic
        if (rIdx < wBracket.length - 1) {
            const nextRoundIdx = rIdx + 1;
            const nextMatchIdx = Math.floor(mIdx / 2);
            const isTeam1 = mIdx % 2 === 0;
            
            const nextMatch = wBracket[nextRoundIdx]?.[nextMatchIdx];
            if (nextMatch) {
                if (isTeam1) nextMatch.team1 = winningTeam;
                else nextMatch.team2 = winningTeam;
            }
        }
        onUpdate({ ...tournament, bracketRounds: wBracket });
    }
  };

  
  const handleSwapTeam = (type: 'winners' | 'losers' | 'gf', rIdx: number, mIdx: number, teamNum: 1 | 2, teamId: string) => {
    let newTournament = { ...tournament };
    let matchToUpdate: Match;
    
    // Find team
    let team = tournament.teams.find(t => t.id === teamId) || null;
    if (teamId === 'BYE') team = { id: 'BYE', name: 'BYE' };
    
    if (type === 'winners') {
        const newRounds = [...wRounds];
        newRounds[rIdx] = [...newRounds[rIdx]];
        matchToUpdate = { ...newRounds[rIdx][mIdx] };
        if (teamNum === 1) matchToUpdate.team1 = team;
        else matchToUpdate.team2 = team;
        newRounds[rIdx][mIdx] = matchToUpdate;
        newTournament.bracketRounds = newRounds;
    } else if (type === 'losers') {
        const newRounds = [...lRounds];
        newRounds[rIdx] = [...newRounds[rIdx]];
        matchToUpdate = { ...newRounds[rIdx][mIdx] };
        if (teamNum === 1) matchToUpdate.team1 = team;
        else matchToUpdate.team2 = team;
        newRounds[rIdx][mIdx] = matchToUpdate;
        newTournament.losersBracketRounds = newRounds;
    } else if (type === 'gf') {
        const newGf = [...gf];
        matchToUpdate = { ...newGf[rIdx] };
        if (teamNum === 1) matchToUpdate.team1 = team;
        else matchToUpdate.team2 = team;
        newGf[rIdx] = matchToUpdate;
        newTournament.grandFinal = newGf;
    }
    
    onUpdate(newTournament);
  };

  const getRoundLabel = (rIdx: number, totalRounds: number) => {
    const remaining = totalRounds - rIdx;
    if (remaining === 1) return "Финал";
    if (remaining === 2) return "Полуфинал";
    if (remaining === 3) return "1/4 Финала";
    if (remaining === 4) return "1/8 Финала";
    if (remaining === 5) return "1/16 Финала";
    return `Раунд ${rIdx + 1}`;
  };

  const getRoundShortLabel = (rIdx: number, totalRounds: number) => {
    const remaining = totalRounds - rIdx;
    if (remaining === 1) return "Финал";
    if (remaining === 2) return "1/2";
    if (remaining === 3) return "1/4";
    if (remaining === 4) return "1/8";
    if (remaining === 5) return "1/16";
    return `R${rIdx + 1}`;
  };

  const collapsibleRounds = wRounds
    .map((round, rIdx) => {
      const remaining = wRounds.length - rIdx;
      if (remaining < 3) return null;
      const isFinished = round.every(m => m && (m.isFinished || !!m.winnerId));
      return {
        rIdx,
        remaining,
        label: getRoundLabel(rIdx, wRounds.length),
        shortLabel: getRoundShortLabel(rIdx, wRounds.length),
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
    <div className="w-full flex flex-col gap-12">
        {wRounds.length > 0 && (
            <div className="flex flex-col mb-12">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                    <h3 className="text-xl font-black text-[#ff8f00] uppercase tracking-widest flex items-center gap-2">
                        🏆 {isDouble ? "Верхняя сетка (Winners) & Гранд-Финал" : "Сетка Плей-офф"}
                    </h3>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-white/50 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                            Команд: {tournament.teams?.length || 0}
                        </span>
                        {!isExporting && (
                            <button
                                onClick={() => {
                                    if (window.confirm("Пересобрать турнирную сетку плей-офф по списку команд? Все текущие результаты плей-офф будут сброшены.")) {
                                        const teams = tournament.teams || [];
                                        if (teams.length >= 2) {
                                            if (isDouble) {
                                                const res = generateDoubleElimination(teams);
                                                onUpdate({
                                                    ...tournament,
                                                    bracketRounds: res.winnersBracket,
                                                    losersBracketRounds: res.losersBracket,
                                                    grandFinal: res.grandFinal
                                                });
                                            } else {
                                                const rounds = generateSingleEliminationBracket(teams);
                                                onUpdate({
                                                    ...tournament,
                                                    bracketRounds: rounds
                                                });
                                            }
                                        }
                                    }
                                }}
                                className="text-white/40 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-white/10 cursor-pointer flex items-center gap-1.5"
                                title="Сбросить и заново сгенерировать сетку плей-офф"
                            >
                                🔄 Пересобрать сетку
                            </button>
                        )}
                    </div>
                </div>

                {/* Round visibility toggles ("Фигня с галочками") */}
                {collapsibleRounds.length > 0 && !isExporting && (
                    <div className="no-export flex items-center justify-between gap-3 flex-wrap bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl mb-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-xs font-black uppercase tracking-wider text-white/50 flex items-center gap-1.5 mr-1">
                                <span>📐</span> Скрыть раунды:
                            </span>
                            {collapsibleRounds.map(({ rIdx, label, shortLabel, isFinished, matchCount }) => {
                                const isChecked = !!hiddenRounds[rIdx];
                                return (
                                    <label 
                                        key={rIdx} 
                                        className={`flex items-center gap-2 cursor-pointer select-none text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                                            isChecked 
                                                ? 'bg-[#ff8f00]/15 text-[#ff8f00] border-[#ff8f00]/40 shadow-[0_0_10px_rgba(255,143,0,0.15)]' 
                                                : 'bg-black/30 hover:bg-black/50 text-white/70 hover:text-white border-white/10'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => toggleRoundHidden(rIdx, e.target.checked)}
                                            className="w-4 h-4 rounded text-[#ff8f00] bg-black/40 border-white/20 cursor-pointer accent-[#ff8f00]"
                                        />
                                        <span>Скрыть {shortLabel}</span>
                                        {isFinished ? (
                                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                ✓ Сыгран
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-mono text-white/30">
                                                ({matchCount})
                                            </span>
                                        )}
                                    </label>
                                );
                            })}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={hideAllFinishedRounds}
                                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                                title="Автоматически скрыть все завершенные раунды (1/16, 1/8, 1/4)"
                            >
                                <span>⚡</span> Скрыть сыгранные
                            </button>
                            {Object.values(hiddenRounds).some(Boolean) && (
                                <button
                                    type="button"
                                    onClick={showAllRounds}
                                    className="text-xs font-bold text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-all cursor-pointer flex items-center gap-1"
                                    title="Показать все раунды полностью"
                                >
                                    <span>👁️</span> Показать все
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex gap-0 overflow-x-auto overflow-y-auto items-stretch w-full bg-black/20 p-6 rounded-2xl border border-white/5" style={{ minHeight: '400px' }}>
                    {/* Render Winners Bracket Rounds */}
                    {wRounds.map((round, rIdx) => {
                        const isHidden = !!hiddenRounds[rIdx];
                        const canCollapse = (wRounds.length - rIdx) >= 3;
                        const nextRound = wRounds[rIdx + 1];

                        if (isHidden && canCollapse) {
                            // Collapsed column: compact column with clean circuit conductors leading directly into 1/8 / 1/4 matches
                            return (
                                <div key={`w-col-${rIdx}`} className="flex flex-col w-[64px] shrink-0 border-r border-white/10 bg-black/40 py-2 px-1 relative z-10 select-none">
                                    {/* Compact Header */}
                                    <div className="h-10 flex flex-col items-center justify-center mb-4">
                                        {!isExporting ? (
                                            <button
                                                onClick={() => toggleRoundHidden(rIdx, false)}
                                                title={`Развернуть ${getRoundLabel(rIdx, wRounds.length)} (${round.length} матчей)`}
                                                className="w-full py-1.5 px-1 bg-[#ff8f00]/15 hover:bg-[#ff8f00]/30 text-[#ff8f00] text-[10px] font-black uppercase rounded-lg border border-[#ff8f00]/40 flex flex-col items-center justify-center transition-all cursor-pointer shadow-sm group"
                                            >
                                                <span className="text-xs group-hover:scale-125 transition-transform">➕</span>
                                                <span className="tracking-tight">{getRoundShortLabel(rIdx, wRounds.length)}</span>
                                            </button>
                                        ) : (
                                            <div className="w-full py-1 px-1 bg-[#ff8f00]/15 text-[#ff8f00] text-[10px] font-black uppercase rounded-lg border border-[#ff8f00]/30 text-center tracking-tight">
                                                {getRoundShortLabel(rIdx, wRounds.length)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Body with Branch Circuit Conductors Leading into Next Round */}
                                    <div className="flex flex-col flex-1">
                                        {(nextRound || round).map((_, nextMIdx) => {
                                            const m1 = round[2 * nextMIdx];
                                            const m2 = round[2 * nextMIdx + 1];
                                            const hasWinner1 = !!m1?.winnerId;
                                            const hasWinner2 = !!m2?.winnerId;
                                            const hasBothWinners = hasWinner1 && hasWinner2;

                                            const winner1Name = m1?.winnerId ? (m1.winnerId === m1.team1?.id ? (m1.team1?.name || 'Победитель') : (m1.team2?.name || 'Победитель')) : null;
                                            const winner2Name = m2?.winnerId ? (m2.winnerId === m2.team1?.id ? (m2.team1?.name || 'Победитель') : (m2.team2?.name || 'Победитель')) : null;

                                            return (
                                                <div key={`stub-${rIdx}-${nextMIdx}`} className="flex-1 min-h-[140px] flex items-center justify-end relative group">
                                                    {/* Upper branch conductor */}
                                                    <div 
                                                        className={`absolute right-4 w-7 top-[20%] bottom-[50%] border-r-2 border-t-2 rounded-tr-lg pointer-events-none transition-colors ${
                                                            hasWinner1 ? 'border-[#ff8f00]' : 'border-white/20 group-hover:border-[#ff8f00]/50'
                                                        }`} 
                                                    />
                                                    {/* Lower branch conductor */}
                                                    <div 
                                                        className={`absolute right-4 w-7 top-[50%] bottom-[20%] border-r-2 border-b-2 rounded-br-lg pointer-events-none transition-colors ${
                                                            hasWinner2 ? 'border-[#ff8f00]' : 'border-white/20 group-hover:border-[#ff8f00]/50'
                                                        }`} 
                                                    />
                                                    {/* Center horizontal line conducting into the next match incoming connector */}
                                                    <div 
                                                        className={`absolute right-0 w-4 top-[50%] border-t-2 pointer-events-none transition-colors ${
                                                            hasBothWinners ? 'border-[#ff8f00]' : 'border-white/30 group-hover:border-[#ff8f00]'
                                                        }`} 
                                                    />
                                                    {/* Node junction indicator dot where branches merge */}
                                                    <div 
                                                        className={`absolute right-3.5 top-[50%] -translate-y-1/2 w-2.5 h-2.5 rounded-full z-10 transition-all ${
                                                            hasBothWinners 
                                                                ? 'bg-[#ff8f00] shadow-[0_0_10px_rgba(255,143,0,0.9)] ring-2 ring-[#ff8f00]/30' 
                                                                : 'bg-white/40 group-hover:bg-[#ff8f00]'
                                                        }`} 
                                                    />

                                                    {/* Interactive Hover Details Tooltip */}
                                                    {!isExporting && (
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-12 bg-[#0c0d16] text-white text-[11px] p-3 rounded-xl border border-white/20 whitespace-nowrap z-50 pointer-events-none shadow-2xl backdrop-blur-md">
                                                            <div className="text-[#ff8f00] font-black uppercase text-[10px] tracking-wider mb-1.5 flex items-center gap-1.5">
                                                                <span>⚔️</span> {getRoundLabel(rIdx, wRounds.length)} &rarr; Выход в Матч #{nextMIdx + 1}
                                                            </div>
                                                            <div className="text-white/80 font-mono text-[10px] flex flex-col gap-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-white/40">Пара 1:</span>
                                                                    <span className={hasWinner1 ? 'text-emerald-400 font-bold' : 'text-white/60'}>
                                                                        {m1 ? `${m1.team1?.name || 'TBD'} ${m1.score1 ?? 0}:${m1.score2 ?? 0} ${m1.team2?.name || 'TBD'}` : 'TBD'}
                                                                        {winner1Name ? ` (Вышел: ${winner1Name})` : ''}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-white/40">Пара 2:</span>
                                                                    <span className={hasWinner2 ? 'text-emerald-400 font-bold' : 'text-white/60'}>
                                                                        {m2 ? `${m2.team1?.name || 'TBD'} ${m2.score1 ?? 0}:${m2.score2 ?? 0} ${m2.team2?.name || 'TBD'}` : 'TBD'}
                                                                        {winner2Name ? ` (Вышел: ${winner2Name})` : ''}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={`w-${rIdx}`} className="flex flex-col w-[320px] shrink-0">
                                <div className="h-10 flex items-center justify-between font-black text-white/40 uppercase tracking-widest text-sm mb-4 px-2">
                                    <span>{getRoundLabel(rIdx, wRounds.length)}</span>
                                    {canCollapse && !isExporting && (
                                        <button
                                            onClick={() => toggleRoundHidden(rIdx, true)}
                                            className="text-[11px] font-bold text-white/40 hover:text-[#ff8f00] bg-white/5 hover:bg-white/10 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                            title={`Скрыть блоки ${getRoundLabel(rIdx, wRounds.length)}`}
                                        >
                                            <span>👁️</span> Скрыть
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-col flex-1">
                                    {round.map((match, mIdx) => (
                                        <MatchCard
                                            key={match.id}
                                            match={match}
                                            bracketType="winners"
                                            rIdx={rIdx}
                                            mIdx={mIdx}
                                            onUpdateScore={handleUpdateScore}
                                            onAdvanceWinner={handleAdvanceWinner}
                                            onVetoMatch={onVetoMatch}
                                            isFinal={rIdx === wRounds.length - 1}
                                            isTop={mIdx % 2 === 0}
                                            hasInConnector={rIdx > 0}
                                            hasOutConnector={true}
                                            boxStyle={tournament.settings?.boxStyle as any}
                                            cardThemeColor={tournament.settings?.cardThemeColor}
                                            btnStyle={tournament.settings?.btnStyle}
                                            bracketMode={tournament.settings?.bracketMode}
                                            onSwapTeam={handleSwapTeam}
                                            allTeams={tournament.teams}
                                            isExporting={isExporting}
                                            isSwapMode={isSwapMode}
                                            onToggleImportance={onToggleImportance}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Divider & Grand Final Columns side by side */}
                    {isDouble && gf.length > 0 && (
                        <>
                            {/* Vertical Divider */}
                            <div className="flex items-center justify-center px-4 shrink-0">
                                <div className="w-[1px] h-[70%] bg-gradient-to-b from-[#ff8f00]/30 via-white/5 to-transparent rounded-full self-center" />
                            </div>

                            {/* Grand Final Match 1 */}
                            <div className="flex flex-col w-[320px] shrink-0">
                                <div className="h-10 flex items-center justify-center font-black text-[#ff8f00] uppercase tracking-widest text-sm mb-4">
                                    👑 Гранд-Финал
                                </div>
                                <div className="flex flex-col flex-1 justify-center">
                                    <MatchCard
                                        match={gf[0]}
                                        bracketType="gf"
                                        rIdx={0}
                                        mIdx={0}
                                        onUpdateScore={handleUpdateScore}
                                        onAdvanceWinner={handleAdvanceWinner}
                                        onVetoMatch={onVetoMatch}
                                        isFinal={true}
                                        isTop={true}
                                        hasInConnector={true}
                                        hasOutConnector={false}
                                        boxStyle={tournament.settings?.boxStyle as any}
                                        cardThemeColor={tournament.settings?.cardThemeColor}
                                        btnStyle={tournament.settings?.btnStyle}
                                        bracketMode={tournament.settings?.bracketMode}
                                        onSwapTeam={handleSwapTeam}
                                        allTeams={tournament.teams}
                                        isExporting={isExporting}
                                        isSwapMode={isSwapMode}
                                    />
                                </div>
                            </div>

                            {/* Grand Final Match 2 (Reset match if needed) */}
                            {gf.length > 1 && (gf[1].team1 || gf[1].team2 || gf[1].winnerId || (gf[0]?.winnerId && gf[0]?.team2 && gf[0].winnerId === gf[0].team2.id)) && (
                                <div className="flex flex-col w-[320px] shrink-0">
                                    <div className="h-10 flex items-center justify-center font-black text-amber-400 uppercase tracking-widest text-sm mb-4">
                                        👑 ГФ Ресет (Матч 2)
                                    </div>
                                    <div className="flex flex-col flex-1 justify-center">
                                        <MatchCard
                                            match={gf[1]}
                                            bracketType="gf"
                                            rIdx={1}
                                            mIdx={0}
                                            onUpdateScore={handleUpdateScore}
                                            onAdvanceWinner={handleAdvanceWinner}
                                            onVetoMatch={onVetoMatch}
                                            isFinal={true}
                                            isTop={true}
                                            hasInConnector={true}
                                            hasOutConnector={false}
                                            boxStyle={tournament.settings?.boxStyle as any}
                                            cardThemeColor={tournament.settings?.cardThemeColor}
                                            btnStyle={tournament.settings?.btnStyle}
                                            bracketMode={tournament.settings?.bracketMode}
                                            onSwapTeam={handleSwapTeam}
                                            allTeams={tournament.teams}
                                            isExporting={isExporting}
                                            isSwapMode={isSwapMode}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        )}

        {isDouble && lRounds.length > 0 && (
            <div className="mt-4 border-t border-white/5 pt-12">
                <BracketRenderer onVetoMatch={onVetoMatch} 
                    title="Нижняя сетка (Losers)"
                    rounds={lRounds} 
                    bracketType="losers"
                    onUpdateScore={handleUpdateScore}
                    onAdvanceWinner={handleAdvanceWinner}
                    boxStyle={tournament.settings.boxStyle as any}
                    cardThemeColor={tournament.settings.cardThemeColor}
                    btnStyle={tournament.settings.btnStyle}
                    bracketMode={tournament.settings.bracketMode}
                    onSwapTeam={handleSwapTeam}
                    allTeams={tournament.teams}
                    isExporting={isExporting}
                    isSwapMode={isSwapMode}
                />
            </div>
        )}

        {wRounds.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 bg-black/40 rounded-3xl border border-white/10 text-center max-w-xl mx-auto my-8 animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-[#ff8f00]/10 border border-[#ff8f00]/20 flex items-center justify-center text-3xl mb-4 text-[#ff8f00]">
                    🏆
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Сетка плей-офф еще не сформирована</h3>
                <p className="text-white/60 text-sm mb-6">
                    В турнире зарегистрировано команд: <span className="text-[#ff8f00] font-bold">{tournament.teams?.length || 0}</span>. Нажмите кнопку ниже, чтобы автоматически сформировать турнирную сетку.
                </p>
                <button
                    onClick={() => {
                        const teams = tournament.teams || [];
                        if (teams.length >= 2) {
                            if (isDouble) {
                                const res = generateDoubleElimination(teams);
                                onUpdate({
                                    ...tournament,
                                    bracketRounds: res.winnersBracket,
                                    losersBracketRounds: res.losersBracket,
                                    grandFinal: res.grandFinal
                                });
                            } else {
                                const rounds = generateSingleEliminationBracket(teams);
                                onUpdate({
                                    ...tournament,
                                    bracketRounds: rounds
                                });
                            }
                        }
                    }}
                    className="px-8 py-4 bg-[#ff8f00] hover:bg-[#ffa733] text-black font-black uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(255,143,0,0.3)] cursor-pointer flex items-center gap-2"
                >
                    ⚡ Сформировать сетку плей-офф ({tournament.teams?.length || 0} команд)
                </button>
            </div>
        )}
    </div>
  );
}

