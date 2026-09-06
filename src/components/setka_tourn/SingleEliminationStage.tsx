import React, { useState } from 'react';
import { Match, Tournament, Team } from './types';
import BracketRenderer from './BracketRenderer';
import MatchCard from './MatchCard';

import { cascadeAdvancements, advanceDoubleElimMatch } from './doubleEliminationLogic';

interface Props {
  tournament: Tournament;
  onUpdate: (updated: Tournament) => void;
  isExporting?: boolean;
  isSwapMode?: boolean;
  onVetoMatch?: (team1: Team, team2: Team, matchInfo?: any) => void;
}

export default function SingleEliminationStage({ tournament, onUpdate, isExporting, isSwapMode, onVetoMatch }: Props) {
  const wRounds = tournament.bracketRounds || [];
  const lRounds = tournament.losersBracketRounds || [];
  const gf = tournament.grandFinal || [];
  
  const isDouble = tournament.settings.eliminationType === 'double';

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

  return (
    <div className="w-full flex flex-col gap-12">
        {wRounds.length > 0 && (
            <div className="flex flex-col mb-12">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                    <h3 className="text-xl font-black text-[#ff8f00] uppercase tracking-widest flex items-center gap-2">
                        🏆 {isDouble ? "Верхняя сетка (Winners) & Гранд-Финал" : "Сетка Плей-офф"}
                    </h3>
                </div>

                <div className="flex gap-0 overflow-x-auto overflow-y-auto items-stretch w-full bg-black/20 p-6 rounded-2xl border border-white/5" style={{ minHeight: '400px' }}>
                    {/* Render Winners Bracket Rounds */}
                    {wRounds.map((round, rIdx) => (
                        <div key={`w-${rIdx}`} className="flex flex-col w-[320px] shrink-0">
                            <div className="h-10 flex items-center justify-center font-black text-white/40 uppercase tracking-widest text-sm mb-4">
                                {getRoundLabel(rIdx, wRounds.length)}
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
                                        boxStyle={tournament.settings.boxStyle as any}
                                        cardThemeColor={tournament.settings.cardThemeColor}
                                        btnStyle={tournament.settings.btnStyle}
                                        bracketMode={tournament.settings.bracketMode}
                                        onSwapTeam={handleSwapTeam}
                                        allTeams={tournament.teams}
                                        isExporting={isExporting}
                                        isSwapMode={isSwapMode}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}

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
                            </div>
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
    </div>
  );
}

