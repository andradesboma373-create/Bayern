const fs = require('fs');
const file = 'src/components/Teams.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/try \{\s*const compressedBase64 = await compressImage\(rawBase64, 128, 128\);\s*setNewTeamLogo\(compressedBase64\);\s*\} catch \(err\) \{\s*console\.error\(err\);\s*\}/, 'setNewTeamLogo(rawBase64);');

content = content.replace(/<div className="flex-1 flex flex-col gap-2">\s*<input required type="text" value=\{newTeamName\}.*?\/>\s*<input type="text".*?\/>\s*<\/div>/s, '<input required type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ff8f00] font-black text-xl" placeholder="NAVI" />');

// also replace the first compressImage call:
content = content.replace(/const compressedBase64 = await compressImage\(rawBase64, 128, 128\);/, 'const compressedBase64 = rawBase64;');

fs.writeFileSync(file, content);
