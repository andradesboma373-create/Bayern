const fs = require('fs');
let code = fs.readFileSync('src/components/setka_tourn/MatchVetoModal.tsx', 'utf8');

code = code.replace("        setLiveMatchData(result);\n    }, 50);", `        setSimulationResult(result);
        } catch (err: any) {
            console.error("Simulation error", err);
            alert("Error: " + (err.message || err));
        } finally {
            setSimulating(false);
        }
    }, 50);`);

code = code.replace("setTimeout(() => {\n        const result = simulateMatchSeries(", `setTimeout(() => {\n        try {\n            const result = simulateMatchSeries(`);

code = code.replace("\`BO\${bo}\`,", `game === 'cs2' ? 'MR12' : 'MR15',`);

fs.writeFileSync('src/components/setka_tourn/MatchVetoModal.tsx', code);
console.log("Fixed MatchVetoModal");
