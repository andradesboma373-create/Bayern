const fs = require('fs');
console.log(fs.readFileSync('src/components/Teams.tsx', 'utf8').includes('updateDoc(doc(db, '));
