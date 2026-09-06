with open('src/components/setka_tourn/Top20Modal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "import TeamLogo from '../TeamLogo';",
    "import TeamLogo from '../TeamLogo';\nimport PlayerAvatar from '../PlayerAvatar';"
)

old_player_col = """                                <div className="text-left pl-2 text-white font-bold truncate">
                                    {p.nickname}
                                </div>"""

new_player_col = """                                <div className="text-left pl-2 flex items-center gap-2 truncate">
                                    <PlayerAvatar playerName={p.nickname} sizeClassName="w-6 h-6" />
                                    <span className="text-white font-bold">{p.nickname}</span>
                                </div>"""

content = content.replace(old_player_col, new_player_col)

with open('src/components/setka_tourn/Top20Modal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
