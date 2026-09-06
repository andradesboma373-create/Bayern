import { Match, Team } from './types';

export const BYE_TEAM: Team = { id: 'BYE', name: 'BYE' };

export const generateDoubleElimination = (teamsList: Team[]) => {
    let winnersBracket: Match[][] = [];
    let losersBracket: Match[][] = [];
    let grandFinal: Match[] = [];

    const numTeams = teamsList.length;
    if (numTeams === 0) return { winnersBracket, losersBracket, grandFinal };
    
    let nextPowerOfTwo = 1;
    while (nextPowerOfTwo < numTeams) nextPowerOfTwo *= 2;
    let currentRound: Match[] = [];

    const byes = nextPowerOfTwo - numTeams;
    const numRealVsReal = numTeams - nextPowerOfTwo / 2;
    const numRealVsBye = byes;

    for (let i = 0; i < numRealVsReal; i++) {
      const t1 = teamsList[i * 2];
      const t2 = teamsList[i * 2 + 1];
      currentRound.push({ id: `w0-m${i}`, team1: t1, team2: t2, score1: 0, score2: 0, winnerId: null });
    }

    for (let j = 0; j < numRealVsBye; j++) {
      const mIdx = numRealVsReal + j;
      const t1 = teamsList[numRealVsReal * 2 + j];
      currentRound.push({ id: `w0-m${mIdx}`, team1: t1, team2: BYE_TEAM, score1: 0, score2: 0, winnerId: null });
    }

    winnersBracket.push(currentRound);

    let roundSize = nextPowerOfTwo / 4;
    let rIdx = 1;
    while (roundSize >= 1) {
      let nextRound: Match[] = [];
      for (let i = 0; i < roundSize; i++) {
        nextRound.push({ id: `w${rIdx}-m${i}`, team1: null, team2: null, score1: 0, score2: 0, winnerId: null });
      }
      winnersBracket.push(nextRound);
      roundSize /= 2;
      rIdx++;
    }

    const numWinnersRounds = winnersBracket.length;
    
    if (numWinnersRounds > 1) {
        const numLosersRounds = 2 * (numWinnersRounds - 1);
        let losersRoundsSizes: number[] = [];
        
        for (let i = 0; i < numLosersRounds; i++) {
            if (i === 0) {
                losersRoundsSizes.push(winnersBracket[0].length / 2);
            } else if (i % 2 === 0) {
                losersRoundsSizes.push(losersRoundsSizes[i-1] / 2);
            } else {
                losersRoundsSizes.push(losersRoundsSizes[i-1]);
            }
        }
        
        for (let i = 0; i < numLosersRounds; i++) {
            let round: Match[] = [];
            for (let j = 0; j < losersRoundsSizes[i]; j++) {
                round.push({ id: `l${i}-m${j}`, team1: null, team2: null, score1: 0, score2: 0, winnerId: null });
            }
            losersBracket.push(round);
        }
        
        grandFinal.push({ id: 'gf-1', team1: null, team2: null, score1: 0, score2: 0, winnerId: null });
        grandFinal.push({ id: 'gf-2', team1: null, team2: null, score1: 0, score2: 0, winnerId: null });
    }

    // Auto cascade the whole structure to resolve initial BYEs
    return cascadeAdvancements(winnersBracket, losersBracket, grandFinal);
};

