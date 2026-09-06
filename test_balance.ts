import { MatchEngine } from './src/match-logic/engine/MatchEngine.ts';
import { CombatSystem } from './src/match-logic/systems/CombatSystem.ts';
CombatSystem.random = function() { return Math.random(); }

function createTeam(prefix: string) {
  return [
    { id: `${prefix}_Sniper`, nickname: `${prefix}_Sniper`, role: 'sniper', rating: 100 },
    { id: `${prefix}_IGL`, nickname: `${prefix}_IGL`, role: 'igl', rating: 100 },
    { id: `${prefix}_Rifler`, nickname: `${prefix}_Rifler`, role: 'rifler', rating: 100 },
    { id: `${prefix}_Support`, nickname: `${prefix}_Support`, role: 'support', rating: 100 },
    { id: `${prefix}_Entry`, nickname: `${prefix}_Entry`, role: 'entry', rating: 100 },
  ];
}

let tWins = 0, ctWins = 0;
for(let i=0; i<100; i++) {
    const state = MatchEngine.createInitialState(createTeam('A'), createTeam('B'), true, 'mirage', 'MR12', 1000 + i);
    MatchEngine.simulateEntireMatch(state);
    state.events.filter(e => e.type === 'ROUND_ENDED').forEach((e, idx) => {
        if (idx < 12) {
            if (e.data.winnerId === 't1') tWins++; else ctWins++;
        } else {
            if (e.data.winnerId === 't1') ctWins++; else tWins++;
        }
    });
}
console.log(`T wins: ${tWins}, CT wins: ${ctWins}`);
