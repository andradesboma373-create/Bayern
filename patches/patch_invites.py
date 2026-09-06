import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

# Add tournament_invites to the state
content = content.replace("const [newType, setNewType] = useState<'custom' | 'roster_announcement' | 'player_transfer' | 'welcome_player'>('welcome_player');", 
"const [newType, setNewType] = useState<'custom' | 'roster_announcement' | 'player_transfer' | 'welcome_player' | 'tournament_invites'>('welcome_player');\n  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);")

# Add validation for tournament_invites
validation_old = """    if ((newType === 'player_transfer' || newType === 'welcome_player') && (!selectedTeamId || !selectedPlayerId)) {
      setError("Выберите игрока и команду");
      setTimeout(() => setError(''), 3000);
      return;
    }"""

validation_new = """    if ((newType === 'player_transfer' || newType === 'welcome_player') && (!selectedTeamId || !selectedPlayerId)) {
      setError("Выберите игрока и команду");
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (newType === 'tournament_invites' && selectedTeamIds.length === 0) {
      setError("Выберите хотя бы одну команду");
      setTimeout(() => setError(''), 3000);
      return;
    }"""
content = content.replace(validation_old, validation_new)

# Add title default for tournament_invites
title_old = "if (newType === 'player_transfer' && p && t) finalTitle = `${p.nickname} JOINS ${t.name}`;"
title_new = "if (newType === 'player_transfer' && p && t) finalTitle = `${p.nickname} JOINS ${t.name}`;\n      if (newType === 'tournament_invites') finalTitle = `ПРИГЛАШЕННЫЕ НА ТУРНИР`;"
content = content.replace(title_old, title_new)

# Add to newsItem
newsItem_old = """    const newsItem = {
      title: finalTitle,
      type: newType,
      imageUrl: newImage,
      teamId: selectedTeamId,
      playerId: selectedPlayerId,
      createdAt: Date.now(),
      background: selectedBg,
      channelId: user.uid
    };"""

newsItem_new = """    const newsItem = {
      title: finalTitle,
      type: newType,
      imageUrl: newImage,
      teamId: selectedTeamId,
      playerId: selectedPlayerId,
      teamIds: selectedTeamIds,
      createdAt: Date.now(),
      background: selectedBg,
      channelId: user.uid
    };"""
content = content.replace(newsItem_old, newsItem_new)

# Reset state
reset_old = """      setSelectedTeamId('');
      setSelectedPlayerId('');"""
reset_new = """      setSelectedTeamId('');
      setSelectedPlayerId('');
      setSelectedTeamIds([]);"""
content = content.replace(reset_old, reset_new)

# Add grid option in UI
grid_old = """                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">"""
grid_new = """                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">"""
content = content.replace(grid_old, grid_new)

# Add button
btn_old = """                  <button
                    onClick={() => setNewType('custom')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${newType === 'custom' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-black/20 border-white/10 text-white/50 hover:bg-white/5'}`}
                  >
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-xs font-bold text-center">Своя картинка</span>
                  </button>
                </div>"""

btn_new = """                  <button
                    onClick={() => setNewType('custom')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${newType === 'custom' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-black/20 border-white/10 text-white/50 hover:bg-white/5'}`}
                  >
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-xs font-bold text-center">Своя картинка</span>
                  </button>
                  <button
                    onClick={() => setNewType('tournament_invites')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${newType === 'tournament_invites' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-black/20 border-white/10 text-white/50 hover:bg-white/5'}`}
                  >
                    <LayoutTemplate className="w-6 h-6" />
                    <span className="text-xs font-bold text-center">Инвайты</span>
                  </button>
                </div>"""
content = content.replace(btn_old, btn_new)

# Add background option
bg_cond_old = "{(newType === 'welcome_player' || newType === 'roster_announcement' || newType === 'player_transfer') && ("
bg_cond_new = "{(newType === 'welcome_player' || newType === 'roster_announcement' || newType === 'player_transfer' || newType === 'tournament_invites') && ("
content = content.replace(bg_cond_old, bg_cond_new)

with open('src/components/News.tsx', 'w') as f:
    f.write(content)
