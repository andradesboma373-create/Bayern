import { MatchEngine } from './src/match-logic/engine/MatchEngine.ts';
import { EconomySystem } from './src/match-logic/systems/EconomySystem.ts';
import { CombatSystem } from './src/match-logic/systems/CombatSystem.ts';
import { WEAPONS } from './src/match-logic/config/Weapons.ts';

function createTeam(prefix: string, rating: number = 100) {
  return [
    { id: `${prefix}_Sniper`, nickname: `${prefix}_Sniper`, role: 'sniper', rating: rating },
    { id: `${prefix}_IGL`, nickname: `${prefix}_IGL`, role: 'igl', rating: rating },
    { id: `${prefix}_Rifler`, nickname: `${prefix}_Rifler`, role: 'rifler', rating: rating },
    { id: `${prefix}_Support`, nickname: `${prefix}_Support`, role: 'support', rating: rating },
    { id: `${prefix}_Entry`, nickname: `${prefix}_Entry`, role: 'entry', rating: rating },
  ];
}

let currentSeed = 1000;
CombatSystem.random = function() {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
};

let nextRoundStats = {
    afterPistolWin: { total: 0, wins: 0 },
    afterPistolLoss: { total: 0, wins: 0 },
    afterEcoLoss: { total: 0, wins: 0 },
    afterFullBuyLoss: { total: 0, wins: 0 },
    after3Losses: { total: 0, wins: 0 },
    after5Losses: { total: 0, wins: 0 },
};

let economyTrace: any = [];

for (let i = 0; i < 500; i++) {
    currentSeed = 500000 + i;
    const state = MatchEngine.createInitialState(createTeam('A'), createTeam('B'), true, 'mirage', 'MR12', currentSeed);
    MatchEngine.simulateEntireMatch(state);
    
    let t1Streak = 0;
    let t2Streak = 0;
    
    for (let r = 0; r < state.roundLogs.length; r++) {
        let prevLog = r > 0 ? state.roundLogs[r - 1] : null;
        let currLog = state.roundLogs[r];
        
        let t1Won = currLog.winnerTeamId === state.teams[Object.keys(state.teams)[0]].id;
        
        if (t1Won) {
            t1Streak++;
            t2Streak = 0;
        } else {
            t2Streak++;
            t1Streak = 0;
        }

        // Trace for specific match to show money progression
        if (i === 0 && r < 5) {
            economyTrace.push({
                round: currLog.round,
                winner: t1Won ? 'Team A' : 'Team B',
                t1Tactic: currLog.t1EcoType,
                t2Tactic: currLog.t2EcoType,
                t1Streak, t2Streak
            });
        }

        if (prevLog) {
            let t1WonPrev = prevLog.winnerTeamId === state.teams[Object.keys(state.teams)[0]].id;
            
            // After pistol (Round 2)
            if (currLog.round === 2) {
                if (t1WonPrev) { nextRoundStats.afterPistolWin.total++; if(t1Won) nextRoundStats.afterPistolWin.wins++; }
                else { nextRoundStats.afterPistolLoss.total++; if(t1Won) nextRoundStats.afterPistolLoss.wins++; }
                
                if (!t1WonPrev) { nextRoundStats.afterPistolWin.total++; if(!t1Won) nextRoundStats.afterPistolWin.wins++; }
                else { nextRoundStats.afterPistolLoss.total++; if(!t1Won) nextRoundStats.afterPistolLoss.wins++; }
            }

            // After Eco Loss
            if (prevLog.t1EcoType === 'ECO' && !t1WonPrev) {
                nextRoundStats.afterEcoLoss.total++;
                if (t1Won) nextRoundStats.afterEcoLoss.wins++;
            }
            if (prevLog.t2EcoType === 'ECO' && t1WonPrev) {
                nextRoundStats.afterEcoLoss.total++;
                if (!t1Won) nextRoundStats.afterEcoLoss.wins++;
            }

            // After Full Buy Loss
            if (prevLog.t1EcoType === 'FULL_BUY' && !t1WonPrev) {
                nextRoundStats.afterFullBuyLoss.total++;
                if (t1Won) nextRoundStats.afterFullBuyLoss.wins++;
            }
            if (prevLog.t2EcoType === 'FULL_BUY' && t1WonPrev) {
                nextRoundStats.afterFullBuyLoss.total++;
                if (!t1Won) nextRoundStats.afterFullBuyLoss.wins++;
            }

            // After 3 Losses
            let was3LossT1 = (t2Streak === 4) && t1Won; // it means they won after 3 losses? Wait, no.
            // Let's re-calculate loss streak from previous round
        }
    }
}

// Better streak logic
let streakStats = {
    loss3: { total: 0, wins: 0 },
    loss5: { total: 0, wins: 0 },
};

for (let i = 0; i < 500; i++) {
    currentSeed = 600000 + i;
    const state = MatchEngine.createInitialState(createTeam('A'), createTeam('B'), true, 'mirage', 'MR12', currentSeed);
    MatchEngine.simulateEntireMatch(state);
    
    let t1LossStreak = 0;
    let t2LossStreak = 0;
    
    for (let r = 0; r < state.roundLogs.length; r++) {
        let currLog = state.roundLogs[r];
        let t1Won = currLog.winnerTeamId === state.teams[Object.keys(state.teams)[0]].id;
        
        if (t1LossStreak === 3) { streakStats.loss3.total++; if(t1Won) streakStats.loss3.wins++; }
        if (t2LossStreak === 3) { streakStats.loss3.total++; if(!t1Won) streakStats.loss3.wins++; }
        
        if (t1LossStreak === 5) { streakStats.loss5.total++; if(t1Won) streakStats.loss5.wins++; }
        if (t2LossStreak === 5) { streakStats.loss5.total++; if(!t1Won) streakStats.loss5.wins++; }
        
        // Halftime reset loss streak? No, in the game loss streak stays unless halftime resets it. 
        // We know halftime doesn't reset it in current code.

        if (t1Won) { t1LossStreak = 0; t2LossStreak++; }
        else { t2LossStreak = 0; t1LossStreak++; }
    }
}


console.log("=== ECONOMY DIAGNOSTICS ===");
console.log(`Win% After Pistol Win: ${(nextRoundStats.afterPistolWin.wins / nextRoundStats.afterPistolWin.total * 100).toFixed(1)}%`);
console.log(`Win% After Pistol Loss: ${(nextRoundStats.afterPistolLoss.wins / nextRoundStats.afterPistolLoss.total * 100).toFixed(1)}%`);
console.log(`Win% After ECO Loss: ${(nextRoundStats.afterEcoLoss.wins / nextRoundStats.afterEcoLoss.total * 100).toFixed(1)}%`);
console.log(`Win% After FULL_BUY Loss: ${(nextRoundStats.afterFullBuyLoss.wins / nextRoundStats.afterFullBuyLoss.total * 100).toFixed(1)}%`);
console.log(`Win% After 3 Losses: ${(streakStats.loss3.wins / Math.max(1, streakStats.loss3.total) * 100).toFixed(1)}%`);
console.log(`Win% After 5 Losses: ${(streakStats.loss5.wins / Math.max(1, streakStats.loss5.total) * 100).toFixed(1)}%`);

console.log("\nEconomy trace (Round 1-5):");
console.log(economyTrace);
