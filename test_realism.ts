import { MatchEngine } from './src/match-logic/engine/MatchEngine';

function generateRandomTeam(prefix: string) {
    return Array.from({ length: 5 }).map((_, i) => ({
      id: `${prefix}-p${i}`,
      nickname: `${prefix}-Player${i}`,
      role: ['Captain', 'Entry', 'Rifler', 'Support', 'Sniper'][i],
      rating: 80 + Math.random() * 20
    }));
}

let bombPlants = 0;
let bombDefuses = 0;
let bombExplosions = 0;

for (let i = 0; i < 20; i++) {
    const team1 = generateRandomTeam('T1');
    const team2 = generateRandomTeam('T2');
    
    const state = MatchEngine.createInitialState(team1, team2, true, 'mirage', 'MR12', i * 1234);
    const result = MatchEngine.simulateEntireMatch(state);
    
    result.roundLogs.forEach((log: any) => {
        if (log.reason === 'DEFUSE') bombDefuses++;
        if (log.reason === 'EXPLOSION') bombExplosions++;
    });
}
console.log('Realism Check Results:');
console.log(`Bomb Defuses: ${bombDefuses}`);
console.log(`Bomb Explosions: ${bombExplosions}`);
