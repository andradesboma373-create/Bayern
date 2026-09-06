const fs = require('fs');
const file = 'scripts/optimize-logos.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /console\.log\(`Optimizing \$\{file\}\.\.\.`\);\s*await sharp\(inputPath\)\s*\.resize\(\{[\s\S]*?\}\)\s*\.webp\(\{ quality: 85 \}\)\s*\.toFile\(outputPath\);/;

const replacement = `console.log(\`Processing \${file}...\`);
        if (sharp) {
          await sharp(inputPath)
            .resize({
              width: 1024,
              height: 1024,
              fit: 'inside',
              withoutEnlargement: true,
            })
            .webp({ quality: 85 })
            .toFile(outputPath);
        } else {
          fs.copyFileSync(inputPath, outputPath);
        }`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
