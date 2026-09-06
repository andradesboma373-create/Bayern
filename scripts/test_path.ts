import { MapSystem } from '../src/match-logic/systems/MapSystem';
MapSystem.initializeMap('mirage');
console.log(MapSystem.findPath('t_spawn', 'a_site'));
console.log(MapSystem.findPath('t_spawn', 'b_site'));
