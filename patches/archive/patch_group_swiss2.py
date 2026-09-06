import re

# Patch GroupStage
with open('src/components/setka_tourn/GroupStage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "interface Props {\n  tournament: Tournament;\n  onUpdate: (tournament: Tournament) => void;\n  onAdvanceToBracket: () => void;\n}",
    "interface Props {\n  tournament: Tournament;\n  onUpdate: (tournament: Tournament) => void;\n  onAdvanceToBracket: () => void;\n  onVetoMatch?: (t1: any, t2: any) => void;\n}"
)
content = content.replace(
    "export default function GroupStage({ tournament, onUpdate, onAdvanceToBracket }: Props) {",
    "export default function GroupStage({ tournament, onUpdate, onAdvanceToBracket, onVetoMatch }: Props) {"
)

with open('src/components/setka_tourn/GroupStage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Patch SwissStage
with open('src/components/setka_tourn/SwissStage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "interface Props {\n  tournament: Tournament;\n  onUpdate: (updated: Tournament) => void;\n  onAdvanceToBracket: () => void;\n  isExporting?: boolean;\n  isSwapMode?: boolean;\n}",
    "interface Props {\n  tournament: Tournament;\n  onUpdate: (updated: Tournament) => void;\n  onAdvanceToBracket: () => void;\n  isExporting?: boolean;\n  isSwapMode?: boolean;\n  onVetoMatch?: (t1: any, t2: any) => void;\n}"
)
content = content.replace(
    "export default function SwissStage({ tournament, onUpdate, onAdvanceToBracket, isExporting, isSwapMode }: Props) {",
    "export default function SwissStage({ tournament, onUpdate, onAdvanceToBracket, isExporting, isSwapMode, onVetoMatch }: Props) {"
)

with open('src/components/setka_tourn/SwissStage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
