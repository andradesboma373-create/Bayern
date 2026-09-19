const fs = require('fs');
let code = fs.readFileSync('src/match-logic/engine/MatchEngine.ts', 'utf8');

code = code.replace(/events: state\.events,\s*roundLogs: \(state as any\)\.roundLogs \|\| \[\]/g, 'events: [],\n      roundLogs: []');

fs.writeFileSync('src/match-logic/engine/MatchEngine.ts', code);
console.log("Fixed MatchEngine payload");
