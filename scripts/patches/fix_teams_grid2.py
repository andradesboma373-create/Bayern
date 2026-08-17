import re

with open('src/components/Teams.tsx', 'r') as f:
    content = f.read()

pattern = r'        return \(\n          <div className="flex flex-col">\n            <div className="flex text-\[10px\].*?\{currentTeams\.map\(\(t, idx\) => \{.*?\);\n              \}\)\}\n            <\/div>'

new_grid = """        return (
          <div className="flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {currentTeams.map((t, idx) => {
                const globalIdx = indexOfFirstItem + idx;
                const teamplay = (t.players.reduce((acc: number, p: any) => acc + (p && p.rating ? Number(p.rating) : 0), 0) / 5).toFixed(0);

                return (
                  <div key={t.id} className="bg-[#12121a] rounded-xl p-4 flex flex-col gap-4 relative group overflow-hidden border border-white/5 hover:border-white/10 transition-colors">
                    {confirmDeleteId === t.id && (
                      <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 text-center z-20 animate-fade-in">
                        <div className="text-lg font-black text-white mb-4 uppercase tracking-wider">Удалить {t.name}?</div>
                        <div className="flex gap-4 w-full max-w-[240px]">
                          <button 
                            onClick={() => handleDeleteTeam(t.id)} 
                            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-xl text-sm transition-colors uppercase tracking-wider"
                          >Да</button>
                          <button 
                            onClick={() => setConfirmDeleteId(null)} 
                            className="flex-1 bg-white/10 hover:bg-white/20 text-white/80 font-bold py-2 px-4 rounded-xl text-sm transition-colors uppercase tracking-wider"
                          >Нет</button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <div className="relative group/logo cursor-pointer shrink-0" onClick={() => handleLogoUploadClick(t.id)} title="Нажмите, чтобы загрузить логотип">
                        <TeamLogo teamName={t.name} logoUrl={t.logoUrl} sizeClassName="w-12 h-12 text-lg shadow-[0_0_15px_rgba(255,143,0,0.15)] transition-all group-hover/logo:scale-105" />
                        <div className="absolute inset-0 bg-black/70 rounded-full opacity-0 group-hover/logo:opacity-100 transition-all flex flex-col items-center justify-center text-[7px] text-white font-black uppercase tracking-wider border border-[#ff8f00]/50 select-none">
                          LOG
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
                      <div className="cursor-pointer flex-1" onClick={() => setSelectedTeamProfile(t)} title="Открыть HLTV профиль команды">
                        <h3 className="text-lg font-black text-white uppercase tracking-wider hover:text-blue-400 transition-colors flex items-center gap-1.5 truncate">
                          <span className="text-white/30 text-xs font-mono w-6">#{globalIdx + 1}</span>
                          <span className="truncate">{t.name}</span>
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-white/40 mt-1">
                          <span>Игроков: {t.players.filter((p: any) => p && p.id).length}/5</span>
                          <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                          <span>TP: {teamplay}</span>
                          <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                          <span>VAC Pts: {(t.totalValRating || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 p-2 bg-black/40 rounded-xl border border-white/5">
                      {t.players?.map((p: any, pIdx: number) => {
                        const isEmpty = !p || !p.id;
                        return (
                          <div key={pIdx} className="relative group/player cursor-help">
                            {isEmpty ? (
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                <span className="text-[10px] text-white/20">?</span>
                              </div>
                            ) : (
                              <>
                                <PlayerAvatar 
                                  playerName={p.nickname} 
                                  avatarUrl={p.avatarUrl} 
                                  sizeClassName="w-8 h-8 md:w-10 md:h-10" 
                                  className="border border-white/10 hover:border-white/30 transition-colors"
                                />
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 px-2 py-1 rounded text-[10px] font-bold text-white whitespace-nowrap opacity-0 group-hover/player:opacity-100 pointer-events-none transition-opacity z-10 flex flex-col items-center">
                                  <span>{p.nickname}</span>
                                  <span className="text-[#ff8f00] font-mono text-[9px]">{p.valRating || 0} pts</span>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 mt-1">
                      <button 
                        onClick={() => setSelectedTeamProfile(t)}
                        className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/40 hover:to-indigo-600/40 text-blue-300 border border-blue-500/30 rounded-lg py-1.5 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        <Trophy className="w-3 h-3 text-blue-400" /> Профиль
                      </button>
                      <button 
                        onClick={() => {
                          setEditingTeamId(t.id);
                          setNewTeamName(t.name);
                          setNewTeamIsAcademy(!!t.isAcademy);
                          setNewTeamLogo(t.logoUrl || null);
                          const pids = t.players?.map((p: any) => p.id || '');
                          while (pids.length < 5) pids.push('');
                          setSelectedPlayers(pids);
                          setShowAddForm(true);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex items-center justify-center gap-1.5 bg-[#ff8f00]/10 hover:bg-[#ff8f00]/20 text-[#ff8f00] border border-[#ff8f00]/20 rounded-lg py-1.5 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3 text-[#ff8f00]" /> Изменить
                      </button>
                      <button 
                        onClick={() => setConfirmDeleteId(t.id)} 
                        className="col-span-2 mt-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-500 border border-white/5 hover:border-red-500/30 rounded-lg py-1.5 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Удалить Команду
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>"""

content = re.sub(pattern, new_grid, content, flags=re.DOTALL)

with open('src/components/Teams.tsx', 'w') as f:
    f.write(content)

print("Done")
