import sys

with open('src/lib/simulation.ts', 'r') as f:
    content = f.read()

# Let's fix the initial map directly:
content = content.replace("let team1Stats: any[] = team1.players.map((p: any) => ({", 
"""let team1Stats: any[] = team1.players.map((p: any) => ({
      fk: 0, fd: 0, k1: 0, k2: 0, k3: 0, k4: 0, k5: 0, hs: 0,""")
content = content.replace("let team2Stats: any[] = team2.players.map((p: any) => ({",
"""let team2Stats: any[] = team2.players.map((p: any) => ({
      fk: 0, fd: 0, k1: 0, k2: 0, k3: 0, k4: 0, k5: 0, hs: 0,""")

with open('src/lib/simulation.ts', 'w') as f:
    f.write(content)
