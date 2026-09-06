import React, { useState } from 'react';
import { X, Play, RefreshCw, Trophy, Check } from 'lucide-react';
import { simulateMatchSeries, MAP_POOL_CS2, MAP_POOL_S2 } from '../../lib/simulation';
import { saveMatchesToLocalStorage } from '../../lib/utils';
import { Team } from './types';

interface Props {
  user: any;
  team1: Team;
  team2: Team;
  game: 'cs2' | 's2';
  bo: number;
  tournamentId: string;
  onClose: () => void;
  onMatchComplete: (score1: number, score2: number) => void;
}

export function getVetoStepsLocal(format: 'bo1' | 'bo3' | 'bo5', game: 'cs2' | 's2') {
  const mapCount = game === 'cs2' ? 7 : 6;
  if (mapCount === 7) {
    if (format === 'bo1') {
      return [
        { teamIndex: 1, action: 'ban' },
        { teamIndex: 2, action: 'ban' },
        { teamIndex: 1, action: 'ban' },
        { teamIndex: 2, action: 'ban' },
        { teamIndex: 1, action: 'ban' },
        { teamIndex: 2, action: 'ban' },
        { teamIndex: 0, action: 'auto_pick' }
      ];
    } else if (format === 'bo3') {
      return [
        { teamIndex: 1, action: 'ban' },
        { teamIndex: 2, action: 'ban' },
        { teamIndex: 1, action: 'pick' },
        { teamIndex: 2, action: 'pick' },
        { teamIndex: 1, action: 'ban' },
        { teamIndex: 2, action: 'ban' },
        { teamIndex: 0, action: 'auto_pick' }
      ];
    } else {
      return [
        { teamIndex: 1, action: 'ban' },
        { teamIndex: 2, action: 'ban' },
        { teamIndex: 1, action: 'pick' },
        { teamIndex: 2, action: 'pick' },
        { teamIndex: 1, action: 'pick' },
        { teamIndex: 2, action: 'pick' },
        { teamIndex: 0, action: 'auto_pick' }
      ];
    }
  } else {
    // Standoff 2 (6 maps)
    if (format === 'bo1') {
      return [
        { teamIndex: 1, action: 'ban' },
        { teamIndex: 2, action: 'ban' },
        { teamIndex: 1, action: 'ban' },
        { teamIndex: 2, action: 'ban' },
        { teamIndex: 1, action: 'ban' },
        { teamIndex: 0, action: 'auto_pick' }
      ];
    } else if (format === 'bo3') {
      return [
        { teamIndex: 1, action: 'ban' },
        { teamIndex: 2, action: 'ban' },
        { teamIndex: 1, action: 'pick' },
        { teamIndex: 2, action: 'pick' },
        { teamIndex: 1, action: 'ban' },
        { teamIndex: 0, action: 'auto_pick' }
      ];
    } else {
      return [
        { teamIndex: 1, action: 'ban' },
        { teamIndex: 1, action: 'pick' },
        { teamIndex: 2, action: 'pick' },
        { teamIndex: 1, action: 'pick' },
        { teamIndex: 2, action: 'pick' },
        { teamIndex: 0, action: 'auto_pick' }
      ];
    }
  }
}

