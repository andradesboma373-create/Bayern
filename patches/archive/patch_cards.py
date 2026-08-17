import re

with open('src/components/Teams.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We want to replace everything from `<div className="absolute top-6 right-6 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">` 
# down to `👥 Состав\n                </button>\n              </div>`

start_str = '<div className="absolute top-6 right-6 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">'
end_str = '👥 Состав\n                </button>\n              </div>'

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    old_block = content[start_idx:end_idx + len(end_str)]
    
    new_block = """<div className="flex items-center gap-4">
                  <div 
                    className="relative group/logo cursor-pointer shrink-0" 
                    onClick={() => handleLogoUploadClick(t.id)}
                    title="Нажмите, чтобы загрузить собственный логотип команды"
                  >
                    <TeamLogo 
                      teamName={t.name} 
                      logoUrl={t.logoUrl}
                      sizeClassName="w-16 h-16 text-2xl shadow-[0_0_15px_rgba(255,143,0,0.15)] transition-all group-hover/logo:scale-105" 
                    />
                    <div className="absolute inset-0 bg-black/70 rounded-2xl opacity-0 group-hover/logo:opacity-100 transition-all flex flex-col items-center justify-center text-[9px] text-white font-black uppercase tracking-wider text-center p-1 border border-[#ff8f00]/50 select-none">
                      <span>Сменить</span>
                      <span className="text-[#ff8f00] text-[8px] mt-0.5">лого</span>
                    </div>
                    {t.logoUrl && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!window.confirm(`Вы уверены, что хотите сбросить кастомный логотип команды ${t.name}?`)) return;
                          
                          try {
                            const updatedTeams = teams.map(item => {
                              if (item.id === t.id) {
                                return { ...item, logoUrl: '' };
                              }
                              return item;
                            });
                            setTeams(updatedTeams);
                            
                            localStorage.removeItem(`team_logo_${t.name.trim().toLowerCase()}`);
                            localStorage.setItem(`teams_${user.uid}`, JSON.stringify(updatedTeams));
                            
                            await fetch('/api/sync-cache', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ userId: user.uid, teams: updatedTeams })
                            }).catch(() => {});
                            
                            alert("Логотип команды успешно сброшен!");
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-500 text-white rounded-full p-1 border border-white/10 transition-all cursor-pointer z-10"
                        title="Удалить логотип"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-wider">{t.name}</h3>
                    <div className="flex items-center gap-3 text-xs font-bold text-white/40 mt-1">
                      <span>Игроков: {t.players.filter((p: any) => p && p.id).length}/5</span>
                      <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                      <span>Teamplay: {(t.players.reduce((acc: number, p: any) => acc + (p && p.rating ? Number(p.rating) : 0), 0) / 5).toFixed(0)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 mt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setSelectedTeamRoster(t.id)}
                      className="flex items-center justify-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-600/20 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      👥 Состав
                    </button>
                    <button 
                      onClick={() => {
                        setEditingTeamId(t.id);
                        setNewTeamName(t.name);
                        setNewTeamIsAcademy(!!t.isAcademy);
                        const pids = t.players.map((p: any) => p.id || '');
                        while (pids.length < 5) {
                          pids.push('');
                        }
                        setSelectedPlayers(pids);
                        setShowAddForm(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="flex items-center justify-center gap-2 bg-[#ff8f00]/10 hover:bg-[#ff8f00]/20 text-[#ff8f00] border border-[#ff8f00]/20 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" /> Изменить
                    </button>
                  </div>
                  <button 
                    onClick={() => setConfirmDeleteId(t.id)}
                    className="flex items-center justify-center gap-2 bg-red-500/5 hover:bg-red-500/10 text-red-500 border border-red-500/10 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer w-full"
                  >
                    <Trash2 className="w-3 h-3" /> Удалить
                  </button>
                </div>"""

    content = content.replace(old_block, new_block)
    
    with open('src/components/Teams.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced block")
else:
    print("Block not found")

