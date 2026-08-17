import re
with open('src/components/setka_tourn/SingleEliminationStage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { Match, Tournament } from './types';", "import { Match, Tournament, Team } from './types';")

with open('src/components/setka_tourn/SingleEliminationStage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Also check BracketRenderer.tsx
with open('src/components/setka_tourn/BracketRenderer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
if "import { Match, Team" not in content and "import { Match, Tournament, Team" not in content:
    content = content.replace("import { Match } from './types';", "import { Match, Team } from './types';")
    with open('src/components/setka_tourn/BracketRenderer.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

