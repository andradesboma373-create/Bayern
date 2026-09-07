const fs = require('fs');
let code = fs.readFileSync('src/components/Transfers.tsx', 'utf8');

if (!code.includes("import PlayerAvatar from")) {
    code = code.replace(
        "import React, { useState, useEffect } from 'react';",
        "import React, { useState, useEffect } from 'react';\nimport PlayerAvatar from './PlayerAvatar';"
    );
    fs.writeFileSync('src/components/Transfers.tsx', code);
    console.log("Patched Transfers.tsx");
} else {
    console.log("Already imported");
}
