const fs = require('fs');
let code = fs.readFileSync('src/components/setka_tourn/MatchVetoModal.tsx', 'utf8');

const target = `    setTimeout(() => {
        const result = simulateMatchSeries(
            t1P,
            t2P,
            100,
            100,
            'Balanced',
            'Balanced',
            mapsToSim,
            \`BO\${bo}\`,
            game === 'cs2',
            'Турнирный Матч'
        );
        // Override default Team 1/2 names in stats with actual team names
        result.team1Name = team1.name;
        result.team2Name = team2.name;
        setSimulationResult(result);
        setSimulating(false);
    }, 400);`;

const replacement = `    setTimeout(() => {
        try {
            const result = simulateMatchSeries(
                t1P,
                t2P,
                100,
                100,
                'Balanced',
                'Balanced',
                mapsToSim,
                game === 'cs2' ? 'MR12' : 'MR15',
                game === 'cs2',
                'Турнирный Матч'
            );
            // Override default Team 1/2 names in stats with actual team names
            result.team1Name = team1.name;
            result.team2Name = team2.name;
            setSimulationResult(result);
        } catch (err: any) {
            console.error("MatchVetoModal simulation error:", err);
            alert("Ошибка симуляции: " + (err.message || err));
        } finally {
            setSimulating(false);
        }
    }, 50);`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/components/setka_tourn/MatchVetoModal.tsx', code);
    console.log("Fixed MatchVetoModal");
} else {
    console.log("Target not found in MatchVetoModal");
}

