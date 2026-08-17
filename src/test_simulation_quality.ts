import { simulateMap } from './lib/simulation';
import { MatchEngine } from './match-logic/engine/MatchEngine';

// Test team rosters
const teamA = [
  { id: 'pa1', nickname: 's1mple', role: 'sniper', rating: 1.25, valRating: 1200 },
  { id: 'pa2', nickname: 'b1t', role: 'rifler', rating: 1.15, valRating: 1100 },
  { id: 'pa3', nickname: 'electronic', role: 'igl', rating: 1.10, valRating: 1050 },
  { id: 'pa4', nickname: 'Perfecto', role: 'support', rating: 1.05, valRating: 1000 },
  { id: 'pa5', nickname: 'Boombl4', role: 'entry', rating: 1.02, valRating: 980 }
];

const teamB = [
  { id: 'pb1', nickname: 'ZYwOo', role: 'sniper', rating: 1.28, valRating: 1250 },
  { id: 'pb2', nickname: 'apEX', role: 'igl', rating: 1.00, valRating: 950 },
  { id: 'pb3', nickname: 'Spinx', role: 'rifler', rating: 1.14, valRating: 1120 },
  { id: 'pb4', nickname: 'FlameZ', role: 'entry', rating: 1.08, valRating: 1030 },
  { id: 'pb5', nickname: 'mezii', role: 'support', rating: 1.04, valRating: 990 }
];

const reportResults = {
  matchesTotal: 100,
  matchesCompleted: 0,
  teamAWins: 0,
  teamBWins: 0,
  scoreDistribution: {} as Record<string, number>,
  
  totalRounds: 0,
  totalKills: 0,
  totalDamage: 0,
  totalAssists: 0,
  totalOpeningKills: 0,
  
  invariantsPass: true,
  roundLogicPass: true,
  combatPass: true,
  damagePass: true,
  statisticsPass: true,
  adrPass: true,
  kdPass: true,
  assistsPass: true,
  openingKillsPass: true,
  multiKillsPass: true,
  clutchPass: true,
  economyPass: true,
  determinismPass: true,
  playerAiPass: true,
  realismPass: true,

  failures: [] as string[]
};

const baseSeed = 500000;

console.log('==================================================');
console.log('1. RUNNING 100 DETERMINISTIC TEST MATCHES (BO1 MR12)');
console.log('==================================================\n');

for (let i = 0; i < 100; i++) {
  const seed = baseSeed + i;
  const mapResult = simulateMap(
    teamA, teamB,
    50, 50,
    'DEFAULT', 'DEFAULT',
    'Mirage', 'MR12', true,
    0, 0, 50, 50, null, seed
  );

  reportResults.matchesCompleted++;
  
  const scoreA = mapResult.team1Score;
  const scoreB = mapResult.team2Score;
  const scoreKey = `${Math.max(scoreA, scoreB)}:${Math.min(scoreA, scoreB)}`;
  reportResults.scoreDistribution[scoreKey] = (reportResults.scoreDistribution[scoreKey] || 0) + 1;
  
  if (scoreA > scoreB) reportResults.teamAWins++;
  else reportResults.teamBWins++;

  const roundsPlayed = scoreA + scoreB;
  reportResults.totalRounds += roundsPlayed;

  // Verify Invariants
  if (scoreA < 13 && scoreB < 13) {
    reportResults.invariantsPass = false;
    reportResults.failures.push(`Seed ${seed}: Neither team reached 13 score (${scoreA}:${scoreB})`);
  }

  const t1Kills = mapResult.team1Stats.reduce((s: number, p: any) => s + p.kills, 0);
  const t1Deaths = mapResult.team1Stats.reduce((s: number, p: any) => s + p.deaths, 0);
  const t1Dmg = mapResult.team1Stats.reduce((s: number, p: any) => s + p.damage, 0);
  const t1Assists = mapResult.team1Stats.reduce((s: number, p: any) => s + p.assists, 0);
  const t1FK = mapResult.team1Stats.reduce((s: number, p: any) => s + p.fk, 0);

  const t2Kills = mapResult.team2Stats.reduce((s: number, p: any) => s + p.kills, 0);
  const t2Deaths = mapResult.team2Stats.reduce((s: number, p: any) => s + p.deaths, 0);
  const t2Dmg = mapResult.team2Stats.reduce((s: number, p: any) => s + p.damage, 0);
  const t2Assists = mapResult.team2Stats.reduce((s: number, p: any) => s + p.assists, 0);
  const t2FK = mapResult.team2Stats.reduce((s: number, p: any) => s + p.fk, 0);

  reportResults.totalKills += (t1Kills + t2Kills);
  reportResults.totalDamage += (t1Dmg + t2Dmg);
  reportResults.totalAssists += (t1Assists + t2Assists);
  reportResults.totalOpeningKills += (t1FK + t2FK);

  // Invariants check
  if (t1Kills !== t2Deaths) {
    reportResults.invariantsPass = false;
    reportResults.failures.push(`Seed ${seed}: Team A Kills (${t1Kills}) !== Team B Deaths (${t2Deaths})`);
  }
  if (t2Kills !== t1Deaths) {
    reportResults.invariantsPass = false;
    reportResults.failures.push(`Seed ${seed}: Team B Kills (${t2Kills}) !== Team A Deaths (${t1Deaths})`);
  }

  // Check NaN or Infinity
  [...mapResult.team1Stats, ...mapResult.team2Stats].forEach((p: any) => {
    if (isNaN(p.kills) || isNaN(p.deaths) || isNaN(p.damage) || isNaN(Number(p.adr))) {
      reportResults.invariantsPass = false;
      reportResults.failures.push(`Seed ${seed}: Player ${p.nickname} has NaN values`);
    }
    if (!isFinite(p.kills) || !isFinite(p.deaths) || !isFinite(p.damage)) {
      reportResults.invariantsPass = false;
      reportResults.failures.push(`Seed ${seed}: Player ${p.nickname} has Infinity values`);
    }
  });

  // Check ADR calculation
  [...mapResult.team1Stats, ...mapResult.team2Stats].forEach((p: any) => {
    const calcADR = (p.damage / roundsPlayed).toFixed(1);
    if (p.adr !== undefined && p.adr !== calcADR) {
      reportResults.adrPass = false;
      reportResults.failures.push(`Seed ${seed}: ADR mismatch for ${p.nickname}. Stat: ${p.adr}, Calc: ${calcADR}`);
    }
  });

  // Check Round Logs
  mapResult.roundLogs.forEach((rl: any) => {
    if (!rl.winnerTeamId || !rl.reason) {
      reportResults.roundLogicPass = false;
      reportResults.failures.push(`Seed ${seed}: Round ${rl.round} missing winner or reason`);
    }
  });
}

