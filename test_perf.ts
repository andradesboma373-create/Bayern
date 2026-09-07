import { simulateMatchSeries } from './src/lib/simulation';
import { MatchEngine } from './src/match-logic/engine/MatchEngine';
import { MapSystem } from './src/match-logic/systems/MapSystem';

const t1P = Array.from({length: 5}).map((_, i) => ({ id: 't1_'+i, nickname: 'p1_'+i, rating: 120, role: 'Rifler' }));
const t2P = Array.from({length: 5}).map((_, i) => ({ id: 't2_'+i, nickname: 'p2_'+i, rating: 120, role: 'Rifler' }));

console.time('Simulate BO3');
const result = simulateMatchSeries(t1P, t2P, 100, 100, 'Balanced', 'Balanced', ['de_dust2', 'de_mirage', 'de_inferno'], 'BO3', true, 'Test', 0, 0, 50, 50);
console.timeEnd('Simulate BO3');
console.log(result.team1Score, result.team2Score);
