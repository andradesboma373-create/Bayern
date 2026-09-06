import fs from 'fs';
let content = fs.readFileSync('src/components/Settings.tsx', 'utf-8');

const replacement = `              {/* Telegram Bot Setup */}
          <div className="bg-[#12121a] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-2xl rounded-full pointer-events-none"></div>
            <div className="flex items-start gap-4 mb-6">
              <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Telegram Бот</h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  Подключите своего собственного бота для канала. Вставьте токен, полученный у <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">@BotFather</a>. Бот будет автоматически запущен и настроен под ваш канал!
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Токен Бота</label>
              <input 
                type="text" 
                value={botToken} 
                onChange={e => setBotToken(e.target.value)} 
                placeholder="1234567890:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
              />
            </div>
          </div>
            </>
          )}

          {activeTab === 'roles' && (`;

content = content.replace(/\{\/\* Telegram Bot Setup \*\/\}[\s\S]*?\{activeTab === 'roles' && \(/, replacement);

fs.writeFileSync('src/components/Settings.tsx', content);
console.log('patched Settings.tsx bot token block');
