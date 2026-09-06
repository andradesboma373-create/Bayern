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

const NUM_MATCHES = 2000;

let scores: Record<string, number> = {};
for (let i = 0; i <= 12; i++) scores[`13:${i}`] = 0;
scores['OT'] = 0;

let diffs = { '0-2': 0, '3-4': 0, '5-6': 0, '7-9': 0, '10+': 0 };

let snow3_0_cases = 0, snow3_0_wins = 0;
let snow5_0_cases = 0, snow5_0_wins = 0;

let comeback_cases: Record<string, number> = { '0:3': 0, '1:5': 0, '2:6': 0, '3:8': 0, '4:9': 0 };
let comeback_wins: Record<string, number> = { '0:3': 0, '1:5': 0, '2:6': 0, '3:8': 0, '4:9': 0 };

let currentSeed = 1000;
CombatSystem.random = function() {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
};

for(let i = 0; i < NUM_MATCHES; i++) {
    currentSeed = 80000 + i;
    const state = MatchEngine.createInitialState(createTeam('A'), createTeam('B'), true, 'mirage', 'MR12', currentSeed);
    const res = MatchEngine.simulateEntireMatch(state);
    
    let t1Score = res.team1Score;
    let t2Score = res.team2Score;
    
    let winnerScore = Math.max(t1Score, t2Score);
    let loserScore = Math.min(t1Score, t2Score);
    
    if (winnerScore > 13) {
        scores['OT']++;
    } else {
        scores[`13:${loserScore}`] = (scores[`13:${loserScore}`] || 0) + 1;
    }

    let diff = winnerScore - loserScore;
    if (diff <= 2) diffs['0-2']++;
    else if (diff <= 4) diffs['3-4']++;
    else if (diff <= 6) diffs['5-6']++;
    else if (diff <= 9) diffs['7-9']++;
    else diffs['10+']++;

    const rounds = state.events.filter((e:any) => e.type === 'ROUND_ENDED');
    let r1 = 0, r2 = 0;
    let matchWinner = res.winner; 
    
    let checkedComebacks = { t1: new Set(), t2: new Set() };
    let checkComeback = (tScore: number, oppScore: number, teamId: number, targetScore: string) => {
        const parts = targetScore.split(':');
        if (tScore === parseInt(parts[0]) && oppScore === parseInt(parts[1])) {
            let teamSet = teamId === 1 ? checkedComebacks.t1 : checkedComebacks.t2;
            if (!teamSet.has(targetScore)) {
                comeback_cases[targetScore]++;
                if (matchWinner === teamId) comeback_wins[targetScore]++;
                teamSet.add(targetScore);
            }
        }
    };

    for (let r = 0; r < rounds.length; r++) {
        if (rounds[r].data.winnerId === 't1') r1++; else r2++;
        
        if (r === 2) {
            if (r1 === 3) { snow3_0_cases++; if (matchWinner === 1) snow3_0_wins++; }
            if (r2 === 3) { snow3_0_cases++; if (matchWinner === 2) snow3_0_wins++; }
        }
        if (r === 4) {
            if (r1 === 5) { snow5_0_cases++; if (matchWinner === 1) snow5_0_wins++; }
            if (r2 === 5) { snow5_0_cases++; if (matchWinner === 2) snow5_0_wins++; }
        }

        ['0:3', '1:5', '2:6', '3:8', '4:9'].forEach(target => {
            checkComeback(r1, r2, 1, target);
            checkComeback(r2, r1, 2, target);
        });
    }
}

function runRating(rA: number, rB: number) {
    let t1w = 0, t2w = 0;
    for (let i = 0; i < 300; i++) {
        currentSeed = 90000 + i;
        const state = MatchEngine.createInitialState(createTeam('A', rA), createTeam('B', rB), true, 'mirage', 'MR12', currentSeed);
        const res = MatchEngine.simulateEntireMatch(state);
        if (res.winner === 1) t1w++; else t2w++;
    }
    return (t1w / 300 * 100).toFixed(1);
}

console.log("=== SCORE DISTRIBUTION ===");
for (let i = 0; i <= 12; i++) {
    let count = scores[`13:${i}`];
    console.log(`13:${i}: ${count} (${(count/NUM_MATCHES*100).toFixed(1)}%)`);
}
console.log(`OT: ${scores['OT']} (${(scores['OT']/NUM_MATCHES*100).toFixed(1)}%)`);

console.log("\n=== ROUND DIFFERENCE ===");
for (let [k, v] of Object.entries(diffs)) {
    console.log(`${k}: ${v} (${(v/NUM_MATCHES*100).toFixed(1)}%)`);
}

console.log("\n=== SNOWBALL ===");
console.log(`Win after 3-0: ${snow3_0_cases > 0 ? (snow3_0_wins/snow3_0_cases*100).toFixed(1) : 0}% (${snow3_0_wins}/${snow3_0_cases})`);
console.log(`Win after 5-0: ${snow5_0_cases > 0 ? (snow5_0_wins/snow5_0_cases*100).toFixed(1) : 0}% (${snow5_0_wins}/${snow5_0_cases})`);

console.log("\n=== COMEBACKS ===");
for (let [k, cases] of Object.entries(comeback_cases)) {
    let wins = comeback_wins[k];
    console.log(`After ${k}: ${cases > 0 ? (wins/cases*100).toFixed(1) : 0}% (${wins}/${cases})`);
}

console.log("\n=== RATING IMPACT ===");
console.log(`Diff 10: ${runRating(150, 140)}%`);
console.log(`Diff 20: ${runRating(160, 140)}%`);
console.log(`Diff 30: ${runRating(160, 130)}%`);
