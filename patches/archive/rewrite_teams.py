import re

with open('src/components/Teams.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove grid from cards
start_str = '                            <div className="bg-black/40 rounded-xl p-4 border border-white/5">\n                <div className="grid grid-cols-5 gap-2">'
end_str = '                </div>\n              </div>\n            </div>\n          ))}'

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + '            </div>\n          ))}' + content[end_idx + len(end_str):]


# 2. Modify the modal rendering
# In the modal, we want to replace the `selectedTeamRoster` player mapping with a new mapping that allows adding FFT / removing players.
# The current modal starts at: `{selectedTeamRoster && (`
# Wait, we need `const currentRosterTeam = selectedTeamRoster ? teams.find(t => t.id === selectedTeamRoster.id) : null;`
# But selectedTeamRoster is updated when we edit? If we just use selectedTeamRoster as the ID, it would be better.
# Let's change selectedTeamRoster from being the team object to just the teamId string.

# Wait, `setSelectedTeamRoster(t)` sets the whole object. Let's just use `const currentRosterTeam = selectedTeamRoster ? teams.find((t: any) => t.id === (typeof selectedTeamRoster === "string" ? selectedTeamRoster : selectedTeamRoster.id)) : null;`

modal_start = content.find('{selectedTeamRoster && (')

if modal_start != -1:
    modal_end = content.find('</div>\n        </div>\n      )}\n    </div>')
    
    new_modal = """{(() => {
        const currentRosterTeam = selectedTeamRoster ? teams.find((t: any) => t.id === (typeof selectedTeamRoster === 'string' ? selectedTeamRoster : selectedTeamRoster.id)) : null;
        if (!currentRosterTeam) return null;

        return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#12121a] p-8 rounded-2xl max-w-2xl w-full border border-white/10 relative shadow-[0_0_50px_rgba(37,99,235,0.15)] flex flex-col gap-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-wider text-white">Состав команды {currentRosterTeam.name}</h2>
                <p className="text-white/40 text-xs font-semibold mt-1">Редактируйте состав и VAC Pts игроков</p>
              </div>
              <button 
                onClick={() => {
                  setSelectedTeamRoster(null);
                  setEditingValRatings({});
                  setActiveAddingSlot(null);
                }} 
                className="text-white/50 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {currentRosterTeam.players.map((p: any, i: number) => {
                const hasPlayer = p && p.id;
                const isAddingThisSlot = activeAddingSlot && activeAddingSlot.teamId === currentRosterTeam.id && activeAddingSlot.index === i;

                if (!hasPlayer) {
                  return (
                    <div key={i} className="flex flex-col items-center justify-center text-center gap-2 p-4 bg-black/40 border border-dashed border-white/10 rounded-xl relative min-h-[80px]">
                      {isAddingThisSlot ? (
                        <div className="absolute inset-0 bg-[#0c0c12] rounded-xl border border-[#ff8f00]/50 flex flex-col p-2 z-20">
                          <div className="text-xs font-bold text-white/50 mb-2 flex justify-between items-center px-1">
                            <span>Свободные агенты (FFT)</span>
                            <button onClick={() => setActiveAddingSlot(null)} className="text-red-500 hover:text-red-400 text-xs font-bold cursor-pointer">✕</button>
                          </div>
                          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 text-left">
                            {fftPlayers.length === 0 ? (
                              <div className="text-xs text-white/30 text-center py-2">Нет свободных агентов</div>
                            ) : (
                              fftPlayers.map((player) => (
                                <button
                                  key={player.id}
                                  onClick={() => handleAddPlayerToTeamSlot(currentRosterTeam.id, i, player)}
                                  className="text-xs font-bold text-white hover:bg-[#ff8f00]/20 rounded px-2 py-1.5 w-full text-left flex justify-between items-center cursor-pointer transition-colors"
                                >
                                  <span>{player.nickname} <span className="text-white/40 font-normal">({player.role})</span></span>
                                  <span className="text-[#ff8f00] font-mono text-[10px]">CS: {Number(player.rating).toFixed(2)}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setActiveAddingSlot({ teamId: currentRosterTeam.id, index: i })}
                          className="flex items-center justify-center gap-2 cursor-pointer w-full h-full text-white/40 hover:text-white transition-colors"
                        >
                          <Plus className="w-5 h-5 text-[#ff8f00]" />
                          <span className="text-sm font-black uppercase tracking-wider">Слот {i + 1} (Добавить игрока)</span>
                        </button>
                      )}
                    </div>
                  );
                }

                const currentValRating = editingValRatings[p.id] !== undefined ? editingValRatings[p.id] : (p.valRating || 0);
                const matchesLeft = p.matchesLeft !== undefined ? p.matchesLeft : 15;
                const salary = p.salary || 1000;
                const demandsIncrease = !!p.demandsIncrease;
                const demandedSalary = p.demandedSalary || 0;

                return (
                  <div key={p.id} className="flex flex-col gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl relative group">
                    <button 
                      onClick={() => handleRemovePlayerFromTeamSlot(currentRosterTeam.id, i)}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-lg z-10"
                      title="Убрать из состава"
                    >
                      <X className="w-3 h-3" />
                    </button>

                    <div className="flex items-center justify-between pr-8">
                      <div className="flex items-center gap-4">
                        <PlayerAvatar playerName={p.nickname} sizeClassName="w-10 h-10" />
                        <div>
                          <div className="font-bold text-white text-base">{p.nickname}</div>
                          <div className="text-xs text-white/40 uppercase tracking-wider">{p.role}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-[10px] text-white/40 uppercase font-black tracking-widest">Рейтинг CS</div>
                          <div className="font-bold text-blue-400 font-mono text-sm">{Number(p.rating).toFixed(2)}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] text-white/40 uppercase font-black tracking-widest">VAC Pts</span>
                          <input 
                            type="number"
                            value={currentValRating}
                            onChange={e => {
                              const val = parseInt(e.target.value) || 0;
                              setEditingValRatings({
                                ...editingValRatings,
                                [p.id]: val
                              });
                            }}
                            className="w-24 bg-black/50 border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs font-mono font-bold text-center focus:outline-none focus:border-[#ff8f00]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                      <button 
                        onClick={() => handleSaveValRating(currentRosterTeam.id, i, p.id, currentValRating)}
                        className="flex-1 bg-[#ff8f00]/10 hover:bg-[#ff8f00]/20 text-[#ff8f00] border border-[#ff8f00]/20 rounded-lg py-2 text-xs font-black uppercase tracking-wider transition-all"
                      >
                        Сохранить VAC Pts
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        );
      })()}"""

    content = content[:modal_start] + new_modal + '\n    </div>'

with open('src/components/Teams.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
