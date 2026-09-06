import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

old_render = """        <div className={`grid gap-4 w-full ${invTeams.length > 8 ? 'grid-cols-4 sm:grid-cols-8' : 'grid-cols-4'} justify-items-center max-w-4xl px-4`}>
          {invTeams.map((t: any, i: number) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className={`rounded-full bg-black/50 border-2 border-white/20 flex items-center justify-center backdrop-blur-sm shadow-xl relative ${invTeams.length > 8 ? 'w-14 h-14 p-2' : 'w-20 h-20 p-3'}`}>
                <TeamLogo game={user?.game || 'cs2'} teamName={t.name} sizeClassName={invTeams.length > 8 ? 'w-8 h-8' : 'w-12 h-12'} />
              </div>
              <span className={`text-white font-bold drop-shadow-md text-center ${invTeams.length > 8 ? 'text-[10px] max-w-[60px] truncate' : 'text-sm'}`}>{t.name}</span>
            </div>
          ))}
        </div>"""

new_render = """        <div className={`flex flex-wrap justify-center gap-x-3 gap-y-4 w-full max-w-2xl px-8 ${invTeams.length > 8 ? 'mt-4' : 'mt-8'}`}>
          {invTeams.map((t: any, i: number) => (
            <div key={i} className="flex flex-col items-center gap-2 w-16 sm:w-20">
              <div className={`rounded-full bg-black/50 border-2 border-white/20 flex items-center justify-center backdrop-blur-sm shadow-[0_0_15px_rgba(0,0,0,0.8)] relative ${invTeams.length > 8 ? 'w-12 h-12 p-1.5' : 'w-16 h-16 p-2'}`}>
                <TeamLogo game={user?.game || 'cs2'} teamName={t.name} sizeClassName={invTeams.length > 8 ? 'w-8 h-8' : 'w-10 h-10'} />
              </div>
              <span className={`text-white font-black drop-shadow-[0_2px_4px_rgba(0,0,0,1)] text-center tracking-wider uppercase leading-tight ${invTeams.length > 8 ? 'text-[9px] max-w-full truncate' : 'text-[10px]'}`}>{t.name}</span>
            </div>
          ))}
        </div>"""

content = content.replace(old_render, new_render)

with open('src/components/News.tsx', 'w') as f:
    f.write(content)
