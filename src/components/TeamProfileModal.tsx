import { TeamAutocompleteInput } from './TeamAutocompleteInput';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, doc, updateDoc } from '../firebase';
import { X, Trophy, Award, Shield, Users, Download, Edit3, Globe, BarChart3, Swords, Settings, Star, Medal, ExternalLink, Check, Calendar, DollarSign, PieChart, TrendingUp, CheckCircle } from 'lucide-react';
import { toPng } from 'html-to-image';
import TeamLogo from './TeamLogo';
import PlayerAvatar from './PlayerAvatar';
import PlayerProfileModal from './PlayerProfileModal';
import { loadTournaments } from './setka_tourn/storage';
import { safeLocalStorageSet } from '../lib/utils';

interface TeamProfileModalProps {
  team: any;
  user: any;
  onClose: () => void;
  onUpdateTeam?: (updatedData: any) => void;
  allPlayers?: any[];
  allTeams?: any[];
}

const COUNTRY_NAMES: Record<string, { code: string; name: string }> = {
  RU: { code: 'RU', name: 'Россия' },
  UA: { code: 'UA', name: 'Украина' },
  KZ: { code: 'KZ', name: 'Казахстан' },
  BY: { code: 'BY', name: 'Беларусь' },
  DK: { code: 'DK', name: 'Дания' },
  SE: { code: 'SE', name: 'Швеция' },
  FR: { code: 'FR', name: 'Франция' },
  DE: { code: 'DE', name: 'Германия' },
  US: { code: 'US', name: 'США' },
  EU: { code: 'EU', name: 'Европа' },
  BR: { code: 'BR', name: 'Бразилия' },
  PL: { code: 'PL', name: 'Польша' },
  FI: { code: 'FI', name: 'Финляндия' },
  MN: { code: 'MN', name: 'Монголия' },
};

