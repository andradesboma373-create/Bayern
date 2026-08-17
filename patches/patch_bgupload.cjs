const fs = require('fs');
const file = 'src/components/setka_tourn/TournamentManager.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /const handleBgUpload = \(e: React\.ChangeEvent<HTMLInputElement>\) => \{.*?reader\.readAsDataURL\(file\);\s*\}\s*\};/s;

const newStr = `const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
          if (e.target.files && e.target.files[0] && activeTournament) {
              const file = e.target.files[0];
              const reader = new FileReader();
              reader.onload = (ev) => {
                  const imgData = ev.target?.result as string;
                  const img = new Image();
                  img.onload = () => {
                      const canvas = document.createElement('canvas');
                      const ctx = canvas.getContext('2d');
                      const MAX_WIDTH = 1280;
                      const MAX_HEIGHT = 720;
                      let width = img.width;
                      let height = img.height;
                      if (width > height) {
                          if (width > MAX_WIDTH) {
                              height *= MAX_WIDTH / width;
                              width = MAX_WIDTH;
                          }
                      } else {
                          if (height > MAX_HEIGHT) {
                              width *= MAX_HEIGHT / height;
                              height = MAX_HEIGHT;
                          }
                      }
                      canvas.width = width;
                      canvas.height = height;
                      if (ctx) {
                          ctx.drawImage(img, 0, 0, width, height);
                          const compressed = canvas.toDataURL('image/jpeg', 0.5);
                          handleUpdateActive({
                              ...activeTournament,
                              settings: {
                                  ...activeTournament.settings,
                                  bgImage: compressed,
                                  bgTheme: 'custom'
                              }
                          });
                      }
                  };
                  img.src = imgData;
              };
              reader.readAsDataURL(file);
          }
      };`;

if (content.match(regex)) {
  content = content.replace(regex, newStr);
  fs.writeFileSync(file, content);
  console.log("Patched handleBgUpload with compression");
} else {
  console.log("Could not find handleBgUpload");
}
