import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveMatchOverlayProps {
    matchResult: any;
    onComplete: () => void;
}

export default function LiveMatchOverlay({ matchResult, onComplete }: LiveMatchOverlayProps) {
    const [mapIndex, setMapIndex] = useState(0);
    const [roundIndex, setRoundIndex] = useState(0);
    const [t1Score, setT1Score] = useState(0);
    const [t2Score, setT2Score] = useState(0);
    const [seriesT1, setSeriesT1] = useState(0);
    const [seriesT2, setSeriesT2] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        if (!matchResult || !matchResult.maps || matchResult.maps.length === 0) {
            onComplete();
            return;
        }

        let currentMap = 0;
        let currentRound = 0;
        let sT1 = 0;
        let sT2 = 0;

        const interval = setInterval(() => {
            if (currentMap >= matchResult.maps.length) {
                clearInterval(interval);
                setIsFinished(true);
                setTimeout(onComplete, 1200);
                return;
            }

            const map = matchResult.maps[currentMap];
            if (!map.roundLogs || currentRound >= map.roundLogs.length) {
                // Map finished
                if (map.winner === 1) sT1++;
                if (map.winner === 2) sT2++;
                setSeriesT1(sT1);
                setSeriesT2(sT2);
                
                currentMap++;
                currentRound = 0;
                setT1Score(0);
                setT2Score(0);
                setMapIndex(currentMap);
                
                // If series is won (BO3 -> 2 wins, BO5 -> 3 wins) we can stop if we want, but matchResult already only contains played maps
                return;
            }

            const log = map.roundLogs[currentRound];
            setT1Score(log.t1Score);
            setT2Score(log.t2Score);
            setRoundIndex(currentRound + 1);
            currentRound++;

        }, 400); // Speed of rounds ticking

        return () => clearInterval(interval);
    }, [matchResult]);

    if (!matchResult) return null;

    const team1Name = matchResult.team1Name || 'Team 1';
    const team2Name = matchResult.team2Name || 'Team 2';
    const currentMapData = matchResult.maps[mapIndex];
    const mapName = currentMapData ? currentMapData.mapName : 'Завершение...';

    return (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center p-4 backdrop-blur-xl">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-4xl flex flex-col items-center gap-8"
            >
                {/* Title */}
                <div className="text-center">
                    <h2 className="text-3xl font-black text-white uppercase tracking-widest bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                        LIVE СИМУЛЯЦИЯ
                    </h2>
                    <p className="text-white/50 text-sm mt-2 tracking-widest uppercase">
                        {matchResult.tournamentName || 'Матч'} • {matchResult.format}
                    </p>
                </div>

                {/* Scoreboard */}
                <div className="flex items-center justify-center gap-8 w-full">
                    {/* Team 1 */}
                    <div className="flex flex-col items-end gap-2 flex-1">
                        <div className="text-4xl font-black text-white truncate max-w-[200px]">{team1Name}</div>
                        <div className="text-6xl font-black text-blue-400">{t1Score}</div>
                    </div>

                    {/* Center Info */}
                    <div className="flex flex-col items-center gap-4 px-8 border-x border-white/10">
                        <div className="text-sm font-bold text-white/50 uppercase tracking-widest">
                            {mapIndex < matchResult.maps.length ? `Карта ${mapIndex + 1}` : 'Итог'}
                        </div>
                        <div className="text-2xl font-black text-white px-6 py-2 bg-white/5 rounded-xl border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                            {mapName}
                        </div>
                        {matchResult.bo > 1 && (
                            <div className="text-sm font-black text-white/70 bg-black/50 px-4 py-1 rounded-full border border-white/10">
                                СЧЕТ В СЕРИИ: {seriesT1} - {seriesT2}
                            </div>
                        )}
                    </div>

                    {/* Team 2 */}
                    <div className="flex flex-col items-start gap-2 flex-1">
                        <div className="text-4xl font-black text-white truncate max-w-[200px]">{team2Name}</div>
                        <div className="text-6xl font-black text-orange-400">{t2Score}</div>
                    </div>
                </div>

                {/* Logs / Flavour text */}
                <div className="h-12 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        {!isFinished ? (
                            <motion.div
                                key={roundIndex}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.1 }}
                                className="text-white/60 font-medium"
                            >
                                Раунд {roundIndex}...
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-green-400 font-black text-xl uppercase tracking-widest"
                            >
                                МАТЧ ЗАВЕРШЕН
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Skip Button */}
                <button
                    onClick={onComplete}
                    className="mt-8 px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/50 hover:text-white font-bold tracking-widest uppercase transition-all"
                >
                    Пропустить (Skip)
                </button>
            </motion.div>
        </div>
    );
}
