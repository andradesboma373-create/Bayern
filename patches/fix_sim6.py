import sys

with open('src/lib/simulation.ts', 'r') as f:
    content = f.read()

# Let's fix the initial map directly:
content = content.replace("let team1Stats: PlayerStatRecord[] = team1.players.map((p: any) => ({", 
"let team1Stats: any[] = team1.players.map((p: any) => ({")
content = content.replace("let team2Stats: PlayerStatRecord[] = team2.players.map((p: any) => ({",
"let team2Stats: any[] = team2.players.map((p: any) => ({")
content = content.replace("const updateStats = (stats: PlayerStatRecord[],", "const updateStats = (stats: any[],")

with open('src/lib/simulation.ts', 'w') as f:
    f.write(content)

with open('src/lib/demoMatches.ts', 'r') as f:
    d_content = f.read()

d_content = d_content.replace('mvp: simRes.mvp,', '')
with open('src/lib/demoMatches.ts', 'w') as f:
    f.write(d_content)

