import fs from 'fs';
let content = fs.readFileSync('src/components/Simulator.tsx', 'utf-8');

if (content.includes('Контракт автоматически продлен на 15 матчей!`')) {
    content = content.replace(
        'Контракт автоматически продлен на 15 матчей!`',
        'Контракт автоматически продлен на 15 матчей! Со счета списано *$${salaryToDeduct.toLocaleString()}*.\\nТекущий баланс: *$${newMoney.toLocaleString()}*.`'
    );
}

fs.writeFileSync('src/components/Simulator.tsx', content);
console.log('patched sim revert');
