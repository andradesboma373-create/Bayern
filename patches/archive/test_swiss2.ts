import { Team, Match } from './src/components/setka_tourn/types';
import { generateNextSwissRound } from './src/components/setka_tourn/swissLogic';

const teams: Team[] = Array.from({length: 16}, (_, i) => ({ id: `t${i+1}`, name: `Team ${i+1}` }));

let rounds: Match[][] = [];

// R1
let r1 = generateNextSwissRound(teams, rounds, 3, 3)!;
r1.forEach(m => { m.winnerId = m.team1!.id; });
rounds.push(r1);

// R2
let r2 = generateNextSwissRound(teams, rounds, 3, 3)!;
console.log("R2 Matches:");
r2.forEach(m => {
    let s1 = {w:0, l:0}, s2 = {w:0, l:0};
    rounds.slice(0, 1).flat().forEach(rm => {
        if (rm.winnerId === m.team1!.id) s1.w++;
        else if (rm.team1!.id === m.team1!.id || rm.team2!.id === m.team1!.id) s1.l++;

        if (rm.winnerId === m.team2!.id) s2.w++;
        else if (rm.team1!.id === m.team2!.id || rm.team2!.id === m.team2!.id) s2.l++;
    });
    console.log(`${m.team1!.name} (${s1.w}-${s1.l}) vs ${m.team2!.name} (${s2.w}-${s2.l})`);
});
r2.forEach(m => { m.winnerId = m.team1!.id; });
rounds.push(r2);
