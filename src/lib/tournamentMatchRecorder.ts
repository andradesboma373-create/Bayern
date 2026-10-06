import { Tournament, Match, Team } from '../components/setka_tourn/types';
import { getCanonicalRoomId, loadTournaments, saveTournament } from '../components/setka_tourn/storage';
import { saveMatchesToLocalStorage } from './utils';
import { db, doc, setDoc } from '../firebase';

export interface GeneratedMatchRecord {
  id: string;
  date: string;
  tournamentId: string;
  tournamentName: string;
  gameMode: string;
  format: string;
  bo: number;
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  winnerId: string | null;
  userId: string;
  channelId: string;
  mvp: {
    nickname: string;
    kills: number;
    deaths: number;
    kd: number;
    hltvRating: number;
  } | null;
  team1Stats: any[];
  team2Stats: any[];
  maps: any[];
  achievements?: any[];
}

// Pseudo-random deterministic number based on string seed
function seedRandom(seedStr: string) {
  let h = 0xdeadbeef;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 2654435761);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h >>> 0) % 10000) / 10000;
  };
}

/**
 * Get or synthesize roster for a team (5 players)
 */
export function getTeamRoster(team: any, roomId: string, allPlayers: any[] = []): any[] {
  if (!team) return [];

  // 1. If team has embedded players
  if (Array.isArray(team.players) && team.players.length > 0) {
    const firstP = team.players[0];
    if (typeof firstP === 'object' && firstP.nickname) {
       return team.players.slice(0, 5);
    }
  }

  // 2. Look up players by teamId or teamName in existing players list
  const teamId = team.id;
  const teamName = team.name || team.teamName || '';
  
  // Try to find players that belong to this team
  let matching = allPlayers.filter(p => 
    p && (p.teamId === teamId || (teamName && p.teamName && p.teamName.toLowerCase().trim() === teamName.toLowerCase().trim()))
  );
  
  if (matching.length >= 3) {
    return matching.slice(0, 5);
  }

  // 3. Fallback: use generic numbered players if we can't find real ones
  const synthRoster = [
    { id: `p_${teamId || 'gen'}_1`, nickname: `${teamName} #1`, role: 'IGL', rating: 105 },
    { id: `p_${teamId || 'gen'}_2`, nickname: `${teamName} #2`, role: 'AWPer', rating: 110 },
    { id: `p_${teamId || 'gen'}_3`, nickname: `${teamName} #3`, role: 'Entry', rating: 102 },
    { id: `p_${teamId || 'gen'}_4`, nickname: `${teamName} #4`, role: 'Rifler', rating: 98 },
    { id: `p_${teamId || 'gen'}_5`, nickname: `${teamName} #5`, role: 'Support', rating: 95 },
  ];
  return synthRoster;
}

/**
 * Generates realistic match statistics for a completed tournament match
 */
