const fs = require('fs');
const file = 'src/components/setka_tourn/storage.ts';
let content = fs.readFileSync(file, 'utf8');

const importStr = "import { db, deleteDoc, doc } from '../../firebase';";
const newImportStr = "import { db, deleteDoc, doc, setDoc } from '../../firebase';";
content = content.replace(importStr, newImportStr);

const saveFuncStart = "export const saveTournament = (userId: string, tournament: Tournament) => {";
const saveFuncEnd = "saveTournaments(userId, all);\n};";

const newSaveFunc = `export const saveTournament = (userId: string, tournament: Tournament) => {
  const all = loadTournaments(userId);
  const index = all.findIndex(t => t.id === tournament.id);
  const tourneyToSave = { ...tournament, channelId: userId, userId: userId };
  if (index >= 0) {
    all[index] = tourneyToSave;
  } else {
    all.push(tourneyToSave);
  }
  saveTournaments(userId, all);

  // Sync to Firestore asynchronously
  if (tournament.id) {
    setDoc(doc(db, 'tournaments', tournament.id), tourneyToSave).catch(err => {
      console.warn("Error saving tournament to Firestore:", err);
    });
  }
};`;

const startIndex = content.indexOf(saveFuncStart);
const endIndex = content.indexOf(saveFuncEnd) + saveFuncEnd.length;

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newSaveFunc + content.substring(endIndex);
  fs.writeFileSync(file, content);
  console.log("Patched storage.ts");
} else {
  console.log("Could not find saveTournament block in storage.ts");
}
