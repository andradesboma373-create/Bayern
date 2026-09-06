import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

# Replace TeamLogo calls
content = re.sub(r'<TeamLogo team=\{team\}', r'<TeamLogo teamName={team.name} logoUrl={team.logoUrl}', content)

# Replace PlayerAvatar calls
content = re.sub(r'<PlayerAvatar player=\{p\}', r'<PlayerAvatar playerName={p.nickname} avatarUrl={p.avatarUrl}', content)
content = re.sub(r'<PlayerAvatar player=\{player\}', r'<PlayerAvatar playerName={player.nickname} avatarUrl={player.avatarUrl}', content)

with open('src/components/News.tsx', 'w') as f:
    f.write(content)
print("Fixed News.tsx")
