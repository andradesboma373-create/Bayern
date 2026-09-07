import fs from 'fs';
import sharp from 'sharp';

const maps = [
  { name: 'breeze', color: '#5da0a8', text: 'BREEZE' },
  { name: 'dune', color: '#d1b98b', text: 'DUNE' },
  { name: 'province', color: '#8a9b7f', text: 'PROVINCE' },
  { name: 'rust', color: '#a66a50', text: 'RUST' },
  { name: 'sakura', color: '#d58f9d', text: 'SAKURA' },
  { name: 'sandstone', color: '#d1b98b', text: 'SANDSTONE' }
];

async function generate() {
  for (const m of maps) {
    const svg = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="${m.color}" />
        <text x="200" y="150" font-family="sans-serif" font-size="40" font-weight="bold" fill="rgba(0,0,0,0.5)" text-anchor="middle" alignment-baseline="middle">${m.text}</text>
      </svg>
    `;
    await sharp(Buffer.from(svg))
      .jpeg()
      .toFile(`public/maps/${m.name}.jpg`);
  }
}
generate();
