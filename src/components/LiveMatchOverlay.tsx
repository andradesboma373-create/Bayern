import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TeamLogo from './TeamLogo';

interface LiveMatchOverlayProps {
    matchResult: any;
    game?: string;
    onComplete: () => void;
}

const getMapBg = (mapName?: string, game?: string) => {
    if (!mapName) return '/maps/cs2/mirage.jpg';
    const clean = mapName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isSo2 = game === 'so2' || ['breeze', 'dune', 'hanami', 'prison', 'province', 'rust', 'sandstone', 'sakura'].includes(clean);
    const folder = isSo2 ? 'so2' : 'cs2';
    return `/maps/${folder}/${clean}.jpg`;
};

export default function LiveMatchOverlay({ matchResult, game = 'cs2', onComplete }: LiveMatchOverlayProps) {
    const [mapIndex, setMapIndex] = useState(0);
    const [roundIndex, setRoundIndex] = useState(0);
    const [t1Score, setT1Score] = useState(0);
    const [t2Score, setT2Score] = useState(0);
    const [seriesT1, setSeriesT1] = useState(0);
    const [seriesT2, setSeriesT2] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [speedMultiplier, setSpeedMultiplier] = useState(1);

    useEffect(() => {
        if (!matchResult || !matchResult.maps || matchResult.maps.length === 0) {
            onComplete();
            return;
        }

        let currentMap = 0;
        let currentRound = 0;
        let sT1 = 0;
        let sT2 = 0;

        // Build simulated rounds for map if roundLogs missing or empty
        const getMapRounds = (m: any) => {
            if (Array.isArray(m?.roundLogs) && m.roundLogs.length > 0) {
                return m.roundLogs;
            }
            const s1 = m?.team1Score ?? m?.score1 ?? 13;
            const s2 = m?.team2Score ?? m?.score2 ?? 8;
            const total = Math.max(1, s1 + s2);
            const synthesized: any[] = [];
            let cur1 = 0;
            let cur2 = 0;
            for (let r = 1; r <= total; r++) {
                if (cur1 < s1 && (cur2 >= s2 || Math.random() < s1 / total)) {
                    cur1++;
                } else if (cur2 < s2) {
                    cur2++;
                } else {
                    cur1++;
                }
                synthesized.push({ t1Score: cur1, t2Score: cur2, round: r });
            }
            return synthesized;
        };

        let activeRounds = getMapRounds(matchResult.maps[0]);

        const tickInterval = Math.max(30, Math.floor(80 / speedMultiplier));
        const interval = setInterval(() => {
            if (currentMap >= matchResult.maps.length) {
                clearInterval(interval);
                setIsFinished(true);
                setTimeout(onComplete, 600);
                return;
            }

            const map = matchResult.maps[currentMap];
            if (!activeRounds || currentRound >= activeRounds.length) {
                // Map finished, record series score
                const finalS1 = map.team1Score ?? map.score1 ?? t1Score;
                const finalS2 = map.team2Score ?? map.score2 ?? t2Score;
                if (finalS1 > finalS2) sT1++;
                else if (finalS2 > finalS1) sT2++;

                setSeriesT1(sT1);
                setSeriesT2(sT2);

                currentMap++;
                if (currentMap < matchResult.maps.length) {
                    currentRound = 0;
                    setT1Score(0);
                    setT2Score(0);
                    setMapIndex(currentMap);
                    activeRounds = getMapRounds(matchResult.maps[currentMap]);
                } else {
                    clearInterval(interval);
                    setIsFinished(true);
                    setTimeout(onComplete, 700);
                }
                return;
            }

            const log = activeRounds[currentRound];
            setT1Score(log.t1Score ?? currentRound);
            setT2Score(log.t2Score ?? 0);
            setRoundIndex(currentRound + 1);
            currentRound++;

        }, tickInterval);

        return () => clearInterval(interval);
    }, [matchResult, speedMultiplier]);

    if (!matchResult) return null;

    const team1Name = matchResult.team1Name || 'Team 1';
    const team2Name = matchResult.team2Name || 'Team 2';
    const maps = matchResult.maps || [];
    const currentMapData = maps[mapIndex];
    const mapName = currentMapData?.mapName || currentMapData?.name || `Карта ${mapIndex + 1}`;
    const bgUrl = getMapBg(mapName, game);

    return (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center p-4 backdrop-blur-2xl overflow-hidden select-none">
            {/* Background Map with Parallax Glow */}
            <div 
                className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-105 opacity-25 pointer-events-none filter blur-sm"
                style={{ backgroundImage: `url('${bgUrl}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90 pointer-events-none" />

            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative z-10 w-full max-w-4xl flex flex-col items-center gap-6"
            >
                {/* Header title */}
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-xs font-black uppercase tracking-widest mb-2 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                        LIVE СИМУЛЯЦИЯ МАТЧА
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                        {matchResult.tournamentName || 'Турнирный матч'}
                    </h2>
                    <p className="text-white/50 text-xs mt-1 font-bold tracking-widest uppercase">
                        Формат: {matchResult.format || (matchResult.bo ? `BO${matchResult.bo}` : 'BO1')} • {maps.length} {maps.length === 1 ? 'карта' : 'карты'}
                    </p>
                </div>

                {/* Scoreboard Card */}
                <div className="w-full bg-zinc-950/80 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between gap-4 w-full">
                        {/* Team 1 */}
                        <div className="flex flex-col items-center sm:items-end gap-2 flex-1 text-center sm:text-right">
                            <TeamLogo game={game === 'so2' ? 'so2' : 'cs2'} teamName={team1Name} sizeClassName="w-16 h-16 sm:w-20 sm:h-20 text-3xl" />
                            <div className="text-xl sm:text-2xl font-black text-white truncate max-w-[200px] mt-1">{team1Name}</div>
                            <div className="text-5xl sm:text-7xl font-black text-blue-400 font-mono tracking-tighter drop-shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                                {t1Score}
                            </div>
                        </div>

                        {/* Center Map & Series Info */}
                        <div className="flex flex-col items-center gap-3 px-4 sm:px-8 border-x border-white/10 shrink-0">
                            <span className="text-[10px] sm:text-xs font-black text-white/40 uppercase tracking-widest">
                                {mapIndex < maps.length ? `Карта ${mapIndex + 1} из ${maps.length}` : 'Итог серии'}
                            </span>
                            
                            <div className="px-5 py-2 rounded-2xl bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-blue-600/30 border border-blue-500/40 text-center shadow-lg">
                                <span className="text-sm sm:text-lg font-black text-white uppercase tracking-wider block">
                                    {mapName}
                                </span>
                            </div>

                            {matchResult.bo > 1 && (
                                <div className="text-xs sm:text-sm font-black text-amber-400 bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-full tracking-widest">
                                    СЕРИЯ: {seriesT1} — {seriesT2}
                                </div>
                            )}

                            <div className="text-[11px] font-bold text-white/60 tracking-wider">
                                {roundIndex > 0 ? `Раунд ${roundIndex}` : 'Разминка...'}
                            </div>
                        </div>

                        {/* Team 2 */}
                        <div className="flex flex-col items-center sm:items-start gap-2 flex-1 text-center sm:text-left">
                            <TeamLogo game={game === 'so2' ? 'so2' : 'cs2'} teamName={team2Name} sizeClassName="w-16 h-16 sm:w-20 sm:h-20 text-3xl" />
                            <div className="text-xl sm:text-2xl font-black text-white truncate max-w-[200px] mt-1">{team2Name}</div>
                            <div className="text-5xl sm:text-7xl font-black text-orange-400 font-mono tracking-tighter drop-shadow-[0_0_20px_rgba(249,115,22,0.4)]">
                                {t2Score}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Series Maps Strip */}
                {maps.length > 0 && (
                    <div className="w-full flex items-center justify-center gap-3 flex-wrap">
                        {maps.map((m: any, idx: number) => {
                            const isCurrent = idx === mapIndex;
                            const isPast = idx < mapIndex;
                            const mapFinalS1 = m.team1Score ?? m.score1 ?? 0;
                            const mapFinalS2 = m.team2Score ?? m.score2 ?? 0;
                            const mName = m.mapName || m.name || `Карта ${idx + 1}`;
                            const thumbUrl = getMapBg(mName, game);

                            return (
                                <div 
                                    key={idx}
                                    style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.9)), url('${thumbUrl}')` }}
                                    className={`relative w-36 h-20 rounded-2xl bg-cover bg-center border p-2 flex flex-col justify-between transition-all overflow-hidden ${
                                        isCurrent 
                                            ? 'border-blue-400 ring-2 ring-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.3)] scale-105' 
                                            : isPast 
                                            ? 'border-emerald-500/40 opacity-90' 
                                            : 'border-white/10 opacity-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-white/80">
                                        <span className="truncate">{mName}</span>
                                        {isCurrent && <span className="text-blue-400 text-[8px] animate-pulse">● LIVE</span>}
                                        {isPast && <span className="text-emerald-400 text-[8px]">✓ СЫГРАНО</span>}
                                    </div>
                                    <div className="text-center font-black text-lg text-white font-mono">
                                        {isPast ? `${mapFinalS1} : ${mapFinalS2}` : isCurrent ? `${t1Score} : ${t2Score}` : '— : —'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Control Actions */}
                <div className="flex items-center gap-3 mt-2">
                    <button
                        type="button"
                        onClick={() => setSpeedMultiplier(prev => (prev === 1 ? 2 : prev === 2 ? 4 : 1))}
                        className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all border border-white/10 flex items-center gap-2 cursor-pointer"
                    >
                        ⚡ Скорость: {speedMultiplier}x
                    </button>

                    <button
                        type="button"
                        onClick={onComplete}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                        ⏩ Пропустить (Показать результаты)
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
