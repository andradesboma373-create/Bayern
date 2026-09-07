const fs = require('fs');
let code = fs.readFileSync('src/components/setka_tourn/TournamentManager.tsx', 'utf8');

code = code.replace(
    /          status: 'upcoming',\n      \};/g,
    `          status: 'upcoming',
          activeStage: 1,
      };`
);

fs.writeFileSync('src/components/setka_tourn/TournamentManager.tsx', code);
console.log("Patched TournamentManager.tsx activeStage");