export function generateRealisticMatchRecord(
  tournament: Tournament,
  match: Match,
  roomId: string,
  allPlayers: any[] = []
): GeneratedMatchRecord {
  const t1 = match.team1 || { id: 't1', name: 'Команда 1' };
  const t2 = match.team2 || { id: 't2', name: 'Команда 2' };
  const t1Name = t1.name || 'Команда 1';
  const t2Name = t2.name || 'Команда 2';

  const s1 = Number(match.score1) || 0;
  const s2 = Number(match.score2) || 0;
  
  const winnerId = match.winnerId || (s1 > s2 ? t1.id : s2 > s1 ? t2.id : null);
  const isT1Winner = winnerId === t1.id || (s1 > s2);

  const formatStr = tournament.settings?.matchFormat?.toUpperCase() || 'BO1';
  const isBO3 = formatStr === 'BO3' || (s1 + s2 > 2 && s1 <= 2 && s2 <= 2);
  const isBO5 = formatStr === 'BO5' || (s1 + s2 > 3 && s1 <= 3 && s2 <= 3);

  const rand = seedRandom(`${tournament.id}_${match.id || ''}_${t1Name}_${t2Name}_${s1}_${s2}`);

  // Determine realistic map scores
  const maps: any[] = [];
  const baseMapPool = tournament.game === 'so2' 
    ? ['Rust', 'Sandstone', 'Sakura', 'Province', 'Zone 9', 'Breeze', 'Dune', 'Hanami']
    : ['Mirage', 'Inferno', 'Nuke', 'Ancient', 'Anubis', 'Dust II', 'Overpass', 'Train', 'Cache'];

  // Shuffle map pool based on seed
  const mapPool = [...baseMapPool];
  for (let i = mapPool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [mapPool[i], mapPool[j]] = [mapPool[j], mapPool[i]];
  }

  const t1Roster = getTeamRoster(t1, roomId, allPlayers);
  const t2Roster = getTeamRoster(t2, roomId, allPlayers);

  // If score is already round scores (e.g. 13 - 10)
  const isDirectRoundScore = (s1 >= 9 || s2 >= 9) && (s1 <= 30 && s2 <= 30);

  let numMapsToGenerate = 1;
  let finalSeriesScore1 = s1;
  let finalSeriesScore2 = s2;

  if (isDirectRoundScore) {
    numMapsToGenerate = 1;
    finalSeriesScore1 = s1 > s2 ? 1 : 0;
    finalSeriesScore2 = s2 > s1 ? 1 : 0;
  } else if (isBO3) {
    numMapsToGenerate = Math.max(s1 + s2, 2);
    finalSeriesScore1 = s1;
    finalSeriesScore2 = s2;
  } else if (isBO5) {
    numMapsToGenerate = Math.max(s1 + s2, 3);
    finalSeriesScore1 = s1;
    finalSeriesScore2 = s2;
  } else {
    // BO1 with 1-0 or similar
    numMapsToGenerate = 1;
    finalSeriesScore1 = s1 > s2 ? 1 : (s1 === s2 && isT1Winner ? 1 : 0);
    finalSeriesScore2 = s2 > s1 ? 1 : (s1 === s2 && !isT1Winner ? 1 : 0);
  }

  // Generate map stats
  for (let mIdx = 0; mIdx < numMapsToGenerate; mIdx++) {
    const mapName = mapPool[mIdx % mapPool.length] || 'Mirage';
    let mapT1Score: number;
    let mapT2Score: number;

    if (isDirectRoundScore && mIdx === 0) {
      mapT1Score = s1;
      mapT2Score = s2;
    } else {
      // Determine who won this map
      let mapWinnerT1 = isT1Winner;
      if (numMapsToGenerate > 1) {
        if (mIdx === 0) mapWinnerT1 = isT1Winner;
        else if (mIdx === 1) mapWinnerT1 = !isT1Winner;
        else mapWinnerT1 = isT1Winner;
      }
      if (mapWinnerT1) {
        mapT1Score = 13;
        mapT2Score = Math.floor(rand() * 7) + 4; // 4 to 10
      } else {
        mapT2Score = 13;
        mapT1Score = Math.floor(rand() * 7) + 4; // 4 to 10
      }
    }

    const totalRounds = mapT1Score + mapT2Score;

    // Generate player stats for this map
    const genPlayerStats = (roster: any[], teamRoundsWon: number, oppRoundsWon: number, isWinner: boolean) => {
      return roster.map((p, pIdx) => {
        const baseRating = Number(p.rating || 100);
        const ratingFactor = baseRating / 100;
        
        // Base kills per round ~0.7 to 0.85
        const roundKillsAvg = (isWinner ? 0.78 : 0.62) * ratingFactor;
        const kills = Math.max(5, Math.round(totalRounds * roundKillsAvg * (0.8 + rand() * 0.4)));
        const deaths = Math.max(4, Math.round(totalRounds * (isWinner ? 0.6 : 0.78) * (0.8 + rand() * 0.4)));
        const assists = Math.max(1, Math.round(totalRounds * 0.22 * (0.7 + rand() * 0.6)));
        const damage = Math.round(kills * 105 + assists * 35 + rand() * 150);
        const adr = Math.round((damage / totalRounds) * 10) / 10;
        const kd = deaths > 0 ? Math.round((kills / deaths) * 100) / 100 : kills;
        
        // HLTV Rating 2.0 approximation
        const hltvRating = Math.round((0.007387 * kills + 0.003591 * assists - 0.007387 * deaths + 0.007 * (adr / 10) + 0.65) * 100) / 100;
        
        // Multi-kills
        const k1 = Math.round(kills * 0.6);
        const k2 = Math.round(kills * 0.25);
        const k3 = Math.round(kills * 0.1);
        const k4 = rand() > 0.7 ? 1 : 0;
        const k5 = rand() > 0.95 ? 1 : 0;
        
        const fk = Math.round(kills * 0.18);
        const fd = Math.round(deaths * 0.18);
        const kastRounds = Math.min(totalRounds, Math.round(totalRounds * (isWinner ? 0.74 : 0.62)));

        return {
          id: p.id || `p_${p.nickname}`,
          nickname: p.nickname,
          kills,
          k: kills,
          deaths,
          d: deaths,
          assists,
          a: assists,
          damage,
          adr,
          kd,
          hltvRating: Math.max(0.4, Math.min(2.3, hltvRating)),
          totalRounds,
          k1,
          k2,
          k3,
          k4,
          k5,
          fk,
          fd,
          kastRounds,
          roundSwing: Math.round(((isWinner ? 0.04 : -0.04) * ratingFactor) * 100) / 100,
          rawRoundSwing: (isWinner ? 0.04 : -0.04) * ratingFactor,
          clutchesWon1v1: rand() > 0.6 ? 1 : 0,
          clutchesWon1v2: rand() > 0.85 ? 1 : 0,
          clutchesWon1v3: rand() > 0.96 ? 1 : 0,
          clutchesWon1v4: 0,
          clutchesWon1v5: 0,
          openingKillsTraded: Math.round(fk * 0.3),
          openingKillsConverted: Math.round(fk * 0.7)
        };
      });
    };

    const mapT1Stats = genPlayerStats(t1Roster, mapT1Score, mapT2Score, mapT1Score > mapT2Score);
    const mapT2Stats = genPlayerStats(t2Roster, mapT2Score, mapT1Score, mapT2Score > mapT1Score);

    maps.push({
      mapName,
      team1Score: mapT1Score,
      team2Score: mapT2Score,
      winner: mapT1Score > mapT2Score ? t1Name : t2Name,
      team1Stats: mapT1Stats,
      team2Stats: mapT2Stats
    });
  }

  // Aggregate overall stats
  const aggregateTeamStats = (roster: any[], mapList: any[], isT1: boolean) => {
    return roster.map(p => {
      const pStatsList = mapList.map(m => (isT1 ? m.team1Stats : m.team2Stats).find((s: any) => s.nickname === p.nickname)).filter(Boolean);
      const kills = pStatsList.reduce((acc, s) => acc + s.kills, 0);
      const deaths = pStatsList.reduce((acc, s) => acc + s.deaths, 0);
      const assists = pStatsList.reduce((acc, s) => acc + s.assists, 0);
      const damage = pStatsList.reduce((acc, s) => acc + s.damage, 0);
      const totalRounds = pStatsList.reduce((acc, s) => acc + s.totalRounds, 0);
      const kd = deaths > 0 ? Math.round((kills / deaths) * 100) / 100 : kills;
      const hltvRating = pStatsList.length > 0
        ? Math.round((pStatsList.reduce((acc, s) => acc + s.hltvRating, 0) / pStatsList.length) * 100) / 100
        : 1.0;

      return {
        id: p.id || `p_${p.nickname}`,
        nickname: p.nickname,
        kills,
        k: kills,
        deaths,
        d: deaths,
        assists,
        a: assists,
        damage,
        kd,
        hltvRating,
        totalRounds,
        k1: pStatsList.reduce((acc, s) => acc + s.k1, 0),
        k2: pStatsList.reduce((acc, s) => acc + s.k2, 0),
        k3: pStatsList.reduce((acc, s) => acc + s.k3, 0),
        k4: pStatsList.reduce((acc, s) => acc + s.k4, 0),
        k5: pStatsList.reduce((acc, s) => acc + s.k5, 0),
        fk: pStatsList.reduce((acc, s) => acc + s.fk, 0),
        fd: pStatsList.reduce((acc, s) => acc + s.fd, 0),
        kastRounds: pStatsList.reduce((acc, s) => acc + s.kastRounds, 0),
        roundSwing: pStatsList.reduce((acc, s) => acc + s.roundSwing, 0),
        rawRoundSwing: pStatsList.reduce((acc, s) => acc + s.rawRoundSwing, 0),
        clutchesWon1v1: pStatsList.reduce((acc, s) => acc + s.clutchesWon1v1, 0),
        clutchesWon1v2: pStatsList.reduce((acc, s) => acc + s.clutchesWon1v2, 0),
        clutchesWon1v3: pStatsList.reduce((acc, s) => acc + s.clutchesWon1v3, 0),
        clutchesWon1v4: 0,
        clutchesWon1v5: 0,
        openingKillsTraded: pStatsList.reduce((acc, s) => acc + s.openingKillsTraded, 0),
        openingKillsConverted: pStatsList.reduce((acc, s) => acc + s.openingKillsConverted, 0)
      };
    });
  };

  const aggT1Stats = aggregateTeamStats(t1Roster, maps, true);
  const aggT2Stats = aggregateTeamStats(t2Roster, maps, false);

  // Determine MVP: Highest rated player on winning team
  const winningRosterStats = isT1Winner ? aggT1Stats : aggT2Stats;
  const sortedWinners = [...winningRosterStats].sort((a, b) => (b.hltvRating || 0) - (a.hltvRating || 0));
  const topWinner = sortedWinners[0] || winningRosterStats[0];

  const mvp = topWinner ? {
    nickname: topWinner.nickname,
    kills: topWinner.kills,
    deaths: topWinner.deaths,
    kd: topWinner.kd,
    hltvRating: topWinner.hltvRating
  } : null;

  const matchUniqueId = match.id 
    ? (match.id.startsWith('match_') ? match.id : `match_t_${tournament.id}_${match.id}`)
    : `match_t_${tournament.id}_${t1.id}_vs_${t2.id}_${Date.now()}`;

  return {
    id: matchUniqueId,
    date: new Date().toISOString(),
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    gameMode: tournament.game || tournament.settings?.game || (tournament.id?.includes('so2') ? 'so2' : 'cs2'),
    format: formatStr,
    bo: isBO5 ? 5 : (isBO3 ? 3 : 1),
    team1Name: t1Name,
    team2Name: t2Name,
    team1Score: finalSeriesScore1,
    team2Score: finalSeriesScore2,
    winnerId,
    userId: roomId,
    channelId: roomId,
    mvp,
    team1Stats: aggT1Stats,
    team2Stats: aggT2Stats,
    maps,
    achievements: []
  };
}

