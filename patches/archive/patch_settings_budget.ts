import fs from 'fs';
let content = fs.readFileSync('src/components/Settings.tsx', 'utf-8');

const budgetSection = `          <div className="bg-[#12121a] border border-white/5 rounded-2xl p-6 relative overflow-hidden mt-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-2xl rounded-full pointer-events-none"></div>
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2.5 bg-yellow-500/10 text-yellow-500 rounded-lg">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Стартовый Бюджет Команд</h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  Укажите стартовую сумму денег для команд вашего канала в симуляциях.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Сумма (💰 $)</label>
              <div className="flex gap-4 items-center">
                <input 
                  type="range"
                  min="50000"
                  max="5000000"
                  step="50000"
                  value={startingMoney}
                  onChange={e => setStartingMoney(Number(e.target.value))}
                  className="flex-1 accent-yellow-500"
                />
                <input 
                  type="number" 
                  value={startingMoney} 
                  onChange={e => setStartingMoney(Number(e.target.value) || 0)} 
                  className="w-40 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-right font-black font-mono text-yellow-500"
                />
              </div>
              <p className="text-[10px] text-white/30 italic mt-1">
                * Изменение бюджета будет применяться для новых финансовых расчетов команд.
              </p>
            </div>
          </div>
            </>
          )}`;

content = content.replace(/<\/div>\n\s*<\/div>\n\s*<\/>\n\s*\)}/g, "</div>\n          </div>\n" + budgetSection);

fs.writeFileSync('src/components/Settings.tsx', content);
console.log('patched Settings.tsx budget');
