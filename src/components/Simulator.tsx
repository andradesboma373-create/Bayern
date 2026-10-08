import { TeamAutocompleteInput } from './TeamAutocompleteInput';
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, doc, setDoc, getDoc, query, where, getDocs, updateDoc, writeBatch } from '../firebase';
import TeamLogo from './TeamLogo';
import PlayerAvatar from './PlayerAvatar';

import { simulateMatchSeries, MAP_POOL_CS2, MAP_POOL_S2, refreshMapPools } from '../lib/simulation';
import { RATING_CONFIG } from '../match-logic/config/RatingConfig';
import { simulationPerf } from '../lib/simulationPerformance';
import VetoModal from "./VetoModal";
import MatchStitcherModal from './MatchStitcherModal';
import SeriesStitcherModal from './SeriesStitcherModal';
import { saveMatchesToLocalStorage, safeLocalStorageSet, getKdColorClass, getSwingColorClass, formatSwing, shuffleArray } from '../lib/utils';
import { updateBetaTournamentMatchResult, loadTournaments, saveTournament, getCanonicalRoomId } from './setka_tourn/storage';
import { useGameUniverse } from '../lib/gameUniverse';
import { Trophy, Sparkles, Layers, ChevronRight, Check } from 'lucide-react';

interface SimulatorPlayer {
  nickname: string;
  role: string;
  rating: number;
  isNewPlayer?: boolean;
}

const DEFAULT_TEAM_T: SimulatorPlayer[] = [
  { nickname: 'Player 1', role: 'rifler', rating: 148, isNewPlayer: false },
  { nickname: 'Player 2', role: 'sniper', rating: 144, isNewPlayer: false },
  { nickname: 'Player 3', role: 'opener', rating: 135, isNewPlayer: false },
  { nickname: 'Player 4', role: 'support', rating: 124, isNewPlayer: false },
  { nickname: 'Player 5', role: 'captain', rating: 118, isNewPlayer: false },
];

const DEFAULT_TEAM_CT: SimulatorPlayer[] = [
  { nickname: 'Player 1', role: 'rifler', rating: 146, isNewPlayer: false },
  { nickname: 'Player 2', role: 'sniper', rating: 142, isNewPlayer: false },
  { nickname: 'Player 3', role: 'opener', rating: 134, isNewPlayer: false },
  { nickname: 'Player 4', role: 'support', rating: 122, isNewPlayer: false },
  { nickname: 'Player 5', role: 'captain', rating: 116, isNewPlayer: false },
];

const FORMS = [
  { label: 'Идеальная', value: 5, color: 'text-green-400' },
  { label: 'Хорошая', value: 2, color: 'text-green-500' },
  { label: 'Пойдет', value: 0, color: 'text-gray-400' },
  { label: 'Более менее', value: -2, color: 'text-yellow-500' },
  { label: 'Устали', value: -5, color: 'text-red-500' }
];

