import fs from 'fs';
let content = fs.readFileSync('src/components/Simulator.tsx', 'utf-8');

// The notification text:
content = content.replace(
    'Контракт автоматически продлен на 15 матчей! Со счета списано *$${salaryToDeduct.toLocaleString()}*.\nТекущий баланс: *$${newMoney.toLocaleString()}*.`',
    'Контракт автоматически продлен на 15 матчей!`'
);

fs.writeFileSync('src/components/Simulator.tsx', content);
console.log('patched Simulator.tsx');
