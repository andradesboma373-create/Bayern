import { getCanonicalRoomId, loadTournaments, saveTournament } from '../components/setka_tourn/storage';
import { db, doc, setDoc } from '../firebase';

function seededRandom(seedStr: string) {
  let s = 3735928559;
  for (let i = 0; i < seedStr.length; i++) {
    s = Math.imul(s ^ seedStr.charCodeAt(i), 2654435761);
  }
  return () => {
    s = Math.imul(s ^ (s >>> 16), 2246822507);
    s = Math.imul(s ^ (s >>> 13), 3266489909);
    return ((s >>> 0) % 10000) / 10000;
  };
}

function getRosterForTeam(team: any, _roomId: string, allPlayers: any[] = []): any[] {
  if (!team) return [];
  if (Array.isArray(team.players) && team.players.length > 0) {
    const first = team.players[0];
    if (typeof first === 'object' && first.nickname) {
      return team.players.slice(0, 5);
    }
  }
  const id = team.id;
  const name = team.name || team.teamName || '';
  const filtered = allPlayers.filter(
    p => p && (p.teamId === id || (name && p.teamName && p.teamName.toLowerCase().trim() === name.toLowerCase().trim()))
  );
  if (filtered.length >= 3) {
    return filtered.slice(0, 5);
  }
  return [
    { id: `p_${id || 'gen'}_1`, nickname: `${name} #1`, role: 'IGL', rating: 105 },
    { id: `p_${id || 'gen'}_2`, nickname: `${name} #2`, role: 'AWPer', rating: 110 },
    { id: `p_${id || 'gen'}_3`, nickname: `${name} #3`, role: 'Entry', rating: 102 },
    { id: `p_${id || 'gen'}_4`, nickname: `${name} #4`, role: 'Rifler', rating: 98 },
    { id: `p_${id || 'gen'}_5`, nickname: `${name} #5`, role: 'Support', rating: 95 },
  ];
}

