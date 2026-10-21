import React from 'react';
import { Match, Team } from './types';
import TeamLogo from '../TeamLogo';
import { getBoxStyle, BoxStyle } from './boxStyles';

interface Props {
    key?: React.Key;
    match: Match;
    bracketType: 'winners' | 'losers' | 'gf';
    rIdx: number;
    mIdx: number;
    onUpdateScore: (type: 'winners' | 'losers' | 'gf', rIdx: number, mIdx: number, teamNum: 1 | 2, score: number) => void;
    onAdvanceWinner: (type: 'winners' | 'losers' | 'gf', rIdx: number, mIdx: number) => void;
    onRevertWinner?: (type: 'winners' | 'losers' | 'gf', rIdx: number, mIdx: number) => void;
    onSwapTeam?: (type: 'winners' | 'losers' | 'gf', rIdx: number, mIdx: number, teamNum: 1 | 2, teamId: string) => void;
    allTeams?: {id: string, name: string}[];
  onVetoMatch?: (team1: Team, team2: Team, matchInfo?: any) => void;
    isExporting?: boolean;
    isSwapMode?: boolean;
    isFinal?: boolean;
    isTop?: boolean;
    hasInConnector?: boolean;
    hasOutConnector?: boolean;
    boxStyle?: BoxStyle;
    cardThemeColor?: string;
    btnStyle?: string;
    bracketMode?: 'standard' | 'realtime';
    onToggleImportance?: (type: 'winners' | 'losers' | 'gf', rIdx: number, mIdx: number) => void;
    isLogosOnly?: boolean;
    game?: string;
}

