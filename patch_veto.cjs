const fs = require('fs');
let code = fs.readFileSync('src/components/setka_tourn/MatchVetoModal.tsx', 'utf8');

code = code.replace(
    'import { simulateMatchSeries, MAP_POOL_CS2, MAP_POOL_S2 } from \'../../lib/simulation\';',
    'import { simulateMatchSeries, MAP_POOL_CS2, MAP_POOL_S2 } from \'../../lib/simulation\';\nimport LiveMatchOverlay from "../LiveMatchOverlay";'
);

code = code.replace(
    'const [simulating, setSimulating] = useState(false);',
    'const [simulating, setSimulating] = useState(false);\n  const [liveMatchData, setLiveMatchData] = useState<any>(null);'
);

const replaceTarget = `        result.team1Name = team1.name;
        result.team2Name = team2.name;
        setSimulationResult(result);
        setSimulating(false);
    }, 400);`;

const newCode = `        result.team1Name = team1.name;
        result.team2Name = team2.name;
        setLiveMatchData(result);
        // setSimulationResult and setSimulating(false) moved to onComplete
    }, 100);`;

if (code.includes(replaceTarget)) {
    code = code.replace(replaceTarget, newCode);
    console.log("Replaced handleSimulate in VetoModal successfully");
} else {
    console.log("Could not find replace target in VetoModal");
}

code = code.replace(
    'return (',
    `return (
    <>
      {liveMatchData && (
        <LiveMatchOverlay 
          matchResult={liveMatchData} 
          onComplete={() => {
            setSimulationResult(liveMatchData);
            setLiveMatchData(null);
            setSimulating(false);
          }} 
        />
      )}`
);

code = code.replace(/<\/div>\s*$/i, '</div>\n    </>\n');

fs.writeFileSync('src/components/setka_tourn/MatchVetoModal.tsx', code);
