const fs = require('fs');
let code = fs.readFileSync('src/match-logic/engine/MatchEngine.ts', 'utf8');

// Change blend logic: 85% individual, 15% team overall
code = code.replace(
    'const baseRating = (rawRating * 0.70) + (teamOverall * 0.30) + teamForm + playerMatchLuck;',
    'const baseRating = (rawRating * 0.90) + (teamOverall * 0.10) + teamForm + playerMatchLuck;'
);

// Remove the 160 cap
code = code.replace(
    'const rating = Math.max(65, Math.min(160, effectiveRating));',
    'const rating = Math.max(1, effectiveRating);' // removed upper cap
);

fs.writeFileSync('src/match-logic/engine/MatchEngine.ts', code);
console.log("Patched MatchEngine.ts");
