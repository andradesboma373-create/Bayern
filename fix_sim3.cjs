const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.tsx', 'utf8');

const target = `      />
    </div>
  );
}

function TeamCard`;

const replace = `      />
    </div>
    </>
  );
}

function TeamCard`;

if (code.includes(target)) {
    code = code.replace(target, replace);
    console.log("Fixed main return close");
} else {
    console.log("Could not find the end of Simulator component.");
}

fs.writeFileSync('src/components/Simulator.tsx', code);
