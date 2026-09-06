import { MatchEngine } from '../src/match-logic/engine/MatchEngine';
import { CombatSystem } from '../src/match-logic/systems/CombatSystem';

function generateRandomTeam(prefix: string) {
    return Array.from({ length: 5 }).map((_, i) => ({
      id: `${prefix}-p${i}`,
      nickname: `${prefix}-Player${i}`,
      role: ['Captain', 'Entry', 'Rifler', 'Support', 'Sniper'][i],
      rating: 80 + Math.random() * 20
    }));
}

function runTests() {
  let t1Wins = 0;
  let t2Wins = 0;
  let totalRounds = 0;
  let totalKills = 0;
  let totalDamage = 0;
  let totalOpeningKills = 0;
  let totalPlants = 0;
  let totalDefuses = 0;
  
  let exampleRoundLog = "";

  console.log("Running 50 matches...");
  for (let seed = 1; seed <= 50; seed++) {
    const team1 = generateRandomTeam('T1');
    const team2 = generateRandomTeam('T2');
    
    // Make sure we pass the seed properly
    const state = MatchEngine.createInitialState(team1, team2, true, 'mirage', 'MR12', seed * 999);
    const result = MatchEngine.simulateEntireMatch(state);

    if (result.team1Score > result.team2Score) t1Wins++;
    else t2Wins++;

    totalRounds += result.team1Score + result.team2Score;

    let matchKills = 0;
    
    result.team1Stats.forEach(p => { totalKills += p.kills; totalDamage += p.damage; });
    result.team2Stats.forEach(p => { totalKills += p.kills; totalDamage += p.damage; });
    
    for (const r of result.roundLogs) {
      if (r.firstKillId) totalOpeningKills++;
      if (r.reason === 'EXPLOSION' || r.reason === 'DEFUSE') {
          totalPlants++;
          if (r.reason === 'DEFUSE') totalDefuses++;
      }
      
      if (seed === 1 && r.round === 1) {
          exampleRoundLog = JSON.stringify(r, null, 2);
      }
    }
  }

  console.log("=== FINAL VALIDATION METRICS ===");
  console.log(`1. Average score: T1 ${t1Wins / 50 * 13} : T2 ${t2Wins / 50 * 13} (approx) | Winrate: T1 ${t1Wins}, T2 ${t2Wins}`);
  console.log(`2. Average rounds per match: ${(totalRounds / 50).toFixed(1)}`);
  console.log(`3. Average kills per match: ${(totalKills / 50).toFixed(1)}`);
  console.log(`4. Average kills per round: ${(totalKills / totalRounds).toFixed(2)}`);
  
  const avgDamagePerMatch = totalDamage / 50;
  console.log(`5. Average total damage per match: ${avgDamagePerMatch.toFixed(1)}`);
  
  const avgAdr = totalDamage / (50 * 10 * (totalRounds / 50));
  console.log(`6. Average ADR (per player): ${avgAdr.toFixed(1)}`);
  
  console.log(`7. Opening kill rate (per round): ${(totalOpeningKills / totalRounds).toFixed(2)}`);
  console.log(`9. Bomb plant rate (per round): ${(totalPlants / totalRounds).toFixed(2)}`);
  console.log(`10. Defuse rate (per plant): ${totalPlants > 0 ? (totalDefuses / totalPlants).toFixed(2) : 0}`);
  
  console.log("\n=== ROUND 1 EVENT SEQUENCE (Seed 1) ===");
  console.log(exampleRoundLog);
}

runTests();
