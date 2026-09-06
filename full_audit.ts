import { MatchEngine } from './src/match-logic/engine/MatchEngine.ts';
import { CombatSystem } from './src/match-logic/systems/CombatSystem.ts';

function createTeam(prefix: string, rating: number = 100) {
  return [
    { id: `${prefix}_Sniper`, nickname: `${prefix}_Sniper`, role: 'sniper', rating: rating },
    { id: `${prefix}_IGL`, nickname: `${prefix}_IGL`, role: 'igl', rating: rating },
    { id: `${prefix}_Rifler`, nickname: `${prefix}_Rifler`, role: 'rifler', rating: rating },
    { id: `${prefix}_Support`, nickname: `${prefix}_Support`, role: 'support', rating: rating },
    { id: `${prefix}_Entry`, nickname: `${prefix}_Entry`, role: 'entry', rating: rating },
  ];
}

function finalizeStats(stats: any[]) {
    stats.forEach(s => {
        if (!s.totalRounds || s.totalRounds === 0) s.totalRounds = 1;
        s.kd = (s.kills / (s.deaths || 1)).toFixed(2);
        s.adr = (s.damage / s.totalRounds).toFixed(1);
        s.kpr = (s.kills / s.totalRounds).toFixed(2);
        s.dpr = (s.deaths / s.totalRounds).toFixed(2);
        const killRating = (s.kills / s.totalRounds) / 0.677;
        const survivalRating = ((s.totalRounds - s.deaths) / s.totalRounds) / 0.31;
        const rmKills = (s.k1 || 0) + (s.k2 || 0)*2 + (s.k3 || 0)*3 + (s.k4 || 0)*4 + (s.k5 || 0)*5;
        const multikillRating = (rmKills / s.totalRounds) / 1.27;
        const impact = 2.13 * (s.kills / s.totalRounds) + 0.42 * ((s.assists || 0) / s.totalRounds) - 0.41;
        s.hltvRating = ((killRating + survivalRating + multikillRating + impact + 1) / 5).toFixed(2);
    });
}

function calculateMVP(t1Stats: any[], t2Stats: any[]) {
    const all = [...t1Stats, ...t2Stats];
    let mvp = null, best = -1;
    for(const p of all) {
        const score = (parseFloat(p.kd) * 0.4) + (p.kills * 0.3) + (parseFloat(p.hltvRating) * 0.3);
        if(score > best) { best = score; mvp = p; }
    }
    return mvp;
}

let currentSeed = 1000;
CombatSystem.random = function() {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
};

// Data structures
let baseStats = {
    matches: 0,
    aWins: 0, bWins: 0,
    tWins: 0, ctWins: 0,
    rounds: 0,
    kills: 0, deaths: 0, damage: 0,
    scores: {} as Record<string, number>,
    diff7: 0, diff5: 0, diff3: 0,
    loserWon3: 0,
    snowballCases: { '0:3': 0, '1:5': 0, '2:6': 0, '3:8': 0, '4:9': 0 } as Record<string, number>,
    snowballComebacks: { '0:3': 0, '1:5': 0, '2:6': 0, '3:8': 0, '4:9': 0 } as Record<string, number>,
    otMatches: 0, otRounds: 0, otMax: 0, otKills: 0, otDeaths: 0, otDamage: 0
};
for (let i = 0; i <= 12; i++) baseStats.scores[`13:${i}`] = 0;
baseStats.scores['OT'] = 0;

let roleStats: Record<string, any> = {
    sniper: { count: 0, mvps: 0, kills: 0, damage: 0, deaths: 0, rating: 0, firstKills: 0 },
    rifler: { count: 0, mvps: 0, kills: 0, damage: 0, deaths: 0, rating: 0, firstKills: 0 },
    entry: { count: 0, mvps: 0, kills: 0, damage: 0, deaths: 0, rating: 0, firstKills: 0 },
    support: { count: 0, mvps: 0, kills: 0, damage: 0, deaths: 0, rating: 0, firstKills: 0 },
    igl: { count: 0, mvps: 0, kills: 0, damage: 0, deaths: 0, rating: 0, firstKills: 0 }
};

let invariantFails = 0;

