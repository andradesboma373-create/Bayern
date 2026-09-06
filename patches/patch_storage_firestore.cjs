const fs = require('fs');
const file = 'src/components/setka_tourn/storage.ts';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `if (tournament.id) {
    setDoc(doc(db, "tournaments", tournament.id), tourneyToSave).catch(`;

const newStr = `if (tournament.id) {
    const firestoreTourney = { ...tourneyToSave };
    if (firestoreTourney.teams) {
       firestoreTourney.teams = firestoreTourney.teams.map(t => {
           if (t.logoUrl && t.logoUrl.length > 300000) {
               return { ...t, logoUrl: undefined };
           }
           return t;
       });
    }
    setDoc(doc(db, "tournaments", tournament.id), firestoreTourney).catch(`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, newStr);
  fs.writeFileSync(file, content);
  console.log("Patched storage.ts firestore sync logic to strip huge team logos");
} else {
  console.log("Could not find target in storage.ts");
}
