import re

with open('src/lib/simulation.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure ID is included in teamStats
content = content.replace(
    "team1.map(p => ({ nickname: p.nickname, role: p.role, rating: p.rating, kills: 0, deaths: 0, assists: 0, damage: 0, totalRounds: 0 }))",
    "team1.map(p => ({ id: p.id, nickname: p.nickname, role: p.role, rating: p.rating, kills: 0, deaths: 0, assists: 0, damage: 0, totalRounds: 0 }))"
)
content = content.replace(
    "team2.map(p => ({ nickname: p.nickname, role: p.role, rating: p.rating, kills: 0, deaths: 0, assists: 0, damage: 0, totalRounds: 0 }))",
    "team2.map(p => ({ id: p.id, nickname: p.nickname, role: p.role, rating: p.rating, kills: 0, deaths: 0, assists: 0, damage: 0, totalRounds: 0 }))"
)

content = content.replace(
    "team1.map(p => ({ nickname: p.nickname, kills: 0, deaths: 0, assists: 0, damage: 0, roundsWon: 0, totalRounds: 0 }))",
    "team1.map(p => ({ id: p.id, nickname: p.nickname, kills: 0, deaths: 0, assists: 0, damage: 0, roundsWon: 0, totalRounds: 0 }))"
)
content = content.replace(
    "team2.map(p => ({ nickname: p.nickname, kills: 0, deaths: 0, assists: 0, damage: 0, roundsWon: 0, totalRounds: 0 }))",
    "team2.map(p => ({ id: p.id, nickname: p.nickname, kills: 0, deaths: 0, assists: 0, damage: 0, roundsWon: 0, totalRounds: 0 }))"
)

with open('src/lib/simulation.ts', 'w', encoding='utf-8') as f:
    f.write(content)
