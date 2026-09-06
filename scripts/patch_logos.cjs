const fs = require('fs');
const file = 'scripts/optimize-logos.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import sharp from 'sharp';", "let sharp;\ntry { sharp = (await import('sharp')).default; } catch (e) { console.warn('sharp not found, falling back to copy'); }");

const targetCode = `        console.log(\`Optimizing \${file}...\`);
        await sharp(inputPath)
          .resize({
            width: 1024,
            height: 1024,
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: 85, effort: 6 })
          .toFile(outputPath);`;

const replacementCode = `        console.log(\`Processing \${file}...\`);
        if (sharp) {
          await sharp(inputPath)
            .resize({
              width: 1024,
              height: 1024,
              fit: 'inside',
              withoutEnlargement: true
            })
            .webp({ quality: 85, effort: 6 })
            .toFile(outputPath);
        } else {
          fs.copyFileSync(inputPath, outputPath);
        }`;

content = content.replace(targetCode, replacementCode);

fs.writeFileSync(file, content);
