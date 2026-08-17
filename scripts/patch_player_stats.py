import re

with open('src/components/PlayerProfileModal.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'const kpr = totalRounds > 0 ? totalKills / totalRounds : 0.70;',
    'const kpr = (totalRounds > 0 ? totalKills / totalRounds : 0.70).toFixed(2);'
)
content = content.replace(
    'const dpr = totalRounds > 0 ? totalDeaths / totalRounds : 0.65;',
    'const dpr = (totalRounds > 0 ? totalDeaths / totalRounds : 0.65).toFixed(2);'
)
content = content.replace(
    'const adr = totalRounds > 0 ? totalDamage / totalRounds : 75;',
    'const adr = totalRounds > 0 ? totalDamage / totalRounds : 75;' # keep as number
)
content = content.replace('{playerStats.adr}', '{playerStats.adr.toFixed(1)}')
content = content.replace('Number((kpr * 28).toFixed(1))', 'Number((Number(kpr) * 28).toFixed(1))')

with open('src/components/PlayerProfileModal.tsx', 'w') as f:
    f.write(content)
