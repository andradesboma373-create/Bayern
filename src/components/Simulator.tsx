import { TeamAutocompleteInput } from './TeamAutocompleteInput';
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, doc, setDoc, getDoc, query, where, getDocs, updateDoc} from '../firebase';
import TeamLogo from './TeamLogo';
import PlayerAvatar from './PlayerAvatar';

import { simulateMatchSeries, MAP_POOL_CS2, MAP_POOL_S2 } from '../lib/simulation';
import VetoModal from "./VetoModal";
import { saveMatchesToLocalStorage } from '../lib/utils';
import { updateBetaTournamentMatchResult, loadTournaments } from './setka_tourn/storage';

const DEFAULT_TEAM_T = [
  { nickname: 'Player 1', role: 'rifler', rating: 150 },
  { nickname: 'Player 2', role: 'sniper', rating: 136 },
  { nickname: 'Player 3', role: 'rifler', rating: 132 },
  { nickname: 'Player 4', role: 'support', rating: 129 },
  { nickname: 'Player 5', role: 'captain', rating: 143 },
];

const DEFAULT_TEAM_CT = [
  { nickname: 'Player 1', role: 'rifler', rating: 147 },
  { nickname: 'Player 2', role: 'sniper', rating: 134 },
  { nickname: 'Player 3', role: 'rifler', rating: 128 },
  { nickname: 'Player 4', role: 'support', rating: 126 },
  { nickname: 'Player 5', role: 'captain', rating: 140 },
];

const FORMS = [
  { label: 'Идеальная', value: 5, color: 'text-green-400' },
  { label: 'Хорошая', value: 2, color: 'text-green-500' },
  { label: 'Пойдет', value: 0, color: 'text-gray-400' },
  { label: 'Более менее', value: -2, color: 'text-yellow-500' },
  { label: 'Устали', value: -5, color: 'text-red-500' }
];

