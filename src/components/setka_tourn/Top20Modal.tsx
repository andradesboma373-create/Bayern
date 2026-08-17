import React, { useMemo, useState, useRef } from 'react';
import { X, Trophy, Download, Award, Trash2, Calendar, Crosshair } from 'lucide-react';
import { toPng } from 'html-to-image';
import TeamLogo from '../TeamLogo';
import PlayerAvatar from '../PlayerAvatar';
import FinalistsModal from './FinalistsModal';
import MvpModal from './MvpModal';
import PlayerProfileModal from '../PlayerProfileModal';
import { loadTournaments } from './storage';
import { db, doc, deleteDoc } from '../../firebase';

interface Props {
  user: any;
  tournamentId: string;
  onClose: () => void;
}

export default function Top20Modal({ user, tournamentId, onClose }: Props) {
  const [showFinalists, setShowFinalists] = useState(false);
  const [showMvpModal, setShowMvpModal] = useState(false);
  const [selectedProfilePlayer, setSelectedProfilePlayer] = useState<any | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'matches'>('stats');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [confirmingDeleteMatch, setConfirmingDeleteMatch] = useState<string | null>(null);
  const top20Ref = useRef<HTMLDivElement>(null);

  const handleDeleteMatch = async (matchId: string) => {
    try {
      if (user?.isLocalDemo) {
        throw new Error("Local demo mode");
      }
      await deleteDoc(doc(db, 'matches', matchId));
    } catch (e) {
      console.warn("Fallback: deleting match locally", e);
    } finally {
      const uid = user?.uid || 'guest';
      const localMatches = JSON.parse(localStorage.getItem(`matches_${uid}`) || '[]');
      const filtered = localMatches.filter((m: any) => m.id !== matchId);
      localStorage.setItem(`matches_${uid}`, JSON.stringify(filtered));
      setConfirmingDeleteMatch(null);
      setRefreshTrigger(prev => prev + 1);
      window.dispatchEvent(new Event('db-user-updated'));
    }
  };

  const handleDownloadTop20 = async () => {
    if (!top20Ref.current) return;
    setIsDownloading(true);
    try {
      const el = top20Ref.current;
      const originalMaxHeight = el.style.maxHeight;
      const originalOverflow = el.style.overflow;
      const tableContainer = el.querySelector('.custom-scrollbar') as HTMLElement;
      const originalScrollOverflow = tableContainer?.style.overflow;

      // Expand container so all 20 rows are fully rendered
      el.style.maxHeight = 'none';
      el.style.overflow = 'visible';
      if (tableContainer) {
        tableContainer.style.overflow = 'visible';
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      const transparentPlaceholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      let dataUrl: string;
      try {
        dataUrl = await toPng(el, {
          quality: 0.95,
          pixelRatio: 2,
          backgroundColor: '#1a1b26',
          skipFonts: true,
          fontEmbedCSS: '',
          imagePlaceholder: transparentPlaceholder,
          cacheBust: true
        });
      } catch (e) {
        dataUrl = await toPng(el, {
          quality: 0.9,
          pixelRatio: 1.5,
          backgroundColor: '#1a1b26',
          skipFonts: true,
          fontEmbedCSS: '',
          imagePlaceholder: transparentPlaceholder
        });
      }

      // Restore
      el.style.maxHeight = originalMaxHeight;
      el.style.overflow = originalOverflow;
      if (tableContainer) {
        tableContainer.style.overflow = originalScrollOverflow;
      }

      const link = document.createElement('a');
      link.download = `top-20-${tourney?.name || 'tournament'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export Top 20 image:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const { tourney, stats, tourMatches } = useMemo(() => {
    const uid = user?.uid || 'guest';
    const localMatches = JSON.parse(localStorage.getItem(`matches_${uid}`) || '[]');
    const localPlayers = JSON.parse(localStorage.getItem(`players_${uid}`) || '[]');
    const localTeams = JSON.parse(localStorage.getItem(`teams_${uid}`) || '[]');
    const localTourneys = loadTournaments(uid);
    const tourney = localTourneys.find((t: any) => t.id === tournamentId);
    const tourneyName = tourney?.name || '';
    
    // Filter matches strictly for this tournament
    const tourMatches = localMatches.filter((m: any) => {
      if (!m) return false;
      if (m.tournamentId && m.tournamentId === tournamentId) return true;
      if (tourneyName && m.tournamentName && m.tournamentName.toLowerCase().trim() === tourneyName.toLowerCase().trim()) return true;
      if (tourney?.matchIds && Array.isArray(tourney.matchIds) && tourney.matchIds.includes(m.id)) return true;
      return false;
    });
    
    const playerStatsMap = new Map<string, any>();
    
    // Aggregate stats from matches
    tourMatches.forEach((m: any) => {
      const matchMvpName = m.mvp?.nickname;
      const matchId = m.id || `${m.date}_${m.team1Name}_${m.team2Name}`;

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
              kills: 0,
              assists: 0,
              deaths: 0,
              damage: 0,
              rounds: 0,
              mvps: 0,
              matchIds: new Set<string>()
            });
          }
          const curr = playerStatsMap.get(id);
          curr.kills += (ps.kills || ps.k || 0);
          curr.assists += (ps.assists || ps.a || 0);
          curr.deaths += (ps.deaths || ps.d || 0);
          curr.damage += (ps.damage || 0);
          curr.rounds += (ps.totalRounds || 0);
          curr.matchIds.add(matchId);
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
      
      // Add match MVP
      if (matchMvpName) {
        for (let val of playerStatsMap.values()) {
          if (val.nickname === matchMvpName) {
            val.mvps += 1;
            break;
          }
        }
      }
    });
    
    const arr = Array.from(playerStatsMap.values()).map(p => {
      const kd = p.deaths === 0 ? p.kills : p.kills / p.deaths;
      const diff = p.kills - p.deaths;
      const adr = p.rounds > 0 ? (p.damage / p.rounds) : 0;
      const impact = 0.8 + (kd * 0.3) + (adr * 0.003) + (p.assists / (p.rounds || 1)) * 0.1;
      const rating = 0.5 + (kd * 0.35) + (adr * 0.004) + (impact * 0.15);

      return {
        ...p,
        matchesCount: p.matchIds.size,
        kd,
        diff,
        adr,
        impact,
        rating
      };
    });
    
    arr.sort((a, b) => b.rating - a.rating || b.kd - a.kd || b.kills - a.kills);
    
    return { tourney, stats: arr.slice(0, 20), tourMatches };
  }, [user?.uid, tournamentId, refreshTrigger]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 font-sans">
      <div ref={top20Ref} className="bg-[#1a1b26] border border-white/10 rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-start bg-[#1a1b26] relative z-10 text-center">
            <div className="w-full">
                <h2 className="text-2xl font-black text-[#e8c07d] uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                    <Trophy className="text-[#e8c07d] w-6 h-6" />
                    {tourney?.name || 'ТУРНИР'}
                </h2>
                
                <p className="text-white/40 text-xs uppercase tracking-[0.3em] mt-2 font-bold">ТОП-20 ИГРОКОВ ТУРНИРА • ПОДРОБНАЯ СТАТИСТИКА</p>
                <p className="text-blue-400/80 text-[10px] uppercase tracking-wider mt-2 font-bold">В Топ-20 попадают только игроки из матчей, сыгранных через симулятор (кнопка "Играть Матч"). Быстрый ввод счета не генерирует статистику.</p>

            </div>
            {!isDownloading && (
                <button onClick={onClose} className="absolute right-6 top-6 p-2 text-white/50 hover:text-white bg-white/5 rounded-lg transition-colors">
                    <X className="w-6 h-6" />
                </button>
            )}
        </div>

        {/* Action Toolbar */}
        {!isDownloading && (
            <div className="px-6 py-4 flex flex-wrap justify-between items-center gap-3 bg-[#171822] border-b border-white/5">
                <div className="flex gap-2 bg-[#12121a] p-1 rounded-lg border border-white/5">
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`px-4 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-colors ${activeTab === 'stats' ? 'bg-white/10 text-[#e8c07d]' : 'text-white/40 hover:text-white/80'}`}
                    >
                        Топ-20
                    </button>
                    <button
                        onClick={() => setActiveTab('matches')}
                        className={`px-4 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-colors ${activeTab === 'matches' ? 'bg-white/10 text-[#e8c07d]' : 'text-white/40 hover:text-white/80'}`}
                    >
                        Матчи ({tourMatches.length})
                    </button>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button 
                        onClick={() => setShowMvpModal(true)}
                        className="bg-gradient-to-r from-[#ff8f00] to-[#e8c07d] hover:brightness-110 text-black font-black uppercase tracking-widest px-5 py-2.5 rounded-lg text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(255,143,0,0.3)]"
                    >
                        <Award className="w-4 h-4 fill-black" />
                        MVP & EVP
                    </button>
                    <button 
                        onClick={() => setShowFinalists(true)}
                        className="bg-[#e8c07d] hover:bg-[#d6af6d] text-black font-black uppercase tracking-widest px-5 py-2.5 rounded-lg text-xs flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(232,192,125,0.3)]"
                    >
                        <Trophy className="w-4 h-4" />
                        Финалисты
                    </button>
                    <button 
                        onClick={handleDownloadTop20}
                        disabled={isDownloading}
                        className="bg-[#ff8f00]/20 hover:bg-[#ff8f00]/30 border border-[#ff8f00]/50 text-[#ff8f00] font-black uppercase tracking-widest px-5 py-2.5 rounded-lg text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        {isDownloading ? 'Экспорт...' : 'Скачать PNG'}
                    </button>
                </div>
            </div>
        )}
        
        {/* Table / Matches */}
        <div className="px-6 py-6 overflow-y-auto flex-1 relative z-10 custom-scrollbar">
            {activeTab === 'matches' ? (
                <div className="flex flex-col gap-3">
                    {tourMatches.length === 0 ? (
                        <div className="py-12 text-center text-white/40 font-bold uppercase tracking-wider">
                            Нет матчей в этом турнире.
                        </div>
                    ) : (
                        tourMatches.map((m: any) => {
                            const dateStr = new Date(m.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                            const t1Wins = m.score1 > m.score2;
                            const t2Wins = m.score2 > m.score1;
                            return (
                                <div key={m.id} className="bg-[#12121a] border border-white/5 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between hover:border-white/10 transition-colors relative group gap-4">
                                    <div className="flex items-center gap-6 w-full md:w-1/3">
                                        <div className="text-white/40 text-xs font-mono flex flex-col items-center justify-center bg-white/5 rounded p-2 text-center w-24 shrink-0">
                                            <Calendar className="w-3 h-3 mb-1" />
                                            {dateStr}
                                        </div>
                                        <div className={`font-bold text-lg flex items-center gap-2 ${t1Wins ? 'text-[#ff8f00]' : 'text-white'}`}>
                                            <TeamLogo teamName={m.team1Name} sizeClassName="w-6 h-6" />
                                            {m.team1Name}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-center gap-3 font-black text-2xl font-mono shrink-0">
                                        <span className={t1Wins ? 'text-[#ff8f00]' : 'text-white/50'}>{m.score1}</span>
                                        <span className="text-white/20">:</span>
                                        <span className={t2Wins ? 'text-blue-400' : 'text-white/50'}>{m.score2}</span>
                                    </div>

                                    <div className="flex items-center justify-start md:justify-end w-full md:w-1/3 gap-6 relative pr-8">
                                        <div className={`font-bold text-lg flex items-center gap-2 ${t2Wins ? 'text-blue-400' : 'text-white'}`}>
                                            {m.team2Name}
                                            <TeamLogo teamName={m.team2Name} sizeClassName="w-6 h-6" />
                                        </div>
                                        {m.mvp && (
                                            <div className="flex flex-col items-end text-xs shrink-0">
                                                <span className="text-yellow-500 font-bold flex items-center gap-1"><Trophy className="w-3 h-3"/> MVP</span>
                                                <span className="text-white">{m.mvp.nickname}</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setConfirmingDeleteMatch(m.id)}
                                            className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Удалить матч (очистить из статистики)"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                        
                                        {confirmingDeleteMatch === m.id && (
                                            <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-[#1a1a24] p-2 rounded-lg border border-red-500/30 z-10 shadow-lg">
                                                <span className="text-xs text-red-400 font-bold whitespace-nowrap">Удалить?</span>
                                                <button onClick={() => handleDeleteMatch(m.id)} className="px-3 py-1 bg-red-500/20 text-red-500 rounded text-xs font-bold hover:bg-red-500/40 cursor-pointer">Да</button>
                                                <button onClick={() => setConfirmingDeleteMatch(null)} className="px-3 py-1 bg-white/10 text-white rounded text-xs font-bold hover:bg-white/20 cursor-pointer">Нет</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                <>
                    {stats.length === 0 ? (
                        <div className="text-center text-white/40 py-12 font-bold uppercase tracking-wider">
                            В этом турнире еще не сыграно ни одного матча.
                        </div>
                    ) : (
                        <div className="flex flex-col rounded-lg overflow-hidden border border-[#2a2b3d]">
                    {/* Table Header */}
                    <div className="grid grid-cols-[2.5rem_1.5fr_1.2fr_2.5rem_2.5rem_2.5rem_2.5rem_3rem_3rem_3rem_3rem_3.5rem_2.5rem] gap-2 p-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-wider bg-[#202130] items-center text-center">
                        <div>#</div>
                        <div className="text-left pl-2">Игрок</div>
                        <div className="text-left">Команда</div>
                        <div>M</div>
                        <div>K</div>
                        <div>A</div>
                        <div>D</div>
                        <div>±</div>
                        <div>K/D</div>
                        <div>ADR</div>
                        <div>Imp</div>
                        <div className="text-[#ff8f00]">Rating</div>
                        <div>MVP</div>
                    </div>
                    
                    {/* Table Body */}
                    <div className="flex flex-col">
                        {stats.map((p, idx) => (
                            <div 
                              key={p.id} 
                              onClick={() => setSelectedProfilePlayer(p)}
                              className={`grid grid-cols-[2.5rem_1.5fr_1.2fr_2.5rem_2.5rem_2.5rem_2.5rem_3rem_3rem_3rem_3rem_3.5rem_2.5rem] gap-2 p-3 items-center border-t border-[#2a2b3d] transition-colors text-sm font-semibold text-center text-white/90 cursor-pointer ${
                                idx === 0 ? 'bg-[#ff8f00]/10 hover:bg-[#ff8f00]/20 border-l-4 border-l-[#ff8f00]' :
                                idx === 1 ? 'bg-white/5 hover:bg-white/10 border-l-4 border-l-slate-300' :
                                idx === 2 ? 'bg-[#cd7f32]/10 hover:bg-[#cd7f32]/20 border-l-4 border-l-[#cd7f32]' :
                                'bg-[#1a1b26] hover:bg-[#202130]'
                              }`}
                              title={`Открыть HLTV профиль ${p.nickname}`}
                            >
                                <div className="text-[#6b7280] flex items-center justify-center font-bold">
                                    {idx === 0 ? <span className="text-[#ff8f00]">🥇 1</span> :
                                     idx === 1 ? <span className="text-slate-300">🥈 2</span> :
                                     idx === 2 ? <span className="text-[#cd7f32]">🥉 3</span> :
                                     idx + 1}
                                </div>
                                <div className="text-left pl-2 flex items-center gap-2 truncate">
                                    <PlayerAvatar playerName={p.nickname} sizeClassName="w-6 h-6" />
                                    <span className="text-white font-bold hover:text-blue-400 transition-colors">{p.nickname}</span>
                                </div>
                                <div className="text-left flex items-center gap-2 text-white/70 truncate">
                                    <TeamLogo teamName={p.teamName} sizeClassName="w-5 h-5 grayscale opacity-70" />
                                    {p.teamName}
                                </div>
                                <div>{p.matchesCount}</div>
                                <div>{p.kills}</div>
                                <div>{p.assists}</div>
                                <div>{p.deaths}</div>
                                <div className={p.diff > 0 ? "text-[#34d399] font-bold" : p.diff < 0 ? "text-[#f87171]" : ""}>
                                    {p.diff > 0 ? `+${p.diff}` : p.diff}
                                </div>
                                <div className="text-white font-bold">{p.kd.toFixed(2)}</div>
                                <div>{Math.round(p.adr)}</div>
                                <div>{p.impact.toFixed(2)}</div>
                                <div className="text-[#ff8f00] font-black">{p.rating.toFixed(2)}</div>
                                <div className="text-[#e8c07d]">{p.mvps > 0 ? p.mvps : 0}</div>
                            </div>
                        ))}
                    </div>
                </div>
                    )}
                </>
            )}
        </div>
      </div>
      
      {showFinalists && (
          <FinalistsModal 
              user={user} 
              tournamentId={tournamentId} 
              onClose={() => setShowFinalists(false)} 
          />
      )}

      {showMvpModal && (
          <MvpModal
              user={user}
              tournamentId={tournamentId}
              onClose={() => setShowMvpModal(false)}
          />
      )}

      {selectedProfilePlayer && (
          <PlayerProfileModal
              player={selectedProfilePlayer}
              user={user}
              onClose={() => setSelectedProfilePlayer(null)}
          />
      )}
    </div>
  );
}
