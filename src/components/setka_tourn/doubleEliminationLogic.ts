import { Team, Match } from './types';

export const BYE_TEAM: Team = { id: 'BYE', name: 'BYE' };

function getTeamRating(team: any): number {
  if (!team || team.id === 'BYE') return 0;
  if (!team.players || team.players.length === 0) return 500;
  return (
    team.players.reduce((acc: number, p: any) => {
      const r = Number(p.rating) || Number(p.avgRating) || 100;
      return acc + r;
    }, 0) / team.players.length
  );
}

export function getBalancedSeeding(teams: Team[]): Team[] {
  if (teams.length <= 2) return teams;
  const sorted = [...teams].sort((a, b) => getTeamRating(b) - getTeamRating(a));
  const len = sorted.length;
  let power = 1;
  while (power < len) power *= 2;

  const padded: (Team | null)[] = [...sorted];
  while (padded.length < power) padded.push(null);

  let seeds = [1];
  while (seeds.length < power) {
    const next: number[] = [];
    const sum = seeds.length * 2 + 1;
    for (const s of seeds) {
      next.push(s);
      next.push(sum - s);
    }
    seeds = next;
  }

  const result: Team[] = [];
  for (const s of seeds) {
    const t = padded[s - 1];
    result.push(t || BYE_TEAM);
  }
  return result;
}

export function generateSingleEliminationBracket(teams: Team[]): Match[][] {
  const count = teams ? teams.length : 0;
  if (count === 0) return [];
  let bracketSize = 1;
  while (bracketSize < count) bracketSize *= 2;

  const seeded = getBalancedSeeding(teams);
  const rounds: Match[][] = [];

  const round0: Match[] = [];
  for (let i = 0; i < bracketSize / 2; i++) {
    const t1 = seeded[i * 2] || null;
    const t2 = seeded[i * 2 + 1] || null;
    const isT1Bye = t1?.id === 'BYE';
    const isT2Bye = t2?.id === 'BYE';
    const winnerId = isT1Bye && t2 && !isT2Bye ? t2.id : isT2Bye && t1 && !isT1Bye ? t1.id : null;

    round0.push({
      id: `r0-m${i}`,
      team1: t1,
      team2: t2,
      score1: 0,
      score2: 0,
      winnerId
    });
  }
  rounds.push(round0);

  let matchesInRound = bracketSize / 4;
  let rIdx = 1;
  while (matchesInRound >= 1) {
    const rMatches: Match[] = [];
    for (let m = 0; m < matchesInRound; m++) {
      rMatches.push({
        id: `r${rIdx}-m${m}`,
        team1: null,
        team2: null,
        score1: 0,
        score2: 0,
        winnerId: null
      });
    }
    rounds.push(rMatches);
    matchesInRound /= 2;
    rIdx++;
  }

  // Advance byes
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < rounds.length - 1; r++) {
      for (let m = 0; m < rounds[r].length; m++) {
        const match = rounds[r][m];
        if (match.winnerId) {
          const winner = match.team1?.id === match.winnerId ? match.team1 : match.team2?.id === match.winnerId ? match.team2 : null;
          if (winner) {
            const nextRound = rounds[r + 1];
            const targetM = Math.floor(m / 2);
            const isTop = m % 2 === 0;
            if (nextRound && nextRound[targetM]) {
              const tgt = nextRound[targetM];
              if (isTop && tgt.team1?.id !== winner.id) {
                tgt.team1 = winner;
                changed = true;
              } else if (!isTop && tgt.team2?.id !== winner.id) {
                tgt.team2 = winner;
                changed = true;
              }
            }
          }
        }
      }
    }
  }

  return rounds;
}

export function generateDoubleElimination(teams: Team[]): {
  winnersBracket: Match[][];
  losersBracket: Match[][];
  grandFinal: Match[];
} {
  const count = teams.length;
  const w: Match[][] = [];
  const l: Match[][] = [];
  const gf: Match[] = [];
  if (count === 0) return { winnersBracket: w, losersBracket: l, grandFinal: gf };

  let bracketSize = 1;
  while (bracketSize < count) bracketSize *= 2;

  const seeded = getBalancedSeeding(teams);
  const w0: Match[] = [];
  for (let i = 0; i < bracketSize / 2; i++) {
    w0.push({
      id: `w0-m${i}`,
      team1: seeded[i * 2] || null,
      team2: seeded[i * 2 + 1] || null,
      score1: 0,
      score2: 0,
      winnerId: null
    });
  }
  w.push(w0);

  let mCount = bracketSize / 4;
  let rNum = 1;
  while (mCount >= 1) {
    const rMatches: Match[] = [];
    for (let j = 0; j < mCount; j++) {
      rMatches.push({
        id: `w${rNum}-m${j}`,
        team1: null,
        team2: null,
        score1: 0,
        score2: 0,
        winnerId: null
      });
    }
    w.push(rMatches);
    mCount /= 2;
    rNum++;
  }

  const numWRounds = w.length;
  if (numWRounds > 1) {
    const numLRounds = 2 * (numWRounds - 1);
    const lSizes: number[] = [];
    for (let i = 0; i < numLRounds; i++) {
      if (i === 0) lSizes.push(w[0].length / 2);
      else if (i % 2 === 0) lSizes.push(lSizes[i - 1] / 2);
      else lSizes.push(lSizes[i - 1]);
    }

    for (let i = 0; i < numLRounds; i++) {
      const lRound: Match[] = [];
      for (let j = 0; j < lSizes[i]; j++) {
        lRound.push({
          id: `l${i}-m${j}`,
          team1: null,
          team2: null,
          score1: 0,
          score2: 0,
          winnerId: null
        });
      }
      l.push(lRound);
    }

    gf.push({ id: 'gf-1', team1: null, team2: null, score1: 0, score2: 0, winnerId: null });
    gf.push({ id: 'gf-2', team1: null, team2: null, score1: 0, score2: 0, winnerId: null });
  }

  return cascadeAdvancements(w, l, gf);
}

