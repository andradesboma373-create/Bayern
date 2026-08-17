import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tournament, Match, Team } from './types';
import { getBoxStyle } from './boxStyles';
import TeamLogo from '../TeamLogo';
import { generateNextSwissRound } from './swissLogic';
import { Trophy, Skull, HelpCircle, ArrowLeft, ArrowRight, Check, CheckCircle, Undo2, Award, Zap, Shuffle } from 'lucide-react';

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
}

interface SwissScoreConnection {
    fromKey: string;
    toKey: string;
    color: 'green' | 'rose';
}

const SWISS_SCORE_CONNECTIONS: Record<number, SwissScoreConnection[]> = {
    0: [ // Round 1 to 2
        { fromKey: '0-0', toKey: '1-0', color: 'green' },
        { fromKey: '0-0', toKey: '0-1', color: 'rose' }
    ],
    1: [ // Round 2 to 3
        { fromKey: '1-0', toKey: '2-0', color: 'green' },
        { fromKey: '1-0', toKey: '1-1', color: 'rose' },
        { fromKey: '0-1', toKey: '1-1', color: 'green' },
        { fromKey: '0-1', toKey: '0-2', color: 'rose' }
    ],
    2: [ // Round 3 to 4
        { fromKey: '2-0', toKey: '2-1', color: 'rose' }, // Losers of 2-0 go to 2-1 (winners qualify 3-0)
        { fromKey: '1-1', toKey: '2-1', color: 'green' },
        { fromKey: '1-1', toKey: '1-2', color: 'rose' },
        { fromKey: '0-2', toKey: '1-2', color: 'green' }  // Winners of 0-2 go to 1-2 (losers exit 0-3)
    ],
    3: [ // Round 4 to 5
        { fromKey: '2-1', toKey: '2-2', color: 'rose' }, // Losers of 2-1 go to 2-2 (winners qualify 3-1)
        { fromKey: '1-2', toKey: '2-2', color: 'green' } // Winners of 1-2 go to 2-2 (losers exit 1-3)
    ]
};

function getVerticalSlot(w: number, l: number): number {
    const diff = w - l;
    if (diff > 1) return 0;
    if (diff === 1) return 1;
    if (diff === 0) return 2;
    if (diff === -1) return 3;
    return 4;
}

function getExpectedBasketScore(roundIdx: number, slotIdx: number): string | null {
    if (roundIdx === 0) {
        if (slotIdx === 2) return "0 - 0";
    } else if (roundIdx === 1) {
        if (slotIdx === 1) return "1 - 0";
        if (slotIdx === 3) return "0 - 1";
    } else if (roundIdx === 2) {
        if (slotIdx === 0) return "2 - 0";
        if (slotIdx === 2) return "1 - 1";
        if (slotIdx === 4) return "0 - 2";
    } else if (roundIdx === 3) {
        if (slotIdx === 1) return "2 - 1";
        if (slotIdx === 3) return "1 - 2";
    } else if (roundIdx === 4) {
        if (slotIdx === 2) return "2 - 2";
    }
    return null;
}

