const fs = require('fs');
const file = 'src/components/setka_tourn/storage.ts';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `export const saveTournaments = (userId: string, tournaments: Tournament[]) => {
  localStorage.setItem("tournaments_" + userId, JSON.stringify(tournaments));
  window.dispatchEvent(new Event("tournaments-updated"));
};`;

const newStr = `export const saveTournaments = (userId: string, tournaments: Tournament[]) => {
  try {
    localStorage.setItem("tournaments_" + userId, JSON.stringify(tournaments));
    window.dispatchEvent(new Event("tournaments-updated"));
  } catch (e) {
    console.warn("Storage quota exceeded. Stripping large base64 images from tournaments to save bracket progress...");
    const cleanTournaments = tournaments.map(t => {
      const tc = { ...t };
      if (tc.settings?.bgImage && tc.settings.bgImage.length > 500000) {
          tc.settings = { ...tc.settings, bgImage: undefined };
      }
      if (tc.logoUrl && tc.logoUrl.length > 500000) {
          tc.logoUrl = undefined;
      }
      return tc;
    });
    try {
        localStorage.setItem("tournaments_" + userId, JSON.stringify(cleanTournaments));
        window.dispatchEvent(new Event("tournaments-updated"));
    } catch(err) {
        console.error("Still failed to save after stripping images:", err);
        throw err;
    }
  }
};`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, newStr);
  fs.writeFileSync(file, content);
  console.log("Patched storage.ts saveTournaments logic");
} else {
  console.log("Could not find target in storage.ts");
}
