import React, { useMemo, useState, useEffect } from 'react';
import { Tournament, Match, Team } from './types';
import TeamLogo from '../TeamLogo';
import { advanceTieredPlayoffMatch, getGslGroupStandings } from './gslLogic';
import { Trophy, ArrowLeftRight, ArrowUpDown } from 'lucide-react';
import { getBoxStyle } from './boxStyles';

interface Props {
  tournament: Tournament;
  onUpdate: (updated: Tournament) => void;
  onVetoMatch?: (team1: Team, team2: Team, matchInfo?: any) => void;
  isExporting?: boolean;
  isSwapMode?: boolean;
}

export default function TieredPlayoffStage({ tournament, onUpdate, onVetoMatch, isExporting, isSwapMode }: Props) {
  const rounds = tournament.tieredBracketRounds || [];
  const settings = tournament.settings;
  const boxCls = getBoxStyle(settings.boxStyle || 'dark', settings.cardThemeColor, settings.btnStyle);
  const accentColor = settings.cardThemeColor || '#ff8f00';

  const [selectedSwapSlot, setSelectedSwapSlot] = useState<{ rIdx: number; mIdx: number; teamNum: 1 | 2 } | null>(null);

  useEffect(() => {
    if (!isSwapMode) setSelectedSwapSlot(null);
  }, [isSwapMode]);

  // Extract all eligible and tournament teams for swapping
  const eligiblePlayoffTeams = useMemo(() => {
    const map = new Map<string, Team>();

    // 1. Teams from entire tournament roster
    if (tournament.teams && tournament.teams.length > 0) {
      tournament.teams.forEach(t => {
        if (t && t.id && t.id !== 'BYE') map.set(t.id, t);
      });
    }

    // 2. Teams advancing from GSL Group stage (1st, 2nd, 3rd, 4th place)
    if (tournament.gslGroups && tournament.gslGroups.length > 0) {
      tournament.gslGroups.forEach(g => {
        const st = getGslGroupStandings(g);
        if (st.first && st.first.id !== 'BYE') map.set(st.first.id, st.first);
        if (st.second && st.second.id !== 'BYE') map.set(st.second.id, st.second);
        if (st.third && st.third.id !== 'BYE') map.set(st.third.id, st.third);
        if (st.fourth && st.fourth.id !== 'BYE') map.set(st.fourth.id, st.fourth);
      });
    }

    // 3. Teams present in any match across all tiered playoff rounds
    (tournament.tieredBracketRounds || []).forEach(round => {
      round.forEach(m => {
        if (m.team1 && m.team1.id !== 'BYE') map.set(m.team1.id, m.team1);
        if (m.team2 && m.team2.id !== 'BYE') map.set(m.team2.id, m.team2);
      });
    });

    return Array.from(map.values());
  }, [tournament.teams, tournament.gslGroups, tournament.tieredBracketRounds]);

  const handleSwapTeam = (rIdx: number, mIdx: number, teamNum: 1 | 2, teamId: string) => {
    let team = eligiblePlayoffTeams.find(t => t.id === teamId) || null;
    if (teamId === 'BYE') team = { id: 'BYE', name: 'BYE' };
    if (!teamId) team = null;

    const newRounds = JSON.parse(JSON.stringify(rounds)) as Match[][];
    const match = newRounds[rIdx]?.[mIdx];
    if (!match) return;

    if (teamNum === 1) match.team1 = team;
    else match.team2 = team;

    // Reset scores & winner if team changed
    match.winnerId = null;
    match.score1 = 0;
    match.score2 = 0;

    onUpdate({ ...tournament, tieredBracketRounds: newRounds });
  };

  const handleSlotClickForSwap = (rIdx: number, mIdx: number, teamNum: 1 | 2) => {
    if (!isSwapMode || isExporting) return;

    if (!selectedSwapSlot) {
      setSelectedSwapSlot({ rIdx, mIdx, teamNum });
      return;
    }

    if (selectedSwapSlot.rIdx === rIdx && selectedSwapSlot.mIdx === mIdx && selectedSwapSlot.teamNum === teamNum) {
      setSelectedSwapSlot(null);
      return;
    }

    // Perform swap between selectedSwapSlot and clicked slot
    const newRounds = JSON.parse(JSON.stringify(rounds)) as Match[][];
    const srcMatch = newRounds[selectedSwapSlot.rIdx]?.[selectedSwapSlot.mIdx];
    const dstMatch = newRounds[rIdx]?.[mIdx];

    if (srcMatch && dstMatch) {
      const srcTeam = selectedSwapSlot.teamNum === 1 ? srcMatch.team1 : srcMatch.team2;
      const dstTeam = teamNum === 1 ? dstMatch.team1 : dstMatch.team2;

      if (selectedSwapSlot.teamNum === 1) srcMatch.team1 = dstTeam;
      else srcMatch.team2 = dstTeam;

      if (teamNum === 1) dstMatch.team1 = srcTeam;
      else dstMatch.team2 = srcTeam;

      srcMatch.winnerId = null;
      srcMatch.score1 = 0;
      srcMatch.score2 = 0;

      dstMatch.winnerId = null;
      dstMatch.score1 = 0;
      dstMatch.score2 = 0;

      onUpdate({ ...tournament, tieredBracketRounds: newRounds });
    }

    setSelectedSwapSlot(null);
  };

  const handleSwapInsideMatch = (rIdx: number, mIdx: number) => {
    const newRounds = JSON.parse(JSON.stringify(rounds)) as Match[][];
    const match = newRounds[rIdx]?.[mIdx];
    if (!match) return;

    const temp = match.team1;
    match.team1 = match.team2;
    match.team2 = temp;

    const tempScore = match.score1;
    match.score1 = match.score2;
    match.score2 = tempScore;

    match.winnerId = null;

    onUpdate({ ...tournament, tieredBracketRounds: newRounds });
  };

  const handleUpdateScore = (rIdx: number, mIdx: number, teamNum: 1 | 2, score: number) => {
    const newRounds = JSON.parse(JSON.stringify(rounds)) as Match[][];
    const match = newRounds[rIdx]?.[mIdx];
    if (!match) return;

    if (teamNum === 1) match.score1 = score;
    else match.score2 = score;

    onUpdate({ ...tournament, tieredBracketRounds: newRounds });
  };

  const handleAdvanceWinner = (rIdx: number, mIdx: number) => {
    const match = rounds[rIdx]?.[mIdx];
    if (!match || !match.team1 || !match.team2) return;

    const newRounds = advanceTieredPlayoffMatch(rounds, rIdx, mIdx, match.score1, match.score2);
    onUpdate({ ...tournament, tieredBracketRounds: newRounds });
  };

  const getRoundName = (rIdx: number, totalRounds: number) => {
    if (totalRounds === 3) {
      if (rIdx === 0) return 'Quarter-finals (1/4 финала)';
      if (rIdx === 1) return 'Semi-finals (1/2 финала)';
      return 'Grand Final (Гранд-финал)';
    } else if (totalRounds === 4) {
      const isTop3FourGroups = rounds[0]?.length === 4;
      if (isTop3FourGroups) {
        if (rIdx === 0) return 'Round of 12 (1/8 финала)';
        if (rIdx === 1) return 'Quarter-finals (1/4 финала)';
        if (rIdx === 2) return 'Semi-finals (1/2 финала)';
        return 'Grand Final (Гранд-финал)';
      } else {
        if (rIdx === 0) return 'Playoffs round 1';
        if (rIdx === 1) return 'Quarter-finals';
        if (rIdx === 2) return 'Semi-finals';
        return 'Grand Final';
      }
    } else if (totalRounds === 5) {
      if (rIdx === 0) return 'Playoffs round 1';
      if (rIdx === 1) return 'Playoffs round 2';
      if (rIdx === 2) return 'Quarter-finals';
      if (rIdx === 3) return 'Semi-finals';
      return 'Grand Final';
    }
    const rem = totalRounds - rIdx;
    if (rem === 1) return 'Grand Final';
    if (rem === 2) return 'Semi-finals';
    if (rem === 3) return 'Quarter-finals';
    return `Playoffs round ${rIdx + 1}`;
  };

  if (rounds.length === 0) {
    return (
      <div className="bg-[#12121a] p-12 rounded-2xl border border-white/10 text-center text-white/50">
        Сетка плей-офф еще не сформирована. Завершите групповой этап для генерации сетки.
      </div>
    );
  }

  const advanceCount = tournament.settings.gslAdvanceCount || 3;

  return (
    <div className="flex flex-col mb-12">
      {/* Title & Info */}
      <div className="flex items-center justify-between mb-4 bg-black/40 p-4 rounded-xl border border-white/10 flex-wrap gap-3">
        <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-wider">
          <Trophy className="w-5 h-5 text-[#ff8f00]" />
          {advanceCount === 3
            ? 'Ступенчатый Плей-офф (IEM / BLAST: 1/4 -> 1/2 -> Финал)'
            : 'Ступенчатый Плей-офф (ESL Pro League: R1 -> R2 -> 1/4 -> 1/2 -> Финал)'}
        </h3>
        <span className="text-xs text-[#ff8f00] bg-[#ff8f00]/10 px-3 py-1.5 rounded-lg border border-[#ff8f00]/20 font-bold">
          {advanceCount === 3
            ? '1-е места групп напрямую в Полуфинале (1/2)'
            : 'Сетка с прямым посевом победителей групп'}
        </span>
      </div>

      {/* Swap Mode Helper Banner */}
      {isSwapMode && !isExporting && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-4 text-xs text-amber-300 animate-pulse">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Режим изменения команд активен:</strong> Выберите команду из выпадающего списка или кликните по двум командам в сетке для мгновенного обмена местами.
            </span>
          </div>
          {selectedSwapSlot && (
            <button
              onClick={() => setSelectedSwapSlot(null)}
              className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer shrink-0"
            >
              Отменить выбор
            </button>
          )}
        </div>
      )}

      {/* Bracket Canvas */}
      <div
        className="flex gap-4 overflow-x-auto overflow-y-auto items-stretch w-full bg-black/30 p-8 rounded-2xl border border-white/5"
        style={{ minHeight: '650px' }}
      >
        {rounds.map((round, rIdx) => {
          const totalRounds = rounds.length;
          const isTop3 = (tournament.settings.gslAdvanceCount || 3) === 3;
          
          // Determine which round is pre-seeded for 1st places & 2nd places
          const showGroup1stBadge = 
            (totalRounds === 3 && rIdx === 1) || // Top-3 2 groups: 1st places wait in Semis (rIdx 1)
            (totalRounds === 4 && isTop3 && rIdx === 1) || // Top-3 4 groups: 1st places wait in QF (rIdx 1)
            (totalRounds === 4 && !isTop3 && rIdx === 2) || // Top-4 2 groups: 1st places wait in Semis (rIdx 2)
            (totalRounds === 5 && rIdx === 2); // Top-4 4 groups: 1st places wait in QF (rIdx 2)

          const showGroup2ndBadge = 
            (totalRounds === 4 && !isTop3 && rIdx === 1) || // Top-4 2 groups: 2nd places wait in QF (rIdx 1)
            (totalRounds === 5 && rIdx === 1); // Top-4 4 groups: 2nd places wait in R2 (rIdx 1)

          return (
            <div key={`tiered-r-${rIdx}`} className="flex flex-col w-[320px] shrink-0">
              {/* Round Header */}
              <div className="h-10 flex items-center justify-center font-black text-white/60 uppercase tracking-widest text-xs mb-4 bg-white/5 rounded-xl border border-white/5">
                {getRoundName(rIdx, totalRounds)}
              </div>

              {/* Matches in Round */}
              <div className="flex flex-col justify-around flex-1 gap-6">
                {round.map((match, mIdx) => {
                  const hasWinner = !!match.winnerId;
                  const isTopWinner = match.winnerId === match.team1?.id;
                  const isBottomWinner = match.winnerId === match.team2?.id;

                  // Pre-seeded labels (clean text, no icons or emojis)
                  const hasGroup1stBadge = showGroup1stBadge && match.team1 && !hasWinner;
                  const hasGroup2ndBadge = showGroup2ndBadge && match.team1 && !hasWinner;

                  const isSlot1Selected = selectedSwapSlot?.rIdx === rIdx && selectedSwapSlot?.mIdx === mIdx && selectedSwapSlot?.teamNum === 1;
                  const isSlot2Selected = selectedSwapSlot?.rIdx === rIdx && selectedSwapSlot?.mIdx === mIdx && selectedSwapSlot?.teamNum === 2;

                  return (
                    <div key={match.id} className="relative flex flex-col justify-center px-2 group">
                      <div className={`relative z-10 w-full transition-all ${boxCls.outerCard}`}>
                        {/* Seed badge if pre-seeded into this round */}
                        {hasGroup1stBadge && (
                          <div className="mb-2 inline-flex items-center bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-sm tracking-wider">
                            1-е место группы (Прямой выход)
                          </div>
                        )}
                        {hasGroup2ndBadge && (
                          <div className="mb-2 inline-flex items-center bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-sm tracking-wider">
                            2-е место группы
                          </div>
                        )}

                        <div className="flex flex-col gap-2.5">
                          {/* Team 1 */}
                          <div
                            onClick={() => handleSlotClickForSwap(rIdx, mIdx, 1)}
                            className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                              isSlot1Selected
                                ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/50 text-amber-300 font-black scale-[1.02]'
                                : isTopWinner
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-black'
                                : hasWinner
                                ? 'bg-black/30 border-white/5 text-white/30'
                                : 'bg-black/40 border-white/10 text-white font-bold'
                            } ${isSwapMode && !isExporting ? 'cursor-pointer hover:border-amber-400/60' : ''}`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <TeamLogo teamName={match.team1?.name || ''} sizeClassName="w-6 h-6 shrink-0" />
                              {!isExporting && isSwapMode ? (
                                <select
                                  value={match.team1?.id || ''}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleSwapTeam(rIdx, mIdx, 1, e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="bg-[#12121a] text-white font-bold text-xs p-1 rounded border border-white/20 outline-none cursor-pointer w-full max-w-[160px] truncate"
                                >
                                  <option value="">TBD</option>
                                  <option value="BYE" className="text-emerald-400">BYE</option>
                                  {eligiblePlayoffTeams.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="truncate text-xs">
                                  {match.team1?.name || 'TBD'}
                                </span>
                              )}
                            </div>

                            {match.team1 && match.team2 && !match.winnerId && settings.bracketMode !== 'realtime' && !isSwapMode && (
                              <input
                                type="number"
                                className="w-12 h-7 bg-black/60 text-center text-xs font-black border border-white/10 rounded focus:border-[#ff8f00] outline-none text-white shrink-0 ml-2"
                                placeholder="0"
                                value={match.score1 === 0 ? 0 : (match.score1 || '')}
                                onChange={(e) => handleUpdateScore(rIdx, mIdx, 1, parseInt(e.target.value) || 0)}
                              />
                            )}

                            {hasWinner && !isSwapMode && (
                              <span className="font-mono font-black text-sm px-2">
                                {match.score1}
                              </span>
                            )}
                          </div>

                          {/* Team 2 */}
                          <div
                            onClick={() => handleSlotClickForSwap(rIdx, mIdx, 2)}
                            className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                              isSlot2Selected
                                ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/50 text-amber-300 font-black scale-[1.02]'
                                : isBottomWinner
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-black'
                                : hasWinner
                                ? 'bg-black/30 border-white/5 text-white/30'
                                : 'bg-black/40 border-white/10 text-white font-bold'
                            } ${isSwapMode && !isExporting ? 'cursor-pointer hover:border-amber-400/60' : ''}`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <TeamLogo teamName={match.team2?.name || ''} sizeClassName="w-6 h-6 shrink-0" />
                              {!isExporting && isSwapMode ? (
                                <select
                                  value={match.team2?.id || ''}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleSwapTeam(rIdx, mIdx, 2, e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="bg-[#12121a] text-white font-bold text-xs p-1 rounded border border-white/20 outline-none cursor-pointer w-full max-w-[160px] truncate"
                                >
                                  <option value="">TBD</option>
                                  <option value="BYE" className="text-emerald-400">BYE</option>
                                  {eligiblePlayoffTeams.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="truncate text-xs">
                                  {match.team2?.name || 'TBD'}
                                </span>
                              )}
                            </div>

                            {match.team1 && match.team2 && !match.winnerId && settings.bracketMode !== 'realtime' && !isSwapMode && (
                              <input
                                type="number"
                                className="w-12 h-7 bg-black/60 text-center text-xs font-black border border-white/10 rounded focus:border-[#ff8f00] outline-none text-white shrink-0 ml-2"
                                placeholder="0"
                                value={match.score2 === 0 ? 0 : (match.score2 || '')}
                                onChange={(e) => handleUpdateScore(rIdx, mIdx, 2, parseInt(e.target.value) || 0)}
                              />
                            )}

                            {hasWinner && !isSwapMode && (
                              <span className="font-mono font-black text-sm px-2">
                                {match.score2}
                              </span>
                            )}
                          </div>

                          {/* In Swap Mode: Quick swap button inside match */}
                          {isSwapMode && !isExporting && (
                            <button
                              onClick={() => handleSwapInsideMatch(rIdx, mIdx)}
                              className="w-full py-1 text-[10px] font-bold bg-white/5 hover:bg-white/15 text-white/70 hover:text-white rounded border border-white/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              title="Поменять местами Команду 1 и Команду 2 в этом матче"
                            >
                              <ArrowUpDown className="w-3 h-3 text-amber-400" />
                              Поменять местами в матче
                            </button>
                          )}

                          {/* Action Button: Realtime Veto or Standard Finish Match */}
                          {match.team1 && match.team2 && !match.winnerId && !isExporting && !isSwapMode && (
                            settings.bracketMode === 'realtime' ? (
                              onVetoMatch ? (
                                <button
                                  onClick={() =>
                                    onVetoMatch(match.team1!, match.team2!, {
                                      stage: 'tiered_playoff',
                                      rIdx,
                                      mIdx
                                    })
                                  }
                                  className="w-full mt-1.5 bg-purple-600 hover:bg-purple-500 text-white border border-purple-400 rounded-lg py-2 px-3 text-[11px] font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  🎮 Сыграть Матч (Симуляция)
                                </button>
                              ) : null
                            ) : (
                              <button
                                onClick={() => handleAdvanceWinner(rIdx, mIdx)}
                                className="w-full mt-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer"
                              >
                                Завершить матч
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
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

