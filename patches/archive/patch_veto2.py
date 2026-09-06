import re

with open('src/components/setka_tourn/MatchVetoModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'export default function MatchVetoModal\(\{([^}]*)\}\) \{',
    r'export default function MatchVetoModal({\1}) {\n  const navigate = useNavigate();',
    content
)

with open('src/components/setka_tourn/MatchVetoModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
