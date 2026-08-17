import re
with open('src/components/setka_tourn/MatchCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I need to add onVetoMatch to the props
content = content.replace("export default function MatchCard({", "export default function MatchCard({\n    onVetoMatch,")

with open('src/components/setka_tourn/MatchCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/components/setka_tourn/BracketRenderer.tsx', 'r', encoding='utf-8') as f:
    content2 = f.read()

if "onVetoMatch," not in content2:
    content2 = content2.replace("export default function BracketRenderer({", "export default function BracketRenderer({\n    onVetoMatch,")
    with open('src/components/setka_tourn/BracketRenderer.tsx', 'w', encoding='utf-8') as f:
        f.write(content2)

