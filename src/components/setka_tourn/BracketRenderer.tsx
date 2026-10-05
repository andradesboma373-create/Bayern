import React from 'react';
import { Match, Team } from './types';
import MatchCard from './MatchCard';

interface Props {
  title: string;
  rounds: Match[][];
  bracketType: 'winners' | 'losers' | 'gf';
  onUpdateScore: (type: 'winners' | 'losers' | 'gf', rIdx: number, mIdx: number, teamNum: 1 | 2, score: number) => void;
  onAdvanceWinner: (type: 'winners' | 'losers' | 'gf', rIdx: number, mIdx: number) => void;
  onVetoMatch: (t1: Team, t2: Team) => void;
  boxStyle?: any;
  cardThemeColor?: string;
  btnStyle?: string;
  bracketMode?: 'standard' | 'realtime';
  onSwapTeam?: (type: 'winners' | 'losers' | 'gf', rIdx: number, mIdx: number, teamNum: 1 | 2, teamId: string) => void;
  allTeams?: Team[];
  isExporting?: boolean;
  isSwapMode?: boolean;
}

export default function BracketRenderer({
  title, rounds, bracketType, onUpdateScore, onAdvanceWinner, onVetoMatch,
  boxStyle, cardThemeColor, btnStyle, bracketMode, onSwapTeam, allTeams, isExporting, isSwapMode
}: Props) {
  const [hiddenRounds, setHiddenRounds] = React.useState<Record<number, boolean>>({});

  const toggleRoundHidden = (rIdx: number, hide?: boolean) => {
    setHiddenRounds(prev => ({
      ...prev,
      [rIdx]: hide !== undefined ? hide : !prev[rIdx]
    }));
  };

  const getRoundLabel = (rIdx: number, total: number) => {
    const remaining = total - rIdx;
    if (remaining === 1) return bracketType === 'losers' ? "Финал Лузеров" : "Финал";
    if (remaining === 2) return "Полуфинал";
    if (remaining === 3) return "1/4 Финала";
    if (remaining === 4) return "1/8 Финала";
    if (remaining === 5) return "1/16 Финала";
    return `Раунд ${rIdx + 1}`;
  };

  const getRoundShortLabel = (rIdx: number, total: number) => {
    const remaining = total - rIdx;
    if (remaining === 1) return bracketType === 'losers' ? "ФЛ" : "Финал";
    if (remaining === 2) return "1/2";
    if (remaining === 3) return "1/4";
    if (remaining === 4) return "1/8";
    if (remaining === 5) return "1/16";
    return `R${rIdx + 1}`;
  };

  const safeRounds = Array.isArray(rounds) ? rounds : [];

  const collapsibleRounds = safeRounds
    .map((round, rIdx) => {
      const remaining = safeRounds.length - rIdx;
      if (remaining < 3) return null;
      const isFinished = round.every(m => m && (m.isFinished || !!m.winnerId));
      return {
        rIdx,
        remaining,
        label: getRoundLabel(rIdx, safeRounds.length),
        shortLabel: getRoundShortLabel(rIdx, safeRounds.length),
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
    <div className="flex flex-col mb-12">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <h3 className="text-xl font-black text-white/60 uppercase tracking-widest flex items-center gap-2">
                🛡️ {title}
            </h3>
        </div>

        {/* Collapsible checkboxes toolbar for Losers Bracket */}
        {collapsibleRounds.length > 0 && !isExporting && (
            <div className="no-export flex items-center justify-between gap-3 flex-wrap bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl mb-4 backdrop-blur-sm">
                <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-wider text-white/50 flex items-center gap-1.5 mr-1">
                        <span>📐</span> Скрыть раунды:
                    </span>
                    {collapsibleRounds.map(({ rIdx, shortLabel, isFinished, matchCount }) => {
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
                        onClick={() => {
                            const updated: Record<number, boolean> = {};
                            collapsibleRounds.forEach(r => { if (r.isFinished) updated[r.rIdx] = true; });
                            setHiddenRounds(updated);
                        }}
                        className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                        title="Автоматически скрыть все завершенные раунды"
                    >
                        <span>⚡</span> Скрыть сыгранные
                    </button>
                    {Object.values(hiddenRounds).some(Boolean) && (
                        <button
                            type="button"
                            onClick={() => setHiddenRounds({})}
                            className="text-xs font-bold text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-all cursor-pointer flex items-center gap-1"
                            title="Показать все раунды полностью"
                        >
                            <span>👁️</span> Показать все
                        </button>
                    )}
                </div>
            </div>
        )}

        <div className="flex gap-0 overflow-x-auto overflow-y-auto items-stretch w-full bg-black/20 p-6 rounded-2xl border border-white/5" style={{ minHeight: '300px' }}>
            {safeRounds.map((round, rIdx) => {
                const safeMatches = Array.isArray(round) ? round : [];
                const isHidden = !!hiddenRounds[rIdx];
                const canCollapse = (safeRounds.length - rIdx) >= 3;
                const nextRound = safeRounds[rIdx + 1];

                if (isHidden && canCollapse) {
                    return (
                        <div key={`${bracketType}-col-${rIdx}`} className="flex flex-col w-[64px] shrink-0 border-r border-white/10 bg-black/40 py-2 px-1 relative z-10 select-none">
                            {/* Compact Header */}
                            <div className="h-10 flex flex-col items-center justify-center mb-4">
                                {!isExporting ? (
                                    <button
                                        onClick={() => toggleRoundHidden(rIdx, false)}
                                        title={`Развернуть ${getRoundLabel(rIdx, safeRounds.length)} (${safeMatches.length} матчей)`}
                                        className="w-full py-1.5 px-1 bg-[#ff8f00]/15 hover:bg-[#ff8f00]/30 text-[#ff8f00] text-[10px] font-black uppercase rounded-lg border border-[#ff8f00]/40 flex flex-col items-center justify-center transition-all cursor-pointer shadow-sm group"
                                    >
                                        <span className="text-xs group-hover:scale-125 transition-transform">➕</span>
                                        <span className="tracking-tight">{getRoundShortLabel(rIdx, safeRounds.length)}</span>
                                    </button>
                                ) : (
                                    <div className="w-full py-1 px-1 bg-[#ff8f00]/15 text-[#ff8f00] text-[10px] font-black uppercase rounded-lg border border-[#ff8f00]/30 text-center tracking-tight">
                                        {getRoundShortLabel(rIdx, safeRounds.length)}
                                    </div>
                                )}
                            </div>

                            {/* Body with Branch Circuit Conductors Leading to Next Round */}
                            <div className="flex flex-col flex-1">
                                {(nextRound || safeMatches).map((_, nextMIdx) => {
                                    const m1 = safeMatches[2 * nextMIdx];
                                    const m2 = safeMatches[2 * nextMIdx + 1];
                                    const hasWinner1 = !!m1?.winnerId;
                                    const hasWinner2 = !!m2?.winnerId;
                                    const hasBothWinners = hasWinner1 && hasWinner2;

                                    return (
                                        <div key={`stub-${bracketType}-${rIdx}-${nextMIdx}`} className="flex-1 min-h-[140px] flex items-center justify-end relative group">
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
                                            {/* Center horizontal line conducting into next round match */}
                                            <div 
                                                className={`absolute right-0 w-4 top-[50%] border-t-2 pointer-events-none transition-colors ${
                                                    hasBothWinners ? 'border-[#ff8f00]' : 'border-white/30 group-hover:border-[#ff8f00]'
                                                }`} 
                                            />
                                            {/* Junction dot */}
                                            <div 
                                                className={`absolute right-3.5 top-[50%] -translate-y-1/2 w-2.5 h-2.5 rounded-full z-10 transition-all ${
                                                    hasBothWinners 
                                                        ? 'bg-[#ff8f00] shadow-[0_0_10px_rgba(255,143,0,0.9)] ring-2 ring-[#ff8f00]/30' 
                                                        : 'bg-white/40 group-hover:bg-[#ff8f00]'
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
                <div key={`${bracketType}-${rIdx}`} className="flex flex-col w-[320px] shrink-0">
                    <div className="h-10 flex items-center justify-between font-black text-white/40 uppercase tracking-widest text-sm mb-4 px-2">
                        <span>{getRoundLabel(rIdx, safeRounds.length)}</span>
                        {canCollapse && !isExporting && (
                            <button
                                onClick={() => toggleRoundHidden(rIdx, true)}
                                className="text-[11px] font-bold text-white/40 hover:text-[#ff8f00] bg-white/5 hover:bg-white/10 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                title={`Скрыть блоки ${getRoundLabel(rIdx, safeRounds.length)}`}
                            >
                                <span>👁️</span> Скрыть
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col flex-1">
                        {safeMatches.map((match, mIdx) => {
                            if (!match) return null;
                            return (
                            <MatchCard
                                key={match.id || `m-${bracketType}-${rIdx}-${mIdx}`}
                                match={match}
                                bracketType={bracketType}
                                rIdx={rIdx}
                                mIdx={mIdx}
                                onUpdateScore={onUpdateScore}
                                onAdvanceWinner={onAdvanceWinner}
                                onVetoMatch={onVetoMatch}
                                isFinal={rIdx === safeRounds.length - 1}
                                isTop={mIdx % 2 === 0}
                                hasInConnector={rIdx > 0}
                                hasOutConnector={rIdx < safeRounds.length - 1}
                                boxStyle={boxStyle}
                                cardThemeColor={cardThemeColor}
                                btnStyle={btnStyle}
                                bracketMode={bracketMode}
                                onSwapTeam={onSwapTeam}
                                allTeams={allTeams}
                                isExporting={isExporting}
                                isSwapMode={isSwapMode}
                            />
                            );
                        })}
                    </div>
                </div>
                );
            })}
        </div>
    </div>
  );
}
