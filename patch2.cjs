const fs = require('fs');
let code = fs.readFileSync('src/components/AdminAnalytics.tsx', 'utf8');

// Wrap everything from {/* Rooms Table */} to the end of the file in {isSuperAdmin && ( ... )} (except the last `</div>` and `);`)
// We'll just replace {/* Rooms Table */} with `{isSuperAdmin && ( <> {/* Rooms Table */} `
// and right before the final `</div>\n  );\n}` we will add `</> )}`

code = code.replace('{/* Rooms Table */}', '{isSuperAdmin && ( <>\n      {/* Rooms Table */}');
code = code.replace(/    <\/div>\n  \);\n}/, '      </>\n      )}\n    </div>\n  );\n}');

fs.writeFileSync('src/components/AdminAnalytics.tsx', code);
