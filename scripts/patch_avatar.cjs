const fs = require('fs');
const file = 'src/components/PlayerProfileModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /if \(editAvatarUrl\.trim\(\)\) \{\s*localStorage\.setItem\(\s*`player_avatar_\$\{editNickname\.trim\(\)\.toLowerCase\(\)\}`,\s*editAvatarUrl\.trim\(\),\s*\);\s*\}/s;

const newStr = `if (editAvatarUrl.trim()) {
      localStorage.setItem(
        \`player_avatar_\$\{editNickname.trim().toLowerCase()\}\`,
        editAvatarUrl.trim(),
      );
    } else {
      localStorage.removeItem(\`player_avatar_\$\{editNickname.trim().toLowerCase()\}\`);
    }`;

if (content.match(regex)) {
  content = content.replace(regex, newStr);
  fs.writeFileSync(file, content);
  console.log("Patched PlayerProfileModal avatar storage");
} else {
  console.log("Could not find regex in PlayerProfileModal");
}
