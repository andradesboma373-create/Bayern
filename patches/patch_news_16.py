import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

content = content.replace("Выберите команды (до 8)", "Выберите команды (до 16)")
content = content.replace("selectedTeamIds.length < 8", "selectedTeamIds.length < 16")

with open('src/components/News.tsx', 'w') as f:
    f.write(content)
