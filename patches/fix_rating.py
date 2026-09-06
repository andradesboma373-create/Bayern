import re

with open('src/components/PlayerProfileModal.tsx', 'r') as f:
    content = f.read()

old_val = """                <div>
                  <label className="text-xs font-bold text-amber-400 uppercase block mb-1">VAC Pts / Рейтинг PTS (Для топа HLTV)</label>
                  <input
                    type="number"
                    value={editValRating}
                    onChange={e => setEditValRating(Number(e.target.value) || 0)}
                    className="w-full bg-black/50 border border-amber-500/30 rounded-xl px-4 py-2.5 text-amber-300 font-mono text-sm font-bold focus:border-amber-400 focus:outline-none"
                  />
                </div>"""

new_val = """                <div>
                  <label className="text-xs font-bold text-amber-400 uppercase block mb-1">VAC Pts (Для топа HLTV)</label>
                  <input
                    type="number"
                    value={editValRating}
                    onChange={e => setEditValRating(Number(e.target.value) || 0)}
                    className="w-full bg-black/50 border border-amber-500/30 rounded-xl px-4 py-2.5 text-amber-300 font-mono text-sm font-bold focus:border-amber-400 focus:outline-none"
                    title="Влияет только на позицию в рейтинге ТОП 20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-blue-400 uppercase block mb-1">Игровой Рейтинг (1-100)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editRating}
                    onChange={e => setEditRating(Number(e.target.value) || 0)}
                    className="w-full bg-black/50 border border-blue-500/30 rounded-xl px-4 py-2.5 text-blue-300 font-mono text-sm font-bold focus:border-blue-400 focus:outline-none"
                    title="Влияет на результаты в симуляторе матчей"
                  />
                </div>"""

content = content.replace(old_val, new_val)

with open('src/components/PlayerProfileModal.tsx', 'w') as f:
    f.write(content)
print("Added editRating input")
