import re

with open('src/components/Simulator.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Compact header block

header_block_old = """      {/* Banner */}
      <div className="bg-gradient-to-r from-[#171728] to-[#121220] rounded-2xl p-8 border border-white/5 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-blue-500/20 blur-[100px] z-0"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-white tracking-wider mb-2">MATCH SIMULATOR</h1>
          <p className="text-white/50 text-sm font-semibold tracking-[0.2em] uppercase">СИМУЛЯЦИЯ МАТЧЕЙ CS2 & STANDOFF 2</p>
          
          <div className="mt-8 flex flex-wrap gap-4">
            <div className="bg-[#0f0f18] border border-white/10 rounded-xl p-4 flex flex-col gap-2 flex-1 min-w-[250px]">
              <div className="text-xs text-white/50 font-bold uppercase tracking-wider mb-1">Выбор игры</div>
              <div className="flex gap-2">
                <button onClick={() => { setGame('s2'); setSelectedMaps([]); }} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${game === 's2' ? 'bg-[#ff8f00]/10 text-[#ff8f00] border border-[#ff8f00]/30' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>STANDOFF 2</button>
                <button onClick={() => { setGame('cs2'); setSelectedMaps([]); }} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${game === 'cs2' ? 'bg-[#ff8f00]/10 text-[#ff8f00] border border-[#ff8f00]/30' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>CS2</button>
              </div>
            </div>

            <div className="bg-[#0f0f18] border border-white/10 rounded-xl p-4 flex flex-col gap-2 flex-1 min-w-[250px]">
              <div className="text-xs text-white/50 font-bold uppercase tracking-wider mb-1">Формат матча</div>
              <div className="flex gap-2">
                {['BO1', 'BO3', 'BO5'].map(f => (
                  <button key={f} onClick={() => { setFormat(f); setSelectedMaps([]); }} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${format === f ? 'bg-blue-600/20 text-blue-500 border border-blue-500/30' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>{f}</button>
                ))}
              </div>
            </div>"""

header_block_new = """      {/* Banner */}
      <div className="bg-gradient-to-r from-[#171728] to-[#121220] rounded-xl p-4 border border-white/5 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-blue-500/20 blur-[100px] z-0"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white tracking-wider mb-1">MATCH SIMULATOR</h1>
              <p className="text-white/50 text-[10px] font-semibold tracking-[0.2em] uppercase">СИМУЛЯЦИЯ МАТЧЕЙ CS2 & STANDOFF 2</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <div className="bg-[#0f0f18] border border-white/10 rounded-lg p-2 flex items-center gap-2">
                <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider mx-2">Игра:</span>
                <div className="flex gap-1">
                  <button onClick={() => { setGame('s2'); setSelectedMaps([]); }} className={`px-4 py-1.5 rounded text-[10px] font-bold transition-all ${game === 's2' ? 'bg-[#ff8f00]/10 text-[#ff8f00] border border-[#ff8f00]/30' : 'bg-white/5 text-white/40 hover:bg-white/10 border border-transparent'}`}>STANDOFF 2</button>
                  <button onClick={() => { setGame('cs2'); setSelectedMaps([]); }} className={`px-4 py-1.5 rounded text-[10px] font-bold transition-all ${game === 'cs2' ? 'bg-[#ff8f00]/10 text-[#ff8f00] border border-[#ff8f00]/30' : 'bg-white/5 text-white/40 hover:bg-white/10 border border-transparent'}`}>CS2</button>
                </div>
              </div>

              <div className="bg-[#0f0f18] border border-white/10 rounded-lg p-2 flex items-center gap-2">
                <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider mx-2">Формат:</span>
                <div className="flex gap-1">
                  {['BO1', 'BO3', 'BO5'].map(f => (
                    <button key={f} onClick={() => { setFormat(f); setSelectedMaps([]); }} className={`px-4 py-1.5 rounded text-[10px] font-bold transition-all ${format === f ? 'bg-blue-600/20 text-blue-500 border border-blue-500/30' : 'bg-white/5 text-white/40 hover:bg-white/10 border border-transparent'}`}>{f}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4">"""

content = content.replace(header_block_old, header_block_new)

# Fix layout for the remaining part (the map selector container)
content = content.replace('<div className="bg-[#0f0f18] border border-white/10 rounded-xl p-4 flex flex-col gap-2 flex-1 min-w-[250px] lg:col-span-2">', '<div className="bg-[#0f0f18] border border-white/10 rounded-lg p-4 flex flex-col gap-2 w-full">')
content = content.replace('<button \n                      key={m.id} \n                      onClick={() => {\n                        if (isSelected) {\n                          setSelectedMaps(selectedMaps.filter(x => x !== m.name));\n                        } else if (canSelect) {\n                          setSelectedMaps([...selectedMaps, m.name]);\n                        }\n                      }}\n                      disabled={!canSelect && !isSelected}\n                      style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.85)), url(\'/maps/${m.name.toLowerCase()}.jpg\')`, backgroundSize: \'cover\', backgroundPosition: \'center\', textShadow: \'0 2px 4px rgba(0,0,0,0.8)\' }} className={`relative flex-1 py-3 px-3 rounded-xl font-bold text-sm transition-all flex flex-col items-center justify-center gap-1 min-w-[90px] min-h-[70px] ${isSelected ? \'text-purple-400 border-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]\' : canSelect ? \'text-white/80 hover:text-white hover:border-white/30 border-2 border-white/10\' : \'text-white/30 opacity-50 border-2 border-white/5 cursor-not-allowed\'}`}', '<button \n                      key={m.id} \n                      onClick={() => {\n                        if (isSelected) {\n                          setSelectedMaps(selectedMaps.filter(x => x !== m.name));\n                        } else if (canSelect) {\n                          setSelectedMaps([...selectedMaps, m.name]);\n                        }\n                      }}\n                      disabled={!canSelect && !isSelected}\n                      style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.85)), url(\'/maps/${m.name.toLowerCase()}.jpg\')`, backgroundSize: \'cover\', backgroundPosition: \'center\', textShadow: \'0 2px 4px rgba(0,0,0,0.8)\' }} className={`relative flex-1 py-2 px-2 rounded-lg font-bold text-xs transition-all flex flex-col items-center justify-center min-w-[80px] min-h-[60px] ${isSelected ? \'text-purple-400 border-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]\' : canSelect ? \'text-white/80 hover:text-white hover:border-white/30 border border-white/10\' : \'text-white/30 opacity-50 border border-white/5 cursor-not-allowed\'}`}')

with open('src/components/Simulator.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

