const fs = require('fs');
const file = 'src/components/TeamProfileModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add import
if (!content.includes('TeamAutocompleteInput')) {
  content = content.replace(/import React/, "import { TeamAutocompleteInput } from './TeamAutocompleteInput';\nimport React");
}

const inputPattern = /<input\s+type="text"\s+value=\{editName\}\s+onChange=\{e => setEditName\(e\.target\.value\)\}\s+className="w-full bg-black\/50 border border-white\/10 rounded-xl px-4 py-2\.5 text-white text-sm focus:border-blue-500 focus:outline-none"\s*\/>/;
const replacement = '<TeamAutocompleteInput value={editName} onChange={setEditName} className="bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500 focus:outline-none w-full" placeholder="Название команды" />';

content = content.replace(inputPattern, replacement);

fs.writeFileSync(file, content);
