import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MAP_POOL_CS2, MAP_POOL_S2 } from '../lib/simulation';
import PlayerAvatar from './PlayerAvatar';

interface VetoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (maps: string[]) => void;
  team1: any[];
  team2: any[];
  team1Name: string;
  team2Name: string;
  team1MapExp: Record<string, number>;
  team2MapExp: Record<string, number>;
  format: string;
  game: string;
}

type VetoAction = {
  type: 'BAN' | 'PICK' | 'DECIDER';
  team: 1 | 2 | null;
  mapId: string;
  mapName: string;
};

const VetoModal: React.FC<VetoModalProps> = ({
  isOpen, onClose, onComplete, team1, team2, team1Name, team2Name, team1MapExp, team2MapExp, format, game
}) => {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [actions, setActions] = useState<VetoAction[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [availableMaps, setAvailableMaps] = useState<{id: string, name: string}[]>([]);
  
  const captain1 = team1.find(p => p.role === 'captain' || p.role === 'igl') || team1[0];
  const captain2 = team2.find(p => p.role === 'captain' || p.role === 'igl') || team2[0];

  const phases = React.useMemo(() => {
    const totalMaps = game === 'cs2' ? 7 : 6;
    if (totalMaps === 7) {
      if (format === 'BO1') return ['T1_BAN', 'T2_BAN', 'T1_BAN', 'T2_BAN', 'T1_BAN', 'T2_BAN', 'DECIDER'];
      if (format === 'BO3') return ['T1_BAN', 'T2_BAN', 'T1_PICK', 'T2_PICK', 'T1_BAN', 'T2_BAN', 'DECIDER'];
      return ['T1_BAN', 'T2_BAN', 'T1_PICK', 'T2_PICK', 'T1_PICK', 'T2_PICK', 'DECIDER'];
    } else {
      if (format === 'BO1') return ['T1_BAN', 'T2_BAN', 'T1_BAN', 'T2_BAN', 'T1_BAN', 'DECIDER'];
      if (format === 'BO3') return ['T1_BAN', 'T2_BAN', 'T1_PICK', 'T2_PICK', 'T1_BAN', 'DECIDER'];
      return ['T1_BAN', 'T1_PICK', 'T2_PICK', 'T1_PICK', 'T2_PICK', 'DECIDER'];
    }
  }, [format, game]);

  // Initialize pool
  useEffect(() => {
    if (isOpen) {
      setPhaseIndex(0);
      setActions([]);
      setIsFinished(false);
      setAvailableMaps(game === 'cs2' ? MAP_POOL_CS2.map(m => ({id: m.id, name: m.name})) : MAP_POOL_S2.map(m => ({id: m.id, name: m.name})));
    }
  }, [isOpen, game]);

  // Run Veto logic
  useEffect(() => {
    if (!isOpen || isFinished) return;

    if (phaseIndex >= phases.length || availableMaps.length === 0) {
      setIsFinished(true);
      return;
    }

    const timer = setTimeout(() => {
      const currentPhase = phases[phaseIndex];
      let chosenMap: {id: string, name: string} | null = null;
      let actionType: 'BAN' | 'PICK' | 'DECIDER' = 'BAN';
      let teamNum: 1 | 2 | null = null;

      if (currentPhase === 'DECIDER') {
        chosenMap = availableMaps[0];
        actionType = 'DECIDER';
      } else {
        teamNum = currentPhase.startsWith('T1') ? 1 : 2;
        actionType = currentPhase.includes('BAN') ? 'BAN' : 'PICK';
        
        // Find best map based on logic
        let bestScore = -999999;
        
        availableMaps.forEach(m => {
          const t1Exp = team1MapExp[m.name] || 50;
          const t2Exp = team2MapExp[m.name] || 50;
          const noise = Math.random() * 10 - 5; // -5 to +5
          
          let score = 0;
          if (teamNum === 1) {
            if (actionType === 'PICK') score = (t1Exp - t2Exp) + noise;
            if (actionType === 'BAN') score = (t2Exp - t1Exp) + noise; // highest T2 advantage
          } else {
            if (actionType === 'PICK') score = (t2Exp - t1Exp) + noise;
            if (actionType === 'BAN') score = (t1Exp - t2Exp) + noise; // highest T1 advantage
          }
          
          if (score > bestScore) {
            bestScore = score;
            chosenMap = m;
          }
        });
      }

      if (chosenMap) {
        const m = chosenMap; // for ts
        setActions(prev => [...prev, {
          type: actionType,
          team: teamNum,
          mapId: m.id,
          mapName: m.name
        }]);
        setAvailableMaps(prev => prev.filter(x => x.id !== m.id));
        setPhaseIndex(prev => prev + 1);
      }
    }, 1500); // 1.5s per action

    return () => clearTimeout(timer);
  }, [isOpen, phaseIndex, availableMaps, phases, isFinished, team1MapExp, team2MapExp]);

  if (!isOpen) return null;

  const handleApply = () => {
    // Collect picked and decider maps
    const selected = actions.filter(a => a.type === 'PICK' || a.type === 'DECIDER').map(a => a.mapName);
    onComplete(selected);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[90vh] md:h-[80vh]">
        {/* Header */}
        <div className="p-6 bg-white/5 border-b border-white/5 text-center relative shrink-0">
          <h2 className="text-2xl font-black text-white tracking-widest uppercase">Процесс Вето</h2>
          <p className="text-white/50 text-xs font-bold mt-1 uppercase tracking-widest">Формат: {format}</p>
          <button onClick={onClose} className="absolute right-6 top-6 text-white/50 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-8 relative">
          {/* Captains vs */}
          <div className="flex justify-between items-center w-full max-w-3xl mx-auto">
            {/* Captain 1 */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-[#ff8f00] shadow-[0_0_20px_rgba(255,143,0,0.3)] bg-black overflow-hidden flex items-center justify-center">
                {captain1 ? (
                  <PlayerAvatar playerName={captain1?.nickname || 'Unknown'} avatarUrl={captain1?.avatarUrl} game={game as 'cs2'|'s2'} sizeClassName="w-full h-full text-5xl" />
                ) : (
                  <div className="text-white/20 text-4xl font-black">?</div>
                )}
              </div>
              <div className="text-center">
                <div className="text-[#ff8f00] font-black text-xl uppercase">{team1Name || 'Team 1'}</div>
                <div className="text-white/50 text-sm">{captain1?.nickname || 'Captain'}</div>
              </div>
            </div>

            <div className="text-4xl font-black text-white/20 italic">VS</div>

            {/* Captain 2 */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-black overflow-hidden flex items-center justify-center">
                {captain2 ? (
                  <PlayerAvatar playerName={captain2?.nickname || 'Unknown'} avatarUrl={captain2?.avatarUrl} game={game as 'cs2'|'s2'} sizeClassName="w-full h-full text-5xl" />
                ) : (
                  <div className="text-white/20 text-4xl font-black">?</div>
                )}
              </div>
              <div className="text-center">
                <div className="text-blue-500 font-black text-xl uppercase">{team2Name || 'Team 2'}</div>
                <div className="text-white/50 text-sm">{captain2?.nickname || 'Captain'}</div>
              </div>
            </div>
          </div>

          {/* Actions Log */}
          <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-4">
            <AnimatePresence>
              {(game === 'cs2' ? MAP_POOL_CS2 : MAP_POOL_S2).map((m, idx) => {
                const action = actions.find(a => a.mapId === m.id);
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 ${
                      !action ? 'border-white/10 opacity-50' :
                      action.type === 'BAN' ? 'border-red-500/50' :
                      action.type === 'PICK' ? (action.team === 1 ? 'border-[#ff8f00]' : 'border-blue-500') :
                      'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                    }`}
                  >
                    <div 
                      className={`absolute inset-0 bg-cover bg-center ${action?.type === 'BAN' ? 'grayscale opacity-30' : ''}`} 
                      style={{ backgroundImage: `url('/maps/${m.name.toLowerCase()}.jpg')` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-3">
                      <div className="text-center font-bold text-white text-sm mb-1">{m.name}</div>
                      {action && (
                        <motion.div 
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className={`text-[10px] font-black uppercase tracking-wider text-center py-1 rounded ${
                            action.type === 'BAN' ? 'bg-red-500/20 text-red-500' :
                            action.type === 'DECIDER' ? 'bg-purple-500/20 text-purple-400' :
                            action.team === 1 ? 'bg-[#ff8f00]/20 text-[#ff8f00]' : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {action.type === 'BAN' ? `BAN ${action.team === 1 ? 'T1' : 'T2'}` :
                           action.type === 'PICK' ? `PICK ${action.team === 1 ? 'T1' : 'T2'}` : 'DECIDER'}
                        </motion.div>
                      )}
                    </div>
                    {action?.type === 'BAN' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-1 bg-red-600 rotate-45 absolute" />
                        <div className="w-full h-1 bg-red-600 -rotate-45 absolute" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          
          {!isFinished && (
            <div className="mt-8 flex items-center gap-3 text-white/50 animate-pulse">
              <div className="w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-bold uppercase tracking-widest">
                {phases[phaseIndex]?.includes('BAN') ? 'Ожидание бана...' : 
                 phases[phaseIndex]?.includes('PICK') ? 'Ожидание пика...' : 'Определение десайдера...'}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white/5 border-t border-white/5 flex justify-end gap-4 shrink-0">
          <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors">
            ОТМЕНА
          </button>
          <button 
            onClick={handleApply}
            disabled={!isFinished}
            className={`px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${
              isFinished 
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' 
                : 'bg-white/5 text-white/20 cursor-not-allowed'
            }`}
          >
            ПРИМЕНИТЬ КАРТЫ
          </button>
        </div>
      </div>
    </div>
  );
};

export default VetoModal;
