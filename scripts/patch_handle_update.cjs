const fs = require('fs');
const file = 'src/components/setka_tourn/TournamentManager.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetRegex = /saveTournament\(userId, toSave\);\s*setActiveTournament\(toSave\);\s*setTournaments\(loadTournaments\(userId\)\);/;
const replacement = `try {
          saveTournament(userId, toSave);
          setActiveTournament(toSave);
          setTournaments(loadTournaments(userId));
      } catch (e) {
          console.warn("Could not save to localStorage due to size limit. Attempting to bypass local cache...");
          // Fallback if local storage quota exceeded: Try to save just to Firestore directly!
          if (toSave.id) {
            import('../../firebase').then(({ db, doc, setDoc }) => {
               setDoc(doc(db, "tournaments", toSave.id), toSave).then(() => {
                 setActiveTournament(toSave);
               }).catch(err => alert("Критическая ошибка сохранения: " + err.message));
            }).catch(console.error);
          } else {
             alert("Ошибка памяти устройства. Слишком много больших картинок.");
          }
      }`;

if (content.match(targetRegex)) {
  content = content.replace(targetRegex, replacement);
  fs.writeFileSync(file, content);
  console.log("Patched handleUpdateActive");
} else {
  console.log("Could not find target in handleUpdateActive");
}
