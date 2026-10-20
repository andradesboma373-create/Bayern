import React, { useMemo, useState } from 'react';
import { X, Target, Award, Flame, Users, ArrowLeftRight, ChevronRight } from 'lucide-react';
import { loadTournaments, getCanonicalRoomId } from './storage';
import PlayerAvatar from '../PlayerAvatar';

interface Props {
  user: any;
  tournamentId?: string;
  match?: any;
  onClose: () => void;
}

export default function LeadersModal({ user, tournamentId, match, onClose }: Props) {
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const { stats } = useMemo(() => {
    const uid = user?.uid || 'guest';
    const roomId = getCanonicalRoomId(uid);
    
    // If a single match is provided, use its stats
    if (match) {
      const playerStatsMap = new Map<string, any>();
      const processStats = (psArray: any[], fallbackTeamName: string) => {
        if (!psArray || !Array.isArray(psArray)) return;
        psArray.forEach((ps: any) => {
          const id = ps.id || ps.nickname;
          if (!id) return;
          if (!playerStatsMap.has(id)) {
            playerStatsMap.set(id, {
              id: id,
              nickname: ps.nickname || 'Unknown',
              teamName: fallbackTeamName || 'Team',
              fk: 0,
              clutches: 0,
              kills: 0,
              deaths: 0,
              kd: 0,
              assists: 0,
              damage: 0,
              rounds: 0
            });
          }
          const curr = playerStatsMap.get(id);
          curr.fk += (ps.fk || ps.openingKills || 0);
          const c1v1 = (ps.clutchesWon1v1 || 0);
          const c1v2 = (ps.clutchesWon1v2 || 0);
          const c1v3 = (ps.clutchesWon1v3 || 0);
          const c1v4 = (ps.clutchesWon1v4 || 0);
          const c1v5 = (ps.clutchesWon1v5 || 0);
          curr.clutches += (c1v1 + c1v2 + c1v3 + c1v4 + c1v5);
          curr.kills += (ps.kills || ps.k || 0);
          curr.deaths += (ps.deaths || ps.d || 0);
          curr.assists += (ps.assists || 0);
          curr.damage += (ps.damage || 0);
          curr.rounds += (ps.totalRounds || 0);
        });
      };

      if (match.maps && match.maps.length > 0) {
        match.maps.forEach((map: any) => {
          processStats(map.team1Stats, match.team1Name);
          processStats(map.team2Stats, match.team2Name);
        });
      } else {
        processStats(match.team1Stats, match.team1Name);
        processStats(match.team2Stats, match.team2Name);
      }

      const arr = Array.from(playerStatsMap.values()).map(p => ({
        ...p,
        kd: p.deaths > 0 ? p.kills / p.deaths : p.kills,
        adr: p.rounds > 0 ? p.damage / p.rounds : 0,
        kpr: p.rounds > 0 ? p.kills / p.rounds : 0
      }));
      return { stats: arr };
    }

    // Otherwise, calculate stats for the entire tournament
    const localMatches = JSON.parse(
      localStorage.getItem(`matches_${roomId}`) || 
      localStorage.getItem(`matches_${uid}`) || 
      '[]'
    );
    const localPlayers = JSON.parse(
      localStorage.getItem(`players_${roomId}`) || 
      localStorage.getItem(`players_${uid}`) || 
      '[]'
    );
    const localTeams = JSON.parse(
      localStorage.getItem(`teams_${roomId}`) || 
      localStorage.getItem(`teams_${uid}`) || 
      '[]'
    );
    const localTourneys = loadTournaments(roomId);
    const tourney = localTourneys.find((t: any) => t.id === tournamentId);
    const tourneyName = tourney?.name || '';
    
    const tourMatches = localMatches.filter((m: any) => {
      if (!m) return false;
      if (tournamentId && m.tournamentId === tournamentId) return true;
      if (tourneyName && m.tournamentName && m.tournamentName.toLowerCase().trim() === tourneyName.toLowerCase().trim()) return true;
      if (tourney?.matchIds && Array.isArray(tourney.matchIds) && tourney.matchIds.includes(m.id)) return true;
      return false;
    });

    const playerStatsMap = new Map<string, any>();
    
    tourMatches.forEach((m: any) => {
      const processStats = (psArray: any[], fallbackTeamName: string) => {
        if (!psArray || !Array.isArray(psArray)) return;
        psArray.forEach((ps: any) => {
          const id = ps.id || ps.nickname;
          if (!id) return;
          if (!playerStatsMap.has(id)) {
            let pInfo = localPlayers.find((p: any) => p.id === id || p.nickname === ps.nickname);
            let teamInfo = null;
            if (pInfo) {
              teamInfo = localTeams.find((t: any) => t.id === pInfo.teamId);
            }
            playerStatsMap.set(id, {
              id: id,
              nickname: ps.nickname || pInfo?.nickname || 'Unknown',
              teamName: teamInfo?.name || fallbackTeamName || 'Свободный агент',
              fk: 0,
              clutches: 0,
              kills: 0,
              deaths: 0,
              kd: 0,
              assists: 0,
              damage: 0,
              rounds: 0
            });
          }
          const curr = playerStatsMap.get(id);
          curr.fk += (ps.fk || ps.openingKills || 0);
          const c1v1 = (ps.clutchesWon1v1 || 0);
          const c1v2 = (ps.clutchesWon1v2 || 0);
          const c1v3 = (ps.clutchesWon1v3 || 0);
          const c1v4 = (ps.clutchesWon1v4 || 0);
          const c1v5 = (ps.clutchesWon1v5 || 0);
          curr.clutches += (c1v1 + c1v2 + c1v3 + c1v4 + c1v5);
          curr.kills += (ps.kills || ps.k || 0);
          curr.deaths += (ps.deaths || ps.d || 0);
          curr.assists += (ps.assists || 0);
          curr.damage += (ps.damage || 0);
          curr.rounds += (ps.totalRounds || 0);
        });
      };

      if (m.maps && m.maps.length > 0) {
        m.maps.forEach((map: any) => {
          processStats(map.team1Stats, m.team1Name);
          processStats(map.team2Stats, m.team2Name);
        });
      } else {
        processStats(m.team1Stats, m.team1Name);
        processStats(m.team2Stats, m.team2Name);
      }
    });
    
    const arr = Array.from(playerStatsMap.values()).map(p => ({
      ...p,
      kd: p.deaths > 0 ? p.kills / p.deaths : p.kills,
      adr: p.rounds > 0 ? p.damage / p.rounds : 0,
      kpr: p.rounds > 0 ? p.kills / p.rounds : 0
    }));
    
    return { stats: arr };
  }, [user?.uid, tournamentId, match]);

  const title = match ? 'ОРИЕНТИРОВОЧНЫЕ ЛИДЕРЫ МАТЧА' : 'ОРИЕНТИРОВОЧНЫЕ ЛИДЕРЫ ТУРНИРА';
  const subtitle = match ? 'ПРИМЕРНЫЕ ПОКАЗАТЕЛИ СЕРИИ' : 'ОРИЕНТИРОВОЧНО ПО КАТЕГОРИЯМ';

  const topOpeners = useMemo(() => {
    return [...stats].sort((a, b) => b.fk - a.fk || b.kd - a.kd).slice(0, 10);
  }, [stats]);

  const topClutchers = useMemo(() => {
    return [...stats].sort((a, b) => b.clutches - a.clutches || b.kd - a.kd).slice(0, 10);
  }, [stats]);

  const toggleCompare = (id: string) => {
    if (compareIds.includes(id)) {
      setCompareIds(prev => prev.filter(cid => cid !== id));
    } else {
      if (compareIds.length >= 2) {
        setCompareIds([compareIds[1], id]);
      } else {
        setCompareIds(prev => [...prev, id]);
      }
    }
  };

  const compareData = useMemo(() => {
    if (compareIds.length < 2) return null;
    const p1 = stats.find(s => s.id === compareIds[0]);
    const p2 = stats.find(s => s.id === compareIds[1]);
    if (!p1 || !p2) return null;
    return { p1, p2 };
  }, [compareIds, stats]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans text-white">
      <div className="bg-[#1a1b26] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#171822]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <Award className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">{title}</h2>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {compareIds.length > 0 && (
              <button 
                onClick={() => setCompareIds([])}
                className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 uppercase hover:bg-blue-500/20 transition-all"
              >
                Сбросить сравнение ({compareIds.length}/2)
              </button>
            )}
            <button onClick={onClose} className="p-2 text-white/50 hover:text-white bg-white/5 rounded-xl transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
          {compareData ? (
            <div className="animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                <div className="flex items-center gap-4 text-left flex-1">
                  <PlayerAvatar playerName={compareData.p1.nickname} sizeClassName="w-16 h-16 rounded-2xl" />
                  <div>
                    <h3 className="text-2xl font-black text-white">{compareData.p1.nickname}</h3>
                    <p className="text-xs text-white/40 uppercase font-bold">{compareData.p1.teamName}</p>
                  </div>
                </div>
                <div className="px-6">
                  <div className="p-3 bg-white/5 rounded-full border border-white/10">
                    <ArrowLeftRight className="w-6 h-6 text-blue-500" />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right flex-1 justify-end">
                  <div>
                    <h3 className="text-2xl font-black text-white">{compareData.p2.nickname}</h3>
                    <p className="text-xs text-white/40 uppercase font-bold">{compareData.p2.teamName}</p>
                  </div>
                  <PlayerAvatar playerName={compareData.p2.nickname} sizeClassName="w-16 h-16 rounded-2xl" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: 'K/D RATIO', key: 'kd', format: (v: number) => v.toFixed(2) },
                  { label: 'KILLS', key: 'kills' },
                  { label: 'DEATHS', key: 'deaths' },
                  { label: 'ASSISTS', key: 'assists' },
                  { label: 'AVG DAMAGE (ADR)', key: 'adr', format: (v: number) => v.toFixed(1) },
                  { label: 'KILLS PER ROUND (KPR)', key: 'kpr', format: (v: number) => v.toFixed(2) },
                  { label: 'OPENING KILLS', key: 'fk' },
                  { label: 'CLUTCHES WON', key: 'clutches' },
                ].map((row, idx) => {
                  const val1 = compareData.p1[row.key];
                  const val2 = compareData.p2[row.key];
                  const isBetter1 = val1 > val2;
                  const isBetter2 = val2 > val1;

                  return (
                    <div key={idx} className="flex items-center gap-4 py-3 px-4 bg-white/2 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
                      <div className={`w-24 text-left font-black text-lg ${isBetter1 ? 'text-blue-400' : 'text-white/40'}`}>
                        {row.format ? row.format(val1) : val1}
                      </div>
                      <div className="flex-1 text-center">
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{row.label}</span>
                      </div>
                      <div className={`w-24 text-right font-black text-lg ${isBetter2 ? 'text-blue-400' : 'text-white/40'}`}>
                        {row.format ? row.format(val2) : val2}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button 
                onClick={() => setCompareIds([])}
                className="mt-8 w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3"
              >
                <Users className="w-5 h-5 text-blue-500" /> Вернуться к спискам
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Section: Opening Kills */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-orange-500" />
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">ЛУЧШИЕ ОПЕНЕРЫ</h3>
                  </div>
                </div>
                
                {topOpeners.length === 0 ? (
                  <p className="text-white/20 text-xs py-4 italic">Статистика еще не накоплена...</p>
                ) : (
                  <div className="space-y-2">
                    {topOpeners.map((p, idx) => (
                      <div 
                        key={p.id} 
                        onClick={() => toggleCompare(p.id)}
                        className={`bg-white/5 border rounded-xl p-3 flex items-center justify-between group cursor-pointer transition-all ${
                          compareIds.includes(p.id) ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
                            idx === 0 ? 'bg-yellow-500 text-black' : 
                            idx === 1 ? 'bg-slate-300 text-black' : 
                            idx === 2 ? 'bg-orange-700 text-white' : 'bg-white/10 text-white/40'
                          }`}>
                            {idx + 1}
                          </div>
                          <PlayerAvatar playerName={p.nickname} sizeClassName="w-8 h-8 rounded-full" />
                          <div>
                            <div className="text-sm font-bold text-white flex items-center gap-2">
                              {p.nickname}
                              {compareIds.includes(p.id) && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>}
                            </div>
                            <div className="text-[10px] text-white/30 font-bold uppercase">{p.teamName}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-lg font-black text-orange-500">{p.fk}</div>
                            <div className="text-[9px] text-white/40 font-bold uppercase tracking-tighter">FK</div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                             <ChevronRight className="w-4 h-4 text-white/20" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section: Clutches */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-blue-500" />
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">КОРОЛИ КЛАТЧЕЙ</h3>
                  </div>
                </div>
                
                {topClutchers.length === 0 ? (
                  <p className="text-white/20 text-xs py-4 italic">Статистика еще не накоплена...</p>
                ) : (
                  <div className="space-y-2">
                    {topClutchers.map((p, idx) => (
                      <div 
                        key={p.id} 
                        onClick={() => toggleCompare(p.id)}
                        className={`bg-white/5 border rounded-xl p-3 flex items-center justify-between group cursor-pointer transition-all ${
                          compareIds.includes(p.id) ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
                            idx === 0 ? 'bg-yellow-500 text-black' : 
                            idx === 1 ? 'bg-slate-300 text-black' : 
                            idx === 2 ? 'bg-orange-700 text-white' : 'bg-white/10 text-white/40'
                          }`}>
                            {idx + 1}
                          </div>
                          <PlayerAvatar playerName={p.nickname} sizeClassName="w-8 h-8 rounded-full" />
                          <div>
                            <div className="text-sm font-bold text-white flex items-center gap-2">
                              {p.nickname}
                              {compareIds.includes(p.id) && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>}
                            </div>
                            <div className="text-[10px] text-white/30 font-bold uppercase">{p.teamName}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-lg font-black text-blue-500">{p.clutches}</div>
                            <div className="text-[9px] text-white/40 font-bold uppercase tracking-tighter">CW</div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                             <ChevronRight className="w-4 h-4 text-white/20" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-4 bg-black/20 border-t border-white/5 text-center flex justify-between items-center px-8">
          <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest">
            {compareData ? 'Сравнение по всем сыгранным картам в рамках серии' : 'Нажмите на игрока, чтобы выбрать его для сравнения (макс. 2)'}
          </p>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${compareIds.length > 0 ? 'bg-blue-500 animate-pulse' : 'bg-white/10'}`}></div>
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Статус сравнения: {compareIds.length}/2</span>
          </div>
        </div>
      </div>
    </div>
  );
}