export function buildMatchRecord(tournament: any, match: any, roomId: string, allPlayers: any[] = []): any {
  const t1 = match.team1 || { id: 't1', name: 'Команда 1' };
  const t2 = match.team2 || { id: 't2', name: 'Команда 2' };
  const t1Name = t1.name || 'Команда 1';
  const t2Name = t2.name || 'Команда 2';
  const score1 = Number(match.score1) || 0;
  const score2 = Number(match.score2) || 0;
  const winnerId = match.winnerId || (score1 > score2 ? t1.id : score2 > score1 ? t2.id : null);
  const isT1Winner = winnerId === t1.id || score1 > score2;

  const matchFormat = (tournament.settings?.matchFormat?.toUpperCase()) || 'BO1';
  const isBo3 = matchFormat === 'BO3' || (score1 + score2 > 2 && score1 <= 2 && score2 <= 2);
  const isBo5 = matchFormat === 'BO5' || (score1 + score2 > 3 && score1 <= 3 && score2 <= 3);

  const rng = seededRandom(`${tournament.id}_${match.id || ''}_${t1Name}_${t2Name}_${score1}_${score2}`);
  const mapsList = tournament.game === 'so2'
    ? ['Rust', 'Sandstone', 'Sakura', 'Province', 'Zone 9', 'Breeze', 'Dune', 'Hanami']
    : ['Mirage', 'Inferno', 'Nuke', 'Ancient', 'Anubis', 'Dust II', 'Overpass', 'Train', 'Cache'];

  const shuffledMaps = [...mapsList];
  for (let i = shuffledMaps.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffledMaps[i], shuffledMaps[j]] = [shuffledMaps[j], shuffledMaps[i]];
  }

  const roster1 = getRosterForTeam(t1, roomId, allPlayers);
  const roster2 = getRosterForTeam(t2, roomId, allPlayers);

  const isDirectScore = (score1 >= 9 || score2 >= 9) && score1 <= 30 && score2 <= 30;
  let mapsCount = 1;
  let finalS1 = score1;
  let finalS2 = score2;

  if (isDirectScore) {
    mapsCount = 1;
    finalS1 = score1 > score2 ? 1 : 0;
    finalS2 = score2 > score1 ? 1 : 0;
  } else if (isBo3) {
    mapsCount = Math.max(score1 + score2, 2);
    finalS1 = score1;
    finalS2 = score2;
  } else if (isBo5) {
    mapsCount = Math.max(score1 + score2, 3);
    finalS1 = score1;
    finalS2 = score2;
  } else {
    mapsCount = 1;
    finalS1 = score1 > score2 || (score1 === score2 && isT1Winner) ? 1 : 0;
    finalS2 = score2 > score1 || (score1 === score2 && !isT1Winner) ? 1 : 0;
  }

  const mapsData: any[] = [];
  for (let m = 0; m < mapsCount; m++) {
    const mapName = shuffledMaps[m % shuffledMaps.length] || 'Mirage';
    let s1 = 0;
    let s2 = 0;

    if (isDirectScore && m === 0) {
      s1 = score1;
      s2 = score2;
    } else {
      let mWonByT1 = isT1Winner;
      if (mapsCount > 1) {
        if (m === 0) mWonByT1 = isT1Winner;
        else if (m === 1) mWonByT1 = !isT1Winner;
        else mWonByT1 = isT1Winner;
      }
      if (mWonByT1) {
        s1 = 13;
        s2 = Math.floor(rng() * 7) + 4;
      } else {
        s2 = 13;
        s1 = Math.floor(rng() * 7) + 4;
      }
    }

    const totalRounds = s1 + s2;
    const generateStats = (roster: any[], wonRounds: number, _lostRounds: number, isWinner: boolean) => {
      return roster.map(player => {
        const pRating = Number(player.rating || 100) / 100;
        const baseKillFactor = (isWinner ? 0.78 : 0.62) * pRating;
        const k = Math.max(5, Math.round(totalRounds * baseKillFactor * (0.8 + rng() * 0.4)));
        const d = Math.max(4, Math.round(totalRounds * (isWinner ? 0.6 : 0.78) * (0.8 + rng() * 0.4)));
        const a = Math.max(1, Math.round(totalRounds * 0.22 * (0.7 + rng() * 0.6)));
        const dmg = Math.round(k * 105 + a * 35 + rng() * 150);
        const adr = Math.round((dmg / totalRounds) * 10) / 10;
        const kd = d > 0 ? Math.round((k / d) * 100) / 100 : k;
        const hltv = Math.round((0.007387 * k + 0.003591 * a - 0.007387 * d + 0.007 * (adr / 10) + 0.65) * 100) / 100;

        return {
          id: player.id || `p_${player.nickname}`,
          nickname: player.nickname,
          kills: k,
          k,
          deaths: d,
          d,
          assists: a,
          a,
          damage: dmg,
          adr,
          kd,
          hltvRating: Math.max(0.4, Math.min(2.3, hltv)),
          totalRounds,
          k1: Math.round(k * 0.6),
          k2: Math.round(k * 0.25),
          k3: Math.round(k * 0.1),
          k4: rng() > 0.7 ? 1 : 0,
          k5: rng() > 0.95 ? 1 : 0,
          fk: Math.round(k * 0.18),
          fd: Math.round(d * 0.18),
          kastRounds: Math.min(totalRounds, Math.round(totalRounds * (isWinner ? 0.74 : 0.62))),
          roundSwing: Math.round((isWinner ? 0.04 : -0.04) * pRating * 100) / 100,
          rawRoundSwing: (isWinner ? 0.04 : -0.04) * pRating,
          clutchesWon1v1: rng() > 0.6 ? 1 : 0,
          clutchesWon1v2: rng() > 0.85 ? 1 : 0,
          clutchesWon1v3: rng() > 0.96 ? 1 : 0,
          clutchesWon1v4: 0,
          clutchesWon1v5: 0,
          openingKillsTraded: Math.round(k * 0.05),
          openingKillsConverted: Math.round(k * 0.12),
        };
      });
    };

    const stats1 = generateStats(roster1, s1, s2, s1 > s2);
    const stats2 = generateStats(roster2, s2, s1, s2 > s1);

    mapsData.push({
      mapName,
      team1Score: s1,
      team2Score: s2,
      winner: s1 > s2 ? t1Name : t2Name,
      team1Stats: stats1,
      team2Stats: stats2,
    });
  }

  const aggregateStats = (roster: any[], maps: any[], isT1: boolean) => {
    return roster.map(p => {
      const pStats = maps.map(m => (isT1 ? m.team1Stats : m.team2Stats).find((s: any) => s.nickname === p.nickname)).filter(Boolean);
      const totalK = pStats.reduce((sum, s) => sum + s.kills, 0);
      const totalD = pStats.reduce((sum, s) => sum + s.deaths, 0);
      const totalA = pStats.reduce((sum, s) => sum + s.assists, 0);
      const totalDmg = pStats.reduce((sum, s) => sum + s.damage, 0);
      const totalRnds = pStats.reduce((sum, s) => sum + s.totalRounds, 0);
      const kd = totalD > 0 ? Math.round((totalK / totalD) * 100) / 100 : totalK;
      const hltv = pStats.length > 0 ? Math.round((pStats.reduce((sum, s) => sum + s.hltvRating, 0) / pStats.length) * 100) / 100 : 1.0;

      return {
        id: p.id || `p_${p.nickname}`,
        nickname: p.nickname,
        kills: totalK,
        deaths: totalD,
        assists: totalA,
        damage: totalDmg,
        kd,
        hltvRating: hltv,
        totalRounds: totalRnds,
        k1: pStats.reduce((sum, s) => sum + s.k1, 0),
        k2: pStats.reduce((sum, s) => sum + s.k2, 0),
        k3: pStats.reduce((sum, s) => sum + s.k3, 0),
        k4: pStats.reduce((sum, s) => sum + s.k4, 0),
        k5: pStats.reduce((sum, s) => sum + s.k5, 0),
        fk: pStats.reduce((sum, s) => sum + s.fk, 0),
        fd: pStats.reduce((sum, s) => sum + s.fd, 0),
        kastRounds: pStats.reduce((sum, s) => sum + s.kastRounds, 0),
        roundSwing: pStats.reduce((sum, s) => sum + s.roundSwing, 0),
        rawRoundSwing: pStats.reduce((sum, s) => sum + s.rawRoundSwing, 0),
        clutchesWon1v1: pStats.reduce((sum, s) => sum + s.clutchesWon1v1, 0),
        clutchesWon1v2: pStats.reduce((sum, s) => sum + s.clutchesWon1v2, 0),
        clutchesWon1v3: pStats.reduce((sum, s) => sum + s.clutchesWon1v3, 0),
        clutchesWon1v4: 0,
        clutchesWon1v5: 0,
        openingKillsTraded: pStats.reduce((sum, s) => sum + s.openingKillsTraded, 0),
        openingKillsConverted: pStats.reduce((sum, s) => sum + s.openingKillsConverted, 0),
      };
    });
  };

  const agg1 = aggregateStats(roster1, mapsData, true);
  const agg2 = aggregateStats(roster2, mapsData, false);
  const winningStats = isT1Winner ? agg1 : agg2;
  const bestPlayer = [...winningStats].sort((a, b) => (b.hltvRating || 0) - (a.hltvRating || 0))[0] || winningStats[0];

  const mvp = bestPlayer ? {
    nickname: bestPlayer.nickname,
    kills: bestPlayer.kills,
    deaths: bestPlayer.deaths,
    kd: bestPlayer.kd,
    hltvRating: bestPlayer.hltvRating,
  } : null;

  return {
    id: match.id?.startsWith('match_') ? match.id : `match_t_${tournament.id}_${match.id || Date.now()}`,
    date: new Date().toISOString(),
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    gameMode: tournament.game || tournament.settings?.game || (tournament.id?.includes('so2') ? 'so2' : 'cs2'),
    format: matchFormat,
    bo: isBo5 ? 5 : isBo3 ? 3 : 1,
    team1Name: t1Name,
    team2Name: t2Name,
    team1Score: finalS1,
    team2Score: finalS2,
    winnerId,
    userId: roomId,
    channelId: roomId,
    mvp,
    team1Stats: agg1,
    team2Stats: agg2,
    maps: mapsData,
    achievements: [],
  };
}

