import { MatchEngine } from './src/match-logic/engine/MatchEngine.ts';
import { CombatSystem } from './src/match-logic/systems/CombatSystem.ts';
import { RoundEngine } from './src/match-logic/engine/RoundEngine.ts';

// Polyfill to capture stats
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

console.log("Starting Audit...");
const NUM_MATCHES = 2000;

let t1Wins = 0, t2Wins = 0;
let tWins = 0, ctWins = 0;
let totalRounds = 0;
let totalKills = 0, totalDeaths = 0, totalDamage = 0;

let mvpCounts = { sniper: 0, rifler: 0, entry: 0, support: 0, igl: 0 };
let kdList: number[] = [];
let invariantFails: string[] = [];
let otMatches = 0;
let otRounds = 0;

// Set fixed seed logic for reproducibility in swap tests
let currentSeed = 1;
CombatSystem.random = function() {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
};

for(let i=0; i<NUM_MATCHES; i++) {
    currentSeed = 10000 + i; 
    const state = MatchEngine.createInitialState(createTeam('A'), createTeam('B'), true, 'mirage', 'MR12', currentSeed);
    const res = MatchEngine.simulateEntireMatch(state);
    
    if (res.winner === 1) t1Wins++; else t2Wins++;
    const rounds = res.team1Score + res.team2Score;
    totalRounds += rounds;
    
    if (rounds > 24) {
        otMatches++;
        otRounds += (rounds - 24);
    }

    const roundEnds = state.events.filter((e:any) => e.type === 'ROUND_ENDED');
    roundEnds.forEach((e:any, idx:number) => {
        let t1Side = 'T';
        if (idx >= 12 && idx < 24) t1Side = 'CT';
        if (idx >= 24) {
            const otIdx = idx - 24;
            const otHalf = Math.floor((otIdx % 6) / 3);
            if (otHalf === 0) t1Side = 'CT';
            else t1Side = 'T';
        }

        if (e.data.winnerId === 't1') {
            if (t1Side === 'T') tWins++; else ctWins++;
        } else {
            if (t1Side === 'T') ctWins++; else tWins++;
        }
    });

    res.team1Stats.forEach((s:any) => s.totalRounds = rounds);
    res.team2Stats.forEach((s:any) => s.totalRounds = rounds);
    finalizeStats(res.team1Stats);
    finalizeStats(res.team2Stats);

    const matchMvp = calculateMVP(res.team1Stats, res.team2Stats);
    if(matchMvp) {
        let role = matchMvp.id.split('_')[1].toLowerCase();
        mvpCounts[role as keyof typeof mvpCounts]++;
    }

    let matchA_kills = 0, matchA_deaths = 0, matchB_kills = 0, matchB_deaths = 0;

    [...res.team1Stats, ...res.team2Stats].forEach((s:any) => {
        totalKills += s.kills;
        totalDeaths += s.deaths;
        totalDamage += s.damage;
        kdList.push(s.kills / (s.deaths || 1));

        if (s.id.startsWith('A')) { matchA_kills += s.kills; matchA_deaths += s.deaths; }
        else { matchB_kills += s.kills; matchB_deaths += s.deaths; }
    });

    // Invariants Check
    if (matchA_kills !== matchB_deaths) invariantFails.push(`Match ${i}: A_kills(${matchA_kills}) != B_deaths(${matchB_deaths})`);
    if (matchB_kills !== matchA_deaths) invariantFails.push(`Match ${i}: B_kills(${matchB_kills}) != A_deaths(${matchA_deaths})`);
    if (res.team1Score + res.team2Score !== rounds) invariantFails.push(`Match ${i}: Score sum(${res.team1Score + res.team2Score}) != Rounds(${rounds})`);

    let deadPlayers = new Set();
    state.events.forEach((e:any) => {
        if(e.type === 'ROUND_STARTED') deadPlayers.clear();
        if(e.type === 'PLAYER_KILLED') deadPlayers.add(e.data.victimId);
        if(e.type === 'PLAYER_SHOOT' || e.type === 'DAMAGE') {
            const actorId = e.type === 'PLAYER_SHOOT' ? e.data.shooterId : e.data.shooterId;
            if(deadPlayers.has(actorId)) {
                invariantFails.push(`Match ${i}, Tick ${e.tick}: Dead player ${actorId} acted!`);
            }
        }
    });
}

kdList.sort((a,b) => a-b);
const median = kdList[Math.floor(kdList.length/2)];
const p90 = kdList[Math.floor(kdList.length * 0.9)];
const p95 = kdList[Math.floor(kdList.length * 0.95)];
const maxKd = kdList[kdList.length - 1];

// Rating Tests
function runRatingTest(rA: number, rB: number) {
    let t1w=0, t2w=0, kdSumA=0, kdSumB=0, adrSumA=0, mvpA=0;
    for(let i=0; i<500; i++) {
        currentSeed = 20000 + i;
        const state = MatchEngine.createInitialState(createTeam('A', rA), createTeam('B', rB), true, 'mirage', 'MR12', currentSeed);
        const res = MatchEngine.simulateEntireMatch(state);
        if (res.winner === 1) t1w++; else t2w++;
        const rounds = res.team1Score + res.team2Score;
        res.team1Stats.forEach((s:any) => s.totalRounds = rounds);
        res.team2Stats.forEach((s:any) => s.totalRounds = rounds);
        finalizeStats(res.team1Stats); finalizeStats(res.team2Stats);
        const matchMvp = calculateMVP(res.team1Stats, res.team2Stats);
        if(matchMvp && matchMvp.id.startsWith('A')) mvpA++;
        
        let ka=0, da=0, dmga=0, kb=0, db=0;
        res.team1Stats.forEach((s:any) => { ka+=s.kills; da+=s.deaths; dmga+=s.damage; });
        res.team2Stats.forEach((s:any) => { kb+=s.kills; db+=s.deaths; });
        kdSumA += (ka/Math.max(1,da));
        kdSumB += (kb/Math.max(1,db));
        adrSumA += (dmga/(5*rounds));
    }
    return {
        w: (t1w/500*100).toFixed(1),
        kd: (kdSumA/500).toFixed(2),
        adr: (adrSumA/500).toFixed(1),
        mvp: (mvpA/500*100).toFixed(1)
    };
}

