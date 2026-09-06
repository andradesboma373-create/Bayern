import sys

with open('src/lib/simulation.ts', 'r') as f:
    content = f.read()

# The error says property doesn't exist on { id: any; nickname: any; ... } which means it's inferring the type from the initial map.
# We need to change the map to properly type it.
old_team1_map = "let team1Stats: PlayerStatRecord[] = team1.players.map((p: any) => ({"
new_team1_map = "let team1Stats: PlayerStatRecord[] = team1.players.map((p: any) => ({"

# Actually let's just make sure it returns PlayerStatRecord completely initialized.
# We can just change updateStats where the error is happening.
# Let's check where the error is:
# src/lib/simulation.ts(788,46): error TS2339: Property 'fk' does not exist on type '{ id: any; nickname: any; kills: number; deaths: number; assists: number; damage: number; roundsWon: number; totalRounds: number; }'.

# So the elements inside the array don't have fk initially defined in the map function.
# Let's add them to the map.
import re

content = re.sub(r'damage: 0,\n      roundsWon: 0,\n      totalRounds: 0', 
r'damage: 0,\n      roundsWon: 0,\n      totalRounds: 0,\n      fk: 0,\n      fd: 0,\n      k1: 0,\n      k2: 0,\n      k3: 0,\n      k4: 0,\n      k5: 0,\n      hs: 0', content)

with open('src/lib/simulation.ts', 'w') as f:
    f.write(content)
