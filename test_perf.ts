import { simulateMatchSeries } from './src/lib/simulation';
import { MatchEngine } from './src/match-logic/engine/MatchEngine';
const t1 = [{nickname: 'A'}, {nickname: 'B'}, {nickname: 'C'}, {nickname: 'D'}, {nickname: 'E'}];
const t2 = [{nickname: 'F'}, {nickname: 'G'}, {nickname: 'H'}, {nickname: 'I'}, {nickname: 'J'}];

console.time('simulateMatchSeries');
simulateMatchSeries(t1, t2, 100, 100, 'default', 'default', ['mirage', 'dust2', 'inferno'], 'BO3', true, 'test', 0, 0, {} as any, {} as any, [1, 2, null]);
console.timeEnd('simulateMatchSeries');
