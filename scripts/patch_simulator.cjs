const fs = require('fs');
const file = 'src/components/Simulator.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add import
if (!content.includes('TeamAutocompleteInput')) {
  content = content.replace(/import React/, "import { TeamAutocompleteInput } from './TeamAutocompleteInput';\nimport React");
}

const inputPattern = /<input\s+type="text"\s+placeholder="Поиск команды\.\.\."\s+value=\{teamSearch\}\s+onChange=\{\(e\) => setTeamSearch\(e\.target\.value\)\}\s+className="bg-black\/50 border border-white\/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-\[#ff8f00\] font-bold"\s*\/>/;
const replacement = '<TeamAutocompleteInput value={teamSearch} onChange={setTeamSearch} className="bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#ff8f00] font-bold" placeholder="Поиск команды..." />';

content = content.replace(inputPattern, replacement);

fs.writeFileSync(file, content);
