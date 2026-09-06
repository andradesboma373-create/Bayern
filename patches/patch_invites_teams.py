import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

teams_ui_old = """              {(newType === 'roster_announcement' || newType === 'player_transfer' || newType === 'welcome_player') && (
                <div className="space-y-2 animate-fade-in">"""

teams_ui_new = """              {newType === 'tournament_invites' && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-xs font-bold text-white/50 uppercase">Выберите команды (до 8)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedTeamIds.map(tid => {
                      const team = teams.find(t => t.id === tid);
                      if (!team) return null;
                      return (
                        <div key={tid} className="flex items-center gap-2 bg-black/40 border border-white/10 px-3 py-1.5 rounded-lg text-sm">
                          <TeamLogo game={user?.game || 'cs2'} teamName={team.name} sizeClassName="w-4 h-4" />
                          <span>{team.name}</span>
                          <button onClick={() => setSelectedTeamIds(prev => prev.filter(id => id !== tid))} className="text-red-400 hover:text-red-300 ml-1">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <select
                    value=""
                    onChange={e => {
                      if (e.target.value && !selectedTeamIds.includes(e.target.value) && selectedTeamIds.length < 8) {
                        setSelectedTeamIds(prev => [...prev, e.target.value]);
                      }
                    }}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                  >
                    <option value="">-- Добавить команду --</option>
                    {teams.filter(t => !selectedTeamIds.includes(t.id)).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {(newType === 'roster_announcement' || newType === 'player_transfer' || newType === 'welcome_player') && (
                <div className="space-y-2 animate-fade-in">"""

content = content.replace(teams_ui_old, teams_ui_new)

with open('src/components/News.tsx', 'w') as f:
    f.write(content)
