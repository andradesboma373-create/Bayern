import re

with open('src/components/Teams.tsx', 'r') as f:
    content = f.read()

if "const [editIsAcademy, setEditIsAcademy] = useState(false);" not in content and "const [newTeamIsAcademy, setNewTeamIsAcademy] = useState(false);" in content and "const [currentPage, setCurrentPage]" not in content:
    content = content.replace("const [newTeamIsAcademy, setNewTeamIsAcademy] = useState(false);", "const [newTeamIsAcademy, setNewTeamIsAcademy] = useState(false);\n  const [currentPage, setCurrentPage] = useState(1);\n  const itemsPerPage = 50;")

if "ExternalLink" in content and "ChevronLeft" not in content:
    content = content.replace("ExternalLink }", "ExternalLink, ChevronLeft, ChevronRight, Check }")

if "onClick={() => setActiveTab('regular')}" in content:
    content = content.replace("onClick={() => setActiveTab('regular')}", "onClick={() => { setActiveTab('regular'); setCurrentPage(1); }}")

if "onClick={() => setActiveTab('academy')}" in content:
    content = content.replace("onClick={() => setActiveTab('academy')}", "onClick={() => { setActiveTab('academy'); setCurrentPage(1); }}")


parts = content.split("      {loading ? (")
if len(parts) == 2:
    prefix = parts[0]
    subparts = parts[1].split("      {selectedTeamProfile && (")
    if len(subparts) == 2:
        suffix = "      {selectedTeamProfile && (" + subparts[1]
        
        new_middle = """      {loading ? (
        <div className="text-center p-8 text-white/50">Загрузка...</div>
      ) : (() => {
        const filteredTeams = teams.filter(t => activeTab === 'academy' ? t.isAcademy === true : !t.isAcademy);

        if (filteredTeams.length === 0) {
          return (
            <div className="text-center p-16 bg-[#12121a] border border-white/5 rounded-2xl text-white/30 font-bold">
              {activeTab === 'academy' ? 'В академии пока нет команд.' : 'В этом канале пока нет обычных команд.'}
            </div>
          );
        }

        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        const currentTeams = filteredTeams.slice(indexOfFirstItem, indexOfLastItem);
        const totalPages = Math.ceil(filteredTeams.length / itemsPerPage);

        return (
          <div className="flex flex-col">
            <div className="flex text-[10px] font-bold text-white/40 uppercase tracking-widest bg-black/40 p-3 md:px-4 md:py-3 rounded-t-xl border border-white/5">
              <div className="w-10 text-center">#</div>
              <div className="flex-1 min-w-0">Команда</div>
              <div className="w-1/3 md:w-2/5 text-center hidden sm:block">Состав</div>
              <div className="w-16 md:w-20 text-center">TP</div>
              <div className="w-24 md:w-32 text-right">Действия</div>
            </div>
            
            <div className="flex flex-col border border-white/5 rounded-b-xl border-t-0 bg-[#0f0f18]">
              {currentTeams.map((t, idx) => {
                const globalIdx = indexOfFirstItem + idx;
                const teamplay = (t.players.reduce((acc: number, p: any) => acc + (p && p.rating ? Number(p.rating) : 0), 0) / 5).toFixed(0);

                return (
                  <div key={t.id} className="group flex items-center p-3 md:px-4 md:py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.05] transition-colors relative overflow-hidden">
                    {confirmDeleteId === t.id && (
                      <div className="absolute inset-0 bg-black/95 flex items-center justify-between px-6 text-center z-20 animate-fade-in">
                        <div className="text-sm font-bold text-white uppercase tracking-wider">Удалить {t.name}?</div>
                        <div className="flex gap-2 w-full max-w-[160px]">
                          <button 
                            onClick={() => handleDeleteTeam(t.id)} 
                            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors"
                          >Да</button>
                          <button 
                            onClick={() => setConfirmDeleteId(null)} 
                            className="flex-1 bg-white/10 hover:bg-white/20 text-white/80 font-bold py-1.5 px-3 rounded-lg text-xs transition-colors"
                          >Нет</button>
                        </div>
                      </div>
                    )}
                    
                    {/* Rank */}
                    <div className="text-sm md:text-base font-black font-mono w-10 text-center text-white/40 group-hover:text-white transition-colors">
                      {globalIdx + 1}
                    </div>

                    {/* Team Info */}
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <div className="cursor-pointer relative group/logo shrink-0" onClick={() => handleLogoUploadClick(t.id)} title="Нажмите, чтобы загрузить логотип">
                        <TeamLogo teamName={t.name} logoUrl={t.logoUrl} sizeClassName="w-8 h-8 md:w-10 md:h-10" />
                        <div className="absolute inset-0 bg-black/70 rounded-full opacity-0 group-hover/logo:opacity-100 transition-all flex flex-col items-center justify-center text-[7px] text-white font-black uppercase tracking-wider border border-[#ff8f00]/50 select-none">
                          LOG
                        </div>
                      </div>
                      <div 
                        onClick={() => setSelectedTeamProfile(t)}
                        className="font-black text-white text-sm md:text-base cursor-pointer hover:text-blue-400 transition-colors uppercase tracking-wider truncate"
                      >
                        {t.name}
                      </div>
                    </div>

                    {/* Roster (Hidden on mobile for space) */}
                    <div className="w-1/3 md:w-2/5 hidden sm:flex items-center justify-center gap-1">
                      {t.players?.map((p: any, pIdx: number) => {
                        const isEmpty = !p || !p.id;
                        if (isEmpty) return null;
                        return (
                          <div key={pIdx} className="relative group/player cursor-help">
                            <PlayerAvatar 
                              playerName={p.nickname} 
                              avatarUrl={p.avatarUrl} 
                              sizeClassName="w-6 h-6 md:w-8 md:h-8" 
                              className="border border-white/10 hover:border-white/30 transition-colors"
                            />
                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 px-1.5 py-0.5 rounded text-[9px] font-bold text-white whitespace-nowrap opacity-0 group-hover/player:opacity-100 pointer-events-none transition-opacity z-10 flex flex-col items-center">
                              <span>{p.nickname}</span>
                            </div>
                          </div>
                        );
                      })}
                      {t.players.filter((p: any) => p && p.id).length === 0 && (
                        <span className="text-[10px] text-white/20 italic">Нет состава</span>
                      )}
                    </div>

                    {/* Teamplay / Rating */}
                    <div className="w-16 md:w-20 text-center flex flex-col">
                      <span className="font-black text-blue-400 font-mono text-xs md:text-sm">{teamplay}</span>
                    </div>

                    {/* Actions */}
                    <div className="w-24 md:w-32 flex justify-end gap-2 md:gap-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button onClick={() => setSelectedTeamRoster(t.id)} className="text-white/20 hover:text-[#ff8f00] transition-colors cursor-pointer" title="Состав">
                        <User className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                      <button 
                        onClick={() => {
                          setEditingTeamId(t.id);
                          setNewTeamName(t.name);
                          setNewTeamIsAcademy(!!t.isAcademy);
                          const pids = t.players?.map((p: any) => p.id || '');
                          while (pids.length < 5) pids.push('');
                          setSelectedPlayers(pids);
                          setShowAddForm(true);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-white/20 hover:text-green-400 transition-colors cursor-pointer" title="Редактировать"
                      >
                        <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                      <button onClick={() => setConfirmDeleteId(t.id)} className="text-white/20 hover:text-red-500 transition-colors cursor-pointer" title="Удалить">
                        <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center justify-between bg-[#12121a] border border-white/5 rounded-2xl p-4 mt-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-2 px-4 py-2.5 bg-black/40 hover:bg-black/60 disabled:bg-transparent disabled:opacity-20 text-white/80 disabled:text-white/20 border border-white/5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Назад
              </button>
              
              <div className="text-sm font-bold text-white/50">
                Страница <span className="text-white bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 font-mono text-sm mx-1">{currentPage}</span> из <span className="text-white bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 font-mono text-sm mx-1">{totalPages}</span>
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-2 px-4 py-2.5 bg-black/40 hover:bg-black/60 disabled:bg-transparent disabled:opacity-20 text-white/80 disabled:text-white/20 border border-white/5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Вперед
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })()}
"""
        with open('src/components/Teams.tsx', 'w') as f:
            f.write(prefix + new_middle + suffix)
        print("Replaced Teams successfully")
    else:
        print("Could not find suffix boundary in Teams")
else:
    print("Could not find prefix boundary in Teams")

