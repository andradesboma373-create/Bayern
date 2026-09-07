const fs = require('fs');
let code = fs.readFileSync('src/lib/tournamentPreloader.ts', 'utf8');

code = code.replace(
    'prepopulateTeamLogos(collectedTeams);',
    'prepopulateTeamLogos();'
);

fs.writeFileSync('src/lib/tournamentPreloader.ts', code);
console.log("Patched tournamentPreloader.ts");
