const fs = require('fs');
const file = 'src/components/Simulator.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('TeamAutocompleteInput')) {
  // It shouldn't get here, but just in case
}
if (!content.includes('import { TeamAutocompleteInput }')) {
  content = content.replace(/import React/, "import { TeamAutocompleteInput } from './TeamAutocompleteInput';\nimport React");
}

fs.writeFileSync(file, content);
