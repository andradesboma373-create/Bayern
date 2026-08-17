const fs = require('fs');
const file = 'src/components/Teams.tsx';
let content = fs.readFileSync(file, 'utf8');

const inputPattern = /<input type="text" placeholder="Поиск команд\.\.\." value=\{searchQuery\} onChange=\{e => \{ setSearchQuery\(e\.target\.value\); setCurrentPage\(1\); \}\} className="w-full bg-\[#12121a\] border border-white\/5 rounded-xl pl-10 pr-4 py-2\.5 text-white text-sm focus:outline-none focus:border-\[#ff8f00\] transition-colors" \/>/;
const replacement = '<TeamAutocompleteInput value={searchQuery} onChange={(v) => { setSearchQuery(v); setCurrentPage(1); }} className="bg-[#12121a] border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ff8f00] transition-colors w-full" placeholder="Поиск команд..." />';

content = content.replace(inputPattern, replacement);

fs.writeFileSync(file, content);
