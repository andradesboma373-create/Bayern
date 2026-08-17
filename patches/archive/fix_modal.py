import re

with open('src/components/setka_tourn/MatchVetoModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix duplicate import
content = content.replace("import { useNavigate } from 'react-router-dom';\nexport default function", "export default function")

# Fix missing navigate
if "const navigate = useNavigate();" not in content:
    old_sig = "export default function MatchVetoModal({ user, team1, team2, game, bo, tournamentId, onClose, onMatchComplete }: Props) {"
    new_sig = "export default function MatchVetoModal({ user, team1, team2, game, bo, tournamentId, onClose, onMatchComplete }: Props) {\n  const navigate = useNavigate();"
    content = content.replace(old_sig, new_sig)

with open('src/components/setka_tourn/MatchVetoModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