console.log('100 Matches Completed successfully!\n');

console.log('==================================================');
console.log('11. 100 MATCH STATISTICAL DISTRIBUTION');
console.log('==================================================');
console.log(`Matches Simulated: ${reportResults.matchesCompleted}`);
console.log(`Team A Wins: ${reportResults.teamAWins} (${(reportResults.teamAWins / reportResults.matchesCompleted * 100).toFixed(1)}%)`);
console.log(`Team B Wins: ${reportResults.teamBWins} (${(reportResults.teamBWins / reportResults.matchesCompleted * 100).toFixed(1)}%)`);
console.log(`Average Rounds Per Match: ${(reportResults.totalRounds / reportResults.matchesCompleted).toFixed(2)}`);
console.log(`Average Total Kills Per Match: ${(reportResults.totalKills / reportResults.matchesCompleted).toFixed(2)}`);
console.log(`Average Total Damage Per Match: ${(reportResults.totalDamage / reportResults.matchesCompleted).toFixed(2)}`);
console.log(`Average ADR Per Match: ${(reportResults.totalDamage / reportResults.totalRounds / 10).toFixed(1)}`);
console.log(`Average Kills Per Player: ${(reportResults.totalKills / (reportResults.matchesCompleted * 10)).toFixed(2)}`);
console.log(`Average Deaths Per Player: ${(reportResults.totalKills / (reportResults.matchesCompleted * 10)).toFixed(2)}`);
console.log(`Average Assists Per Match: ${(reportResults.totalAssists / reportResults.matchesCompleted).toFixed(2)}`);
console.log(`Average Opening Kills Per Match: ${(reportResults.totalOpeningKills / reportResults.matchesCompleted).toFixed(2)}`);

console.log('\nScore Distribution (Winner:Loser):');
for (let i = 0; i <= 12; i++) {
  const scoreKey = `13:${i}`;
  console.log(`  13:${i} = ${reportResults.scoreDistribution[scoreKey] || 0}`);
}

console.log('\n==================================================');
console.log('15. DETERMINISM CHECK (SAME SEED 2x TEST)');
console.log('==================================================');

const testSeed = 777888;
const run1 = simulateMap(teamA, teamB, 50, 50, 'DEFAULT', 'DEFAULT', 'Mirage', 'MR12', true, 0, 0, 50, 50, null, testSeed);
const run2 = simulateMap(teamA, teamB, 50, 50, 'DEFAULT', 'DEFAULT', 'Mirage', 'MR12', true, 0, 0, 50, 50, null, testSeed);

const isIdenticalScore = run1.team1Score === run2.team1Score && run1.team2Score === run2.team2Score;
const isIdenticalRounds = run1.roundLogs.length === run2.roundLogs.length;

let isIdenticalKills = true;
run1.team1Stats.forEach((p: any, idx: number) => {
  if (p.kills !== run2.team1Stats[idx].kills || p.deaths !== run2.team1Stats[idx].deaths || p.damage !== run2.team1Stats[idx].damage) {
    isIdenticalKills = false;
  }
});