export default function MatchCard({
    onVetoMatch,
    match,
    bracketType,
    rIdx,
    mIdx,
    onUpdateScore,
    onAdvanceWinner,
    onRevertWinner,
    isFinal = false,
    onSwapTeam,
    allTeams,
    isExporting = false,
    isSwapMode = false,
    isTop = false,
    hasInConnector = false,
    hasOutConnector = false,
    boxStyle = 'dark',
    cardThemeColor = '#ff8f00',
    btnStyle = 'gradient',
    bracketMode = 'standard',
    onToggleImportance,
    isLogosOnly = false,
    game
}: Props) {
    if (!match) {
        return <div className="flex-1 min-h-[140px]" />;
    }

    const getTeamId = (tm: any): string => {
        if (!tm) return '';
        if (typeof tm === 'string') return tm;
        return tm.id || tm.name || '';
    };

    const getTeamName = (tm: any, fallback = '?'): string => {
        if (!tm) return fallback;
        if (typeof tm === 'string') return tm;
        return tm.name || tm.teamName || tm.title || fallback;
    };

    const getTeamLogo = (tm: any): string | undefined => {
        if (!tm || typeof tm !== 'object') return undefined;
        return tm.logoUrl || tm.logo || undefined;
    };

    const t1Id = getTeamId(match.team1);
    const t2Id = getTeamId(match.team2);
    const t1Name = getTeamName(match.team1, (match as any).team1Name);
    const t2Name = getTeamName(match.team2, (match as any).team2Name);

    if (t1Id === 'BYE' && t2Id === 'BYE') {
        return <div className="flex-1 min-h-[140px]" />;
    }

    const hasWinner = !!match.winnerId;
    const accentColor = cardThemeColor || '#ff8f00';
    const lineColor = hasWinner ? 'border-[#ff8f00]' : 'border-white/10';
    const prevHasTeams = !!(match.team1 || match.team2);
    const inLineColor = prevHasTeams ? 'border-white/30' : 'border-white/5';

    let outConnector = null;
    if (hasOutConnector && !isFinal && bracketType !== 'gf') {
        if (bracketType === 'losers' && rIdx % 2 === 0) {
            outConnector = (
                <div className={`absolute right-0 w-6 z-0 top-[50%] border-t-2 ${lineColor}`} style={hasWinner ? { borderColor: accentColor } : undefined} />
            );
        } else {
            outConnector = (
                <div className={`absolute right-0 w-6 z-0 border-r-2 ${lineColor} 
                    ${isTop 
                        ? 'top-[50%] bottom-0 border-t-2 rounded-tr-xl' 
                        : 'top-0 bottom-[50%] border-b-2 rounded-br-xl'}`} 
                    style={hasWinner ? { borderColor: accentColor } : undefined}
                />
            );
        }
    }

    const boxCls = getBoxStyle(boxStyle, cardThemeColor, btnStyle);

    // Apply custom inline accent styles only if custom cardThemeColor is explicitly set AND boxStyle is 'dark'
    const isCustomAccent = !!cardThemeColor && boxStyle === 'dark';
    
    const selectedCustomStyle = isCustomAccent ? {
        borderColor: accentColor,
        backgroundColor: `${accentColor}18`,
        boxShadow: `0 0 12px ${accentColor}35`,
    } : undefined;

    const winnerCustomTextStyle = isCustomAccent ? {
        color: accentColor,
        textShadow: `0 0 8px ${accentColor}60`
    } : undefined;

    const isT1Winner = match.winnerId && (match.winnerId === t1Id || (t1Name && match.winnerId === t1Name));
    const isT2Winner = match.winnerId && (match.winnerId === t2Id || (t2Name && match.winnerId === t2Name));

    return (
        <div className="relative flex flex-col justify-center flex-1 px-6 min-h-[140px] group">
            <div className={`relative z-10 w-full transition-all ${boxCls.outerCard}`}>
                {/* Importance Indicator (Dots) */}
                {!isExporting && onToggleImportance && (
                    <button 
                        onClick={() => onToggleImportance(bracketType, rIdx, mIdx)}
                        className="absolute -top-1.5 -right-1.5 z-20 w-6 h-6 rounded-full bg-black/80 border border-white/10 flex items-center justify-center hover:scale-110 transition-all shadow-lg"
                        title="Изменить важность матча (Обычный -> Полуфинал -> Финал)"
                    >
                        {match.importance === 'final' ? (
                            <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
                        ) : match.importance === 'semi' ? (
                            <div className="w-3 h-3 rounded-full bg-slate-300 shadow-[0_0_8px_rgba(203,213,225,0.6)]" />
                        ) : (
                            <div className="w-2 h-2 rounded-full bg-white/10" />
                        )}
                    </button>
                )}
                {isExporting && match.importance && match.importance !== 'none' && (
                    <div className="absolute top-2 right-2 z-20">
                        {match.importance === 'final' ? (
                            <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
                        ) : (
                            <div className="w-3 h-3 rounded-full bg-slate-300 shadow-[0_0_8px_rgba(203,213,225,0.6)]" />
                        )}
                    </div>
                )}

                <div className="flex flex-col gap-3">
                                    {/* Team 1 */}
                                    <div 
                                        className={`flex items-center ${isLogosOnly ? 'justify-start w-fit px-1' : 'gap-1.5 flex-1 min-w-0 pr-1'} cursor-pointer transition-all ${
                                            hasWinner && !isT1Winner ? 'opacity-35 hover:opacity-75 grayscale-[40%]' : ''
                                        }`}
                                        title={getTeamName(match.team1) ? `${getTeamName(match.team1)} (Нажмите для победы)` : 'Нажмите для победы'}
                                        onClick={() => !isExporting && match.team1 && onAdvanceWinner(bracketType, rIdx, mIdx)}
                                    >
                                        <div className={`transition-all rounded-md shrink-0 ${isT1Winner ? 'p-0.5 bg-emerald-500/20 ring-2 ring-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''}`}>
                                            <TeamLogo game={game as any} teamName={getTeamName(match.team1)} logoUrl={getTeamLogo(match.team1)} sizeClassName="w-5 h-5" />
                                        </div>
                                        {!isExporting && isSwapMode && onSwapTeam && allTeams ? (
                                            <select
                                                value={t1Id}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    onSwapTeam(bracketType, rIdx, mIdx, 1, e.target.value);
                                                }}
                                                className="bg-zinc-950 text-white font-bold text-sm outline-none cursor-pointer w-[120px] truncate rounded border border-white/10 px-1"
                                            >
                                                <option value="" className="bg-[#12121a]">TBD</option>
                                                <option value="BYE" className="bg-[#12121a] text-emerald-400">BYE</option>
                                                {allTeams.map(t => (
                                                    <option key={t.id} value={t.id} className="bg-[#12121a] text-white">
                                                        {t.name}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span 
                                                className={`truncate max-w-[120px] ${
                                                    isT1Winner 
                                                        ? boxCls.winnerText 
                                                        : hasWinner 
                                                            ? boxCls.loserText 
                                                            : boxCls.defaultText
                                                }`}
                                                style={isT1Winner ? winnerCustomTextStyle : undefined}
                                            >
                                                {getTeamName(match.team1) === 'TBD' || !getTeamName(match.team1) || getTeamName(match.team1) === '?' ? 'TBD' : getTeamName(match.team1)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Center Capsule (Score or VS) */}
                                    <div className="shrink-0 flex items-center justify-center px-1">
                                        {hasWinner ? (
                                            <div
                                                onClick={() => !isExporting && onRevertWinner?.(bracketType, rIdx, mIdx)}
                                                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/90 border border-white/25 text-xs font-mono font-black cursor-pointer hover:border-rose-500/60 hover:text-rose-400 transition-all"
                                                title="Нажмите, чтобы сбросить результат"
                                            >
                                                <span className={isT1Winner ? 'text-emerald-400 font-bold' : 'text-white/50'}>
                                                    {match.score1 !== undefined ? match.score1 : '-'}
                                                </span>
                                                <span className="text-white/40 text-[10px]">:</span>
                                                <span className={isT2Winner ? 'text-emerald-400 font-bold' : 'text-white/50'}>
                                                    {match.score2 !== undefined ? match.score2 : '-'}
                                                </span>
                                            </div>
                                        ) : isExporting ? (
                                            <div className="flex items-center justify-center px-2 py-0.5 rounded-full bg-black/60 border border-white/10 text-white/50 font-mono font-bold text-[10px]">
                                                - -
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    className="w-6 h-6 text-center rounded bg-black/60 text-white font-mono font-bold text-xs border border-white/10 focus:border-[#ff8f00] outline-none [appearance:textfield]"
                                                    placeholder="-"
                                                    value={match.score1 === undefined ? '' : match.score1}
                                                    onChange={(e) => {
                                                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                                        onUpdateScore(bracketType, rIdx, mIdx, 1, isNaN(val) ? 0 : val);
                                                    }}
                                                />
                                                <span className="text-white/30 text-[10px] font-bold">:</span>
                                                <input
                                                    type="number"
                                                    className="w-6 h-6 text-center rounded bg-black/60 text-white font-mono font-bold text-xs border border-white/10 focus:border-[#ff8f00] outline-none [appearance:textfield]"
                                                    placeholder="-"
                                                    value={match.score2 === undefined ? '' : match.score2}
                                                    onChange={(e) => {
                                                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                                        onUpdateScore(bracketType, rIdx, mIdx, 2, isNaN(val) ? 0 : val);
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Team 2 (Right) */}
                                    <div 
                                        className={`flex items-center ${isLogosOnly ? 'justify-end w-fit px-1' : 'justify-end gap-1.5 flex-1 min-w-0 pl-1'} cursor-pointer transition-all ${
                                            hasWinner && !isT2Winner ? 'opacity-35 hover:opacity-75 grayscale-[40%]' : ''
                                        }`}
                                        title={getTeamName(match.team2) ? `${getTeamName(match.team2)} (Нажмите для победы)` : 'Нажмите для победы'}
                                        onClick={() => !isExporting && match.team2 && onAdvanceWinner(bracketType, rIdx, mIdx)}
                                    >
                                        {!isExporting && isSwapMode && onSwapTeam && allTeams ? (
                                            <select
                                                value={t2Id}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    onSwapTeam(bracketType, rIdx, mIdx, 2, e.target.value);
                                                }}
                                                className="bg-zinc-950 text-white font-bold text-sm outline-none cursor-pointer w-[120px] truncate rounded border border-white/10 px-1"
                                            >
                                                <option value="" className="bg-[#12121a]">TBD</option>
                                                <option value="BYE" className="bg-[#12121a] text-emerald-400">BYE</option>
                                                {allTeams.map(t => (
                                                    <option key={t.id} value={t.id} className="bg-[#12121a] text-white">
                                                        {t.name}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span 
                                                className={`truncate max-w-[120px] ${
                                                    isT2Winner 
                                                        ? boxCls.winnerText 
                                                        : hasWinner 
                                                            ? boxCls.loserText 
                                                            : boxCls.defaultText
                                                }`}
                                                style={isT2Winner ? winnerCustomTextStyle : undefined}
                                            >
                                                {getTeamName(match.team2) === 'TBD' || !getTeamName(match.team2) || getTeamName(match.team2) === '?' ? 'TBD' : getTeamName(match.team2)}
                                            </span>
                                        )}
                                        <div className={`transition-all rounded-md shrink-0 ${isT2Winner ? 'p-0.5 bg-emerald-500/20 ring-2 ring-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''}`}>
                                            <TeamLogo game={game as any} teamName={getTeamName(match.team2)} logoUrl={getTeamLogo(match.team2)} sizeClassName="w-5 h-5" />
                                        </div>
                                    </div>
                                    
                                    {/* Hover Actions Bar */}
                                    {!hasWinner && !isExporting && (
                                        <div className="absolute -bottom-2.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-20">
                                            {bracketMode === 'realtime' && onVetoMatch && match.team1 && match.team2 && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); onVetoMatch(match.team1!, match.team2!, { bracketType, rIdx, mIdx, matchId: match.id, stage: 'playoff' })}}
                                                    className="bg-purple-600 hover:bg-purple-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-md uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                                >
                                                    🎮 Veto
                                                </button>
                                            )}
                                        </div>
                                    )
                                }
                </div>
            </div>

            {outConnector}
            
            {/* Connector in */}
            {hasInConnector && (
                <div className={`absolute left-0 w-6 top-[50%] border-t-2 ${inLineColor} z-0`} />
            )}
        </div>
    );
}
