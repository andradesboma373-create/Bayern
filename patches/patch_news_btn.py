import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

btn_old = """                  <button
                    onClick={() => setNewType('custom')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${newType === 'custom' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-black/20 border-white/10 text-white/50 hover:bg-white/5'}`}
                  >
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-xs font-bold text-center">Свой скриншот</span>
                  </button>
                </div>"""

btn_new = """                  <button
                    onClick={() => setNewType('custom')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${newType === 'custom' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-black/20 border-white/10 text-white/50 hover:bg-white/5'}`}
                  >
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-xs font-bold text-center">Свой скриншот</span>
                  </button>
                  <button
                    onClick={() => setNewType('tournament_invites')}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${newType === 'tournament_invites' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-black/20 border-white/10 text-white/50 hover:bg-white/5'}`}
                  >
                    <LayoutTemplate className="w-6 h-6" />
                    <span className="text-xs font-bold text-center">Инвайты</span>
                  </button>
                </div>"""
content = content.replace(btn_old, btn_new)

with open('src/components/News.tsx', 'w') as f:
    f.write(content)
