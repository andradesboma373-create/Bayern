const fs = require('fs');
let code = fs.readFileSync('src/components/News.tsx', 'utf8');

// 1. Update Lucide imports
code = code.replace(
  "import { Newspaper, Users, Plus, X, Image as ImageIcon, Search, LayoutTemplate, Trash2, ArrowRight, Download, User } from 'lucide-react';",
  "import { Newspaper, Users, Plus, X, Image as ImageIcon, Search, LayoutTemplate, Trash2, ArrowRight, Download, User, Sparkles, Trophy, Swords, Crown, Shield, Star } from 'lucide-react';"
);

// 2. Add studio states after loading
const studioStateCode = `
  const [showCardStudio, setShowCardStudio] = useState(false);
  const [studioTemplate, setStudioTemplate] = useState<'mvp' | 'transfer' | 'comparison' | 'top_openers' | 'roster'>('mvp');
  const [studioBg, setStudioBg] = useState('/maps/cs2/mirage.jpg');
  const [p1Name, setP1Name] = useState('s1mple');
  const [p1Team, setP1Team] = useState('NAVI');
  const [p1Rating, setP1Rating] = useState('1.38');
  const [p1Kd, setP1Kd] = useState('1.45');
  const [p1Photo, setP1Photo] = useState('/assets/so2/DefaultPlayer.png');
  const [p2Name, setP2Name] = useState('ZywOo');
  const [p2Team, setP2Team] = useState('Vitality');
  const [p2Rating, setP2Rating] = useState('1.35');
  const [p2Kd, setP2Kd] = useState('1.42');
  const [p2Photo, setP2Photo] = useState('/assets/so2/DefaultPlayer.png');
  const [studioTeamName, setStudioTeamName] = useState('NAVI Esports');

  const bgGallery = [
    { name: 'Mirage', url: '/maps/cs2/mirage.jpg' },
    { name: 'Inferno', url: '/maps/cs2/inferno.jpg' },
    { name: 'Dust II', url: '/maps/cs2/dust2.jpg' },
    { name: 'Anubis', url: '/maps/cs2/anubis.jpg' },
    { name: 'Nuke', url: '/maps/cs2/nuke.jpg' },
    { name: 'Ancient', url: '/maps/cs2/ancient.jpg' },
    { name: 'Sandstone (So2)', url: '/maps/so2/sandstone.webp' },
    { name: 'Rust (So2)', url: '/maps/so2/rust.webp' }
  ];

  const handleDownloadPromoCard = async () => {
    const node = document.getElementById('promo-card-preview');
    if (!node) return;
    try {
      const dataUrl = await htmlToImage.toPng(node, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = \`esports_card_\${studioTemplate}_\${Date.now()}.png\`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export error", err);
    }
  };
`;

if (!code.includes('showCardStudio')) {
  code = code.replace('  const [loading, setLoading] = useState(true);', '  const [loading, setLoading] = useState(true);' + studioStateCode);
}

// 3. Add Studio button in header
const headerTarget = `        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          СОЗДАТЬ НОВОСТЬ
        </button>`;

const headerReplacement = `        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCardStudio(true)}
            className="px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-purple-600/20 flex items-center gap-2 cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-yellow-300" />
            🎨 Студия карточек и MVP
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            СОЗДАТЬ НОВОСТЬ
          </button>
        </div>`;

if (!code.includes('Студия карточек')) {
  code = code.replace(headerTarget, headerReplacement);
}

