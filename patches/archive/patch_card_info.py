with open('src/components/Teams.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_info = """                    <h3 className="text-2xl font-black text-white uppercase tracking-wider">{t.name}</h3>
                    <div className="flex items-center gap-3 text-xs font-bold text-white/40 mt-1">
                      <span>CS Avg: {(t.players.reduce((acc: number, p: any) => acc + (p && p.rating ? Number(p.rating) : 0), 0) / 5).toFixed(2)}</span>
                      <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                    </div>"""

new_info = """                    <h3 className="text-2xl font-black text-white uppercase tracking-wider">{t.name}</h3>
                    <div className="flex items-center gap-3 text-xs font-bold text-white/40 mt-1">
                      <span>Игроков: {t.players.filter((p: any) => p && p.id).length}/5</span>
                      <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                      <span>CS Avg: {(t.players.reduce((acc: number, p: any) => acc + (p && p.rating ? Number(p.rating) : 0), 0) / 5).toFixed(2)}</span>
                    </div>"""

content = content.replace(old_info, new_info)

with open('src/components/Teams.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
