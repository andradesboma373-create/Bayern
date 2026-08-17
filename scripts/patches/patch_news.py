import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

# Add welcome_player to type
content = content.replace(
    "const [newType, setNewType] = useState<'custom' | 'roster_announcement' | 'player_transfer'>('roster_announcement');",
    "const [newType, setNewType] = useState<'custom' | 'roster_announcement' | 'player_transfer' | 'welcome_player'>('welcome_player');"
)

content = content.replace(
    "const [selectedPlayerId, setSelectedPlayerId] = useState('');",
    "const [selectedPlayerId, setSelectedPlayerId] = useState('');\n  const [selectedBg, setSelectedBg] = useState('bg-gradient-to-br from-[#1a1a24] to-[#12121a]');\n  const [fullViewNews, setFullViewNews] = useState<any | null>(null);"
)

backgrounds = [
  "bg-gradient-to-br from-[#1a1a24] to-[#12121a]",
  "bg-gradient-to-tr from-blue-900/40 via-[#12121a] to-[#1a1a24]",
  "bg-gradient-to-r from-purple-900/50 via-black to-blue-900/50",
  "bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-[#0a0a0f]",
  "bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-indigo-950",
  "bg-gradient-to-br from-green-900/40 to-[#12121a]",
  "bg-gradient-to-bl from-orange-900/40 to-black"
]

content = content.replace(
    "if (newType === 'player_transfer' && (!selectedTeamId || !selectedPlayerId)) {",
    "if ((newType === 'player_transfer' || newType === 'welcome_player') && (!selectedTeamId || !selectedPlayerId)) {"
)

content = content.replace(
    "createdAt: Date.now(),",
    "createdAt: Date.now(),\n      background: selectedBg,"
)

render_welcome = """
    if (n.type === 'welcome_player' && team && player) {
      return (
        <div id={`news-banner-${n.id}`} className={`w-full h-auto min-h-64 rounded-xl overflow-hidden relative border border-white/10 p-6 flex flex-col justify-center items-center ${n.background || 'bg-gradient-to-br from-[#1a1a24] to-[#12121a]'}`}>
          <div className="absolute inset-0 bg-black/20 pointer-events-none mix-blend-overlay"></div>
          
          <div className="z-10 flex flex-col items-center animate-fade-in">
            <div className="text-white/60 font-bold uppercase tracking-[0.3em] text-xs mb-6 text-center shadow-black drop-shadow-md">
              WELCOME TO {team.name}
            </div>
            
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white/10 overflow-hidden relative shadow-2xl bg-[#12121a] flex items-center justify-center">
                 <PlayerAvatar playerName={player.nickname} avatarUrl={player.avatarUrl} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-[#1a1a24] rounded-full border-4 border-[#1a1a24] flex items-center justify-center shadow-lg">
                 <TeamLogo teamName={team.name} logoUrl={team.logoUrl} className="w-10 h-10" />
              </div>
            </div>

            <h3 className="text-3xl md:text-5xl font-black text-white text-center tracking-tight shadow-black drop-shadow-lg">
              {n.title}
            </h3>
          </div>
        </div>
      );
    }
"""

content = content.replace("    if (n.type === 'roster_announcement' && team) {", render_welcome + "    if (n.type === 'roster_announcement' && team) {")


ui_button = """                  <button
                    onClick={() => setNewType('welcome_player')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${newType === 'welcome_player' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-black/20 border-white/10 text-white/50 hover:bg-white/5'}`}
                  >
                    <User className="w-6 h-6" />
                    <span className="text-xs font-bold text-center">Приветствие игрока</span>
                  </button>"""

content = content.replace(
    "<div className=\"grid grid-cols-1 sm:grid-cols-3 gap-3\">",
    "<div className=\"grid grid-cols-2 sm:grid-cols-4 gap-3\">\n" + ui_button
)


bg_selection = """              {newType === 'welcome_player' && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-xs font-bold text-white/50 uppercase">Фон карточки</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      "bg-gradient-to-br from-[#1a1a24] to-[#12121a]",
                      "bg-gradient-to-tr from-blue-900/40 via-[#12121a] to-[#1a1a24]",
                      "bg-gradient-to-r from-purple-900/50 via-black to-blue-900/50",
                      "bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-[#0a0a0f]",
                      "bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-indigo-950",
                      "bg-gradient-to-br from-green-900/40 to-[#12121a]",
                      "bg-gradient-to-bl from-orange-900/40 to-black"
                    ].map((bg, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedBg(bg)}
                        className={`h-12 rounded-xl border-2 transition-all ${selectedBg === bg ? 'border-blue-500 scale-105' : 'border-white/10 hover:border-white/30'} ${bg}`}
                      />
                    ))}
                  </div>
                </div>
              )}"""

content = content.replace("              {(newType === 'roster_announcement' || newType === 'player_transfer') && (", bg_selection + "\n              {(newType === 'roster_announcement' || newType === 'player_transfer' || newType === 'welcome_player') && (")


content = content.replace("              {newType === 'player_transfer' && (", "              {(newType === 'player_transfer' || newType === 'welcome_player') && (")


# Add clicking on card logic
content = content.replace(
    "            <div key={n.id} className=\"relative group animate-fade-in\">",
    "            <div key={n.id} className=\"relative group animate-fade-in cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all rounded-xl\" onClick={() => setFullViewNews(n)}>"
)


full_view_modal = """
      {fullViewNews && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4" onClick={() => setFullViewNews(null)}>
          <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setFullViewNews(null)} className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors">
              <X className="w-8 h-8" />
            </button>
            <div className="shadow-2xl shadow-blue-500/10 rounded-xl overflow-hidden">
               {renderNewsBanner(fullViewNews)}
            </div>
            <div className="mt-6 flex justify-center">
              <button 
                 onClick={() => handleDownload(fullViewNews.id, fullViewNews.title)}
                 className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all flex items-center gap-2"
              >
                 <Download className="w-5 h-5" />
                 СКАЧАТЬ ИЗОБРАЖЕНИЕ
              </button>
            </div>
          </div>
        </div>
      )}
"""

content = content.replace("      {showAddModal && (", full_view_modal + "\n      {showAddModal && (")


content = content.replace(
    "import { Newspaper, Users, Plus, X, Image as ImageIcon, Search, LayoutTemplate, Trash2, ArrowRight, Download } from 'lucide-react';",
    "import { Newspaper, Users, Plus, X, Image as ImageIcon, Search, LayoutTemplate, Trash2, ArrowRight, Download, User } from 'lucide-react';"
)


with open('src/components/News.tsx', 'w') as f:
    f.write(content)

print("Added Welcome Player and Full View")
