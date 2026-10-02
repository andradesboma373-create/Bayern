import fs from 'fs';
import path from 'path';

export function verifyTeamsPreservation(): { success: boolean; details: any } {
  console.log('--- VERIFYING TEAMS PRESERVATION & ROOM ISOLATION PATCH ---');

  const cachePath = path.join(process.cwd(), 'local_database_cache.json');
  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

  const teams = Object.values(cache.teams || {}) as any[];
  console.log(`Total teams found: ${teams.length}`);

  // Check restored teams for bamep
  const bamepTeams = teams.filter(t => t.channelId === 'channel_bamep_cs2');
  const restoredExpected = ['ыв', 'вы', 'вывы', 'выв', 'ывы'];
  const restoredFound = bamepTeams.filter(t => restoredExpected.includes(t.name.trim()));

  console.log(`Master room (bamep) teams: ${bamepTeams.length} (restored teams: ${restoredFound.length}/${restoredExpected.length})`);

  // Check airy isolation
  const airyTeams = teams.filter(t => t.channelId === 'channel_airy');
  console.log(`Room airy teams: ${airyTeams.length}`);

  // Check simu isolation
  const simuTeams = teams.filter(t => t.channelId === 'channel_simu');
  console.log(`Room simu teams: ${simuTeams.length}`);

  const isOk = teams.length >= 20 && restoredFound.length >= 5 && airyTeams.length === 5 && simuTeams.length === 5;

  return {
    success: isOk,
    details: {
      totalTeams: teams.length,
      bamepTeamsCount: bamepTeams.length,
      restoredCount: restoredFound.length,
      airyTeamsCount: airyTeams.length,
      simuTeamsCount: simuTeams.length,
      restoredNames: restoredFound.map(t => t.name)
    }
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const res = verifyTeamsPreservation();
  console.log('Verification result:', res);
  process.exit(res.success ? 0 : 1);
}