export async function recordTournamentMatchResult(
  userId: string,
  tournament: any,
  match: any,
  _stageName: string = ''
): Promise<any> {
  if (!tournament || !match || !match.team1 || !match.team2) return;
  const t1Id = match.team1.id;
  const t2Id = match.team2.id;
  if (t1Id === 'BYE' || t2Id === 'BYE') return;

  const canonical = getCanonicalRoomId(userId);
  const players = JSON.parse(localStorage.getItem(`players_${canonical}`) || localStorage.getItem(`players_${userId}`) || '[]');
  const matches = JSON.parse(localStorage.getItem(`matches_${canonical}`) || localStorage.getItem(`matches_${userId}`) || '[]');

  const record = buildMatchRecord(tournament, match, canonical, players);
  const existingIdx = matches.findIndex((m: any) => m && m.id === record.id);
  let updatedMatches: any[];
  if (existingIdx >= 0) {
    matches[existingIdx] = { ...matches[existingIdx], ...record };
    updatedMatches = matches;
  } else {
    updatedMatches = [record, ...matches];
  }

  try {
    localStorage.setItem(`matches_${canonical}`, JSON.stringify(updatedMatches));
    if (userId && userId !== canonical) {
      localStorage.setItem(`matches_${userId}`, JSON.stringify(updatedMatches));
    }
  } catch {}

  const tournaments = loadTournaments(canonical);
  const tourney = tournaments.find((t: any) => t.id === tournament.id) || tournament;
  const matchIds = new Set(tourney.matchIds || []);
  matchIds.add(record.id);
  tourney.matchIds = Array.from(matchIds);
  saveTournament(canonical, tourney);

  window.dispatchEvent(new Event('db-user-updated'));
  window.dispatchEvent(new Event('tournaments-updated'));

  try {
    fetch('/api/sync-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: canonical, matches: [record], tournaments: [tourney] })
    }).catch(() => {});
    setDoc(doc(db, 'matches', record.id), record, { merge: true }).catch(() => {});
  } catch {}

  return record;
}