export default function TeamProfileModal({ team, user, onClose, onUpdateTeam, allPlayers = [], allTeams = [] }: TeamProfileModalProps) {
  const [currentTeam, setCurrentTeam] = useState(team);
  const [activeTab, setActiveTab] = useState<'info' | 'roster' | 'matches' | 'events' | 'maps' | 'edit'>('info');
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [editingPts, setEditingPts] = useState<Record<string, number>>({});
  const [ptsSaveNotice, setPtsSaveNotice] = useState<string>('');

  useEffect(() => {
    setCurrentTeam(team);
  }, [team]);

  const uid = user?.uid || 'demo';

  // Calculate actual HLTV rank dynamically based on team total VAC Pts
  const calculatedWorldRank = useMemo(() => {
    if (!currentTeam) return 1;
    let teamList = allTeams || [];
    if (teamList.length === 0 && uid) {
      try {
        const raw = JSON.parse(localStorage.getItem(`teams_${uid}`) || '[]');
        teamList = raw.filter((t: any) => !t.isAcademy);
      } catch (e) {
        teamList = [];
      }
    }

    if (teamList.length === 0) return currentTeam.worldRank || 1;

    const sorted = [...teamList].map(t => {
      const players = (t.players || []).slice(0, 5);
      const totalVal = players.reduce((acc: number, p: any) => {
        const val = p && p.valRating != null && String(p.valRating) !== '' ? Number(p.valRating) : 0;
        return acc + val;
      }, 0);
      return { id: t.id, name: t.name, totalVal };
    }).sort((a, b) => b.totalVal - a.totalVal);

    const idx = sorted.findIndex(t => 
      (t.id && currentTeam.id && t.id === currentTeam.id) || 
      (t.name && currentTeam.name && t.name.toLowerCase() === currentTeam.name.toLowerCase())
    );
    return idx !== -1 ? idx + 1 : (currentTeam.worldRank || 1);
  }, [currentTeam, allTeams, uid]);

  // Days in top calculation based on calculatedWorldRank
  const top30TimeText = useMemo(() => {
    if (!currentTeam) return '0 дн.';
    const teamKey = `team_top30_timer_${currentTeam.id || currentTeam.name}`;
    const rankKey = `team_top30_rank_${currentTeam.id || currentTeam.name}`;

    const currentRank = calculatedWorldRank;
    const savedRank = localStorage.getItem(rankKey);
    let savedTimestampStr = localStorage.getItem(teamKey);

    // Reset timestamp if rank changed or not initialized
    if (!savedTimestampStr || (savedRank && savedRank !== String(currentRank))) {
      savedTimestampStr = String(Date.now());
      localStorage.setItem(teamKey, savedTimestampStr);
      localStorage.setItem(rankKey, String(currentRank));
    }

    const startTime = parseInt(savedTimestampStr, 10) || Date.now();
    const elapsedMs = Math.max(0, Date.now() - startTime);
    const days = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));

    return `${days} дн.`;
  }, [currentTeam, calculatedWorldRank]);

  // Edit fields
  const [editName, setEditName] = useState(team.name || '');
  const [editCountry, setEditCountry] = useState(team.country || 'RU');
  const [editWorldRank, setEditWorldRank] = useState(team.worldRank || 1);
  const [editCoach, setEditCoach] = useState(team.coach || '');
  const [editTwitter, setEditTwitter] = useState(team.socials?.twitter || '');
  const [editVk, setEditVk] = useState(team.socials?.vk || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  // Load team statistics & match history from tournaments AND global match history
  const teamStats = useMemo(() => {
    const tournaments = loadTournaments(uid);
    const globalMatches = JSON.parse(localStorage.getItem(`matches_${uid}`) || '[]');
    const teamNameLower = (team.name || '').toLowerCase().trim();

    let totalMatches = 0;
    let wins = 0;
    let losses = 0;
    let totalPrizeMoney = 0;
    const matchesList: any[] = [];
    const trophyList: any[] = [];
    const processedMatchIds = new Set<string>();

    // Map statistics tracking
    const mapStats: Record<string, { played: number; won: number }> = {
      'Mirage': { played: 0, won: 0 },
      'Inferno': { played: 0, won: 0 },
      'Nuke': { played: 0, won: 0 },
      'Anubis': { played: 0, won: 0 },
      'Dust II': { played: 0, won: 0 },
      'Ancient': { played: 0, won: 0 },
      'Vertigo': { played: 0, won: 0 },
    };

    const processMatch = (m: any, tournamentName: string) => {
      if (!m) return;
      const mId = m.id || `${tournamentName}-${m.team1?.name || m.team1}-${m.team2?.name || m.team2}-${m.score1}-${m.score2}`;
      if (processedMatchIds.has(mId)) return;

      const teamA = (m.team1Name || m.team1?.name || m.teamA?.name || m.teamA || m.team1 || '').toString().toLowerCase().trim();
      const teamB = (m.team2Name || m.team2?.name || m.teamB?.name || m.teamB || m.team2 || '').toString().toLowerCase().trim();

      if (teamA === teamNameLower || teamB === teamNameLower) {
        const isTeamA = teamA === teamNameLower;
        const myScore = isTeamA 
          ? (m.team1Score ?? m.score1 ?? m.scoreA ?? 0) 
          : (m.team2Score ?? m.score2 ?? m.scoreB ?? 0);
        const oppScore = isTeamA 
          ? (m.team2Score ?? m.score2 ?? m.scoreB ?? 0) 
          : (m.team1Score ?? m.score1 ?? m.scoreA ?? 0);
        const opponentName = isTeamA 
          ? (m.team2Name || m.team2?.name || m.teamB?.name || m.teamB || m.team2 || 'Противник') 
          : (m.team1Name || m.team1?.name || m.teamA?.name || m.teamA || m.team1 || 'Противник');

        if (myScore > 0 || oppScore > 0 || m.isFinished) {
          processedMatchIds.add(mId);
          
          if (m.maps && Array.isArray(m.maps) && m.maps.length > 0) {
            m.maps.forEach((mapObj: any, idx: number) => {
              const team1S = mapObj.team1Score ?? 0;
              const team2S = mapObj.team2Score ?? 0;
              if (team1S === 0 && team2S === 0) return; // Skip unplayed map
              
              totalMatches++; // Count maps
              const isWin = isTeamA ? team1S > team2S : team2S > team1S;
              if (isWin) wins++; else losses++;
              
              const mapName = mapObj.mapName || mapObj.map || 'Unknown Map';
              if (!mapStats[mapName]) {
                mapStats[mapName] = { played: 0, won: 0 };
              }
              mapStats[mapName].played++;
              if (isWin) mapStats[mapName].won++;
            });
            
            // Push ONE match record for the series
            matchesList.push({
              id: mId,
              tournamentName: tournamentName || 'Матч',
              opponentName,
              myScore,
              oppScore,
              isWin: myScore > oppScore,
              map: `BO${m.maps.length}`,
              date: m.date ? new Date(m.date).toLocaleDateString('ru-RU') : 'Ранее'
            });
          } else {
            totalMatches++;
            const isWin = myScore > oppScore;
            if (isWin) wins++; else losses++;

            const mapName = m.map || m.selectedMap || ['Mirage', 'Inferno', 'Nuke', 'Anubis', 'Dust II'][Math.floor(Math.random() * 5)];
            if (!mapStats[mapName]) {
              mapStats[mapName] = { played: 0, won: 0 };
            }
            mapStats[mapName].played++;
            if (isWin) mapStats[mapName].won++;

            matchesList.push({
              id: mId,
              tournamentName: tournamentName || 'Матч',
              opponentName,
              myScore,
              oppScore,
              isWin,
              map: mapName,
              date: m.date ? new Date(m.date).toLocaleDateString('ru-RU') : 'Ранее'
            });
          }
        }
      }
    };

    // 1. Process global standalone matches
    if (Array.isArray(globalMatches)) {
      globalMatches.forEach(m => processMatch(m, m.tournamentName || 'Товарищеский матч'));
    }

    // 2. Process tournaments across all stages
    tournaments.forEach(tourney => {
      const winnerStr = typeof tourney.winnerTeam === 'string' ? tourney.winnerTeam : (tourney.winnerTeam as any)?.name || tourney.winnerName;
      if (winnerStr && winnerStr.toLowerCase().trim() === teamNameLower) {
        trophyList.push({
          title: `1 Место — ${tourney.name}`,
          type: 'winner',
          date: tourney.createdAt ? new Date(tourney.createdAt).toLocaleDateString('ru-RU') : '2026',
          prize: tourney.prizePool ? `${tourney.prizePool}` : null
        });

        if (tourney.prizePool) {
          const numericPrize = parseFloat(String(tourney.prizePool).replace(/[^0-9.]/g, '')) || 0;
          totalPrizeMoney += numericPrize * 0.5;
        }
      }

      if (tourney.matches && Array.isArray(tourney.matches)) {
        tourney.matches.forEach(m => processMatch(m, tourney.name));
      }
      if (tourney.groups && Array.isArray(tourney.groups)) {
        tourney.groups.forEach(g => {
          if (g.matches && Array.isArray(g.matches)) {
            g.matches.forEach(m => processMatch(m, `${tourney.name} (${g.name || 'Группы'})`));
          }
        });
      }
      if (tourney.bracketRounds && Array.isArray(tourney.bracketRounds)) {
        tourney.bracketRounds.forEach(round => {
          if (Array.isArray(round)) round.forEach(m => processMatch(m, `${tourney.name} (Плей-офф)`));
        });
      }
      if (tourney.losersBracketRounds && Array.isArray(tourney.losersBracketRounds)) {
        tourney.losersBracketRounds.forEach(round => {
          if (Array.isArray(round)) round.forEach(m => processMatch(m, `${tourney.name} (Нижняя сетка)`));
        });
      }
      if (tourney.grandFinal && Array.isArray(tourney.grandFinal)) {
        tourney.grandFinal.forEach(m => processMatch(m, `${tourney.name} (Финал)`));
      }
      if (tourney.swissRounds && Array.isArray(tourney.swissRounds)) {
        tourney.swissRounds.forEach(round => {
          if (Array.isArray(round)) round.forEach(m => processMatch(m, `${tourney.name} (Швейцарка)`));
        });
      }
    });

    // Real stats calculation (no mock fallback - show 0 if no matches played)
    const winrate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    // Roster players enriched with detailed data
    const teamPlayers = currentTeam.players || [];
    const rosterList = teamPlayers.map((tp: any) => {
      // Find matching full player if available
      const fullP = allPlayers.find((ap: any) => ap.id === tp.id || ap.nickname?.toLowerCase() === tp.nickname?.toLowerCase()) || tp;
      return {
        ...tp,
        ...fullP,
        rating: fullP.rating || tp.rating || 1000,
        valRating: tp.valRating !== undefined ? tp.valRating : (fullP.valRating || 0),
        role: fullP.role || tp.role || 'rifler',
        country: fullP.country || 'RU'
      };
    });

    return {
      totalMatches,
      wins,
      losses,
      winrate,
      totalPrizeMoney,
      matchesList,
      trophyList,
      mapStats,
      rosterList
    };
  }, [uid, currentTeam, allPlayers]);

  const countryInfo = COUNTRY_NAMES[currentTeam.country || editCountry] || COUNTRY_NAMES.RU;

  const handleGrantPlayerPts = (playerId: string, playerNickname: string, newPtsVal: number) => {
    const updatedPlayers = (currentTeam.players || []).map((p: any) => {
      if ((p.id && p.id === playerId) || (p.nickname && p.nickname.trim().toLowerCase() === playerNickname.trim().toLowerCase())) {
        return { ...p, valRating: newPtsVal };
      }
      return p;
    });

    const updatedTotalVal = updatedPlayers.slice(0, 5).reduce((acc: number, p: any) => acc + (p?.valRating || 0), 0);

    const updatedTeamData = {
      ...currentTeam,
      players: updatedPlayers,
      totalValRating: updatedTotalVal
    };

    setCurrentTeam(updatedTeamData);

    // Save to localStorage
    try {
      const localTeams = JSON.parse(localStorage.getItem(`teams_${uid}`) || '[]');
      const idx = localTeams.findIndex((t: any) => (t.id && t.id === currentTeam.id) || (t.name && t.name.toLowerCase() === currentTeam.name?.toLowerCase()));
      if (idx !== -1) {
        localTeams[idx] = {
          ...localTeams[idx],
          players: updatedPlayers,
          totalValRating: updatedTotalVal
        };
        safeLocalStorageSet(`teams_${uid}`, localTeams);
      }

      // Sync player list in localStorage
      const localPlayers = JSON.parse(localStorage.getItem(`players_${uid}`) || '[]');
      let playerFound = false;
      const newLocalPlayers = localPlayers.map((lp: any) => {
        if ((lp.id && lp.id === playerId) || (lp.nickname && lp.nickname.trim().toLowerCase() === playerNickname.trim().toLowerCase())) {
          playerFound = true;
          return { ...lp, valRating: newPtsVal };
        }
        return lp;
      });
      if (playerFound) {
        safeLocalStorageSet(`players_${uid}`, newLocalPlayers);
      }
    } catch (err) {
      console.error("Error saving player PTS:", err);
    }

    if (onUpdateTeam) {
      onUpdateTeam(updatedTeamData);
    }

    try {
      if (user && !user.isLocalDemo) {
        if (currentTeam.id) {
          updateDoc(doc(db, 'teams', currentTeam.id), {
            players: updatedPlayers,
            totalValRating: updatedTotalVal
          }).catch(err => console.warn("Error updating team PTS in firestore:", err));
        }
        if (playerId) {
          updateDoc(doc(db, 'players', playerId), {
            valRating: newPtsVal
          }).catch(err => console.warn("Error updating player PTS in firestore:", err));
        }
      }
    } catch (err) {
      console.warn("Firestore error in handleGrantPlayerPts:", err);
    }

    window.dispatchEvent(new Event("db-user-updated"));

    setPtsSaveNotice(`Сохранено: ${playerNickname} — ${newPtsVal} PTS`);
    setTimeout(() => setPtsSaveNotice(''), 3000);
  };

  const handleSaveEdit = () => {
    const updated = {
      ...currentTeam,
      name: editName,
      country: editCountry,
      worldRank: Number(editWorldRank),
      coach: editCoach,
      socials: {
        twitter: editTwitter,
        vk: editVk
      }
    };
    setCurrentTeam(updated);
    if (onUpdateTeam) {
      onUpdateTeam(updated);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleDownloadCard = async () => {
    if (!profileRef.current) return;
    setIsDownloading(true);
    try {
      const transparentPlaceholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      let dataUrl: string;
      try {
        dataUrl = await toPng(profileRef.current, { cacheBust: true, pixelRatio: 2, skipFonts: true, fontEmbedCSS: '', imagePlaceholder: transparentPlaceholder });
      } catch (e) {
        dataUrl = await toPng(profileRef.current, { pixelRatio: 1.5, skipFonts: true, fontEmbedCSS: '', imagePlaceholder: transparentPlaceholder });
      }
      const link = document.createElement('a');
      link.download = `HLTV_Team_${team.name || 'Team'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generating image', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div 
        ref={profileRef}
        className={`bg-[#10111a] border border-[#2a2b3d] w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl my-auto text-white flex flex-col relative ${isDownloading ? '' : 'max-h-[92vh]'}`}
      >
        {/* TOP HLTV ROSTER SHOWCASE BANNER */}
        <div className="bg-gradient-to-b from-[#181a29] to-[#0c0d15] border-b border-white/10 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <TeamLogo teamName={team.name} logoUrl={team.logoUrl} sizeClassName="w-4 h-4 rounded-full" /> {team.name} Profile
              </span>
              {team.isAcademy && (
                <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full">
                  Academy
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadCard}
                disabled={isDownloading}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Скачать карточку команды"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">{isDownloading ? 'Сохранение...' : 'PNG Карточка'}</span>
              </button>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-white/10 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 5 PLAYER ROSTER SHOWCASE ROW */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3 bg-black/40 border border-white/5 rounded-2xl p-2 sm:p-3">
            {teamStats.rosterList.slice(0, 5).map((p: any, idx: number) => (
              <div
                key={p.id || idx}
                onClick={() => setSelectedPlayer(p)}
                className="group/p flex flex-col items-center bg-white/[0.02] hover:bg-white/[0.08] border border-white/5 hover:border-blue-500/40 rounded-xl p-2 transition-all cursor-pointer relative overflow-hidden"
                title={`Открыть профиль ${p.nickname}`}
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-white/10 group-hover/p:border-blue-400 transition-colors mb-1 bg-black/50">
                  <PlayerAvatar playerName={p.nickname} avatarUrl={p.avatarUrl} sizeClassName="w-12 h-12 sm:w-16 sm:h-16" />
                </div>
                <div className="font-black text-xs sm:text-sm text-white group-hover/p:text-blue-400 transition-colors truncate max-w-full text-center">
                  {p.nickname}
                </div>
                <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider truncate">
                  {p.role || 'rifler'}
                </div>
                <div className="mt-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded">
                  {(p.rating || 1000).toLocaleString()}
                </div>
              </div>
            ))}

            {/* Empty slots if roster < 5 */}
            {Array.from({ length: Math.max(0, 5 - teamStats.rosterList.length) }).map((_, idx) => (
              <div key={idx} className="flex flex-col items-center justify-center bg-white/[0.01] border border-dashed border-white/10 rounded-xl p-2 text-white/20">
                <Users className="w-6 h-6 mb-1 opacity-30" />
                <span className="text-[10px] uppercase font-bold">Свободно</span>
              </div>
            ))}
          </div>
        </div>

        {/* TEAM HEADER & MAIN INFO */}
        <div className="p-4 sm:p-6 border-b border-white/10 bg-[#12131e] flex flex-col md:flex-row items-center md:items-start gap-5">
          <div className="relative group/logo">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-black/60 border border-white/15 p-2 flex items-center justify-center shadow-xl">
              <TeamLogo teamName={team.name} logoUrl={team.logoUrl} sizeClassName="w-20 h-20 sm:w-24 sm:h-24" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-[#12131e] border border-white/20 rounded-lg px-2 py-0.5 text-xs font-mono font-bold text-white/90 shadow-lg flex items-center gap-1" title={countryInfo.name}>
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>{countryInfo.code}</span>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center md:justify-start gap-2">
                  <span>{team.name}</span>
                </h1>
                <p className="text-xs text-white/50 font-bold uppercase tracking-wider mt-0.5">
                  Команда • {countryInfo.name}
                </p>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 bg-black/30 border border-white/5 rounded-xl p-2.5 text-center">
              <div>
                <span className="text-[10px] text-white/40 uppercase font-bold block">Винрейт</span>
                <span className="text-sm font-black text-emerald-400 font-mono">{teamStats.winrate}%</span>
              </div>

              <div>
                <span className="text-[10px] text-white/40 uppercase font-bold block">Матчей</span>
                <span className="text-sm font-black text-white font-mono">{teamStats.totalMatches}</span>
              </div>

              <div>
                <span className="text-[10px] text-white/40 uppercase font-bold block">Призовые</span>
                <span className="text-sm font-black text-[#ff8f00] font-mono">${teamStats.totalPrizeMoney.toLocaleString()}</span>
              </div>

              <div>
                <span className="text-[10px] text-white/40 uppercase font-bold block">Тренер</span>
                <span className="text-xs font-bold text-white/80 truncate block">{team.coach || 'Не указан'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* TROPHY CABINET ROW */}
        {teamStats.trophyList.length > 0 && (
          <div className="bg-[#0b0c13] border-b border-white/5 p-3 flex items-center gap-2 overflow-x-auto custom-scrollbar">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/30 shrink-0 px-2 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-[#ff8f00]" /> Трофеи:
            </span>
            {teamStats.trophyList.map((tr, idx) => (
              <div 
                key={idx}
                className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-1.5 shrink-0 text-xs font-bold hover:border-[#ff8f00]/50 transition-colors"
                title={`${tr.title} (${tr.date})`}
              >
                <Trophy className="w-3.5 h-3.5 text-[#ff8f00]" />
                <span className="text-white/90 text-[11px]">{tr.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-white/10 bg-[#141522] overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'info'
                ? 'border-[#ff8f00] text-[#ff8f00] bg-white/5'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Обзор
          </button>

          <button
            onClick={() => setActiveTab('roster')}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'roster'
                ? 'border-[#ff8f00] text-[#ff8f00] bg-white/5'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Состав ({teamStats.rosterList.length})
          </button>

          <button
            onClick={() => setActiveTab('matches')}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'matches'
                ? 'border-[#ff8f00] text-[#ff8f00] bg-white/5'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Swords className="w-3.5 h-3.5" /> Матчи ({teamStats.matchesList.length})
          </button>

          <button
            onClick={() => setActiveTab('maps')}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'maps'
                ? 'border-[#ff8f00] text-[#ff8f00] bg-white/5'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" /> Маппул
          </button>

          {user?.isCustom && (
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap cursor-pointer ml-auto flex items-center gap-2 ${
                activeTab === 'edit'
                  ? 'border-blue-500 text-blue-400 bg-white/5'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Настройки
            </button>
          )}
        </div>

        {/* TAB CONTENTS */}
        <div className={`p-4 sm:p-6 custom-scrollbar flex-1 space-y-6 ${isDownloading ? '' : 'overflow-y-auto'}`}>
          {/* TAB 1: OVERVIEW */}
          {(activeTab === 'info' || isDownloading) && (
            <div className="space-y-6">
              {isDownloading && <div className="text-xl font-black text-white border-b border-white/10 pb-2">Обзор</div>}
              {/* World Rank Progress Box */}
              <div className="bg-[#161726] border border-white/5 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-400" /> Позиция в мировом рейтинге HLTV
                  </h3>
                  <span className="text-xs font-mono font-bold text-emerald-400">Пик: #1 (18 недель)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-black/30 p-4 rounded-xl border border-white/5">
                  <div className="flex flex-col items-center p-2">
                    <span className="text-[10px] text-white/40 uppercase font-bold">Текущий HLTV ранг</span>
                    <span className="text-2xl font-black text-[#ff8f00] font-mono">#{calculatedWorldRank}</span>
                  </div>
                  <div className="flex flex-col items-center p-2 border-y sm:border-y-0 sm:border-x border-white/10">
                    <span className="text-[10px] text-white/40 uppercase font-bold">В Топ-30</span>
                    <span className="text-lg sm:text-xl font-black text-white font-mono">{top30TimeText}</span>
                  </div>
                  <div className="flex flex-col items-center p-2">
                    <span className="text-[10px] text-white/40 uppercase font-bold">Побед / Поражений</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">{teamStats.wins}W - {teamStats.losses}L</span>
                  </div>
                </div>
              </div>

              {/* Map Pool Summary Preview */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-blue-400" /> Основной маппул команды
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(Object.entries(teamStats.mapStats) as [string, { played: number; won: number }][]).slice(0, 4).map(([mapName, data]) => {
                    const wr = data.played > 0 ? Math.round((data.won / data.played) * 100) : 0;
                    return (
                      <div key={mapName} className="bg-[#161726] border border-white/5 rounded-xl p-3 flex flex-col justify-between">
                        <span className="text-xs font-bold text-white">{mapName}</span>
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-white/50 font-mono mb-1">
                            <span>{data.won}W / {data.played}G</span>
                            <span className="text-emerald-400 font-bold">{wr}%</span>
                          </div>
                          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${wr}%` }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ROSTER */}
          {(activeTab === 'roster' || isDownloading) && (
            <div className="space-y-4">
              {isDownloading && <div className="text-xl font-black text-white mt-8 border-b border-white/10 pb-2">Состав Команды</div>}
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" /> Активный состав ({teamStats.rosterList.length} Игроков)
                </h3>
                <span className="text-xs font-mono font-bold text-[#ff8f00]">
                  Сумма PTS (Основа): {teamStats.rosterList.slice(0, 5).reduce((sum: number, p: any) => sum + (p.valRating || 0), 0).toLocaleString()} PTS
                </span>
              </div>

              {ptsSaveNotice && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 animate-fade-in">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{ptsSaveNotice} (Текущий ранг команды: #{calculatedWorldRank})</span>
                </div>
              )}

              {/* Starting 5 */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-[#ff8f00] mb-2">Основной состав (5/5)</h4>
                <div className="space-y-2">
                  {teamStats.rosterList.slice(0, 5).map((p: any, idx: number) => {
                    const currentPtsInput = editingPts[p.id || p.nickname] !== undefined 
                      ? editingPts[p.id || p.nickname] 
                      : (p.valRating || 0);

                    return (
                      <div
                        key={p.id || idx}
                        onClick={() => setSelectedPlayer(p)}
                        className="bg-[#161726] hover:bg-white/[0.06] border border-white/5 hover:border-blue-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-pointer group/item"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-black/40 overflow-hidden border border-white/10 group-hover/item:border-blue-400 transition-colors shrink-0">
                            <PlayerAvatar playerName={p.nickname} avatarUrl={p.avatarUrl} sizeClassName="w-10 h-10" />
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm group-hover/item:text-blue-400 transition-colors flex items-center gap-2">
                              <span>{p.nickname}</span>
                              <span className="text-[10px] font-mono text-white/40 uppercase">[{p.country || 'RU'}]</span>
                            </div>
                            <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{p.role || 'rifler'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 self-end sm:self-auto">
                          <div className="text-right">
                            <span className="text-[10px] text-white/40 uppercase block font-bold">CS Rating</span>
                            <span className="font-mono font-bold text-blue-400 text-xs">{(p.rating || 1000).toLocaleString()}</span>
                          </div>

                          <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] text-[#ff8f00] uppercase font-black tracking-wider">Выдача PTS</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                value={currentPtsInput}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setEditingPts(prev => ({ ...prev, [p.id || p.nickname]: val }));
                                }}
                                className="w-20 bg-black/60 border border-[#ff8f00]/30 rounded-lg px-2 py-1 text-white font-mono text-xs font-black text-center focus:outline-none focus:border-[#ff8f00]"
                                placeholder="0"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGrantPlayerPts(p.id, p.nickname, currentPtsInput);
                                }}
                                className="bg-[#ff8f00] hover:bg-[#ff8f00]/80 active:scale-95 text-black font-black text-[10px] uppercase px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-md"
                                title="Выдать / Сохранить PTS игроку"
                              >
                                Выдать
                              </button>
                            </div>
                          </div>

                          <ExternalLink className="w-4 h-4 text-white/20 group-hover/item:text-blue-400 transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bench 3 */}
              {teamStats.rosterList.length > 5 && (
                <div className="pt-2 border-t border-white/5">
                  <h4 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-2">Скамейка запасных / Замена ({teamStats.rosterList.length - 5}/3)</h4>
                  <div className="space-y-2">
                    {teamStats.rosterList.slice(5).map((p: any, idx: number) => {
                      const currentPtsInput = editingPts[p.id || p.nickname] !== undefined 
                        ? editingPts[p.id || p.nickname] 
                        : (p.valRating || 0);

                      return (
                        <div
                          key={p.id || (idx + 5)}
                          onClick={() => setSelectedPlayer(p)}
                          className="bg-[#121320] hover:bg-white/[0.06] border border-dashed border-white/10 hover:border-blue-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-pointer group/item"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-black/40 overflow-hidden border border-white/10 group-hover/item:border-blue-400 transition-colors shrink-0">
                              <PlayerAvatar playerName={p.nickname} avatarUrl={p.avatarUrl} sizeClassName="w-10 h-10" />
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm group-hover/item:text-blue-400 transition-colors flex items-center gap-2">
                                <span>{p.nickname}</span>
                                <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase font-mono font-bold">Замена</span>
                              </div>
                              <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{p.role || 'rifler'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 self-end sm:self-auto">
                            <div className="text-right">
                              <span className="text-[10px] text-white/40 uppercase block font-bold">CS Rating</span>
                              <span className="font-mono font-bold text-blue-400 text-xs">{(p.rating || 1000).toLocaleString()}</span>
                            </div>

                            <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <span className="text-[10px] text-[#ff8f00] uppercase font-black tracking-wider">Выдача PTS</span>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={currentPtsInput}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setEditingPts(prev => ({ ...prev, [p.id || p.nickname]: val }));
                                  }}
                                  className="w-20 bg-black/60 border border-[#ff8f00]/30 rounded-lg px-2 py-1 text-white font-mono text-xs font-black text-center focus:outline-none focus:border-[#ff8f00]"
                                  placeholder="0"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleGrantPlayerPts(p.id, p.nickname, currentPtsInput);
                                  }}
                                  className="bg-[#ff8f00] hover:bg-[#ff8f00]/80 active:scale-95 text-black font-black text-[10px] uppercase px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-md"
                                  title="Выдать / Сохранить PTS игроку"
                                >
                                  Выдать
                                </button>
                              </div>
                            </div>

                            <ExternalLink className="w-4 h-4 text-white/20 group-hover/item:text-blue-400 transition-colors" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MATCHES */}
          {(activeTab === 'matches' || isDownloading) && (
            <div className="space-y-4">
              {isDownloading && <div className="text-xl font-black text-white mt-8 border-b border-white/10 pb-2">История Матчей</div>}
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                <Swords className="w-4 h-4 text-blue-400" /> История матчей
              </h3>

              {teamStats.matchesList.length === 0 ? (
                <div className="text-center py-8 text-white/40 text-xs">Матчи не найдены в системе</div>
              ) : (
                <div className="space-y-2">
                  {teamStats.matchesList.map((m) => (
                    <div
                      key={m.id}
                      className="bg-[#161726] border border-white/5 rounded-xl p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-8 rounded-full ${m.isWin ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        <div>
                          <div className="text-xs text-white/50 font-bold">{m.tournamentName}</div>
                          <div className="font-black text-white text-sm flex items-center gap-2">
                            <span>vs {m.opponentName}</span>
                            <span className="text-[10px] text-white/40 font-mono">({m.map})</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`font-mono font-black text-sm ${m.isWin ? 'text-emerald-400' : 'text-red-400'}`}>
                          {m.myScore} : {m.oppScore}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MAP POOL */}
          {(activeTab === 'maps' || isDownloading) && (
            <div className="space-y-4">
              {isDownloading && <div className="text-xl font-black text-white mt-8 border-b border-white/10 pb-2">Маппул</div>}
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-blue-400" /> Статистика карт (Active Duty Map Pool)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.entries(teamStats.mapStats) as [string, { played: number; won: number }][]).map(([mapName, data]) => {
                  const wr = data.played > 0 ? Math.round((data.won / data.played) * 100) : 0;
                  return (
                    <div key={mapName} className="bg-[#161726] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-white text-sm">{mapName}</span>
                        <span className={`font-mono font-black text-xs px-2 py-0.5 rounded ${wr >= 60 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/60'}`}>
                          {wr}% Winrate
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-white/50 font-mono">
                          <span>Сыграно карт: {data.played}</span>
                          <span>Побед: {data.won}</span>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${wr}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: EDIT (ADMIN/CUSTOM USER) */}
          {activeTab === 'edit' && user?.isCustom && !isDownloading && (
            <div className="space-y-4 bg-[#161726] border border-white/5 rounded-2xl p-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                <Settings className="w-4 h-4" /> Настройки профиля команды
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/60 font-bold block mb-1">Название команды</label>
                  <TeamAutocompleteInput value={editName} onChange={setEditName} className="bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none w-full" placeholder="Название команды" />
                </div>

                <div>
                  <label className="text-xs text-white/60 font-bold block mb-1">Страна / Регион</label>
                  <select
                    value={editCountry}
                    onChange={e => setEditCountry(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {Object.entries(COUNTRY_NAMES).map(([code, info]) => (
                      <option key={code} value={code}>[{info.code}] {info.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-white/60 font-bold block mb-1">Мировой рейтинг HLTV (#)</label>
                  <input
                    type="number"
                    value={editWorldRank}
                    onChange={e => setEditWorldRank(Number(e.target.value))}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60 font-bold block mb-1">Главный тренер (Coach)</label>
                  <input
                    type="text"
                    value={editCoach}
                    onChange={e => setEditCoach(e.target.value)}
                    placeholder="e.g. Sergey 'hally' Shavaev"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-white/10">
                {saveSuccess ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Изменения успешно сохранены!
                  </span>
                ) : <span></span>}

                <button
                  onClick={handleSaveEdit}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Сохранить изменения
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NESTED PLAYER PROFILE MODAL */}
      {selectedPlayer && (
        <PlayerProfileModal
          player={selectedPlayer}
          user={user}
          onClose={() => setSelectedPlayer(null)}
          onUpdatePlayer={(updatedPlayer) => {
            const updatedPlayers = (currentTeam.players || []).map((p: any) => {
              if (
                (p.id && p.id === updatedPlayer.id) ||
                (p.nickname && p.nickname.trim().toLowerCase() === updatedPlayer.nickname?.trim().toLowerCase())
              ) {
                return { ...p, ...updatedPlayer };
              }
              return p;
            });

            const updatedTotalVal = updatedPlayers.slice(0, 5).reduce((acc: number, p: any) => acc + (p?.valRating || 0), 0);
            const updatedTeamData = {
              ...currentTeam,
              players: updatedPlayers,
              totalValRating: updatedTotalVal
            };

            setCurrentTeam(updatedTeamData);
            if (onUpdateTeam) {
              onUpdateTeam(updatedTeamData);
            }
            setSelectedPlayer(null);
            window.dispatchEvent(new Event("db-user-updated"));
          }}
        />
      )}
    </div>
  );
}
