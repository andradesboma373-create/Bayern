import re

with open('src/components/Teams.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Grid
content = content.replace('<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">', '<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">')

# 2. Update Card padding and gap
content = content.replace('<div key={t.id} className="bg-[#12121a] rounded-2xl p-6 flex flex-col gap-6 relative group overflow-hidden">', '<div key={t.id} className="bg-[#12121a] rounded-xl p-4 flex flex-col gap-4 relative group overflow-hidden">')

# 3. Update Team Logo size and name
content = content.replace('sizeClassName="w-16 h-16 text-2xl shadow-[0_0_15px_rgba(255,143,0,0.15)] transition-all group-hover/logo:scale-105"', 'sizeClassName="w-12 h-12 text-lg shadow-[0_0_15px_rgba(255,143,0,0.15)] transition-all group-hover/logo:scale-105"')
content = content.replace('<h3 className="text-2xl font-black text-white uppercase tracking-wider">{t.name}</h3>', '<h3 className="text-lg font-black text-white uppercase tracking-wider">{t.name}</h3>')
content = content.replace('<div className="flex items-center gap-3 text-xs font-bold text-white/40 mt-1">', '<div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-white/40 mt-1">')

# 4. Update Buttons
old_buttons = """<div className="flex flex-col gap-2 mt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setSelectedTeamRoster(t.id)}
                      className="flex items-center justify-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-600/20 rounded-lg py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
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
                      className="flex items-center justify-center gap-2 bg-[#ff8f00]/10 hover:bg-[#ff8f00]/20 text-[#ff8f00] border border-[#ff8f00]/20 rounded-lg py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" /> Изменить
                    </button>
                    <button 
                      onClick={() => handleDownloadTeam(t)}
                      className="flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-lg py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer col-span-2"
                    >
                      <Download className="w-3 h-3" /> Скачать JSON
                    </button>
                  </div>
                  <button 
                    onClick={() => setConfirmDeleteId(t.id)}
                    className="flex items-center justify-center gap-2 bg-red-500/5 hover:bg-red-500/10 text-red-500 border border-red-500/10 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer w-full"
                  >
                    <Trash2 className="w-3 h-3" /> Удалить
                  </button>
                </div>"""

new_buttons = """<div className="grid grid-cols-2 gap-2 mt-1">
                    <button 
                      onClick={() => setSelectedTeamRoster(t.id)}
                      className="flex items-center justify-center gap-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-600/20 rounded-lg py-1.5 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
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
                      className="flex items-center justify-center gap-1.5 bg-[#ff8f00]/10 hover:bg-[#ff8f00]/20 text-[#ff8f00] border border-[#ff8f00]/20 rounded-lg py-1.5 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" /> Изменить
                    </button>
                    <button 
                      onClick={() => handleDownloadTeam(t)}
                      className="flex items-center justify-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-lg py-1.5 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> JSON
                    </button>
                    <button 
                      onClick={() => setConfirmDeleteId(t.id)}
                      className="flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg py-1.5 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Удалить
                    </button>
                </div>"""

content = content.replace(old_buttons, new_buttons)

with open('src/components/Teams.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

