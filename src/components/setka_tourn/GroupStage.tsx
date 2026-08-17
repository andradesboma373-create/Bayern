import React, { useState } from 'react';
import { Tournament, Match, Group, Team } from './types';
import TeamLogo from '../TeamLogo';
import { Trophy } from 'lucide-react';
import { getBoxStyle } from './boxStyles';

interface Props {
  tournament: Tournament;
  onUpdate: (tournament: Tournament) => void;
  onAdvanceToBracket: () => void;
  onVetoMatch?: (t1: any, t2: any, matchInfo?: any) => void;
}

export default function GroupStage({ tournament, onUpdate, onAdvanceToBracket, onVetoMatch }: Props) {
  const settings = tournament.settings;
  const groups = tournament.groups || [];

  const updateMatchScore = (groupId: string, matchId: string, teamNum: 1 | 2, score: number) => {
    const newGroups = groups.map(g => {
      if (g.id !== groupId) return g;
      const newMatches = g.matches.map(m => {
        if (m.id !== matchId) return m;
        return {
          ...m,
          score1: teamNum === 1 ? score : m.score1,
          score2: teamNum === 2 ? score : m.score2
        };
      });
      return { ...g, matches: newMatches };
    });
    onUpdate({ ...tournament, groups: newGroups });
  };

  const finishMatch = (groupId: string, matchId: string) => {
    const newGroups = groups.map(g => {
      if (g.id !== groupId) return g;
      const newMatches = g.matches.map(m => {
        if (m.id !== matchId) return m;
        const score1 = m.score1;
        const score2 = m.score2;
        let winnerId = null;
        let isDraw = false;
        
        if (score1 > score2) winnerId = m.team1?.id;
        else if (score2 > score1) winnerId = m.team2?.id;
        else isDraw = true;

        return { ...m, winnerId: winnerId || null, isDraw };
      });
      return { ...g, matches: newMatches };
    });
    onUpdate({ ...tournament, groups: newGroups });
  };

  const calculateStandings = (group: Group) => {
    const stats: Record<string, {
      team: Team, pts: number, p: number, w: number, d: number, l: number, gf: number, ga: number
    }> = {};

    group.teams.forEach(t => {
      stats[t.id] = { team: t, pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    });

    group.matches.forEach(m => {
      if (m.winnerId || m.isDraw) {
        if (m.team1 && stats[m.team1.id]) {
          stats[m.team1.id].p++;
          stats[m.team1.id].gf += m.score1;
          stats[m.team1.id].ga += m.score2;
          
          if (m.isDraw) {
            stats[m.team1.id].d++;
            stats[m.team1.id].pts += (settings.drawPoints || 1);
          } else if (m.winnerId === m.team1.id) {
            stats[m.team1.id].w++;
            stats[m.team1.id].pts += (settings.winPoints || 3);
          } else {
            stats[m.team1.id].l++;
            stats[m.team1.id].pts += (settings.lossPoints || 0);
          }
        }
        
        if (m.team2 && stats[m.team2.id]) {
          stats[m.team2.id].p++;
          stats[m.team2.id].gf += m.score2;
          stats[m.team2.id].ga += m.score1;
          
          if (m.isDraw) {
            stats[m.team2.id].d++;
            stats[m.team2.id].pts += (settings.drawPoints || 1);
          } else if (m.winnerId === m.team2.id) {
            stats[m.team2.id].w++;
            stats[m.team2.id].pts += (settings.winPoints || 3);
          } else {
            stats[m.team2.id].l++;
            stats[m.team2.id].pts += (settings.lossPoints || 0);
          }
        }
      }
    });

    return Object.values(stats).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts; // points
      const gdA = a.gf - a.ga;
      const gdB = b.gf - b.ga;
      if (gdB !== gdA) return gdB - gdA; // goal diff
      return b.gf - a.gf; // goals for
    });
  };

  const allMatchesFinished = groups.every(g => g.matches.every(m => m.winnerId || m.isDraw));

  return (
    <div className="flex flex-col gap-12">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-black">Групповой Этап</h3>
        <button 
            onClick={onAdvanceToBracket}
            disabled={!allMatchesFinished}
            className="bg-[#ff8f00] text-black px-6 py-2 rounded-xl font-bold uppercase disabled:opacity-30"
        >
            Завершить этап и перейти в Плей-офф
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {groups.map(group => {
          const standings = calculateStandings(group);
          const advanceCount = settings.advancingPerGroup || 2;

          return (
            <div key={group.id} className="bg-[#12121a] p-6 rounded-2xl border border-white/5">
              <h4 className="font-bold text-xl mb-4 text-[#ff8f00]">{group.name}</h4>
              
              {/* Standings */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm text-left">
                  <thead className="bg-black/50 text-white/50 text-xs uppercase">
                    <tr>
                      <th className="p-3 w-8">#</th>
                      <th className="p-3">Команда</th>
                      <th className="p-3 text-center">И</th>
                      <th className="p-3 text-center">В</th>
                      <th className="p-3 text-center">Н</th>
                      <th className="p-3 text-center">П</th>
                      <th className="p-3 text-center">РМ</th>
                      <th className="p-3 text-center font-bold text-white">О</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s, idx) => (
                      <tr key={s.team.id} className={`border-b border-white/5 ${idx < advanceCount ? 'bg-green-500/10' : ''}`}>
                        <td className="p-3 font-bold text-white/50">{idx + 1}</td>
                        <td className="p-3 font-bold flex items-center gap-2">
                          <TeamLogo teamName={s.team.name} sizeClassName="w-5 h-5" />
                          {s.team.name}
                        </td>
                        <td className="p-3 text-center">{s.p}</td>
                        <td className="p-3 text-center text-green-400">{s.w}</td>
                        <td className="p-3 text-center text-yellow-400">{s.d}</td>
                        <td className="p-3 text-center text-red-400">{s.l}</td>
                        <td className="p-3 text-center">{s.gf - s.ga > 0 ? `+${s.gf - s.ga}` : s.gf - s.ga}</td>
                        <td className="p-3 text-center font-bold text-[#ff8f00]">{s.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Matches */}
              <div className="flex flex-col gap-3">
                <h5 className="font-bold text-sm text-white/50 uppercase">Матчи</h5>
                {group.matches.map(match => {
                    const isFinished = match.winnerId || match.isDraw;
                    const hasWinner = !!match.winnerId;
                    const boxCls = getBoxStyle(tournament.settings.boxStyle as any);

                    return (
                        <div key={match.id} className={`flex items-center justify-between transition-all ${boxCls.outerCard}`}>
                            <div className="flex items-center gap-3 flex-1 justify-end">
                                <span className={`truncate max-w-[120px] ${
                                    match.winnerId === match.team1?.id 
                                        ? boxCls.winnerText 
                                        : isFinished && match.winnerId !== match.team1?.id && !match.isDraw
                                            ? boxCls.loserText 
                                            : boxCls.defaultText
                                }`}>{match.team1?.name}</span>
                                <TeamLogo teamName={match.team1?.name || ''} sizeClassName="w-6 h-6" />
                            </div>
                            
                            <div className="px-4 flex flex-col items-center gap-1">
                                {isFinished ? (
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="font-mono font-black text-lg px-3 py-1 rounded-lg border bg-black/40 border-white/10 text-[#ff8f00]">
                                            {match.score1} : {match.score2}
                                        </div>
                                        {(!tournament.settings?.bracketMode || tournament.settings.bracketMode === 'realtime') && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newGroups = [...tournament.groups!];
                                                    const g = newGroups.find(gr => gr.id === group.id);
                                                    if (g) {
                                                        const m = g.matches.find(mx => mx.id === match.id);
                                                        if (m) {
                                                            m.isFinished = false;
                                                            m.winnerId = null;
                                                            onUpdate({ ...tournament, groups: newGroups });
                                                        }
                                                    }
                                                }}
                                                className="text-[10px] text-white/40 hover:text-rose-400 hover:bg-rose-500/10 px-2 py-0.5 rounded transition-all cursor-pointer"
                                            >
                                                Сбросить
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    (tournament.settings?.bracketMode || 'standard') === 'standard' ? (
                                        <div className="flex gap-2">
                                            <input 
                                                type="number" 
                                                value={match.score1 === 0 ? 0 : (match.score1 || '')} 
                                                onChange={(e) => updateMatchScore(group.id, match.id, 1, parseInt(e.target.value) || 0)} 
                                                className={boxCls.scoreInput} 
                                            />
                                            <span className="font-black text-white/30">:</span>
                                            <input 
                                                type="number" 
                                                value={match.score2 === 0 ? 0 : (match.score2 || '')} 
                                                onChange={(e) => updateMatchScore(group.id, match.id, 2, parseInt(e.target.value) || 0)} 
                                                className={boxCls.scoreInput} 
                                            />
                                        </div>
                                    ) : null
                                )}
                                {!isFinished && match.team1 && match.team2 && (
                                    <div className="flex flex-col gap-1 items-center">
                                        {tournament.settings?.bracketMode === 'realtime' ? (
                                            onVetoMatch ? (
                                                <button 
                                                    onClick={() => onVetoMatch(match.team1!, match.team2!)} 
                                                    className="bg-purple-600 hover:bg-purple-500 text-white border border-purple-400 rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(168,85,247,0.4)] flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                                >
                                                    🎮 Сыграть
                                                </button>
                                            ) : null
                                        ) : (
                                            <button 
                                                onClick={() => finishMatch(group.id, match.id)} 
                                                className={boxCls.btnConfirm}
                                                style={{ width: 'auto', marginTop: 0, paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '0.25rem', paddingBottom: '0.25rem' }}
                                            >
                                                Завершить
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3 flex-1 justify-start">
                                <TeamLogo teamName={match.team2?.name || ''} sizeClassName="w-6 h-6" />
                                <span className={`truncate max-w-[120px] ${
                                    match.winnerId === match.team2?.id 
                                        ? boxCls.winnerText 
                                        : isFinished && match.winnerId !== match.team2?.id && !match.isDraw
                                            ? boxCls.loserText 
                                            : boxCls.defaultText
                                }`}>{match.team2?.name}</span>
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
