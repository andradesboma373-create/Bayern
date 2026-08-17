import sys

with open('src/lib/simulation.ts', 'r') as f:
    content = f.read()

# Try one last regex replace for all those type errors in updateStats loop
import re
# Find where the object mapping is done
# Let's replace the whole block where we map players.
# team1Stats was replaced earlier but might not have been applied successfully?
content = re.sub(r'let team1Stats: any\[\] = team1\.players\.map\(\(p: any\) => \(\{[\s\S]*?\}\)\);',
r'''let team1Stats: any[] = team1.players.map((p: any) => ({
      id: p.id,
      nickname: p.nickname,
      kills: 0,
      deaths: 0,
      assists: 0,
      damage: 0,
      roundsWon: 0,
      totalRounds: 0,
      fk: 0, fd: 0, k1: 0, k2: 0, k3: 0, k4: 0, k5: 0, hs: 0
    }));''', content)

content = re.sub(r'let team2Stats: any\[\] = team2\.players\.map\(\(p: any\) => \(\{[\s\S]*?\}\)\);',
r'''let team2Stats: any[] = team2.players.map((p: any) => ({
      id: p.id,
      nickname: p.nickname,
      kills: 0,
      deaths: 0,
      assists: 0,
      damage: 0,
      roundsWon: 0,
      totalRounds: 0,
      fk: 0, fd: 0, k1: 0, k2: 0, k3: 0, k4: 0, k5: 0, hs: 0
    }));''', content)

with open('src/lib/simulation.ts', 'w') as f:
    f.write(content)
