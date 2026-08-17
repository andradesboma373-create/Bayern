import re

with open('src/lib/simulation.ts', 'r', encoding='utf-8') as f:
    content = f.read()
    
content = content.replace('rewards.win_elimination', 'rewards.win')

with open('src/lib/simulation.ts', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/components/setka_tourn/MatchVetoModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'const navigate = useNavigate();' not in content:
    content = re.sub(
        r'(export default function MatchVetoModal\(\{.*?\}\) \{)',
        r'\1\n  const navigate = useNavigate();',
        content,
        flags=re.DOTALL
    )

with open('src/components/setka_tourn/MatchVetoModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
