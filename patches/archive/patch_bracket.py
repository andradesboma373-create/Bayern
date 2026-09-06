import re

with open('src/components/setka_tourn/TournamentBracket.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("export default function TournamentBracket() {", "export default function TournamentBracket({ user }: { user: any }) {")
content = content.replace("<TournamentManager />", "<TournamentManager user={user} />")

with open('src/components/setka_tourn/TournamentBracket.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
