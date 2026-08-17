import re

with open('src/components/setka_tourn/TournamentManager.tsx', 'r') as f:
    content = f.read()

# Replace state for customization modal
state_marker = "const [showMvpModal, setShowMvpModal] = useState(false);"
new_state = "  const [showMvpModal, setShowMvpModal] = useState(false);\n  const [showCustomizationModal, setShowCustomizationModal] = useState(false);"
if "showCustomizationModal" not in content:
    content = content.replace(state_marker, new_state)

start_marker = '<div className="flex flex-col gap-3 mb-6 bg-[#12121a]/90 border border-white/10 p-4 rounded-2xl shadow-xl backdrop-blur-md">'
end_marker = '              <div \n                  ref={stageRef}'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx != -1 and end_idx != -1:
    replacement = """<div className="flex justify-end mb-6">
                  <button
                      onClick={() => setShowCustomizationModal(true)}
                      className="bg-[#161726] border border-[#ff8f00]/50 text-[#ff8f00] font-black uppercase tracking-wider text-sm py-3 px-6 rounded-xl hover:bg-[#ff8f00]/20 transition-all flex items-center gap-3 shadow-[0_0_15px_rgba(255,143,0,0.15)] hover:shadow-[0_0_25px_rgba(255,143,0,0.3)] cursor-pointer"
                  >
                      <span className="text-xl">🎨</span> Настроить кастомизацию сетки
                  </button>
              </div>

              {/* Customization Modal in Manager */}
              {showCustomizationModal && (
                  <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-6xl my-auto flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] max-h-[90vh]">
                      <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                        <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
                          <span className="text-2xl">🎨</span> Кастомизация Сетки и Карточек
                        </h2>
                        <button onClick={() => setShowCustomizationModal(false)} className="text-white/50 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/10">
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                      
                      <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
                        {/* Left Side: Settings */}
                        <div className="w-full md:w-1/2 p-6 overflow-y-auto border-r border-white/5 flex flex-col gap-8 custom-scrollbar">
                            
                            {/* Background Upload and Preset */}
                            <div className="flex flex-col gap-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                                <h3 className="text-[#ff8f00] font-black uppercase tracking-widest text-xs flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" /> Изображение Фона
                                </h3>
                                
                                <label className="flex items-center justify-center gap-2 px-4 py-4 bg-[#ff8f00]/10 hover:bg-[#ff8f00]/20 border border-[#ff8f00]/30 rounded-xl text-sm font-black uppercase text-[#ff8f00] cursor-pointer transition-all shadow-[0_0_15px_rgba(255,143,0,0.1)] w-full text-center">
                                    <ImageIcon className="w-5 h-5" />
                                    <span>Загрузить свой фон</span>
                                    <input 
                                         type="file" 
                                         accept="image/*" 
                                         onChange={handleBgUpload} 
                                         className="hidden" 
                                    />
                                </label>

                                {bgImage && (
                                    <button
                                        type="button"
                                        onClick={() => handleThemeSelect('cyber_grid')}
                                        className="w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold transition-all text-center uppercase tracking-wider flex items-center justify-center gap-2"
                                    >
                                        <X className="w-4 h-4" /> Удалить свой фон
                                    </button>
                                )}

                                <div className="mt-2">
                                    <label className="block text-white/50 text-xs font-bold mb-2">Или выберите пресет:</label>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(BG_THEMES).map(([key, theme]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => handleThemeSelect(key)}
                                                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                                                    bgTheme === key && !bgImage
                                                        ? 'bg-[#ff8f00] text-black border-[#ff8f00] shadow-[0_0_10px_rgba(255,143,0,0.3)]'
                                                        : 'bg-black/40 text-white/70 border-white/10 hover:text-white hover:bg-white/10'
                                                }`}
                                            >
                                                {theme.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Background Dimming & Blur Settings */}
                            <div className="flex flex-col gap-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                                <h3 className="text-[#ff8f00] font-black uppercase tracking-widest text-xs">Фон Турнира</h3>
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-white text-xs font-bold">🌓 Затемнение фона (Тёмный фильтр):</label>
                                        <span className="text-xs font-mono text-[#ff8f00] font-extrabold bg-[#ff8f00]/10 px-2 py-0.5 rounded border border-[#ff8f00]/20">
                                            {activeTournament.settings.bgOpacity !== undefined ? activeTournament.settings.bgOpacity : 50}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="5"
                                        value={activeTournament.settings.bgOpacity !== undefined ? activeTournament.settings.bgOpacity : 50}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            handleUpdateActive({ ...activeTournament, settings: { ...activeTournament.settings, bgOpacity: val }});
                                        }}
                                        className="w-full accent-[#ff8f00] cursor-pointer"
                                    />
                                </div>
                    
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-white text-xs font-bold">🌫️ Блюр фона (Размытие):</label>
                                        <span className="text-xs font-mono text-[#ff8f00] font-extrabold bg-[#ff8f00]/10 px-2 py-0.5 rounded border border-[#ff8f00]/20">
                                            {activeTournament.settings.bgBlur !== undefined ? activeTournament.settings.bgBlur : 10}px
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="30"
                                        step="2"
                                        value={activeTournament.settings.bgBlur !== undefined ? activeTournament.settings.bgBlur : 0}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            handleUpdateActive({ ...activeTournament, settings: { ...activeTournament.settings, bgBlur: val }});
                                        }}
                                        className="w-full accent-[#ff8f00] cursor-pointer"
                                    />
                                </div>
                            </div>
                    
                            {/* Match Box Style */}
                            <div className="flex flex-col gap-3">
                                <label className="block text-white/70 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-[#ff8f00]" /> Дизайн Карточек Матча
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'cyber', name: '🚀 Киберпанк' },
                                        { id: 'neon', name: '🔮 Яркий Неон' },
                                        { id: 'glass', name: '🧊 Матовое стекло' },
                                        { id: 'gold', name: '👑 Золото' },
                                        { id: 'dark', name: '🌑 Классик' },
                                        { id: 'brutalist', name: '⚡ Брутализм' },
                                        { id: 'retro', name: '📟 Ретро 8-бит' },
                                        { id: 'minimalist', name: '⚪ Минимализм' },
                                    ].map((styleItem) => (
                                        <button
                                            key={styleItem.id}
                                            type="button"
                                            onClick={() => handleUpdateActive({ ...activeTournament, settings: { ...activeTournament.settings, boxStyle: styleItem.id as any }})}
                                            className={`p-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                                                (activeTournament.settings.boxStyle || 'dark') === styleItem.id
                                                    ? 'bg-[#ff8f00]/20 border-[#ff8f00] text-white shadow-[0_0_15px_rgba(255,143,0,0.25)]'
                                                    : 'bg-black/40 border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            <span>{styleItem.name}</span>
                                            {(activeTournament.settings.boxStyle || 'dark') === styleItem.id && (
                                                <span className="w-2.5 h-2.5 rounded-full bg-[#ff8f00] shadow-[0_0_8px_#ff8f00]" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                  
                            {/* Card Accent Color Palette */}
                            <div className="flex flex-col gap-3">
                                <label className="block text-white/70 text-xs font-black uppercase tracking-widest">
                                    🎨 Основной цвет элементов
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { id: '#ff8f00', name: 'Оранжевый', class: 'bg-[#ff8f00]' },
                                        { id: '#00f0ff', name: 'Неон Голубой', class: 'bg-[#00f0ff]' },
                                        { id: '#10b981', name: 'Изумруд', class: 'bg-[#10b981]' },
                                        { id: '#a855f7', name: 'Ультрафиолет', class: 'bg-[#a855f7]' },
                                        { id: '#ef4444', name: 'Алый Красный', class: 'bg-[#ef4444]' },
                                        { id: '#eab308', name: 'Золото', class: 'bg-[#eab308]' },
                                        { id: '#ec4899', name: 'Розовый', class: 'bg-[#ec4899]' },
                                    ].map((colorItem) => (
                                        <button
                                            key={colorItem.id}
                                            type="button"
                                            onClick={() => handleUpdateActive({ ...activeTournament, settings: { ...activeTournament.settings, cardThemeColor: colorItem.id }})}
                                            className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                                (activeTournament.settings.cardThemeColor || '#ff8f00') === colorItem.id
                                                    ? 'bg-white/15 border-white text-white shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                                                    : 'bg-black/40 border-white/10 text-white/50 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            <span className={`w-3.5 h-3.5 rounded-full ${colorItem.class} shadow-sm border border-black/50`} />
                                            <span>{colorItem.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                  
                            {/* Bracket Scale Setting */}
                            <div className="flex flex-col gap-3">
                                <label className="block text-white/70 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                    <ZoomIn className="w-4 h-4 text-[#ff8f00]" /> Масштаб Сетки
                                </label>
                                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                                    {[
                                        { label: '50%', val: 50 },
                                        { label: '75%', val: 75 },
                                        { label: '90%', val: 90 },
                                        { label: '100%', val: 100 },
                                        { label: '110%', val: 110 },
                                        { label: '125%', val: 125 },
                                        { label: '150%', val: 150 },
                                    ].map((preset) => (
                                        <button
                                            key={preset.val}
                                            type="button"
                                            onClick={() => handleUpdateActive({ ...activeTournament, settings: { ...activeTournament.settings, bracketScale: preset.val }})}
                                            className={`py-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                                                (activeTournament.settings.bracketScale || 100) === preset.val
                                                    ? 'bg-[#ff8f00] text-black border-[#ff8f00]'
                                                    : 'bg-black/40 text-white/50 border-white/5 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        {/* Right Side: Preview */}
                        <div className="w-full md:w-1/2 p-6 overflow-y-auto flex flex-col items-center justify-center bg-[#0d0e15] border-t md:border-t-0 border-l-0 md:border-l border-white/5 relative">
                           <div className="absolute inset-0 z-0 bg-black">
                               {bgImage ? (
                                  <div 
                                       className="absolute inset-0 z-0 bg-cover bg-center transition-all" 
                                       style={{ 
                                           backgroundImage: `url(${bgImage})`,
                                          filter: activeTournament.settings.bgBlur ? `blur(${activeTournament.settings.bgBlur}px)` : undefined
                                      }} 
                                   />
                              ) : (
                                  <div 
                                       className={`absolute inset-0 z-0 transition-all ${activeTheme.className}`}
                                      style={{
                                          ...activeTheme.style,
                                          filter: activeTournament.settings.bgBlur ? `blur(${activeTournament.settings.bgBlur}px)` : undefined
                                      }}
                                  />
                              )}
                              <div 
                                   className="absolute inset-0 z-0 bg-black pointer-events-none transition-opacity duration-200" 
                                   style={{ 
                                       opacity: (activeTournament.settings.bgOpacity !== undefined ? activeTournament.settings.bgOpacity : 50) / 100
                                  }} 
                              />
                           </div>

                           <div className="absolute top-6 left-1/2 -translate-x-1/2 text-white/40 font-black uppercase text-[10px] tracking-widest bg-black/40 px-4 py-1.5 rounded-full border border-white/5 z-10 backdrop-blur-md">
                               Превью Карточки Матча
                           </div>
                           
                           <div className="w-full max-w-sm flex items-center justify-center transition-transform duration-300 z-10" style={{ transform: `scale(${(activeTournament.settings.bracketScale || 100) / 100})`, transformOrigin: 'center center' }}>
                             <div className="w-full relative pointer-events-none">
                               <MatchCard 
                                  match={{
                                    id: 'mock-match',
                                    team1: { id: 'team1', name: 'Natus Vincere', logoUrl: 'https://img-cdn.hltv.org/teamlogo/9b5o0_R21E8qH8x8K4q_c_.svg?ixlib=java-2.1.0&s=9fcf2b0a6da9b552377b2f0a8d62da3e' },
                                    team2: { id: 'team2', name: 'FaZe Clan', logoUrl: 'https://img-cdn.hltv.org/teamlogo/gO-Fp-X6H2p-0o79eH99tB.svg?ixlib=java-2.1.0&s=e6fc339178cbcd253c0ddf3be23c21d8' },
                                    score1: 2,
                                    score2: 1,
                                    winnerId: 'team1',
                                    isFinished: true
                                  }} 
                                  bracketType="winners"
                                  rIdx={0}
                                  mIdx={0}
                                  onUpdateScore={() => {}}
                                  onAdvanceWinner={() => {}}
                                  boxStyle={activeTournament.settings.boxStyle}
                                  cardThemeColor={activeTournament.settings.cardThemeColor}
                                  btnStyle={activeTournament.settings.btnStyle}
                                  bracketMode={activeTournament.settings.bracketMode}
                               />
                             </div>
                           </div>
                        </div>
                      </div>
                      
                      <div className="p-5 border-t border-white/5 flex justify-end bg-black/40 shrink-0 z-10">
                         <button
                            type="button"
                            onClick={() => setShowCustomizationModal(false)}
                            className="bg-[#ff8f00] text-black font-black uppercase tracking-wider py-3 px-8 rounded-xl hover:bg-[#ffa733] transition-colors flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(255,143,0,0.4)]"
                         >
                            <Check className="w-5 h-5" /> Готово
                         </button>
                      </div>
                    </div>
                  </div>
              )}
\n"""
    content = content[:start_idx] + replacement + content[end_idx:]
    with open('src/components/setka_tourn/TournamentManager.tsx', 'w') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Match not found")

