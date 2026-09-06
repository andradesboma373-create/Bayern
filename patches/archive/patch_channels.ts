import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
    /const CHANNELS = \[\s*\{ username: 'bamep'/g,
    "const CHANNELS = [\n  { username: 'simu', password: 'si0607', channelId: 'channel_simu', channelName: 'simu' },\n  { username: 'bamep'"
);

fs.writeFileSync('src/App.tsx', content);
console.log('patched channels');
