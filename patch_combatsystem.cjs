const fs = require('fs');
let code = fs.readFileSync('src/match-logic/systems/CombatSystem.ts', 'utf8');

code = code.replace(
    'const aimRatio = Math.max(0.70, Math.min(1.45, effectiveAim / 100));',
    'const aimRatio = Math.max(0.10, effectiveAim / 100);'
);
code = code.replace(
    'const targetIqRatio = Math.max(0.70, Math.min(1.45, effectiveIq / 100));',
    'const targetIqRatio = Math.max(0.10, effectiveIq / 100);'
);

fs.writeFileSync('src/match-logic/systems/CombatSystem.ts', code);
console.log("Patched CombatSystem.ts");
