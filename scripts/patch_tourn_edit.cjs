const fs = require('fs');
const file = 'src/components/setka_tourn/TournamentSettingsForm.tsx';
let content = fs.readFileSync(file, 'utf8');

const inputPattern = /<input\s+type="text"\s+value=\{editingTeamName\}\s+onChange=\{e => setEditingTeamName\(e\.target\.value\)\}\s+onKeyDown=\{e => \{\s+if \(e\.key === 'Enter'\) handleUpdateTeam\(t\.id\);\s+\}\}\s+className="bg-black text-white px-2 py-0\.5 rounded outline-none border border-\[#ff8f00\]\/50 flex-1"\s+autoFocus\s*\/>/;
const replacement = '<TeamAutocompleteInput value={editingTeamName} onChange={setEditingTeamName} onSelect={() => handleUpdateTeam(t.id)} className="bg-black text-white px-2 py-0.5 rounded outline-none border border-[#ff8f00]/50 flex-1" />';

content = content.replace(inputPattern, replacement);

fs.writeFileSync(file, content);
