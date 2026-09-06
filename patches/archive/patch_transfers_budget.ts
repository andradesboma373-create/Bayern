import fs from 'fs';
let content = fs.readFileSync('src/components/Transfers.tsx', 'utf-8');

content = content.replace(
    /\{locked \? ' \(На Туре - LOCK\)' : ` \(\$ \$\{budget\.toLocaleString\(\)\}\)`\}/g,
    "{locked ? ' (На Туре - LOCK)' : ''}"
);

fs.writeFileSync('src/components/Transfers.tsx', content);
console.log('patched Transfers.tsx line 910');
