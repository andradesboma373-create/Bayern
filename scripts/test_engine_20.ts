import { MatchEngine } from '../src/match-logic/engine/MatchEngine';

function generateRandomTeam(prefix: string) {
    return Array.from({ length: 5 }).map((_, i) => ({
      id: `${prefix}-p${i}`,
      nickname: `${prefix}-Player${i}`,
      role: ['Captain', 'Entry', 'Rifler', 'Support', 'Sniper'][i],
      rating: 80 + Math.random() * 20
    }));
}

async function runTests() {
    let t1Wins = 0;
    let t2Wins = 0;
    let totalKills = 0;
    let totalRounds = 0;
    
    console.log('Running 20 matches...\n');

    for (let i = 0; i < 20; i++) {
        const team1 = generateRandomTeam('T1');
        const team2 = generateRandomTeam('T2');
        
        const state = MatchEngine.createInitialState(team1, team2, true, 'mirage', 'MR12', i * 1337);
        const result = MatchEngine.simulateEntireMatch(state);
        
        if (result.team1Score > result.team2Score) t1Wins++;
        else t2Wins++;
        
        totalRounds += result.team1Score + result.team2Score;
        
        let matchKills = 0;
        result.team1Stats.forEach(p => matchKills += p.kills);
        result.team2Stats.forEach(p => matchKills += p.kills);
        totalKills += matchKills;
        
        console.log(`Match ${i+1}: T1 ${result.team1Score} : ${result.team2Score} T2 | Rounds: ${result.team1Score + result.team2Score} | Total Kills: ${matchKills}`);
        
        if (i === 0) {
            console.log('\n--- MATCH 1 DETAILED STATS ---');
            console.log('TEAM 1:');
            result.team1Stats.forEach(p => {
               console.log(`${p.nickname} [${p.role}] | K: ${p.kills} | D: ${p.deaths} | A: ${p.assists} | DMG: ${p.damage} | HS: ${p.hs} | OK: ${p.fk} | OD: ${p.fd}`);
            });
            console.log('TEAM 2:');
            result.team2Stats.forEach(p => {
               console.log(`${p.nickname} [${p.role}] | K: ${p.kills} | D: ${p.deaths} | A: ${p.assists} | DMG: ${p.damage} | HS: ${p.hs} | OK: ${p.fk} | OD: ${p.fd}`);
            });
            console.log('\n--- MATCH 1 ROUND 1 LOG ---');
            console.log(result.roundLogs[0]);
            console.log('------------------------------\n');
        }
    }
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`T1 Wins: ${t1Wins} | T2 Wins: ${t2Wins}`);
    console.log(`Average Rounds per match: ${(totalRounds / 20).toFixed(1)}`);
    console.log(`Average Kills per match: ${(totalKills / 20).toFixed(1)}`);
}

runTests();
