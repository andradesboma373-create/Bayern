const fs = require('fs');
const file = 'src/components/Players.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `          onUpdatePlayer={(updated) => {
            handleSaveEdit(updated.id || selectedProfilePlayer.id);
            setSelectedProfilePlayer(null);
          }}`;

const newStr = `          onUpdatePlayer={(updated) => {
            fetchPlayers();
            setSelectedProfilePlayer(null);
          }}`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, newStr);
  fs.writeFileSync(file, content);
  console.log("Patched Players.tsx");
} else {
  console.log("Target string not found in Players.tsx");
}
