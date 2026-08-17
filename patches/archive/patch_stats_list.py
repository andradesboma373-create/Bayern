import re

with open('src/components/Statistics.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_list = r'\{\/\* Table Header \(Desktop\) \*\/\}.*?\{\/\* Pagination Controls \/ Листы \*\/\}'

new_list = """{/* Table Header (Desktop) */}
            <div className="hidden md:flex items-center px-4 py-2 bg-black/40 border border-white/5 rounded-t-xl text-[10px] uppercase font-bold tracking-widest text-white/30">
              <div className="w-1/3 flex items-center gap-4">
                <div className="w-8 text-center">#</div>
                <div>Команда</div>
              </div>
              <div className="w-1/3 text-center">Состав</div>
              <div className="w-1/3 text-right">Очки</div>
            </div>

            <div className="flex flex-col border border-white/5 rounded-b-xl border-t-0 bg-[#0f0f18] overflow-hidden">
              {currentTeams.map((t, idx) => {
                const globalIdx = indexOfFirstItem + idx;
                const valRating = t.totalValRating || 0;
                
                return (
                  <div 
                    key={t.id} 
                    className="group flex flex-col md:flex-row items-center p-3 md:px-4 md:py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Rank & Team */}
                    <div className="flex items-center gap-4 w-full md:w-1/3">
                      <div className="text-base md:text-lg font-black font-mono w-8 text-center text-white/40 group-hover:text-white transition-colors">
                        {globalIdx + 1}
                      </div>
                      <TeamLogo game={t.game as any} teamName={t.name} sizeClassName="w-10 h-10 md:w-12 md:h-12" />
                      <h2 className="text-sm md:text-base font-black uppercase tracking-wide truncate text-white/80 group-hover:text-white transition-colors">
                        {t.name}
                      </h2>
                    </div>

                    {/* Roster */}
                    <div className="flex items-center justify-center gap-1.5 w-full md:w-1/3 py-3 md:py-0">
                      {t.players.map((p: any, pIdx: number) => {
                        const isEmpty = !p || !p.id;
                        if (isEmpty) return null;
                        return (
                          <div key={pIdx} className="relative group/player cursor-help">
                            <PlayerAvatar 
                              playerName={p.nickname} 
                              avatarUrl={p.avatarUrl}
                              game={t.game as any} 
                              sizeClassName="w-8 h-8 md:w-10 md:h-10" 
                              className="border border-white/10 hover:border-white/30 transition-colors"
                            />
                            {/* tooltip */}
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 px-2 py-1 rounded text-[10px] font-bold text-white whitespace-nowrap opacity-0 group-hover/player:opacity-100 pointer-events-none transition-opacity z-10 flex flex-col items-center shadow-xl">
                                <span>{p.nickname}</span>
                                <span className="text-[#ff8f00] font-mono text-[9px]">{p.valRating || 0} pts</span>
                            </div>
                          </div>
                        );
                      })}
                      {t.players.filter((p: any) => p && p.id).length === 0 && (
                        <span className="text-xs text-white/20 italic">Нет состава</span>
                      )}
                    </div>

                    {/* Points */}
                    <div className="flex justify-between md:justify-end items-center w-full md:w-1/3 text-right">
                      <span className="md:hidden text-[10px] font-bold text-white/30 uppercase tracking-widest">Очки</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-sm md:text-lg font-black text-white/70 group-hover:text-[#ff8f00] transition-colors">{valRating.toLocaleString()}</span>
                        <span className="text-white/30 text-[10px] font-bold tracking-widest uppercase">pts</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination Controls / Листы */}"""

content = re.sub(old_list, new_list, content, flags=re.DOTALL)

with open('src/components/Statistics.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
