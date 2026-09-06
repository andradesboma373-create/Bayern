with open('src/lib/simulation.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'score: t1Wins ? `${mapResult.team1Score + 1}:${mapResult.team2Score}` : `${mapResult.team1Score}:${mapResult.team2Score + 1}`,',
    'score: t1Wins ? `${mapResult.team1Score + 1}:${mapResult.team2Score}` : `${mapResult.team1Score}:${mapResult.team2Score + 1}`,\n            t1Score: t1Wins ? mapResult.team1Score + 1 : mapResult.team1Score,\n            t2Score: t1Wins ? mapResult.team2Score : mapResult.team2Score + 1,'
)

with open('src/lib/simulation.ts', 'w', encoding='utf-8') as f:
    f.write(content)