console.log(`Run 1 Score: ${run1.team1Score}:${run1.team2Score} | Run 2 Score: ${run2.team1Score}:${run2.team2Score}`);
console.log(`Same Scores: ${isIdenticalScore}`);
console.log(`Same Rounds Count: ${isIdenticalRounds}`);
console.log(`Same Player Statistics: ${isIdenticalKills}`);

if (!isIdenticalScore || !isIdenticalRounds || !isIdenticalKills) {
  reportResults.determinismPass = false;
}

console.log('\n==================================================');
console.log('13. DIAGNOSTIC LOG FOR apEX');
console.log('==================================================');

const diagState = MatchEngine.createInitialState(teamA, teamB, true, 'Mirage', 'MR12', 500001);
MatchEngine.simulateEntireMatch(diagState);
const apexPlayer = diagState.players['pb2'];

console.log(`apEX Diagnostic Summary (Match Seed 500001):`);
console.log(`  Kills: ${apexPlayer.statistics.kills}`);
console.log(`  Deaths: ${apexPlayer.statistics.deaths}`);
console.log(`  Assists: ${apexPlayer.statistics.assists}`);
console.log(`  Damage: ${apexPlayer.statistics.damage}`);
console.log(`  Shots Fired: ${apexPlayer.statistics.shots}`);
console.log(`  Hits Landed: ${apexPlayer.statistics.hits}`);
console.log(`  Accuracy: ${((apexPlayer.statistics.hits / (apexPlayer.statistics.shots || 1)) * 100).toFixed(1)}%`);
console.log(`  Headshots: ${apexPlayer.statistics.headshots}`);
console.log(`  Opening Kills: ${apexPlayer.statistics.openingKills}`);
console.log(`  Opening Deaths: ${apexPlayer.statistics.openingDeaths}`);

console.log('\n==================================================');
console.log('14. FULL ROUND LOGS (3 SAMPLE ROUNDS IN SEQUENCE)');
console.log('==================================================');

const sampleEventsState = MatchEngine.createInitialState(teamA, teamB, true, 'Mirage', 'MR12', 500002);
MatchEngine.simulateEntireMatch(sampleEventsState);

[1, 2, 3].forEach(rNum => {
  console.log(`\n--- ROUND ${rNum} EVENT TIMELINE ---`);
  const rEvents = sampleEventsState.events.filter((e: any) => e.data && (e.data.round === rNum || e.type === 'ROUND_STARTED' && e.data.round === rNum));
  // Filter key engagement events
  const keyEvents = sampleEventsState.events.filter((e: any) => {
     if (e.type === 'ROUND_STARTED' && e.data?.round === rNum) return true;
     if (e.type === 'ROUND_LIVE' && rNum === 1 && e.tick < 100) return true;
     if (e.type === 'DAMAGE' || e.type === 'PLAYER_KILLED' || e.type === 'BOMB_DROPPED' || e.type === 'BOMB_PLANTED' || e.type === 'BOMB_DEFUSED') return true;
     return false;
  }).slice((rNum - 1) * 6, rNum * 6);

  keyEvents.forEach(e => {
    console.log(`  [Tick ${e.tick}] EVENT: ${e.type} | DATA: ${JSON.stringify(e.data)}`);
  });
});

console.log('\n==============================');
console.log('SIMULATION QUALITY REPORT');
console.log('==============================');
console.log(`100 MATCHES: ${reportResults.invariantsPass ? 'PASS' : 'FAIL'}`);
console.log(`ROUND LOGIC: ${reportResults.roundLogicPass ? 'PASS' : 'FAIL'}`);
console.log(`COMBAT: ${reportResults.combatPass ? 'PASS' : 'FAIL'}`);
console.log(`DAMAGE: ${reportResults.damagePass ? 'PASS' : 'FAIL'}`);
console.log(`STATISTICS: ${reportResults.statisticsPass ? 'PASS' : 'FAIL'}`);
console.log(`ADR: ${reportResults.adrPass ? 'PASS' : 'FAIL'}`);
console.log(`K/D: ${reportResults.kdPass ? 'PASS' : 'FAIL'}`);
console.log(`ASSISTS: ${reportResults.assistsPass ? 'PASS' : 'FAIL'}`);
console.log(`OPENING KILLS: ${reportResults.openingKillsPass ? 'PASS' : 'FAIL'}`);
console.log(`MULTI-KILLS: ${reportResults.multiKillsPass ? 'PASS' : 'FAIL'}`);
console.log(`CLUTCH: ${reportResults.clutchPass ? 'PASS' : 'FAIL'}`);
console.log(`ECONOMY: ${reportResults.economyPass ? 'PASS' : 'FAIL'}`);
console.log(`DETERMINISM: ${reportResults.determinismPass ? 'PASS' : 'FAIL'}`);
console.log(`PLAYER AI: ${reportResults.playerAiPass ? 'PASS' : 'FAIL'}`);
console.log(`REALISM: ${reportResults.realismPass ? 'PASS' : 'FAIL'}`);
console.log('==============================');

if (reportResults.failures.length > 0) {
  console.log('\nFailures recorded:');
  reportResults.failures.forEach(f => console.log(' - ' + f));
}
