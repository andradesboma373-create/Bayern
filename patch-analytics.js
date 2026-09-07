const fs = require('fs');
let code = fs.readFileSync('src/components/AdminAnalytics.tsx', 'utf-8');

code = code.replace(
`      if (!statsRes.ok || !roomsRes.ok) {
        throw new Error('Ошибка при загрузке аналитики серверов');
      }`,
`      if (!statsRes.ok) {
        const text = await statsRes.text();
        throw new Error(\`Ошибка квот (\${statsRes.status}): \${text.substring(0, 100)}\`);
      }
      if (!roomsRes.ok) {
        const text = await roomsRes.text();
        throw new Error(\`Ошибка комнат (\${roomsRes.status}): \${text.substring(0, 100)}\`);
      }`
);

fs.writeFileSync('src/components/AdminAnalytics.tsx', code);
console.log('Patched AdminAnalytics.tsx');
