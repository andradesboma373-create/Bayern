const fs = require('fs');
const file = 'src/components/Simulator.tsx';
let content = fs.readFileSync(file, 'utf8');

const inputPattern = /<input\s+type="text"\s+value=\{nameValue\}\s+onChange=\{\(e\) => onNameChange\(e\.target\.value\)\}\s+className="bg-transparent border-none text-xl font-black tracking-wider text-white focus:outline-none w-full border-b border-white\/10 pb-1 mb-1 focus:border-white\/30"\s+placeholder=\{nameLabel\}\s*\/>/;
const replacement = '<TeamAutocompleteInput value={nameValue} onChange={onNameChange} className="bg-transparent border-none text-xl font-black tracking-wider text-white focus:outline-none w-full border-b border-white/10 pb-1 mb-1 focus:border-white/30" placeholder={nameLabel} />';

content = content.replace(inputPattern, replacement);

fs.writeFileSync(file, content);
