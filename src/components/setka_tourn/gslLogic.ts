import { Team, Match, GslGroup } from './types';

const BYE: Team = { id: 'BYE', name: 'BYE' };

function buildGslBrackets(teams: Team[], groupId: string, advanceCount: number = 3) {
  if (teams.length >= 8) {
    const ub0: Match[] = [];
    for (let i = 0; i < 4; i++) {
      const t1 = teams[i * 2] || BYE;
      const t2 = teams[i * 2 + 1] || BYE;
      ub0.push({
        id: `${groupId}-ub-r0-m${i}`,
        round: 0,
        team1: t1.id === 'BYE' ? null : t1,
        team2: t2.id === 'BYE' ? null : t2,
        score1: 0,
        score2: 0,
        winnerId: null
      });
    }
    const ub1: Match[] = [
      { id: `${groupId}-ub-r1-m0`, round: 1, team1: null, team2: null, score1: 0, score2: 0, winnerId: null },
      { id: `${groupId}-ub-r1-m1`, round: 1, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }
    ];
    const ub2: Match[] = [
      { id: `${groupId}-ub-r2-m0`, round: 2, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }
    ];

    const lb0: Match[] = [
      { id: `${groupId}-lb-r0-m0`, round: 0, team1: null, team2: null, score1: 0, score2: 0, winnerId: null },
      { id: `${groupId}-lb-r0-m1`, round: 0, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }
    ];
    const lb1: Match[] = [
      { id: `${groupId}-lb-r1-m0`, round: 1, team1: null, team2: null, score1: 0, score2: 0, winnerId: null },
      { id: `${groupId}-lb-r1-m1`, round: 1, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }
    ];
    const lb2: Match[] = [
      { id: `${groupId}-lb-r2-m0`, round: 2, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }
    ];

    return { upperBracket: [ub0, ub1, ub2], lowerBracket: [lb0, lb1, lb2] };
  } else {
    const ub0: Match[] = [];
    for (let i = 0; i < 2; i++) {
      const t1 = teams[i * 2] || BYE;
      const t2 = teams[i * 2 + 1] || BYE;
      ub0.push({
        id: `${groupId}-ub-r0-m${i}`,
        round: 0,
        team1: t1.id === 'BYE' ? null : t1,
        team2: t2.id === 'BYE' ? null : t2,
        score1: 0,
        score2: 0,
        winnerId: null
      });
    }
    const ub1: Match[] = [
      { id: `${groupId}-ub-r1-m0`, round: 1, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }
    ];

    if (advanceCount === 2) {
      const lb0: Match[] = [
        { id: `${groupId}-lb-r0-m0`, round: 0, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }
      ];
      const lb1: Match[] = [
        { id: `${groupId}-lb-r1-m0`, round: 1, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }
      ];
      return { upperBracket: [ub0, ub1], lowerBracket: [lb0, lb1] };
    } else {
      const lb0: Match[] = [
        { id: `${groupId}-lb-r0-m0`, round: 0, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }
      ];
      return { upperBracket: [ub0, ub1], lowerBracket: [lb0] };
    }
  }
}

export function generateGslGroups(
  teams: Team[],
  groupCount: number = 2,
  assignments?: Record<string, string[]>,
  advanceCount: number = 3
): GslGroup[] {
  const groups: GslGroup[] = [];
  const gCount = Math.max(1, groupCount);
  const teamMap = new Map(teams.map(t => [t.id, t]));

  for (let i = 0; i < gCount; i++) {
    const name = `Группа ${String.fromCharCode(65 + i)}`;
    const groupId = `gsl-group-${i}`;
    const gTeams: Team[] = [];

    if (assignments && assignments[groupId] && Array.isArray(assignments[groupId])) {
      assignments[groupId].forEach(id => {
        const found = teamMap.get(id);
        if (found) gTeams.push(found);
      });
    } else {
      for (let j = i; j < teams.length; j += gCount) {
        if (teams[j]) gTeams.push(teams[j]);
      }
    }

    const { upperBracket, lowerBracket } = buildGslBrackets(gTeams, groupId, advanceCount);
    groups.push({
      id: groupId,
      name,
      teams: gTeams,
      upperBracket,
      lowerBracket
    });
  }

  return groups;
}

