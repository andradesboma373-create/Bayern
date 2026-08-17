with open('src/lib/simulation.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'const aStat = mapResult.team1Stats.find(s => s.id === aPlayer.id);',
    'const aStat = mapResult.team1Stats.find(s => s.nickname === aPlayer.nickname || (s.id && s.id === aPlayer.id));'
)
content = content.replace(
    'const aStat = mapResult.team2Stats.find(s => s.id === aPlayer.id);',
    'const aStat = mapResult.team2Stats.find(s => s.nickname === aPlayer.nickname || (s.id && s.id === aPlayer.id));'
)

with open('src/lib/simulation.ts', 'w', encoding='utf-8') as f:
    f.write(content)
