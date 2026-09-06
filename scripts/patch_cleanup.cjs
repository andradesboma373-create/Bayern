const fs = require('fs');
const file = 'src/components/setka_tourn/TournamentManager.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /if \(needsUpdate\) \{\s*const updated = \{ \.\.\.activeTournament, settings: newSettings \};\s*\/\/ Save migrated settings\s*saveTournament\(userId, updated\);\s*setActiveTournament\(updated\);\s*setTournaments\(loadTournaments\(userId\)\);\s*\}/s;

const newStr = `if (needsUpdate) {
            const updated = { ...activeTournament, settings: newSettings };
            // Save migrated settings
            saveTournament(userId, updated);
            setActiveTournament(updated);
            setTournaments(loadTournaments(userId));
        }
        
        // Always clean up old legacy keys to free space
        try {
            localStorage.removeItem(\`bgtheme_\$\{activeTournament.id\}\`);
            localStorage.removeItem(\`bgimage_\$\{activeTournament.id\}\`);
        } catch(e) {}`;

if (content.match(regex)) {
  content = content.replace(regex, newStr);
  fs.writeFileSync(file, content);
  console.log("Patched cleanup");
} else {
  console.log("Could not find cleanup regex");
}