export async function syncAndBackfillTournamentMatches(
  roomId: string,
  tournamentsInput?: any
): Promise<any[]> {
  const canonical = getCanonicalRoomId(roomId);
  let tourneys: any[] = [];
  if (Array.isArray(tournamentsInput)) {
    tourneys = tournamentsInput;
  } else if (tournamentsInput && typeof tournamentsInput === 'object') {
    tourneys = [tournamentsInput];
  } else {
    tourneys = loadTournaments(canonical);
  }

  const existingMatches: any[] = JSON.parse(
    localStorage.getItem(`matches_${canonical}`) || localStorage.getItem(`matches_${roomId}`) || '[]'
  );
  const recordedList: any[] = [];

  for (const t of tourneys) {
    if (!t) continue;
    const processMatch = (m: any, stageName: string) => {
      if (!m || !m.team1 || !m.team2) return;
      if (m.team1.id === 'BYE' || m.team2.id === 'BYE') return;
      if (m.isFinished || m.winnerId || (m.score1 !== undefined && m.score2 !== undefined && (m.score1 > 0 || m.score2 > 0))) {
        const record = buildMatchRecord(t, m, canonical);
        recordedList.push(record);
      }
    };

    // Bracket rounds
    t.bracketRounds?.forEach((r: any) => r?.forEach((m: any) => processMatch(m, 'Playoff')));
    t.losersBracketRounds?.forEach((r: any) => r?.forEach((m: any) => processMatch(m, 'Losers Bracket')));
    t.grandFinal?.forEach((m: any) => processMatch(m, 'Grand Final'));
    t.swissRounds?.forEach((r: any) => r?.forEach((m: any) => processMatch(m, 'Swiss')));
    t.groups?.forEach((g: any) => g?.matches?.forEach((m: any) => processMatch(m, `Group ${g.name || ''}`)));
    t.gslGroups?.forEach((g: any) => {
      g?.upperBracket?.forEach((r: any) => r?.forEach((m: any) => processMatch(m, `GSL Upper`)));
      g?.lowerBracket?.forEach((r: any) => r?.forEach((m: any) => processMatch(m, `GSL Lower`)));
    });
    t.tieredBracketRounds?.forEach((r: any) => r?.forEach((m: any) => processMatch(m, 'Tiered Playoff')));
  }

  if (recordedList.length > 0) {
    const combined = [...existingMatches];
    for (const r of recordedList) {
      const idx = combined.findIndex(m => m.id === r.id);
      if (idx >= 0) combined[idx] = { ...combined[idx], ...r };
      else combined.unshift(r);
    }
    try {
      localStorage.setItem(`matches_${canonical}`, JSON.stringify(combined));
      if (roomId !== canonical) localStorage.setItem(`matches_${roomId}`, JSON.stringify(combined));
    } catch {}
    window.dispatchEvent(new Event('db-user-updated'));
  }

  return recordedList;
}