async function updatePlayerStats(db: any, userId: string, matchResult: any, isLocal: boolean = false) {
  if (!userId || userId === 'anonymous') return;
  const allPlayers = [
    ...matchResult.team1Stats.map((p: any) => ({ ...p, team: matchResult.team1Name || 'Team 1' })),
    ...matchResult.team2Stats.map((p: any) => ({ ...p, team: matchResult.team2Name || 'Team 2' }))
  ];

  if (isLocal) {
    try {
      const localStats = JSON.parse(localStorage.getItem(`playerStats_${userId}`) || '{}');
      await Promise.all(allPlayers.map(async (player) => {
        if (!player.nickname) return;
        const key = `${player.team.toLowerCase().replace(/[^a-z0-9]/g, '')}_${player.nickname.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        const d = localStats[key] || { matches: 0, kills: 0, deaths: 0, ratingSum: 0 };
        
        const newMatches = d.matches + 1;
        const newKills = d.kills + player.kills;
        const newDeaths = d.deaths + player.deaths;
        const newRatingSum = (d.ratingSum || (parseFloat(d.rating) || 1.0) * d.matches) + parseFloat(player.hltvRating);
        
        localStats[key] = {
          userId,
          nickname: player.nickname,
          teamName: player.team,
          matches: newMatches,
          kills: newKills,
          deaths: newDeaths,
          kd: (newKills / Math.max(1, newDeaths)).toFixed(2),
          rating: (newRatingSum / newMatches).toFixed(2),
          ratingSum: newRatingSum
        };
      }));
      localStorage.setItem(`playerStats_${userId}`, JSON.stringify(localStats));
    } catch (err) {
      console.error('Error updating local player stats', err);
    }
    return;
  }

  await Promise.all(allPlayers.map(async (player) => {
    if (!player.nickname) return;
    const statId = `${userId}_${player.team.toLowerCase().replace(/[^a-z0-9]/g, '')}_${player.nickname.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const docRef = doc(db, 'playerStats', statId);
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const d = snap.data();
        let matchRating = parseFloat(player.hltvRating || player.rating);
        if (isNaN(matchRating)) matchRating = 1.0;
        
        let oldMatches = d.matches || 0;
        let oldKills = Number(d.kills) || 0;
        let oldDeaths = Number(d.deaths) || 0;
        let oldRating = parseFloat(d.rating);
        if (isNaN(oldRating)) oldRating = 1.0;

        await setDoc(docRef, {
          userId,
          nickname: player.nickname,
          teamName: player.team,
          matches: oldMatches + 1,
          kills: oldKills + player.kills,
          deaths: oldDeaths + player.deaths,
          kd: ((oldKills + player.kills) / Math.max(1, oldDeaths + player.deaths)).toFixed(2),
          rating: ((oldRating * oldMatches + matchRating) / (oldMatches + 1)).toFixed(2)
        }, { merge: true });
      } else {
        let matchRating = parseFloat(player.hltvRating || player.rating);
        if (isNaN(matchRating)) matchRating = 1.0;

        await setDoc(docRef, {
          userId,
          nickname: player.nickname,
          teamName: player.team,
          matches: 1,
          kills: player.kills,
          deaths: player.deaths,
          kd: player.kd || (player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills),
          rating: matchRating.toFixed(2)
        });
      }
    } catch (e) {
      console.error(e);
    }
  }));

  // Contract mechanic disabled per user request
  try {
    // No contract checks
  } catch (err) {
    console.error("Error updating match contracts", err);
  }
}

export default function Simulator({ user }: { user: any }) {
  const resultContainerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [game, setGame] = useState('cs2');
  const [format, setFormat] = useState('BO3');
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [team1, setTeam1] = useState(DEFAULT_TEAM_T);
  const [team2, setTeam2] = useState(DEFAULT_TEAM_CT);

  const [team1Synergy, setTeam1Synergy] = useState(100);
  const [team2Synergy, setTeam2Synergy] = useState(100);
      const [selectedMaps, setSelectedMaps] = useState<string[]>([]);
  const [team1Name, setTeam1Name] = useState('NAVI');
  const [team2Name, setTeam2Name] = useState('Vitality');
  const [team1Form, setTeam1Form] = useState(0);
  const [team2Form, setTeam2Form] = useState(0);

  const [historyMatches, setHistoryMatches] = useState<any[]>([]);
  const [h2hMatches, setH2hMatches] = useState<any[]>([]);


  const [team1MapExp, setTeam1MapExp] = useState<Record<string, number>>({});
  const [team2MapExp, setTeam2MapExp] = useState<Record<string, number>>({});
  const [selectedResultTab, setSelectedResultTab] = useState<'overall' | number>('overall');
  const [view, setView] = useState<'setup' | 'live' | 'result'>('setup');
  const [showVeto, setShowVeto] = useState(false);
  const [channelTeams, setChannelTeams] = useState<any[]>([]);
  const [showChannelLoad, setShowChannelLoad] = useState<1 | 2 | null>(null);
  const [teamSearch, setTeamSearch] = useState("");
  const [notifyingManagers, setNotifyingManagers] = useState(false);

  useEffect(() => {
    if (location.state) {
      const state = location.state as any;
      if (state.team1 && state.team2) {
        const isCS2 = (state.game || 'cs2') === 'cs2';
        const boStr = (state.format || 'BO3').toUpperCase();
        const bo = parseInt(boStr.replace('BO', '')) || 3;
        
        let pickedMaps = state.selectedMaps || [];
        if (pickedMaps.length < bo) {
          const mapPool = (isCS2 ? MAP_POOL_CS2 : MAP_POOL_S2).map(m => m.name);
          const availableMaps = mapPool.filter(m => !pickedMaps.includes(m));
          const needed = bo - pickedMaps.length;
          const randomPicks = [...availableMaps].sort(() => Math.random() - 0.5).slice(0, needed);
          pickedMaps = [...pickedMaps, ...randomPicks];
        }

        const preparePlayers = (t: any) => {
          if (!t) return [1, 2, 3, 4, 5].map(i => ({ nickname: `Игрок #${i}`, role: i === 1 ? 'awper' : i === 2 ? 'entry' : i === 3 ? 'captain' : 'rifler', rating: 130 }));

          if (t.players && Array.isArray(t.players) && t.players.length > 0) {
            const mainRoster = t.players.slice(0, 5);
            const validEmbedded = mainRoster.filter((p: any) => p && p.nickname && p.nickname !== 'Пусто' && p.nickname.trim() !== '');
            if (validEmbedded.length > 0) {
              return validEmbedded.map((p: any, i: number) => ({
                ...p,
                nickname: p.nickname || p.name || `Игрок ${i+1}`,
                role: p.role || (i === 0 ? 'awper' : i === 1 ? 'entry' : i === 2 ? 'captain' : 'rifler'),
                rating: p.rating || 130
              }));
            }
          }

          const uid = user?.uid || 'guest';
          const localTeams = JSON.parse(localStorage.getItem(`teams_${uid}`) || '[]');
          const localPlayers = JSON.parse(localStorage.getItem(`players_${uid}`) || '[]');

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
                ...p,
                nickname: p.nickname || p.name || `Игрок ${i+1}`,
                role: p.role || (i === 0 ? 'awper' : i === 1 ? 'entry' : i === 2 ? 'captain' : 'rifler'),
                rating: p.rating || 130
              }));
            }
          }

          const matchingPlayers = localPlayers.filter((p: any) => 
            (teamId && p.teamId === teamId) ||
            (teamName && p.teamName && p.teamName.toLowerCase().trim() === teamName.toLowerCase().trim())
          );

          if (matchingPlayers.length > 0) {
            return matchingPlayers.slice(0, 5).map((p: any, i: number) => ({
              ...p,
              nickname: p.nickname || p.name || `Игрок ${i+1}`,
              role: p.role || (i === 0 ? 'awper' : i === 1 ? 'entry' : i === 2 ? 'captain' : 'rifler'),
              rating: p.rating || 130
            }));
          }

          return [1, 2, 3, 4, 5].map(i => ({
            nickname: `${t.name || 'Игрок'} #${i}`,
            role: i === 1 ? 'awper' : i === 2 ? 'entry' : i === 3 ? 'captain' : 'rifler',
            rating: 130
          }));
        };

        const formattedT1 = preparePlayers(state.team1);
        const formattedT2 = preparePlayers(state.team2);

        // Update component states
        setGame(state.game || 'cs2');
        setFormat(boStr.startsWith('BO') ? boStr : `BO${boStr}`);
        setTeam1Name(state.team1.name || 'Team 1');
        setTeam2Name(state.team2.name || 'Team 2');
        setTeam1(formattedT1);
        setTeam2(formattedT2);
        setSelectedMaps(pickedMaps);
        if (state.selectedTournament) {
          setSelectedTournament(state.selectedTournament);
        }
        setTeam1Synergy(100);
        setTeam2Synergy(100);
        setTeam1Form(0);
        setTeam2Form(0);
        setView('setup');

        // Reset location state immediately to prevent re-simulating on hot reloads
        navigate(location.pathname, { replace: true, state: null });
      }
    }
  }, [location.state, user]);

  const handleNotifyMapPickBan = async () => {
    if (!user) return;
    setNotifyingManagers(true);
    try {
      const tq = query(collection(db, 'teams'), where('channelId', '==', user.uid));
      const tSnap = await getDocs(tq);
      const allTeams = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const t1 = allTeams.find((t: any) => t.name.toLowerCase() === team1Name.toLowerCase());
      const t2 = allTeams.find((t: any) => t.name.toLowerCase() === team2Name.toLowerCase());
      const tourneyName = selectedTournament ? tournaments.find(t => t.id === selectedTournament)?.name : 'Чемпионат';

      if (t1) {
        await fetch('/api/bot/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            teamId: t1.id,
            text: `🎮 *Турнирный матч!* 🏆\n\nУ вас запланирован матч в турнире *${tourneyName}* против команды *${team2Name}*!\n\nВам необходимо зайти на сайт, чтобы *распикать карты* (пройти процедуру пика/бана карт) для начала игры.`
          })
        });
      }

      if (t2) {
        await fetch('/api/bot/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            teamId: t2.id,
            text: `🎮 *Турнирный матч!* 🏆\n\nУ вас запланирован матч в турнире *${tourneyName}* против команды *${team1Name}*!\n\nВам необходимо зайти на сайт, чтобы *распикать карты* (пройти процедуру пика/бана карт) для начала игры.`
          })
        });
      }

      alert('Оповещения об обязательной стадии пика/бана карт успешно отправлены лидерам команд в Telegram!');
    } catch (err: any) {
      console.error("Error notifying map pick ban:", err);
      alert('Ошибка при отправке оповещений: ' + err.message);
    } finally {
      setNotifyingManagers(false);
    }
  };

  const handleOpenChannelLoad = async (teamIdx: 1 | 2) => {
    if (user?.isCustom) {
      try {
        if (user.isLocalDemo) {
          
        }
        // Загружаем команды и игроков параллельно для синхронизации свежих рейтингов
        const [teamsSnap, playersSnap] = await Promise.all([
          getDocs(query(collection(db, 'teams'), where('channelId', '==', user.uid))),
          getDocs(query(collection(db, 'players'), where('channelId', '==', user.uid)))
        ]);

        const dbTeams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const dbPlayers = playersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Синхронизируем статические данные игроков в команде со свежими рейтингами из базы игроков
        const localPlayers = JSON.parse(localStorage.getItem(`players_${user.uid}`) || '[]');
        const fullySyncedTeams = dbTeams.map((t: any) => {
          const syncedPlayers = t.players?.map((tp: any) => {
            if (tp) {
              const currentPInDb = dbPlayers.find((p: any) => (tp.id && p.id === tp.id) || (p.nickname && tp.nickname && p.nickname.toLowerCase().trim() === tp.nickname.toLowerCase().trim()));
              const currentPInLocal = localPlayers.find((p: any) => (tp.id && p.id === tp.id) || (p.nickname && tp.nickname && p.nickname.toLowerCase().trim() === tp.nickname.toLowerCase().trim()));
              const currentP = currentPInLocal || currentPInDb;

              if (currentP) {
                return {
                  ...tp,
                  nickname: currentP.nickname || tp.nickname,
                  role: currentP.role || tp.role,
                  rating: currentP.rating !== undefined && currentP.rating !== null ? Number(currentP.rating) : tp.rating,
                  valRating: currentP.valRating !== undefined && currentP.valRating !== null ? Number(currentP.valRating) : (tp.valRating || 0)
                };
              }
            }
            return tp;
          });
          return { ...t, players: syncedPlayers };
        });

        setChannelTeams(fullySyncedTeams);
      } catch (e) {
        console.warn("Using localStorage fallback for teams in Simulator load", e);
        const localTeams = JSON.parse(localStorage.getItem(`teams_${user.uid}`) || '[]');
        const localPlayers = JSON.parse(localStorage.getItem(`players_${user.uid}`) || '[]');

        const fullySyncedLocalTeams = localTeams.map((t: any) => {
          const syncedPlayers = t.players?.map((tp: any) => {
            if (tp) {
              const currentP = localPlayers.find((p: any) => p.id === tp.id || (p.nickname && tp.nickname && p.nickname.toLowerCase().trim() === tp.nickname.toLowerCase().trim()));
              if (currentP) {
                return {
                  ...tp,
                  nickname: currentP.nickname,
                  role: currentP.role,
                  rating: currentP.rating,
                  valRating: currentP.valRating || 0
                };
              }
            }
            return tp;
          });
          return { ...t, players: syncedPlayers };
        });

        setChannelTeams(fullySyncedLocalTeams);
      }
    }
    setShowChannelLoad(teamIdx);
  };
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  useEffect(() => {
    if (!user || !team1Name || !team2Name) return;
    const fetchH2H = async () => {
      try {
        if (user.isLocalDemo) {
          
        }
        const q = query(collection(db, 'matches'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        const combined = snap.docs.map(d => ({...d.data(), id: d.id}));
        const filtered = combined.filter((m: any) => 
          (m.team1Name && m.team2Name && (
            (m.team1Name.toLowerCase() === team1Name.toLowerCase() && m.team2Name.toLowerCase() === team2Name.toLowerCase()) ||
            (m.team1Name.toLowerCase() === team2Name.toLowerCase() && m.team2Name.toLowerCase() === team1Name.toLowerCase())
          ))
        );
        filtered.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setH2hMatches(filtered.slice(0, 5));
      } catch (e) {
        
        const localMatches = JSON.parse(localStorage.getItem(`matches_${user.uid}`) || '[]');
        const filtered = localMatches.filter((m: any) => 
          m.team1Name && m.team2Name && (
            (m.team1Name.toLowerCase() === team1Name.toLowerCase() && m.team2Name.toLowerCase() === team2Name.toLowerCase()) ||
            (m.team1Name.toLowerCase() === team2Name.toLowerCase() && m.team2Name.toLowerCase() === team1Name.toLowerCase())
          )
        );
        filtered.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setH2hMatches(filtered.slice(0, 5));
      }
    };
    fetchH2H();
  }, [user, team1Name, team2Name, view]);

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        // 1. Immediate local cache load for maximum speed and offline support
        const localTournaments = loadTournaments(user.uid);
        setTournaments(localTournaments.map((t: any) => ({ ...t, displayName: t.name })));

        const localMatches = JSON.parse(localStorage.getItem(`matches_${user.uid}`) || '[]');
        setHistoryMatches(localMatches.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        
        try {
          const { migrateMatchesToMapStats } = await import('../lib/mapStats');
          migrateMatchesToMapStats(user.uid, localMatches);
        } catch (e) {}

        try {
          if (user.isLocalDemo) {
            return;
          }
          const q = query(collection(db, 'tournaments'), where('userId', '==', user.uid));
          const qs = await getDocs(q);
          const dbTourneys = qs.docs.map(d => ({ ...d.data(), id: d.id, displayName: d.data().name }));
          setTournaments(dbTourneys);
          try {
            localStorage.setItem(`tournaments_${user.uid}`, JSON.stringify(dbTourneys));
          } catch (e) {}
          
          const mq = query(collection(db, 'matches'), where('userId', '==', user.uid));
          const mqs = await getDocs(mq);
          const dbMatches = mqs.docs.map(d => ({ ...d.data(), id: d.id })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setHistoryMatches(dbMatches);
          try {
            const { migrateMatchesToMapStats } = await import('../lib/mapStats');
            migrateMatchesToMapStats(user.uid, dbMatches);
          } catch (e) {}
          try {
            saveMatchesToLocalStorage(user.uid, dbMatches);
          } catch (e) {}
        } catch (e) {
          console.warn("Using localStorage fallback for tournaments/matches in Simulator", e);
        }
      };

      fetchData();

      const handleSync = () => {
        const updatedTourneys = loadTournaments(user.uid);
        setTournaments(updatedTourneys.map((t: any) => ({ ...t, displayName: t.name })));
      };
      window.addEventListener('tournaments-updated', handleSync);
      return () => window.removeEventListener('tournaments-updated', handleSync);
    }
  }, [user]);

  const downloadPhoto = async () => {
    if (!result || !resultContainerRef.current) return;
    try {
      const { toPng } = await import('html-to-image');
      const transparentPlaceholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      let imgData: string;
      try {
        imgData = await toPng(resultContainerRef.current, {
          backgroundColor: '#0a0a0f',
          cacheBust: true,
          pixelRatio: 2,
          skipFonts: true,
          fontEmbedCSS: '',
          imagePlaceholder: transparentPlaceholder,
          style: {
            borderRadius: '1.5rem',
          }
        });
      } catch (retryErr) {
        imgData = await toPng(resultContainerRef.current, {
          backgroundColor: '#0a0a0f',
          pixelRatio: 1.5,
          skipFonts: true,
          fontEmbedCSS: '',
          imagePlaceholder: transparentPlaceholder,
          style: {
            borderRadius: '1.5rem',
          }
        });
      }
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", imgData);
      downloadAnchorNode.setAttribute("download", `match_${result.team1Name}_vs_${result.team2Name}_${Date.now()}.png`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (e: any) {
      console.error('Ошибка создания изображения:', e?.message || e);
      alert('Error creating image: ' + (e?.message || e));
    }
  };

  const handleSimulate = async () => {
    setIsSimulating(true);
    setSelectedResultTab(format === 'BO1' ? 0 : 'overall');
    try {
      const isCS2 = game === 'cs2';
      const bo = parseInt(format.replace('BO', ''));
      
      let pickedMaps = selectedMaps;
      if (pickedMaps.length < bo) {
        const mapPool = (isCS2 ? MAP_POOL_CS2 : MAP_POOL_S2).map(m => m.name);
        const availableMaps = mapPool.filter(m => !pickedMaps.includes(m));
        const needed = bo - pickedMaps.length;
        const randomPicks = [...availableMaps].sort(() => Math.random() - 0.5).slice(0, needed);
        pickedMaps = [...pickedMaps, ...randomPicks];
      }

      const selectedTourneyObj = tournaments.find(t => t.id === selectedTournament);
      const tourneyName = selectedTourneyObj ? selectedTourneyObj.name : 'Test Tournament';

      const simResult = simulateMatchSeries(
        team1, team2, team1Synergy, team2Synergy, 'default', 'default', pickedMaps, isCS2 ? 'MR12' : 'MR15', isCS2, tourneyName,
        team1Form, team2Form, team1MapExp, team2MapExp
      );
      
      const newMatch: any = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        gameMode: simResult.gameMode,
        tournamentName: simResult.tournamentName,
        tournamentId: selectedTournament || null,
        format: simResult.format,
        bo: simResult.bo,
        team1Name: team1Name || 'Team T',
        team2Name: team2Name || 'Team CT',
        team1Score: simResult.team1Score,
        team2Score: simResult.team2Score,
        userId: user?.uid || 'anonymous',
        mvp: (simResult as any).mvp ? {
            nickname: (simResult as any).mvp.nickname,
            kills: (simResult as any).mvp.kills,
            deaths: (simResult as any).mvp.deaths,
            kd: (simResult as any).mvp.kd,
            hltvRating: (simResult as any).mvp.hltvRating
        } : null,
        team1Stats: simResult.team1Stats,
        team2Stats: simResult.team2Stats,
        maps: simResult.maps,
        achievements: (simResult as any).achievements || []
      };

      const isLocal = !user || user.isLocalDemo;
      const matchToSave = { ...newMatch, maps: newMatch.maps.map((m: any) => { const { roundLogs, ...rest } = m; return rest; }) };

      if (user) {
        if (isLocal) {
          const localMatches = JSON.parse(localStorage.getItem(`matches_${user.uid}`) || '[]');
          localMatches.push(matchToSave);
          saveMatchesToLocalStorage(user.uid, localMatches);
          await updatePlayerStats(db, user.uid, matchToSave, true);
          try {
            const { updateMapStats } = await import('../lib/mapStats');
            await updateMapStats(user.uid, matchToSave, true);
          } catch (e) {}

          if (selectedTournament) {
            updateBetaTournamentMatchResult(
              user.uid,
              selectedTournament,
              newMatch.team1Name,
              newMatch.team2Name,
              newMatch.team1Score,
              newMatch.team2Score
            );
            const localTourneys = JSON.parse(localStorage.getItem(`tournaments_${user.uid}`) || '[]');
            const idx = localTourneys.findIndex((t: any) => t.id === selectedTournament);
            if (idx !== -1) {
              localTourneys[idx].matchIds = [...(localTourneys[idx].matchIds || []), newMatch.id];
              localStorage.setItem(`tournaments_${user.uid}`, JSON.stringify(localTourneys));
            }
          }
        } else {
          try {
            const docRef = await addDoc(collection(db, 'matches'), matchToSave);
            newMatch.id = docRef.id;
            await updatePlayerStats(db, user.uid, matchToSave, false);
            try {
              const { updateMapStats } = await import('../lib/mapStats');
              await updateMapStats(user.uid, matchToSave, false);
            } catch (e) {}
            
            if (selectedTournament) {
               updateBetaTournamentMatchResult(
                 user.uid,
                 selectedTournament,
                 newMatch.team1Name,
                 newMatch.team2Name,
                 newMatch.team1Score,
                 newMatch.team2Score
               );
               try {
                 const tDoc = await getDoc(doc(db, 'tournaments', selectedTournament));
                 if (tDoc.exists()) {
                     const tData = tDoc.data();
                     const newMatchIds = [...(tData.matchIds || []), docRef.id];
                     await setDoc(doc(db, 'tournaments', selectedTournament), { matchIds: newMatchIds }, { merge: true });
                 }
               } catch(e) { console.error('Error attaching to tournament', e); }
            }
          } catch (e) {
            console.warn("Saving simulated match locally as fallback", e);
            const localMatches = JSON.parse(localStorage.getItem(`matches_${user.uid}`) || '[]');
            localMatches.push(matchToSave);
            saveMatchesToLocalStorage(user.uid, localMatches);
            await updatePlayerStats(db, user.uid, matchToSave, true);
            try {
              const { updateMapStats } = await import('../lib/mapStats');
              await updateMapStats(user.uid, matchToSave, true);
            } catch (e) {}
          }
        }
      }

      setResult(newMatch);
      setView('result');
    } catch (e: any) {
      console.error(e);
      alert('Ошибка симуляции: ' + (e.message || e));
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSaveTeam = (teamName: string, players: any[]) => {
    const data = JSON.stringify({ teamName, players }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${teamName || 'team'}_preset.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadChannelTeam = (teamIdx: 1 | 2, team: any) => {
    const localPlayers = JSON.parse(localStorage.getItem(`players_${user.uid}`) || '[]');
    
    // Only load main roster (first 5 players). Bench players do not play in matches!
    const mainRoster = (team.players || []).slice(0, 5);
    const formattedPlayers = mainRoster.map((p: any) => {
      // Ищем самую свежую информацию об игроке в локальной базе по ID или никнейму
      const latestPlayer = localPlayers.find((lp: any) => (p && p.id && lp.id === p.id) || (p && p.nickname && lp && lp.nickname && lp.nickname.toLowerCase().trim() === p.nickname.toLowerCase().trim()));
      
      const resolvedRating = latestPlayer && latestPlayer.rating !== undefined && latestPlayer.rating !== null 
        ? Number(latestPlayer.rating) 
        : (p && p.rating !== undefined && p.rating !== null ? Number(p.rating) : 100);

      return {
        id: p?.id || latestPlayer?.id,
        nickname: latestPlayer ? latestPlayer.nickname : (p ? p.nickname : ''),
        role: latestPlayer ? latestPlayer.role : (p ? p.role : 'rifler'),
        rating: isNaN(resolvedRating) ? 100 : resolvedRating
      };
    });
    
    // Ensure 5 players
    while (formattedPlayers.length < 5) {
      formattedPlayers.push({ nickname: '', role: 'rifler', rating: 100 });
    }

    if (teamIdx === 1) {
      setTeam1Name(team.name);
      setTeam1(formattedPlayers);
    } else {
      setTeam2Name(team.name);
      setTeam2(formattedPlayers);
    }
    setShowChannelLoad(null);
  };

  const handleLoadTeam = (teamIdx: 1 | 2) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.teamName && data.players && Array.isArray(data.players)) {
            if (teamIdx === 1) {
              setTeam1Name(data.teamName);
              setTeam1(data.players);
            } else {
              setTeam2Name(data.teamName);
              setTeam2(data.players);
            }
          } else {
            alert("Неверный формат файла пресета");
          }
        } catch (e) {
          console.error(e);
          alert("Ошибка при чтении файла");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const updatePlayer = (teamIndex: number, playerIndex: number, field: string, value: string | number) => {
    if (teamIndex === 1) {
      const newTeam = [...team1];
      newTeam[playerIndex] = { ...newTeam[playerIndex], [field]: value };
      setTeam1(newTeam);
    } else {
      const newTeam = [...team2];
      newTeam[playerIndex] = { ...newTeam[playerIndex], [field]: value };
      setTeam2(newTeam);
    }
  };

  if (view === 'result') {
    return (
      <div className="flex flex-col gap-6 w-full animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black text-white tracking-widest uppercase">РЕЗУЛЬТАТЫ МАТЧА</h2>
          <div className="flex gap-4">
            <button onClick={downloadPhoto} className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer">
              <span>📷</span> СКАЧАТЬ ФОТО
            </button>
            <button onClick={() => { setResult(null); setView('setup'); }} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-sm transition-colors cursor-pointer">
              НАЗАД К НАСТРОЙКАМ
            </button>
          </div>
        </div>

        <div ref={resultContainerRef} className="flex flex-col gap-6 bg-[#0a0a0f] p-6 rounded-3xl border border-white/5">
          <div className="bg-gradient-to-br from-[#12121a] to-[#1a1a24] border border-white/10 shadow-2xl shadow-black/50 rounded-2xl p-8 text-center relative overflow-hidden"
               style={(selectedResultTab !== 'overall' && result.maps && result.maps[selectedResultTab as number]) ? {
                 backgroundImage: `linear-gradient(to bottom, rgba(18,18,26,0.85), rgba(26,26,36,0.95)), url('/maps/${result.maps[selectedResultTab as number].mapName.toLowerCase()}.jpg')`,
                 backgroundSize: 'cover',
                 backgroundPosition: 'center'
               } : (result.bo === 1 && result.maps && result.maps.length > 0) ? {
                 backgroundImage: `linear-gradient(to bottom, rgba(18,18,26,0.85), rgba(26,26,36,0.95)), url('/maps/${result.maps[0].mapName.toLowerCase()}.jpg')`,
                 backgroundSize: 'cover',
                 backgroundPosition: 'center'
               } : {}}>
          <div className="absolute top-0 left-0 w-64 h-64 bg-[#ff8f00]/10 blur-[80px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none translate-x-1/2 translate-y-1/2"></div>
          <div className="flex items-center justify-center gap-6 mb-4 relative z-10">
            <TeamLogo game={game === "cs2" ? "cs2" : "s2"} teamName={result.team1Name} sizeClassName="w-16 h-16 text-2xl" />
            <h2 className="text-3xl font-black tracking-widest text-white uppercase">{result.team1Name} vs {result.team2Name}</h2>
            <TeamLogo game={game === "cs2" ? "cs2" : "s2"} teamName={result.team2Name} sizeClassName="w-16 h-16 text-2xl" />
          </div>
          <div className="text-6xl font-black tracking-widest mb-6 relative z-10 drop-shadow-xl">
            <span className={((result.bo === 1 && result.maps.length > 0) ? result.maps[0].team1Score : result.team1Score) > ((result.bo === 1 && result.maps.length > 0) ? result.maps[0].team2Score : result.team2Score) ? 'text-[#ff8f00] drop-shadow-[0_0_15px_rgba(255,143,0,0.5)]' : 'text-white/50'}>{(result.bo === 1 && result.maps.length > 0) ? result.maps[0].team1Score : result.team1Score}</span>
            <span className="mx-6 text-white/20 text-4xl">:</span>
            <span className={((result.bo === 1 && result.maps.length > 0) ? result.maps[0].team2Score : result.team2Score) > ((result.bo === 1 && result.maps.length > 0) ? result.maps[0].team1Score : result.team1Score) ? 'text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'text-white/50'}>{(result.bo === 1 && result.maps.length > 0) ? result.maps[0].team2Score : result.team2Score}</span>
          </div>
          {result.mvp && (
            <div className="inline-flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-6 py-2 mb-6">
              <span className="text-yellow-500">⭐</span>
              <span className="text-white font-bold text-sm tracking-widest uppercase">MVP: {result.mvp.nickname}</span>
              <span className="text-yellow-500 font-black">{result.mvp.hltvRating}</span>
            </div>
          )}


          
          {result.bo !== 1 && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <button 
                onClick={() => setSelectedResultTab('overall')}
                className={`w-full max-w-md px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center min-h-[48px] ${selectedResultTab === 'overall' ? 'bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
              >
                ОБЩАЯ СТАТИСТИКА
              </button>
              <div className="flex flex-wrap justify-center gap-3">
                {result.maps.map((map: any, i: number) => (
                  <button 
                    key={i}
                    onClick={() => setSelectedResultTab(i)}
                    className={`relative overflow-hidden group w-[120px] h-[80px] rounded-xl font-bold transition-all ${selectedResultTab === i ? 'ring-2 ring-white/50 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'opacity-70 hover:opacity-100 hover:ring-1 hover:ring-white/20'}`}
                  >
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                      style={{ backgroundImage: `url('/maps/${map.mapName.toLowerCase()}.jpg')` }}
                      title={map.mapName}
                    />
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                      <span className="text-[10px] text-white/70 uppercase tracking-widest mb-1 drop-shadow-md">{map.mapName}</span>
                      <span className="font-black text-xl text-white drop-shadow-lg">
                        {map.team1Score}:{map.team2Score}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6">
          {selectedResultTab === 'overall' ? (
            <div className="bg-[#12121a] border border-white/5 rounded-2xl p-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <StatsTable teamName={`${result.team1Name} (Всего)`} colorClass="text-[#ff8f00]" borderClass="border-[#ff8f00]/30" stats={result.team1Stats} />
                <StatsTable teamName={`${result.team2Name} (Всего)`} colorClass="text-blue-500" borderClass="border-blue-500/30" stats={result.team2Stats} />
              </div>
            </div>
          ) : (
            <div className="bg-[#12121a] border border-white/5 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="text-[#ff8f00] font-bold text-sm uppercase tracking-widest">Карта {selectedResultTab as number + 1}</div>
                  <div className="text-2xl font-black text-white uppercase">{result.maps[selectedResultTab as number].mapName}</div>
                </div>
                <div className="text-3xl font-black">
                  <span className={result.maps[selectedResultTab as number].team1Score > result.maps[selectedResultTab as number].team2Score ? 'text-[#ff8f00]' : 'text-white/50'}>{result.maps[selectedResultTab as number].team1Score}</span>
                  <span className="mx-2 text-white/20">:</span>
                  <span className={result.maps[selectedResultTab as number].team2Score > result.maps[selectedResultTab as number].team1Score ? 'text-blue-500' : 'text-white/50'}>{result.maps[selectedResultTab as number].team2Score}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <StatsTable teamName={result.team1Name} colorClass="text-[#ff8f00]" borderClass="border-[#ff8f00]/30" stats={result.maps[selectedResultTab as number].team1Stats} />
                <StatsTable teamName={result.team2Name} colorClass="text-blue-500" borderClass="border-blue-500/30" stats={result.maps[selectedResultTab as number].team2Stats} />
              </div>
              
              <RoundTimeline roundLogs={result.maps[selectedResultTab as number].roundLogs} team1Name={result.team1Name} team2Name={result.team2Name} />
            </div>
          )}
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#171728] to-[#121220] rounded-2xl p-6 border border-white/5 relative overflow-hidden flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-blue-500/20 blur-[100px] z-0"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-white tracking-wider mb-2">MATCH SIMULATOR</h1>
          <p className="text-white/50 text-xs font-semibold tracking-[0.2em] uppercase">СИМУЛЯЦИЯ МАТЧЕЙ</p>
        </div>
        
        <div className="relative z-10 flex flex-wrap gap-4 bg-black/40 p-3 rounded-2xl border border-white/10 backdrop-blur-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider ml-1">Игра</span>
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
              <button onClick={() => { setGame('s2'); setSelectedMaps([]); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${game === 's2' ? 'bg-[#ff8f00] text-black shadow-md shadow-[#ff8f00]/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>STANDOFF 2</button>
              <button onClick={() => { setGame('cs2'); setSelectedMaps([]); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${game === 'cs2' ? 'bg-[#ff8f00] text-black shadow-md shadow-[#ff8f00]/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>CS2</button>
            </div>
          </div>
          
          <div className="hidden sm:block w-[1px] bg-white/10 my-1"></div>
          
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider ml-1">Формат</span>
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
              {['BO1', 'BO3', 'BO5'].map(f => (
                <button key={f} onClick={() => { setFormat(f); setSelectedMaps([]); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${format === f ? 'bg-white/20 text-white shadow-md' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>{f}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4">
        {/* Maps Selection */}
        <div className="bg-[#12121a] rounded-2xl p-5 border border-white/5 flex flex-col gap-4 flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-sm text-white font-bold uppercase tracking-wider flex items-center gap-3">
              Выбор карт
              <span className="bg-white/10 text-white/70 px-2.5 py-1 rounded-md text-[10px]">{selectedMaps.length} / {parseInt(format.replace('BO', ''))}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowVeto(true)} className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg font-bold uppercase transition-colors">Вето</button>
              <button onClick={() => {
                const bo = parseInt(format.replace('BO', ''));
                if (selectedMaps.length < bo) {
                  const mapPool = (game === 'cs2' ? MAP_POOL_CS2 : MAP_POOL_S2).map(m => m.name);
                  const availableMaps = mapPool.filter(m => !selectedMaps.includes(m));
                  const needed = bo - selectedMaps.length;
                  const randomPicks = [...availableMaps].sort(() => Math.random() - 0.5).slice(0, needed);
                  setSelectedMaps([...selectedMaps, ...randomPicks]);
                }
              }} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg font-bold uppercase transition-colors">Случайно</button>
              <button onClick={() => setSelectedMaps([])} className="text-xs bg-white/5 text-white/50 hover:bg-white/10 hover:text-white px-3 py-1.5 rounded-lg font-bold uppercase transition-colors">Сбросить</button>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
            {(game === 'cs2' ? MAP_POOL_CS2 : MAP_POOL_S2).map(m => {
              const isSelected = selectedMaps.includes(m.name);
              const canSelect = isSelected || selectedMaps.length < parseInt(format.replace('BO', ''));
              return (
                <button 
                  key={m.id} 
                  onClick={() => {
                    if (isSelected) {
                      setSelectedMaps(selectedMaps.filter(x => x !== m.name));
                    } else if (canSelect) {
                      setSelectedMaps([...selectedMaps, m.name]);
                    }
                  }}
                  disabled={!canSelect && !isSelected}
                  style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.9)), url('/maps/${m.name.toLowerCase()}.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }} className={`relative aspect-[4/3] rounded-xl font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 overflow-hidden group ${isSelected ? 'text-[#ff8f00] border-2 border-[#ff8f00] shadow-[0_0_15px_rgba(255,143,0,0.4)] scale-[1.03] z-10' : canSelect ? 'text-white/80 hover:text-white hover:border-white/30 border-2 border-white/10' : 'text-white/30 opacity-40 border-2 border-white/5 cursor-not-allowed'}`}
                >
                  <span className="truncate w-full text-center">{m.name}</span>
                  <div className="flex gap-2 text-[10px] opacity-70">
                    <span className="text-[#ff8f00]">T: {Math.round(m.tSideBias * 100)}%</span>
                    <span className="text-blue-500">CT: {Math.round(m.ctSideBias * 100)}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Start Match Controls */}
        <div className="bg-[#12121a] rounded-2xl p-5 border border-white/5 flex flex-col justify-end gap-4 min-w-[300px]">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Турнир (Опционально)</label>
            <select 
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#ff8f00]/50 transition-colors"
              disabled={tournaments.length === 0}
            >
              {tournaments.length === 0 ? (
                <option value="">Нет турниров</option>
              ) : (
                <>
                  <option value="">Выставочный матч</option>
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </>
              )}
            </select>
          </div>

          <button 
            onClick={handleSimulate}
            disabled={isSimulating || !user?.isCustom || selectedMaps.length < parseInt(format.replace('BO', ''))}
            className={`w-full py-4 font-black text-sm tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer uppercase
              ${(isSimulating || !user?.isCustom || selectedMaps.length < parseInt(format.replace('BO', ''))) 
                ? 'bg-white/5 text-white/30 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_30px_rgba(37,99,235,0.3)]'}
            `}
          >
            {isSimulating ? 'СИМУЛЯЦИЯ...' : 
             !user?.isCustom ? '🔒 ВОЙДИТЕ В КАНАЛ' : 
             selectedMaps.length < parseInt(format.replace('BO', '')) ? `ВЫБЕРИТЕ ЕЩЕ ${parseInt(format.replace('BO', '')) - selectedMaps.length} КАРТ(Ы)` : 
             '⚡ НАЧАТЬ МАТЧ'}
          </button>
        </div>
      </div>

      {/* H2H and Winrates Section */}
      <div className="bg-[#12121a] border border-white/5 rounded-2xl p-6 mt-6">
        <h3 className="text-xl font-black text-white uppercase tracking-widest mb-4">История встреч (H2H)</h3>
        
        {(() => {
          const h2hHistory = h2hMatches;
          
          const h2hWinsT1 = h2hHistory.filter(m => {
            const m1 = (m.team1Name || '').toLowerCase();
            const m2 = (m.team2Name || '').toLowerCase();
            const t1 = (team1Name || '').toLowerCase();
            return (m1 === t1 && m.team1Score > m.team2Score) || (m2 === t1 && m.team2Score > m.team1Score);
          }).length;
          const h2hWinsT2 = h2hHistory.length - h2hWinsT1;

          const getMapWinrate = (teamName: string, mapName: string) => {
            if (!teamName || !mapName) return '0%';
            
            // 1. Try to read from separate persistent mapStats first
            try {
              const localMapStats = JSON.parse(localStorage.getItem(`mapStats_${user?.uid}`) || '[]');
              const tId = `${teamName.toLowerCase().trim()}_${mapName.toLowerCase().trim()}`;
              const targetStat = localMapStats.find((s: any) => s && s.id === tId);
              if (targetStat && targetStat.played > 0) {
                const wins = targetStat.wins || 0;
                const played = targetStat.played || 0;
                return `${Math.round((wins / played) * 100)}% (${wins}-${played - wins})`;
              }
            } catch (e) {}

            // 2. Fallback to calculating on-the-fly from history matches if mapStats doesn't have it
            const targetName = teamName.toLowerCase();
            const mapMatches = historyMatches.filter(m => {
              const m1 = (m.team1Name || '').toLowerCase();
              const m2 = (m.team2Name || '').toLowerCase();
              return (m1 === targetName || m2 === targetName) && 
                     m.maps && m.maps.some((ma: any) => ma && ma.mapName === mapName);
            });
            if (mapMatches.length === 0) return '0%';
            const wins = mapMatches.filter(m => {
              const mapData = m.maps && m.maps.find((ma: any) => ma && ma.mapName === mapName);
              if (!mapData) return false;
              const m1 = (m.team1Name || '').toLowerCase();
              const m2 = (m.team2Name || '').toLowerCase();
              return (m1 === targetName && mapData.team1Score > mapData.team2Score) || 
                     (m2 === targetName && mapData.team2Score > mapData.team1Score);
            }).length;
            return `${Math.round((wins / mapMatches.length) * 100)}% (${wins}-${mapMatches.length - wins})`;
          };

          return (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/5">
                <div className="text-center">
                  <div className="text-[#ff8f00] font-black text-2xl">{h2hWinsT1}</div>
                  <div className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Победы {team1Name}</div>
                </div>
                <div className="text-center px-4 border-x border-white/10 flex-1">
                  <div className="text-white/20 text-sm font-bold uppercase tracking-widest mb-2">Последние {h2hHistory.length} матчей</div>
                  <div className="flex flex-col gap-1">
                    {h2hHistory.map((m: any, i: number) => {
                      const isT1Left = (m.team1Name || '').toLowerCase() === (team1Name || '').toLowerCase();
                      const leftScore = isT1Left ? m.team1Score : m.team2Score;
                      const rightScore = isT1Left ? m.team2Score : m.team1Score;
                      return (
                        <div key={i} className="flex justify-center items-center text-xs bg-black/40 px-3 py-1.5 rounded border border-white/5">
                          <span className={`font-bold w-20 text-right ${leftScore > rightScore ? 'text-[#ff8f00]' : 'text-white/50'}`}>
                             {team1Name}
                          </span>
                          <span className="text-white font-black tracking-widest mx-3">
                            {leftScore}:{rightScore}
                          </span>
                          <span className={`font-bold w-20 text-left ${rightScore > leftScore ? 'text-blue-500' : 'text-white/50'}`}>
                             {team2Name}
                          </span>
                        </div>
                      );
                    })}
                    {h2hHistory.length === 0 && <div className="text-white/30 text-xs">Нет совместных матчей</div>}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-blue-500 font-black text-2xl">{h2hWinsT2}</div>
                  <div className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Победы {team2Name}</div>
                </div>
              </div>

              {selectedMaps.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-3">Винрейт на выбранных картах</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {selectedMaps.map(mapName => (
                      <div key={mapName} className="bg-black/20 p-3 rounded-lg border border-white/5">
                        <div className="text-center text-white/80 font-black mb-2 border-b border-white/5 pb-2">{mapName}</div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-[#ff8f00]">{getMapWinrate(team1Name, mapName)}</span>
                          <span className="text-white/30">vs</span>
                          <span className="text-blue-500">{getMapWinrate(team2Name, mapName)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
      
      
      {showChannelLoad && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 w-full max-w-4xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-white uppercase tracking-wider">Выберите команду</h3>
              <div className="flex items-center gap-4">
                <TeamAutocompleteInput value={teamSearch} onChange={setTeamSearch} className="bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#ff8f00] font-bold" placeholder="Поиск команды..." />
                <button onClick={() => setShowChannelLoad(null)} className="text-white/50 hover:text-white p-2">✕</button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
              {channelTeams.length === 0 ? (
                <div className="text-center p-8 text-white/40 font-bold bg-black/40 rounded-xl">
                  У вас нет сохраненных команд в базе
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {channelTeams
                    .filter(t => t.name.toLowerCase().includes(teamSearch.toLowerCase()))
                    .map(t => {
                      const mainRoster = (t.players || []).slice(0, 5);
                      const avgRating = (mainRoster.reduce((acc: number, p: any) => acc + (Number(p.rating) || 0), 0) / Math.max(1, mainRoster.length)).toFixed(2);
                      return (
                        <button 
                          key={t.id}
                          onClick={() => handleLoadChannelTeam(showChannelLoad, t)}
                          className="flex flex-col p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-colors text-left group relative overflow-hidden"
                        >
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="flex items-center gap-4 mb-3 w-full">
                            <TeamLogo teamName={t.name} sizeClassName="w-12 h-12 text-xl" />
                            <div className="min-w-0 flex-1">
                              <div className="font-black text-white text-lg truncate w-full" title={t.name}>{t.name}</div>
                              <div className="text-xs font-bold text-[#ff8f00] mt-0.5">Рейтинг: {avgRating}</div>
                            </div>
                          </div>
                          <div className="flex -space-x-2 overflow-hidden mt-1 px-1">
                             {t.players?.map((p, i) => (
                             <PlayerAvatar key={i} game={game === "cs2" ? "cs2" : "s2"} playerName={p.nickname} sizeClassName="h-6 w-6" className="ring-2 ring-[#12121a]" />
                             ))}
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Teams */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TeamCard game={game as "cs2"|"s2"} nameLabel="Команда 1" nameValue={team1Name} onNameChange={setTeam1Name} color="#ff8f00" players={team1} rating={Math.round(team1.reduce((acc, p) => acc + (Number(p.rating) || 0), 0) / Math.max(1, team1.length))} synergy={team1Synergy} form={team1Form} selectedMaps={selectedMaps} mapExp={team1MapExp} onSynergyChange={setTeam1Synergy} onFormChange={setTeam1Form} onMapExpChange={(map, val) => setTeam1MapExp({...team1MapExp, [map]: val})} onChange={(idx, field, val) => updatePlayer(1, idx, field, val)} onSave={() => handleSaveTeam(team1Name, team1)} onLoad={() => handleLoadTeam(1)} onChannelLoad={user?.isCustom ? () => handleOpenChannelLoad(1) : undefined} />
        <TeamCard game={game as "cs2"|"s2"} nameLabel="Команда 2" nameValue={team2Name} onNameChange={setTeam2Name} color="#3b82f6" players={team2} rating={Math.round(team2.reduce((acc, p) => acc + (Number(p.rating) || 0), 0) / Math.max(1, team2.length))} synergy={team2Synergy} form={team2Form} selectedMaps={selectedMaps} mapExp={team2MapExp} onSynergyChange={setTeam2Synergy} onFormChange={setTeam2Form} onMapExpChange={(map, val) => setTeam2MapExp({...team2MapExp, [map]: val})} onChange={(idx, field, val) => updatePlayer(2, idx, field, val)} onSave={() => handleSaveTeam(team2Name, team2)} onLoad={() => handleLoadTeam(2)} onChannelLoad={user?.isCustom ? () => handleOpenChannelLoad(2) : undefined} />
      </div>
      <VetoModal
        isOpen={showVeto}
        onClose={() => setShowVeto(false)}
        onComplete={(maps) => {
          setSelectedMaps(maps);
          setShowVeto(false);
        }}
        team1={team1}
        team2={team2}
        team1Name={team1Name}
        team2Name={team2Name}
        team1MapExp={team1MapExp}
        team2MapExp={team2MapExp}
        format={format}
        game={game}
      />
    </div>
  );
}

function RoundTimeline({ roundLogs, team1Name, team2Name }: { roundLogs: any[]; team1Name: string; team2Name: string }) {
  if (!roundLogs || roundLogs.length === 0) return null;

  return (
    <div className="bg-[#161726] border border-white/5 rounded-2xl p-5 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
        <span className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-2">
          📊 Хронология раундов ({roundLogs.length} р.)
        </span>
        <div className="flex items-center gap-4 text-[11px] font-bold">
          <span className="flex items-center gap-1.5 text-[#ff8f00]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff8f00]"></span> {team1Name}
          </span>
          <span className="flex items-center gap-1.5 text-blue-400">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> {team2Name}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 pt-1 scrollbar-thin">
        {roundLogs.map((rl: any, idx: number) => {
          const isT1 = rl.winner === 1;
          const bgClass = isT1 ? 'bg-[#ff8f00]/15 border-[#ff8f00]/40 text-[#ff8f00]' : 'bg-blue-500/15 border-blue-500/40 text-blue-400';
          const icon = rl.aces?.length ? '💥' : rl.clutch ? '🎯' : rl.scenario === 'bomb_exploded' ? '💣' : rl.scenario === 'bomb_defused' ? '✂️' : rl.isEcoWin ? '💰' : '💀';

          return (
            <div 
              key={idx}
              className={`flex-1 min-w-[40px] max-w-[50px] h-16 rounded-xl border p-1.5 flex flex-col items-center justify-between transition-all hover:scale-105 cursor-pointer shadow-sm ${bgClass}`}
              title={`Раунд ${rl.round}: Победа ${isT1 ? team1Name : team2Name} (${rl.winningSide || (isT1 ? 'T' : 'CT')}). Счёт: ${rl.score}.${rl.aces?.length ? ` ЭЙС от ${rl.aces.join(', ')}!` : ''}${rl.clutch ? ` Клатч 1v${rl.clutch.vs} (${rl.clutch.nickname})` : ''}`}
            >
              <span className="text-[9px] font-black opacity-60">R{rl.round}</span>
              <span className="text-sm">{icon}</span>
              <span className="text-[9px] font-bold font-mono">{rl.score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamCard({ game, nameLabel, nameValue, onNameChange, color, players, rating, synergy, form, selectedMaps, mapExp, onSynergyChange, onFormChange, onMapExpChange, onChange, onSave, onLoad, onChannelLoad }: { nameLabel: string, nameValue: string, onNameChange: (val: string) => void, color: string, players: any[], rating: number, synergy: number, form: number, selectedMaps: string[], mapExp: Record<string, number>, onSynergyChange: (val: number) => void, onFormChange: (val: number) => void, onMapExpChange: (map: string, val: number) => void, onChange: (idx: number, field: string, val: string | number) => void, onSave: () => void, onLoad: () => void, onChannelLoad?: () => void, game?: "cs2" | "s2" }) {
  return (
    <div className="bg-[#12121a] border border-white/5 rounded-2xl p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <TeamLogo game={game} teamName={nameValue} sizeClassName="w-14 h-14 text-xl" />
        <div className="flex-1">
          <TeamAutocompleteInput value={nameValue} onChange={onNameChange} className="bg-transparent border-none text-xl font-black tracking-wider text-white focus:outline-none w-full border-b border-white/10 pb-1 mb-1 focus:border-white/30" placeholder={nameLabel} />
          <p className="text-sm font-semibold text-white/50">Средний рейтинг: {rating}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onSave} title="Сохранить команду (JSON)" className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 transition-colors">💾</button>
          {onChannelLoad && (
            <button onClick={onChannelLoad} title="Загрузить команду из канала" className="w-10 h-10 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 flex items-center justify-center text-blue-500 transition-colors">🌐</button>
          )}
          <button onClick={onLoad} title="Загрузить команду (JSON)" className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 transition-colors">📁</button>
        </div>
      </div>

      {/* Players */}
      <div>
        <div className="flex justify-between px-4 mb-3 text-xs font-bold text-white/40 uppercase tracking-wider">
          <span>Игроки</span>
          <div className="flex gap-3 items-center">
            <span className="w-24 text-left">Роль</span>
            <span className="w-16 text-right">Рейтинг</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {players.map((p, i) => (
            <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2 border border-white/5 focus-within:border-white/20 transition-colors">
              <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                <div className="text-white/20 shrink-0">⋮</div>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs overflow-hidden shrink-0">
                  <PlayerAvatar game={game} playerName={p.nickname} sizeClassName="w-8 h-8" />
                </div>
                <input 
                  type="text" 
                  value={p.nickname} 
                  onChange={(e) => onChange(i, 'nickname', e.target.value)}
                  className="font-bold text-sm text-white/90 bg-transparent outline-none w-full truncate"
                />
              </div>
              <div className="flex gap-3 items-center text-sm shrink-0">
                <select 
                  value={p.role} 
                  onChange={(e) => onChange(i, 'role', e.target.value)}
                  className="w-24 bg-black/50 border border-white/10 rounded-lg px-2 py-1 outline-none text-white/80 appearance-none text-xs font-medium cursor-pointer text-center"
                >
                  <option value="rifler">Рифлер</option>
                  <option value="sniper">{game === 's2' ? 'Снайпер' : 'AWPer'}</option>
                  <option value="lurker">Люркер</option>
                  <option value="opener">Entry</option>
                  <option value="support">Саппорт</option>
                  <option value="captain">IGL</option>
                </select>

                <input 
                  type="number" 
                  min="1"
                  max="5000"
                  value={p.rating} 
                  onChange={(e) => {
                    let val = parseInt(e.target.value) || 0;
                    if (val > 5000) val = 5000;
                    onChange(i, 'rating', val);
                  }}
                  onBlur={(e) => {
                    let val = parseInt(e.target.value) || 0;
                    if (val < 1) val = 1;
                    if (val > 5000) val = 5000;
                    onChange(i, 'rating', val);
                  }}
                  className="w-16 bg-black/50 border border-white/10 rounded-lg px-2 py-1 outline-none text-right font-black text-xs font-mono shrink-0"
                  style={{ color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Synergy & Form */}
      <div className="flex flex-col gap-4 bg-white/5 rounded-xl p-4 border border-white/5">
        <div className="flex justify-between items-center text-sm font-bold">
          <span className="text-white/50 uppercase tracking-wider">Состояние</span>
          <select 
            value={form}
            onChange={(e) => onFormChange(parseInt(e.target.value))}
            className={`bg-black/50 border border-white/10 rounded-lg px-2 py-1 outline-none font-bold ${FORMS.find(f => f.value === form)?.color || 'text-white'}`}
          >
            {FORMS.map(f => (
              <option key={f.value} value={f.value}>{f.label} ({f.value > 0 ? '+' : ''}{f.value})</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-sm font-bold">
            <span className="text-white/50 uppercase tracking-wider">Синергия команды</span>
            <span className="text-white/90">{synergy}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={synergy} 
            onChange={(e) => onSynergyChange(parseInt(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, ${color} ${synergy}%, rgba(255,255,255,0.1) ${synergy}%)` }}
          />
        </div>
      </div>

      {/* Map Experience */}
      {selectedMaps.length > 0 && (
        <div className="flex flex-col gap-4 bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="text-sm font-bold text-white/50 uppercase tracking-wider mb-2">Наигранность карт</div>
          {selectedMaps.map(mapName => {
            const exp = mapExp[mapName] !== undefined ? mapExp[mapName] : 50;
            return (
              <div key={mapName} className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-white/80">{mapName}</span>
                  <span className="text-white/50">{exp}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={exp} 
                  onChange={(e) => onMapExpChange(mapName, parseInt(e.target.value))}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, ${color} ${exp}%, rgba(255,255,255,0.1) ${exp}%)` }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}


function StatsTable({ teamName, colorClass, borderClass, stats }: { teamName: string, colorClass: string, borderClass: string, stats: any[] }) {
  return (
    <div>
      <h3 className={`${colorClass} font-black uppercase tracking-wider mb-4 pb-2 border-b ${borderClass}`}>{teamName}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse min-w-[300px]">
          <thead>
            <tr className="text-white/30 uppercase tracking-wider text-[10px] border-b border-white/5">
              <th className="py-2 font-medium">Игрок</th>
              <th className="py-2 text-center font-medium">K-A-D</th>
              <th className="py-2 text-center font-medium">+/-</th>
              <th className="py-2 text-center font-medium" title="Average Damage per Round">ADR</th>
              <th className="py-2 text-center font-medium" title="Impact Rating">Impact</th>
              <th className="py-2 text-center font-medium">K/D</th>
              <th className="py-2 text-right font-medium">Rating</th>
            </tr>
          </thead>
          <tbody>
            {[...stats].sort((a, b) => parseFloat(b.hltvRating || '0') - parseFloat(a.hltvRating || '0')).map((p, idx) => {
              const diff = p.kills - p.deaths;
              const fkDiff = (p.fk || 0) - (p.fd || 0);
              return (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-2 font-bold text-white/90">{p.nickname}</td>
                  <td className="py-2 text-center text-white/70 font-mono text-xs">{p.kills}-{p.assists}-{p.deaths}</td>
                  <td className={`py-2 text-center font-mono text-xs ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-white/50'}`}>
                    {diff > 0 ? `+${diff}` : diff}
                  </td>
                  <td className="py-2 text-center text-white/50 font-mono text-xs">{p.adr || '-'}</td>
                  <td className="py-2 text-center text-white/50 font-mono text-xs">{p.impact || '-'}</td>
                  <td className="py-2 text-center text-white/50 font-mono text-xs">{p.kd || '-'}</td>
                  <td className="py-2 text-right font-bold text-yellow-500/80 font-mono text-sm">{p.hltvRating || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
