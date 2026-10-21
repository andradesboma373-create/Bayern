import { Team, Match } from './types';

export const generateNextSwissRound = (
  teams: Team[],
  previousRounds: Match[][],
  winsToAdvance: number = 3,
  lossesToEliminate: number = 3
): Match[] | null => {
  if (previousRounds.length === 0) {
    const validTeams = teams.filter(t => t.id !== 'BYE');
    if (validTeams.length === 0) return null;
    const matches: Match[] = [];
    const pairsCount = Math.floor(validTeams.length / 2);
    const hasOdd = validTeams.length % 2 !== 0;

    for (let i = 0; i < pairsCount; i++) {
      matches.push({
        id: `swiss-r0-m${i}`,
        team1: validTeams[i * 2],
        team2: validTeams[i * 2 + 1],
        score1: 0,
        score2: 0,
        winnerId: null
      });
    }

    if (hasOdd) {
      const lastTeam = validTeams[validTeams.length - 1];
      matches.push({
        id: `swiss-r0-m${pairsCount}`,
        team1: lastTeam,
        team2: { id: 'BYE', name: 'BYE' },
        score1: 0,
        score2: 0,
        winnerId: lastTeam.id
      });
    }

    return matches;
  }

  const records = new Map<string, { w: number; l: number; team: Team }>();
  teams.filter(t => t.id !== 'BYE').forEach(t => {
    records.set(t.id, { w: 0, l: 0, team: t });
  });

  const playedPairs = new Set<string>();
  const byeRecipients = new Set<string>();

  previousRounds.flat().forEach(m => {
    if (m.team1 && m.team2) {
      if (m.team1.id === 'BYE' && m.team2.id !== 'BYE') byeRecipients.add(m.team2.id);
      if (m.team2.id === 'BYE' && m.team1.id !== 'BYE') byeRecipients.add(m.team1.id);
      if (m.team1.id !== 'BYE' && m.team2.id !== 'BYE') {
        playedPairs.add([m.team1.id, m.team2.id].sort().join(':::'));
      }
    }
    if (m.winnerId) {
      if (m.team1 && m.team1.id !== 'BYE' && records.has(m.team1.id)) {
        if (m.winnerId === m.team1.id) records.get(m.team1.id)!.w++;
        else records.get(m.team1.id)!.l++;
      }
      if (m.team2 && m.team2.id !== 'BYE' && records.has(m.team2.id)) {
        if (m.winnerId === m.team2.id) records.get(m.team2.id)!.w++;
        else records.get(m.team2.id)!.l++;
      }
    }
  });

  const activeTeams = Array.from(records.values()).filter(r => r.w < winsToAdvance && r.l < lossesToEliminate);
  if (activeTeams.length < 2) return null;

  let byeTeam: Team | null = null;
  let pool = [...activeTeams];

  if (pool.length % 2 !== 0) {
    const sortedForBye = [...pool].sort((a, b) => (a.w !== b.w ? a.w - b.w : b.l - a.l));
    byeTeam = (sortedForBye.find(item => !byeRecipients.has(item.team.id)) || sortedForBye[0]).team;
    pool = pool.filter(item => item.team.id !== byeTeam!.id);
  }

  pool.sort((a, b) => (a.w !== b.w ? b.w - a.w : a.l !== b.l ? a.l - b.l : 0));

  const matchBacktrack = (list: typeof pool): [Team, Team][] | null => {
    if (list.length === 0) return [];
    const first = list[0];
    const candidates = list.slice(1).sort((a, b) => {
      const diffA = Math.abs(a.w - first.w) + Math.abs(a.l - first.l);
      const diffB = Math.abs(b.w - first.w) + Math.abs(b.l - first.l);
      if (diffA !== diffB) return diffA - diffB;
      const playedA = playedPairs.has([first.team.id, a.team.id].sort().join(':::'));
      const playedB = playedPairs.has([first.team.id, b.team.id].sort().join(':::'));
      return playedA !== playedB ? (playedA ? 1 : -1) : 0;
    });

    for (const cand of candidates) {
      const rest = list.filter(item => item.team.id !== first.team.id && item.team.id !== cand.team.id);
      const sub = matchBacktrack(rest);
      if (sub) return [[first.team, cand.team], ...sub];
    }
    return null;
  };

  let pairs = matchBacktrack(pool);
  if (!pairs) {
    const fallbackPairs: [Team, Team][] = [];
    const temp = [...pool];
    while (temp.length >= 2) {
      const t1 = temp.shift()!;
      const t2 = temp.shift()!;
      fallbackPairs.push([t1.team, t2.team]);
    }
    pairs = fallbackPairs;
  }

  const rIdx = previousRounds.length;
  const newRoundMatches: Match[] = [];

  pairs.forEach(([t1, t2], mIdx) => {
    newRoundMatches.push({
      id: `swiss-r${rIdx}-m${mIdx}`,
      team1: t1,
      team2: t2,
      score1: 0,
      score2: 0,
      winnerId: null
    });
  });

  if (byeTeam) {
    newRoundMatches.push({
      id: `swiss-r${rIdx}-m${pairs.length}`,
      team1: byeTeam,
      team2: { id: 'BYE', name: 'BYE' },
      score1: 0,
      score2: 0,
      winnerId: byeTeam.id
    });
  }

  return newRoundMatches;
};
