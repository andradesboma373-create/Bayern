import re

with open('src/components/setka_tourn/TournamentSettingsForm.tsx', 'r') as f:
    content = f.read()

start_marker = r'\{\/\* Appearance & Bracket Customization Settings \*\/\}'
end_marker = r'\n      <div>\n          <label className="block text-white\/50 font-bold mb-2">Тип жеребьевки<\/label>'

match = re.search(f"{start_marker}.*?(?={end_marker})", content, re.DOTALL)
if match:
    replacement = """{/* Appearance & Bracket Customization Settings */}
      <div className="bg-black/20 p-5 rounded-xl border border-white/5 flex flex-col gap-4">
          <label className="block text-[#ff8f00] font-black uppercase tracking-widest text-sm flex items-center justify-between">
              <span>🎨 Внешний вид и Оформление элементов</span>
          </label>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <button
                  type="button"
                  onClick={() => setShowCustomizationModal(true)}
                  className="bg-[#161726] border border-[#ff8f00]/50 text-[#ff8f00] font-black uppercase tracking-wider text-sm py-4 px-8 rounded-xl hover:bg-[#ff8f00]/20 transition-all flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(255,143,0,0.15)] hover:shadow-[0_0_25px_rgba(255,143,0,0.3)] cursor-pointer"
              >
                  Настроить кастомизацию
              </button>
              
              {hasCustomized && (
                  <div className="flex items-center gap-3 text-emerald-400 font-bold text-sm bg-emerald-500/10 px-4 py-3 rounded-xl border border-emerald-500/20">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <Check className="w-5 h-5" />
                      </div>
                      Настройки внешнего вида применены!
                  </div>
              )}
          </div>
      </div>"""
    content = content[:match.start()] + replacement + content[match.end():]
    with open('src/components/setka_tourn/TournamentSettingsForm.tsx', 'w') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Match not found")

