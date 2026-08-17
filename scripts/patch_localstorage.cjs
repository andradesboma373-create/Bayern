const fs = require('fs');
const file = 'src/main.tsx';
let content = fs.readFileSync(file, 'utf8');

const patchCode = `
// Monkey-patch localStorage to prevent QuotaExceededError from crashing the app
const originalSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = function(key, value) {
  try {
    originalSetItem.apply(this, [key, value]);
  } catch (e) {
    console.warn("LocalStorage quota exceeded when setting key:", key, ". Ignoring error to prevent app crash.");
  }
};
`;

if (!content.includes('Monkey-patch localStorage')) {
  // Find last import
  const lastImportIndex = content.lastIndexOf('import ');
  let insertIndex = content.indexOf('\n', lastImportIndex) + 1;
  content = content.slice(0, insertIndex) + patchCode + content.slice(insertIndex);
  fs.writeFileSync(file, content);
  console.log("Patched src/main.tsx");
} else {
  console.log("Already patched");
}
