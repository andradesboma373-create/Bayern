import re

with open('src/components/PlayerProfileModal.tsx', 'r') as f:
    content = f.read()

content = content.replace('{playerStats.kd}', '{playerStats.kd.toFixed(2)}')

with open('src/components/PlayerProfileModal.tsx', 'w') as f:
    f.write(content)
