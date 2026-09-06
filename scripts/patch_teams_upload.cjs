const fs = require('fs');
const file = 'src/components/Teams.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex1 = /reader\.onload = async \(e\) => \{[\s\S]*?const base64String = e\.target\?\.result as string;[\s\S]*?await handleUpdateTeam\(team\.id, \{ logoUrl: base64String \}\);/m;

const newStr1 = `reader.onload = async (e) => {
      const rawBase64 = e.target?.result as string;
      if (!rawBase64) return;
      const img = new Image();
      img.onload = async () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const MAX = 200;
          let w = img.width;
          let h = img.height;
          if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
          else { if (h > MAX) { w *= MAX / h; h = MAX; } }
          canvas.width = w; canvas.height = h;
          if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              const compressed = canvas.toDataURL('image/png');
              try {
                  await handleUpdateTeam(team.id, { logoUrl: compressed });
              } catch (e) {
                  alert("Ошибка при сохранении логотипа.");
              }
          }
      };
      img.src = rawBase64;`;

if (content.match(regex1)) {
    content = content.replace(regex1, newStr1);
    console.log("Patched 1");
}

const regex2 = /reader\.onload = async \(event\) => \{[\s\S]*?setNewTeamLogo\(rawBase64\);\s*\};/m;
const newStr2 = `reader.onload = async (event) => {
      const rawBase64 = event.target?.result as string;
      if (!rawBase64) return;
      const img = new Image();
      img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const MAX = 200;
          let w = img.width;
          let h = img.height;
          if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
          else { if (h > MAX) { w *= MAX / h; h = MAX; } }
          canvas.width = w; canvas.height = h;
          if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              setNewTeamLogo(canvas.toDataURL('image/png'));
          }
      };
      img.src = rawBase64;
    };`;

if (content.match(regex2)) {
    content = content.replace(regex2, newStr2);
    console.log("Patched 2");
}

fs.writeFileSync(file, content);
