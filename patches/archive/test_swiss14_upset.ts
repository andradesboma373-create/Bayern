import { Team, Match } from './src/components/setka_tourn/types';
import { generateNextSwissRound } from './src/components/setka_tourn/swissLogic';

const teams: Team[] = Array.from({length: 14}, (_, i) => ({ id: `t${i+1}`, name: `Team ${i+1}` }));

let rounds: Match[][] = [];

let r1 = generateNextSwissRound(teams, rounds, 3, 3)!;
r1.forEach(m => { m.winnerId = m.team1!.id; });
rounds.push(r1);

let r2 = generateNextSwissRound(teams, rounds, 3, 3)!;
// The cross pair is the last match: Team 13 (1-0) vs Team 2 (0-1). Let's make Team 2 win!
r2.forEach(m => { 
    if (m.team1!.id === 't13' && m.team2!.id === 't2') {
        m.winnerId = m.team2!.id; 
    } else {
        m.winnerId = m.team1!.id; 
    }
});
rounds.push(r2);

let r3 = generateNextSwissRound(teams, rounds, 3, 3)!;
console.log("R3 Matches for 14 teams (0-1 beats 1-0):");
r3.forEach(m => {
    let s1 = {w:0, l:0}, s2 = {w:0, l:0};
    rounds.flat().forEach(rm => {
        if (rm.winnerId === m.team1!.id) s1.w++;
        else if (rm.team1!.id === m.team1!.id || rm.team2!.id === m.team1!.id) s1.l++;
        if (rm.winnerId === m.team2!.id) s2.w++;
        else if (rm.team1!.id === m.team2!.id || rm.team2!.id === m.team2!.id) s2.l++;
    });
    console.log(`${m.team1!.name} (${s1.w}-${s1.l}) vs ${m.team2!.name} (${s2.w}-${s2.l})`);
});
