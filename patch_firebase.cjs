const fs = require('fs');
let code = fs.readFileSync('src/firebase.ts', 'utf8');

code += "\nexport function limit(n: number) { return { field: 'limit', op: 'limit', value: n }; }\n";
fs.writeFileSync('src/firebase.ts', code);
console.log("Added limit to firebase.ts");
