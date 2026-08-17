import fs from 'fs';
import path from 'path';
let sharp;
try { sharp = (await import('sharp')).default; } catch (e) { console.warn('sharp not found, falling back to copy'); }
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const searchDirs = [
  path.resolve(__dirname, '../public/images'),
  path.resolve(__dirname, '../public/logos'),
  path.resolve(__dirname, '../images')
];
const outputDir = path.resolve(__dirname, '../public/optimized');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function optimizeImages() {
  const supportedExts = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
  const imageNames = [];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) {
      continue;
    }
    
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!supportedExts.includes(ext)) continue;
      
      const name = path.basename(file, ext);
      if (!imageNames.includes(name)) {
        imageNames.push(name);
      }
      
      const inputPath = path.join(dir, file);
      const outputPath = path.join(outputDir, `${name}.webp`);
    
    // Check if the original is an SVG - if so, just copy or leave it, maybe convert to webp if sharp supports it?
    // Sharp supports rendering SVG to WebP.
    // If output exists and is newer than input, skip.
    const inputStat = fs.statSync(inputPath);
    let shouldProcess = true;
    if (fs.existsSync(outputPath)) {
      const outputStat = fs.statSync(outputPath);
      if (outputStat.mtime > inputStat.mtime) {
        shouldProcess = false;
      }
    }
    
    if (shouldProcess) {
      try {
        console.log(`Processing ${file}...`);
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
        }
      } catch (err) {
        console.error(`Error processing ${file}:`, err);
      }
    }
    }
  }
  
  // Generate a JSON file containing all team names to be used by the app for autocomplete
  const teamsListPath = path.resolve(__dirname, '../src/teamsList.json');
  fs.writeFileSync(teamsListPath, JSON.stringify(imageNames, null, 2));
  console.log(`Found ${imageNames.length} teams in public/images. Wrote to src/teamsList.json`);
}

optimizeImages();
