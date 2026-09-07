import fs from 'fs';
const topTeams = [
  "Natus Vincere", "Vitality", "FaZe Clan", "G2 Esports", "Team Spirit", "MOUZ", 
  "Virtus.pro", "Cloud9", "Complexity", "HEROIC", "Astralis", "ENCE", "Team Liquid", 
  "Falcons", "FURIA", "The MongolZ", "BIG", "GamerLegion", "Ninjas in Pyjamas", 
  "fnatic", "MIBR", "9z Team", "Monte", "Apeks", "BetBoom Team", "Aurora", 
  "AMKAL", "3DMAX", "SAW", "Imperial", "paiN Gaming", "FlyQuest", "Lynn Vision", 
  "Wildcard", "M80", "Legacy", "Nemiga", "OG", "Rebels", "TyLoo", "Rooster", 
  "Grayhound", "Bad News Eagles", "Into The Breach", "FORZE", "B8", "Preasy", "Endpoint"
];

// Write this nice list to teamsList.json
fs.writeFileSync('src/teamsList.json', JSON.stringify(topTeams, null, 2));
console.log("Updated teamsList.json with " + topTeams.length + " real teams.");
