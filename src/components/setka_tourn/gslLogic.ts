import { Match, Team, GslGroup } from './types';

export const BYE_TEAM: Team = { id: 'BYE', name: 'BYE' };

export interface GslStandings {
  first: Team | null;
  second: Team | null;
  third: Team | null;
  fourth: Team | null;
  eliminated: Team[];
  isGroupFinished: boolean;
}

/**
 * Generates GSL / Double Elimination groups (2 or 4 groups)
 * In each group:
 * Upper Bracket Final determines 1st & 2nd place (Loser does NOT drop to Lower Bracket)
 * Lower Bracket Final determines 3rd & 4th place
 */
export function generateGslGroups(teams: Team[], numGroups: number = 2, customAssignments?: Record<string, string[]>): GslGroup[] {
  const groups: GslGroup[] = [];
  const validNumGroups = Math.max(1, numGroups);
  const teamMap = new Map(teams.map(t => [t.id, t]));

  for (let g = 0; g < validNumGroups; g++) {
    const groupName = `Группа ${String.fromCharCode(65 + g)}`;
    const groupId = `gsl-group-${g}`;
    const groupTeams: Team[] = [];

    if (customAssignments && customAssignments[groupId] && Array.isArray(customAssignments[groupId])) {
      // Use custom assigned teams for this group
      customAssignments[groupId].forEach(tId => {
        const teamObj = teamMap.get(tId);
        if (teamObj) groupTeams.push(teamObj);
      });
    } else {
      // Default distribution
      for (let i = g; i < teams.length; i += validNumGroups) {
        if (teams[i]) groupTeams.push(teams[i]);
      }
    }

    const { upperBracket, lowerBracket } = generateGslGroupBrackets(groupTeams, groupId);

    groups.push({
      id: groupId,
      name: groupName,
      teams: groupTeams,
      upperBracket,
      lowerBracket
    });
  }

  return groups;
}

function generateGslGroupBrackets(groupTeams: Team[], groupId: string): { upperBracket: Match[][], lowerBracket: Match[][] } {
  const numTeams = groupTeams.length;

  if (numTeams >= 8) {
    // 8-team GSL structure
    // Upper Bracket: 3 rounds (4 matches -> 2 matches -> 1 match)
    const ubR0: Match[] = [];
    for (let m = 0; m < 4; m++) {
      const t1 = groupTeams[m * 2] || BYE_TEAM;
      const t2 = groupTeams[m * 2 + 1] || BYE_TEAM;
      ubR0.push({
        id: `${groupId}-ub-r0-m${m}`,
        round: 0,
        team1: t1.id === 'BYE' ? null : t1,
        team2: t2.id === 'BYE' ? null : t2,
        score1: 0,
        score2: 0,
        winnerId: null
      });
    }

    const ubR1: Match[] = [
      { id: `${groupId}-ub-r1-m0`, round: 1, team1: null, team2: null, score1: 0, score2: 0, winnerId: null },
      { id: `${groupId}-ub-r1-m1`, round: 1, team1: null, team2: null, score1: 0, score2: 0, winnerId: null },
    ];

    const ubR2: Match[] = [
      { id: `${groupId}-ub-r2-m0`, round: 2, team1: null, team2: null, score1: 0, score2: 0, winnerId: null },
    ];

    // Lower Bracket: 3 rounds (2 matches -> 2 matches -> 1 match)
    const lbR0: Match[] = [
      { id: `${groupId}-lb-r0-m0`, round: 0, team1: null, team2: null, score1: 0, score2: 0, winnerId: null },
      { id: `${groupId}-lb-r0-m1`, round: 0, team1: null, team2: null, score1: 0, score2: 0, winnerId: null },
    ];

    const lbR1: Match[] = [
      { id: `${groupId}-lb-r1-m0`, round: 1, team1: null, team2: null, score1: 0, score2: 0, winnerId: null },
      { id: `${groupId}-lb-r1-m1`, round: 1, team1: null, team2: null, score1: 0, score2: 0, winnerId: null },
    ];

    const lbR2: Match[] = [
      { id: `${groupId}-lb-r2-m0`, round: 2, team1: null, team2: null, score1: 0, score2: 0, winnerId: null },
    ];

    return {
      upperBracket: [ubR0, ubR1, ubR2],
      lowerBracket: [lbR0, lbR1, lbR2]
    };
  } else {
    // 4-team GSL structure
    // Upper Bracket: 2 rounds (2 matches -> 1 match)
    const ubR0: Match[] = [];
    for (let m = 0; m < 2; m++) {
      const t1 = groupTeams[m * 2] || BYE_TEAM;
      const t2 = groupTeams[m * 2 + 1] || BYE_TEAM;
      ubR0.push({
        id: `${groupId}-ub-r0-m${m}`,
        round: 0,
        team1: t1.id === 'BYE' ? null : t1,
        team2: t2.id === 'BYE' ? null : t2,
        score1: 0,
        score2: 0,
        winnerId: null
      });
    }

    const ubR1: Match[] = [
      { id: `${groupId}-ub-r1-m0`, round: 1, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }
    ];

    // Lower Bracket: 2 rounds (1 match -> 1 match)
    const lbR0: Match[] = [
      { id: `${groupId}-lb-r0-m0`, round: 0, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }
    ];

    const lbR1: Match[] = [
      { id: `${groupId}-lb-r1-m0`, round: 1, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }
    ];

    return {
      upperBracket: [ubR0, ubR1],
      lowerBracket: [lbR0, lbR1]
    };
  }
}

