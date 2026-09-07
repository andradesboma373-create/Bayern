import fs from 'fs';
import path from 'path';

const logosDir = path.join(process.cwd(), 'public', 'logos');
const files = fs.readdirSync(logosDir);

let validNames = new Set();
for (const f of files) {
  const base = f.replace(/\.[^.]+$/, '');
  // Skip overly short nonsense or technical aliases unless they are real
  if (base.length <= 2 && !['g2', '9z', 'b8', 'og', 'v', 'vp'].includes(base)) continue;
  // Skip ones with underscores
  if (base.includes('_')) continue;
  
  validNames.add(base);
}

// Add our curated names to ensure nice capitalization
const topTeams = [
  "Natus Vincere", "Vitality", "FaZe Clan", "G2 Esports", "Team Spirit", "MOUZ", 
  "Virtus.pro", "Cloud9", "Complexity", "HEROIC", "Astralis", "ENCE", "Team Liquid", 
  "Falcons", "FURIA", "The MongolZ", "BIG", "GamerLegion", "Ninjas in Pyjamas", 
  "fnatic", "MIBR", "9z Team", "Monte", "Apeks", "BetBoom Team", "Aurora", 
  "AMKAL", "3DMAX", "SAW", "Imperial", "paiN Gaming", "FlyQuest", "Lynn Vision", 
  "Wildcard", "M80", "Legacy", "Nemiga", "OG", "Rebels", "TyLoo", "Rooster", 
  "Grayhound", "Bad News Eagles", "Into The Breach", "FORZE", "B8", "Preasy", "Endpoint",
  "NAVI"
];

topTeams.forEach(t => validNames.add(t));

const finalArray = Array.from(validNames).sort();
fs.writeFileSync('src/teamsList.json', JSON.stringify(finalArray, null, 2));
console.log("Updated teamsList.json with " + finalArray.length + " real teams based on logo files.");
