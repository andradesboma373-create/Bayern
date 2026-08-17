import re
with open('src/components/setka_tourn/MatchCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { Match } from './types';", "import { Match, Team } from './types';")

with open('src/components/setka_tourn/MatchCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
