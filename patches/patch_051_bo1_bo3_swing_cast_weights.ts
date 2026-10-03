/**
 * patch_051_bo1_bo3_swing_cast_weights.ts
 * Verifies the specialized match weights for Swing (luck / comeback variance)
 * and Cast (baseline roster power / KAST discipline) depending on match format (Bo1 vs Bo3 vs Bo5).
 */

import { getFormatProfile, MATCH_FORMAT_PROFILES } from '../src/match-logic/config/RatingConfig';
import { simulateMatchSeries } from '../src/lib/simulation';

export function verifyFormatWeights() {
  console.log('--- Checking Match Format Profiles ---');
  
  const bo1 = getFormatProfile('BO1');
  const bo3 = getFormatProfile('BO3');
  const bo5 = getFormatProfile('BO5');

  console.log(`[BO1] Swing: ${bo1.swingMultiplier}x, Cast: ${bo1.castMultiplier}x, Upset Potential: ${bo1.upsetPotential}%`);
  console.log(`[BO3] Swing: ${bo3.swingMultiplier}x, Cast: ${bo3.castMultiplier}x, Upset Potential: ${bo3.upsetPotential}%`);
  console.log(`[BO5] Swing: ${bo5.swingMultiplier}x, Cast: ${bo5.castMultiplier}x, Upset Potential: ${bo5.upsetPotential}%`);

  if (bo1.swingMultiplier <= bo3.swingMultiplier) {
    throw new Error(`Bo1 swingMultiplier (${bo1.swingMultiplier}) must be higher than Bo3 (${bo3.swingMultiplier})!`);
  }
  if (bo1.castMultiplier >= bo3.castMultiplier) {
    throw new Error(`Bo1 castMultiplier (${bo1.castMultiplier}) must be lower/compressed compared to Bo3 (${bo3.castMultiplier})!`);
  }
  if (bo5.castMultiplier <= bo3.castMultiplier) {
    throw new Error(`Bo5 castMultiplier (${bo5.castMultiplier}) must be higher than Bo3 (${bo3.castMultiplier})!`);
  }

  console.log('--- Running Test Simulation for Bo1 and Bo3 ---');
  const team1 = [
    { nickname: 's1mple', role: 'sniper', rating: 138 },
    { nickname: 'b1t', role: 'opener', rating: 122 },
    { nickname: 'jL', role: 'rifler', rating: 125 },
    { nickname: 'iM', role: 'rifler', rating: 118 },
    { nickname: 'Aleksib', role: 'captain', rating: 104 }
  ];
  const team2 = [
    { nickname: 'ZywOo', role: 'sniper', rating: 139 },
    { nickname: 'Spinx', role: 'rifler', rating: 124 },
    { nickname: 'flameZ', role: 'opener', rating: 123 },
    { nickname: 'mezii', role: 'support', rating: 112 },
    { nickname: 'apex', role: 'captain', rating: 102 }
  ];

  // Run Bo1 simulation
  const bo1Result = simulateMatchSeries(
    team1, team2, 100, 100, 'default', 'default', ['mirage'], 'MR12', true, 'Test Bo1 Match',
    0, 0, {}, {}, undefined, 'BO1'
  );
  console.log(`✓ Bo1 simulated successfully: ${bo1Result.team1Score}:${bo1Result.team2Score}, MVP: ${bo1Result.mvp?.nickname}`);

  // Run Bo3 simulation
  const bo3Result = simulateMatchSeries(
    team1, team2, 100, 100, 'default', 'default', ['mirage', 'inferno', 'nuke'], 'MR12', true, 'Test Bo3 Match',
    0, 0, {}, {}, undefined, 'BO3'
  );
  console.log(`✓ Bo3 simulated successfully: ${bo3Result.team1Score}:${bo3Result.team2Score}, MVP: ${bo3Result.mvp?.nickname}`);

  return {
    success: true,
    bo1: {
      swingMultiplier: bo1.swingMultiplier,
      castMultiplier: bo1.castMultiplier,
      result: `${bo1Result.team1Score}:${bo1Result.team2Score}`
    },
    bo3: {
      swingMultiplier: bo3.swingMultiplier,
      castMultiplier: bo3.castMultiplier,
      result: `${bo3Result.team1Score}:${bo3Result.team2Score}`
    }
  };
}

if (import.meta.url.endsWith(process.argv[1])) {
  try {
    const res = verifyFormatWeights();
    console.log('\n[PATCH 051 SUCCESS]', res);
    process.exit(0);
  } catch (err: any) {
    console.error('\n[PATCH 051 FAILED]', err.message || err);
    process.exit(1);
  }
}