export const advanceDoubleElimMatch = (
    wBracket: Match[][], 
    lBracket: Match[][], 
    gf: Match[], 
    type: 'w' | 'l' | 'gf', 
    rIdx: number, 
    mIdx: number,
    winningTeam: Team,
    losingTeam: Team
) => {
    if (type === 'w') {
        // Advance Winner to next W round (or GF)
        if (rIdx < wBracket.length - 1) {
            const nextMatchIdx = Math.floor(mIdx / 2);
            const isTeam1 = mIdx % 2 === 0;
            if (isTeam1) wBracket[rIdx + 1][nextMatchIdx].team1 = winningTeam;
            else wBracket[rIdx + 1][nextMatchIdx].team2 = winningTeam;
        } else {
            // W final winner goes to GF
            if (gf.length > 0) gf[0].team1 = winningTeam;
        }

        // Drop Loser to Losers Bracket
        if (lBracket.length > 0) {
            if (rIdx === 0) {
                const nextMatchIdx = Math.floor(mIdx / 2);
                const isTeam1 = mIdx % 2 === 0;
                if (isTeam1) lBracket[0][nextMatchIdx].team1 = losingTeam;
                else lBracket[0][nextMatchIdx].team2 = losingTeam;
            } else if (rIdx < wBracket.length - 1) {
                // Loser of W2 goes to L2, W3 goes to L4...
                // roundIdx > 0 -> L round index is rIdx * 2 - 1
                const lRoundIdx = rIdx * 2 - 1;
                // Cross the matches to avoid immediate rematches
                const crossMIdx = wBracket[rIdx].length - 1 - mIdx;
                lBracket[lRoundIdx][crossMIdx].team2 = losingTeam;
            } else {
                // Loser of W Final goes to L Final (last round of losers bracket)
                lBracket[lBracket.length - 1][0].team2 = losingTeam;
            }
        }
    } else if (type === 'l') {
        // Advance Winner to next L round (or GF)
        if (rIdx < lBracket.length - 1) {
            if (rIdx % 2 === 0) {
                // Next round is same size, goes to team1
                lBracket[rIdx + 1][mIdx].team1 = winningTeam;
            } else {
                // Next round is half size
                const nextMatchIdx = Math.floor(mIdx / 2);
                const isTeam1 = mIdx % 2 === 0;
                if (isTeam1) lBracket[rIdx + 1][nextMatchIdx].team1 = winningTeam;
                else lBracket[rIdx + 1][nextMatchIdx].team2 = winningTeam;
            }
        } else {
            // L final winner goes to GF
            if (gf.length > 0) gf[0].team2 = winningTeam;
        }
    } else if (type === 'gf') {
        // Grand Final logic: no bracket reset, tournament over after first match.
        if (gf.length > 1 && gf[1]) {
            gf[1].winnerId = winningTeam.id; // Mark as done to prevent playing
        }
    }
};

export const cascadeAdvancements = (
    wBracket: Match[][], 
    lBracket: Match[][], 
    gf: Match[]
) => {
    let changed = true;
    while (changed) {
        changed = false;

        const checkMatch = (match: Match, type: 'w' | 'l' | 'gf', rIdx: number, mIdx: number) => {
            if (match.winnerId) return false;
            
            if (match.team1?.id === BYE_TEAM.id && match.team2 && match.team2.id !== BYE_TEAM.id) {
                match.winnerId = match.team2.id;
                advanceDoubleElimMatch(wBracket, lBracket, gf, type, rIdx, mIdx, match.team2, BYE_TEAM);
                return true;
            }
            if (match.team2?.id === BYE_TEAM.id && match.team1 && match.team1.id !== BYE_TEAM.id) {
                match.winnerId = match.team1.id;
                advanceDoubleElimMatch(wBracket, lBracket, gf, type, rIdx, mIdx, match.team1, BYE_TEAM);
                return true;
            }
            if (match.team1?.id === BYE_TEAM.id && match.team2?.id === BYE_TEAM.id) {
                match.winnerId = BYE_TEAM.id;
                advanceDoubleElimMatch(wBracket, lBracket, gf, type, rIdx, mIdx, BYE_TEAM, BYE_TEAM);
                return true;
            }
            return false;
        };

        for (let r = 0; r < wBracket.length; r++) {
            for (let m = 0; m < wBracket[r].length; m++) {
                if (checkMatch(wBracket[r][m], 'w', r, m)) changed = true;
            }
        }
        for (let r = 0; r < lBracket.length; r++) {
            for (let m = 0; m < lBracket[r].length; m++) {
                if (checkMatch(lBracket[r][m], 'l', r, m)) changed = true;
            }
        }
    }
    
    return { winnersBracket: wBracket, losersBracket: lBracket, grandFinal: gf };
};
