const fs = require('fs');
let code = fs.readFileSync('src/lib/simulation.ts', 'utf8');

// Insert import mapsList from '../mapsList.json' at top if not exists
if (!code.includes("import mapsList")) {
    code = `import mapsList from '../mapsList.json';\n` + code;
}

const addLogic = `
// --- Auto-inject custom maps from public/maps ---
try {
    const existingCS2 = new Set(MAP_POOL_CS2.map(m => m.id.toLowerCase()));
    const existingS2 = new Set(MAP_POOL_S2.map(m => m.id.toLowerCase()));
    
    (mapsList || []).forEach(mapName => {
        const id = mapName.toLowerCase();
        const formattedName = mapName.charAt(0).toUpperCase() + mapName.slice(1);
        const mapObj = { id, name: formattedName, tSideBias: 0.50, ctSideBias: 0.50 };
        
        // If the map isn't natively known in either CS2 or S2, add to BOTH as custom map
        if (!existingCS2.has(id) && !existingS2.has(id)) {
            MAP_POOL_CS2.push(mapObj);
            MAP_POOL_S2.push(mapObj);
        }
    });
} catch(e) {
    console.error("Failed to inject custom maps", e);
}
// ------------------------------------------------
`;

// Insert after MAP_POOL_S2 definition
if (!code.includes("Auto-inject custom maps")) {
    code = code.replace(/(export const MAP_POOL_S2 = \[[\s\S]*?\];)/, "$1" + addLogic);
}

fs.writeFileSync('src/lib/simulation.ts', code);
