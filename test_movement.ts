import { MapSystem } from './src/match-logic/systems/MapSystem';
MapSystem.initializeMap('mirage');

const path = MapSystem.findPath('t_spawn', 'a_site');
console.log('Path from t_spawn to a_site:', path);

const path2 = MapSystem.findPath('t_spawn', 'b_site');
console.log('Path from t_spawn to b_site:', path2);
