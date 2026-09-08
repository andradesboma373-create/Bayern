const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const newSave = `  private saveTimeout: any = null;
  private save() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      try {
        fs.writeFile(this.cachePath, JSON.stringify(this.data, null, 2), 'utf8', (err) => {
           if(err) console.error("Error saving local database cache to disk:", err.message);
        });
      } catch (err: any) {
        console.error("Error saving local database cache to disk:", err.message);
      }
    }, 2000);
  }`;

code = code.replace(
  /  private save\(\) \{\s+try \{\s+fs\.writeFileSync\(this\.cachePath, JSON\.stringify\(this\.data, null, 2\), 'utf8'\);\s+\} catch \(err: any\) \{\s+console\.error\("Error saving local database cache to disk:", err\.message\);\s+\}\s+\}/,
  newSave
);

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts FallbackDB save");
