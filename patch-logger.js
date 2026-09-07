import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');
if (!code.includes('app.use((req, res, next) => { console.log')) {
  code = code.replace('const app = express();', 'const app = express();\napp.use((req, res, next) => { console.log("[DEBUG] Incoming request:", req.method, req.url); next(); });');
  fs.writeFileSync('server.ts', code);
  console.log('Logger added.');
}
