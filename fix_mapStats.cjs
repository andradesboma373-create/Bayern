const fs = require('fs');
let code = fs.readFileSync('src/lib/mapStats.ts', 'utf8');

// Replace the sequential, full-array Firestore sync with a selective, parallel sync
code = code.replace(
  /for \(const stat of updatedStats\) {\s+const docId = `\${userId}_\${stat\.id}`;\s+await setDoc\(doc\(db, 'mapStats', docId\), stat, \{ merge: true \}\);\s+}/,
  `const changedIds = new Set();
      for (const m of mapsPlayed) {
          if (m.mapName) {
              changedIds.add(\`\${team1Name.toLowerCase().trim()}_\${m.mapName.toLowerCase().trim()}\`);
              changedIds.add(\`\${team2Name.toLowerCase().trim()}_\${m.mapName.toLowerCase().trim()}\`);
          }
      }
      
      const promises = updatedStats
        .filter(stat => changedIds.has(stat.id))
        .map(stat => setDoc(doc(db, 'mapStats', \`\${userId}_\${stat.id}\`), stat, { merge: true }));
        
      await Promise.all(promises);`
);

fs.writeFileSync('src/lib/mapStats.ts', code);
console.log("Fixed mapStats");
