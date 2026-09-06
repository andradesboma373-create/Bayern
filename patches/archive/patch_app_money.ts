import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

if (!content.includes('const currentBalance =')) {
    content = content.replace(
        "const currentOrg = dbUser && dbUser.teamName ? dbUser.teamName : 'Без организации 🚫';",
        "const currentBalance = dbUser && dbUser.money !== undefined ? dbUser.money : 1000000;\n  const currentOrg = dbUser && dbUser.teamName ? dbUser.teamName : 'Без организации 🚫';"
    );
}

if (!content.includes('💰 $')) {
    content = content.replace(
        '<div className="flex items-center gap-6">',
        '<div className="flex items-center gap-6">\n        <div className="flex items-center gap-2 bg-yellow-500/10 px-4 py-2 rounded-xl border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.05)]">\n          <span className="text-yellow-500 font-bold font-mono">💰 $ {currentBalance.toLocaleString()}</span>\n        </div>'
    );
}

fs.writeFileSync('src/App.tsx', content);
console.log('patched app money');