/**
 * Records a single tournament match completion to localStorage, server, and updates tournament.matchIds
 */
export async function recordTournamentMatchResult(
  userId: string,
  tournament: Tournament,
  match: Match,
  stageName?: string
) {
  if (!tournament || !match || !match.team1 || !match.team2) return;
  const t1Id = match.team1.id;
  const t2Id = match.team2.id;
  if (t1Id === 'BYE' || t2Id === 'BYE') return;

  const roomId = getCanonicalRoomId(userId);

  // Load existing players & matches for context
  const localPlayers = JSON.parse(localStorage.getItem(`players_${roomId}`) || localStorage.getItem(`players_${userId}`) || '[]');
  const localMatches = JSON.parse(localStorage.getItem(`matches_${roomId}`) || localStorage.getItem(`matches_${userId}`) || '[]');

  const record = generateRealisticMatchRecord(tournament, match, roomId, localPlayers);

  // Check if match already exists
  const existingIdx = localMatches.findIndex((m: any) => 
    m && (m.id === record.id || (
      m.tournamentId === tournament.id &&
      ((m.team1Name === record.team1Name && m.team2Name === record.team2Name) ||
       (m.team1Name === record.team2Name && m.team2Name === record.team1Name)) &&
      (Math.abs(new Date(m.date).getTime() - new Date().getTime()) < 1000 * 60 * 30) // within 30 min
    ))
  );

  let updatedMatches: any[];
  if (existingIdx >= 0) {
    localMatches[existingIdx] = { ...localMatches[existingIdx], ...record };
    updatedMatches = localMatches;
  } else {
    updatedMatches = [record, ...localMatches];
  }

  // 1. Save to local storage under both room & user IDs
  saveMatchesToLocalStorage(roomId, updatedMatches);
  if (userId && userId !== roomId) {
    saveMatchesToLocalStorage(userId, updatedMatches);
  }

  // 2. Attach matchId to tournament
  const tourneys = loadTournaments(roomId);
  const tourneyObj = tourneys.find(t => t.id === tournament.id) || tournament;
  const currentMatchIds = new Set<string>(tourneyObj.matchIds || []);
  currentMatchIds.add(record.id);
  tourneyObj.matchIds = Array.from(currentMatchIds);
  saveTournament(roomId, tourneyObj);

  // 3. Dispatch global update event
  window.dispatchEvent(new Event('db-user-updated'));
  window.dispatchEvent(new Event('tournaments-updated'));

  // 4. Background remote sync
  try {
    fetch('/api/sync-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: roomId,
        matches: [record],
        tournaments: [tourneyObj]
      })
    }).catch(() => {});

    // Firestore async set
    setDoc(doc(db, 'matches', record.id), record, { merge: true }).catch(() => {});
  } catch (e) {
    console.warn("Async match sync notice:", e);
  }

  return record;
}

