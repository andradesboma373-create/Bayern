import re

with open('src/components/Simulator.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the broken block from Maps Selection up to the closing div of Start Match
old_pattern = r'\{\/\* Maps Selection \*\/\}.*?<button \n                onClick=\{handleSimulate\}.*?<\/button>\n            <\/div>\n          <\/div>\n        <\/div>\n      <\/div>'
# Wait, let's just grab the whole thing from Banner to H2H section to be safe

start_idx = content.find('{/* Banner */}')
end_idx = content.find('{/* H2H and Winrates Section */}')

new_block = """{/* Banner */}
      <div className="bg-gradient-to-r from-[#171728] to-[#121220] rounded-2xl p-6 border border-white/5 relative overflow-hidden flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
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

      <div className="flex flex-col xl:flex-row gap-4">
        {/* Maps Selection */}
        <div className="bg-[#12121a] rounded-2xl p-5 border border-white/5 flex flex-col gap-4 flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-sm text-white font-bold uppercase tracking-wider flex items-center gap-3">
              Выбор карт
              <span className="bg-white/10 text-white/70 px-2.5 py-1 rounded-md text-[10px]">{selectedMaps.length} / {parseInt(format.replace('BO', ''))}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => {
                const bo = parseInt(format.replace('BO', ''));
                if (selectedMaps.length < bo) {
                  const mapPool = (game === 'cs2' ? MAP_POOL_CS2 : MAP_POOL_S2).map(m => m.name);
                  const availableMaps = mapPool.filter(m => !selectedMaps.includes(m));
                  const needed = bo - selectedMaps.length;
                  const randomPicks = [...availableMaps].sort(() => Math.random() - 0.5).slice(0, needed);
                  setSelectedMaps([...selectedMaps, ...randomPicks]);
                }
              }} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg font-bold uppercase transition-colors">Случайно</button>
              <button onClick={() => setSelectedMaps([])} className="text-xs bg-white/5 text-white/50 hover:bg-white/10 hover:text-white px-3 py-1.5 rounded-lg font-bold uppercase transition-colors">Сбросить</button>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
            {(game === 'cs2' ? MAP_POOL_CS2 : MAP_POOL_S2).map(m => {
              const isSelected = selectedMaps.includes(m.name);
              const canSelect = isSelected || selectedMaps.length < parseInt(format.replace('BO', ''));
              return (
                <button 
                  key={m.id} 
                  onClick={() => {
                    if (isSelected) {
                      setSelectedMaps(selectedMaps.filter(x => x !== m.name));
                    } else if (canSelect) {
                      setSelectedMaps([...selectedMaps, m.name]);
                    }
                  }}
                  disabled={!canSelect && !isSelected}
                  style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.9)), url('/maps/${m.name.toLowerCase()}.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }} className={`relative aspect-[4/3] rounded-xl font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 overflow-hidden group ${isSelected ? 'text-[#ff8f00] border-2 border-[#ff8f00] shadow-[0_0_15px_rgba(255,143,0,0.4)] scale-[1.03] z-10' : canSelect ? 'text-white/80 hover:text-white hover:border-white/30 border-2 border-white/10' : 'text-white/30 opacity-40 border-2 border-white/5 cursor-not-allowed'}`}
                >
                  <span className="truncate w-full text-center">{m.name}</span>
                  <div className="flex gap-2 text-[10px] opacity-70">
                    <span className="text-[#ff8f00]">T: {Math.round(m.tSideBias * 100)}%</span>
                    <span className="text-blue-500">CT: {Math.round(m.ctSideBias * 100)}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Start Match Controls */}
        <div className="bg-[#12121a] rounded-2xl p-5 border border-white/5 flex flex-col justify-end gap-4 min-w-[300px]">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Турнир (Опционально)</label>
            <select 
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#ff8f00]/50 transition-colors"
              disabled={tournaments.length === 0}
            >
              {tournaments.length === 0 ? (
                <option value="">Нет турниров</option>
              ) : (
                <>
                  <option value="">Выставочный матч</option>
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </>
              )}
            </select>
          </div>

          <button 
            onClick={handleSimulate}
            disabled={isSimulating || !user?.isCustom || selectedMaps.length < parseInt(format.replace('BO', ''))}
            className={`w-full py-4 font-black text-sm tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer uppercase
              ${(isSimulating || !user?.isCustom || selectedMaps.length < parseInt(format.replace('BO', ''))) 
                ? 'bg-white/5 text-white/30 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_30px_rgba(37,99,235,0.3)]'}
            `}
          >
            {isSimulating ? 'СИМУЛЯЦИЯ...' : 
             !user?.isCustom ? '🔒 ВОЙДИТЕ В КАНАЛ' : 
             selectedMaps.length < parseInt(format.replace('BO', '')) ? `ВЫБЕРИТЕ ЕЩЕ ${parseInt(format.replace('BO', '')) - selectedMaps.length} КАРТ(Ы)` : 
             '⚡ НАЧАТЬ МАТЧ'}
          </button>
        </div>
      </div>

      """

content = content[:start_idx] + new_block + content[end_idx:]

with open('src/components/Simulator.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
