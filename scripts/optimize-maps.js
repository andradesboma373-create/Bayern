import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mapsDir = path.resolve(__dirname, '../public/maps');
const outputListPath = path.resolve(__dirname, '../src/mapsList.json');

const supportedExts = ['.jpg', '.jpeg', '.png', '.webp'];
const mapNames = [];

if (fs.existsSync(mapsDir)) {
  const files = fs.readdirSync(mapsDir);
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (supportedExts.includes(ext)) {
      const name = path.basename(file, ext);
      if (!mapNames.includes(name)) {
        mapNames.push(name);
      }
    }
  }
}

fs.writeFileSync(outputListPath, JSON.stringify(mapNames, null, 2));
console.log(`Found ${mapNames.length} maps in public/maps. Wrote to src/mapsList.json`);
