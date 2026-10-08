import React, { useState, useEffect, useMemo } from 'react';
import { useGameUniverse } from '../lib/gameUniverse';
import { MAP_POOL_CS2, MAP_POOL_S2 } from '../lib/simulation';
import { getCanonicalRoomId } from './setka_tourn/storage';
import TeamLogo from './TeamLogo';
import { Map, BarChart3, TrendingUp, Users, Target, Shield, Zap, Sparkles } from 'lucide-react';
import AccessDenied from './AccessDenied';

export default function MapCenter({ user }: { user: any }) {
  const [game] = useGameUniverse();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isBamepAdmin = 
    (user?.name || user?.username || user?.displayName || '').toLowerCase() === 'bamep' ||
    user?.role === 'superadmin' ||
    (user?.channelName || '').toLowerCase().includes('bamep');

  if (!isBamepAdmin) {
    return <AccessDenied sectionName="Карты и Тактики" roomName={user?.name || user?.username} />;
  }

  const currentPool = game === 'cs2' ? MAP_POOL_CS2 : MAP_POOL_S2;

  useEffect(() => {
    const loadMatches = () => {
      setLoading(true);
      const roomId = getCanonicalRoomId(user.channelId || user.uid, game);
      const rawMatches = localStorage.getItem(`matches_${roomId}`) || localStorage.getItem(`matches_${user.uid}`) || '[]';
      try {
        const parsed = JSON.parse(rawMatches);
        setMatches(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        setMatches([]);
      }
      setLoading(false);
    };

    loadMatches();
    window.addEventListener('db-user-updated', loadMatches);
    return () => window.removeEventListener('db-user-updated', loadMatches);
  }, [user, game]);

  const mapStats = useMemo(() => {
    const stats: Record<string, { tWins: number, ctWins: number, totalRounds: number, matches: number, teamPerformance: Record<string, { wins: number, played: number }> }> = {};
    
    currentPool.forEach(m => {
      stats[m.name] = { tWins: 0, ctWins: 0, totalRounds: 0, matches: 0, teamPerformance: {} };
    });

    matches.forEach(match => {
      if (!match.maps || !Array.isArray(match.maps)) return;
      
      match.maps.forEach((m: any) => {
        const mapName = m.mapName || m.name;
        if (!stats[mapName]) return;

        stats[mapName].matches += 1;
        
        // Count T/CT wins in rounds if available, otherwise just use map winner
        // Usually m.team1Score/m.team2Score are final scores.
        // We need to know who was T and who was CT.
        // In the simulator, Team 1 usually starts T side in the first half but let's approximate.
        // If we don't have round-by-round side data, we'll use the default bias + match results.
        
        const winner = m.team1Score > m.team2Score ? match.team1Name : match.team2Name;
        const loser = m.team1Score > m.team2Score ? match.team2Name : match.team1Name;

        const updateTeam = (teamName: string, isWin: boolean) => {
          if (!stats[mapName].teamPerformance[teamName]) {
            stats[mapName].teamPerformance[teamName] = { wins: 0, played: 0 };
          }
          stats[mapName].teamPerformance[teamName].played += 1;
          if (isWin) stats[mapName].teamPerformance[teamName].wins += 1;
        };

        updateTeam(match.team1Name, m.team1Score > m.team2Score);
        updateTeam(match.team2Name, m.team2Score > m.team1Score);
      });
    });

    return stats;
  }, [matches, currentPool]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#171728] to-[#121220] rounded-2xl p-8 border border-white/5 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-blue-500/10 blur-[100px] z-0"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-white tracking-wider mb-2 flex items-center gap-3">
             <Map className="text-blue-500 w-8 h-8" />
             MAP INTELLIGENCE HUB
          </h1>
          <p className="text-white/50 text-sm font-semibold tracking-widest uppercase">Аналитика и стратегии маппула</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-20 bg-[#12121a] rounded-2xl border border-white/5">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/40 font-bold uppercase tracking-widest">Анализ истории матчей...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {currentPool.map(map => {
            const s = mapStats[map.name];
            const topTeams = Object.entries(s.teamPerformance)
              .sort((a, b) => (b[1].wins / b[1].played) - (a[1].wins / a[1].played) || b[1].played - a[1].played)
              .slice(0, 3);

            const totalPlayed = s.matches;
            const popularity = matches.length > 0 ? Math.round((totalPlayed / matches.length) * 100) : 0;

            return (
              <div key={map.id} className="bg-[#12121a] border border-white/5 rounded-2xl overflow-hidden flex flex-col group hover:border-blue-500/30 transition-all">
                {/* Map Header */}
                <div className="h-32 relative">
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(18,18,26,1)), url('/maps/${map.id}')` }}
                  />
                  <div className="absolute inset-0 flex items-end p-6">
                    <div className="flex justify-between items-end w-full">
                      <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{map.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded font-black uppercase tracking-widest">
                            {totalPlayed} матчей
                          </span>
                          <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-black uppercase tracking-widest">
                            {popularity}% выбор
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                         <div className="text-[10px] text-white/30 font-bold uppercase mb-1">Баланс сторон</div>
                         <div className="flex gap-1 h-1.5 w-32 bg-white/5 rounded-full overflow-hidden">
                            <div className="bg-[#ff8f00]" style={{ width: `${map.tSideBias * 100}%` }}></div>
                            <div className="bg-blue-500" style={{ width: `${map.ctSideBias * 100}%` }}></div>
                         </div>
                         <div className="flex justify-between text-[8px] font-black mt-1 uppercase tracking-tighter">
                            <span className="text-[#ff8f00]">T: {Math.round(map.tSideBias * 100)}%</span>
                            <span className="text-blue-500">CT: {Math.round(map.ctSideBias * 100)}%</span>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Map Body */}
                <div className="p-6 grid grid-cols-2 gap-8">
                  {/* Left: Mastery */}
                  <div>
                    <div className="flex items-center gap-2 mb-4 text-white/40">
                       <Target className="w-3.5 h-3.5" />
                       <span className="text-[10px] font-black uppercase tracking-widest">Мастера карты</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {topTeams.length > 0 ? topTeams.map(([teamName, perf], idx) => (
                        <div key={teamName} className="flex items-center justify-between group/team">
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-white/20 w-4">#{idx+1}</span>
                             <TeamLogo teamName={teamName} sizeClassName="w-6 h-6" />
                             <span className="text-xs font-bold text-white/80 group-hover/team:text-white transition-colors truncate max-w-[100px]">{teamName}</span>
                          </div>
                          <div className="text-right">
                             <div className="text-[10px] font-black text-blue-400">{Math.round((perf.wins / perf.played) * 100)}% WR</div>
                             <div className="text-[8px] text-white/20 font-bold">{perf.wins}W - {perf.played - perf.wins}L</div>
                          </div>
                        </div>
                      )) : (
                        <div className="text-[10px] text-white/20 italic">Недостаточно данных</div>
                      )}
                    </div>
                  </div>

                  {/* Right: Strategy Insights */}
                  <div className="border-l border-white/5 pl-8">
                    <div className="flex items-center gap-2 mb-4 text-white/40">
                       <Zap className="w-3.5 h-3.5" />
                       <span className="text-[10px] font-black uppercase tracking-widest">Особенности</span>
                    </div>
                    <div className="space-y-4">
                       <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                             <TrendingUp className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div>
                             <div className="text-[10px] font-black text-white/90 uppercase tracking-tighter">Сложность игры</div>
                             <div className="text-[10px] text-white/40 leading-tight mt-0.5">Высокая зависимость от {map.tSideBias > 0.5 ? 'агрессивных выходов за T' : 'грамотной позиционки за CT'}.</div>
                          </div>
                       </div>
                       <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                             <Sparkles className="w-4 h-4 text-purple-500" />
                          </div>
                          <div>
                             <div className="text-[10px] font-black text-white/90 uppercase tracking-tighter">Пик силы</div>
                             <div className="text-[10px] text-white/40 leading-tight mt-0.5">Команды с высоким IQ {game === 'cs2' ? 'доминируют на миду' : 'контролируют ключевые точки'}.</div>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Footer Footer */}
                <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 flex justify-between items-center">
                   <div className="flex items-center gap-1.5">
                      <Shield className="w-3 h-3 text-white/20" />
                      <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Аналитика на основе реальных игр комнаты</span>
                   </div>
                   <button className="text-[9px] font-black text-blue-500/50 hover:text-blue-400 uppercase tracking-widest transition-colors">Подробные статы →</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Roster Chemistry Insight Card */}
      <div className="bg-[#12121a] border border-white/5 rounded-2xl p-8 relative overflow-hidden mt-4">
        <div className="absolute right-0 top-0 w-64 h-64 bg-purple-600/5 blur-[80px] pointer-events-none"></div>
        <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2 flex items-center gap-3">
           <BarChart3 className="text-purple-500 w-5 h-5" />
           ИНСАЙТЫ МАППУЛА
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
           <div className="p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="text-[10px] font-black text-white/30 uppercase mb-2">Самая популярная</div>
              <div className="text-lg font-black text-white">{Object.entries(mapStats).sort((a,b) => b[1].matches - a[1].matches)[0]?.[0] || 'N/A'}</div>
              <div className="text-[10px] text-blue-400 font-bold mt-1">Использовалась в {Object.entries(mapStats).sort((a,b) => b[1].matches - a[1].matches)[0]?.[1]?.matches || 0} матчах</div>
           </div>
           <div className="p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="text-[10px] font-black text-white/30 uppercase mb-2">Дисбаланс сторон</div>
              <div className="text-lg font-black text-white">
                {currentPool.sort((a,b) => Math.abs(a.tSideBias - 0.5) - Math.abs(b.tSideBias - 0.5))[currentPool.length-1]?.name || 'N/A'}
              </div>
              <div className="text-[10px] text-emerald-400 font-bold mt-1">Сильный перекос за {currentPool.sort((a,b) => Math.abs(a.tSideBias - 0.5) - Math.abs(b.tSideBias - 0.5))[currentPool.length-1]?.tSideBias > 0.5 ? 'Т-сторону' : 'СТ-сторону'}</div>
           </div>
           <div className="p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="text-[10px] font-black text-white/30 uppercase mb-2">Средняя результативность</div>
              <div className="text-lg font-black text-white">{matches.length > 0 ? (matches.reduce((acc, m) => acc + (m.team1Score + m.team2Score), 0) / matches.length / (game === 'cs2' ? 1.5 : 2)).toFixed(1) : '0'}</div>
              <div className="text-[10px] text-purple-400 font-bold mt-1">Раундов за карту в среднем</div>
           </div>
        </div>
      </div>
    </div>
  );
}
