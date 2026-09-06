import re

# Patch GroupStage
with open('src/components/setka_tourn/GroupStage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "export default function GroupStage({ tournament, onUpdate }: Props) {",
    "interface ExtendedProps extends Props { onVetoMatch?: (t1: any, t2: any) => void; }\nexport default function GroupStage({ tournament, onUpdate, onVetoMatch }: ExtendedProps) {"
)

play_btn_group = """
                                        {!m.winnerId && !m.isDraw && onVetoMatch && (
                                            <button 
                                                onClick={() => onVetoMatch(m.team1, m.team2)}
                                                className="ml-2 px-2 py-1 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded text-[10px] font-black uppercase"
                                            >
                                                Сыграть
                                            </button>
                                        )}
"""
content = content.replace(
    "<input type=\"number\"",
    play_btn_group + "\n                                        <input type=\"number\""
)

with open('src/components/setka_tourn/GroupStage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Patch SwissStage
with open('src/components/setka_tourn/SwissStage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "export default function SwissStage({ tournament, onUpdate }: Props) {",
    "interface ExtendedProps extends Props { onVetoMatch?: (t1: any, t2: any) => void; }\nexport default function SwissStage({ tournament, onUpdate, onVetoMatch }: ExtendedProps) {"
)

play_btn_swiss = """
                                {!m.winnerId && onVetoMatch && (
                                    <button 
                                        onClick={() => onVetoMatch(m.team1, m.team2)}
                                        className="ml-2 px-2 py-1 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded text-[10px] font-black uppercase"
                                    >
                                        Сыграть
                                    </button>
                                )}
"""
content = content.replace(
    "<input type=\"number\"",
    play_btn_swiss + "\n                                        <input type=\"number\""
)

with open('src/components/setka_tourn/SwissStage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