/**
 * Updates a match result in GSL Group and advances teams according to GSL rules:
 * - Upper bracket winners advance in upper bracket
 * - Upper bracket losers drop to lower bracket (EXCEPT for the Upper Final!)
 * - Upper Final: Winner = 1st place, Loser = 2nd place (Loser does NOT drop to Lower Bracket)
 * - Lower bracket winners advance in lower bracket
 * - Lower Final: Winner = 3rd place, Loser = 4th place
 */
export function updateGslMatch(
  group: GslGroup,
  bracketType: 'upper' | 'lower',
  rIdx: number,
  mIdx: number,
  score1: number,
  score2: number
): GslGroup {
  const newGroup = JSON.parse(JSON.stringify(group)) as GslGroup;
  const is8Teams = newGroup.upperBracket[0].length >= 4;

  const targetBracket = bracketType === 'upper' ? newGroup.upperBracket : newGroup.lowerBracket;
  const match = targetBracket[rIdx]?.[mIdx];
  if (!match || !match.team1 || !match.team2) return group;

  match.score1 = score1;
  match.score2 = score2;

  let winningTeam: Team | null = null;
  let losingTeam: Team | null = null;

  if (score1 > score2) {
    match.winnerId = match.team1.id;
    winningTeam = match.team1;
    losingTeam = match.team2;
  } else if (score2 > score1) {
    match.winnerId = match.team2.id;
    winningTeam = match.team2;
    losingTeam = match.team1;
  } else {
    match.winnerId = null;
    return newGroup;
  }

  if (is8Teams) {
    // === 8-TEAM LOGIC ===
    if (bracketType === 'upper') {
      if (rIdx === 0) {
        // UB Round 0 (Quarter-finals)
        // Winner -> UB Round 1
        const ubNextMIdx = Math.floor(mIdx / 2);
        const isUbTeam1 = mIdx % 2 === 0;
        if (isUbTeam1) newGroup.upperBracket[1][ubNextMIdx].team1 = winningTeam;
        else newGroup.upperBracket[1][ubNextMIdx].team2 = winningTeam;

        // Loser -> LB Round 0
        const lbMIdx = Math.floor(mIdx / 2);
        const isLbTeam1 = mIdx % 2 === 0;
        if (isLbTeam1) newGroup.lowerBracket[0][lbMIdx].team1 = losingTeam;
        else newGroup.lowerBracket[0][lbMIdx].team2 = losingTeam;
      } else if (rIdx === 1) {
        // UB Round 1 (Semi-finals)
        // Winner -> UB Final (Upper Final)
        if (mIdx === 0) newGroup.upperBracket[2][0].team1 = winningTeam;
        else newGroup.upperBracket[2][0].team2 = winningTeam;

        // Loser -> LB Round 1 (crossed with LB R0 winners)
        if (mIdx === 0) newGroup.lowerBracket[1][1].team2 = losingTeam;
        else newGroup.lowerBracket[1][0].team2 = losingTeam;
      } else if (rIdx === 2) {
        // UB Final (Upper Final for 1st & 2nd place)
        // Winner is 1st place, Loser is 2nd place.
        // DO NOT DROP LOSER TO LOWER BRACKET!
      }
    } else {
      // Lower bracket
      if (rIdx === 0) {
        // LB Round 0 (LB R1)
        // Winner -> LB Round 1 team1
        if (mIdx === 0) newGroup.lowerBracket[1][0].team1 = winningTeam;
        else newGroup.lowerBracket[1][1].team1 = winningTeam;
        // Loser is eliminated
      } else if (rIdx === 1) {
        // LB Round 1 (LB QF)
        // Winner -> LB Round 2 (LB Final)
        if (mIdx === 0) newGroup.lowerBracket[2][0].team1 = winningTeam;
        else newGroup.lowerBracket[2][0].team2 = winningTeam;
        // Loser is eliminated
      } else if (rIdx === 2) {
        // LB Final (Lower Final for 3rd & 4th place)
        // Winner is 3rd place, Loser is 4th place.
      }
    }
  } else {
    // === 4-TEAM LOGIC ===
    if (bracketType === 'upper') {
      if (rIdx === 0) {
        // UB Round 0 (Opening Matches)
        // Winner -> UB Final
        if (mIdx === 0) newGroup.upperBracket[1][0].team1 = winningTeam;
        else newGroup.upperBracket[1][0].team2 = winningTeam;

        // Loser -> LB Round 0 (Elimination Match)
        if (mIdx === 0) newGroup.lowerBracket[0][0].team1 = losingTeam;
        else newGroup.lowerBracket[0][0].team2 = losingTeam;
      } else if (rIdx === 1) {
        // UB Final: Winner = 1st place, Loser = 2nd place (No drop)
      }
    } else {
      if (rIdx === 0) {
        // LB Round 0: Winner is 3rd place / advances to LB Final
        newGroup.lowerBracket[1][0].team1 = winningTeam;
      }
    }
  }

  return newGroup;
}

