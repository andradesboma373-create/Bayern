import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

# 1. Update Title validation in handleCreateNews
handle_create_start = "  const handleCreateNews = async () => {"
handle_create_end = "    const newsItem = {"

old_validation = """    if (!newTitle.trim()) {
      setError("Введите заголовок");
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (newType === 'custom' && !newImage.trim()) {
      setError("Введите ссылку на изображение");
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (newType === 'roster_announcement' && !selectedTeamId) {
      setError("Выберите команду");
      setTimeout(() => setError(''), 3000);
      return;
    }

    if ((newType === 'player_transfer' || newType === 'welcome_player') && (!selectedTeamId || !selectedPlayerId)) {
      setError("Выберите игрока и команду");
      setTimeout(() => setError(''), 3000);
      return;
    }"""

new_validation = """    if (newType === 'custom' && !newTitle.trim()) {
      setError("Введите заголовок");
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (newType === 'custom' && !newImage.trim()) {
      setError("Введите ссылку на изображение");
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (newType === 'roster_announcement' && !selectedTeamId) {
      setError("Выберите команду");
      setTimeout(() => setError(''), 3000);
      return;
    }

    if ((newType === 'player_transfer' || newType === 'welcome_player') && (!selectedTeamId || !selectedPlayerId)) {
      setError("Выберите игрока и команду");
      setTimeout(() => setError(''), 3000);
      return;
    }

    let finalTitle = newTitle.trim();
    if (!finalTitle && newType !== 'custom') {
      const t = teams.find(team => team.id === selectedTeamId);
      const p = players.find(player => player.id === selectedPlayerId);
      if (newType === 'welcome_player' && p) finalTitle = `WELCOME ${p.nickname}`;
      if (newType === 'roster_announcement' && t) finalTitle = `${t.name} ROSTER`;
      if (newType === 'player_transfer' && p && t) finalTitle = `${p.nickname} JOINS ${t.name}`;
    }"""

content = content.replace(old_validation, new_validation)

content = content.replace("title: newTitle,", "title: finalTitle,")

# 2. Make title placeholder smarter and hide if not custom?
# Wait, user might still want to customize title for non-custom cards. Let's just make it optional.
content = content.replace(
    '<label className="text-xs font-bold text-white/50 uppercase">Заголовок новости</label>',
    '<label className="text-xs font-bold text-white/50 uppercase">Заголовок новости {newType !== \'custom\' && "(Опционально)"}</label>'
)

# 3. Filter players in dropdown based on selected team
old_players_select = """                  <select
                    value={selectedPlayerId}
                    onChange={e => setSelectedPlayerId(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                  >
                    <option value="">-- Выберите игрока --</option>
                    {players.map(p => (
                      <option key={p.id} value={p.id}>{p.nickname}</option>
                    ))}
                  </select>"""

new_players_select = """                  <select
                    value={selectedPlayerId}
                    onChange={e => setSelectedPlayerId(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                  >
                    <option value="">-- Выберите игрока --</option>
                    {players
                      .filter(p => {
                        if (!selectedTeamId) return true;
                        const t = teams.find(team => team.id === selectedTeamId);
                        if (!t || !t.players) return true; // If no players, show all just in case? No, wait.
                        return t.players.some((tp: any) => tp && tp.id === p.id);
                      })
                      .map(p => (
                      <option key={p.id} value={p.id}>{p.nickname}</option>
                    ))}
                  </select>"""

content = content.replace(old_players_select, new_players_select)

with open('src/components/News.tsx', 'w') as f:
    f.write(content)

print("Fixed news customization")
