const fs = require('fs');
let code = fs.readFileSync('src/components/setka_tourn/MatchVetoModal.tsx', 'utf8');

const target = `    </div>
  );
}`;

const replace = `    </div>
    </>
  );
}`;

if (code.includes(target)) {
    code = code.replace(target, replace);
    console.log("Fixed MatchVetoModal");
} else {
    console.log("Could not find end of MatchVetoModal");
}

fs.writeFileSync('src/components/setka_tourn/MatchVetoModal.tsx', code);
