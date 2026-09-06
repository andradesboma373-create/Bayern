const fs = require('fs');
const file = 'src/components/News.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/<button\s*onClick=\{\(\) => setSelectedBg\('custom_url'\)\}[\s\S]*?<\/button>/, '');
content = content.replace(/\{\(selectedBg === 'custom_url' \|\| selectedBg\.startsWith\('http'\) \|\| selectedBg\.startsWith\('data:'\)\) && \([\s\S]*?<\/div>\s*\)\}/, '');

fs.writeFileSync(file, content);
