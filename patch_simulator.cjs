const fs = require('fs');

let sim = fs.readFileSync('src/components/Simulator.tsx', 'utf8');
sim = sim.replace(
    '      const simResult = simulateMatchSeries(',
    '      await new Promise(r => setTimeout(r, 50));\n      const simResult = simulateMatchSeries('
);
fs.writeFileSync('src/components/Simulator.tsx', sim);

let veto = fs.readFileSync('src/components/setka_tourn/MatchVetoModal.tsx', 'utf8');
// veto currently does: setTimeout(() => { const result = simulateMatchSeries ... }, 400);
// That's already delayed, so it should show the UI.
