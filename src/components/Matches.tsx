import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from '../firebase';
import { saveMatchesToLocalStorage } from '../lib/utils';
import { Calendar, Trophy, Crosshair, Trash2 } from 'lucide-react';
import MatchDetails from './MatchDetails';
import TeamLogo from './TeamLogo';

export default function Matches({ user }: { user: any }) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const fetchMatches = async () => {
      // 1. Load from localStorage immediately for high responsiveness
      const rawLocalMatches = JSON.parse(localStorage.getItem(`matches_${user.uid}`) || '[]');
      const localMatches = (rawLocalMatches || []).filter((m: any) => m !== null && m !== undefined).map((m: any) => ({
        ...m,
        team1Name: m.team1Name || m.team1?.name || (typeof m.team1 === 'string' ? m.team1 : '') || 'Команда 1',
        team2Name: m.team2Name || m.team2?.name || (typeof m.team2 === 'string' ? m.team2 : '') || 'Команда 2',
        team1Score: m.team1Score ?? m.score1 ?? (m.maps?.[0] ? (m.maps[0].team1Score ?? m.maps[0].score1 ?? 0) : 0),
        team2Score: m.team2Score ?? m.score2 ?? (m.maps?.[0] ? (m.maps[0].team2Score ?? m.maps[0].score2 ?? 0) : 0),
        gameMode: m.gameMode || 'cs2',
        format: m.format || (m.bo ? `BO${m.bo}` : 'BO1')
      }));
      setMatches(localMatches.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);

      try {
        if (user.isLocalDemo) {
          return;
        }
        const q = query(collection(db, 'matches'), where('userId', '==', user.uid));
        const qs = await getDocs(q);
        const dbMatches = qs.docs.map(d => {
          const m = d.data();
          return {
            ...m,
            id: d.id,
            team1Name: m.team1Name || m.team1?.name || (typeof m.team1 === 'string' ? m.team1 : '') || 'Команда 1',
            team2Name: m.team2Name || m.team2?.name || (typeof m.team2 === 'string' ? m.team2 : '') || 'Команда 2',
            team1Score: m.team1Score ?? m.score1 ?? (m.maps?.[0] ? (m.maps[0].team1Score ?? m.maps[0].score1 ?? 0) : 0),
            team2Score: m.team2Score ?? m.score2 ?? (m.maps?.[0] ? (m.maps[0].team2Score ?? m.maps[0].score2 ?? 0) : 0),
            gameMode: m.gameMode || 'cs2',
            format: m.format || (m.bo ? `BO${m.bo}` : 'BO1')
          };
        }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setMatches(dbMatches);
        try {
          saveMatchesToLocalStorage(user.uid, dbMatches);
        } catch (e) {}
      } catch (e) {
        console.warn("Using localStorage fallback for matches", e);
      }
    };
    fetchMatches();

    const handleDbUpdated = () => {
      fetchMatches();
    };

    window.addEventListener('db-user-updated', handleDbUpdated);

    return () => {
      window.removeEventListener('db-user-updated', handleDbUpdated);
    };
  }, [user]);

  const handleDelete = async (matchId: string) => {
    try {
      // Before deleting single match, ensure its stats are fully backed up in mapStats
      try {
        const { migrateMatchesToMapStats } = await import('../lib/mapStats');
        migrateMatchesToMapStats(user.uid, matches);
      } catch (e) {}

      if (user.isLocalDemo) {
        throw new Error("Local demo mode");
      }
      await deleteDoc(doc(db, 'matches', matchId));
    } catch (e) {
      console.warn("Fallback: deleting match locally", e);
    } finally {
      const filtered = matches.filter(m => m.id !== matchId);
      saveMatchesToLocalStorage(user.uid, filtered);
      setMatches(filtered);
      setConfirmingDelete(null);
      if (selectedMatch?.id === matchId) setSelectedMatch(null);
    }
  };

  const handleDeleteAll = async () => {
    try {
      // Migrate matches to map stats so maps winrate data is preserved separately forever
      try {
        const { migrateMatchesToMapStats } = await import('../lib/mapStats');
        migrateMatchesToMapStats(user.uid, matches);
      } catch (migrateErr) {
        console.error("Migration during delete all failed", migrateErr);
      }

      if (user.isLocalDemo) {
        throw new Error("Local demo mode");
      }

      // Delete matches from Firestore
      const q = query(collection(db, 'matches'), where('userId', '==', user.uid));
      const qs = await getDocs(q);
      const batchPromises = qs.docs.map(d => deleteDoc(doc(db, 'matches', d.id)));
      await Promise.all(batchPromises);
    } catch (e) {
      console.warn("Fallback: deleting matches locally", e);
    } finally {
      // Clear in localStorage
      saveMatchesToLocalStorage(user.uid, []);
      setMatches([]);
      setConfirmingDeleteAll(false);
      setSelectedMatch(null);
      // Trigger update event to notify components
      window.dispatchEvent(new Event('db-user-updated'));
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/50 gap-4">
        <Calendar className="w-16 h-16" />
        <h2 className="text-xl font-bold">Войдите, чтобы просматривать историю матчей.</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {selectedMatch && (
        <MatchDetails match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      )}
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-2xl p-8 border border-white/10 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 uppercase tracking-widest flex items-center gap-3">
              <Calendar className="text-blue-400" />
              История матчей
            </h1>
            <p className="text-white/60 text-sm mt-2 font-medium">Сводка по всем симулированным играм и результатам</p>
          </div>
          
          <div className="flex gap-2">
          {matches.length > 0 && (
            <div className="relative">
              {confirmingDeleteAll ? (
                <div className="flex flex-col md:flex-row items-center gap-3 bg-[#13131c] p-3 rounded-xl border border-red-500/30 shadow-lg animate-fade-in z-20">
                  <span className="text-xs text-red-400 font-bold px-2 text-center">
                    Удалить ВСЕ матчи? Винрейт карт сохранится отдельно.
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleDeleteAll} 
                      className="px-3 py-1.5 bg-red-500/20 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500/40 transition-colors cursor-pointer"
                    >
                      Да, удалить
                    </button>
                    <button 
                      onClick={() => setConfirmingDeleteAll(false)} 
                      className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setConfirmingDeleteAll(true)}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl font-bold text-sm transition-colors border border-red-500/20 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  УДАЛИТЬ ВСЕ МАТЧИ
                </button>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-blue-400/50 p-8 text-center font-bold animate-pulse">Загрузка истории...</div>
      ) : matches.length === 0 ? (
        <div className="text-white/30 p-12 text-center font-bold bg-[#12121a] rounded-2xl border border-white/5">
          <Crosshair className="w-12 h-12 mx-auto mb-4 opacity-50" />
          Пока нет сыгранных матчей. Перейдите в симулятор, чтобы начать!
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 animate-fade-in">
            {matches.map((m, i) => {
              const isBO1 = m.bo === 1 || m.bo === '1' || m.format === 'BO1' || (m.maps && m.maps.length === 1);
              const actualT1Score = (isBO1 && m.maps?.length > 0) ? m.maps[0].team1Score : m.team1Score;
              const actualT2Score = (isBO1 && m.maps?.length > 0) ? m.maps[0].team2Score : m.team2Score;
              const t1Wins = actualT1Score > actualT2Score;
              const t2Wins = actualT2Score > actualT1Score;
              
              return (
                <div key={m.id || i} onClick={() => setSelectedMatch(m)} className="cursor-pointer group bg-gradient-to-r from-[#161622] to-[#1a1a24] rounded-2xl border border-white/5 hover:border-white/20 transition-all duration-300 overflow-hidden shadow-md hover:shadow-xl hover:shadow-blue-500/5">
                  <div className="flex flex-col md:flex-row">
                    {/* Info Section */}
                    <div className="p-5 md:w-1/4 border-b md:border-b-0 md:border-r border-white/5 flex flex-col justify-center bg-black/20">
                      <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">
                        {new Date(m.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {m.gameMode === 'cs2' ? 'CS2' : 'CS:GO'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          {m.format}
                        </span>
                      </div>
                      {m.tournamentName && (
                        <div className="mt-3 text-sm font-semibold text-white/70 flex items-center gap-2">
                          <Trophy className="w-3 h-3 text-yellow-500" />
                          {m.tournamentName}
                        </div>
                      )}
                    </div>
                    
                    {/* Score Section */}
                    <div className="p-6 md:w-1/2 flex items-center justify-between relative">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setConfirmingDelete(m.id); }}
                        className="absolute top-2 right-2 p-2 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Удалить матч"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      
                      {confirmingDelete === m.id && (
                        <div className="absolute top-2 right-12 flex items-center gap-2 bg-[#1a1a24] p-1 rounded-lg border border-red-500/30 z-10 shadow-lg" onClick={(e) => e.stopPropagation()}>
                           <span className="text-xs text-red-400 font-bold px-2">Удалить?</span>
                           <button onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }} className="px-2 py-1 bg-red-500/20 text-red-500 rounded text-xs font-bold hover:bg-red-500/40 cursor-pointer">Да</button>
                           <button onClick={(e) => { e.stopPropagation(); setConfirmingDelete(null); }} className="px-2 py-1 bg-white/10 text-white rounded text-xs font-bold hover:bg-white/20 cursor-pointer">Нет</button>
                        </div>
                      )}
                      
                      <div className={`flex-1 text-right ${t1Wins ? 'text-white font-black drop-shadow-[0_0_10px_rgba(255,143,0,0.5)]' : 'text-white/50 font-bold'}`}>
                        <div className="flex items-center justify-end gap-2.5">
                          <div className={`text-xl ${t1Wins ? 'text-[#ff8f00]' : ''}`}>{m.team1Name}</div>
                          <TeamLogo teamName={m.team1Name} sizeClassName="w-8 h-8 text-xs" />
                        </div>
                      </div>
                      
                      <div className="px-8 flex flex-col items-center">
                        <div className="text-3xl font-black tracking-widest flex items-center gap-2">
                          <span className={t1Wins ? 'text-[#ff8f00]' : 'text-white/50'}>{actualT1Score}</span>
                          <span className="text-white/20 text-xl">:</span>
                          <span className={t2Wins ? 'text-blue-400' : 'text-white/50'}>{actualT2Score}</span>
                        </div>
                      </div>
                      
                      <div className={`flex-1 text-left ${t2Wins ? 'text-white font-black drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'text-white/50 font-bold'}`}>
                        <div className="flex items-center justify-start gap-2.5">
                          <TeamLogo teamName={m.team2Name} sizeClassName="w-8 h-8 text-xs" />
                          <div className={`text-xl ${t2Wins ? 'text-blue-400' : ''}`}>{m.team2Name}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* MVP Section */}
                    <div className="p-5 md:w-1/4 flex flex-col justify-center items-center md:items-end border-t md:border-t-0 md:border-l border-white/5 bg-gradient-to-l from-yellow-500/5 to-transparent">
                      {m.mvp ? (
                        <div className="flex flex-col items-center md:items-end group-hover:scale-105 transition-transform">
                          <div className="text-[10px] font-black text-yellow-500/80 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> MVP МАТЧА
                          </div>
                          <div className="font-bold text-white text-lg">{m.mvp.nickname}</div>
                          <div className="text-xs font-semibold text-white/50 mt-1">
                            Рейтинг: <span className="text-yellow-400 font-black">{m.mvp.hltvRating}</span>
                          </div>
                          <div className="text-[10px] text-white/30 mt-0.5">
                            {m.mvp.kills}K / {m.mvp.deaths}D
                          </div>
                        </div>
                      ) : (
                        <div className="text-white/20 text-xs font-semibold uppercase tracking-widest">
                          Нет данных MVP
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
