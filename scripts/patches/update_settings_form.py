import re

with open('src/components/setka_tourn/TournamentSettingsForm.tsx', 'r') as f:
    content = f.read()

start_marker = r'\{\/\* Right Side: Preview \*\/\}'
end_marker = r'<\/div>\n            <\/div>\n            \n            <div className="p-5 border-t border-white\/5 flex justify-end bg-black\/40 shrink-0">'

match = re.search(f"{start_marker}.*?(?={end_marker})", content, re.DOTALL)
if match:
    replacement = """{/* Right Side: Preview */}
              <div className="w-full md:w-1/2 p-6 overflow-y-auto flex flex-col items-center justify-center bg-[#0d0e15] border-t md:border-t-0 border-l-0 md:border-l border-white/5 relative min-h-[400px]">
                 <div className="absolute inset-0 z-0 bg-black">
                     <div 
                         className="absolute inset-0 z-0 transition-all bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-[#050508]"
                         style={{
                             filter: settings.bgBlur ? `blur(${settings.bgBlur}px)` : undefined
                         }}
                     />
                     <div 
                         className="absolute inset-0 z-0 bg-black pointer-events-none transition-opacity duration-200" 
                         style={{ opacity: (settings.bgOpacity !== undefined ? settings.bgOpacity : 50) / 100 }} 
                     />
                 </div>

                 <div className="absolute top-6 left-1/2 -translate-x-1/2 text-white/40 font-black uppercase text-[10px] tracking-widest bg-black/40 px-4 py-1.5 rounded-full border border-white/5 z-10 backdrop-blur-md">
                     Превью Карточки Матча
                 </div>
                 
                 <div className="w-full max-w-sm flex items-center justify-center transition-transform duration-300 z-10" style={{ transform: `scale(${(settings.bracketScale || 100) / 100})`, transformOrigin: 'center center' }}>
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
                        boxStyle={settings.boxStyle}
                        cardThemeColor={settings.cardThemeColor}
                        btnStyle={settings.btnStyle}
                        bracketMode={settings.bracketMode}
                     />
                   </div>
                 </div>
                 
                 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/30 text-[10px] uppercase tracking-widest text-center w-full max-w-[250px] leading-relaxed z-10">
                   Внешний вид может незначительно отличаться в турнирной сетке. (Загрузка кастомного фона доступна внутри турнира)
                 </div>
              </div>"""
    content = content[:match.start()] + replacement + content[match.end():]
    with open('src/components/setka_tourn/TournamentSettingsForm.tsx', 'w') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Match not found")

