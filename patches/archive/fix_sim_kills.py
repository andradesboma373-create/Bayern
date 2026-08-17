with open('src/lib/simulation.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'const stat1 = mapResult.team1Stats.find(s => s.id === p1.id);',
    'const stat1 = mapResult.team1Stats.find(s => s.nickname === p1.nickname || (s.id && s.id === p1.id));'
)
content = content.replace(
    'const stat2 = mapResult.team2Stats.find(s => s.id === p2.id);',
    'const stat2 = mapResult.team2Stats.find(s => s.nickname === p2.nickname || (s.id && s.id === p2.id));'
)

with open('src/lib/simulation.ts', 'w', encoding='utf-8') as f:
    f.write(content)
