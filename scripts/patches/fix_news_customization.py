import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

# 1. Background for all standard types
bg_old = "              {newType === 'welcome_player' && ("
bg_new = "              {(newType === 'welcome_player' || newType === 'roster_announcement' || newType === 'player_transfer') && ("
content = content.replace(bg_old, bg_new)

with open('src/components/News.tsx', 'w') as f:
    f.write(content)