async function updatePlayerStats(db: any, userId: string, matchResult: any, isLocal: boolean = false, batch?: any) {
  if (!userId || userId === 'anonymous') return;
  const allPlayers = [
    ...(matchResult.team1Stats || []).map((p: any) => ({ ...p, team: matchResult.team1Name || 'Team 1' })),
    ...(matchResult.team2Stats || []).map((p: any) => ({ ...p, team: matchResult.team2Name || 'Team 2' }))
  ];

  if (isLocal) {
    try {
      const localStats = JSON.parse(localStorage.getItem(`playerStats_${userId}`) || '{}');
      for (const player of allPlayers) {
        if (!player.nickname) continue;
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
      }
      safeLocalStorageSet(`playerStats_${userId}`, localStats);
    } catch (err) {
      console.error('Error updating local player stats', err);
    }
    return;
  }

  const validPlayers = allPlayers.filter(p => p.nickname);
  const fetchedDocs = await Promise.all(validPlayers.map(async (player) => {
    const statId = `${userId}_${player.team.toLowerCase().replace(/[^a-z0-9]/g, '')}_${player.nickname.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const docRef = doc(db, 'playerStats', statId);
    try {
      const snap = await getDoc(docRef);
      return { player, docRef, snap };
    } catch (e) {
      return { player, docRef, snap: null };
    }
  }));

  for (const { player, docRef, snap } of fetchedDocs) {
    let matchRating = parseFloat(player.hltvRating || player.rating);
    if (isNaN(matchRating)) matchRating = 1.0;

    let payload: any;
    if (snap && snap.exists()) {
      const d = snap.data();
      const oldMatches = d.matches || 0;
      const oldKills = Number(d.kills) || 0;
      const oldDeaths = Number(d.deaths) || 0;
      let oldRating = parseFloat(d.rating);
      if (isNaN(oldRating)) oldRating = 1.0;

      payload = {
        userId,
        nickname: player.nickname,
        teamName: player.team,
        matches: oldMatches + 1,
        kills: oldKills + player.kills,
        deaths: oldDeaths + player.deaths,
        kd: ((oldKills + player.kills) / Math.max(1, oldDeaths + player.deaths)).toFixed(2),
        rating: ((oldRating * oldMatches + matchRating) / (oldMatches + 1)).toFixed(2)
      };
    } else {
      payload = {
        userId,
        nickname: player.nickname,
        teamName: player.team,
        matches: 1,
        kills: player.kills,
        deaths: player.deaths,
        kd: player.kd || (player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills),
        rating: matchRating.toFixed(2)
      };
    }

    if (batch) {
      batch.set(docRef, payload, { merge: true });
    } else {
      await setDoc(docRef, payload, { merge: true });
    }
  }

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
  const [activeGame, setActiveGame] = useGameUniverse();
  const game = activeGame;
  const setGame = setActiveGame;
  const [format, setFormat] = useState('BO3');
  const [isSimulating, setIsSimulating] = useState(false);
    const [result, setResult] = useState<any>(null);

  const [team1, setTeam1] = useState<SimulatorPlayer[]>(DEFAULT_TEAM_T);
  const [team2, setTeam2] = useState<SimulatorPlayer[]>(DEFAULT_TEAM_CT);

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
  const [vetoKey, setVetoKey] = useState(0);
  const [showSkleyka, setShowSkleyka] = useState(false);
  const [showSeriesStitcher, setShowSeriesStitcher] = useState(false);
  const [channelTeams, setChannelTeams] = useState<any[]>([]);
  const [showChannelLoad, setShowChannelLoad] = useState<1 | 2 | null>(null);
  const [teamSearch, setTeamSearch] = useState("");
  const [notifyingManagers, setNotifyingManagers] = useState(false);
  const [cs2MapPool, setCs2MapPool] = useState(MAP_POOL_CS2);
  const [s2MapPool, setS2MapPool] = useState(MAP_POOL_S2);

  useEffect(() => {
    fetch('/api/maps/list')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        console.log("[Client Simulator] Maps list data received:", data);
        if (data && data.cs2 && data.s2) {
          refreshMapPools(data.cs2, data.s2);
          setCs2MapPool([...MAP_POOL_CS2]);
          setS2MapPool([...MAP_POOL_S2]);
        }
      })
      .catch(err => console.warn("Failed to load maps list from server:", err));
  }, []);

  useEffect(() => {
    if (location.state) {
      const state = location.state as any;
      if (state.team1 && state.team2) {
        const isCS2 = (state.game || 'cs2') === 'cs2';
        const boStr = (state.format || 'BO3').toUpperCase();
        const bo = parseInt(boStr.replace('BO', '')) || 3;
        
        let pickedMaps = state.selectedMaps || [];
        if (pickedMaps.length < bo) {
          const mapPool = (isCS2 ? cs2MapPool : s2MapPool).map(m => m.name);
          const availableMaps = mapPool.filter(m => !pickedMaps.includes(m));
          const needed = bo - pickedMaps.length;
          const randomPicks = [...availableMaps].sort(() => Math.random() - 0.5).slice(0, needed);
          pickedMaps = [...pickedMaps, ...randomPicks];
        }

        const preparePlayers = (t: any) => {
          if (!t) return [1, 2, 3, 4, 5].map(i => ({ nickname: `Игрок #${i}`, role: i === 1 ? 'awper' : i === 2 ? 'entry' : i === 3 ? 'captain' : 'rifler', rating: 130 }));

          const rawPlayers = (t.players && Array.isArray(t.players) && t.players.length > 0)
            ? t.players
            : ((t.roster && Array.isArray(t.roster) && t.roster.length > 0)
              ? t.roster
              : ((t.lineup && Array.isArray(t.lineup) && t.lineup.length > 0) ? t.lineup : []));

          if (rawPlayers.length > 0) {
            const mapped = rawPlayers.map((p: any, i: number) => {
              const nick = p?.nickname || p?.name || p?.nick || p?.playerName || '';
              if (!nick || nick === 'Пусто' || nick.trim() === '') return null;
              return {
                ...p,
                nickname: nick,
                role: p?.role || p?.position || p?.pos || (i === 0 ? 'awper' : i === 1 ? 'entry' : i === 2 ? 'captain' : 'rifler'),
                rating: Number(p?.rating ?? p?.rate ?? p?.skill ?? p?.rank ?? 130) || 130
              };
            }).filter(Boolean);

            if (mapped.length > 0) {
              const res = [...mapped];
              while (res.length < 5) {
                const i = res.length;
                res.push({
                  nickname: `${t.name || 'Игрок'} #${i + 1}`,
                  role: i === 0 ? 'awper' : i === 1 ? 'entry' : i === 2 ? 'captain' : 'rifler',
                  rating: 130
                });
              }
              return res.slice(0, 5);
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
            const mapped = foundTeam.players.map((p: any, i: number) => {
              const nick = p?.nickname || p?.name || p?.nick || p?.playerName || '';
              if (!nick || nick === 'Пусто' || nick.trim() === '') return null;
              return {
                ...p,
                nickname: nick,
                role: p?.role || p?.position || p?.pos || (i === 0 ? 'awper' : i === 1 ? 'entry' : i === 2 ? 'captain' : 'rifler'),
                rating: Number(p?.rating ?? p?.rate ?? p?.skill ?? p?.rank ?? 130) || 130
              };
            }).filter(Boolean);

            if (mapped.length > 0) {
              const res = [...mapped];
              while (res.length < 5) {
                const i = res.length;
                res.push({
                  nickname: `${teamName || 'Игрок'} #${i + 1}`,
                  role: i === 0 ? 'awper' : i === 1 ? 'entry' : i === 2 ? 'captain' : 'rifler',
                  rating: 130
                });
              }
              return res.slice(0, 5);
            }
          }

          const matchingPlayers = localPlayers.filter((p: any) => 
            (teamId && p.teamId === teamId) ||
            (teamName && p.teamName && p.teamName.toLowerCase().trim() === teamName.toLowerCase().trim())
          );

          if (matchingPlayers.length > 0) {
            return matchingPlayers.slice(0, 5).map((p: any, i: number) => ({
              ...p,
              nickname: p.nickname || p.name || p.nick || p.playerName || `Игрок ${i+1}`,
              role: p.role || p.position || (i === 0 ? 'awper' : i === 1 ? 'entry' : i === 2 ? 'captain' : 'rifler'),
              rating: Number(p.rating ?? p.rate ?? 130) || 130
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
      
      // Force a desktop-like width for the capture to ensure side-by-side layout
      const originalWidth = resultContainerRef.current.style.width;
      const originalMinWidth = resultContainerRef.current.style.minWidth;
      
      // We set a fixed width for capture then revert it
      resultContainerRef.current.style.width = '1200px';
      resultContainerRef.current.style.minWidth = '1200px';

      let imgData: string;
      try {
        imgData = await toPng(resultContainerRef.current, {
          backgroundColor: '#0a0a0f',
          cacheBust: true,
          pixelRatio: 2,
          width: 1200,
          skipFonts: true,
          fontEmbedCSS: '',
          imagePlaceholder: transparentPlaceholder,
          style: {
            borderRadius: '1.5rem',
          }
        });
      } finally {
        // Restore original styles
        resultContainerRef.current.style.width = originalWidth;
        resultContainerRef.current.style.minWidth = originalMinWidth;
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
    simulationPerf.reset();
    const tTotalStart = performance.now();

    try {
      const tPrepStart = performance.now();
      const isCS2 = game === 'cs2';
      const bo = parseInt(format.replace('BO', ''));
      
      let pickedMaps = selectedMaps;
      if (pickedMaps.length < bo) {
        const mapPool = (isCS2 ? cs2MapPool : s2MapPool).map(m => m.name);
        const availableMaps = mapPool.filter(m => !pickedMaps.includes(m));
        const needed = bo - pickedMaps.length;
        const randomPicks = shuffleArray(availableMaps).slice(0, needed);
        pickedMaps = [...pickedMaps, ...randomPicks];
      }

      const selectedTourneyObj = tournaments.find(t => t.id === selectedTournament);
      const tourneyName = selectedTourneyObj ? selectedTourneyObj.name : 'Test Tournament';
      simulationPerf.recordPrepareMatch(performance.now() - tPrepStart);

      // Simulation engine execution (100% in-memory)
      const tSimStart = performance.now();
      const simResult = simulateMatchSeries(
        team1, team2, team1Synergy, team2Synergy, 'default', 'default', pickedMaps, 'MR12', isCS2, tourneyName,
        team1Form, team2Form, team1MapExp, team2MapExp
      );
      const simDuration = performance.now() - tSimStart;
      simulationPerf.recordSimulationEngine(simDuration);
      
      const totalRounds = (simResult.maps || []).reduce((acc: number, m: any) => acc + (m.rounds?.length || (m.team1Score + m.team2Score) || 0), 0);
      simulationPerf.addRounds(totalRounds);

      const newMatchId = 'match_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      const newMatch: any = {
        id: newMatchId,
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

      const tSaveStart = performance.now();
      if (user) {
        const roomId = getCanonicalRoomId(user.channelId || user.uid, game);

        // 1. Immediately save to local storage under both room and user keys for high responsiveness
        const rawLocal = localStorage.getItem(`matches_${roomId}`) || localStorage.getItem(`matches_${user.uid}`) || '[]';
        const parsedMatches = JSON.parse(rawLocal);
        const nextLocalMatches = [matchToSave, ...parsedMatches.filter((m: any) => m && m.id !== matchToSave.id)];
        saveMatchesToLocalStorage(roomId, nextLocalMatches);
        if (roomId !== user.uid) {
          saveMatchesToLocalStorage(user.uid, nextLocalMatches);
        }

        // 2. If part of a tournament, update tournament match state & matchIds
        if (selectedTournament) {
          updateBetaTournamentMatchResult(
            roomId,
            selectedTournament,
            newMatch.team1Name,
            newMatch.team2Name,
            newMatch.team1Score,
            newMatch.team2Score
          );
          if (user.uid !== roomId) {
            updateBetaTournamentMatchResult(
              user.uid,
              selectedTournament,
              newMatch.team1Name,
              newMatch.team2Name,
              newMatch.team1Score,
              newMatch.team2Score
            );
          }
          const localTourneys = loadTournaments(roomId);
          const target = localTourneys.find((t: any) => t.id === selectedTournament);
          if (target) {
            const updated = {
              ...target,
              matchIds: Array.from(new Set([...(target.matchIds || []), newMatch.id]))
            };
            saveTournament(roomId, updated);
            if (user.uid !== roomId) {
              saveTournament(user.uid, updated);
            }
          }
        }

        window.dispatchEvent(new Event('db-user-updated'));
        window.dispatchEvent(new Event('tournaments-updated'));

        if (isLocal) {
          await updatePlayerStats(db, user.uid, matchToSave, true);
          try {
            const { updateMapStats } = await import('../lib/mapStats');
            await updateMapStats(user.uid, matchToSave, true);
          } catch (e) {}
        } else {
          try {
            // Atomic Batch Write to Firebase / DB (Requirement 6, 9)
            const batch = writeBatch(db);
            const matchDocRef = doc(db, 'matches', newMatchId);
            batch.set(matchDocRef, matchToSave);

            await updatePlayerStats(db, user.uid, matchToSave, false, batch);
            
            try {
              const { updateMapStats } = await import('../lib/mapStats');
              await updateMapStats(user.uid, matchToSave, false, batch);
            } catch (e) {}
            
            if (selectedTournament) {
               try {
                 const tDoc = await getDoc(doc(db, 'tournaments', selectedTournament));
                 if (tDoc.exists()) {
                     const tData = tDoc.data();
                     const newMatchIds = Array.from(new Set([...(tData.matchIds || []), newMatchId]));
                     batch.set(doc(db, 'tournaments', selectedTournament), { matchIds: newMatchIds }, { merge: true });
                 }
               } catch(e) { console.error('Error attaching to tournament', e); }
            }

            // Single atomic commit for all match data
            await batch.commit();
            simulationPerf.addFirebaseWrites(1);
          } catch (e) {
            console.warn("Saving simulated match locally as fallback", e);
            await updatePlayerStats(db, user.uid, matchToSave, true);
            try {
              const { updateMapStats } = await import('../lib/mapStats');
              await updateMapStats(user.uid, matchToSave, true);
            } catch (err) {}
          }

          // Background server cache sync
          try {
            fetch('/api/sync-cache', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: roomId,
                matches: [matchToSave]
              })
            }).catch(() => {});
          } catch (e) {}
        }
      }

      simulationPerf.recordSaveResult(performance.now() - tSaveStart);
      simulationPerf.recordTotalExecution(performance.now() - tTotalStart);

      // Print comprehensive diagnostic report (Requirement 1, 13)
      simulationPerf.printReport();

      setResult(newMatch);
      setSelectedResultTab(newMatch.bo === 1 ? 0 : 'overall');
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
          const raw = JSON.parse(ev.target?.result as string);
          const data = Array.isArray(raw) && raw.length > 0 && (raw[0].teamName || raw[0].name) ? raw[0] : raw;
          
          const teamName = data.teamName || data.name || data.title || (teamIdx === 1 ? 'Команда 1' : 'Команда 2');
          const rawPlayers = (data.players && Array.isArray(data.players)) 
            ? data.players 
            : ((data.roster && Array.isArray(data.roster)) 
              ? data.roster 
              : ((data.lineup && Array.isArray(data.lineup)) 
                ? data.lineup 
                : (Array.isArray(data) ? data : [])));

          if (rawPlayers.length > 0) {
            const formatted = rawPlayers.map((p: any, idx: number) => ({
              ...p,
              id: p?.id || `p_${Date.now()}_${idx}`,
              nickname: p?.nickname || p?.name || p?.nick || p?.playerName || `Игрок #${idx + 1}`,
              role: p?.role || p?.position || p?.pos || (idx === 0 ? 'awper' : idx === 1 ? 'entry' : idx === 2 ? 'captain' : 'rifler'),
              rating: Number(p?.rating ?? p?.rate ?? p?.skill ?? p?.rank ?? 130) || 130
            }));

            while (formatted.length < 5) {
              const idx = formatted.length;
              formatted.push({ nickname: '', role: 'rifler', rating: 100 });
            }

            if (teamIdx === 1) {
              setTeam1Name(teamName);
              setTeam1(formatted.slice(0, 5));
            } else {
              setTeam2Name(teamName);
              setTeam2(formatted.slice(0, 5));
            }
          } else {
            alert("В файле не найден состав игроков. Проверьте JSON структуру.");
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

  const handleToggleNewPlayer = (teamIndex: 1 | 2, playerIndex: number) => {
    if (teamIndex === 1) {
      const newTeam = [...team1];
      const willBeNew = !newTeam[playerIndex]?.isNewPlayer;
      newTeam[playerIndex] = { ...newTeam[playerIndex], isNewPlayer: willBeNew };
      setTeam1(newTeam);
      const newCount = newTeam.filter(p => p && p.isNewPlayer).length;
      setTeam1Synergy(newCount === 0 ? 100 : Math.max(30, 100 - newCount * 15));
    } else {
      const newTeam = [...team2];
      const willBeNew = !newTeam[playerIndex]?.isNewPlayer;
      newTeam[playerIndex] = { ...newTeam[playerIndex], isNewPlayer: willBeNew };
      setTeam2(newTeam);
      const newCount = newTeam.filter(p => p && p.isNewPlayer).length;
      setTeam2Synergy(newCount === 0 ? 100 : Math.max(30, 100 - newCount * 15));
    }
  };

  const handleSetRegularRoster = (teamIndex: 1 | 2) => {
    if (teamIndex === 1) {
      const newTeam = team1.map(p => ({ ...p, isNewPlayer: false }));
      setTeam1(newTeam);
      setTeam1Synergy(100);
    } else {
      const newTeam = team2.map(p => ({ ...p, isNewPlayer: false }));
      setTeam2(newTeam);
      setTeam2Synergy(100);
    }
  };

  const handleSetNewPlayerMode = (teamIndex: 1 | 2) => {
    if (teamIndex === 1) {
      const newTeam = [...team1];
      if (!newTeam.some(p => p && p.isNewPlayer)) {
        newTeam[4] = { ...newTeam[4], isNewPlayer: true };
      }
      setTeam1(newTeam);
      const newCount = newTeam.filter(p => p && p.isNewPlayer).length;
      setTeam1Synergy(newCount === 0 ? 100 : Math.max(30, 100 - newCount * 15));
    } else {
      const newTeam = [...team2];
      if (!newTeam.some(p => p && p.isNewPlayer)) {
        newTeam[4] = { ...newTeam[4], isNewPlayer: true };
      }
      setTeam2(newTeam);
      const newCount = newTeam.filter(p => p && p.isNewPlayer).length;
      setTeam2Synergy(newCount === 0 ? 100 : Math.max(30, 100 - newCount * 15));
    }
  };

  if (isSimulating) {
    return (
      <div className="flex flex-col gap-6 w-full animate-fade-in">
        <div className="flex flex-col items-center justify-center p-20 bg-[#12121a] rounded-2xl border border-white/5 h-[60vh]">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-2">Генерация матча...</h2>
          <p className="text-white/50 text-sm font-semibold tracking-wider">Это может занять несколько секунд</p>
          <div className="w-64 h-2 bg-white/5 rounded-full mt-6 overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full bg-blue-500 w-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'result') {
    const isOverall = selectedResultTab === 'overall';
    const currentMapIdx = typeof selectedResultTab === 'number' ? selectedResultTab : null;
    const currentSelectedMap = (currentMapIdx !== null && Array.isArray(result?.maps) && result.maps[currentMapIdx]) 
      ? result.maps[currentMapIdx] 
      : null;
    
    // In overall view, use the first map of the series as background
    const firstMapInSeries = (Array.isArray(result?.maps) && result.maps.length > 0) ? result.maps[0] : null;
    
    const bgSourceMap = currentSelectedMap || firstMapInSeries;
    const activeBgMapName = (bgSourceMap?.mapId || bgSourceMap?.id || bgSourceMap?.mapName || bgSourceMap?.name || 'mirage').toLowerCase().replace(/\s+/g, '');

    const mapScore1 = currentSelectedMap ? (currentSelectedMap.team1Score ?? currentSelectedMap.score1 ?? 0) : 0;
    const mapScore2 = currentSelectedMap ? (currentSelectedMap.team2Score ?? currentSelectedMap.score2 ?? 0) : 0;

    const displayedScore1 = isOverall ? result.team1Score : (result.bo === 1 ? (firstMapInSeries?.team1Score ?? firstMapInSeries?.score1 ?? result.team1Score) : mapScore1);
    const displayedScore2 = isOverall ? result.team2Score : (result.bo === 1 ? (firstMapInSeries?.team2Score ?? firstMapInSeries?.score2 ?? result.team2Score) : mapScore2);

    return (
      <div className="flex flex-col gap-6 w-full animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-white tracking-widest uppercase">
              {isOverall ? 'РЕЗУЛЬТАТЫ МАТЧА' : `КАРТА ${currentMapIdx! + 1}`}
            </h2>
          </div>
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
               style={bgSourceMap ? {
                 backgroundImage: `linear-gradient(to bottom, rgba(18,18,26,0.85), rgba(26,26,36,0.95)), url('/maps/${activeBgMapName}')`,
                 backgroundSize: 'cover',
                 backgroundPosition: 'center'
               } : {}}>
            <div className="absolute top-0 left-0 w-64 h-64 bg-[#ff8f00]/10 blur-[80px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none translate-x-1/2 translate-y-1/2"></div>
            
            <div className="flex items-center justify-center gap-6 mb-4 relative z-10">
              <TeamLogo game={game === "cs2" ? "cs2" : "so2"} teamName={result.team1Name} sizeClassName="w-16 h-16 text-2xl" />
              <div>
                <h2 className="text-3xl font-black tracking-widest text-white uppercase">{result.team1Name} vs {result.team2Name}</h2>
                {!isOverall && currentSelectedMap && (
                  <p className="text-sm font-bold text-[#ff8f00] tracking-wider uppercase mt-1">
                    {currentSelectedMap?.mapName || `Карта ${currentMapIdx! + 1}`}
                  </p>
                )}
              </div>
              <TeamLogo game={game === "cs2" ? "cs2" : "so2"} teamName={result.team2Name} sizeClassName="w-16 h-16 text-2xl" />
            </div>

            <div className="text-6xl font-black tracking-widest mb-3 relative z-10 drop-shadow-xl">
              <span className={displayedScore1 > displayedScore2 ? 'text-[#ff8f00] drop-shadow-[0_0_15px_rgba(255,143,0,0.5)]' : 'text-white/50'}>
                {displayedScore1}
              </span>
              <span className="mx-6 text-white/20 text-4xl">:</span>
              <span className={displayedScore2 > displayedScore1 ? 'text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'text-white/50'}>
                {displayedScore2}
              </span>
            </div>

            {isOverall && result.mvp && (
              <div className="inline-flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-6 py-2 mb-6 relative z-10">
                <span className="text-yellow-500">⭐</span>
                <span className="text-white font-bold text-sm tracking-widest uppercase">MVP: {result.mvp.nickname}</span>
                <span className="text-yellow-500 font-black">{result.mvp.hltvRating}</span>
              </div>
            )}

            {result.bo !== 1 && Array.isArray(result.maps) && (
              <div className="mt-6 flex flex-col items-center gap-3 relative z-10">
                <button 
                  onClick={() => setSelectedResultTab('overall')}
                  className={`w-full max-w-md px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center min-h-[48px] ${selectedResultTab === 'overall' ? 'bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                >
                  ОБЩАЯ СТАТИСТИКА СЕРИИ
                </button>

                <div className="flex flex-nowrap justify-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
                  {result.maps.map((map: any, i: number) => {
                    const mTitle = map?.mapName || map?.name || map?.mapId || `Карта ${i + 1}`;
                    const mImg = (map?.mapId || map?.id || map?.mapName || map?.name || 'mirage').toLowerCase().replace(/\s+/g, '');
                    const sc1 = map?.team1Score ?? map?.score1 ?? 0;
                    const sc2 = map?.team2Score ?? map?.score2 ?? 0;

                    return (
                      <button 
                        key={i}
                        onClick={() => setSelectedResultTab(i)}
                        className={`relative overflow-hidden group w-[120px] h-[80px] rounded-xl font-bold transition-all ${selectedResultTab === i ? 'ring-2 ring-[#ff8f00] shadow-[0_0_15px_rgba(255,143,0,0.3)]' : 'opacity-70 hover:opacity-100 hover:ring-1 hover:ring-white/20'}`}
                      >
                        <div 
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                          style={{ backgroundImage: `url('/maps/${mImg}')` }}
                          title={mTitle}
                        />
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                          <span className="text-[10px] text-white/70 uppercase tracking-widest mb-1 drop-shadow-md truncate max-w-[100px]">{mTitle}</span>
                          <span className="font-black text-xl text-white drop-shadow-lg">
                            {sc1}:{sc2}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6">
            {selectedResultTab === 'overall' ? (
              <div className="bg-[#12121a] border border-white/5 rounded-2xl p-6">
                <div className="grid grid-cols-2 gap-8">
                  <StatsTable teamName={`${result.team1Name} (Всего)`} colorClass="text-[#ff8f00]" borderClass="border-[#ff8f00]/30" stats={result.team1Stats} />
                  <StatsTable teamName={`${result.team2Name} (Всего)`} colorClass="text-blue-500" borderClass="border-blue-500/30" stats={result.team2Stats} />
                </div>
              </div>
            ) : (
              (() => {
                const activeMap = (Array.isArray(result?.maps) && result.maps[selectedResultTab as number]) ? result.maps[selectedResultTab as number] : null;
                if (!activeMap) {
                  return (
                    <div className="bg-[#12121a] border border-white/5 rounded-2xl p-6 text-center text-white/40">
                      Данные по выбранной карте отсутствуют
                    </div>
                  );
                }
                const mapNameStr = activeMap.mapName || activeMap.name || activeMap.mapId || `Карта ${(selectedResultTab as number) + 1}`;
                const s1 = activeMap.team1Score ?? activeMap.score1 ?? 0;
                const s2 = activeMap.team2Score ?? activeMap.score2 ?? 0;

                return (
                  <div className="bg-[#12121a] border border-white/5 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <div className="text-[#ff8f00] font-bold text-sm uppercase tracking-widest">Карта {(selectedResultTab as number) + 1}</div>
                        <div className="text-2xl font-black text-white uppercase">{mapNameStr}</div>
                      </div>
                      <div className="text-3xl font-black">
                        <span className={s1 > s2 ? 'text-[#ff8f00]' : 'text-white/50'}>{s1}</span>
                        <span className="mx-2 text-white/20">:</span>
                        <span className={s2 > s1 ? 'text-blue-500' : 'text-white/50'}>{s2}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <StatsTable teamName={result.team1Name} colorClass="text-[#ff8f00]" borderClass="border-[#ff8f00]/30" stats={activeMap.team1Stats} />
                      <StatsTable teamName={result.team2Name} colorClass="text-blue-500" borderClass="border-blue-500/30" stats={activeMap.team2Stats} />
                    </div>
                  </div>
                );
              })()
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
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider ml-1">Формат серии</span>
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
              {['BO1', 'BO3', 'BO5'].map(f => (
                <button key={f} onClick={() => { setFormat(f); setSelectedMaps([]); }} className={`px-6 py-1.5 rounded-lg text-xs font-bold transition-all ${format === f ? 'bg-white/20 text-white shadow-md' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>{f}</button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider ml-1">Аналитика фото</span>
            <button 
              onClick={() => setShowSkleyka(true)}
              className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500/20 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all shadow-lg shadow-yellow-500/5 group"
            >
              <Sparkles className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              Топ Склейки
            </button>
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
              <button onClick={() => { setVetoKey(k => k + 1); setShowVeto(true); }} className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg font-bold uppercase transition-colors">Вето</button>
              <button onClick={() => {
                const bo = parseInt(format.replace('BO', ''));
                if (selectedMaps.length < bo) {
                  const mapPool = (game === 'cs2' ? cs2MapPool : s2MapPool).map(m => m.name);
                  const availableMaps = mapPool.filter(m => !selectedMaps.includes(m));
                  const needed = bo - selectedMaps.length;
                  
                  // Fisher-Yates shuffle for better randomness
                  const shuffled = [...availableMaps];
                  for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                  }
                  
                  const randomPicks = shuffled.slice(0, needed);
                  setSelectedMaps([...selectedMaps, ...randomPicks]);
                }
              }} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg font-bold uppercase transition-colors">Случайно</button>
              <button onClick={() => setSelectedMaps([])} className="text-xs bg-white/5 text-white/50 hover:bg-white/10 hover:text-white px-3 py-1.5 rounded-lg font-bold uppercase transition-colors">Сбросить</button>
            </div>
          </div>

          {selectedMaps.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-black/40 rounded-xl border border-white/5 animate-fade-in">
              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest mr-2 ml-1">Порядок:</span>
              {selectedMaps.map((mapName, idx) => {
                const mInfo = (game === 'cs2' ? cs2MapPool : s2MapPool).find(m => m.name === mapName);
                return (
                  <div key={idx} className="group flex items-center gap-2.5 bg-gradient-to-r from-blue-600/20 to-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20 text-[10px] font-black uppercase transition-all hover:border-blue-400/40">
                    <span className="text-blue-500/50">#{idx + 1}</span>
                    <span>{mapName}</span>
                    <button 
                      onClick={() => setSelectedMaps(selectedMaps.filter((_, i) => i !== idx))} 
                      className="text-white/20 hover:text-red-400 transition-colors cursor-pointer"
                      title="Удалить"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {selectedMaps.length < parseInt(format.replace('BO', '')) && (
                <div className="px-3 py-1.5 rounded-lg border border-white/5 text-white/10 text-[10px] font-black uppercase border-dashed">
                  Ожидание выбора...
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
            {(game === 'cs2' ? cs2MapPool : s2MapPool).map(m => {
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
                  style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.9)), url('/maps/${m.id}')`, backgroundSize: 'cover', backgroundPosition: 'center', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }} className={`relative aspect-[4/3] rounded-xl font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 overflow-hidden group ${isSelected ? 'text-[#ff8f00] border-2 border-[#ff8f00] shadow-[0_0_15px_rgba(255,143,0,0.4)] scale-[1.03] z-10' : canSelect ? 'text-white/80 hover:text-white hover:border-white/30 border-2 border-white/10' : 'text-white/30 opacity-40 border-2 border-white/5 cursor-not-allowed'}`}
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
              className="bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#ff8f00]/50 transition-colors cursor-pointer"
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
            type="button"
            onClick={() => setShowSeriesStitcher(true)}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-blue-900/40 hover:from-purple-900/60 hover:via-indigo-900/60 hover:to-blue-900/60 border border-purple-500/30 hover:border-purple-400/50 rounded-xl transition-all flex items-center justify-between group cursor-pointer shadow-lg shadow-purple-950/30"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-black text-white group-hover:text-purple-300 transition-colors uppercase tracking-wider flex items-center gap-1.5">
                  <span>Склейка матчей (BO3 / BO5)</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">ФОТО КАРТ</span>
                </div>
                <div className="text-[10px] text-white/40">
                  Закидывайте фото карт по одной → соединяет в общий скрин серии
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
          </button>

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
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
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
                             <PlayerAvatar key={i} game={game === "cs2" ? "cs2" : "so2"} playerName={p.nickname} sizeClassName="h-6 w-6" className="ring-2 ring-[#12121a]" />
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
        <TeamCard 
          game={game as "cs2"|"s2"} 
          nameLabel="Команда 1" 
          nameValue={team1Name} 
          onNameChange={setTeam1Name} 
          color="#ff8f00" 
          players={team1} 
          rating={Math.round(team1.reduce((acc, p) => acc + (Number(p.rating) || 0), 0) / Math.max(1, team1.length))} 
          synergy={team1Synergy} 
          form={team1Form} 
          selectedMaps={selectedMaps} 
          mapExp={team1MapExp} 
          onSynergyChange={setTeam1Synergy} 
          onFormChange={setTeam1Form} 
          onMapExpChange={(map, val) => setTeam1MapExp({...team1MapExp, [map]: val})} 
          onChange={(idx, field, val) => updatePlayer(1, idx, field, val)} 
          onToggleNewPlayer={(idx) => handleToggleNewPlayer(1, idx)}
          onSetRegularRoster={() => handleSetRegularRoster(1)}
          onSetNewPlayerMode={() => handleSetNewPlayerMode(1)}
          onSave={() => handleSaveTeam(team1Name, team1)} 
          onLoad={() => handleLoadTeam(1)} 
          onChannelLoad={user?.isCustom ? () => handleOpenChannelLoad(1) : undefined} 
        />
        <TeamCard 
          game={game as "cs2"|"s2"} 
          nameLabel="Команда 2" 
          nameValue={team2Name} 
          onNameChange={setTeam2Name} 
          color="#3b82f6" 
          players={team2} 
          rating={Math.round(team2.reduce((acc, p) => acc + (Number(p.rating) || 0), 0) / Math.max(1, team2.length))} 
          synergy={team2Synergy} 
          form={team2Form} 
          selectedMaps={selectedMaps} 
          mapExp={team2MapExp} 
          onSynergyChange={setTeam2Synergy} 
          onFormChange={setTeam2Form} 
          onMapExpChange={(map, val) => setTeam2MapExp({...team2MapExp, [map]: val})} 
          onChange={(idx, field, val) => updatePlayer(2, idx, field, val)} 
          onToggleNewPlayer={(idx) => handleToggleNewPlayer(2, idx)}
          onSetRegularRoster={() => handleSetRegularRoster(2)}
          onSetNewPlayerMode={() => handleSetNewPlayerMode(2)}
          onSave={() => handleSaveTeam(team2Name, team2)} 
          onLoad={() => handleLoadTeam(2)} 
          onChannelLoad={user?.isCustom ? () => handleOpenChannelLoad(2) : undefined} 
        />
      </div>
      {showSkleyka && (
        <MatchStitcherModal 
          user={user}
          onClose={() => setShowSkleyka(false)}
        />
      )}
      {showSeriesStitcher && (
        <SeriesStitcherModal 
          user={user}
          tournamentId={selectedTournament}
          onClose={() => setShowSeriesStitcher(false)}
        />
      )}
      <VetoModal
        key={vetoKey}
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

function TeamCard({ game, nameLabel, nameValue, onNameChange, color, players, rating, synergy, form, selectedMaps, mapExp, onSynergyChange, onFormChange, onMapExpChange, onChange, onToggleNewPlayer, onSetRegularRoster, onSetNewPlayerMode, onSave, onLoad, onChannelLoad }: { 
  nameLabel: string, 
  nameValue: string, 
  onNameChange: (val: string) => void, 
  color: string, 
  players: any[], 
  rating: number, 
  synergy: number, 
  form: number, 
  selectedMaps: string[], 
  mapExp: Record<string, number>, 
  onSynergyChange: (val: number) => void, 
  onFormChange: (val: number) => void, 
  onMapExpChange: (map: string, val: number) => void, 
  onChange: (idx: number, field: string, val: string | number) => void, 
  onToggleNewPlayer: (idx: number) => void,
  onSetRegularRoster: () => void,
  onSetNewPlayerMode: () => void,
  onSave: () => void, 
  onLoad: () => void, 
  onChannelLoad?: () => void, 
  game?: "cs2" | "s2" 
}) {
  const hasNewPlayers = (players || []).some(p => p && p.isNewPlayer);

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

      {/* Roster Mode Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={onSetRegularRoster}
          className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${!hasNewPlayers ? 'bg-green-500/20 text-green-400 border-green-500/40' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}
        >
          <Check className={`w-3.5 h-3.5 ${!hasNewPlayers ? 'opacity-100' : 'opacity-0'}`} />
          Состав обычный
        </button>
        <button 
          onClick={onSetNewPlayerMode}
          className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${hasNewPlayers ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${hasNewPlayers ? 'opacity-100 text-amber-400' : 'opacity-0'}`} />
          Новый игрок
        </button>
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
            <div key={i} className={`flex items-center justify-between bg-white/5 rounded-xl px-3 py-2 border transition-colors ${p?.isNewPlayer ? 'border-amber-500/30 bg-amber-500/[0.03]' : 'border-white/5 focus-within:border-white/20'}`}>
              <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                <button 
                  onClick={() => onToggleNewPlayer(i)}
                  className={`shrink-0 w-6 h-6 rounded flex items-center justify-center transition-all ${p?.isNewPlayer ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/20 hover:bg-white/10 hover:text-white'}`}
                  title={p?.isNewPlayer ? "Новичок (Играет на себя)" : "Обычный игрок"}
                >
                  <Sparkles className="w-3 h-3" />
                </button>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs overflow-hidden shrink-0 relative">
                  <PlayerAvatar game={game} playerName={p.nickname} sizeClassName="w-8 h-8" />
                  {p?.isNewPlayer && (
                    <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                      <div className="w-full h-full animate-pulse bg-amber-500/10"></div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <input 
                    type="text" 
                    value={p.nickname} 
                    onChange={(e) => onChange(i, 'nickname', e.target.value)}
                    className={`font-bold text-sm bg-transparent outline-none w-full truncate ${p?.isNewPlayer ? 'text-amber-400' : 'text-white/90'}`}
                  />
                  {p?.isNewPlayer && <span className="text-[8px] font-black text-amber-500/60 uppercase tracking-tighter">Играет на себя / Координация -30%</span>}
                </div>
              </div>
              <div className="flex gap-3 items-center text-sm shrink-0">
                <select 
                  value={p.role} 
                  onChange={(e) => onChange(i, 'role', e.target.value)}
                  className="w-24 bg-zinc-950 border border-white/10 rounded-lg px-2 py-1 outline-none text-white/80 appearance-none text-xs font-medium cursor-pointer text-center"
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
                  style={{ color: p?.isNewPlayer ? '#fbbf24' : color }}
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
            className={`bg-zinc-950 border border-white/10 rounded-lg px-2 py-1 outline-none font-bold cursor-pointer ${FORMS.find(f => f.value === form)?.color || 'text-white'}`}
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
              {RATING_CONFIG.USE_KAST && <th className="py-2 text-center font-medium" title="Percentage of rounds with Kill, Assist, Survived or Traded">KAST</th>}
              {RATING_CONFIG.USE_SWING && <th className="py-2 text-center font-medium" title="Round Swing (Win Probability Impact)">Swing</th>}
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
                  {RATING_CONFIG.USE_KAST && <td className="py-2 text-center text-white/50 font-mono text-xs">{p.kast || '-'}</td>}
                  {RATING_CONFIG.USE_SWING && (
                    <td className="py-2 text-center font-mono text-xs">
                      <span className={`px-1.5 py-0.5 rounded ${getSwingColorClass(p?.roundSwingNum ?? p?.roundSwing)}`}>
                        {formatSwing(p?.roundSwingNum ?? p?.roundSwing)}
                      </span>
                    </td>
                  )}
                  <td className="py-2 text-center text-white/50 font-mono text-xs">{p.impact || '-'}</td>
                  <td className={`py-2 text-center font-mono text-xs ${getKdColorClass(p.kd)}`}>{p.kd || '-'}</td>
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