// 1. BASE TEST
console.log("Running BASE TEST (2000 matches)...");
for (let i = 0; i < 2000; i++) {
    currentSeed = 100000 + i;
    const state = MatchEngine.createInitialState(createTeam('A'), createTeam('B'), true, 'mirage', 'MR12', currentSeed);
    const res = MatchEngine.simulateEntireMatch(state);
    
    baseStats.matches++;
    if (res.winner === 1) baseStats.aWins++; else baseStats.bWins++;
    
    const rounds = res.team1Score + res.team2Score;
    baseStats.rounds += rounds;
    
    let aKills = 0, aDeaths = 0, bKills = 0, bDeaths = 0;
    
    res.team1Stats.forEach((s: any) => s.totalRounds = rounds);
    res.team2Stats.forEach((s: any) => s.totalRounds = rounds);
    finalizeStats(res.team1Stats);
    finalizeStats(res.team2Stats);
    
    const allStats = [...res.team1Stats, ...res.team2Stats];
    allStats.forEach(s => {
        baseStats.kills += s.kills;
        baseStats.deaths += s.deaths;
        baseStats.damage += s.damage;
        if (s.id.startsWith('A')) { aKills += s.kills; aDeaths += s.deaths; }
        else { bKills += s.kills; bDeaths += s.deaths; }
        
        let role = s.id.split('_')[1].toLowerCase();
        let rs = roleStats[role];
        rs.count++;
        rs.kills += s.kills;
        rs.deaths += s.deaths;
        rs.damage += s.damage;
        rs.rating += (s.rating || 0);
        // Approximation of opening kills by taking k1 stats or if we track round first kills.
        // Actually, let's just log what we have. I will approximate opening kills with k1 for now.
        rs.firstKills += (s.k1 || 0); 
    });
    
    if (aKills !== bDeaths || bKills !== aDeaths) invariantFails++;
    
    const mvp = calculateMVP(res.team1Stats, res.team2Stats);
    if (mvp) {
        let role = mvp.id.split('_')[1].toLowerCase();
        roleStats[role].mvps++;
    }
    
    let wScore = Math.max(res.team1Score, res.team2Score);
    let lScore = Math.min(res.team1Score, res.team2Score);
    let diff = wScore - lScore;
    
    if (wScore > 13) {
        baseStats.scores['OT']++;
        baseStats.otMatches++;
        baseStats.otRounds += rounds;
        if (rounds > baseStats.otMax) baseStats.otMax = rounds;
        allStats.forEach(s => {
            baseStats.otKills += s.kills;
            baseStats.otDeaths += s.deaths;
            baseStats.otDamage += s.damage;
        });
    } else {
        baseStats.scores[`13:${lScore}`]++;
    }
    
    if (diff >= 7) baseStats.diff7++;
    if (diff >= 5) baseStats.diff5++;
    if (diff >= 3) baseStats.diff3++;
    if (lScore >= 3) baseStats.loserWon3++;
    
    let r1 = 0, r2 = 0;
    let checkedComebacks = new Set();
    const roundEnds = state.events.filter((e:any) => e.type === 'ROUND_ENDED');
    roundEnds.forEach((e:any, idx: number) => {
        let t1Side = 'T';
        if (idx >= 12 && idx < 24) t1Side = 'CT';
        if (idx >= 24) {
            const otIdx = idx - 24;
            t1Side = Math.floor((otIdx % 6) / 3) === 0 ? 'CT' : 'T';
        }
        if (e.data.winnerId === 't1') {
            r1++;
            if (t1Side === 'T') baseStats.tWins++; else baseStats.ctWins++;
        } else {
            r2++;
            if (t1Side === 'T') baseStats.ctWins++; else baseStats.tWins++;
        }
        
        const check = (wR: number, lR: number, target: string, tWinner: number) => {
            if (wR === parseInt(target.split(':')[1]) && lR === parseInt(target.split(':')[0])) {
                let key = target + "_" + tWinner;
                if (!checkedComebacks.has(key)) {
                    baseStats.snowballCases[target]++;
                    if (res.winner === tWinner) baseStats.snowballComebacks[target]++;
                    checkedComebacks.add(key);
                }
            }
        };
        ['0:3', '1:5', '2:6', '3:8', '4:9'].forEach(target => {
            check(r2, r1, target, 1); // t1 down
            check(r1, r2, target, 2); // t2 down
        });
    });
}