/**
 * Calculates current standings of a GSL group
 */
export function getGslGroupStandings(group: GslGroup): GslStandings {
  const ub = group.upperBracket;
  const lb = group.lowerBracket;
  const ubFinal = ub[ub.length - 1]?.[0];
  const lbFinal = lb[lb.length - 1]?.[0];

  let first: Team | null = null;
  let second: Team | null = null;
  let third: Team | null = null;
  let fourth: Team | null = null;
  const eliminated: Team[] = [];

  // 1st & 2nd place from Upper Final
  if (ubFinal && ubFinal.winnerId) {
    if (ubFinal.winnerId === ubFinal.team1?.id) {
      first = ubFinal.team1;
      second = ubFinal.team2;
    } else if (ubFinal.winnerId === ubFinal.team2?.id) {
      first = ubFinal.team2;
      second = ubFinal.team1;
    }
  }

  // 3rd & 4th place from Lower Final
  if (lbFinal && lbFinal.winnerId) {
    if (lbFinal.winnerId === lbFinal.team1?.id) {
      third = lbFinal.team1;
      fourth = lbFinal.team2;
    } else if (lbFinal.winnerId === lbFinal.team2?.id) {
      third = lbFinal.team2;
      fourth = lbFinal.team1;
    }
  }

  // Check eliminated teams from lower bracket earlier rounds
  lb.forEach((round, rIdx) => {
    if (rIdx < lb.length - 1) {
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

  const isGroupFinished = !!(first && second && third && fourth);

  return { first, second, third, fourth, eliminated, isGroupFinished };
}

/**
 * Checks if all GSL groups have resolved their advancing places (1st, 2nd, 3rd for Top-3 or 1-4 for Top-4)
 */
export function areAllGslGroupsFinished(groups: GslGroup[], advanceCount: number = 3): boolean {
  if (!groups || groups.length === 0) return false;
  return groups.every(g => {
    const standings = getGslGroupStandings(g);
    if (advanceCount === 3) {
      return !!(standings.first && standings.second && standings.third);
    }
    return !!(standings.first && standings.second && standings.third && standings.fourth);
  });
}

/**
 * Generates the Tiered Single Elimination Bracket:
 * 
 * 1. Top-3 format (advanceCount === 3, IEM / BLAST / StarLadder style):
 *    - 2 Groups (6 teams total):
 *      - Round 1 (Quarter-finals / 1/4): 2 matches (2A vs 3B, 2B vs 3A)
 *      - Round 2 (Semi-finals / 1/2): 2 matches (1B vs QF1 win, 1A vs QF2 win - 1st places wait in Semis!)
 *      - Round 3 (Grand Final): 1 match
 *    - 4 Groups (12 teams total):
 *      - Round 1 (Round of 12 / 1/8): 4 matches (2nd vs 3rd crossed)
 *      - Round 2 (Quarter-finals / 1/4): 4 matches (1st places wait in QF!)
 *      - Round 3 (Semi-finals / 1/2): 2 matches
 *      - Round 4 (Grand Final): 1 match
 * 
 * 2. Top-4 format (advanceCount === 4, ESL Pro League style):
 *    - 2 Groups (8 teams total):
 *      - Round 1: 3rd vs 4th
 *      - Round 2 (Quarter-finals): 2nd places wait here
 *      - Round 3 (Semi-finals): 1st places wait here
 *      - Round 4 (Grand Final): 1 match
 *    - 4 Groups (16 teams total):
 *      - Round 1 (R1): 3rd vs 4th
 *      - Round 2 (R2): 2nd places wait here
 *      - Round 3 (QF): 1st places wait here
 *      - Round 4 (SF): 2 matches
 *      - Round 5 (Grand Final): 1 match
 */
/**
 * Generates the Tiered Playoff Bracket from standings
 */
export function generateTieredPlayoffFromStandings(standings: GslStandings[], advanceCount: number = 3): Match[][] {
  const numGroups = standings.length;

  if (advanceCount === 3) {
    // === TOP-3 ADVANCING FORMAT (IEM / BLAST / StarLadder) ===
    if (numGroups >= 4) {
      // 4 Groups (A, B, C, D) -> 12 teams -> 4 Rounds (1/8 -> 1/4 -> 1/2 -> GF)
      const A = standings[0] || { first: null, second: null, third: null, fourth: null, eliminated: [], isGroupFinished: false };
      const B = standings[1] || { first: null, second: null, third: null, fourth: null, eliminated: [], isGroupFinished: false };
      const C = standings[2] || { first: null, second: null, third: null, fourth: null, eliminated: [], isGroupFinished: false };
      const D = standings[3] || { first: null, second: null, third: null, fourth: null, eliminated: [], isGroupFinished: false };

      // Round 1: Round of 12 (2nd vs 3rd)
      const r1: Match[] = [
        { id: 'tier-r1-m0', round: 1, team1: A.second || null, team2: B.third || null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r1-m1', round: 1, team1: C.second || null, team2: D.third || null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r1-m2', round: 1, team1: B.second || null, team2: A.third || null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r1-m3', round: 1, team1: D.second || null, team2: C.third || null, score1: 0, score2: 0, winnerId: null },
      ];

      // Round 2: Quarter-finals (1st places pre-seeded in team1, winner of R1 in team2)
      const qf: Match[] = [
        { id: 'tier-r2-m0', round: 2, team1: B.first || null, team2: null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r2-m1', round: 2, team1: D.first || null, team2: null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r2-m2', round: 2, team1: A.first || null, team2: null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r2-m3', round: 2, team1: C.first || null, team2: null, score1: 0, score2: 0, winnerId: null },
      ];

      // Round 3: Semi-finals
      const sf: Match[] = [
        { id: 'tier-r3-m0', round: 3, team1: null, team2: null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r3-m1', round: 3, team1: null, team2: null, score1: 0, score2: 0, winnerId: null },
      ];

      // Round 4: Grand Final
      const gf: Match[] = [
        { id: 'tier-r4-m0', round: 4, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }
      ];

      return [r1, qf, sf, gf];
    } else {
      // 2 Groups (A, B) -> 6 teams -> 3 Rounds (Quarter-finals -> Semi-finals -> Grand Final)
      // Match 1 (1/4): 2A vs 3B
      // Match 2 (1/4): 2B vs 3A
      // Match 1 (1/2): 1B vs Winner (2A vs 3B)
      // Match 2 (1/2): 1A vs Winner (2B vs 3A)
      // Grand Final: Winner Semi 1 vs Winner Semi 2
      const A = standings[0] || { first: null, second: null, third: null, fourth: null, eliminated: [], isGroupFinished: false };
      const B = standings[1] || { first: null, second: null, third: null, fourth: null, eliminated: [], isGroupFinished: false };

      // Round 1: Quarter-finals (1/4 финала, 2nd vs 3rd crossed)
      const qf: Match[] = [
        { id: 'tier-qf-m0', round: 1, team1: A.second || null, team2: B.third || null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-qf-m1', round: 1, team1: B.second || null, team2: A.third || null, score1: 0, score2: 0, winnerId: null },
      ];

      // Round 2: Semi-finals (1/2 финала, 1st places wait here!)
      // SF 0: 1st of Group B vs Winner QF 0 (2A vs 3B)
      // SF 1: 1st of Group A vs Winner QF 1 (2B vs 3A)
      const sf: Match[] = [
        { id: 'tier-sf-m0', round: 2, team1: B.first || null, team2: null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-sf-m1', round: 2, team1: A.first || null, team2: null, score1: 0, score2: 0, winnerId: null },
      ];

      // Round 3: Grand Final (Гранд-финал)
      const gf: Match[] = [
        { id: 'tier-gf-m0', round: 3, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }
      ];

      return [qf, sf, gf];
    }
  } else {
    // === TOP-4 ADVANCING FORMAT (ESL Pro League) ===
    if (numGroups >= 4) {
      // 4 Groups (A, B, C, D) -> 5 Rounds total
      const A = standings[0] || { first: null, second: null, third: null, fourth: null, eliminated: [], isGroupFinished: false };
      const B = standings[1] || { first: null, second: null, third: null, fourth: null, eliminated: [], isGroupFinished: false };
      const C = standings[2] || { first: null, second: null, third: null, fourth: null, eliminated: [], isGroupFinished: false };
      const D = standings[3] || { first: null, second: null, third: null, fourth: null, eliminated: [], isGroupFinished: false };

      // Round 1: Playoffs round 1 (3rd vs 4th from crossed groups)
      const r1: Match[] = [
        { id: 'tier-r1-m0', round: 1, team1: A.third || null, team2: B.fourth || null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r1-m1', round: 1, team1: C.third || null, team2: D.fourth || null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r1-m2', round: 1, team1: B.third || null, team2: A.fourth || null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r1-m3', round: 1, team1: D.third || null, team2: C.fourth || null, score1: 0, score2: 0, winnerId: null },
      ];

      // Round 2: Playoffs round 2 (2nd places pre-seeded in team1, winner of R1 in team2)
      const r2: Match[] = [
        { id: 'tier-r2-m0', round: 2, team1: C.second || null, team2: null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r2-m1', round: 2, team1: A.second || null, team2: null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r2-m2', round: 2, team1: D.second || null, team2: null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r2-m3', round: 2, team1: B.second || null, team2: null, score1: 0, score2: 0, winnerId: null },
      ];

      // Round 3: Quarter-finals (1st places pre-seeded in team1, winner of R2 in team2)
      const qf: Match[] = [
        { id: 'tier-r3-m0', round: 3, team1: B.first || null, team2: null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r3-m1', round: 3, team1: D.first || null, team2: null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r3-m2', round: 3, team1: A.first || null, team2: null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r3-m3', round: 3, team1: C.first || null, team2: null, score1: 0, score2: 0, winnerId: null },
      ];

      // Round 4: Semi-finals
      const sf: Match[] = [
        { id: 'tier-r4-m0', round: 4, team1: null, team2: null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r4-m1', round: 4, team1: null, team2: null, score1: 0, score2: 0, winnerId: null },
      ];

      // Round 5: Grand Final
      const gf: Match[] = [
        { id: 'tier-r5-m0', round: 5, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }
      ];

      return [r1, r2, qf, sf, gf];
    } else {
      // 2 Groups (A, B) -> 4 Rounds total
      const A = standings[0] || { first: null, second: null, third: null, fourth: null, eliminated: [], isGroupFinished: false };
      const B = standings[1] || { first: null, second: null, third: null, fourth: null, eliminated: [], isGroupFinished: false };

      // Round 1: Playoffs round 1 (3rd vs 4th)
      const r1: Match[] = [
        { id: 'tier-r1-m0', round: 1, team1: A.third || null, team2: B.fourth || null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r1-m1', round: 1, team1: B.third || null, team2: A.fourth || null, score1: 0, score2: 0, winnerId: null },
      ];

      // Round 2: Quarter-finals (2nd places wait here, facing R1 winners)
      const qf: Match[] = [
        { id: 'tier-r2-m0', round: 2, team1: B.second || null, team2: null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r2-m1', round: 2, team1: A.second || null, team2: null, score1: 0, score2: 0, winnerId: null },
      ];

      // Round 3: Semi-finals (1st places wait here, facing QF winners)
      const sf: Match[] = [
        { id: 'tier-r3-m0', round: 3, team1: A.first || null, team2: null, score1: 0, score2: 0, winnerId: null },
        { id: 'tier-r3-m1', round: 3, team1: B.first || null, team2: null, score1: 0, score2: 0, winnerId: null },
      ];

      // Round 4: Grand Final
      const gf: Match[] = [
        { id: 'tier-r4-m0', round: 4, team1: null, team2: null, score1: 0, score2: 0, winnerId: null }
      ];

      return [r1, qf, sf, gf];
    }
  }
}

export function generateTieredPlayoffBracket(groups: GslGroup[], advanceCount: number = 3): Match[][] {
  const standings = groups.map(g => getGslGroupStandings(g));
  return generateTieredPlayoffFromStandings(standings, advanceCount);
}

/**
 * Advances winner in Tiered Playoff Bracket
 */
export function advanceTieredPlayoffMatch(
  rounds: Match[][],
  rIdx: number,
  mIdx: number,
  score1: number,
  score2: number
): Match[][] {
  const newRounds = JSON.parse(JSON.stringify(rounds)) as Match[][];
  const match = newRounds[rIdx]?.[mIdx];
  if (!match || !match.team1 || !match.team2) return rounds;

  match.score1 = score1;
  match.score2 = score2;

  let winningTeam: Team | null = null;
  if (score1 > score2) {
    match.winnerId = match.team1.id;
    winningTeam = match.team1;
  } else if (score2 > score1) {
    match.winnerId = match.team2.id;
    winningTeam = match.team2;
  } else {
    match.winnerId = null;
    return newRounds;
  }

  const numRounds = newRounds.length;

  if (numRounds === 3) {
    // 2 groups TOP-3 format (QF [2 matches] -> SF [2 matches] -> GF [1 match]):
    // r0 (QF: 2 matches) -> r1 (SF: 2 matches, QF0 -> SF0.team2, QF1 -> SF1.team2)
    // r1 (SF: 2 matches) -> r2 (GF: 1 match, SF0 -> GF0.team1, SF1 -> GF0.team2)
    if (rIdx === 0) {
      newRounds[1][mIdx].team2 = winningTeam;
    } else if (rIdx === 1) {
      if (mIdx === 0) newRounds[2][0].team1 = winningTeam;
      else newRounds[2][0].team2 = winningTeam;
    }
  } else if (numRounds === 4) {
    // Check if it's 4 groups TOP-3 (R12: 4 -> QF: 4 -> SF: 2 -> GF: 1) or 2 groups TOP-4 (R1: 2 -> QF: 2 -> SF: 2 -> GF: 1)
    const is4GroupsTop3 = newRounds[0].length === 4;

    if (is4GroupsTop3) {
      // 4 groups TOP-3:
      // r0 (R12: 4 matches) -> r1 (QF: 4 matches, team2)
      // r1 (QF: 4 matches) -> r2 (SF: 2 matches, 0/1 -> SF0, 2/3 -> SF1)
      // r2 (SF: 2 matches) -> r3 (GF: 1 match)
      if (rIdx === 0) {
        newRounds[1][mIdx].team2 = winningTeam;
      } else if (rIdx === 1) {
        const sfIdx = Math.floor(mIdx / 2);
        const isTeam1 = mIdx % 2 === 0;
        if (isTeam1) newRounds[2][sfIdx].team1 = winningTeam;
        else newRounds[2][sfIdx].team2 = winningTeam;
      } else if (rIdx === 2) {
        if (mIdx === 0) newRounds[3][0].team1 = winningTeam;
        else newRounds[3][0].team2 = winningTeam;
      }
    } else {
      // 2 groups TOP-4:
      // r0 (R1: 2 matches) -> r1 (QF: 2 matches, team2)
      // r1 (QF: 2 matches) -> r2 (SF: 2 matches, team2)
      // r2 (SF: 2 matches) -> r3 (GF: 1 match)
      if (rIdx === 0) {
        newRounds[1][mIdx].team2 = winningTeam;
      } else if (rIdx === 1) {
        newRounds[2][mIdx].team2 = winningTeam;
      } else if (rIdx === 2) {
        if (mIdx === 0) newRounds[3][0].team1 = winningTeam;
        else newRounds[3][0].team2 = winningTeam;
      }
    }
  } else if (numRounds === 5) {
    // 4 groups TOP-4 tiered bracket:
    // r0 (R1: 4 matches) -> r1 (R2: 4 matches, team2)
    // r1 (R2: 4 matches) -> r2 (QF: 4 matches, team2)
    // r2 (QF: 4 matches) -> r3 (SF: 2 matches, m0->sf0.t1, m1->sf0.t2, m2->sf1.t1, m3->sf1.t2)
    // r3 (SF: 2 matches) -> r4 (GF: 1 match, m0->gf.t1, m1->gf.t2)
    if (rIdx === 0) {
      newRounds[1][mIdx].team2 = winningTeam;
    } else if (rIdx === 1) {
      newRounds[2][mIdx].team2 = winningTeam;
    } else if (rIdx === 2) {
      const sfIdx = Math.floor(mIdx / 2);
      const isTeam1 = mIdx % 2 === 0;
      if (isTeam1) newRounds[3][sfIdx].team1 = winningTeam;
      else newRounds[3][sfIdx].team2 = winningTeam;
    } else if (rIdx === 3) {
      if (mIdx === 0) newRounds[4][0].team1 = winningTeam;
      else newRounds[4][0].team2 = winningTeam;
    }
  }

  return newRounds;
}