export default function SwissStage({ tournament, onUpdate, onAdvanceToBracket, isExporting, isSwapMode, onVetoMatch }: Props) {
  const swissRounds = tournament.swissRounds || [];
  const winsToAdvance = tournament.settings.swissWinsToAdvance || 3;
  const lossesToEliminate = tournament.settings.swissLossesToEliminate || 3;

  const boxCls = getBoxStyle(
      tournament.settings.boxStyle as any,
      tournament.settings.cardThemeColor,
      tournament.settings.btnStyle
  );
  const isCustomAccent = !!tournament.settings.cardThemeColor && (tournament.settings.boxStyle === 'dark' || !tournament.settings.boxStyle);
  const accentColor = tournament.settings.cardThemeColor || '#ff8f00';

  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<Record<string, { x: number; y: number }>>({});

  const updateCoords = useCallback(() => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newCoords: Record<string, { x: number; y: number }> = {};
      
      const elements = containerRef.current.querySelectorAll('[data-basket-id]');
      elements.forEach((el) => {
          const basketId = el.getAttribute('data-basket-id');
          if (basketId) {
              const rect = el.getBoundingClientRect();
              newCoords[basketId] = {
                  x: rect.left - containerRect.left + containerRef.current.scrollLeft,
                  y: rect.top - containerRect.top + containerRef.current.scrollTop + rect.height / 2,
              };
          }
      });
      setCoords(newCoords);
  }, []);

  useEffect(() => {
      updateCoords();
      
      const t = setTimeout(updateCoords, 150);
      const observer = new ResizeObserver(() => {
          updateCoords();
      });
      if (containerRef.current) {
          observer.observe(containerRef.current);
      }

      window.addEventListener('resize', updateCoords);
      return () => {
          clearTimeout(t);
          observer.disconnect();
          window.removeEventListener('resize', updateCoords);
      };
  }, [swissRounds, tournament, updateCoords]);

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
          setTimeout(updateCoords, 50);
      }
  }, [swissRounds, tournament, onUpdate, updateCoords]);

  const updateMatchScore = (rIdx: number, mIdx: number, teamNum: 1 | 2, score: number) => {
      const newRounds = [...swissRounds];
      newRounds[rIdx] = [...newRounds[rIdx]];
      const match = { ...newRounds[rIdx][mIdx] };
      if (teamNum === 1) match.score1 = score;
      else match.score2 = score;
      newRounds[rIdx][mIdx] = match;
      onUpdate({ ...tournament, swissRounds: newRounds });
      setTimeout(updateCoords, 50);
  };

  const advanceWinner = (rIdx: number, mIdx: number) => {
      const newRounds = [...swissRounds];
      newRounds[rIdx] = [...newRounds[rIdx]];
      const match = { ...newRounds[rIdx][mIdx] };
      
      if (match.score1 > match.score2) match.winnerId = match.team1?.id || null;
      else if (match.score2 > match.score1) match.winnerId = match.team2?.id || null;
      
      newRounds[rIdx][mIdx] = match;
      onUpdate({ ...tournament, swissRounds: newRounds });
      setTimeout(updateCoords, 50);
  };
  
  const undoMatchWinner = (rIdx: number, mIdx: number) => {
      const newRounds = [...swissRounds];
      newRounds[rIdx] = [...newRounds[rIdx]];
      const match = { ...newRounds[rIdx][mIdx] };
      match.winnerId = null;
      newRounds[rIdx][mIdx] = match;
      onUpdate({ ...tournament, swissRounds: newRounds });
      setTimeout(updateCoords, 50);
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
          // Swap team1 and team2 in same match
          const temp = m1.team1;
          m1.team1 = m1.team2;
          m1.team2 = temp;
          newRounds[rIdx][targetMatchIdx] = m1;
      } else {
          // Swap teams between two different matches
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
      setTimeout(updateCoords, 50);
  };

  const shuffleBasketMatches = (rIdx: number, basketMatches: { match: Match, originalIndex: number }[]) => {
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
      setTimeout(updateCoords, 50);
  };

  const handleUndoLastRound = () => {
      if (swissRounds.length <= 1) return;
      if (!window.confirm("Вы уверены, что хотите отменить этот раунд?")) return;
      const newRounds = swissRounds.slice(0, swissRounds.length - 1);
      onUpdate({ ...tournament, swissRounds: newRounds });
      setTimeout(updateCoords, 50);
  };

  const isCurrentRoundFinished = () => {
      if (swissRounds.length === 0) return false;
      const currentRound = swissRounds[swissRounds.length - 1];
      return currentRound.every(m => m.winnerId !== null);
  };

  const handleGenerateNextRound = () => {
      const nextRound = generateNextSwissRound(tournament.teams, swissRounds, winsToAdvance, lossesToEliminate);
      
      if (nextRound && nextRound.length > 0) {
          onUpdate({ ...tournament, swissRounds: [...swissRounds, nextRound] });
          setTimeout(updateCoords, 50);
      } else {
          console.log("Швейцарская система завершена. Все команды либо прошли, либо выбыли.");
      }
  };

  const getTeamScoreBeforeRound = (teamId: string, roundIdx: number) => {
      let w = 0;
      let l = 0;
      for (let i = 0; i < roundIdx; i++) {
          const round = swissRounds[i];
          const match = round.find(m => m.team1?.id === teamId || m.team2?.id === teamId);
          if (match && match.winnerId) {
              if (match.winnerId === teamId) w++;
              else l++;
          }
      }
      return { w, l };
  };

  // Standings calculation for final columns
  const getSwissStandings = (): TeamSwissStats[] => {
      const statsMap = new Map<string, { w: number, l: number, team: Team }>();
      tournament.teams.forEach(t => {
          if (t.id !== 'BYE') {
              statsMap.set(t.id, { w: 0, l: 0, team: t });
          }
      });

      swissRounds.forEach((round, rIdx) => {
          round.forEach(m => {
              if (m.winnerId) {
                  if (m.team1 && m.team1.id !== 'BYE' && statsMap.has(m.team1.id)) {
                      if (m.winnerId === m.team1.id) statsMap.get(m.team1.id)!.w++;
                      else statsMap.get(m.team1.id)!.l++;
                  }
                  if (m.team2 && m.team2.id !== 'BYE' && statsMap.has(m.team2.id)) {
                      if (m.winnerId === m.team2.id) statsMap.get(m.team2.id)!.w++;
                      else statsMap.get(m.team2.id)!.l++;
                  }
              }
          });
      });

      return Array.from(statsMap.values()).map(({ w, l, team }) => {
          let status: 'playing' | 'qualified' | 'eliminated' = 'playing';
          if (w >= winsToAdvance) status = 'qualified';
          else if (l >= lossesToEliminate) status = 'eliminated';
          return { team, w, l, status };
      });
  };

  const standings = getSwissStandings();
  const qualifiedTeams = standings.filter(s => s.status === 'qualified').sort((a, b) => b.w - a.w || a.l - b.l);
  const eliminatedTeams = standings.filter(s => s.status === 'eliminated').sort((a, b) => b.w - a.w || a.l - b.l);

  // Group styles helper for ESL visual categorization
  const getGroupStyle = (w: number, l: number) => {
      const isQualifying = w === winsToAdvance - 1;
      const isEliminating = l === lossesToEliminate - 1;

      if (isQualifying && isEliminating) {
          // Decider Match (e.g. 2:2)
          return {
              borderColor: 'border-amber-500/30 hover:border-amber-500/60',
              bgGlow: 'shadow-[0_0_15px_rgba(245,158,11,0.04)] bg-[#181410]/95',
              textColor: 'text-amber-400',
              icon: <Zap className="w-4 h-4 text-amber-400" />,
              badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              labelText: 'Решающий матч'
          };
      }
      if (isQualifying) {
          // e.g. 2:0 or 2:1 (Matches for promotion)
          return {
              borderColor: 'border-emerald-500/30 hover:border-emerald-500/60',
              bgGlow: 'shadow-[0_0_15px_rgba(16,185,129,0.04)] bg-[#0c1612]/95',
              textColor: 'text-emerald-400',
              icon: <Trophy className="w-4 h-4 text-emerald-400" />,
              badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              labelText: 'На Выход 🚀'
          };
      }
      if (isEliminating) {
          // e.g. 0:2 or 1:2 (Matches for elimination)
          return {
              borderColor: 'border-rose-500/30 hover:border-rose-500/60',
              bgGlow: 'shadow-[0_0_15px_rgba(244,63,94,0.04)] bg-[#1c0d10]/95',
              textColor: 'text-rose-400',
              icon: <Skull className="w-4 h-4 text-rose-400" />,
              badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
              labelText: 'Выбывание 💀'
          };
      }
      // Neutral (0:0, 1:0, 0:1)
      return {
          borderColor: 'border-white/10 hover:border-white/20',
          bgGlow: 'shadow-md bg-[#12121a]/95',
          textColor: 'text-white/60',
          icon: <Award className="w-4 h-4 text-white/40" />,
          badgeClass: 'bg-white/5 text-white/50 border-white/5',
          labelText: 'Стандартный'
      };
  };

  return (
    <div className="w-full flex flex-col gap-6 text-white">
        {/* Header and Legend Panel */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-black/30 p-6 rounded-2xl border border-white/5">
            <div className="flex flex-col gap-2">
                <h3 className="text-xl font-black text-[#ff8f00] uppercase tracking-widest flex items-center gap-2 font-sans">
                    🎯 ШВЕЙЦАРСКАЯ СИСТЕМА (SWISS SYSTEM)
                </h3>
                <p className="text-xs text-white/50 leading-relaxed max-w-xl font-sans">
                    Команды с одинаковым счетом играют друг с другом. 
                    <strong className="text-white"> {winsToAdvance} победы</strong> — выход в плей-офф, 
                    <strong className="text-white"> {lossesToEliminate} поражения</strong> — выбывание из турнира.
                </p>
            </div>

            {/* ESL style Legend */}
            <div className="flex flex-wrap gap-4 items-center bg-black/40 p-4 rounded-xl border border-white/5 font-sans">
                <span className="text-[10px] font-black uppercase text-white/30 tracking-wider">Легенда сетки:</span>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-white/70">Победа (Продвижение)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                    <span className="text-white/70">Поражение (Понижение)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    <span className="text-white/70">Решающие матчи</span>
                </div>
            </div>

            {/* Stage Actions */}
            <div className="flex flex-wrap gap-2 shrink-0 self-start lg:self-center font-sans">
                {swissRounds.length > 1 && (
                    <button 
                        onClick={handleUndoLastRound}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                        <Undo2 className="w-3.5 h-3.5" /> Отмена раунда
                    </button>
                )}
                <button 
                    onClick={handleGenerateNextRound}
                    disabled={!isCurrentRoundFinished()}
                    title={!isCurrentRoundFinished() ? "Сначала завершите все матчи текущего раунда" : ""}
                    className="bg-[#ff8f00] hover:bg-[#ffa733] text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255,143,0,0.2)] cursor-pointer"
                >
                    Следующий раунд
                </button>
                <button 
                    onClick={onAdvanceToBracket}
                    disabled={!isCurrentRoundFinished()}
                    className="bg-[#ff8f00]/10 hover:bg-[#ff8f00]/20 text-[#ff8f00] border border-[#ff8f00]/30 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                    В Плей-офф
                </button>
            </div>
        </div>

        {/* Horizontal Scrollable Swiss Board */}
        <div ref={containerRef} className="relative flex gap-6 overflow-x-auto pb-6 pt-2 px-4 items-stretch w-full rounded-2xl bg-black/25 p-4 border border-white/5" style={{ minHeight: '520px' }}>
            {/* Dynamic S-curve glowing background connector lines */}
            <svg 
                className="absolute inset-y-0 left-0 pointer-events-none z-0" 
                style={{ 
                    width: `${32 + swissRounds.length * 380 + (swissRounds.length - 1) * 24}px`
                }}
            >
                {Array.from({ length: Math.max(0, swissRounds.length - 1) }).map((_, cIdx) => {
                    const connections = SWISS_SCORE_CONNECTIONS[cIdx] || [];
                    return connections.map((conn, connIdx) => {
                        const startKey = `${cIdx}-${conn.fromKey}`;
                        const endKey = `${cIdx + 1}-${conn.toKey}`;
                        const start = coords[startKey];
                        const end = coords[endKey];
                        
                        if (!start || !end) return null;
                        
                        const x1 = start.x + 380;
                        const y1 = start.y;
                        const x2 = end.x;
                        const y2 = end.y;
                        
                        const colorClass = conn.color === 'green' ? 'stroke-emerald-500/40' : 'stroke-rose-500/40';
                        const glowColor = conn.color === 'green' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)';
                        
                        // Beautiful cubic bezier curve (S-curve)
                        const pathData = `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;
                        
                        return (
                            <g key={`path-${cIdx}-${connIdx}`}>
                                <path 
                                    d={pathData} 
                                    fill="none" 
                                    stroke={glowColor} 
                                    strokeWidth="6" 
                                    className="transition-all duration-500"
                                />
                                <path 
                                    d={pathData} 
                                    fill="none" 
                                    className={`${colorClass} transition-all duration-500`}
                                    strokeWidth="1.5"
                                />
                            </g>
                        );
                    });
                })}
            </svg>

            {swissRounds.map((round, rIdx) => {
                // Determine expected mathematical baskets for this round
                const expectedBaskets: { w: number, l: number }[] = [];
                for (let w = rIdx; w >= 0; w--) {
                    const l = rIdx - w;
                    if (w < winsToAdvance && l < lossesToEliminate) {
                        expectedBaskets.push({ w, l });
                    }
                }
                if (expectedBaskets.length === 0) expectedBaskets.push({ w: 0, l: 0 }); // fallback

                // Calculate target match count for each expected basket based on team count
                const basketTargets = new Map<string, number>();
                expectedBaskets.forEach(b => basketTargets.set(`${b.w}-${b.l}`, 0));

                round.forEach((match) => {
                    [match.team1, match.team2].forEach((t) => {
                        if (t && t.id !== 'BYE') {
                            const sc = getTeamScoreBeforeRound(t.id, rIdx);
                            const k = `${sc.w}-${sc.l}`;
                            if (basketTargets.has(k)) {
                                basketTargets.set(k, basketTargets.get(k)! + 0.5);
                            }
                        } else if (t && t.id === 'BYE') {
                            const other = t.id === match.team1?.id ? match.team2 : match.team1;
                            if (other && other.id !== 'BYE') {
                                const sc = getTeamScoreBeforeRound(other.id, rIdx);
                                const k = `${sc.w}-${sc.l}`;
                                if (basketTargets.has(k)) {
                                    basketTargets.set(k, basketTargets.get(k)! + 0.5);
                                }
                            }
                        }
                    });
                });

                const matchesGrouped = new Map<string, { match: Match; originalIndex: number }[]>();
                expectedBaskets.forEach(b => matchesGrouped.set(`${b.w}-${b.l}`, []));

                const unassignedMatches: { match: Match; originalIndex: number }[] = [];

                round.forEach((match, mIdx) => {
                    let t1k: string | null = null;
                    let t2k: string | null = null;
                    if (match.team1 && match.team1.id !== 'BYE') {
                        const sc = getTeamScoreBeforeRound(match.team1.id, rIdx);
                        t1k = `${sc.w}-${sc.l}`;
                    }
                    if (match.team2 && match.team2.id !== 'BYE') {
                        const sc = getTeamScoreBeforeRound(match.team2.id, rIdx);
                        t2k = `${sc.w}-${sc.l}`;
                    }

                    let assigned = false;

                    // Prefer to assign match to basket where both teams belong (ideal case)
                    if (t1k === t2k && t1k !== null && matchesGrouped.has(t1k)) {
                        const target = Math.ceil(basketTargets.get(t1k) || 0);
                        if (matchesGrouped.get(t1k)!.length < target) {
                            matchesGrouped.get(t1k)!.push({ match, originalIndex: mIdx });
                            assigned = true;
                        }
                    }

                    // Fallback to team 1's basket
                    if (!assigned && t1k !== null && matchesGrouped.has(t1k)) {
                        const target = Math.ceil(basketTargets.get(t1k) || 0);
                        if (matchesGrouped.get(t1k)!.length < target) {
                            matchesGrouped.get(t1k)!.push({ match, originalIndex: mIdx });
                            assigned = true;
                        }
                    }

                    // Fallback to team 2's basket
                    if (!assigned && t2k !== null && matchesGrouped.has(t2k)) {
                        const target = Math.ceil(basketTargets.get(t2k) || 0);
                        if (matchesGrouped.get(t2k)!.length < target) {
                            matchesGrouped.get(t2k)!.push({ match, originalIndex: mIdx });
                            assigned = true;
                        }
                    }

                    // If still not assigned (all preferred baskets full), queue it
                    if (!assigned) {
                        unassignedMatches.push({ match, originalIndex: mIdx });
                    }
                });

                // Assign any leftovers to the first basket that has space
                unassignedMatches.forEach(({ match, originalIndex }) => {
                    let placed = false;
                    for (const b of expectedBaskets) {
                        const key = `${b.w}-${b.l}`;
                        const target = Math.ceil(basketTargets.get(key) || 0);
                        if (matchesGrouped.get(key)!.length < target) {
                            matchesGrouped.get(key)!.push({ match, originalIndex });
                            placed = true;
                            break;
                        }
                    }
                    // Absolute fallback just in case
                    if (!placed && expectedBaskets.length > 0) {
                        const firstKey = `${expectedBaskets[0].w}-${expectedBaskets[0].l}`;
                        matchesGrouped.get(firstKey)!.push({ match, originalIndex });
                    }
                });

                const sortedScoreKeys = Array.from(matchesGrouped.keys()).sort((a, b) => {
                    const [wa, la] = a.split('-').map(Number);
                    const [wb, lb] = b.split('-').map(Number);
                    if (wa !== wb) return wb - wa;
                    return la - lb;
                });

                return (
                    <div key={`col-${rIdx}`} className="flex flex-col w-[380px] shrink-0 bg-black/20 rounded-2xl border border-white/5 p-4 font-sans relative z-10">
                        {/* Round Title */}
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5 shrink-0 h-10">
                            <span className="text-xs font-black text-[#ff8f00] uppercase tracking-widest flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5" /> Раунд {rIdx + 1}
                            </span>
                            <span className="text-[10px] font-bold text-white/30 uppercase bg-white/5 px-2 py-0.5 rounded">
                                {round.length} {round.length === 1 ? 'матч' : round.length < 5 ? 'матча' : 'матчей'}
                            </span>
                        </div>

                        {/* Compact Vertically Centered Baskets */}
                        <div className="flex flex-col gap-8 justify-center flex-1 py-4">
                            {sortedScoreKeys.map((scoreKey) => {
                                const groupMatches = matchesGrouped.get(scoreKey)!;
                                if (groupMatches.length === 0) return null; // Hide empty baskets
                                
                                const [w, l] = scoreKey.split('-').map(Number);
                                const theme = getGroupStyle(w, l);

                                // Teams in this basket
                                const basketTeams: Team[] = [];
                                groupMatches.forEach(({ match }) => {
                                    if (match.team1 && !basketTeams.some(t => t.id === match.team1?.id)) basketTeams.push(match.team1);
                                    if (match.team2 && !basketTeams.some(t => t.id === match.team2?.id)) basketTeams.push(match.team2);
                                });

                                const basketTeamIds = new Set(basketTeams.map(t => t.id));

                                // Teams in other baskets of the same round
                                const otherRoundTeams: { team: Team; score: { w: number; l: number } }[] = [];
                                round.forEach((m) => {
                                    if (m.team1 && !basketTeamIds.has(m.team1.id)) {

                                        const score = getTeamScoreBeforeRound(m.team1.id, rIdx);
                                        if (!otherRoundTeams.some(x => x.team.id === m.team1?.id)) {
                                            otherRoundTeams.push({ team: m.team1, score });
                                        }
                                    }
                                    if (m.team2 && !basketTeamIds.has(m.team2.id)) {
                                        const score = getTeamScoreBeforeRound(m.team2.id, rIdx);
                                        if (!otherRoundTeams.some(x => x.team.id === m.team2?.id)) {
                                            otherRoundTeams.push({ team: m.team2, score });
                                        }
                                    }
                                });

                                const hasUnfinished = groupMatches.some(({ match }) => !match.winnerId);

                                return (
                                    <div 
                                        key={`${rIdx}-${scoreKey}`}
                                        data-basket-id={`${rIdx}-${scoreKey}`}
                                        className={`flex flex-col gap-2 p-3 rounded-xl border transition-all duration-300 ${theme.borderColor} ${theme.bgGlow}`}
                                    >
                                        {/* Score Group Header */}
                                        <div className="flex items-center justify-between border-b border-white/5 pb-1.5 shrink-0 gap-2">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                {theme.icon}
                                                <span className="text-xs font-black text-white uppercase tracking-wider whitespace-nowrap">
                                                    Корзина {w} - {l}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {!isExporting && hasUnfinished && groupMatches.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => shuffleBasketMatches(rIdx, groupMatches)}
                                                        className="text-[10px] font-bold text-white/60 hover:text-[#ff8f00] bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded border border-white/10 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                                        title="Случайно перемешать пары в этой корзине"
                                                    >
                                                        <Shuffle className="w-2.5 h-2.5" />
                                                        <span className="hidden sm:inline">Перетасовать</span>
                                                    </button>
                                                )}
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border whitespace-nowrap ${theme.badgeClass}`}>
                                                    {theme.labelText}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Matches List */}
                                        <div className="flex flex-col space-y-2.5">
                                            {groupMatches.map(({ match, originalIndex: mIdx }) => {
                                                const hasWinner = !!match.winnerId;
                                                const isBye = match.team1?.id === 'BYE' || match.team2?.id === 'BYE';
                                                
                                                if (isBye) {
                                                    const activeTeam = match.team1?.id === 'BYE' ? match.team2 : match.team1;
                                                    const byePos = match.team1?.id === 'BYE' ? 2 : 1;
                                                    return (
                                                        <div key={match.id} className="bg-black/40 border border-emerald-500/10 p-2.5 rounded-lg flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                                                                <TeamLogo teamName={activeTeam?.name || ''} sizeClassName="w-5 h-5 shrink-0" />
                                                                {!isExporting && isSwapMode ? (
                                                                    <select
                                                                        value={activeTeam?.id || ''}
                                                                        onChange={(e) => swapTeamsInSwissRound(rIdx, mIdx, byePos, e.target.value)}
                                                                        className="bg-black/60 text-[#10b981] font-extrabold text-xs border border-emerald-500/20 rounded px-2 py-1 outline-none cursor-pointer w-full truncate"
                                                                        title="Сменить команду с автопроходом (BYE)"
                                                                    >
                                                                        <optgroup label={`В корзине ${w}-${l}`}>
                                                                            {basketTeams.map((t) => (
                                                                                <option key={t.id} value={t.id} className="bg-[#12121a] text-white">
                                                                                    {t.name}
                                                                                </option>
                                                                            ))}
                                                                        </optgroup>
                                                                    </select>
                                                                ) : (
                                                                    <span className="text-xs font-bold text-[#10b981] truncate">
                                                                        {activeTeam?.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest shrink-0">
                                                                BYE
                                                            </span>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div 
                                                        key={match.id}
                                                        className={`transition-all relative flex flex-col gap-1.5 p-2 rounded-xl border shadow-md ${boxCls.outerCard}`}
                                                    >
                                                        {/* Team 1 Row */}
                                                        <div className={`flex items-center justify-between gap-2 p-1.5 rounded-lg border transition-all ${
                                                            hasWinner 
                                                                ? (match.winnerId === match.team1?.id ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-black/20 border-white/5 opacity-60')
                                                                : 'bg-black/30 border-white/10 hover:border-white/20'
                                                        }`}>
                                                            <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                                                                <TeamLogo teamName={match.team1?.name || ''} sizeClassName="w-5 h-5 shrink-0" />
                                                                {!hasWinner && !isExporting && isSwapMode ? (
                                                                    <select
                                                                        value={match.team1?.id || ''}
                                                                        onChange={(e) => swapTeamsInSwissRound(rIdx, mIdx, 1, e.target.value)}
                                                                        className="bg-black/60 hover:bg-black/90 text-white font-extrabold text-[12px] border border-white/10 hover:border-[#ff8f00]/60 rounded px-2 py-0.5 outline-none cursor-pointer w-full truncate transition-all text-left"
                                                                        title="Нажмите, чтобы выбрать другую команду в эту пару"
                                                                    >
                                                                        <optgroup label={`В корзине ${w}-${l}`}>
                                                                            {basketTeams.map((t) => (
                                                                                <option key={t.id} value={t.id} className="bg-[#12121a] text-white">
                                                                                    {t.id === 'BYE' ? 'BYE' : t.name}
                                                                                </option>
                                                                            ))}
                                                                        </optgroup>
                                                                        {otherRoundTeams.length > 0 && (
                                                                            <optgroup label="Из других корзин">
                                                                                {otherRoundTeams.map(({ team: t, score }) => (
                                                                                    <option key={t.id} value={t.id} className="bg-[#12121a] text-white/80">
                                                                                        {t.id === 'BYE' ? 'BYE' : t.name} ({score.w}-{score.l})
                                                                                    </option>
                                                                                ))}
                                                                            </optgroup>
                                                                        )}
                                                                    </select>
                                                                ) : (
                                                                    <span className={`text-xs font-extrabold truncate ${
                                                                        hasWinner 
                                                                            ? (match.winnerId === match.team1?.id ? 'text-emerald-400 font-black' : 'text-white/50')
                                                                            : 'text-white/90'
                                                                    }`}>
                                                                        {match.team1?.name}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Score Input 1 */}
                                                            <div className="shrink-0 flex items-center gap-1">
                                                                {!hasWinner ? (
                                                                    <input 
                                                                        type="number"
                                                                        min="0"
                                                                        className={`w-9 h-7 text-center rounded-md text-xs font-mono font-bold outline-none border transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${boxCls.scoreInput}`}
                                                                        value={match.score1 === 0 ? 0 : (match.score1 || '')}
                                                                        onChange={(e) => updateMatchScore(rIdx, mIdx, 1, parseInt(e.target.value) || 0)}
                                                                    />
                                                                ) : (
                                                                    <span className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
                                                                        match.winnerId === match.team1?.id ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-white/40'
                                                                    }`}>
                                                                        {match.score1}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Team 2 Row */}
                                                        <div className={`flex items-center justify-between gap-2 p-1.5 rounded-lg border transition-all ${
                                                            hasWinner 
                                                                ? (match.winnerId === match.team2?.id ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-black/20 border-white/5 opacity-60')
                                                                : 'bg-black/30 border-white/10 hover:border-white/20'
                                                        }`}>
                                                            <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                                                                <TeamLogo teamName={match.team2?.name || ''} sizeClassName="w-5 h-5 shrink-0" />
                                                                {!hasWinner && !isExporting && isSwapMode ? (
                                                                    <select
                                                                        value={match.team2?.id || ''}
                                                                        onChange={(e) => swapTeamsInSwissRound(rIdx, mIdx, 2, e.target.value)}
                                                                        className="bg-black/60 hover:bg-black/90 text-white font-extrabold text-[12px] border border-white/10 hover:border-[#ff8f00]/60 rounded px-2 py-0.5 outline-none cursor-pointer w-full truncate transition-all text-left"
                                                                        title="Нажмите, чтобы выбрать другую команду в эту пару"
                                                                    >
                                                                        <optgroup label={`В корзине ${w}-${l}`}>
                                                                            {basketTeams.map((t) => (
                                                                                <option key={t.id} value={t.id} className="bg-[#12121a] text-white">
                                                                                    {t.id === 'BYE' ? 'BYE' : t.name}
                                                                                </option>
                                                                            ))}
                                                                        </optgroup>
                                                                        {otherRoundTeams.length > 0 && (
                                                                            <optgroup label="Из других корзин">
                                                                                {otherRoundTeams.map(({ team: t, score }) => (
                                                                                    <option key={t.id} value={t.id} className="bg-[#12121a] text-white/80">
                                                                                        {t.id === 'BYE' ? 'BYE' : t.name} ({score.w}-{score.l})
                                                                                    </option>
                                                                                ))}
                                                                            </optgroup>
                                                                        )}
                                                                    </select>
                                                                ) : (
                                                                    <span className={`text-xs font-extrabold truncate ${
                                                                        hasWinner 
                                                                            ? (match.winnerId === match.team2?.id ? 'text-emerald-400 font-black' : 'text-white/50')
                                                                            : 'text-white/90'
                                                                    }`}>
                                                                        {match.team2?.name}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Score Input 2 */}
                                                            <div className="shrink-0 flex items-center gap-1">
                                                                {!hasWinner ? (
                                                                    <input 
                                                                        type="number"
                                                                        min="0"
                                                                        className={`w-9 h-7 text-center rounded-md text-xs font-mono font-bold outline-none border transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${boxCls.scoreInput}`}
                                                                        value={match.score2 === 0 ? 0 : (match.score2 || '')}
                                                                        onChange={(e) => updateMatchScore(rIdx, mIdx, 2, parseInt(e.target.value) || 0)}
                                                                    />
                                                                ) : (
                                                                    <span className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
                                                                        match.winnerId === match.team2?.id ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-white/40'
                                                                    }`}>
                                                                        {match.score2}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Action Footer */}
                                                        <div className="flex flex-col gap-1.5 px-1 pt-0.5">
                                                            {!hasWinner ? (
                                                                (tournament.settings?.bracketMode === 'realtime') ? (
                                                                    onVetoMatch && match.team1 && match.team2 ? (
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => onVetoMatch(match.team1!, match.team2!)} 
                                                                            className="w-full bg-purple-600 hover:bg-purple-500 text-white border border-purple-400 rounded-lg py-1.5 px-2 text-[11px] font-black uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(168,85,247,0.4)] flex items-center justify-center gap-1 cursor-pointer"
                                                                        >
                                                                            🎮 Сыграть Матч (Симуляция)
                                                                        </button>
                                                                    ) : null
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (match.score1 === match.score2) {
                                                                                if (!window.confirm("У вас ничья. В швейцарской системе должен быть победитель. Вы уверены, что хотите продолжить?")) return;
                                                                            }
                                                                            advanceWinner(rIdx, mIdx);
                                                                        }}
                                                                        className={`w-full py-1 rounded-lg text-[10px] font-black uppercase transition-colors flex items-center justify-center gap-1 cursor-pointer ${boxCls.btnConfirm}`}
                                                                    >
                                                                        <Check className="w-3 h-3" /> Внести результат
                                                                    </button>
                                                                )
                                                            ) : (
                                                                <div className="flex items-center justify-between w-full">
                                                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                                                                        <CheckCircle className="w-3 h-3" /> Завершен
                                                                    </span>
                                                                    {!isExporting && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => undoMatchWinner(rIdx, mIdx)}
                                                                            className="text-[10px] text-white/40 hover:text-rose-400 hover:bg-rose-500/10 px-2 py-0.5 rounded transition-all cursor-pointer"
                                                                        >
                                                                            Сбросить
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
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
            })}

            {/* ESL style vertical divider before summary columns */}
            <div className="flex items-center justify-center px-2 shrink-0">
                <div className="w-[1px] h-[75%] bg-gradient-to-b from-[#ff8f00]/30 via-white/5 to-transparent rounded-full" />
            </div>

            {/* COLUMN: QUALIFIED TEAMS */}
            <div className="flex flex-col w-[360px] shrink-0 bg-[#0d1c14]/40 rounded-2xl border border-emerald-500/20 p-4 font-sans">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-emerald-500/20 shrink-0">
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                        🏆 ПРОШЛИ В ПЛЕЙ-ОФФ
                    </span>
                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">
                        Всего {qualifiedTeams.length}
                    </span>
                </div>

                <div className="flex flex-col gap-2 flex-1">
                    {qualifiedTeams.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-white/20 select-none border border-dashed border-white/5 rounded-xl flex-1">
                            <Trophy className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-wider">Пока пусто</p>
                            <p className="text-[10px] text-white/10 mt-1 max-w-[200px]">
                                Команды, одержавшие {winsToAdvance} победы, появятся здесь.
                            </p>
                        </div>
                    ) : (
                        qualifiedTeams.map(({ team, w, l }) => (
                            <div 
                                key={team.id} 
                                className="bg-[#0b1712]/90 border border-emerald-500/30 p-3.5 rounded-xl flex items-center justify-between shadow-[0_0_15px_rgba(16,185,129,0.03)]"
                            >
                                <div className="flex items-center gap-3">
                                    <TeamLogo teamName={team.name} sizeClassName="w-6 h-6" />
                                    <span className="text-sm font-extrabold text-white">{team.name}</span>
                                </div>
                                <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                                    {w} - {l}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* COLUMN: ELIMINATED TEAMS */}
            <div className="flex flex-col w-[360px] shrink-0 bg-[#220d10]/40 rounded-2xl border border-rose-500/20 p-4 font-sans">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-rose-500/20 shrink-0">
                    <span className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                        💀 ВЫБЫЛИ ИЗ ТУРНИРА
                    </span>
                    <span className="text-[10px] font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 uppercase">
                        Всего {eliminatedTeams.length}
                    </span>
                </div>

                <div className="flex flex-col gap-2 flex-1">
                    {eliminatedTeams.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-white/20 select-none border border-dashed border-white/5 rounded-xl flex-1">
                            <Skull className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-wider">Пока пусто</p>
                            <p className="text-[10px] text-white/10 mt-1 max-w-[200px]">
                                Команды, потерпевшие {lossesToEliminate} поражения, покинут соревнование.
                            </p>
                        </div>
                    ) : (
                        eliminatedTeams.map(({ team, w, l }) => (
                            <div 
                                key={team.id} 
                                className="bg-[#1c0a0c]/90 border border-rose-500/30 p-3.5 rounded-xl flex items-center justify-between shadow-[0_0_15px_rgba(244,63,94,0.03)]"
                            >
                                <div className="flex items-center gap-3">
                                    <TeamLogo teamName={team.name} sizeClassName="w-6 h-6" />
                                    <span className="text-sm font-bold text-white/70">{team.name}</span>
                                </div>
                                <span className="text-xs font-mono font-black text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-lg">
                                    {w} - {l}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}
