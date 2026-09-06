import sys
import re

with open('src/App.tsx', 'r') as f:
    app = f.read()

app = app.replace("import { loadTournaments } from './components/setka_tourn/storage';", "")
app = "import { loadTournaments } from './components/setka_tourn/storage';\n" + app

with open('src/App.tsx', 'w') as f:
    f.write(app)

with open('src/lib/simulation.ts', 'r') as f:
    sim = f.read()

sim = re.sub(r'(p as any)\?\.(fk|fd|k1|k2|k3|k4|k5|hs)', r'((p as any).\2 || 0)', sim)

with open('src/lib/simulation.ts', 'w') as f:
    f.write(sim)
