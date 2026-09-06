import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

invites_render = """    if (n.type === 'tournament_invites') {
      const invTeams = (n.teamIds || []).map((id: string) => teams.find(t => t.id === id)).filter(Boolean);
      return (
        <div id={`news-banner-${n.id}`} className={`w-full h-auto min-h-64 rounded-xl overflow-hidden relative border border-white/10 p-6 flex flex-col justify-center items-center ${!n.background || n.background.startsWith('http') || n.background.startsWith('data:') ? 'bg-gradient-to-br from-[#1a1a24] to-[#12121a]' : n.background}`} style={n.background && (n.background.startsWith('http') || n.background.startsWith('data:')) ? { backgroundImage: `url(${n.background})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
          <div className="absolute inset-0 bg-black/40 pointer-events-none mix-blend-overlay"></div>
          
          <div className="z-10 flex flex-col items-center animate-fade-in w-full">
            <div className="text-white font-black uppercase tracking-[0.2em] text-2xl mb-8 text-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
              {n.title || "ПРИГЛАШЕННЫЕ НА ТУРНИР"}
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 max-w-2xl">
              {invTeams.map((t: any, i: number) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 rounded-full bg-black/50 border-2 border-white/20 flex items-center justify-center p-3 backdrop-blur-sm shadow-xl relative">
                    <TeamLogo game={user?.game || 'cs2'} teamName={t.name} sizeClassName="w-12 h-12" />
                  </div>
                  <span className="text-white font-bold text-sm drop-shadow-md">{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
"""

# Insert before welcome_player
content = content.replace("if (n.type === 'welcome_player' && team && player) {", invites_render + "\n    if (n.type === 'welcome_player' && team && player) {")

with open('src/components/News.tsx', 'w') as f:
    f.write(content)
