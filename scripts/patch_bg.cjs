const fs = require('fs');
const file = 'src/components/setka_tourn/TournamentManager.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace state and useEffect for bgImage/bgTheme
const stateRegex = /const \[bgImage, setBgImage\] = useState<string \| null>\(null\);\s*const \[bgTheme, setBgTheme\] = useState<string>\('cyber_grid'\);/;
content = content.replace(stateRegex, `const bgImage = activeTournament?.settings?.bgImage || null;
  const bgTheme = activeTournament?.settings?.bgTheme || 'cyber_grid';`);

// Replace the useEffect that reads from localStorage
const useEffectRegex = /useEffect\(\(\) => \{\s*if \(activeTournament\) \{\s*const stored = localStorage.getItem\(\`bgtheme_\$\{activeTournament.id\}\`\);.*?\}\s*\}\s*\}, \[activeTournament\?\.id\]\);/s;
content = content.replace(useEffectRegex, `useEffect(() => {
    if (activeTournament) {
        let needsUpdate = false;
        const newSettings = { ...activeTournament.settings };
        
        // Migrate from old localStorage
        const storedTheme = localStorage.getItem(\`bgtheme_\$\{activeTournament.id\}\`);
        if (storedTheme && !newSettings.bgTheme) {
            newSettings.bgTheme = storedTheme;
            needsUpdate = true;
        }
        const storedImg = localStorage.getItem(\`bgimage_\$\{activeTournament.id\}\`);
        if (storedImg && !newSettings.bgImage) {
            newSettings.bgImage = storedImg;
            newSettings.bgTheme = 'custom';
            needsUpdate = true;
        }

        if (needsUpdate) {
            const updated = { ...activeTournament, settings: newSettings };
            // Save migrated settings
            saveTournament(userId, updated);
            setActiveTournament(updated);
            setTournaments(loadTournaments(userId));
        }
    }
  }, [activeTournament?.id]);`);

// Update image upload handler
const imgHandlerRegex = /const handleImageUpload = \(e: React\.ChangeEvent<HTMLInputElement>\) => \{.*?reader\.readAsDataURL\(file\);\s*\}\s*\};/s;
content = content.replace(imgHandlerRegex, `const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      };`);

// Update theme select handler
const themeSelectRegex = /const handleThemeSelect = \(themeId: string\) => \{.*?if \(themeId !== 'custom'\) \{.*?\}\s*\};/s;
content = content.replace(themeSelectRegex, `const handleThemeSelect = (themeId: string) => {
          if (activeTournament) {
              const newSettings = { ...activeTournament.settings, bgTheme: themeId };
              if (themeId !== 'custom') {
                  newSettings.bgImage = undefined;
              }
              handleUpdateActive({ ...activeTournament, settings: newSettings });
          }
      };`);

fs.writeFileSync(file, content);
console.log("Patched bgTheme logic in TournamentManager.tsx");
