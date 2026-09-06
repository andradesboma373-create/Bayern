import sys

with open('src/lib/simulation.ts', 'r') as f:
    content = f.read()

# Just remove the types completely for now so we can compile and run.
old_team1 = "let team1Stats: any[] = team1.players.map((p: any) => ({"
new_team1 = "let team1Stats: any = team1.players.map((p: any) => ({"

old_team2 = "let team2Stats: any[] = team2.players.map((p: any) => ({"
new_team2 = "let team2Stats: any = team2.players.map((p: any) => ({"

content = content.replace(old_team1, new_team1)
content = content.replace(old_team2, new_team2)

with open('src/lib/simulation.ts', 'w') as f:
    f.write(content)