function printBaseStats() {
    console.log("=== 1. BASE TEST ===");
    console.log(`Team A Win%: ${(baseStats.aWins / 2000 * 100).toFixed(1)}%`);
    console.log(`Team B Win%: ${(baseStats.bWins / 2000 * 100).toFixed(1)}%`);
    console.log(`T-side round win%: ${(baseStats.tWins / (baseStats.tWins + baseStats.ctWins) * 100).toFixed(1)}%`);
    console.log(`CT-side round win%: ${(baseStats.ctWins / (baseStats.tWins + baseStats.ctWins) * 100).toFixed(1)}%`);
    console.log(`Avg Rounds: ${(baseStats.rounds / 2000).toFixed(2)}`);
    console.log(`Avg Kills/Player: ${(baseStats.kills / 20000).toFixed(2)}`);
    console.log(`Avg Deaths/Player: ${(baseStats.deaths / 20000).toFixed(2)}`);
    console.log(`Avg ADR: ${(baseStats.damage / (baseStats.rounds * 10)).toFixed(1)}`);
    
    console.log("\n=== 2. BLOWOUT / SNOWBALL ===");
    for (let i = 0; i <= 12; i++) {
        let count = baseStats.scores[`13:${i}`];
        console.log(`13-${i}: ${count} (${(count / 2000 * 100).toFixed(1)}%)`);
    }
    console.log(`OT: ${baseStats.scores['OT']} (${(baseStats.scores['OT'] / 2000 * 100).toFixed(1)}%)`);
    
    console.log(`Diff 7+ rounds: ${baseStats.diff7} (${(baseStats.diff7 / 2000 * 100).toFixed(1)}%)`);
    console.log(`Diff 5+ rounds: ${baseStats.diff5} (${(baseStats.diff5 / 2000 * 100).toFixed(1)}%)`);
    console.log(`Diff 3+ rounds: ${baseStats.diff3} (${(baseStats.diff3 / 2000 * 100).toFixed(1)}%)`);
    let blowout13_012 = baseStats.scores['13:0'] + baseStats.scores['13:1'] + baseStats.scores['13:2'];
    console.log(`13-0 / 13-1 / 13-2: ${blowout13_012} (${(blowout13_012 / 2000 * 100).toFixed(1)}%)`);
    console.log(`Loser won >= 3 rounds: ${baseStats.loserWon3} (${(baseStats.loserWon3 / 2000 * 100).toFixed(1)}%)`);
    
    console.log("Comebacks:");
    Object.keys(baseStats.snowballCases).forEach(k => {
        let cases = baseStats.snowballCases[k];
        let wins = baseStats.snowballComebacks[k];
        console.log(`From ${k} down: ${cases > 0 ? (wins/cases*100).toFixed(1) : 0}% (${wins}/${cases} cases)`);
    });
}

function printMVPStats() {
    console.log("\n=== 3. MVP DISTRIBUTION & 4. SNIPER AUDIT ===");
    for (const role in roleStats) {
        let r = roleStats[role];
        console.log(`[${role.toUpperCase()}]`);
        console.log(`MVP Count: ${r.mvps} (${(r.mvps / 2000 * 100).toFixed(1)}%)`);
        console.log(`Avg Kills: ${(r.kills / r.count).toFixed(2)}`);
        console.log(`Avg Deaths: ${(r.deaths / r.count).toFixed(2)}`);
        console.log(`Avg ADR: ${(r.damage / (baseStats.rounds * 2)).toFixed(1)}`);
        console.log(`Avg Damage/Match: ${(r.damage / r.count).toFixed(1)}`);
        console.log(`Avg Rating: ${(r.rating / r.count).toFixed(2)}`);
        console.log(`Avg Opening (k1): ${(r.firstKills / r.count).toFixed(2)}`);
    }
}

