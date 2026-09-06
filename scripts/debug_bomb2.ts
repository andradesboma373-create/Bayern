import { MatchEngine } from '../src/match-logic/engine/MatchEngine';
import { RoundEngine } from '../src/match-logic/engine/RoundEngine';
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
RoundEngine.startRound(state);
while (state.round <= 2) {
    if (state.phase === 'ROUND_END') {
       if (state.round === 2) {
          console.log(`Round 2 Reason: ${state.events[state.events.length-1].data.reason}`);
          console.log(state.events.filter(e => e.type.startsWith('BOMB_') || e.type === 'PLAYER_KILLED'));
       }
       RoundEngine.startRound(state);
    } else {
       RoundEngine.update(state);
    }
}
