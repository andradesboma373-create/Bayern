import { MatchEngine } from '../src/match-logic/engine/MatchEngine';

const team1 = Array.from({ length: 5 }).map((_, i) => ({
  id: `p1-${i}`,
  nickname: `T1-Player${i}`,
  role: ['Captain', 'Entry', 'Rifler', 'Support', 'Sniper'][i],
  rating: 100 + Math.random() * 20
}));

const team2 = Array.from({ length: 5 }).map((_, i) => ({
  id: `p2-${i}`,
  nickname: `T2-Player${i}`,
  role: ['Captain', 'Entry', 'Rifler', 'Support', 'Sniper'][i],
  rating: 100 + Math.random() * 20
}));

console.log('Starting Test Match...');
const state = MatchEngine.createInitialState(
  team1, team2, true, 'mirage', 'MR12', 42
);

const result = MatchEngine.simulateEntireMatch(state);
console.log('Match finished.');

console.log(`Score: TEAM 1 [ ${result.team1Score} : ${result.team2Score} ] TEAM 2`);
console.log('\n--- TEAM 1 STATS ---');
result.team1Stats.forEach(p => {
  console.log(`${p.nickname} | K: ${p.kills} | D: ${p.deaths} | A: ${p.assists} | DMG: ${p.damage} | HS: ${p.hs}`);
});

console.log('\n--- TEAM 2 STATS ---');
result.team2Stats.forEach(p => {
  console.log(`${p.nickname} | K: ${p.kills} | D: ${p.deaths} | A: ${p.assists} | DMG: ${p.damage} | HS: ${p.hs}`);
});
