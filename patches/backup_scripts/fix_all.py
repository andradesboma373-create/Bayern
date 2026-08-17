import re

with open('src/components/setka_tourn/TournamentManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("updateTournamentLocal(user.uid, t);", "saveTournament(user.uid, t);")

with open('src/components/setka_tourn/TournamentManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)


with open('src/components/setka_tourn/MatchVetoModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("export default function MatchVetoModal({ user", "import { useNavigate } from 'react-router-dom';\nexport default function MatchVetoModal({ user")

if "const navigate = useNavigate();" not in content:
    content = re.sub(
        r'(export default function MatchVetoModal\(\{.*?\}\) \{)',
        r'\1\n  const navigate = useNavigate();',
        content,
        flags=re.DOTALL
    )

with open('src/components/setka_tourn/MatchVetoModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
