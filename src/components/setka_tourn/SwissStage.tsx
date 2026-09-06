import React, { useState, useEffect, useMemo } from 'react';
import { Tournament, Match, Team } from './types';
import { getBoxStyle } from './boxStyles';
import TeamLogo from '../TeamLogo';
import { generateNextSwissRound } from './swissLogic';
import { 
  Trophy, 
  Skull, 
  ArrowRight, 
  Check, 
  CheckCircle2, 
  Undo2, 
  Zap, 
  Shuffle, 
  Flame,
  ChevronRight,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface Props {
  tournament: Tournament;
  onUpdate: (updated: Tournament) => void;
  onAdvanceToBracket: () => void;
  isExporting?: boolean;
  isSwapMode?: boolean;
  onVetoMatch?: (t1: any, t2: any, matchInfo?: any) => void;
}

interface TeamSwissStats {
  team: Team;
  w: number;
  l: number;
  status: 'playing' | 'qualified' | 'eliminated';
  qualifiedAtRound?: number;
  eliminatedAtRound?: number;
}

interface BasketConfig {
  w: number;
  l: number;
  label: string;
  format: 'Bo1' | 'Bo3';
  isQualifying: boolean;
  isEliminating: boolean;
  isDecider: boolean;
  expectedMatches: number;
}

export default function SwissStage({
  tournament,
  onUpdate,
  onAdvanceToBracket,
  isExporting,
  isSwapMode,
  onVetoMatch
}: Props) {
  const swissRounds = tournament.swissRounds || [];
  const winsToAdvance = tournament.settings.swissWinsToAdvance || 3;
  const lossesToEliminate = tournament.settings.swissLossesToEliminate || 3;
  const totalRounds = winsToAdvance + lossesToEliminate - 1; // 5 rounds for 3-3 system
  const isLogosOnly = tournament.settings?.swissLogosOnly ?? false;

  const toggleLogosOnly = () => {
    onUpdate({
      ...tournament,
      settings: {
        ...tournament.settings,
        swissLogosOnly: !isLogosOnly
      }
    });
  };

  // Auto-advance BYE matches on load
  useEffect(() => {
    let changed = false;
    const newRounds = swissRounds.map(round => {
      return round.map(match => {
        if (!match.winnerId && match.team1 && match.team2 && (match.team1.id === 'BYE' || match.team2.id === 'BYE')) {
          changed = true;
          return {
            ...match,
            winnerId: match.team1.id === 'BYE' ? match.team2.id : match.team1.id
          };
        }
        return match;
      });
    });
    if (changed) {
      onUpdate({ ...tournament, swissRounds: newRounds });
    }
  }, [swissRounds, tournament, onUpdate]);

  // Compute team score before a given round index
  const getTeamScoreBeforeRound = (teamId: string, roundIdx: number) => {
    let w = 0;
    let l = 0;
    for (let i = 0; i < roundIdx; i++) {
      const round = swissRounds[i];
      if (!round) continue;
      const match = round.find(m => m.team1?.id === teamId || m.team2?.id === teamId);
      if (match && match.winnerId) {
        if (match.winnerId === teamId) w++;
        else l++;
      }
    }
    return { w, l };
  };

  // Compute full cumulative standings and qualification milestones
  const allTeamStats = useMemo<Map<string, TeamSwissStats>>(() => {
    const stats = new Map<string, TeamSwissStats>();
    tournament.teams.forEach(t => {
      if (t.id !== 'BYE') {
        stats.set(t.id, { team: t, w: 0, l: 0, status: 'playing' });
      }
    });

    swissRounds.forEach((round, rIdx) => {
      round.forEach(m => {
        if (m.winnerId) {
          if (m.team1 && m.team1.id !== 'BYE' && stats.has(m.team1.id)) {
            const st1 = stats.get(m.team1.id)!;
            if (m.winnerId === m.team1.id) {
              st1.w++;
              if (st1.w >= winsToAdvance && st1.status === 'playing') {
                st1.status = 'qualified';
                st1.qualifiedAtRound = rIdx;
              }
            } else {
              st1.l++;
              if (st1.l >= lossesToEliminate && st1.status === 'playing') {
                st1.status = 'eliminated';
                st1.eliminatedAtRound = rIdx;
              }
            }
          }
          if (m.team2 && m.team2.id !== 'BYE' && stats.has(m.team2.id)) {
            const st2 = stats.get(m.team2.id)!;
            if (m.winnerId === m.team2.id) {
              st2.w++;
              if (st2.w >= winsToAdvance && st2.status === 'playing') {
                st2.status = 'qualified';
                st2.qualifiedAtRound = rIdx;
              }
            } else {
              st2.l++;
              if (st2.l >= lossesToEliminate && st2.status === 'playing') {
                st2.status = 'eliminated';
                st2.eliminatedAtRound = rIdx;
              }
            }
          }
        }
      });
    });

    return stats;
  }, [swissRounds, tournament.teams, winsToAdvance, lossesToEliminate]);

  // Teams qualified for the specific round column:
  // - For Round 4 column (rIdx === 3): teams qualified from Round 3 with 3-0 (2 teams)
  // - For Round 5 column (rIdx === 4): teams qualified from Round 4 with 3-1 (3 teams) and Round 5 with 3-2 (3 teams) => 6 teams
  // - For other columns: all teams qualified up to rIdx
  const getAdvancingTeamsForColumn = (rIdx: number) => {
    const list: TeamSwissStats[] = [];
    allTeamStats.forEach(st => {
      if (st.status === 'qualified' && st.qualifiedAtRound !== undefined) {
        if (rIdx === 3) {
          if (st.qualifiedAtRound <= 2) {
            list.push(st);
          }
        } else if (rIdx === 4) {
          if (st.qualifiedAtRound >= 3 && st.qualifiedAtRound <= 4) {
            list.push(st);
          }
        } else if (st.qualifiedAtRound <= rIdx) {
          list.push(st);
        }
      }
    });
    return list.sort((a, b) => (a.qualifiedAtRound ?? 0) - (b.qualifiedAtRound ?? 0) || a.l - b.l);
  };

  // Teams eliminated for the specific round column:
  // - For Round 4 column (rIdx === 3): teams eliminated from Round 3 with 0-3 (2 teams)
  // - For Round 5 column (rIdx === 4): teams eliminated from Round 4 with 1-3 (3 teams) and Round 5 with 2-3 (3 teams) => 6 teams
  // - For other columns: all teams eliminated up to rIdx
  const getEliminatedTeamsForColumn = (rIdx: number) => {
    const list: TeamSwissStats[] = [];
    allTeamStats.forEach(st => {
      if (st.status === 'eliminated' && st.eliminatedAtRound !== undefined) {
        if (rIdx === 3) {
          if (st.eliminatedAtRound <= 2) {
            list.push(st);
          }
        } else if (rIdx === 4) {
          if (st.eliminatedAtRound >= 3 && st.eliminatedAtRound <= 4) {
            list.push(st);
          }
        } else if (st.eliminatedAtRound <= rIdx) {
          list.push(st);
        }
      }
    });
    return list.sort((a, b) => (a.eliminatedAtRound ?? 0) - (b.eliminatedAtRound ?? 0) || b.w - a.w);
  };

  // Check if current active round is completely played
  const isCurrentRoundFinished = () => {
    if (swissRounds.length === 0) return false;
    const currentRound = swissRounds[swissRounds.length - 1];
    return currentRound.every(m => m.winnerId !== null);
  };

  // Check if entire Swiss Stage is finished
  const isStageFullyComplete = useMemo(() => {
    let qualifiedCount = 0;
    allTeamStats.forEach(st => {
      if (st.status === 'qualified') qualifiedCount++;
    });
    const targetAdvancing = Math.floor(tournament.teams.filter(t => t.id !== 'BYE').length / 2);
    return (qualifiedCount >= targetAdvancing && isCurrentRoundFinished()) || swissRounds.length >= totalRounds;
  }, [allTeamStats, tournament.teams, isCurrentRoundFinished, swissRounds.length, totalRounds]);

  // Match score updater
  const updateMatchScore = (rIdx: number, mIdx: number, teamNum: 1 | 2, score: number) => {
    const newRounds = [...swissRounds];
    newRounds[rIdx] = [...newRounds[rIdx]];
    const match = { ...newRounds[rIdx][mIdx] };
    if (teamNum === 1) match.score1 = score;
    else match.score2 = score;
    newRounds[rIdx][mIdx] = match;
    onUpdate({ ...tournament, swissRounds: newRounds });
  };

  // Quick winner setter (click team)
  const setQuickWinner = (rIdx: number, mIdx: number, winnerTeam: Team) => {
    const newRounds = [...swissRounds];
    newRounds[rIdx] = [...newRounds[rIdx]];
    const match = { ...newRounds[rIdx][mIdx] };
    if (!match.team1 || !match.team2) return;

    if (match.winnerId === winnerTeam.id) {
      match.winnerId = null;
      match.score1 = 0;
      match.score2 = 0;
    } else {
      match.winnerId = winnerTeam.id;
      if (winnerTeam.id === match.team1.id) {
        match.score1 = Math.max(match.score1, 1);
        if (match.score2 >= match.score1) match.score2 = 0;
      } else {
        match.score2 = Math.max(match.score2, 1);
        if (match.score1 >= match.score2) match.score1 = 0;
      }
    }
    newRounds[rIdx][mIdx] = match;
    onUpdate({ ...tournament, swissRounds: newRounds });
  };

  const advanceWinner = (rIdx: number, mIdx: number) => {
    const newRounds = [...swissRounds];
    newRounds[rIdx] = [...newRounds[rIdx]];
    const match = { ...newRounds[rIdx][mIdx] };

    if (match.score1 > match.score2) match.winnerId = match.team1?.id || null;
    else if (match.score2 > match.score1) match.winnerId = match.team2?.id || null;

    newRounds[rIdx][mIdx] = match;
    onUpdate({ ...tournament, swissRounds: newRounds });
  };

  const undoMatchWinner = (rIdx: number, mIdx: number) => {
    const newRounds = [...swissRounds];
    newRounds[rIdx] = [...newRounds[rIdx]];
    const match = { ...newRounds[rIdx][mIdx] };
    match.winnerId = null;
    newRounds[rIdx][mIdx] = match;
    onUpdate({ ...tournament, swissRounds: newRounds });
  };

  const swapTeamsInSwissRound = (
    rIdx: number,
    targetMatchIdx: number,
    targetPos: 1 | 2,
    selectedTeamId: string
  ) => {
    const currentRound = swissRounds[rIdx];
    if (!currentRound) return;

    const targetMatch = currentRound[targetMatchIdx];
    if (!targetMatch) return;

    const currentTeam = targetPos === 1 ? targetMatch.team1 : targetMatch.team2;
    if (currentTeam?.id === selectedTeamId) return;

    let sourceMatchIdx = -1;
    let sourcePos: 1 | 2 = 1;

    for (let mIdx = 0; mIdx < currentRound.length; mIdx++) {
      const m = currentRound[mIdx];
      if (m.team1?.id === selectedTeamId) {
        sourceMatchIdx = mIdx;
        sourcePos = 1;
        break;
      }
      if (m.team2?.id === selectedTeamId) {
        sourceMatchIdx = mIdx;
        sourcePos = 2;
        break;
      }
    }

    if (sourceMatchIdx === -1) return;

    const newRounds = [...swissRounds];
    newRounds[rIdx] = [...newRounds[rIdx]];

    const m1 = { ...newRounds[rIdx][targetMatchIdx] };
    const m2 = { ...newRounds[rIdx][sourceMatchIdx] };

    const sourceTeam = sourcePos === 1 ? m2.team1 : m2.team2;

    if (targetMatchIdx === sourceMatchIdx) {
      const temp = m1.team1;
      m1.team1 = m1.team2;
      m1.team2 = temp;
      newRounds[rIdx][targetMatchIdx] = m1;
    } else {
      if (targetPos === 1) m1.team1 = sourceTeam;
      else m1.team2 = sourceTeam;

      if (sourcePos === 1) m2.team1 = currentTeam;
      else m2.team2 = currentTeam;

      m1.winnerId = null;
      m2.winnerId = null;

      newRounds[rIdx][targetMatchIdx] = m1;
      newRounds[rIdx][sourceMatchIdx] = m2;
    }

    onUpdate({ ...tournament, swissRounds: newRounds });
  };

  const shuffleBasketMatches = (rIdx: number, basketMatches: { match: Match; originalIndex: number }[]) => {
    if (basketMatches.length < 2) return;

    const teams: (Team | undefined)[] = [];
    basketMatches.forEach(({ match }) => {
      teams.push(match.team1);
      teams.push(match.team2);
    });

    for (let i = teams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [teams[i], teams[j]] = [teams[j], teams[i]];
    }

    const newRounds = [...swissRounds];
    newRounds[rIdx] = [...newRounds[rIdx]];

    let pointer = 0;
    basketMatches.forEach(({ originalIndex }) => {
      const m = { ...newRounds[rIdx][originalIndex] };
      m.team1 = teams[pointer++];
      m.team2 = teams[pointer++];
      m.winnerId = null;
      newRounds[rIdx][originalIndex] = m;
    });

    onUpdate({ ...tournament, swissRounds: newRounds });
  };

  const handleUndoLastRound = () => {
    if (swissRounds.length <= 1) return;
    if (!window.confirm('Вы уверены, что хотите отменить последний раунд?')) return;
    const newRounds = swissRounds.slice(0, swissRounds.length - 1);
    onUpdate({ ...tournament, swissRounds: newRounds });
  };

  const handleGenerateNextRound = () => {
    const nextRound = generateNextSwissRound(tournament.teams, swissRounds, winsToAdvance, lossesToEliminate);
    if (nextRound && nextRound.length > 0) {
      onUpdate({ ...tournament, swissRounds: [...swissRounds, nextRound] });
    }
  };

  const activeTeamsCount = tournament.teams.filter(t => t.id !== 'BYE').length;
  const targetAdvancingCount = Math.floor(activeTeamsCount / 2);

  // Generate structure config for each round column (0 to totalRounds - 1)
  const roundConfigs = useMemo(() => {
    const configs: {
      rIdx: number;
      roundNumber: number;
      baskets: BasketConfig[];
      advancingSlotsTotal: number;
      eliminatedSlotsTotal: number;
    }[] = [];

    for (let rIdx = 0; rIdx < totalRounds; rIdx++) {
      const roundNumber = rIdx + 1;
      const baskets: BasketConfig[] = [];

      for (let w = rIdx; w >= 0; w--) {
        const l = rIdx - w;
        if (w < winsToAdvance && l < lossesToEliminate) {
          const isQualifying = w === winsToAdvance - 1;
          const isEliminating = l === lossesToEliminate - 1;
          const isDecider = isQualifying && isEliminating;
          const format: 'Bo1' | 'Bo3' = isQualifying || isEliminating ? 'Bo3' : 'Bo1';

          let expectedMatches = 4;
          if (rIdx === 0) expectedMatches = 8;
          else if (rIdx === 1) expectedMatches = 4;
          else if (rIdx === 2) expectedMatches = w === 1 ? 4 : 2;
          else if (rIdx === 3) expectedMatches = 3;
          else if (rIdx === 4) expectedMatches = 3;

          baskets.push({
            w,
            l,
            label: `${w}-${l}`,
            format,
            isQualifying,
            isEliminating,
            isDecider,
            expectedMatches
          });
        }
      }

      let advancingSlotsTotal = 0;
      let eliminatedSlotsTotal = 0;

      // In Round 3 (rIdx === 2): NO top Advancing box, NO bottom Eliminated box.
      // (Teams qualify/eliminate FROM round 3 into round 4, where the 2 slots appear).
      if (rIdx === 2) {
        advancingSlotsTotal = 0;
        eliminatedSlotsTotal = 0;
      } else if (rIdx === 3) {
        // Round 4: 2 advancing slots (from 2-0 matches in R3) and 2 eliminated slots (from 0-2 matches in R3)
        advancingSlotsTotal = 2;
        eliminatedSlotsTotal = 2;
      } else if (rIdx === 4) {
        // Round 5: 6 advancing slots (2 from R3 + 3 from R4 + 1/deciders -> 6 slots total) and 6 eliminated slots
        advancingSlotsTotal = 6;
        eliminatedSlotsTotal = 6;
      }

      configs.push({
        rIdx,
        roundNumber,
        baskets,
        advancingSlotsTotal,
        eliminatedSlotsTotal
      });
    }

    return configs;
  }, [totalRounds, winsToAdvance, lossesToEliminate, targetAdvancingCount]);

  // Render straight orthogonal bracket transition lines between columns (like playoff bracket)
  const renderColumnConnectors = (colIdx: number) => {
    // Clean orthogonal right-angled lines:
    // Start horizontal -> vertical step -> horizontal end to target
    // Col 0 -> Col 1: (0-0 at 400) -> Green to (1-0 at 250), Red to (0-1 at 550)
    // Col 1 -> Col 2:
    //   - (1-0 at 250) -> Green to 2-0 (at 210), Red to 1-1 (at 385)
    //   - (0-1 at 550) -> Green to 1-1 (at 415), Red to 0-2 (at 590)
    // Col 2 -> Col 3:
    //   - (2-0 at 210) -> Green to Advancing 2 slots (at 60), Red to 2-1 (at 290)
    //   - (1-1 at 400) -> Green to 2-1 (at 315), Red to 1-2 (at 485)
    //   - (0-2 at 590) -> Green to 1-2 (at 510), Red to Eliminated 2 slots (at 740)
    // Col 3 -> Col 4:
    //   - Advancing pass-through Green (at 60)
    //   - (2-1 at 300) -> Green to Advancing 6 slots (at 100), Red to 2-2 (at 385)
    //   - (1-2 at 500) -> Green to 2-2 (at 415), Red to Eliminated 6 slots (at 700)
    //   - Eliminated pass-through Red (at 740)

    const greenColor = '#10b981';
    const redColor = '#f43f5e';

    return (
      <div className="flex flex-col items-center justify-center self-stretch w-10 sm:w-12 shrink-0 relative py-2 select-none">
        <svg className="w-full h-full" viewBox="0 0 48 800" preserveAspectRatio="none" fill="none">
          <defs>
            <filter id={`glowGreen-${colIdx}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#10b981" floodOpacity={isExporting ? "0" : "0.6"} />
            </filter>
            <filter id={`glowRed-${colIdx}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#f43f5e" floodOpacity={isExporting ? "0" : "0.6"} />
            </filter>
          </defs>

          {colIdx === 0 && (
            // Round 1 (center 400) -> Round 2 (1-0 at 250, 0-1 at 550)
            <g>
              {/* Green orthogonal line to 1-0 */}
              <path
                d="M 0 400 L 24 400 L 24 250 L 46 250"
                stroke={greenColor}
                strokeWidth="2.5"
                filter={isExporting ? undefined : `url(#glowGreen-${colIdx})`}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon points="46,250 40,246 40,254" fill={greenColor} />

              {/* Red orthogonal line to 0-1 */}
              <path
                d="M 0 400 L 24 400 L 24 550 L 46 550"
                stroke={redColor}
                strokeWidth="2.5"
                filter={isExporting ? undefined : `url(#glowRed-${colIdx})`}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon points="46,550 40,546 40,554" fill={redColor} />
            </g>
          )}

          {colIdx === 1 && (
            // Round 2 -> Round 3
            // 1-0 (250) -> Green to 2-0 (210), Red to 1-1 (385)
            // 0-1 (550) -> Green to 1-1 (415), Red to 0-2 (590)
            <g>
              {/* From 1-0 (250) -> 2-0 (210) Green */}
              <path
                d="M 0 250 L 20 250 L 20 210 L 46 210"
                stroke={greenColor}
                strokeWidth="2.5"
                filter={isExporting ? undefined : `url(#glowGreen-${colIdx})`}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon points="46,210 40,206 40,214" fill={greenColor} />

              {/* From 1-0 (250) -> 1-1 (385) Red */}
              <path
                d="M 0 250 L 28 250 L 28 385 L 46 385"
                stroke={redColor}
                strokeWidth="2.5"
                filter={isExporting ? undefined : `url(#glowRed-${colIdx})`}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon points="46,385 40,381 40,389" fill={redColor} />

              {/* From 0-1 (550) -> 1-1 (415) Green */}
              <path
                d="M 0 550 L 28 550 L 28 415 L 46 415"
                stroke={greenColor}
                strokeWidth="2.5"
                filter={isExporting ? undefined : `url(#glowGreen-${colIdx})`}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon points="46,415 40,411 40,419" fill={greenColor} />

              {/* From 0-1 (550) -> 0-2 (590) Red */}
              <path
                d="M 0 550 L 20 550 L 20 590 L 46 590"
                stroke={redColor}
                strokeWidth="2.5"
                filter={isExporting ? undefined : `url(#glowRed-${colIdx})`}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon points="46,590 40,586 40,594" fill={redColor} />
            </g>
          )}

          {colIdx === 2 && (
            // Round 3 -> Round 4
            // 2-0 (210) -> Green to Advancing (135), Red to 2-1 (290)
            // 1-1 (400) -> Green to 2-1 (315), Red to 1-2 (485)
            // 0-2 (590) -> Green to 1-2 (510), Red to Eliminated (665)
            <g>
              {/* From 2-0 (210) -> Advancing in R4 (135) Green */}
              <path
                d="M 0 210 L 22 210 L 22 135 L 46 135"
                stroke={greenColor}
                strokeWidth="2.5"
                filter={isExporting ? undefined : `url(#glowGreen-${colIdx})`}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon points="46,135 40,131 40,139" fill={greenColor} />

              {/* From 2-0 (210) -> 2-1 (290) Red */}
              <path
                d="M 0 210 L 16 210 L 16 290 L 46 290"
                stroke={redColor}
                strokeWidth="2.5"
                filter={isExporting ? undefined : `url(#glowRed-${colIdx})`}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon points="46,290 40,286 40,294" fill={redColor} />

              {/* From 1-1 (400) -> 2-1 (315) Green */}
              <path
                d="M 0 400 L 26 400 L 26 315 L 46 315"
                stroke={greenColor}
                strokeWidth="2.5"
                filter={isExporting ? undefined : `url(#glowGreen-${colIdx})`}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon points="46,315 40,311 40,319" fill={greenColor} />

              {/* From 1-1 (400) -> 1-2 (485) Red */}
              <path
                d="M 0 400 L 26 400 L 26 485 L 46 485"
                stroke={redColor}
                strokeWidth="2.5"
                filter={isExporting ? undefined : `url(#glowRed-${colIdx})`}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon points="46,485 40,481 40,489" fill={redColor} />

              {/* From 0-2 (590) -> 1-2 (510) Green */}
              <path
                d="M 0 590 L 16 590 L 16 510 L 46 510"
                stroke={greenColor}
                strokeWidth="2.5"
                filter={isExporting ? undefined : `url(#glowGreen-${colIdx})`}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon points="46,510 40,506 40,514" fill={greenColor} />

              {/* From 0-2 (590) -> Eliminated in R4 (665) Red */}
              <path
                d="M 0 590 L 22 590 L 22 665 L 46 665"
                stroke={redColor}
                strokeWidth="2.5"
                filter={isExporting ? undefined : `url(#glowRed-${colIdx})`}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon points="46,665 40,661 40,669" fill={redColor} />
            </g>
          )}

          {colIdx === 3 && (
            // Round 4 -> Round 5
            // Advancing (135) pass-through
            // 2-1 (300) -> Green to Advancing (145), Red to 2-2 (385)
            // 1-2 (500) -> Green to 2-2 (415), Red to Eliminated (655)
            // Eliminated (665) pass-through
            <g>
              {/* Advancing pass-through Green */}
              <path
                d="M 0 135 L 46 135"
                stroke={greenColor}
                strokeWidth="2"
                strokeDasharray="4 3"
                filter={isExporting ? undefined : `url(#glowGreen-${colIdx})`}
              />

              {/* From 2-1 (300) -> Advancing in R5 (145) Green */}
              <path
                d="M 0 300 L 24 300 L 24 145 L 46 145"
                stroke={greenColor}
                strokeWidth="2.5"
                filter={isExporting ? undefined : `url(#glowGreen-${colIdx})`}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon points="46,145 40,141 40,149" fill={greenColor} />

              {/* From 2-1 (300) -> 2-2 (385) Red */}
              <path
                d="M 0 300 L 20 300 L 20 385 L 46 385"
                stroke={redColor}
                strokeWidth="2.5"
                filter={isExporting ? undefined : `url(#glowRed-${colIdx})`}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon points="46,385 40,381 40,389" fill={redColor} />

              {/* From 1-2 (500) -> 2-2 (415) Green */}
              <path
                d="M 0 500 L 20 500 L 20 415 L 46 415"
                stroke={greenColor}
                strokeWidth="2.5"
                filter={isExporting ? undefined : `url(#glowGreen-${colIdx})`}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon points="46,415 40,411 40,419" fill={greenColor} />

              {/* From 1-2 (500) -> Eliminated in R5 (655) Red */}
              <path
                d="M 0 500 L 24 500 L 24 655 L 46 655"
                stroke={redColor}
                strokeWidth="2.5"
                filter={isExporting ? undefined : `url(#glowRed-${colIdx})`}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon points="46,655 40,651 40,659" fill={redColor} />

              {/* Eliminated pass-through Red */}
              <path
                d="M 0 665 L 46 665"
                stroke={redColor}
                strokeWidth="2"
                strokeDasharray="4 3"
                filter={isExporting ? undefined : `url(#glowRed-${colIdx})`}
              />
            </g>
          )}
        </svg>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-6 text-white select-none">
      {/* Top Title Bar (As in SAWW.jpg: Closed Qualification / SWISS STAGE) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/40 backdrop-blur-md px-6 py-5 rounded-2xl border border-white/10 shadow-2xl">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight font-sans">
              {tournament.name || 'Tournament'}
            </h2>
            <span className="bg-[#ff8f00]/20 text-[#ff8f00] text-[11px] font-black px-2.5 py-0.5 rounded-full border border-[#ff8f00]/30 tracking-wider">
              {winsToAdvance} ПОБЕДЫ ДЛЯ ВЫХОДА
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-black uppercase tracking-[0.25em] text-white/50">
              SWISS STAGE
            </span>
            <div className="h-0.5 w-6 bg-[#ff8f00] rounded-full" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Logos Only vs Full Team Names Display Toggle */}
          {!isExporting && (
            <button
              type="button"
              onClick={toggleLogosOnly}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border ${
                isLogosOnly
                  ? 'bg-[#ff8f00]/20 border-[#ff8f00] text-[#ff8f00] shadow-[0_0_12px_rgba(255,143,0,0.3)]'
                  : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10 hover:text-white'
              }`}
              title="Переключить отображение: только логотипы (киберспортивный компактный вид) или с названиями"
            >
              <span>{isLogosOnly ? '⚡ Только логотипы' : '📝 С названиями'}</span>
            </button>
          )}

          {swissRounds.length > 1 && !isExporting && (
            <button
              onClick={handleUndoLastRound}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Отменить последний сгенерированный раунд"
            >
              <Undo2 className="w-3.5 h-3.5" /> Отмена раунда
            </button>
          )}

          {!isExporting && swissRounds.length < totalRounds && (
            <button
              onClick={handleGenerateNextRound}
              disabled={!isCurrentRoundFinished()}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                isCurrentRoundFinished()
                  ? 'bg-gradient-to-r from-[#ff8f00] to-amber-500 hover:from-[#ffa733] hover:to-amber-400 text-black shadow-[0_0_20px_rgba(255,143,0,0.4)] scale-105'
                  : 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Следующий раунд ({swissRounds.length + 1})</span>
            </button>
          )}

          {!isExporting && (
            <button
              onClick={onAdvanceToBracket}
              disabled={!isStageFullyComplete}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                isStageFullyComplete
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black shadow-[0_0_25px_rgba(16,185,129,0.4)] scale-105 animate-pulse'
                  : 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>🏆 Перейти к Плей-офф</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Swiss Board Columns (Exact layout and vertical alignment of SAWW.jpg) */}
      <div className="w-full overflow-x-auto pb-8 pt-2 px-2 scrollbar-thin scrollbar-thumb-white/10">
        <div className="flex items-stretch min-w-max mx-auto justify-center min-h-[820px]">
          {roundConfigs.map((colConfig, colIdx) => {
            const { rIdx, roundNumber, baskets, advancingSlotsTotal, eliminatedSlotsTotal } = colConfig;
            const roundData = swissRounds[rIdx];
            const isRoundActiveOrPast = !!roundData;

            // Advancing/eliminated teams specific to this round column
            const advancingTeams = getAdvancingTeamsForColumn(rIdx);
            const eliminatedTeams = getEliminatedTeamsForColumn(rIdx);

            return (
              <React.Fragment key={`round-col-${rIdx}`}>
                {/* Round Column (Full height matching SAWW.jpg) */}
                <div
                  className={`flex flex-col ${
                    isLogosOnly
                      ? 'w-[190px] sm:w-[210px]'
                      : rIdx === 4
                      ? 'w-[290px] sm:w-[330px]'
                      : 'w-[260px] sm:w-[290px]'
                  } shrink-0 justify-between py-1 transition-all duration-300`}
                >
                  
                  {/* TOP SECTION: ADVANCING BOX (Rounds 3, 4, 5) */}
                  <div className={rIdx >= 3 ? (rIdx === 3 ? "mt-12" : "mt-6") : ""}>
                    {advancingSlotsTotal > 0 ? (
                      <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-emerald-950/25 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.08)] mb-2">
                        {/* Advancing Header */}
                        <div className="flex items-center justify-between px-2 py-1 bg-emerald-500/20 rounded-lg border border-emerald-500/35 text-emerald-300 font-black text-[10px] uppercase tracking-widest">
                          <span className="flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400 stroke-[3]" /> ADVANCING
                          </span>
                          <span className="text-[9px] opacity-85 font-mono font-bold">
                            {advancingTeams.length} / {advancingSlotsTotal}
                          </span>
                        </div>

                        {/* Advancing Slots */}
                        <div className={advancingSlotsTotal > 2 ? "grid grid-cols-2 gap-1.5" : "flex flex-col gap-1"}>
                          {Array.from({ length: advancingSlotsTotal }).map((_, slotIdx) => {
                            const qualTeam = advancingTeams[slotIdx];
                            if (qualTeam) {
                              return (
                                <div
                                  key={`adv-${slotIdx}-${qualTeam.team.id}`}
                                  className={`h-8 px-2 bg-[#0b1712]/90 border border-emerald-500/40 rounded-lg flex items-center ${isLogosOnly ? 'justify-center gap-2' : 'justify-between gap-1.5'} shadow-sm transition-all hover:border-emerald-400`}
                                  title={qualTeam.team.name}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                                    <TeamLogo teamName={qualTeam.team.name} logoUrl={qualTeam.team.logoUrl} sizeClassName={isLogosOnly ? "w-5 h-5 shrink-0" : "w-4 h-4 shrink-0"} />
                                    {!isLogosOnly && (
                                      <span className="text-[11px] font-black text-white truncate min-w-0 flex-1">
                                        {qualTeam.team.name}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[8.5px] font-mono font-black text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-1 py-0.5 rounded shrink-0">
                                    {qualTeam.w}-{qualTeam.l}
                                  </span>
                                </div>
                              );
                            }
                            return (
                              <div
                                key={`adv-empty-${slotIdx}`}
                                className="h-8 rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/[0.08] flex items-center justify-center text-emerald-400/50 text-[10px] font-black tracking-wider shadow-sm"
                              >
                                SLOT
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      // Empty space placeholder for perfect vertical alignment
                      <div className="h-0" />
                    )}
                  </div>

                  {/* MIDDLE SECTION: BASKETS / MATCHES */}
                  <div className="flex flex-col gap-3 my-auto">
                    {baskets.map((basket) => {
                      const basketKey = `${basket.w}-${basket.l}`;

                      // Extract matches in this basket if round is active
                      let basketMatches: { match: Match; originalIndex: number }[] = [];
                      if (roundData) {
                        roundData.forEach((m, mIdx) => {
                          const t1Score = m.team1 ? getTeamScoreBeforeRound(m.team1.id, rIdx) : { w: 0, l: 0 };
                          const t2Score = m.team2 ? getTeamScoreBeforeRound(m.team2.id, rIdx) : { w: 0, l: 0 };

                          if (
                            (t1Score.w === basket.w && t1Score.l === basket.l) ||
                            (t2Score.w === basket.w && t2Score.l === basket.l) ||
                            (rIdx === 0 && basket.w === 0 && basket.l === 0)
                          ) {
                            basketMatches.push({ match: m, originalIndex: mIdx });
                          }
                        });
                      }

                      // If round is not yet generated, create visual placeholders
                      const matchesToRender = isRoundActiveOrPast && basketMatches.length > 0
                        ? basketMatches
                        : Array.from({ length: basket.expectedMatches }).map((_, placeholderIdx) => ({
                            match: {
                              id: `placeholder-r${rIdx}-${basketKey}-${placeholderIdx}`,
                              score1: 0,
                              score2: 0,
                              winnerId: null
                            } as Match,
                            originalIndex: -1
                          }));

                      const isQual = basket.isQualifying;
                      const isElim = basket.isEliminating;
                      const isDec = basket.isDecider;

                      let headerPillBorder = 'border-amber-500/40';
                      let headerPillBg = 'bg-amber-500/15 text-amber-300';
                      if (isDec) {
                        headerPillBorder = 'border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]';
                        headerPillBg = 'bg-amber-500/25 text-amber-300';
                      } else if (isQual) {
                        headerPillBorder = 'border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.2)]';
                        headerPillBg = 'bg-emerald-500/25 text-emerald-300';
                      } else if (isElim) {
                        headerPillBorder = 'border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.2)]';
                        headerPillBg = 'bg-rose-500/25 text-rose-300';
                      }

                      const hasUnfinished = basketMatches.some(({ match }) => !match.winnerId);

                      return (
                        <div
                          key={`basket-${rIdx}-${basketKey}`}
                          className="flex flex-col gap-1.5 p-2 rounded-xl bg-black/60 border border-white/15 shadow-xl"
                        >
                          {/* Basket Header Pill (РАУНД X / 0-0) */}
                          <div
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-wider ${headerPillBorder} ${headerPillBg}`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span>РАУНД {roundNumber}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {isRoundActiveOrPast && !isExporting && hasUnfinished && basketMatches.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => shuffleBasketMatches(rIdx, basketMatches)}
                                  className="text-[9px] font-bold text-white/60 hover:text-white bg-black/40 hover:bg-black/80 px-1.5 py-0.5 rounded border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
                                  title="Перемешать пары в этой корзине"
                                >
                                  <Shuffle className="w-2.5 h-2.5" />
                                </button>
                              )}
                              <span className="font-mono text-[11px] font-black opacity-90">
                                {basket.w}-{basket.l}
                              </span>
                            </div>
                          </div>

                          {/* Match Cards List */}
                          <div className="flex flex-col gap-1.5">
                            {matchesToRender.map(({ match, originalIndex: mIdx }) => {
                              const isRealMatch = originalIndexIsReal(mIdx);
                              const hasWinner = !!match.winnerId;
                              const isBye = match.team1?.id === 'BYE' || match.team2?.id === 'BYE';

                              // BYE Match Card
                              if (isRealMatch && isBye) {
                                const activeTeam = match.team1?.id === 'BYE' ? match.team2 : match.team1;
                                return (
                                  <div
                                    key={match.id}
                                    className={`h-11 bg-black/70 border border-emerald-500/30 px-3 rounded-lg flex items-center ${isLogosOnly ? 'justify-center gap-3' : 'justify-between'}`}
                                    title={activeTeam?.name}
                                  >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                      <TeamLogo teamName={activeTeam?.name || ''} logoUrl={activeTeam?.logoUrl} sizeClassName={isLogosOnly ? "w-6 h-6 shrink-0" : "w-5 h-5 shrink-0"} />
                                      {!isLogosOnly && (
                                        <span className="text-xs font-black text-emerald-400 truncate">
                                          {activeTeam?.name}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[9px] font-black bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                      BYE
                                    </span>
                                  </div>
                                );
                              }

                              // Placeholder Match Card (for upcoming rounds)
                              if (!isRealMatch) {
                                return (
                                  <div
                                    key={match.id}
                                    className="h-11 px-3 bg-[#13151f]/80 border border-white/10 rounded-lg flex items-center justify-between text-white/40 shadow-sm"
                                  >
                                    <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white/30 font-black font-mono">
                                      ?
                                    </div>
                                    <span className="text-[10px] font-black text-white/50 tracking-widest px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                                      VS
                                    </span>
                                    <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white/30 font-black font-mono">
                                      ?
                                    </div>
                                  </div>
                                );
                              }

                              // Real Active Match Card
                              const t1Won = match.winnerId === match.team1?.id;
                              const t2Won = match.winnerId === match.team2?.id;

                              return (
                                <div
                                  key={match.id}
                                  className={`group relative flex items-center justify-between ${isLogosOnly ? 'px-2 py-1.5 h-11' : 'px-2.5 py-1.5'} rounded-lg border transition-all duration-200 shadow-md ${
                                    hasWinner
                                      ? 'bg-black/80 border-white/20'
                                      : 'bg-[#151824] border-white/15 hover:border-[#ff8f00]/50 hover:bg-[#1a1f2e]'
                                  }`}
                                >
                                  {/* Team 1 (Left) */}
                                  <div
                                    onClick={() => match.team1 && setQuickWinner(rIdx, mIdx, match.team1)}
                                    className={`flex items-center ${isLogosOnly ? 'justify-start' : 'gap-1.5 flex-1 min-w-0 pr-1'} cursor-pointer transition-all ${
                                      hasWinner && !t1Won ? 'opacity-35 hover:opacity-75 grayscale-[40%]' : ''
                                    }`}
                                    title={match.team1?.name ? `${match.team1.name} (Нажмите для победы)` : 'Нажмите для победы'}
                                  >
                                    <div className={`transition-all rounded-md ${t1Won ? 'p-0.5 bg-emerald-500/20 ring-2 ring-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''}`}>
                                      <TeamLogo
                                        teamName={match.team1?.name || ''}
                                        logoUrl={match.team1?.logoUrl}
                                        sizeClassName={isLogosOnly ? "w-6 h-6 shrink-0" : "w-5 h-5 shrink-0"}
                                      />
                                    </div>
                                    {!isLogosOnly && (
                                      !hasWinner && !isExporting && isSwapMode ? (
                                        <select
                                          value={match.team1?.id || ''}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            swapTeamsInSwissRound(rIdx, mIdx, 1, e.target.value);
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          className="bg-black text-white font-extrabold text-[11px] border border-white/20 rounded px-1 py-0.5 outline-none cursor-pointer w-full truncate"
                                        >
                                          {tournament.teams.map((t) => (
                                            <option key={t.id} value={t.id} className="bg-[#12121a] text-white">
                                              {t.id === 'BYE' ? 'BYE' : t.name}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <span
                                          className={`text-xs font-black truncate transition-colors ${
                                            t1Won ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'text-white/90'
                                          }`}
                                        >
                                          {match.team1?.name || 'TBD'}
                                        </span>
                                      )
                                    )}
                                  </div>

                                  {/* Center Capsule (Score or VS) */}
                                  <div className="shrink-0 flex items-center justify-center px-1">
                                    {hasWinner ? (
                                      <div
                                        onClick={() => undoMatchWinner(rIdx, mIdx)}
                                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/90 border border-white/25 text-xs font-mono font-black cursor-pointer hover:border-rose-500/60 hover:text-rose-400 transition-all"
                                        title="Нажмите, чтобы сбросить результат"
                                      >
                                        <span className={t1Won ? 'text-emerald-400 font-bold' : 'text-white/50'}>
                                          {match.score1}
                                        </span>
                                        <span className="text-white/40 text-[10px]">:</span>
                                        <span className={t2Won ? 'text-emerald-400 font-bold' : 'text-white/50'}>
                                          {match.score2}
                                        </span>
                                      </div>
                                    ) : isExporting ? (
                                      <div className="flex items-center justify-center px-2 py-0.5 rounded-full bg-black/60 border border-white/10 text-white/50 font-mono font-bold text-[10px]">
                                        VS
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          min="0"
                                          className="w-5 h-5 text-center rounded bg-black/60 text-white font-mono font-bold text-xs border border-white/10 focus:border-[#ff8f00] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                          value={match.score1 === 0 ? 0 : match.score1 || ''}
                                          onChange={(e) =>
                                            updateMatchScore(rIdx, mIdx, 1, parseInt(e.target.value) || 0)
                                          }
                                        />
                                        <span className="text-white/30 text-[10px] font-bold">:</span>
                                        <input
                                          type="number"
                                          min="0"
                                          className="w-5 h-5 text-center rounded bg-black/60 text-white font-mono font-bold text-xs border border-white/10 focus:border-[#ff8f00] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                          value={match.score2 === 0 ? 0 : match.score2 || ''}
                                          onChange={(e) =>
                                            updateMatchScore(rIdx, mIdx, 2, parseInt(e.target.value) || 0)
                                          }
                                        />
                                      </div>
                                    )}
                                  </div>

                                  {/* Team 2 (Right) */}
                                  <div
                                    onClick={() => match.team2 && setQuickWinner(rIdx, mIdx, match.team2)}
                                    className={`flex items-center ${isLogosOnly ? 'justify-end' : 'justify-end gap-1.5 flex-1 min-w-0 pl-1'} cursor-pointer transition-all ${
                                      hasWinner && !t2Won ? 'opacity-35 hover:opacity-75 grayscale-[40%]' : ''
                                    }`}
                                    title={match.team2?.name ? `${match.team2.name} (Нажмите для победы)` : 'Нажмите для победы'}
                                  >
                                    {!isLogosOnly && (
                                      !hasWinner && !isExporting && isSwapMode ? (
                                        <select
                                          value={match.team2?.id || ''}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            swapTeamsInSwissRound(rIdx, mIdx, 2, e.target.value);
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          className="bg-black text-white font-extrabold text-[11px] border border-white/20 rounded px-1 py-0.5 outline-none cursor-pointer w-full truncate"
                                        >
                                          {tournament.teams.map((t) => (
                                            <option key={t.id} value={t.id} className="bg-[#12121a] text-white">
                                              {t.id === 'BYE' ? 'BYE' : t.name}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <span
                                          className={`text-xs font-black truncate transition-colors text-right ${
                                            t2Won ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'text-white/90'
                                          }`}
                                        >
                                          {match.team2?.name || 'TBD'}
                                        </span>
                                      )
                                    )}
                                    <div className={`transition-all rounded-md ${t2Won ? 'p-0.5 bg-emerald-500/20 ring-2 ring-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''}`}>
                                      <TeamLogo
                                        teamName={match.team2?.name || ''}
                                        logoUrl={match.team2?.logoUrl}
                                        sizeClassName={isLogosOnly ? "w-6 h-6 shrink-0" : "w-5 h-5 shrink-0"}
                                      />
                                    </div>
                                  </div>

                                  {/* Hover Actions Bar */}
                                  {!hasWinner && !isExporting && (
                                    <div className="absolute -bottom-2.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-20">
                                      {tournament.settings?.bracketMode === 'realtime' && onVetoMatch && match.team1 && match.team2 && (
                                        <button
                                          type="button"
                                          onClick={() => onVetoMatch(match.team1!, match.team2!)}
                                          className="bg-purple-600 hover:bg-purple-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-md uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                        >
                                          🎮 Veto
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => advanceWinner(rIdx, mIdx)}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-md uppercase tracking-wider flex items-center gap-0.5 cursor-pointer"
                                        title="Подтвердить счет"
                                      >
                                        <Check className="w-2.5 h-2.5" /> Внести
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* BOTTOM SECTION: ELIMINATED BOX (Rounds 3, 4, 5) */}
                  <div className={rIdx >= 3 ? (rIdx === 3 ? "mb-12" : "mb-6") : ""}>
                    {eliminatedSlotsTotal > 0 ? (
                      <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-rose-950/25 border border-rose-500/35 shadow-[0_0_15px_rgba(244,63,94,0.1)] mt-2">
                        {/* Eliminated Header */}
                        <div className="flex items-center justify-between px-2 py-1 bg-rose-500/20 rounded-lg border border-rose-500/35 text-rose-300 font-black text-[10px] uppercase tracking-widest">
                          <span className="flex items-center gap-1">
                            ✕ ELIMINATED
                          </span>
                          <span className="text-[9px] opacity-90 font-mono font-bold">
                            {eliminatedTeams.length} / {eliminatedSlotsTotal}
                          </span>
                        </div>

                        {/* Eliminated Slots */}
                        <div className={eliminatedSlotsTotal > 2 ? "grid grid-cols-2 gap-1.5" : "flex flex-col gap-1"}>
                          {Array.from({ length: eliminatedSlotsTotal }).map((_, slotIdx) => {
                            const elimTeam = eliminatedTeams[slotIdx];
                            if (elimTeam) {
                              return (
                                <div
                                  key={`elim-${slotIdx}-${elimTeam.team.id}`}
                                  className={`h-8 px-2 bg-[#170a0d]/90 border border-rose-500/40 rounded-lg flex items-center ${isLogosOnly ? 'justify-center gap-2' : 'justify-between gap-1.5'} shadow-sm transition-all hover:border-rose-400`}
                                  title={elimTeam.team.name}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                                    <TeamLogo teamName={elimTeam.team.name} logoUrl={elimTeam.team.logoUrl} sizeClassName={isLogosOnly ? "w-5 h-5 shrink-0" : "w-4 h-4 shrink-0"} />
                                    {!isLogosOnly && (
                                      <span className="text-[11px] font-bold text-white/90 truncate min-w-0 flex-1">
                                        {elimTeam.team.name}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[8.5px] font-mono font-black text-rose-400 bg-rose-500/20 border border-rose-500/40 px-1 py-0.5 rounded shrink-0">
                                    {elimTeam.w}-{elimTeam.l}
                                  </span>
                                </div>
                              );
                            }
                            return (
                              <div
                                key={`elim-empty-${slotIdx}`}
                                className="h-8 rounded-lg border border-dashed border-rose-500/30 bg-rose-500/[0.08] flex items-center justify-center text-rose-400/50 text-[10px] font-black tracking-wider shadow-sm"
                              >
                                SLOT
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      // Empty space placeholder
                      <div className="h-0" />
                    )}
                  </div>

                </div>

                {/* Transition Directional Lines between Columns (Green to Winners / Red to Losers) */}
                {colIdx < totalRounds - 1 && renderColumnConnectors(colIdx)}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function originalIndexIsReal(idx: number): boolean {
  return idx !== -1;
}
