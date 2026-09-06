const fs = require('fs');
const content = fs.readFileSync('src/lib/simulation.ts', 'utf8');
const lines = content.split('\n');
const start = lines.findIndex(l => l.includes('function simulateMap('));
let braceCount = 0;
let inFunc = false;
for (let i = start; i < lines.length; i++) {
    if (lines[i].includes('{') && !inFunc) {
        inFunc = true;
    }
    if (inFunc) {
        braceCount += (lines[i].match(/\{/g) || []).length;
        braceCount -= (lines[i].match(/\}/g) || []).length;
        if (braceCount === 0) {
            console.log(lines.slice(i - 20, i + 1).join('\n'));
            break;
        }
    }
}