export function updateGslMatch(
  group: GslGroup,
  bracketType: 'upper' | 'lower' | string,
  rIdx: number,
  mIdx: number,
  score1: number,
  score2: number,
  advanceCount: number = 3
): GslGroup {
  const f: GslGroup = JSON.parse(JSON.stringify(group));
  const isEight = f.upperBracket[0].length >= 4;
  const bracket = bracketType === 'upper' ? f.upperBracket : f.lowerBracket;
  const targetMatch = bracket[rIdx]?.[mIdx];

  if (!targetMatch || !targetMatch.team1 || !targetMatch.team2) return group;

  targetMatch.score1 = score1;
  targetMatch.score2 = score2;
  let winner: Team | null = null;
  let loser: Team | null = null;

  if (score1 > score2) {
    targetMatch.winnerId = targetMatch.team1.id;
    winner = targetMatch.team1;
    loser = targetMatch.team2;
  } else if (score2 > score1) {
    targetMatch.winnerId = targetMatch.team2.id;
    winner = targetMatch.team2;
    loser = targetMatch.team1;
  } else {
    targetMatch.winnerId = null;
    return f;
  }

  if (isEight) {
    if (bracketType === 'upper') {
      if (rIdx === 0) {
        const nextM = Math.floor(mIdx / 2);
        if (mIdx % 2 === 0) f.upperBracket[1][nextM].team1 = winner;
        else f.upperBracket[1][nextM].team2 = winner;

        const nextL = Math.floor(mIdx / 2);
        if (mIdx % 2 === 0) f.lowerBracket[0][nextL].team1 = loser;
        else f.lowerBracket[0][nextL].team2 = loser;
      } else if (rIdx === 1) {
        if (mIdx === 0) f.upperBracket[2][0].team1 = winner;
        else f.upperBracket[2][0].team2 = winner;

        if (mIdx === 0) f.lowerBracket[1][1].team2 = loser;
        else f.lowerBracket[1][0].team2 = loser;
      } else if (rIdx === 2 && advanceCount === 2 && f.lowerBracket.length > 2) {
        f.lowerBracket[2][0].team2 = loser;
      }
    } else {
      if (rIdx === 0) {
        if (mIdx === 0) f.lowerBracket[1][0].team1 = winner;
        else f.lowerBracket[1][1].team1 = winner;
      } else if (rIdx === 1) {
        if (mIdx === 0) f.lowerBracket[2][0].team1 = winner;
        else f.lowerBracket[2][0].team2 = winner;
      }
    }
  } else {
    const isTwoAdv = f.lowerBracket.length === 2 || advanceCount === 2;
    if (bracketType === 'upper') {
      if (rIdx === 0) {
        if (mIdx === 0) f.upperBracket[1][0].team1 = winner;
        else f.upperBracket[1][0].team2 = winner;

        if (mIdx === 0) f.lowerBracket[0][0].team1 = loser;
        else f.lowerBracket[0][0].team2 = loser;
      } else if (rIdx === 1 && isTwoAdv && f.lowerBracket[1]) {
        f.lowerBracket[1][0].team2 = loser;
      }
    } else {
      if (rIdx === 0 && isTwoAdv && f.lowerBracket[1]) {
        f.lowerBracket[1][0].team1 = winner;
      }
    }
  }

  return f;
}

export function getGslGroupStandings(group: GslGroup, advanceCount: number = 3) {
  const ub = group.upperBracket;
  const lb = group.lowerBracket;
  const isEight = ub[0]?.length >= 4;

  const ubFinal = ub[ub.length - 1]?.[0];
  const lbFinal = lb[lb.length - 1]?.[0];

  let first: Team | null = null;
  let second: Team | null = null;
  let third: Team | null = null;
  let fourth: Team | null = null;
  const eliminated: Team[] = [];

  if (isEight) {
    if (ubFinal?.winnerId) {
      if (ubFinal.winnerId === ubFinal.team1?.id) {
        first = ubFinal.team1;
        second = ubFinal.team2;
      } else if (ubFinal.winnerId === ubFinal.team2?.id) {
        first = ubFinal.team2;
        second = ubFinal.team1;
      }
    }
    if (lbFinal?.winnerId) {
      if (lbFinal.winnerId === lbFinal.team1?.id) {
        third = lbFinal.team1;
        fourth = lbFinal.team2;
      } else if (lbFinal.winnerId === lbFinal.team2?.id) {
        third = lbFinal.team2;
        fourth = lbFinal.team1;
      }
    }
  } else if ((lb.length === 2 || advanceCount === 2) && lb.length >= 2) {
    if (ubFinal?.winnerId) {
      first = ubFinal.winnerId === ubFinal.team1?.id ? ubFinal.team1 : ubFinal.team2;
    }
    const lbM1 = lb[1]?.[0];
    if (lbM1?.winnerId) {
      second = lbM1.winnerId === lbM1.team1?.id ? lbM1.team1 : lbM1.team2;
      third = lbM1.winnerId === lbM1.team1?.id ? lbM1.team2 : lbM1.team1;
    }
    const lbM0 = lb[0]?.[0];
    if (lbM0?.winnerId) {
      fourth = lbM0.winnerId === lbM0.team1?.id ? lbM0.team2 : lbM0.team1;
    }
  } else {
    if (ubFinal?.winnerId) {
      if (ubFinal.winnerId === ubFinal.team1?.id) {
        first = ubFinal.team1;
        second = ubFinal.team2;
      } else if (ubFinal.winnerId === ubFinal.team2?.id) {
        first = ubFinal.team2;
        second = ubFinal.team1;
      }
    }
    if (lbFinal?.winnerId) {
      if (lbFinal.winnerId === lbFinal.team1?.id) {
        third = lbFinal.team1;
        fourth = lbFinal.team2;
      } else if (lbFinal.winnerId === lbFinal.team2?.id) {
        third = lbFinal.team2;
        fourth = lbFinal.team1;
      }
    }
  }

  lb.forEach((round, rIndex) => {
    if (rIndex < lb.length - 1) {
      round.forEach(m => {
        if (m.winnerId) {
          const loser = m.winnerId === m.team1?.id ? m.team2 : m.team1;
          if (loser && loser.id !== 'BYE' && !eliminated.some(e => e.id === loser.id)) {
            eliminated.push(loser);
          }
        }
      });
    }
  });

  const isGroupFinished =
    advanceCount === 2 ? !!(first && second) : advanceCount === 3 ? !!(first && second && third) : !!(first && second && third && fourth);

  return { first, second, third, fourth, eliminated, isGroupFinished };
}

