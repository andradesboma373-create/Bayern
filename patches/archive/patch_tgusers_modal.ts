import fs from 'fs';
let content = fs.readFileSync('src/components/TgUsers.tsx', 'utf-8');

const modalRegex = /\{editingBalanceUser && \([\s\S]*?\}\)\}/;
content = content.replace(modalRegex, '');

fs.writeFileSync('src/components/TgUsers.tsx', content);
console.log('patched TgUsers modal');
