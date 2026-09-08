const fs = require('fs');
let code = fs.readFileSync('src/match-logic/systems/CombatSystem.ts', 'utf8');

code = code.replace(
    'const targetEvasion = Math.max(0.75, Math.min(1.25, 1.0 - (targetIqRatio - 1.0) * 0.10));',
    'const targetEvasion = Math.max(0.60, Math.min(1.40, 1.0 - (targetIqRatio - 1.0) * 0.20));'
);

fs.writeFileSync('src/match-logic/systems/CombatSystem.ts', code);
console.log("Patched target evasion");
