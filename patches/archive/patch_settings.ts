import fs from 'fs';
let content = fs.readFileSync('src/components/Settings.tsx', 'utf-8');

const regex = /\{\/\* Starting Budget Setup \*\/\}.*?<\/p>\n\s*<\/div>\n\s*<\/div>/s;
content = content.replace(regex, '');

fs.writeFileSync('src/components/Settings.tsx', content);
console.log('patched Settings.tsx');
