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
                  handleUpdateActive({
                      ...activeTournament,
                      settings: {
                          ...activeTournament.settings,
                          bgImage: imgData,
                          bgTheme: 'custom'
                      }
                  });
              };
              reader.readAsDataURL(file);
          }
      };`;

if (content.match(regex)) {
  content = content.replace(regex, newStr);
  fs.writeFileSync(file, content);
  console.log("Patched handleBgUpload");
} else {
  console.log("Could not find handleBgUpload");
}
