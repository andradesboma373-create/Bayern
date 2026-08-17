const fs = require('fs');
const file = 'src/components/setka_tourn/types.ts';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `  bgOpacity?: number;
}`;

const newStr = `  bgOpacity?: number;
  bgTheme?: string;
  bgImage?: string;
}`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, newStr);
  fs.writeFileSync(file, content);
  console.log("Patched types.ts");
} else {
  console.log("Target string not found in types.ts");
}
