import re

with open('src/components/Simulator.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

header_block_old_pattern = r'\{\/\* Banner \*\/\}\n\s*<div className="bg-gradient-to-r.*?<div className="mt-4">\s*<div className="bg-\[\#0f0f18\].*?<div className="flex justify-between items-center mb-1">'

header_block_new = """{/* Banner */}
      <div className="bg-gradient-to-r from-[#171728] to-[#121220] rounded-2xl p-6 border border-white/5 relative overflow-hidden flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-blue-500/20 blur-[100px] z-0"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-white tracking-wider mb-2">MATCH SIMULATOR</h1>
          <p className="text-white/50 text-xs font-semibold tracking-[0.2em] uppercase">СИМУЛЯЦИЯ МАТЧЕЙ</p>
        </div>
        
        <div className="relative z-10 flex flex-wrap gap-4 bg-black/40 p-3 rounded-2xl border border-white/10 backdrop-blur-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider ml-1">Игра</span>
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
              <button onClick={() => { setGame('s2'); setSelectedMaps([]); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${game === 's2' ? 'bg-[#ff8f00] text-black shadow-md shadow-[#ff8f00]/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>STANDOFF 2</button>
              <button onClick={() => { setGame('cs2'); setSelectedMaps([]); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${game === 'cs2' ? 'bg-[#ff8f00] text-black shadow-md shadow-[#ff8f00]/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>CS2</button>
            </div>
          </div>
          
          <div className="hidden sm:block w-[1px] bg-white/10 my-1"></div>
          
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider ml-1">Формат</span>
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
              {['BO1', 'BO3', 'BO5'].map(f => (
                <button key={f} onClick={() => { setFormat(f); setSelectedMaps([]); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${format === f ? 'bg-white/20 text-white shadow-md' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>{f}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Maps Selection */}
      <div className="bg-[#12121a] rounded-2xl p-5 border border-white/5 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-white font-bold uppercase tracking-wider flex items-center gap-3">
            Выбор карт
            <span className="bg-white/10 text-white/70 px-2.5 py-1 rounded-md text-[10px]">{selectedMaps.length} / {parseInt(format.replace('BO', ''))}</span>
          </div>"""

# Replace up to the map selection header
content = re.sub(header_block_old_pattern, header_block_new, content, flags=re.DOTALL)

# Adjust maps grid container
content = content.replace('<div className="flex flex-wrap gap-2">', '<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-3">')

# Adjust map buttons
old_map_button = r'style=\{\{ backgroundImage: `linear-gradient.*?className=\{`relative flex-1 py-2 px-2 rounded-lg font-bold text-xs transition-all flex flex-col items-center justify-center min-w-\[80px\] min-h-\[60px\].*?`\}'
new_map_button = r"style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.9)), url('/maps/${m.name.toLowerCase()}.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }} className={`relative aspect-[4/3] rounded-xl font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 overflow-hidden group ${isSelected ? 'text-[#ff8f00] border-2 border-[#ff8f00] shadow-[0_0_15px_rgba(255,143,0,0.4)] scale-105 z-10' : canSelect ? 'text-white/80 hover:text-white hover:border-white/30 border-2 border-white/10' : 'text-white/30 opacity-40 border-2 border-white/5 cursor-not-allowed'}`}"

content = re.sub(old_map_button, new_map_button, content, flags=re.DOTALL)

# Fix remaining closing div from old structure
# The old structure had two extra closing divs: `</div>` from flex-wrap and `</div>` from `bg-[#0f0f18]`.
# Actually let's just make sure the tags match.
# Wait, let's look at how it closes currently.
# Current closing:
#               </div>
#             </div>
#           </div>
#       {/* Controls */}
# We can just leave it as is if it matches, but let's check.
# My new structure has:
# <div className="bg-[#12121a]...">
#   <div className="flex justify-between items-center">
#     ...
#     <div className="flex gap-4">
#       <button>Случайно</button>
#       <button>Сбросить</button>
#     </div>
#   </div>
#   <div className="grid ...">
#      {maps.map(...)}
#   </div>
# </div>

# Let's clean up the closing tags before {/* Controls */}
content = re.sub(r'              </div>\n            </div>\n          </div>\n\n      \{\/\* Controls \*\/\}', '              </div>\n      </div>\n\n      {/* Controls */}', content)

with open('src/components/Simulator.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
