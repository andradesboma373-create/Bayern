import { Team, Match } from './src/components/setka_tourn/types';
import { generateNextSwissRound } from './src/components/setka_tourn/swissLogic';

const teams: Team[] = Array.from({length: 16}, (_, i) => ({ id: `t${i+1}`, name: `Team ${i+1}` }));

for(let sim=0; sim<100; sim++) {
    let rounds: Match[][] = [];
    let r1 = generateNextSwissRound(teams, rounds, 3, 3)!;
    r1.forEach(m => m.winnerId = Math.random() > 0.5 ? m.team1!.id : m.team2!.id);
    rounds.push(r1);

    let r2 = generateNextSwissRound(teams, rounds, 3, 3)!;
    r2.forEach(m => m.winnerId = Math.random() > 0.5 ? m.team1!.id : m.team2!.id);
    rounds.push(r2);

    let r3 = generateNextSwissRound(teams, rounds, 3, 3)!;
    let counts: Record<string, number> = {};
    r3.forEach(m => {
        let s1 = {w:0, l:0}, s2 = {w:0, l:0};
        rounds.flat().forEach(rm => {
            if (rm.winnerId === m.team1!.id) s1.w++;
            else if (rm.team1!.id === m.team1!.id || rm.team2!.id === m.team1!.id) s1.l++;
            if (rm.winnerId === m.team2!.id) s2.w++;
            else if (rm.team1!.id === m.team2!.id || rm.team2!.id === m.team2!.id) s2.l++;
        });
        let k = `${s1.w}-${s1.l} vs ${s2.w}-${s2.l}`;
        if(s1.w !== s2.w || s1.l !== s2.l) {
            console.log(`CROSS MATCH FOUND IN SIM ${sim}: ${k}`);
        }
        counts[`${s1.w}-${s1.l}`] = (counts[`${s1.w}-${s1.l}`] || 0) + 1;
    });
}
console.log("Done");
