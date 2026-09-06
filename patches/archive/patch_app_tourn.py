import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove old Tournaments import
content = content.replace("import Tournaments from './components/Tournaments';\n", "")

# Remove Сетка Турнира from NAV_ITEMS
content = re.sub(r"\{\s*icon:\s*Trophy,\s*label:\s*'Сетка Турнира',\s*path:\s*'/tournament-bracket'\s*\},?\n?", "", content)

# Replace old Tournaments route with TournamentBracket
content = content.replace("<Route path=\"/tournaments\" element={<Tournaments user={user} />} />", "<Route path=\"/tournaments\" element={<TournamentBracket user={user} />} />")
content = content.replace("<Route path=\"/tournament-bracket\" element={<TournamentBracket />} />\n", "")

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
