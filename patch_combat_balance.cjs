const fs = require('fs');
let code = fs.readFileSync('src/match-logic/systems/CombatSystem.ts', 'utf8');

code = code.replace(
    'let hitChance = 0.46 + (aimRatio - 1.0) * 0.38 * progress;',
    'let hitChance = 0.46 + (aimRatio - 1.0) * 0.30 * progress;' // Слегка смягчаем "космический" бафф
);

code = code.replace(
    'hitChance = 0.90 + (aimRatio - 1.0) * 0.20 * Math.max(0.80, progress);',
    'hitChance = 0.90 + (aimRatio - 1.0) * 0.16 * Math.max(0.80, progress);'
);

code = code.replace(
    'const targetEvasion = Math.max(0.60, Math.min(1.40, 1.0 - (targetIqRatio - 1.0) * 0.20));',
    'const targetEvasion = Math.max(0.65, Math.min(1.35, 1.0 - (targetIqRatio - 1.0) * 0.15));'
);

fs.writeFileSync('src/match-logic/systems/CombatSystem.ts', code);
console.log("Patched CombatSystem.ts for realistic balance");
