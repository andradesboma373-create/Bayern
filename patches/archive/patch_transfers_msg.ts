import fs from 'fs';
let content = fs.readFileSync('src/components/Transfers.tsx', 'utf-8');

content = content.replace(
    'Баланс менеджера уменьшен на $ ${fftOfferSalary.toLocaleString()}.',
    ''
);

fs.writeFileSync('src/components/Transfers.tsx', content);
console.log('patched msg');
