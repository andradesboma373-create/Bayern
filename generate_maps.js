import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const maps = ['train', 'overpass', 'vertigo', 'zone9', 'cobblestone'];
const outDir = path.resolve('public', 'maps');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function createPlaceholder(name) {
  const svg = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#2a2a35"/>
      <text x="50%" y="50%" font-family="Arial" font-size="60" fill="#ffffff" dominant-baseline="middle" text-anchor="middle">${name.toUpperCase()}</text>
    </svg>`;
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 90 })
    .toFile(path.join(outDir, name + '.jpg'));
  console.log('Created ' + name);
}

Promise.all(maps.map(createPlaceholder));
