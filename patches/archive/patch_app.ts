import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
    '  const currentBalance = dbUser && dbUser.money !== undefined ? dbUser.money : 1000000;\n',
    ''
);

content = content.replace(
    '        <div className="flex items-center gap-2 bg-yellow-500/10 px-4 py-2 rounded-xl border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.05)]">\n          <span className="text-yellow-500 font-bold font-mono">💰 $ {currentBalance.toLocaleString()}</span>\n        </div>\n',
    ''
);

fs.writeFileSync('src/App.tsx', content);
console.log('patched app');
