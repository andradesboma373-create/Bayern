import sharp from 'sharp';
import fs from 'fs';

const svg = `
<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="black" />
  <text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">Testing Sharp</text>
</svg>
`;

async function test() {
  try {
    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
    fs.writeFileSync('test.png', buffer);
    console.log("Success! buffer length:", buffer.length);
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