// 4. Add Card Studio modal at the bottom
const modalStudioCode = `
      {/* Card Studio Modal */}
      {showCardStudio && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-[#12121a] border border-white/10 rounded-3xl max-w-5xl w-full flex flex-col max-h-[90vh] shadow-2xl relative overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/30">
              <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                <Trophy className="w-6 h-6 text-yellow-400" />
                СТУДИЯ КИБЕРСПОРТИВНЫХ КАРТОЧЕК И MVP
              </h2>
              <button onClick={() => setShowCardStudio(false)} className="text-white/40 hover:text-white transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 custom-scrollbar">
              {/* Left Controls */}
              <div className="lg:col-span-5 flex flex-col gap-5">
                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Шаблон карточки</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'mvp', label: '🏆 MVP Турнира' },
                      { id: 'transfer', label: '⚡ Переход в команду' },
                      { id: 'comparison', label: '⚔️ Сравнение 2 игроков' },
                      { id: 'top_openers', label: '👑 Опенеры / Клатчеры' },
                      { id: 'roster', label: '⭐ Фулл состав' }
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setStudioTemplate(t.id as any)}
                        className={\`py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider text-left transition-all cursor-pointer \${studioTemplate === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-black/30 text-white/60 hover:text-white hover:bg-white/5'}\`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Выберите фон из галереи</label>
                  <div className="grid grid-cols-4 gap-2">
                    {bgGallery.map(b => (
                      <button
                        key={b.url}
                        type="button"
                        onClick={() => setStudioBg(b.url)}
                        className={\`relative aspect-video rounded-lg overflow-hidden border-2 transition-all cursor-pointer \${studioBg === b.url ? 'border-yellow-400 scale-105 shadow-md shadow-yellow-400/30' : 'border-white/10 opacity-70 hover:opacity-100'}\`}
                        style={{ backgroundImage: \`url(\${b.url})\`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                        title={b.name}
                      />
                    ))}
                  </div>
                </div>

                {(studioTemplate === 'mvp' || studioTemplate === 'transfer' || studioTemplate === 'comparison' || studioTemplate === 'top_openers') && (
                  <div className="flex flex-col gap-3 p-4 rounded-2xl bg-black/30 border border-white/5">
                    <span className="text-xs font-black text-yellow-400 uppercase tracking-wider">Игрок №1</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-white/40 uppercase font-bold block mb-1">Никнейм</label>
                        <input type="text" value={p1Name} onChange={e => setP1Name(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="text-[10px] text-white/40 uppercase font-bold block mb-1">Команда</label>
                        <input type="text" value={p1Team} onChange={e => setP1Team(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-white/40 uppercase font-bold block mb-1">Рейтинг</label>
                        <input type="text" value={p1Rating} onChange={e => setP1Rating(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="text-[10px] text-white/40 uppercase font-bold block mb-1">K/D</label>
                        <input type="text" value={p1Kd} onChange={e => setP1Kd(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500" />
                      </div>
                    </div>
                  </div>
                )}

                {(studioTemplate === 'comparison' || studioTemplate === 'top_openers') && (
                  <div className="flex flex-col gap-3 p-4 rounded-2xl bg-black/30 border border-white/5">
                    <span className="text-xs font-black text-blue-400 uppercase tracking-wider">Игрок №2</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-white/40 uppercase font-bold block mb-1">Никнейм</label>
                        <input type="text" value={p2Name} onChange={e => setP2Name(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="text-[10px] text-white/40 uppercase font-bold block mb-1">Команда</label>
                        <input type="text" value={p2Team} onChange={e => setP2Team(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-white/40 uppercase font-bold block mb-1">Рейтинг</label>
                        <input type="text" value={p2Rating} onChange={e => setP2Rating(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="text-[10px] text-white/40 uppercase font-bold block mb-1">K/D</label>
                        <input type="text" value={p2Kd} onChange={e => setP2Kd(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Live Preview Card */}
              <div className="lg:col-span-7 flex flex-col items-center justify-center gap-4 bg-black/40 p-6 rounded-2xl border border-white/5">
                <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Предпросмотр карточки</span>
                
                {/* PREVIEW CONTAINER */}
                <div 
                  id="promo-card-preview"
                  className="w-full aspect-[16/9] rounded-2xl overflow-hidden relative border border-white/20 shadow-2xl flex flex-col justify-between p-8"
                  style={{ backgroundImage: \`url(\${studioBg})\`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20 pointer-events-none"></div>

                  {/* Top Badge */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="px-4 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 font-black text-xs uppercase tracking-[0.2em] shadow-lg flex items-center gap-2">
                      {studioTemplate === 'mvp' && <Trophy className="w-4 h-4 text-yellow-400" />}
                      {studioTemplate === 'transfer' && <Sparkles className="w-4 h-4 text-blue-400" />}
                      {studioTemplate === 'comparison' && <Swords className="w-4 h-4 text-red-400" />}
                      {studioTemplate === 'top_openers' && <Crown className="w-4 h-4 text-amber-400" />}
                      {studioTemplate === 'roster' && <Star className="w-4 h-4 text-purple-400" />}
                      <span>
                        {studioTemplate === 'mvp' && '🏆 MVP ТУРНИРА'}
                        {studioTemplate === 'transfer' && '⚡ ТРАНСФЕР ГОДА'}
                        {studioTemplate === 'comparison' && '⚔️ ДУЭЛЬ МАТЧА'}
                        {studioTemplate === 'top_openers' && '👑 ТОП ОПЕНЕР & КЛАТЧЕР'}
                        {studioTemplate === 'roster' && '⭐ ФУЛЛ СОСТАВ КОМАНДЫ'}
                      </span>
                    </div>
                    <div className="text-white/60 font-mono font-bold text-xs uppercase tracking-widest">MATCH SIMULATOR STUDIO</div>
                  </div>

                  {/* Center Content based on template */}
                  <div className="relative z-10 flex items-center justify-center my-auto py-4">
                    {studioTemplate === 'mvp' && (
                      <div className="flex items-center gap-8 animate-fade-in">
                        <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-yellow-500/80 shadow-[0_0_30px_rgba(234,179,8,0.5)] bg-black/60 flex items-center justify-center relative">
                          <img src="/assets/so2/DefaultPlayer.png" alt={p1Name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-yellow-400 font-bold uppercase tracking-widest text-xs">{p1Team}</span>
                          <h2 className="text-4xl lg:text-5xl font-black text-white uppercase tracking-wider drop-shadow-lg">{p1Name}</h2>
                          <div className="flex items-center gap-4 mt-3">
                            <div className="px-3 py-1 rounded-xl bg-white/10 border border-white/20 text-xs font-black text-white">
                              HLTV RATING: <span className="text-yellow-400">{p1Rating}</span>
                            </div>
                            <div className="px-3 py-1 rounded-xl bg-white/10 border border-white/20 text-xs font-black text-white">
                              K/D: <span className="text-emerald-400">{p1Kd}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {studioTemplate === 'transfer' && (
                      <div className="flex items-center gap-6 animate-fade-in">
                        <div className="flex flex-col items-center">
                          <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-white/30 bg-black/60 flex items-center justify-center">
                            <img src="/assets/so2/DefaultPlayer.png" alt={p1Name} className="w-full h-full object-cover" />
                          </div>
                          <span className="text-white font-black text-sm mt-2">{p1Name}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">ПЕРЕХОД</span>
                          <ArrowRight className="w-8 h-8 text-yellow-400 animate-pulse" />
                        </div>
                        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-blue-600/20 border border-blue-500/40 backdrop-blur-sm">
                          <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">НОВЫЙ КЛУБ</span>
                          <span className="text-2xl font-black text-white uppercase tracking-wider mt-1">{p1Team}</span>
                        </div>
                      </div>
                    )}

                    {studioTemplate === 'comparison' && (
                      <div className="grid grid-cols-3 items-center gap-6 w-full max-w-2xl animate-fade-in">
                        <div className="flex flex-col items-center text-center">
                          <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-blue-500/80 shadow-lg bg-black/60 mb-2">
                            <img src="/assets/so2/DefaultPlayer.png" alt={p1Name} className="w-full h-full object-cover" />
                          </div>
                          <span className="text-xs font-bold text-blue-400">{p1Team}</span>
                          <h3 className="text-2xl font-black text-white uppercase">{p1Name}</h3>
                          <span className="text-xs font-mono font-bold text-yellow-400 mt-1">Rating: {p1Rating} | K/D: {p1Kd}</span>
                        </div>

                        <div className="flex flex-col items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-red-600/30 border border-red-500/50 flex items-center justify-center text-red-400 font-black italic shadow-lg">
                            VS
                          </div>
                        </div>

                        <div className="flex flex-col items-center text-center">
                          <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-purple-500/80 shadow-lg bg-black/60 mb-2">
                            <img src="/assets/so2/DefaultPlayer.png" alt={p2Name} className="w-full h-full object-cover" />
                          </div>
                          <span className="text-xs font-bold text-purple-400">{p2Team}</span>
                          <h3 className="text-2xl font-black text-white uppercase">{p2Name}</h3>
                          <span className="text-xs font-mono font-bold text-yellow-400 mt-1">Rating: {p2Rating} | K/D: {p2Kd}</span>
                        </div>
                      </div>
                    )}

                    {studioTemplate === 'top_openers' && (
                      <div className="grid grid-cols-2 gap-8 w-full max-w-2xl animate-fade-in">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-black/60 border border-amber-500/40 backdrop-blur-sm">
                          <div className="w-16 h-16 rounded-xl overflow-hidden border border-amber-500/50 bg-black/60 shrink-0">
                            <img src="/assets/so2/DefaultPlayer.png" alt={p1Name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">🔥 ЛУЧШИЙ ОПЕНЕР</span>
                            <h4 className="text-lg font-black text-white uppercase mt-1">{p1Name}</h4>
                            <span className="text-[10px] text-white/50">{p1Team} • {p1Rating} Rating</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-black/60 border border-purple-500/40 backdrop-blur-sm">
                          <div className="w-16 h-16 rounded-xl overflow-hidden border border-purple-500/50 bg-black/60 shrink-0">
                            <img src="/assets/so2/DefaultPlayer.png" alt={p2Name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">👑 КОРОЛЬ КЛАТЧЕЙ</span>
                            <h4 className="text-lg font-black text-white uppercase mt-1">{p2Name}</h4>
                            <span className="text-[10px] text-white/50">{p2Team} • {p2Rating} Rating</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {studioTemplate === 'roster' && (
                      <div className="flex flex-col items-center text-center animate-fade-in">
                        <h2 className="text-3xl font-black text-white uppercase tracking-widest">{studioTeamName}</h2>
                        <span className="text-xs text-white/60 uppercase tracking-widest mt-1">Официальный ростер турнира</span>
                        <div className="flex gap-3 mt-6">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex flex-col items-center p-3 rounded-xl bg-black/60 border border-white/10 w-20">
                              <div className="w-12 h-12 rounded-lg bg-white/5 mb-2 overflow-hidden">
                                <img src="/assets/so2/DefaultPlayer.png" className="w-full h-full object-cover" />
                              </div>
                              <span className="text-[10px] font-black text-white truncate w-full">Player {i}</span>
                              <span className="text-[8px] text-white/40 uppercase">Rifler</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Footer */}
                  <div className="relative z-10 flex items-center justify-between text-[11px] text-white/50 font-bold border-t border-white/10 pt-3">
                    <span>CS2 / Standoff 2 Match Simulator</span>
                    <span className="text-yellow-400 uppercase tracking-widest">Official Press Banner</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadPromoCard}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black uppercase tracking-wider text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  📥 СКАЧАТЬ КАРТОЧКУ (HD PNG)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
`;

if (!code.includes('Card Studio Modal')) {
  code = code.replace('      {/* Add News Modal */}', modalStudioCode + '\\n      {/* Add News Modal */}');
}

fs.writeFileSync('src/components/News.tsx', code, 'utf8');
console.log('Successfully updated News.tsx');
