import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

const apiBlock = `
// Resolvers for images to avoid client 404 spam
app.get('/api/avatar/:name', (req, res) => {
  const name = req.params.name.trim();
  if (!name) return res.status(404).send('Not found');
  
  const lowerName = name.toLowerCase();
  const noSpaces = lowerName.replace(/\\s+/g, '');
  const underscore = lowerName.replace(/\\s+/g, '_');
  const hyphen = lowerName.replace(/\\s+/g, '-');
  
  const extensions = ['.webp', '.png', '.jpg', '.svg'];
  const searchDirs = process.env.NODE_ENV === 'production' 
    ? [path.join(process.cwd(), 'dist', 'avatars'), path.join(process.cwd(), 'dist', 'avatars2')]
    : [path.join(process.cwd(), 'public', 'avatars'), path.join(process.cwd(), 'public', 'avatars2')];

  let foundPath = null;
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const ext of extensions) {
      for (const variant of [lowerName, underscore, hyphen, noSpaces, name]) {
        const check = path.join(dir, variant + ext);
        if (fs.existsSync(check)) {
          foundPath = check;
          break;
        }
      }
      if (foundPath) break;
    }
    if (foundPath) break;
  }

  if (foundPath) {
    res.sendFile(foundPath);
  } else {
    res.redirect(\`https://ui-avatars.com/api/?name=\${encodeURIComponent(name)}&background=222338&color=ff8f00&bold=true\`);
  }
});

app.get('/api/logo/:name', (req, res) => {
  const name = req.params.name.trim();
  if (!name) return res.status(404).send('Not found');
  
  const lowerName = name.toLowerCase();
  const noSpaces = lowerName.replace(/\\s+/g, '');
  const underscore = lowerName.replace(/\\s+/g, '_');
  const hyphen = lowerName.replace(/\\s+/g, '-');
  
  const extensions = ['.svg', '.png', '.webp', '.jpg'];
  const searchDirs = process.env.NODE_ENV === 'production' 
    ? [path.join(process.cwd(), 'dist', 'logos')]
    : [path.join(process.cwd(), 'public', 'logos')];

  let foundPath = null;
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const ext of extensions) {
      for (const variant of [lowerName, underscore, hyphen, noSpaces, name]) {
        const check = path.join(dir, variant + ext);
        if (fs.existsSync(check)) {
          foundPath = check;
          break;
        }
      }
      if (foundPath) break;
    }
    if (foundPath) break;
  }

  if (foundPath) {
    res.sendFile(foundPath);
  } else {
    const text = name.substring(0, 3).toUpperCase();
    res.redirect(\`https://ui-avatars.com/api/?name=\${encodeURIComponent(text)}&background=000000&color=ffffff&bold=true&rounded=true\`);
  }
});
`;

if (!code.includes('/api/avatar/:name')) {
  // Make sure we import fs and path at the top of server.ts if not there
  if (!code.includes("import fs from 'fs'")) {
      code = "import fs from 'fs';\n" + code;
  }
  code = code.replace('const app = express();', 'const app = express();\n' + apiBlock);
  fs.writeFileSync('server.ts', code);
  console.log('Patched server.ts');
} else {
  console.log('Already patched');
}
