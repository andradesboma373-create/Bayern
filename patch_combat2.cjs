const fs = require('fs');
let code = fs.readFileSync('src/match-logic/systems/CombatSystem.ts', 'utf8');

code = code.replace(
    'let hitChance = 0.46 + (aimRatio - 1.0) * 0.30 * progress;',
    'let hitChance = 0.46 + (aimRatio - 1.0) * 0.22 * progress;'
);

code = code.replace(
    'hitChance = 0.90 + (aimRatio - 1.0) * 0.16 * Math.max(0.80, progress);',
    'hitChance = 0.90 + (aimRatio - 1.0) * 0.12 * Math.max(0.80, progress);'
);

code = code.replace(
    'const targetEvasion = Math.max(0.65, Math.min(1.35, 1.0 - (targetIqRatio - 1.0) * 0.15));',
    'const targetEvasion = Math.max(0.75, Math.min(1.25, 1.0 - (targetIqRatio - 1.0) * 0.10));'
);

fs.writeFileSync('src/match-logic/systems/CombatSystem.ts', code);
console.log("Reverted CombatSystem balance patch");
