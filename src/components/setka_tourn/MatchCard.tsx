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
}

export default function MatchCard({
    onVetoMatch,
    match,
    bracketType,
    rIdx,
    mIdx,
    onUpdateScore,
    onAdvanceWinner,
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
    bracketMode = 'standard'
}: Props) {
    if (!match) {
        return <div className="flex-1 min-h-[140px]" />;
    }
    if (match.team1?.id === 'BYE' && match.team2?.id === 'BYE') {
        return <div className="flex-1 min-h-[140px]" />;
    }

    const hasWinner = !!match.winnerId;
    const accentColor = cardThemeColor || '#ff8f00';
    const lineColor = hasWinner ? 'border-[#ff8f00]' : 'border-white/10';
    const prevHasTeams = match.team1 || match.team2;
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

    return (
        <div className="relative flex flex-col justify-center flex-1 px-6 min-h-[140px] group">
            <div className={`relative z-10 w-full transition-all ${boxCls.outerCard}`}>
                <div className="flex flex-col gap-3">
                    {/* Team 1 */}
                    <div 
                        className={`${
                            match.winnerId === match.team1?.id 
                                ? boxCls.selectedTeamRow 
                                : hasWinner 
                                    ? boxCls.nonSelectedTeamRow 
                                    : boxCls.innerTeamRow
                        }`}
                        style={match.winnerId === match.team1?.id ? selectedCustomStyle : undefined}
                    >
                        <div className="flex items-center gap-3">
                            <TeamLogo teamName={match.team1?.name || ''} sizeClassName="w-6 h-6" />
                            {!hasWinner && !isExporting && isSwapMode && onSwapTeam && allTeams ? (
                                <select
                                    value={match.team1?.id || ''}
                                    onChange={(e) => onSwapTeam(bracketType, rIdx, mIdx, 1, e.target.value)}
                                    className="bg-transparent text-white font-bold text-sm outline-none cursor-pointer w-[120px] truncate"
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
                                        match.winnerId === match.team1?.id 
                                            ? boxCls.winnerText 
                                            : hasWinner 
                                                ? boxCls.loserText 
                                                : boxCls.defaultText
                                    }`}
                                    style={match.winnerId === match.team1?.id ? winnerCustomTextStyle : undefined}
                                >
                                    {match.team1?.name || 'TBD'}
                                </span>
                            )}
                        </div>
                        {match.team1 && match.team2 && !match.winnerId && match.team1.id !== 'BYE' && match.team2.id !== 'BYE' && bracketMode !== 'realtime' && (
                            <input 
                                type="number" 
                                className={boxCls.scoreInput} 
                                placeholder="0" 
                                value={match.score1 === 0 ? 0 : (match.score1 || '')}
                                onChange={(e) => onUpdateScore(bracketType, rIdx, mIdx, 1, parseInt(e.target.value) || 0)} 
                            />
                        )}
                        {match.winnerId && match.team1?.id !== 'BYE' && match.team2?.id !== 'BYE' && (
                            <span className="font-mono font-black text-lg" style={isCustomAccent && match.winnerId === match.team1?.id ? { color: accentColor } : undefined}>
                                {match.score1}
                            </span>
                        )}
                    </div>

                    {/* Team 2 */}
                    <div 
                        className={`${
                            match.winnerId === match.team2?.id 
                                ? boxCls.selectedTeamRow 
                                : hasWinner 
                                    ? boxCls.nonSelectedTeamRow 
                                    : boxCls.innerTeamRow
                        }`}
                        style={match.winnerId === match.team2?.id ? selectedCustomStyle : undefined}
                    >
                        <div className="flex items-center gap-3">
                            <TeamLogo teamName={match.team2?.name || ''} sizeClassName="w-6 h-6" />
                            {!hasWinner && !isExporting && isSwapMode && onSwapTeam && allTeams ? (
                                <select
                                    value={match.team2?.id || ''}
                                    onChange={(e) => onSwapTeam(bracketType, rIdx, mIdx, 2, e.target.value)}
                                    className="bg-transparent text-white font-bold text-sm outline-none cursor-pointer w-[120px] truncate"
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
                                        match.winnerId === match.team2?.id 
                                            ? boxCls.winnerText 
                                            : hasWinner 
                                                ? boxCls.loserText 
                                                : boxCls.defaultText
                                    }`}
                                    style={match.winnerId === match.team2?.id ? winnerCustomTextStyle : undefined}
                                >
                                    {match.team2?.name || 'TBD'}
                                </span>
                            )}
                        </div>
                        {match.team1 && match.team2 && !match.winnerId && match.team1.id !== 'BYE' && match.team2.id !== 'BYE' && bracketMode !== 'realtime' && (
                            <input 
                                type="number" 
                                className={boxCls.scoreInput} 
                                placeholder="0" 
                                value={match.score2 === 0 ? 0 : (match.score2 || '')}
                                onChange={(e) => onUpdateScore(bracketType, rIdx, mIdx, 2, parseInt(e.target.value) || 0)} 
                            />
                        )}
                        {match.winnerId && match.team1?.id !== 'BYE' && match.team2?.id !== 'BYE' && (
                            <span className="font-mono font-black text-lg" style={isCustomAccent && match.winnerId === match.team2?.id ? { color: accentColor } : undefined}>
                                {match.score2}
                            </span>
                        )}
                    </div>
                    
                    
                    {/* Play / Veto Simulation Button (Realtime mode) or Confirm Button (Standard mode) */}
                    {match.team1 && match.team2 && !match.winnerId && match.team1.id !== 'BYE' && match.team2.id !== 'BYE' && !isExporting && (
                        bracketMode === 'realtime' ? (
                            onVetoMatch ? (
                                <button 
                                    onClick={() => onVetoMatch(match.team1!, match.team2!)} 
                                    className="w-full mt-2 bg-purple-600 hover:bg-purple-500 text-white border border-purple-400 rounded-lg py-2 px-3 text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    🎮 Сыграть Матч (Симуляция)
                                </button>
                            ) : null
                        ) : (
                            <button 
                                onClick={() => {
                                    if (match.score1 === match.score2) {
                                        if (!window.confirm("У вас зафиксирована ничья. В плей-офф ничьи обычно не допускаются. Вы уверены, что хотите завершить матч? (Победитель может быть не определен корректно)")) {
                                            return;
                                        }
                                    }
                                    onAdvanceWinner(bracketType, rIdx, mIdx);
                                }} 
                                className={boxCls.btnConfirm}
                            >
                                Завершить матч
                            </button>
                        )
                    )}
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