/**
 * Scans all finished matches in a tournament and backfills any missing matches into match history
 */
export function syncAndBackfillTournamentMatches(
  userId: string,
  tournament: Tournament
): any[] {
  if (!tournament || !tournament.id) return [];

  const roomId = getCanonicalRoomId(userId);
  const localPlayers = JSON.parse(localStorage.getItem(`players_${roomId}`) || localStorage.getItem(`players_${userId}`) || '[]');
  const localMatches = JSON.parse(localStorage.getItem(`matches_${roomId}`) || localStorage.getItem(`matches_${userId}`) || '[]');

  // Collect all matches from all stages of the tournament
  const finishedMatches: Match[] = [];

  const scanList = (list: any[]) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (!item) continue;
      if (Array.isArray(item)) {
        scanList(item);
      } else if (item.team1 && item.team2) {
        const t1Id = item.team1.id;
        const t2Id = item.team2.id;
        if (t1Id === 'BYE' || t2Id === 'BYE') continue;
        
        const hasWinner = !!item.winnerId;
        const hasScore = (Number(item.score1) || 0) > 0 || (Number(item.score2) || 0) > 0;
        if (hasWinner || hasScore || item.isFinished) {
          finishedMatches.push(item);
        }
      }
    }
  };

  // 1. Single / Double elimination bracket rounds
  scanList(tournament.bracketRounds || []);
  scanList(tournament.losersBracketRounds || []);
  scanList(tournament.grandFinal || []);

  // 2. Swiss rounds
  scanList(tournament.swissRounds || []);

  // 3. GSL groups
  if (Array.isArray(tournament.gslGroups)) {
    for (const g of tournament.gslGroups) {
      scanList(g.upperBracket || []);
      scanList(g.lowerBracket || []);
    }
  }

  // 4. Classic Groups
  if (Array.isArray(tournament.groups)) {
    for (const g of tournament.groups) {
      scanList(g.matches || []);
    }
  }

  // 5. Tiered playoff rounds
  scanList(tournament.tieredBracketRounds || []);

  if (finishedMatches.length === 0) {
    return localMatches.filter((m: any) => 
      m && (m.tournamentId === tournament.id || (tournament.name && m.tournamentName === tournament.name))
    );
  }

  let hasNewMatches = false;
  const matchIdsSet = new Set<string>(tournament.matchIds || []);

  for (const m of finishedMatches) {
    const t1Name = m.team1?.name || (m as any).team1Name || '';
    const t2Name = m.team2?.name || (m as any).team2Name || '';

    // Check if this match already exists in localMatches
    const exists = localMatches.some((lm: any) => {
      if (!lm) return false;
      if (m.id && lm.id === `match_t_${tournament.id}_${m.id}`) return true;
      if (lm.id === m.id) return true;
      if (lm.tournamentId === tournament.id) {
        const matchesTeams = (lm.team1Name === t1Name && lm.team2Name === t2Name) ||
                             (lm.team1Name === t2Name && lm.team2Name === t1Name);
        if (matchesTeams) return true;
      }
      return false;
    });

    if (!exists) {
      const generated = generateRealisticMatchRecord(tournament, m, roomId, localPlayers);
      localMatches.unshift(generated);
      matchIdsSet.add(generated.id);
      hasNewMatches = true;
    }
  }

  if (hasNewMatches) {
    saveMatchesToLocalStorage(roomId, localMatches);
    if (userId && userId !== roomId) {
      saveMatchesToLocalStorage(userId, localMatches);
    }

    tournament.matchIds = Array.from(matchIdsSet);
    saveTournament(roomId, tournament);

    window.dispatchEvent(new Event('db-user-updated'));
    window.dispatchEvent(new Event('tournaments-updated'));

    // Sync in background
    try {
      fetch('/api/sync-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: roomId,
          matches: localMatches.slice(0, 40),
          tournaments: [tournament]
        })
      }).catch(() => {});
    } catch (e) {}
  }

  return localMatches.filter((m: any) => 
    m && (m.tournamentId === tournament.id || (tournament.name && m.tournamentName === tournament.name))
  );
}
