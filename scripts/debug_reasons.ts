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

let elims = 0, time = 0, defuses = 0, explosions = 0;
for(let i=0; i<50; i++) {
  CombatSystem.setSeed(i * 1234);
  const team1 = generateRandomTeam('T1');
  const team2 = generateRandomTeam('T2');
  const state = MatchEngine.createInitialState(team1, team2, true, 'mirage', 'MR12', 123);
  const result = MatchEngine.simulateEntireMatch(state);
  for(const r of result.roundLogs) {
     if (r.reason === 'ELIMINATION') elims++;
     if (r.reason === 'TIME') time++;
     if (r.reason === 'DEFUSE') defuses++;
     if (r.reason === 'EXPLOSION') explosions++;
  }
}
console.log(`Elims: ${elims}, Time: ${time}, Defuses: ${defuses}, Explosions: ${explosions}`);
