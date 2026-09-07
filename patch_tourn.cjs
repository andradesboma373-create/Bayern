const fs = require('fs');
let code = fs.readFileSync('src/components/setka_tourn/TournamentManager.tsx', 'utf8');

code = code.replace(
    'for (const m of r.matches) if (isMatchPlayed(m)) return true;',
    'for (const m of r) if (isMatchPlayed(m)) return true;'
);

fs.writeFileSync('src/components/setka_tourn/TournamentManager.tsx', code);
console.log("Patched TournamentManager.tsx");
