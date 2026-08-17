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
  const getRoundLabel = (rIdx: number, total: number) => {
    const remaining = total - rIdx;
    if (remaining === 1) return bracketType === 'losers' ? "Финал Лузеров" : "Финал";
    if (remaining === 2) return "Полуфинал";
    if (remaining === 3) return "1/4 Финала";
    if (remaining === 4) return "1/8 Финала";
    if (remaining === 5) return "1/16 Финала";
    return `Раунд ${rIdx + 1}`;
  };

  return (
    <div className="flex flex-col mb-12">
        <h3 className="text-xl font-black text-white/60 uppercase tracking-widest flex items-center gap-2 mb-6">
            🛡️ {title}
        </h3>
        <div className="flex gap-0 overflow-x-auto overflow-y-auto items-stretch w-full bg-black/20 p-6 rounded-2xl border border-white/5" style={{ minHeight: '300px' }}>
            {rounds.map((round, rIdx) => (
                <div key={`${bracketType}-${rIdx}`} className="flex flex-col w-[320px] shrink-0">
                    <div className="h-10 flex items-center justify-center font-black text-white/40 uppercase tracking-widest text-sm mb-4">
                        {getRoundLabel(rIdx, rounds.length)}
                    </div>
                    <div className="flex flex-col flex-1">
                        {round.map((match, mIdx) => (
                            <MatchCard
                                key={match.id}
                                match={match}
                                bracketType={bracketType}
                                rIdx={rIdx}
                                mIdx={mIdx}
                                onUpdateScore={onUpdateScore}
                                onAdvanceWinner={onAdvanceWinner}
                                onVetoMatch={onVetoMatch}
                                isFinal={rIdx === rounds.length - 1}
                                isTop={mIdx % 2 === 0}
                                hasInConnector={rIdx > 0}
                                hasOutConnector={true}
                                boxStyle={boxStyle}
                                cardThemeColor={cardThemeColor}
                                btnStyle={btnStyle}
                                bracketMode={bracketMode}
                                onSwapTeam={onSwapTeam}
                                allTeams={allTeams}
                                isExporting={isExporting}
                                isSwapMode={isSwapMode}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
}
