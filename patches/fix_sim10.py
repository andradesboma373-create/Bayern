import sys
with open('src/lib/simulation.ts', 'r') as f:
    content = f.read()

content = content.replace('''let team1Stats: any[] = team1.players.map((p: any) => ({
      fk: 0, fd: 0, k1: 0, k2: 0, k3: 0, k4: 0, k5: 0, hs: 0,
      id: p.id,
      nickname: p.nickname,
      kills: 0,
      deaths: 0,
      assists: 0,
      damage: 0,
      roundsWon: 0,
      totalRounds: 0
    }));''', '''let team1Stats: any[] = team1.players.map((p: any) => ({
      id: p.id, nickname: p.nickname, kills: 0, deaths: 0, assists: 0, damage: 0, roundsWon: 0, totalRounds: 0, fk: 0, fd: 0, k1: 0, k2: 0, k3: 0, k4: 0, k5: 0, hs: 0
    }));''')

content = content.replace('''let team2Stats: any[] = team2.players.map((p: any) => ({
      fk: 0, fd: 0, k1: 0, k2: 0, k3: 0, k4: 0, k5: 0, hs: 0,
      id: p.id,
      nickname: p.nickname,
      kills: 0,
      deaths: 0,
      assists: 0,
      damage: 0,
      roundsWon: 0,
      totalRounds: 0
    }));''', '''let team2Stats: any[] = team2.players.map((p: any) => ({
      id: p.id, nickname: p.nickname, kills: 0, deaths: 0, assists: 0, damage: 0, roundsWon: 0, totalRounds: 0, fk: 0, fd: 0, k1: 0, k2: 0, k3: 0, k4: 0, k5: 0, hs: 0
    }));''')

with open('src/lib/simulation.ts', 'w') as f:
    f.write(content)
