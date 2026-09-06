import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

# 1. Update UI for custom background URL
bg_ui_old = """                  <div className="grid grid-cols-4 gap-2">
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
                  </div>"""

bg_ui_new = """                  <div className="grid grid-cols-4 gap-2">
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
                    <button
                      onClick={() => setSelectedBg('custom_url')}
                      className={`h-12 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${selectedBg === 'custom_url' || selectedBg.startsWith('http') || selectedBg.startsWith('data:') ? 'border-blue-500 scale-105 bg-white/10' : 'border-white/10 hover:border-white/30 bg-black/40'}`}
                      title="Своя картинка по ссылке"
                    >
                      <ImageIcon className="w-5 h-5 text-white/50" />
                    </button>
                  </div>
                  {(selectedBg === 'custom_url' || selectedBg.startsWith('http') || selectedBg.startsWith('data:')) && (
                    <div className="mt-2 animate-fade-in">
                       <input 
                         type="text"
                         placeholder="Вставьте ссылку на изображение (http://...)"
                         value={selectedBg === 'custom_url' ? '' : selectedBg}
                         onChange={(e) => setSelectedBg(e.target.value || 'custom_url')}
                         className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm"
                       />
                    </div>
                  )}"""

content = content.replace(bg_ui_old, bg_ui_new)

# 2. Update renderNewsBanner for welcome_player
welcome_old = "className={`w-full h-auto min-h-64 rounded-xl overflow-hidden relative border border-white/10 p-6 flex flex-col justify-center items-center ${n.background || 'bg-gradient-to-br from-[#1a1a24] to-[#12121a]'}`}"
welcome_new = """className={`w-full h-auto min-h-64 rounded-xl overflow-hidden relative border border-white/10 p-6 flex flex-col justify-center items-center ${!n.background || n.background.startsWith('http') || n.background.startsWith('data:') ? 'bg-gradient-to-br from-[#1a1a24] to-[#12121a]' : n.background}`} style={n.background && (n.background.startsWith('http') || n.background.startsWith('data:')) ? { backgroundImage: `url(${n.background})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}"""

content = content.replace(welcome_old, welcome_new)

# 3. Update renderNewsBanner for roster_announcement
roster_old = "className=\"w-full h-auto min-h-64 rounded-xl overflow-hidden relative bg-gradient-to-br from-[#1a1a24] to-[#12121a] border border-white/10 p-6 flex flex-col\""
roster_new = """className={`w-full h-auto min-h-64 rounded-xl overflow-hidden relative border border-white/10 p-6 flex flex-col ${!n.background || n.background.startsWith('http') || n.background.startsWith('data:') ? 'bg-gradient-to-br from-[#1a1a24] to-[#12121a]' : n.background}`} style={n.background && (n.background.startsWith('http') || n.background.startsWith('data:')) ? { backgroundImage: `url(${n.background})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}"""

content = content.replace(roster_old, roster_new)

# 4. Update renderNewsBanner for player_transfer
transfer_old = "className=\"w-full h-64 rounded-xl overflow-hidden relative bg-gradient-to-tr from-blue-900/40 via-[#12121a] to-[#1a1a24] border border-blue-500/20 p-6 flex flex-col justify-center items-center\""
transfer_new = """className={`w-full h-64 rounded-xl overflow-hidden relative border border-blue-500/20 p-6 flex flex-col justify-center items-center ${!n.background || n.background.startsWith('http') || n.background.startsWith('data:') ? 'bg-gradient-to-tr from-blue-900/40 via-[#12121a] to-[#1a1a24]' : n.background}`} style={n.background && (n.background.startsWith('http') || n.background.startsWith('data:')) ? { backgroundImage: `url(${n.background})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}"""

content = content.replace(transfer_old, transfer_new)

with open('src/components/News.tsx', 'w') as f:
    f.write(content)
print("Updated custom bg logic")
