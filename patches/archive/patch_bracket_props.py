import re

with open('src/components/setka_tourn/BracketRenderer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("  allTeams?: {id: string, name: string}[];", "  allTeams?: {id: string, name: string}[];\n  onVetoMatch?: (team1: Team, team2: Team) => void;")

with open('src/components/setka_tourn/BracketRenderer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/components/setka_tourn/MatchCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if "onVetoMatch?: (team1: Team, team2: Team)" not in content:
    content = content.replace("  allTeams?: {id: string, name: string}[];", "  allTeams?: {id: string, name: string}[];\n  onVetoMatch?: (team1: Team, team2: Team) => void;")
    with open('src/components/setka_tourn/MatchCard.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

