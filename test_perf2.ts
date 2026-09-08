import { simulateMatchSeries } from './src/lib/simulation';

const t1P = Array.from({length: 5}).map((_, i) => ({ id: 't1_'+i, nickname: 'p1_'+i, rating: 1.20, role: 'Rifler' }));
const t2P = Array.from({length: 5}).map((_, i) => ({ id: 't2_'+i, nickname: 'p2_'+i, rating: 1.10, role: 'Rifler' }));

console.time('Simulate BO5');
const result = simulateMatchSeries(t1P, t2P, 100, 100, 'Balanced', 'Balanced', ['de_dust2', 'de_mirage', 'de_inferno', 'de_nuke', 'de_vertigo'], 'BO5', true, 'Test');
console.timeEnd('Simulate BO5');
console.log(result.team1Score, result.team2Score);
