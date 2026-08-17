import re

with open('src/components/setka_tourn/TournamentManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("export default function TournamentManager() {", "export default function TournamentManager({ user }: { user: any }) {")
content = content.replace("loadTournaments()", "loadTournaments(user.uid)")
content = content.replace("saveTournament(t);", "saveTournament(user.uid, t);")
content = content.replace("saveTournament(updated);", "saveTournament(user.uid, updated);")
content = content.replace("deleteTournament(id);", "deleteTournament(user.uid, id);")

with open('src/components/setka_tourn/TournamentManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
