import re

with open('src/components/Statistics.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
if 'TeamLogo' not in content:
    content = content.replace("import { Trophy", "import TeamLogo from './TeamLogo';\nimport PlayerAvatar from './PlayerAvatar';\nimport { Trophy")

# 2. Roster Lineup Chips
old_chips = r'\{\/\* Roster lineup chips \*\/\}.*?\{\/\* VAC Pts \(Desktop\) \*\/\}'

new_chips = """{/* Roster lineup chips */}
                    <div className="col-span-6 flex flex-wrap justify-center lg:justify-start gap-2 w-full">
                      {t.players.map((p: any, pIdx: number) => {
                        const isEmpty = !p || !p.id;
                        return (
                          <div key={pIdx} className="relative group/player">
                            <PlayerAvatar 
                              playerName={!isEmpty ? p.nickname : ''} 
                              avatarUrl={!isEmpty ? p.avatarUrl : undefined}
                              game={t.game as any} 
                              sizeClassName="w-10 h-10 border-2" 
                              className={isEmpty ? 'border-white/5 opacity-50 bg-white/5' : globalIdx === 0 ? 'border-[#ff8f00] shadow-[0_0_10px_rgba(255,143,0,0.3)]' : 'border-white/10 hover:border-white/30 transition-colors'} 
                            />
                            {/* tooltip */}
                            {!isEmpty && (
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#0f0f18] border border-white/10 px-2 py-1 rounded text-[10px] font-bold text-white whitespace-nowrap opacity-0 group-hover/player:opacity-100 pointer-events-none transition-opacity z-10 flex flex-col items-center">
                                    <span>{p.nickname}</span>
                                    <span className="text-[#ff8f00] font-mono text-[9px]">{p.valRating || 0} pts</span>
                                </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* VAC Pts (Desktop) */}"""

content = re.sub(old_chips, new_chips, content, flags=re.DOTALL)

# 3. Add TeamLogo to Team Info
old_team_info = r'\{\/\* Team Info \*\/\}\s*<div className="col-span-3 flex flex-col w-full lg:w-auto text-center lg:text-left">\s*<div className="flex items-center justify-center lg:justify-start gap-2">\s*<h2 className="text-lg lg:text-base font-black uppercase tracking-wider truncate">\{t\.name\}<\/h2>\s*\{globalIdx === 0 && <Sparkles className="w-3\.5 h-3\.5 text-\[\#ff8f00\]" \/>\}\s*<\/div>'

new_team_info = """{/* Team Info */}
                    <div className="col-span-3 flex flex-col w-full lg:w-auto text-center lg:text-left">
                      <div className="flex items-center justify-center lg:justify-start gap-3">
                        <TeamLogo game={t.game as any} teamName={t.name} sizeClassName="w-8 h-8 rounded-lg shadow-md" />
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg lg:text-base font-black uppercase tracking-wider truncate">{t.name}</h2>
                          {globalIdx === 0 && <Sparkles className="w-3.5 h-3.5 text-[#ff8f00] shrink-0" />}
                        </div>
                      </div>"""

content = re.sub(old_team_info, new_team_info, content, flags=re.DOTALL)

with open('src/components/Statistics.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

