import fs from 'fs';
let content = fs.readFileSync('src/components/TgUsers.tsx', 'utf-8');

// The big button in Card view? Wait, it's Card view vs Table view.
// Let's use regex to replace `<button onClick={() => handleOpenBalanceEdit(u)} ... </button>`

const rx1 = /<button\s+onClick=\{\(\) => handleOpenBalanceEdit\(u\)\}\s+className="flex items-center gap-1\.5 px-3 py-2 bg-yellow-500\/10 text-yellow-500 hover:bg-yellow-500\/20 rounded-xl transition-all border border-yellow-500\/10 text-xs font-bold cursor-pointer"\s+title="Изменить баланс"\s*>\s*<Coins className="w-3\.5 h-3\.5" \/>\s*Баланс\s*<\/button>/g;
content = content.replace(rx1, '');

const rx2 = /<button\s+onClick=\{\(\) => handleOpenBalanceEdit\(u\)\}\s+className="p-1\.5 bg-yellow-500\/10 text-yellow-500 hover:bg-yellow-500\/20 rounded-lg transition-all border border-yellow-500\/10"\s+title="Изменить баланс"\s*>\s*<Coins className="w-4 h-4" \/>\s*<\/button>/g;
content = content.replace(rx2, '');

fs.writeFileSync('src/components/TgUsers.tsx', content);
console.log('patched TgUsers buttons');
