const fs = require('fs');
let code = fs.readFileSync('src/components/setka_tourn/MatchVetoModal.tsx', 'utf8');

code = code.replace(
    'setSimulationResult(result);\n        setSimulating(false);\n    }, 400);',
    'setLiveMatchData(result);\n    }, 50);'
);

fs.writeFileSync('src/components/setka_tourn/MatchVetoModal.tsx', code);