const r160_140 = runRatingTest(160, 140);
const r150_140 = runRatingTest(150, 140);
const r160_130 = runRatingTest(160, 130);

// Swap Tests
let swapPairs = [];
let symAw=0, symBw=0, symAwSwap=0, symBwSwap=0;
for(let i=0; i<100; i++) {
    const seed = 50000 + i;
    currentSeed = seed;
    const s1 = MatchEngine.createInitialState(createTeam('A'), createTeam('B'), true, 'mirage', 'MR12', seed);
    const res1 = MatchEngine.simulateEntireMatch(s1);
    if (res1.winner === 1) symAw++; else symBw++;
    
    currentSeed = seed;
    const s2 = MatchEngine.createInitialState(createTeam('B'), createTeam('A'), true, 'mirage', 'MR12', seed);
    const res2 = MatchEngine.simulateEntireMatch(s2);
    if (res2.winner === 1) symBwSwap++; else symAwSwap++;
    
    if (i < 10) {
        swapPairs.push(`Seed ${seed} | A vs B: ${res1.team1Score}-${res1.team2Score} | B vs A: ${res2.team1Score}-${res2.team2Score}`);
    }
}

console.log("=== GLOBAL STATS (2000 matches) ===");
console.log(`1. Team A Win%: ${(t1Wins/NUM_MATCHES*100).toFixed(1)}%`);
console.log(`2. Team B Win%: ${(t2Wins/NUM_MATCHES*100).toFixed(1)}%`);
console.log(`3. T-side round win%: ${(tWins/(tWins+ctWins)*100).toFixed(1)}%`);
console.log(`4. CT-side round win%: ${(ctWins/(tWins+ctWins)*100).toFixed(1)}%`);
console.log(`5. Avg Rounds: ${(totalRounds/NUM_MATCHES).toFixed(2)}`);
console.log(`6. Avg Kills: ${(totalKills/(NUM_MATCHES*10)).toFixed(2)}`);
console.log(`7. Avg Deaths: ${(totalDeaths/(NUM_MATCHES*10)).toFixed(2)}`);
console.log(`8. Avg ADR: ${(totalDamage/(totalRounds*10)).toFixed(1)}`);

console.log("\n=== MVP DISTRIBUTION ===");
for (const [r, c] of Object.entries(mvpCounts)) {
    console.log(`${r.toUpperCase()}: ${c} (${((c/NUM_MATCHES)*100).toFixed(1)}%)`);
}

console.log("\n=== K/D DISTRIBUTION ===");
console.log(`Avg: ${(totalKills/totalDeaths).toFixed(2)}`);
console.log(`Median: ${median.toFixed(2)}`);
console.log(`P90: ${p90.toFixed(2)}`);
console.log(`P95: ${p95.toFixed(2)}`);
console.log(`Max: ${maxKd.toFixed(2)}`);
console.log(`>= 2.0: ${kdList.filter(x=>x>=2.0).length}`);
console.log(`>= 2.5: ${kdList.filter(x=>x>=2.5).length}`);
console.log(`>= 3.0: ${kdList.filter(x=>x>=3.0).length}`);

console.log("\n=== RATING TEST ===");
console.log(`160 vs 140: Win% ${r160_140.w}%, K/D ${r160_140.kd}, ADR ${r160_140.adr}, MVP% ${r160_140.mvp}%`);
console.log(`150 vs 140: Win% ${r150_140.w}%, K/D ${r150_140.kd}, ADR ${r150_140.adr}, MVP% ${r150_140.mvp}%`);
console.log(`160 vs 130: Win% ${r160_130.w}%, K/D ${r160_130.kd}, ADR ${r160_130.adr}, MVP% ${r160_130.mvp}%`);

console.log("\n=== OT TEST ===");
console.log(`Matches went to OT: ${otMatches} (${(otMatches/NUM_MATCHES*100).toFixed(1)}%)`);
console.log(`Avg OT Rounds (in OT matches): ${otMatches > 0 ? (otRounds/otMatches).toFixed(1) : 0}`);

console.log("\n=== SWAP TEST (Symmetry) ===");
console.log(`Total Original (A vs B) - A wins: ${symAw}, B wins: ${symBw}`);
console.log(`Total Swap     (B vs A) - B wins: ${symBwSwap}, A wins: ${symAwSwap}`);
console.log("Sample 10 Pairs:");
swapPairs.forEach(p => console.log(p));

console.log("\n=== INVARIANTS ===");
if(invariantFails.length === 0) console.log("All invariants passed perfectly.");
else {
    console.log(`Found ${invariantFails.length} invariant violations. Top 10:`);
    invariantFails.slice(0,10).forEach(f => console.log(f));
}