export function generateTieredPlayoffFromStandings(standings: any[], advanceCount: number = 3): Match[][] {
  const gCount = standings.length;
  if (advanceCount === 2) {
    if (gCount >= 4) {
      const g0 = standings[0] || {};
      const g1 = standings[1] || {};
      const g2 = standings[2] || {};
      const g3 = standings[3] || {};
      return [
        [
          { id: 'tier-qf-m0', round: 1, team1: g0.first || null, team2: g1.second || null, score1: 0, score2: 0, winnerId: null },
          { id: 'tier-qf-m1', round: 1, team1: g2.first || null, team2: g3.second || null, score1: 0, score2: 0, winnerId: null },
          { id: 'tier-qf-m2', round: 1, team1: g1.first || null, team2: g0.second || null, score1: 0, score2: 0, winnerId: null },
          { id: 'tier-qf-m3', round: 1, team1: g3.first || null, team2: g2.second || null, score1: 0, score2: 0, winnerId: null }
        ],
        [
          { id: 'tier-sf-m0', round: 2, team1: null, team2: null, score1: 0, score2: 0, winnerId: null },
          { id: 'tier-sf-m1', round: 2, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }
        ],
        [{ id: 'tier-gf-m0', round: 3, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }]
      ];
    } else {
      const g0 = standings[0] || {};
      const g1 = standings[1] || {};
      return [
        [
          { id: 'tier-sf-m0', round: 1, team1: g0.first || null, team2: g1.second || null, score1: 0, score2: 0, winnerId: null },
          { id: 'tier-sf-m1', round: 1, team1: g1.first || null, team2: g0.second || null, score1: 0, score2: 0, winnerId: null }
        ],
        [{ id: 'tier-gf-m0', round: 2, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }]
      ];
    }
  } else if (advanceCount === 3) {
    if (gCount >= 4) {
      const g0 = standings[0] || {};
      const g1 = standings[1] || {};
      const g2 = standings[2] || {};
      const g3 = standings[3] || {};
      const r1: Match[] = [
        { id: 'tier-r1-m0', round: 1, team1: g0.second || null, team2: g1.third || null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r1-m1', round: 1, team1: g2.second || null, team2: g3.third || null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r1-m2', round: 1, team1: g1.second || null, team2: g0.third || null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r1-m3', round: 1, team1: g3.second || null, team2: g2.third || null, score1: 0, score2: 0, winnerId: null }
      ];
      const r2: Match[] = [
        { id: 'tier-r2-m0', round: 2, team1: g1.first || null, team2: null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r2-m1', round: 2, team1: g3.first || null, team2: null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r2-m2', round: 2, team1: g0.first || null, team2: null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r2-m3', round: 2, team1: g2.first || null, team2: null, score1: 0, score2: 0, winnerId: null }
      ];
      return [
        r1,
        r2,
        [
          { id: 'tier-r3-m0', round: 3, team1: null, team2: null, score1: 0, score2: 0, winnerId: null },
          { id: 'tier-r3-m1', round: 3, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }
        ],
        [{ id: 'tier-r4-m0', round: 4, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }]
      ];
    } else {
      const g0 = standings[0] || {};
      const g1 = standings[1] || {};
      return [
        [
          { id: 'tier-qf-m0', round: 1, team1: g0.second || null, team2: g1.third || null, score1: 0, score2: 0, winnerId: null },
          { id: 'tier-qf-m1', round: 1, team1: g1.second || null, team2: g0.third || null, score1: 0, score2: 0, winnerId: null }
        ],
        [
          { id: 'tier-sf-m0', round: 2, team1: g1.first || null, team2: null, score1: 0, score2: 0, winnerId: null },
          { id: 'tier-sf-m1', round: 2, team1: g0.first || null, team2: null, score1: 0, score2: 0, winnerId: null }
        ],
        [{ id: 'tier-gf-m0', round: 3, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }]
      ];
    }
  } else {
    // 4 advance
    const g0 = standings[0] || {};
    const g1 = standings[1] || {};
    return [
      [
        { id: 'tier-r1-m0', round: 1, team1: g0.third || null, team2: g1.fourth || null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r1-m1', round: 1, team1: g1.third || null, team2: g0.fourth || null, score1: 0, score2: 0, winnerId: null }
      ],
      [
        { id: 'tier-r2-m0', round: 2, team1: g1.second || null, team2: null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r2-m1', round: 2, team1: g0.second || null, team2: null, score1: 0, score2: 0, winnerId: null }
      ],
      [
        { id: 'tier-r3-m0', round: 3, team1: g0.first || null, team2: null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r3-m1', round: 3, team1: g1.first || null, team2: null, score1: 0, score2: 0, winnerId: null }
      ],
      [{ id: 'tier-r4-m0', round: 4, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }]
    ];
  }
}

export function generateTieredPlayoffBracket(groups: GslGroup[], advanceCount: number = 3): Match[][] {
  const standings = groups.map(g => getGslGroupStandings(g, advanceCount));
  return generateTieredPlayoffFromStandings(standings, advanceCount);
}

export function advanceTieredPlayoffMatch(
  bracketRounds: Match[][],
  rIdx: number,
  mIdx: number,
  score1: number,
  score2: number
): Match[][] {
  const copy: Match[][] = JSON.parse(JSON.stringify(bracketRounds));
  const match = copy[rIdx]?.[mIdx];
  if (!match || !match.team1 || !match.team2) return bracketRounds;

  match.score1 = score1;
  match.score2 = score2;
  let winner: Team | null = null;
  if (score1 > score2) {
    match.winnerId = match.team1.id;
    winner = match.team1;
  } else if (score2 > score1) {
    match.winnerId = match.team2.id;
    winner = match.team2;
  } else {
    match.winnerId = null;
    return copy;
  }

  const numRounds = copy.length;
  if (numRounds === 2) {
    if (rIdx === 0) {
      if (mIdx === 0) copy[1][0].team1 = winner;
      else copy[1][0].team2 = winner;
    }
  } else if (numRounds === 3) {
    if (copy[0].length === 4) {
      if (rIdx === 0) {
        const nextM = Math.floor(mIdx / 2);
        if (mIdx % 2 === 0) copy[1][nextM].team1 = winner;
        else copy[1][nextM].team2 = winner;
      } else if (rIdx === 1) {
        if (mIdx === 0) copy[2][0].team1 = winner;
        else copy[2][0].team2 = winner;
      }
    } else {
      if (rIdx === 0) copy[1][mIdx].team2 = winner;
      else if (rIdx === 1) {
        if (mIdx === 0) copy[2][0].team1 = winner;
        else copy[2][0].team2 = winner;
      }
    }
  } else if (numRounds === 4) {
    if (copy[0].length === 4) {
      if (rIdx === 0) copy[1][mIdx].team2 = winner;
      else if (rIdx === 1) {
        const nextM = Math.floor(mIdx / 2);
        if (mIdx % 2 === 0) copy[2][nextM].team1 = winner;
        else copy[2][nextM].team2 = winner;
      } else if (rIdx === 2) {
        if (mIdx === 0) copy[3][0].team1 = winner;
        else copy[3][0].team2 = winner;
      }
    } else {
      if (rIdx === 0) copy[1][mIdx].team2 = winner;
      else if (rIdx === 1) copy[2][mIdx].team2 = winner;
      else if (rIdx === 2) {
        if (mIdx === 0) copy[3][0].team1 = winner;
        else copy[3][0].team2 = winner;
      }
    }
  } else if (numRounds === 5) {
    if (rIdx === 0) copy[1][mIdx].team2 = winner;
    else if (rIdx === 1) copy[2][mIdx].team2 = winner;
    else if (rIdx === 2) {
      const nextM = Math.floor(mIdx / 2);
      if (mIdx % 2 === 0) copy[3][nextM].team1 = winner;
      else copy[3][nextM].team2 = winner;
    } else if (rIdx === 3) {
      if (mIdx === 0) copy[4][0].team1 = winner;
      else copy[4][0].team2 = winner;
    }
  }

  return copy;
}

export function areAllGslGroupsFinished(groups: GslGroup[], advanceCount: number = 3): boolean {
  return groups.every(g => getGslGroupStandings(g, advanceCount).isGroupFinished);
}

