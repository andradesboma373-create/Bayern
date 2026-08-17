const fs = require('fs');
const file = 'src/components/setka_tourn/storage.ts';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `const firestoreTourney = { ...tourneyToSave };`;

const newStr = `const firestoreTourney = { ...tourneyToSave };
    if (firestoreTourney.settings?.bgImage && firestoreTourney.settings.bgImage.length > 300000) {
        firestoreTourney.settings = { ...firestoreTourney.settings, bgImage: undefined };
    }`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, newStr);
  fs.writeFileSync(file, content);
  console.log("Patched storage.ts firestore sync logic to strip huge bgImage");
} else {
  console.log("Could not find target in storage.ts");
}
