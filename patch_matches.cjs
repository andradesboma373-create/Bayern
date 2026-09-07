const fs = require('fs');
let code = fs.readFileSync('src/components/Matches.tsx', 'utf8');

if (!code.includes('limit(')) {
    code = code.replace(
        "import { collection, query, where, getDocs, deleteDoc, doc } from '../firebase';",
        "import { collection, query, where, getDocs, deleteDoc, doc, limit, orderBy } from '../firebase';"
    );
    
    code = code.replace(
        "const q = query(collection(db, 'matches'), where('userId', '==', user.uid));",
        "const q = query(collection(db, 'matches'), where('userId', '==', user.uid), orderBy('date', 'desc'), limit(150));"
    );
    
    code = code.replace(
        "const qChannel = query(collection(db, 'matches'), where('channelId', '==', user.uid));",
        "const qChannel = query(collection(db, 'matches'), where('channelId', '==', user.uid), orderBy('date', 'desc'), limit(150));"
    );
    
    fs.writeFileSync('src/components/Matches.tsx', code);
    console.log("Patched Matches.tsx");
} else {
    console.log("Already patched");
}
