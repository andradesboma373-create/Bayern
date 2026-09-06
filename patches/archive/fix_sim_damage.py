with open('src/lib/simulation.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'const stat = mapResult.team1Stats.find(s => s.id === p.id);',
    'const stat = mapResult.team1Stats.find(s => s.nickname === p.nickname || (s.id && s.id === p.id));'
)
content = content.replace(
    'const stat = mapResult.team2Stats.find(s => s.id === p.id);',
    'const stat = mapResult.team2Stats.find(s => s.nickname === p.nickname || (s.id && s.id === p.id));'
)

with open('src/lib/simulation.ts', 'w', encoding='utf-8') as f:
    f.write(content)
