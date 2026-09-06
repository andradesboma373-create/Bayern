import { MatchEngine } from '../src/match-logic/engine/MatchEngine';
import { CombatSystem } from '../src/match-logic/systems/CombatSystem';

function generateRandomTeam(prefix: string) {
    return Array.from({ length: 5 }).map((_, i) => ({
      id: `${prefix}-p${i}`,
      nickname: `${prefix}-Player${i}`,
      role: ['Captain', 'Entry', 'Rifler', 'Support', 'Sniper'][i],
      rating: 80 + Math.random() * 20
    }));
}

CombatSystem.setSeed(999);
const team1 = generateRandomTeam('T1');
const team2 = generateRandomTeam('T2');
const state = MatchEngine.createInitialState(team1, team2, true, 'mirage', 'MR12', 123);
const result = MatchEngine.simulateEntireMatch(state);
for (const round of result.roundLogs) {
    if (round.reason === 'EXPLOSION' || round.reason === 'DEFUSE') {
        console.log(`Round ${round.round} ended in ${round.reason}`);
    }
}
console.log("Defuses:", result.roundLogs.filter(r => r.reason === 'DEFUSE').length);
