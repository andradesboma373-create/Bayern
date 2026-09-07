const fs = require('fs');
let code = fs.readFileSync('src/match-logic/engine/RoundEngine.ts', 'utf8');

code = code.replace(
    'state.tick++;',
    'state.tick += 5;' // 5x speedup
);

fs.writeFileSync('src/match-logic/engine/RoundEngine.ts', code);
console.log("Patched RoundEngine.ts");
