with open('src/lib/simulation.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'const assistPool = t1Alive.filter(a => a.id !== p1.id);',
    'const assistPool = t1Alive.filter(a => a.nickname !== p1.nickname);'
)
content = content.replace(
    'const assistPool = t2Alive.filter(a => a.id !== p2.id);',
    'const assistPool = t2Alive.filter(a => a.nickname !== p2.nickname);'
)

with open('src/lib/simulation.ts', 'w', encoding='utf-8') as f:
    f.write(content)