export default function MatchVetoModal({ user, team1, team2, game, bo, tournamentId, onClose, onMatchComplete }: Props) {
  const [vetoStage, setVetoStage] = useState(1);
  const [vetoBanned, setVetoBanned] = useState<string[]>([]);
  const [vetoPicked, setVetoPicked] = useState<{mapId: string, pickedBy: string}[]>([]);
  const [vetoLogs, setVetoLogs] = useState<string[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  
  const vetoFormat = bo === 1 ? 'bo1' : bo === 3 ? 'bo3' : 'bo5';
  const MAP_POOL = game === 'cs2' ? MAP_POOL_CS2 : MAP_POOL_S2;
  const steps = getVetoStepsLocal(vetoFormat, game);

  const handleVetoAction = (mapId: string) => {
    if (vetoStage > steps.length) return;
    const step = steps[vetoStage - 1];
    const map = MAP_POOL.find(m => m.id === mapId);
    if (!map) return;
    
    if (step.action === 'auto_pick') return;
    
    const actingTeam = step.teamIndex === 1 ? team1 : team2;
    
    if (step.action === 'ban') {
      setVetoBanned([...vetoBanned, mapId]);
      setVetoLogs([...vetoLogs, `[${actingTeam.name}] забанил(а) ${map.name}`]);
    } else {
      setVetoPicked([...vetoPicked, { mapId, pickedBy: actingTeam.name }]);
      setVetoLogs([...vetoLogs, `[${actingTeam.name}] пикнул(а) ${map.name}`]);
    }
    
    let nextStage = vetoStage + 1;
    if (nextStage <= steps.length && steps[nextStage - 1].action === 'auto_pick') {
       const remainingMaps = MAP_POOL.filter(m => !vetoBanned.includes(m.id) && !vetoPicked.some(p => p.mapId === m.id));
       const autoPickedMap = remainingMaps.find(m => m.id !== mapId);
       if (autoPickedMap) {
         setVetoPicked(prev => [...prev, { mapId: autoPickedMap.id, pickedBy: 'AUTO' }]);
         setVetoLogs(prev => [...prev, `[СИСТЕМА] Авто-пик ${autoPickedMap.name}`]);
       }
       nextStage++;
    }
    
    setVetoStage(nextStage);
  };

  const preparePlayers = (t: Team) => {
    const uid = user?.uid || 'guest';
    const localPlayers = JSON.parse(localStorage.getItem(`players_${uid}`) || '[]');

    // 1. Check embedded players (only main roster of 5 players, bench is excluded from matches)
    if (t.players && t.players.length > 0) {
      const mainRoster = t.players.slice(0, 5);
      const validEmbedded = mainRoster.filter((p: any) => p && p.nickname && p.nickname !== 'Пусто' && p.nickname.trim() !== '');
      if (validEmbedded.length > 0) {
        return validEmbedded.map((p, i) => {
          const lp = localPlayers.find((item: any) => 
            (p.id && item.id === p.id) || 
            (p.nickname && item.nickname && item.nickname.toLowerCase().trim() === p.nickname.toLowerCase().trim())
          );
          return {
            id: p.id || lp?.id || `p_${i}`,
            nickname: lp?.nickname || p.nickname || `Игрок ${i + 1}`,
            role: lp?.role || p.role || (i === 0 ? 'awper' : i === 1 ? 'entry' : i === 2 ? 'captain' : 'rifler'),
            rating: lp?.rating !== undefined && lp?.rating !== null ? Number(lp.rating) : (p.rating !== undefined && p?.rating !== null ? Number(p.rating) : 130)
          };
        });
      }
    }

    // 2. Lookup in local database
    const localTeams = JSON.parse(localStorage.getItem(`teams_${uid}`) || '[]');

    const foundTeam = localTeams.find((lt: any) => 
      (t.id && lt.id === t.id) || 
      (t.name && lt.name && lt.name.toLowerCase().trim() === t.name.toLowerCase().trim())
    );

    const teamId = foundTeam?.id || t.id;
    const teamName = foundTeam?.name || t.name;

    if (foundTeam?.players && Array.isArray(foundTeam.players)) {
      const mainRoster = foundTeam.players.slice(0, 5);
      const validEmbed = mainRoster.filter((p: any) => p && p.nickname && p.nickname !== 'Пусто' && p.nickname.trim() !== '');
      if (validEmbed.length > 0) {
        return validEmbed.map((p: any, i: number) => ({
          id: p.id || `p_${i}`,
          nickname: p.nickname || p.name || `Игрок ${i + 1}`,
          role: p.role || (i === 0 ? 'awper' : i === 1 ? 'entry' : i === 2 ? 'captain' : 'rifler'),
          rating: p.rating !== undefined && p.rating !== null ? Number(p.rating) : 130
        }));
      }
    }

    const matchingPlayers = localPlayers.filter((p: any) => 
      (teamId && p.teamId === teamId) ||
      (teamName && p.teamName && p.teamName.toLowerCase().trim() === teamName.toLowerCase().trim())
    );

    if (matchingPlayers.length > 0) {
      return matchingPlayers.slice(0, 5).map((p: any, i: number) => ({
        id: p.id || `p_${i}`,
        nickname: p.nickname || p.name || `Игрок ${i + 1}`,
        role: p.role || (i === 0 ? 'awper' : i === 1 ? 'entry' : i === 2 ? 'captain' : 'rifler'),
        rating: p.rating !== undefined && p.rating !== null ? Number(p.rating) : 130
      }));
    }

    return [1, 2, 3, 4, 5].map(i => ({
      id: `p_${i}`,
      nickname: `${t.name || 'Игрок'} #${i}`,
      role: i === 1 ? 'awper' : i === 2 ? 'entry' : i === 3 ? 'captain' : 'rifler',
      rating: 130
    }));
  };

  const handleSimulate = async () => {
    setSimulating(true);

    const pickedMapNames = vetoPicked.map(p => {
        const m = MAP_POOL.find(map => map.id === p.mapId);
        return m ? m.name : p.mapId;
    });

    let mapsToSim = [...pickedMapNames];
    if (mapsToSim.length < bo) {
        const allMaps = MAP_POOL.map(m => m.name);
        const available = allMaps.filter(m => !mapsToSim.includes(m));
        const needed = bo - mapsToSim.length;
        mapsToSim = [...mapsToSim, ...available.slice(0, needed)];
    }

    const t1P = preparePlayers(team1);
    const t2P = preparePlayers(team2);

    setTimeout(() => {
        const result = simulateMatchSeries(
            t1P,
            t2P,
            100,
            100,
            'Balanced',
            'Balanced',
            mapsToSim,
            `BO${bo}`,
            game === 'cs2',
            'Турнирный Матч'
        );

        // Override default Team 1/2 names in stats with actual team names
        result.team1Name = team1.name;
        result.team2Name = team2.name;

        setSimulationResult(result);
        setSimulating(false);
    }, 400);
  };

  const handleApplyResult = () => {
    if (!simulationResult) return;

    // Save match to local matches array
    const uid = user?.uid || 'guest';
    const localTourneys = JSON.parse(localStorage.getItem(`tournaments_${uid}`) || '[]');
    const tourney = localTourneys.find((t: any) => t.id === tournamentId);

    const existingMatches = JSON.parse(localStorage.getItem(`matches_${uid}`) || '[]');
    const newMatchRecord = {
      id: `tourn_m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: new Date().toISOString(),
      tournamentId: tournamentId,
      tournamentName: tourney?.name || 'Турнирный матч',
      team1Name: team1.name,
      team2Name: team2.name,
      team1Score: simulationResult.team1Score,
      team2Score: simulationResult.team2Score,
      score1: simulationResult.team1Score,
      score2: simulationResult.team2Score,
      team1Stats: simulationResult.team1Stats,
      team2Stats: simulationResult.team2Stats,
      maps: simulationResult.maps,
      mvp: simulationResult.mvp,
      bo: bo,
      format: `BO${bo}`
    };

    saveMatchesToLocalStorage(uid, [newMatchRecord, ...existingMatches]);

    onMatchComplete(simulationResult.team1Score, simulationResult.team2Score);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
            <span className="text-purple-400">🎮 Матч в реальном времени:</span> {team1.name} vs {team2.name}
          </h2>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white bg-white/5 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
            {/* If simulation completed, display match results view */}
            {simulationResult ? (
                <div className="flex flex-col gap-6 animate-fade-in">
                    {/* Winner Banner */}
                    <div className="bg-gradient-to-r from-purple-900/40 via-purple-600/30 to-purple-900/40 border border-purple-500/40 rounded-2xl p-6 text-center flex flex-col items-center shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                        <Trophy className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
                        <div className="text-xs font-black uppercase text-purple-300 tracking-widest mb-1">Результат матча</div>
                        <div className="text-3xl font-black text-white tracking-tight flex items-center gap-6 my-2">
                            <span className={simulationResult.team1Score > simulationResult.team2Score ? 'text-emerald-400' : 'text-white/70'}>
                                {team1.name}
                            </span>
                            <span className="px-4 py-1.5 bg-black/60 rounded-xl text-amber-400 border border-amber-400/30 text-2xl font-black">
                                {simulationResult.team1Score} : {simulationResult.team2Score}
                            </span>
                            <span className={simulationResult.team2Score > simulationResult.team1Score ? 'text-emerald-400' : 'text-white/70'}>
                                {team2.name}
                            </span>
                        </div>
                        <div className="text-sm font-bold text-emerald-400 uppercase tracking-wider mt-1">
                            Победитель: {simulationResult.team1Score > simulationResult.team2Score ? team1.name : team2.name}
                        </div>
                    </div>

                    {/* Maps breakdown */}
                    <div className="bg-black/30 border border-white/5 rounded-2xl p-5">
                        <h3 className="text-xs font-black text-white/50 uppercase tracking-widest mb-4">Счет по картам</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {simulationResult.maps.map((m: any, idx: number) => (
                                <div key={idx} className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex flex-col justify-between">
                                    <div className="text-xs font-black text-purple-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                                        <span>Карта {idx + 1}: {m.mapName}</span>
                                    </div>
                                    <div className="text-lg font-black text-white flex justify-between items-center">
                                        <span className={m.score1 > m.score2 ? 'text-emerald-400' : 'text-white/60'}>{m.score1}</span>
                                        <span className="text-white/20 text-xs font-mono">VS</span>
                                        <span className={m.score2 > m.score1 ? 'text-emerald-400' : 'text-white/60'}>{m.score2}</span>
                                    </div>
                                    <div className="text-[10px] font-bold text-white/40 mt-2 text-center">
                                        Победил: {m.score1 > m.score2 ? team1.name : team2.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                            onClick={handleApplyResult}
                            className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Check className="w-5 h-5" />
                            Внести результат в сетку турнира
                        </button>

                        <button
                            onClick={handleSimulate}
                            className="py-4 px-6 bg-white/10 hover:bg-white/20 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Переиграть
                        </button>
                    </div>
                </div>
            ) : (
                /* Veto & Simulation Launch View */
                <>
                    {vetoStage <= steps.length ? (
                        <div className="mb-6 flex flex-col items-center">
                            <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Ожидается действие:</div>
                            <div className="text-xl font-black text-white uppercase flex items-center gap-3">
                                <span className="text-purple-400 animate-pulse">●</span>
                                {steps[vetoStage - 1].teamIndex === 1 ? team1.name : team2.name}
                                <span className={`px-3 py-1 text-sm rounded-lg ${steps[vetoStage - 1].action === 'ban' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                                    {steps[vetoStage - 1].action === 'ban' ? 'БАН КАРТЫ' : 'ПИК КАРТЫ'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-6 flex flex-col items-center">
                            <div className="text-xl font-black text-green-400 uppercase">
                                🎉 Мап-вето завершено!
                            </div>
                            {!simulating ? (
                                <button onClick={handleSimulate} className="mt-4 px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-[0_0_25px_rgba(168,85,247,0.5)] flex items-center gap-2 cursor-pointer">
                                    <Play className="w-5 h-5" />
                                    Сыграть Матч
                                </button>
                            ) : (
                                <div className="mt-4 text-purple-400 font-black uppercase animate-pulse flex items-center gap-2">
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                    Идет расчет симуляции матча...
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {MAP_POOL.map(m => {
                            const isBanned = vetoBanned.includes(m.id);
                            const pickObj = vetoPicked.find(p => p.mapId === m.id);
                            const isPicked = !!pickObj;
                            let cardStyle = "border-white/5 bg-black/20 hover:border-white/20 cursor-pointer";
                            if (isBanned) {
                                cardStyle = "opacity-40 grayscale border-red-500/30 bg-red-950/10 pointer-events-none";
                            } else if (isPicked) {
                                cardStyle = "border-green-500/50 bg-green-950/20 shadow-[0_0_15px_rgba(34,197,94,0.1)] pointer-events-none";
                            } else if (vetoStage > steps.length) {
                                cardStyle = "opacity-30 pointer-events-none border-white/5 bg-black/10";
                            }
                            
                            return (
                                <div
                                    key={m.id}
                                    onClick={() => vetoStage <= steps.length && !isBanned && !isPicked && handleVetoAction(m.id)}
                                    style={{
                                      backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.9)), url('/maps/${m.name.toLowerCase()}.jpg')`,
                                      backgroundSize: 'cover',
                                      backgroundPosition: 'center'
                                    }}
                                    className={`relative flex flex-col h-32 rounded-xl border p-3 justify-between transition-all ${cardStyle}`}
                                >
                                    {isPicked && <div className="absolute inset-0 bg-green-500/20 rounded-xl pointer-events-none" />}
                                    {isBanned && <div className="absolute inset-0 bg-red-500/20 rounded-xl pointer-events-none" />}
                                    <div className="text-sm font-black tracking-widest text-white uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,1)] z-10">{m.name}</div>
                                    {isPicked && <div className="text-[10px] font-black text-green-400 bg-green-950/80 px-2 py-1 rounded w-fit z-10">PICK: {pickObj.pickedBy}</div>}
                                    {isBanned && <div className="text-[10px] font-black text-red-400 bg-red-950/80 px-2 py-1 rounded w-fit z-10">BANNED</div>}
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="mt-8 bg-black/30 border border-white/5 rounded-2xl p-4">
                        <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Журнал Мап-Вето</h4>
                        <div className="flex flex-col gap-1.5 font-mono text-[11px]">
                            {vetoLogs.map((log, idx) => (
                                <div key={idx} className="text-white/80 py-0.5 border-b border-white/[0.02] last:border-none">{log}</div>
                            ))}
                            {vetoLogs.length === 0 && <div className="text-white/20">Нажмите на карту для выбора БАНа / ПИКа</div>}
                        </div>
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  );
}