// 5. RATING TEST
function testRating(rA: number, rB: number) {
    let aW = 0, bW = 0;
    let aRounds = 0, bRounds = 0;
    let bWon1 = 0, bWon3 = 0, bComebacks = 0;
    let aKills = 0, aDeaths = 0, bKills = 0, bDeaths = 0;
    let totalRounds = 0;
    
    for (let i = 0; i < 2000; i++) {
        currentSeed = 200000 + (rA*1000) + (rB*10) + i;
        const state = MatchEngine.createInitialState(createTeam('A', rA), createTeam('B', rB), true, 'mirage', 'MR12', currentSeed);
        const res = MatchEngine.simulateEntireMatch(state);
        
        if (res.winner === 1) aW++; else { bW++; bComebacks++; } // Simplification for outsiders winning
        aRounds += res.team1Score; bRounds += res.team2Score;
        totalRounds += (res.team1Score + res.team2Score);
        
        if (res.team2Score >= 1) bWon1++;
        if (res.team2Score >= 3) bWon3++;
        
        res.team1Stats.forEach((s: any) => { aKills += s.kills; aDeaths += s.deaths; });
        res.team2Stats.forEach((s: any) => { bKills += s.kills; bDeaths += s.deaths; });
    }
    
    console.log(`\n${rA} vs ${rB}`);
    console.log(`Win%: A=${(aW/2000*100).toFixed(1)}%, B=${(bW/2000*100).toFixed(1)}%`);
    console.log(`Round Win%: A=${(aRounds/totalRounds*100).toFixed(1)}%, B=${(bRounds/totalRounds*100).toFixed(1)}%`);
    console.log(`Avg Round Diff: ${((aRounds - bRounds)/2000).toFixed(1)}`);
    console.log(`Outsider won >=1 round: ${(bWon1/2000*100).toFixed(1)}%`);
    console.log(`Outsider won >=3 rounds: ${(bWon3/2000*100).toFixed(1)}%`);
    console.log(`Outsider won match (comeback): ${(bComebacks/2000*100).toFixed(1)}%`);
    console.log(`Fav Avg K/D: ${(aKills/Math.max(1, aDeaths)).toFixed(2)}`);
    console.log(`Out Avg K/D: ${(bKills/Math.max(1, bDeaths)).toFixed(2)}`);
}

function runRatings() {
    console.log("\n=== 5. RATING TEST ===");
    testRating(160, 150);
    testRating(160, 140);
    testRating(160, 130);
    testRating(150, 140);
    testRating(150, 130);
}

// 7. ECONOMY
function economyAudit() {
    console.log("\n=== 7. ECONOMY / PISTOL -> ECO -> BUY ===");
    
    currentSeed = 300000;
    const state = MatchEngine.createInitialState(createTeam('A'), createTeam('B'), true, 'mirage', 'MR12', currentSeed);
    MatchEngine.simulateEntireMatch(state);
    
    let logs = state.roundLogs.slice(0, 3); // first 3 rounds
    console.log("First 3 rounds analysis:");
    logs.forEach(l => {
        console.log(`R${l.round} Winner: ${l.winnerTeamId}. Reason: ${l.reason}. T1 Tactic: ${l.t1EcoType}, T2 Tactic: ${l.t2EcoType}`);
    });
    
    // Half time money check
    let t1MoneyR12 = -1, t1MoneyR13 = -1;
    // We can't easily extract player money at half time directly without hooks, 
    // but we know from code that money is not reset. I'll just state it in the final report.
    console.log("Note: Code inspection reveals money is NOT reset at round 13 (halftime). Loss bonus is capped at $3400.");
}

// 9. SWAP TEST
function runSwapTest() {
    console.log("\n=== 9. SWAP TEST - SYMMETRY ===");
    let symAw = 0, symBw = 0, swapBw = 0, swapAw = 0;
    let perfectMatches = 0;
    for (let i = 0; i < 100; i++) {
        const seed = 400000 + i;
        CombatSystem.random = function() {
            let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
        }();
        const state1 = MatchEngine.createInitialState(createTeam('A'), createTeam('B'), true, 'mirage', 'MR12', seed);
        const res1 = MatchEngine.simulateEntireMatch(state1);
        if (res1.winner === 1) symAw++; else symBw++;
        
        CombatSystem.random = function() {
            let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
        }();
        const state2 = MatchEngine.createInitialState(createTeam('B'), createTeam('A'), true, 'mirage', 'MR12', seed);
        const res2 = MatchEngine.simulateEntireMatch(state2);
        if (res2.winner === 1) swapBw++; else swapAw++;
        
        if (res1.team1Score === res2.team2Score && res1.team2Score === res2.team1Score) {
            perfectMatches++;
        }
    }
    console.log(`Orig: A wins ${symAw}, B wins ${symBw}`);
    console.log(`Swap: A wins ${swapAw}, B wins ${swapBw}`);
    console.log(`Perfect symmetric scores: ${perfectMatches}/100`);
}

printBaseStats();
printMVPStats();
runRatings();
economyAudit();

console.log("\n=== 8. OVERALL MATCH SCORE / OT ===");
console.log(`% to OT: ${(baseStats.otMatches / 2000 * 100).toFixed(1)}%`);
console.log(`Avg OT Length: ${(baseStats.otRounds / Math.max(1, baseStats.otMatches)).toFixed(1)} rounds`);
console.log(`Max Rounds in Match: ${baseStats.otMax}`);

runSwapTest();

console.log("\n=== 10. INVARIANTS ===");
console.log(`Invariant Failures (Kills != Deaths across teams): ${invariantFails}`);

