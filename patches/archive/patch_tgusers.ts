import fs from 'fs';
let content = fs.readFileSync('src/components/TgUsers.tsx', 'utf-8');

// Table header
content = content.replace('<th className="p-4 font-bold">Бюджет</th>', '');

// Table row
content = content.replace(/<td className="p-4 font-mono font-bold text-\[#ff8f00\]">\s*\$\{\(u\.money \|\| 0\)\.toLocaleString\(\)\}\s*<\/td>/, '');

// Card view (mobile)
content = content.replace(/<div className="flex-1 bg-black\/20 rounded-xl p-3 border border-white\/5">\s*<p className="text-\[10px\] text-white\/40 uppercase font-black tracking-widest mb-1">Бюджет<\/p>\s*<p className="text-sm font-mono font-bold text-\[#ff8f00\]">\s*\$\{\(u\.money \|\| 0\)\.toLocaleString\(\)\}\s*<\/p>\s*<\/div>/, '');

fs.writeFileSync('src/components/TgUsers.tsx', content);
console.log('patched TgUsers');
