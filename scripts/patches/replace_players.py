import re

with open('src/components/Players.tsx', 'r') as f:
    content = f.read()

# Add pagination states
if "const [editIsAcademy, setEditIsAcademy] = useState(false);" in content and "const [currentPage" not in content:
    content = content.replace("const [editIsAcademy, setEditIsAcademy] = useState(false);", "const [editIsAcademy, setEditIsAcademy] = useState(false);\n  const [currentPage, setCurrentPage] = useState(1);\n  const itemsPerPage = 50;")

if "ExternalLink" in content and "ChevronLeft" not in content:
    content = content.replace("ExternalLink }", "ExternalLink, ChevronLeft, ChevronRight, Check }")

if "onChange={e => setSearchQuery(e.target.value)}" in content:
    content = content.replace("onChange={e => setSearchQuery(e.target.value)}", "onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}")

if "onClick={() => setActiveTab('regular')}" in content:
    content = content.replace("onClick={() => setActiveTab('regular')}", "onClick={() => { setActiveTab('regular'); setCurrentPage(1); }}")

if "onClick={() => setActiveTab('academy')}" in content:
    content = content.replace("onClick={() => setActiveTab('academy')}", "onClick={() => { setActiveTab('academy'); setCurrentPage(1); }}")

# We want to replace the list rendering.
# We'll split the file at '{loading ? ('
# and then find the corresponding closing ')}' for the loading block, which is right before '{selectedProfilePlayer &&'

parts = content.split("      {loading ? (")
if len(parts) == 2:
    prefix = parts[0]
    subparts = parts[1].split("      {selectedProfilePlayer && (")
    if len(subparts) == 2:
        suffix = "      {selectedProfilePlayer && (" + subparts[1]
        
        # Now we replace the middle part.
        new_middle = """      {loading ? (
        <div className="text-center p-8 text-white/50">Загрузка...</div>
      ) : (() => {
        const filteredPlayers = players
          .filter(p => activeTab === 'academy' ? p.isAcademy === true : !p.isAcademy)
          .filter(p => p.nickname.toLowerCase().includes(searchQuery.toLowerCase()));

        if (filteredPlayers.length === 0) {
          return (
            <div className="text-center p-16 bg-[#12121a] border border-white/5 rounded-2xl text-white/30 font-bold">
              {activeTab === 'academy' ? 'В академии пока нет игроков.' : 'Нет обычных игроков.'}
            </div>
          );
        }

        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        const currentPlayers = filteredPlayers.slice(indexOfFirstItem, indexOfLastItem);
        const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage);

        return (
          <div className="flex flex-col">
            <div className="flex text-[10px] font-bold text-white/40 uppercase tracking-widest bg-black/40 p-3 md:px-4 md:py-3 rounded-t-xl border border-white/5">
              <div className="w-10 text-center">#</div>
              <div className="flex-1 min-w-0">Игрок</div>
              <div className="w-16 md:w-24 text-center">Роль</div>
              <div className="w-16 md:w-20 text-center">CS</div>
              <div className="w-16 md:w-24 text-right">VAC Pts</div>
              <div className="w-24 md:w-32 text-right">Действия</div>
            </div>
            <div className="flex flex-col border border-white/5 rounded-b-xl border-t-0 bg-[#0f0f18]">
              {currentPlayers.map((p, idx) => {
                const globalIdx = indexOfFirstItem + idx;
                const pTeam = teams.find(t => t.players?.some((tp: any) => tp.id === p.id));
                
                return (
                  <div key={p.id} className="group flex items-center p-3 md:px-4 md:py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.05] transition-colors relative overflow-hidden">
                    {confirmDeleteId === p.id && (
                      <div className="absolute inset-0 bg-black/95 flex items-center justify-between px-6 text-center z-10 animate-fade-in">
                        <div className="text-sm font-bold text-white uppercase tracking-wider">Удалить {p.nickname}?</div>
                        <div className="flex gap-2 w-full max-w-[160px]">
                          <button 
                            onClick={() => handleDeletePlayer(p.id)} 
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

                    {/* Player Info */}
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <div onClick={() => setSelectedProfilePlayer(p)} className="cursor-pointer">
                        <PlayerAvatar playerName={p.nickname} avatarUrl={p.avatarUrl} sizeClassName="w-8 h-8 md:w-10 md:h-10" />
                      </div>
                      <div className="flex flex-col">
                        <div 
                          onClick={() => setSelectedProfilePlayer(p)}
                          className="font-black text-white text-sm md:text-base cursor-pointer hover:text-blue-400 transition-colors flex items-center gap-2 flex-wrap"
                        >
                          {p.nickname}
                          {pTeam ? (
                            <span className="text-[9px] bg-white/5 border border-white/10 text-white/60 px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
                              {pTeam.name}
                            </span>
                          ) : (
                            <span className="text-[9px] bg-amber-500/10 border border-amber-500/30 text-amber-500 px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
                              FFT
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Role */}
                    <div className="w-16 md:w-24 text-center">
                      <span className="text-[10px] md:text-xs text-white/50 uppercase tracking-widest">{p.role}</span>
                    </div>

                    {/* CS Rating */}
                    <div className="w-16 md:w-20 text-center">
                      <span className="font-black text-blue-400 font-mono text-xs md:text-sm">{Number(p.rating).toFixed(2)}</span>
                    </div>

                    {/* VAC Pts */}
                    <div className="w-16 md:w-24 text-right">
                      <span className="font-black text-[#ff8f00] font-mono text-xs md:text-sm">{(p.valRating || 0).toLocaleString()}</span>
                    </div>

                    {/* Actions */}
                    <div className="w-24 md:w-32 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setSelectedProfilePlayer(p)} className="text-white/20 hover:text-blue-400 transition-colors cursor-pointer" title="Профиль">
                        <ExternalLink className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                      <button onClick={() => setConfirmDeleteId(p.id)} className="text-white/20 hover:text-red-500 transition-colors cursor-pointer" title="Удалить">
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
        
        with open('src/components/Players.tsx', 'w') as f:
            f.write(prefix + new_middle + suffix)
        print("Replaced successfully")
    else:
        print("Could not find suffix boundary")
else:
    print("Could not find prefix boundary")

