import re

with open('src/components/setka_tourn/storage.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("all[index] = tournament;", "all[index] = { ...tournament, channelId: userId };")
content = content.replace("all.push(tournament);", "all.push({ ...tournament, channelId: userId });")

with open('src/components/setka_tourn/storage.ts', 'w', encoding='utf-8') as f:
    f.write(content)
