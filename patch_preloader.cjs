const fs = require('fs');
let code = fs.readFileSync('src/lib/tournamentPreloader.ts', 'utf8');

code = code.replace(
    'tournament.swissRounds.forEach(extractMatchTeams);',
    'tournament.swissRounds.forEach((matches) => extractMatchTeams(matches));'
);

fs.writeFileSync('src/lib/tournamentPreloader.ts', code);
console.log("Patched tournamentPreloader.ts");
