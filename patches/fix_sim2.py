import sys

with open('src/lib/simulation.ts', 'r') as f:
    content = f.read()

# Fix types in simulation.ts
content = content.replace("let team1Stats = team1.players.map((p: any) => ({", "let team1Stats: PlayerStatRecord[] = team1.players.map((p: any) => ({")
content = content.replace("let team2Stats = team2.players.map((p: any) => ({", "let team2Stats: PlayerStatRecord[] = team2.players.map((p: any) => ({")
content = content.replace("const updateStats = (stats: any[],", "const updateStats = (stats: PlayerStatRecord[],")

with open('src/lib/simulation.ts', 'w') as f:
    f.write(content)
