const fs = require('fs');
let code = fs.readFileSync('src/match-logic/systems/CombatSystem.ts', 'utf8');

code = code.replace(
    'let hitChance = 0.46 + (aimRatio - 1.0) * 0.22 * progress;',
    'let hitChance = 0.46 + (aimRatio - 1.0) * 0.38 * progress;'
);

code = code.replace(
    'hitChance = 0.90 + (aimRatio - 1.0) * 0.12 * Math.max(0.80, progress);',
    'hitChance = 0.90 + (aimRatio - 1.0) * 0.20 * Math.max(0.80, progress);'
);

fs.writeFileSync('src/match-logic/systems/CombatSystem.ts', code);
console.log("Patched CombatSystem.ts");