export function advanceDoubleElimMatch(
  w: Match[][],
  l: Match[][],
  gf: Match[],
  bracketType: string,
  rIdx: number,
  mIdx: number,
  winner: any,
  loser: any
): void {
  if (bracketType === 'w') {
    if (rIdx < w.length - 1) {
      const nextMIdx = Math.floor(mIdx / 2);
      if (mIdx % 2 === 0) w[rIdx + 1][nextMIdx].team1 = winner;
      else w[rIdx + 1][nextMIdx].team2 = winner;
    } else if (gf.length > 0) {
      gf[0].team1 = winner;
    }

    if (l.length > 0) {
      if (rIdx === 0) {
        const nextMIdx = Math.floor(mIdx / 2);
        if (mIdx % 2 === 0) l[0][nextMIdx].team1 = loser;
        else l[0][nextMIdx].team2 = loser;
      } else if (rIdx < w.length - 1) {
        const targetLRound = rIdx * 2 - 1;
        const targetMIdx = w[rIdx].length - 1 - mIdx;
        if (l[targetLRound] && l[targetLRound][targetMIdx]) {
          l[targetLRound][targetMIdx].team2 = loser;
        }
      } else if (l.length > 0) {
        l[l.length - 1][0].team2 = loser;
      }
    }
  } else if (bracketType === 'l') {
    if (rIdx < l.length - 1) {
      if (rIdx % 2 === 0) {
        l[rIdx + 1][mIdx].team1 = winner;
      } else {
        const nextMIdx = Math.floor(mIdx / 2);
        if (mIdx % 2 === 0) l[rIdx + 1][nextMIdx].team1 = winner;
        else l[rIdx + 1][nextMIdx].team2 = winner;
      }
    } else if (gf.length > 0) {
      gf[0].team2 = winner;
    }
  } else if (bracketType === 'gf' && gf.length > 1 && gf[1]) {
    gf[1].winnerId = winner?.id || null;
  }
}

export function cascadeAdvancements(
  w: Match[][],
  l: Match[][],
  gf: Match[]
): { winnersBracket: Match[][]; losersBracket: Match[][]; grandFinal: Match[] } {
  let changed = true;
  while (changed) {
    changed = false;
    const processMatch = (m: Match, bType: string, rIndex: number, mIndex: number): boolean => {
      if (m.winnerId) return false;
      const t1Bye = m.team1?.id === BYE_TEAM.id;
      const t2Bye = m.team2?.id === BYE_TEAM.id;

      if (t1Bye && m.team2 && !t2Bye) {
        m.winnerId = m.team2.id;
        advanceDoubleElimMatch(w, l, gf, bType, rIndex, mIndex, m.team2, BYE_TEAM);
        return true;
      }
      if (t2Bye && m.team1 && !t1Bye) {
        m.winnerId = m.team1.id;
        advanceDoubleElimMatch(w, l, gf, bType, rIndex, mIndex, m.team1, BYE_TEAM);
        return true;
      }
      if (t1Bye && t2Bye) {
        m.winnerId = BYE_TEAM.id;
        advanceDoubleElimMatch(w, l, gf, bType, rIndex, mIndex, BYE_TEAM, BYE_TEAM);
        return true;
      }
      return false;
    };

    for (let i = 0; i < w.length; i++) {
      for (let j = 0; j < w[i].length; j++) {
        if (processMatch(w[i][j], 'w', i, j)) changed = true;
      }
    }
    for (let i = 0; i < l.length; i++) {
      for (let j = 0; j < l[i].length; j++) {
        if (processMatch(l[i][j], 'l', i, j)) changed = true;
      }
    }
  }
  return { winnersBracket: w, losersBracket: l, grandFinal: gf };
}
