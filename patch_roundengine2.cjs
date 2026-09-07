const fs = require('fs');
let code = fs.readFileSync('src/match-logic/engine/RoundEngine.ts', 'utf8');

code = code.replace(
    'state.tick += 5;',
    'state.tick++;' 
);

fs.writeFileSync('src/match-logic/engine/RoundEngine.ts', code);
console.log("Reverted RoundEngine.ts");
