import React, { useMemo, useState, useRef, useEffect } from 'react';
import { X, Trophy, Download, Award, Trash2, Calendar, Crosshair, Sparkles, Database, Search } from 'lucide-react';
import { downloadElementAsImage } from '../../lib/exportImage';
import TeamLogo from '../TeamLogo';
import PlayerAvatar from '../PlayerAvatar';
import FinalistsModal from './FinalistsModal';
import MvpModal from './MvpModal';
import PlayerProfileModal from '../PlayerProfileModal';
import { loadTournaments, getCanonicalRoomId } from './storage';
import { db, doc, deleteDoc } from '../../firebase';
import { saveMatchesToLocalStorage, getKdColorClass, getSwingColorClass, formatSwing } from '../../lib/utils';
import { RatingSystem } from '../../match-logic/systems/RatingSystem';
import { RATING_CONFIG } from '../../match-logic/config/RatingConfig';
import { syncAndBackfillTournamentMatches } from '../../lib/tournamentMatchRecorder';

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
  const [playerViewMode, setPlayerViewMode] = useState<'all' | 'top20' | 'top10'>('all');
  const [playerSearch, setPlayerSearch] = useState('');
  const [customTop1, setCustomTop1] = useState<string | null>(() => {
    return localStorage.getItem(`tourney_${tournamentId}_top1`) || null;
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [confirmingDeleteMatch, setConfirmingDeleteMatch] = useState<string | null>(null);
  const top20Ref = useRef<HTMLDivElement>(null);

  const handleSelectTop1 = (nickname: string) => {
    setCustomTop1(nickname);
    localStorage.setItem(`tourney_${tournamentId}_top1`, nickname);
  };

  // Auto backfill tournament matches on open
  useEffect(() => {
    const uid = user?.uid || 'guest';
    const roomId = getCanonicalRoomId(uid);
    const tourneys = loadTournaments(roomId);
    const currentTourney = tourneys.find((t: any) => t.id === tournamentId);
    if (currentTourney) {
      setRefreshTrigger(prev => prev + 1);
    }

    // Resilient server fetch if local matches cache is low
    const rawMatches = localStorage.getItem(`matches_${roomId}`) || localStorage.getItem(`matches_${uid}`);
    if (!rawMatches || JSON.parse(rawMatches).length === 0) {
      fetch(`/api/backup-data/${roomId}`).then(r => r.json()).then(d => {
        if (d && d.success && Array.isArray(d.matches) && d.matches.length > 0) {
          saveMatchesToLocalStorage(roomId, d.matches);
          if (uid !== roomId) saveMatchesToLocalStorage(uid, d.matches);
          setRefreshTrigger(prev => prev + 1);
        }
      }).catch(() => {});
    }
  }, [user, tournamentId]);

  const handleDeleteMatch = async (matchId: string) => {
    if (!matchId) return;
    const uid = user?.uid || 'guest';
    const roomId = getCanonicalRoomId(uid);

    // 1. Mark in deleted_matches set
    const deletedRaw = localStorage.getItem(`deleted_matches_${roomId}`) || localStorage.getItem(`deleted_matches_${uid}`);
    const deletedSet = new Set<string>(deletedRaw ? JSON.parse(deletedRaw) : []);
    deletedSet.add(matchId);
    try {
      localStorage.setItem(`deleted_matches_${roomId}`, JSON.stringify(Array.from(deletedSet)));
      if (uid !== roomId) localStorage.setItem(`deleted_matches_${uid}`, JSON.stringify(Array.from(deletedSet)));
    } catch (e) {}

    // 2. Filter local state
    const localMatches = JSON.parse(localStorage.getItem(`matches_${roomId}`) || localStorage.getItem(`matches_${uid}`) || '[]');
    const filtered = localMatches.filter((m: any) => m && m.id !== matchId && m._id !== matchId);
    saveMatchesToLocalStorage(roomId, filtered);
    if (uid !== roomId) saveMatchesToLocalStorage(uid, filtered);
    setConfirmingDeleteMatch(null);
    setRefreshTrigger(prev => prev + 1);
    window.dispatchEvent(new Event('db-user-updated'));

    // 3. Delete in background
    try {
      await deleteDoc(doc(db, 'matches', matchId));
      await fetch('/api/matches/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: roomId, matchId })
      }).catch(() => {});
      await fetch('/api/sync-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: roomId, matches: filtered })
      }).catch(() => {});
    } catch (e) {
      console.warn("Delete match in Top20Modal:", e);
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

      const filename = `top-20-${(tourney?.name || 'tournament').replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, '_')}.png`;
      await downloadElementAsImage(el, filename, {
        backgroundColor: '#1a1b26'
      });

      // Restore
      el.style.maxHeight = originalMaxHeight;
      el.style.overflow = originalOverflow;
      if (tableContainer) {
        tableContainer.style.overflow = originalScrollOverflow;
      }
    } catch (err) {
      console.error('Failed to export Top 20 image:', err);
      alert('Ошибка сохранения Top-20: ' + (err instanceof Error ? err.message : 'Ошибка рендеринга'));
    } finally {
      setIsDownloading(false);
    }
  };

  const { tourney, stats, tourMatches } = useMemo(() => {
    const uid = user?.uid || 'guest';
    const roomId = getCanonicalRoomId(uid);
    let localMatches = JSON.parse(
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
    let tourney = localTourneys.find((t: any) => t.id === tournamentId);
    const tourneyName = tourney?.name || '';
    
    // Filter matches strictly for this tournament
    let tourMatches = localMatches.filter((m: any) => {
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
              k1: 0,
              k2: 0,
              k3: 0,
              k4: 0,
              k5: 0,
              fk: 0,
              fd: 0,
              kastRounds: 0,
              roundSwing: 0,
              clutchesWon1v1: 0,
              clutchesWon1v2: 0,
              clutchesWon1v3: 0,
              clutchesWon1v4: 0,
              clutchesWon1v5: 0,
              openingKillsTraded: 0,
              openingKillsConverted: 0,
              matchIds: new Set<string>()
            });
          }
          const curr = playerStatsMap.get(id);
          curr.kills += (ps.kills || ps.k || 0);
          curr.assists += (ps.assists || ps.a || 0);
          curr.deaths += (ps.deaths || ps.d || 0);
          curr.damage += (ps.damage || 0);
          curr.rounds += (ps.totalRounds || 0);
          curr.k1 += (ps.k1 || 0);
          curr.k2 += (ps.k2 || 0);
          curr.k3 += (ps.k3 || 0);
          curr.k4 += (ps.k4 || 0);
          curr.k5 += (ps.k5 || 0);
          curr.fk += (ps.fk || ps.openingKills || 0);
          curr.fd += (ps.fd || ps.openingDeaths || 0);
          curr.kastRounds += (ps.kastRounds || 0);
          const psRounds = ps.totalRounds || 1;
          const psSwing = typeof ps.rawRoundSwing === 'number'
            ? ps.rawRoundSwing
            : (typeof ps.roundSwingNum === 'number'
              ? (ps.roundSwingNum / 100) * psRounds
              : (typeof ps.roundSwing === 'number'
                ? ps.roundSwing
                : (parseFloat(String(ps.roundSwing || '0').replace(/[%+]/g, '')) / 100) * psRounds || 0));
          curr.roundSwing += psSwing;
          curr.clutchesWon1v1 += (ps.clutchesWon1v1 || 0);
          curr.clutchesWon1v2 += (ps.clutchesWon1v2 || 0);
          curr.clutchesWon1v3 += (ps.clutchesWon1v3 || 0);
          curr.clutchesWon1v4 += (ps.clutchesWon1v4 || 0);
          curr.clutchesWon1v5 += (ps.clutchesWon1v5 || 0);
          curr.openingKillsTraded += (ps.openingKillsTraded || 0);
          curr.openingKillsConverted += (ps.openingKillsConverted || 0);
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
      const rounds = Math.max(1, p.rounds);
      const breakdown = RatingSystem.calculatePlayerRating({
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        damage: p.damage,
        totalRounds: rounds,
        k1: p.k1,
        k2: p.k2,
        k3: p.k3,
        k4: p.k4,
        k5: p.k5,
        openingKills: p.fk,
        openingDeaths: p.fd,
        openingKillsTraded: p.openingKillsTraded,
        openingKillsConverted: p.openingKillsConverted,
        clutchesWon1v1: p.clutchesWon1v1,
        clutchesWon1v2: p.clutchesWon1v2,
        clutchesWon1v3: p.clutchesWon1v3,
        clutchesWon1v4: p.clutchesWon1v4,
        clutchesWon1v5: p.clutchesWon1v5,
        kastRounds: p.kastRounds > 0 ? p.kastRounds : Math.round(rounds * 0.70),
        roundSwing: p.roundSwing
      }, rounds);

      return {
        ...p,
        matchesCount: p.matchIds.size,
        kd: breakdown.kd,
        diff: p.kills - p.deaths,
        adr: breakdown.adr,
        impact: breakdown.impact,
        roundSwing: breakdown.roundSwing,
        rating: breakdown.rating
      };
    });
    
    arr.sort((a, b) => b.rating - a.rating || b.kd - a.kd || b.kills - a.kills);
    
    return { tourney, stats: arr, tourMatches };
  }, [user?.uid, tournamentId, refreshTrigger]);

  const displayedStats = useMemo(() => {
    let list = stats;
    if (playerSearch.trim()) {
      const q = playerSearch.toLowerCase().trim();
      list = list.filter(p => p.nickname.toLowerCase().includes(q) || (p.teamName && p.teamName.toLowerCase().includes(q)));
    }
    if (playerViewMode === 'top20') return list.slice(0, 20);
    if (playerViewMode === 'top10') return list.slice(0, 10);
    return list;
  }, [stats, playerSearch, playerViewMode]);

  const currentTop1Player = useMemo(() => {
    if (customTop1) {
      const found = stats.find(p => p.nickname.toLowerCase() === customTop1.toLowerCase());
      if (found) return found;
    }
    return stats[0] || null;
  }, [stats, customTop1]);

  const handleDownloadJson = () => {
    const data = {
      tournamentName: tourney?.name || 'Турнир',
      tournamentId: tourney?.id || tournamentId,
      totalPlayers: stats.length,
      matchesCount: tourMatches.length,
      top1Player: currentTop1Player?.nickname || null,
      top1PlayerDetails: currentTop1Player,
      players: stats,
      matches: tourMatches.map((m: any) => ({
        id: m.id,
        team1Name: m.team1Name,
        team2Name: m.team2Name,
        score1: m.score1,
        score2: m.score2,
        date: m.date,
        mvp: m.mvp?.nickname || null
      })),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tournament_${(tourney?.name || 'stats').replace(/\s+/g, '_')}_all_players.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
                
                <p className="text-white/40 text-xs uppercase tracking-[0.3em] mt-2 font-bold">
                  {playerViewMode === 'top20' ? 'ТОП-20 ИГРОКОВ ТУРНИРА' : playerViewMode === 'top10' ? 'ТОП-10 ИГРОКОВ ТУРНИРА' : 'СПИСОК ВСЕХ ИГРОКОВ ТУРНИРА'} • ПОДРОБНАЯ СТАТИСТИКА ({stats.length} ИГРОКОВ)
                </p>
                <p className="text-emerald-400/90 text-[10px] uppercase tracking-wider mt-2 font-bold flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Статистика формируется автоматически для всех сыгранных и симулированных матчей турнира
                </p>

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
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex gap-1 bg-[#12121a] p-1 rounded-lg border border-white/5">
                        <button
                            onClick={() => { setActiveTab('stats'); setPlayerViewMode('all'); }}
                            className={`px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-colors ${activeTab === 'stats' && playerViewMode === 'all' ? 'bg-white/10 text-[#e8c07d]' : 'text-white/40 hover:text-white/80'}`}
                        >
                            Все ({stats.length})
                        </button>
                        <button
                            onClick={() => { setActiveTab('stats'); setPlayerViewMode('top20'); }}
                            className={`px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-colors ${activeTab === 'stats' && playerViewMode === 'top20' ? 'bg-white/10 text-[#e8c07d]' : 'text-white/40 hover:text-white/80'}`}
                        >
                            Топ-20
                        </button>
                        <button
                            onClick={() => { setActiveTab('stats'); setPlayerViewMode('top10'); }}
                            className={`px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-colors ${activeTab === 'stats' && playerViewMode === 'top10' ? 'bg-white/10 text-[#e8c07d]' : 'text-white/40 hover:text-white/80'}`}
                        >
                            Топ-10
                        </button>
                        <button
                            onClick={() => setActiveTab('matches')}
                            className={`px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-colors ${activeTab === 'matches' ? 'bg-white/10 text-[#e8c07d]' : 'text-white/40 hover:text-white/80'}`}
                        >
                            Матчи ({tourMatches.length})
                        </button>
                    </div>

                    {activeTab === 'stats' && (
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                            <input 
                                type="text"
                                value={playerSearch}
                                onChange={e => setPlayerSearch(e.target.value)}
                                placeholder="Поиск игрока..."
                                className="bg-[#12121a] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-[#e8c07d]/50 w-36 sm:w-44 transition-all"
                            />
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-2.5">
                    <button 
                        onClick={() => setShowMvpModal(true)}
                        className="bg-gradient-to-r from-[#ff8f00] to-[#e8c07d] hover:brightness-110 text-black font-black uppercase tracking-widest px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(255,143,0,0.3)]"
                    >
                        <Award className="w-3.5 h-3.5 fill-black" />
                        MVP & EVP
                    </button>
                    <button 
                        onClick={() => setShowFinalists(true)}
                        className="bg-[#e8c07d] hover:bg-[#d6af6d] text-black font-black uppercase tracking-widest px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-[0_0_15px_rgba(232,192,125,0.3)]"
                    >
                        <Trophy className="w-3.5 h-3.5" />
                        Финалисты
                    </button>
                    <button 
                        onClick={handleDownloadJson}
                        className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-blue-400 font-black uppercase tracking-widest px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                        title="Экспортировать всех игроков и матчи в JSON"
                    >
                        <Database className="w-3.5 h-3.5" />
                        JSON
                    </button>
                    <button 
                        onClick={handleDownloadTop20}
                        disabled={isDownloading}
                        className="bg-[#ff8f00]/20 hover:bg-[#ff8f00]/30 border border-[#ff8f00]/50 text-[#ff8f00] font-black uppercase tracking-widest px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                        <Download className="w-3.5 h-3.5" />
                        {isDownloading ? 'Экспорт...' : 'PNG'}
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
                                            className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                                            title="Удалить этот матч из базы данных и сайта"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                        
                                        {confirmingDeleteMatch === m.id && (
                                            <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-[#12121a] p-2.5 rounded-xl border border-red-500/50 z-20 shadow-2xl animate-in fade-in">
                                                <span className="text-xs text-red-400 font-black whitespace-nowrap">Точно удалить?</span>
                                                <button onClick={() => handleDeleteMatch(m.id)} className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-black cursor-pointer shadow">Да, удалить</button>
                                                <button onClick={() => setConfirmingDeleteMatch(null)} className="px-2.5 py-1 bg-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/20 cursor-pointer">Отмена</button>
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
                        <div className="space-y-4">
                            {/* Top-1 Tournament Showcase Banner */}
                            {currentTop1Player && (
                                <div className="bg-gradient-to-r from-yellow-500/15 via-[#1a1b26] to-yellow-500/5 border border-yellow-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-yellow-500/5">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <PlayerAvatar playerName={currentTop1Player.nickname} sizeClassName="w-14 h-14 rounded-full ring-2 ring-yellow-500/80 p-0.5 bg-black" />
                                            <div className="absolute -top-1 -right-1 bg-yellow-500 text-black p-1 rounded-full shadow">
                                                <Trophy className="w-3.5 h-3.5 fill-black" />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                                                    🏆 ТОП-1 ТУРНИРА
                                                </span>
                                                {customTop1 && (
                                                    <span className="text-[9px] text-white/40 font-mono">(выбран вручную)</span>
                                                )}
                                            </div>
                                            <h4 className="text-xl font-black text-white uppercase tracking-wider mt-0.5 flex items-center gap-2">
                                                {currentTop1Player.nickname}
                                                <span className="text-xs font-bold text-white/40">({currentTop1Player.teamName})</span>
                                            </h4>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 bg-black/40 px-4 py-2 rounded-lg border border-white/5">
                                        <div className="text-center">
                                            <span className="text-[9px] uppercase tracking-wider text-white/30 block font-bold">Rating</span>
                                            <span className="text-lg font-black text-yellow-400">{currentTop1Player.rating.toFixed(2)}</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-[9px] uppercase tracking-wider text-white/30 block font-bold">K/D</span>
                                            <span className={`text-lg font-black ${getKdColorClass(currentTop1Player.kd)}`}>{currentTop1Player.kd.toFixed(2)}</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-[9px] uppercase tracking-wider text-white/30 block font-bold">Kills</span>
                                            <span className="text-lg font-black text-white">{currentTop1Player.kills}</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-[9px] uppercase tracking-wider text-white/30 block font-bold">Матчей</span>
                                            <span className="text-lg font-black text-blue-400">{currentTop1Player.matchesCount}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col rounded-lg overflow-hidden border border-[#2a2b3d]">
                            {/* Table Header */}
                            <div className={`grid ${RATING_CONFIG.USE_SWING ? 'grid-cols-[2.5rem_1.5fr_1.2fr_2.5rem_2.5rem_2.5rem_2.5rem_3rem_3rem_3rem_3rem_3.5rem_2.5rem_2.5rem]' : 'grid-cols-[2.5rem_1.5fr_1.2fr_2.5rem_2.5rem_2.5rem_2.5rem_3rem_3rem_3rem_3.5rem_2.5rem_2.5rem]'} gap-2 p-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-wider bg-[#202130] items-center text-center`}>
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
                                {RATING_CONFIG.USE_SWING && <div>Swing</div>}
                                <div>Imp</div>
                                <div className="text-[#ff8f00]">Rating</div>
                                <div>MVP</div>
                                <div>Топ-1</div>
                            </div>
                            
                            {/* Table Body */}
                            <div className="flex flex-col">
                                {displayedStats.map((p, idx) => {
                                    const isTop1 = (customTop1 ? customTop1.toLowerCase() === p.nickname.toLowerCase() : idx === 0);
                                    return (
                                    <div 
                                      key={p.id} 
                                      onClick={() => setSelectedProfilePlayer(p)}
                                      className={`grid ${RATING_CONFIG.USE_SWING ? 'grid-cols-[2.5rem_1.5fr_1.2fr_2.5rem_2.5rem_2.5rem_2.5rem_3rem_3rem_3rem_3rem_3.5rem_2.5rem_2.5rem]' : 'grid-cols-[2.5rem_1.5fr_1.2fr_2.5rem_2.5rem_2.5rem_2.5rem_3rem_3rem_3rem_3.5rem_2.5rem_2.5rem]'} gap-2 p-3 items-center border-t border-[#2a2b3d] transition-colors text-sm font-semibold text-center text-white/90 cursor-pointer ${
                                        isTop1 ? 'bg-yellow-500/10 hover:bg-yellow-500/20 border-l-4 border-l-yellow-500' :
                                        idx === 0 ? 'bg-[#ff8f00]/10 hover:bg-[#ff8f00]/20 border-l-4 border-l-[#ff8f00]' :
                                        idx === 1 ? 'bg-white/5 hover:bg-white/10 border-l-4 border-l-slate-300' :
                                        idx === 2 ? 'bg-[#cd7f32]/10 hover:bg-[#cd7f32]/20 border-l-4 border-l-[#cd7f32]' :
                                        'bg-[#1a1b26] hover:bg-[#202130]'
                                      }`}
                                      title={`Открыть HLTV профиль ${p.nickname}`}
                                    >
                                        <div className="text-[#6b7280] flex items-center justify-center font-bold">
                                            {isTop1 ? <span className="text-yellow-400 font-black">👑 1</span> :
                                             idx === 0 ? <span className="text-[#ff8f00]">🥇 1</span> :
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
                                        <div className={getKdColorClass(p.kd)}>{p.kd.toFixed(2)}</div>
                                        <div>{Math.round(p.adr)}</div>
                                        {RATING_CONFIG.USE_SWING && (
                                            <div className={getSwingColorClass(p.roundSwing)}>
                                                {formatSwing(p.roundSwing)}
                                            </div>
                                        )}
                                        <div>{p.impact.toFixed(2)}</div>
                                        <div className="text-[#ff8f00] font-black">{p.rating.toFixed(2)}</div>
                                        <div className="text-[#e8c07d]">{p.mvps > 0 ? p.mvps : 0}</div>
                                        <div onClick={e => e.stopPropagation()} className="flex items-center justify-center">
                                            <button 
                                                onClick={() => handleSelectTop1(p.nickname)}
                                                className={`p-1 rounded transition-all ${
                                                    isTop1 
                                                        ? 'bg-yellow-500 text-black shadow-md' 
                                                        : 'text-white/20 hover:text-yellow-400 hover:bg-white/5'
                                                }`}
                                                title={isTop1 ? "Выбран как Топ-1 турнира" : "Назначить Топ-1 турнира"}
                                            >
                                                <Trophy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
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
