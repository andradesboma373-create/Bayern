import React, { useState } from 'react';
import { 
  LayoutTemplate, Trophy, ArrowRightLeft, Users, Swords, Crown, 
  Download, Sparkles, Image as ImageIcon, Star, Shield, Flame, User, Check, RefreshCw 
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import TeamLogo from './TeamLogo';
import PlayerAvatar from './PlayerAvatar';
import So2MediaLibraryModal from './So2MediaLibraryModal';

export default function Studio({ user }: { user: any }) {
  const [template, setTemplate] = useState<'mvp' | 'transfer' | 'comparison' | 'top_openers' | 'roster'>('mvp');
  const [backgroundUrl, setBackgroundUrl] = useState('/maps/cs2/mirage.jpg');
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaTargetField, setMediaTargetField] = useState<'bg' | 'p1Photo' | 'p2Photo'>('bg');

  // Fields for cards
  const [p1Name, setP1Name] = useState('s1mple');
  const [p1Team, setP1Team] = useState('NAVI');
  const [p1Rating, setP1Rating] = useState('1.42');
  const [p1Kd, setP1Kd] = useState('1.48');
  const [p1Photo, setP1Photo] = useState('/assets/so2/DefaultPlayer.png');
  const [p1Role, setP1Role] = useState('AWPer');

  const [p2Name, setP2Name] = useState('ZywOo');
  const [p2Team, setP2Team] = useState('Vitality');
  const [p2Rating, setP2Rating] = useState('1.39');
  const [p2Kd, setP2Kd] = useState('1.44');
  const [p2Photo, setP2Photo] = useState('/assets/so2/DefaultPlayer.png');
  const [p2Role, setP2Role] = useState('Rifler');

  const [tournamentName, setTournamentName] = useState('MAJOR CHAMPIONSHIP 2026');
  const [teamName, setTeamName] = useState('NAVI Esports');
  const [customTitle, setCustomTitle] = useState('MVP ТУРНИРА');

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

  const handleExport = async () => {
    const node = document.getElementById('studio-card-preview');
    if (!node) return;
    try {
      const dataUrl = await htmlToImage.toPng(node, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `studio_card_${template}_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const handleSelectMediaItem = (itemUrl: string) => {
    if (mediaTargetField === 'bg') {
      setBackgroundUrl(itemUrl);
    } else if (mediaTargetField === 'p1Photo') {
      setP1Photo(itemUrl);
    } else if (mediaTargetField === 'p2Photo') {
      setP2Photo(itemUrl);
    }
    setShowMediaModal(false);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#12121a] p-6 rounded-3xl border border-white/5 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-600 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-600/30">
            <LayoutTemplate className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-white">Студия киберспортивной графики</h1>
            <p className="text-xs text-white/50">Создавайте уникальные промо-карточки, баннеры MVP, анонсы трансферов и сравнения игроков</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="px-6 py-3.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-pink-600/30 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Скачать карточку (PNG)
        </button>
      </div>

      {/* Main Grid: Controls & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Panel (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5 bg-[#12121a] p-6 rounded-3xl border border-white/5">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-400" /> Шаблон и настройки
          </h3>

          {/* Template Selector */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'mvp', label: 'MVP Турнира', icon: Trophy },
              { id: 'transfer', label: 'Трансфер', icon: ArrowRightLeft },
              { id: 'comparison', label: 'Сравнение 2х', icon: Swords },
              { id: 'top_openers', label: 'Топ Опенеры / Клатчи', icon: Crown },
              { id: 'roster', label: 'Фулл Команда', icon: Users },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id as any)}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                  template === t.id 
                    ? 'bg-pink-600/20 border-pink-500/50 text-white shadow-lg shadow-pink-950/40' 
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/60'
                }`}
              >
                <t.icon className={`w-4 h-4 shrink-0 ${template === t.id ? 'text-pink-400' : 'text-white/40'}`} />
                <span className="text-xs font-bold uppercase">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Background Selector */}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Фон (Галерея карт или медиатека)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={backgroundUrl}
                onChange={e => setBackgroundUrl(e.target.value)}
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                placeholder="URL или путь к фону"
              />
              <button
                onClick={() => { setMediaTargetField('bg'); setShowMediaModal(true); }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ImageIcon className="w-4 h-4 text-pink-400" /> Галерея
              </button>
            </div>
            {/* Quick gallery pills */}
            <div className="flex flex-wrap gap-1.5 mt-1">
              {bgGallery.map((bg, idx) => (
                <button
                  key={idx}
                  onClick={() => setBackgroundUrl(bg.url)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer border ${
                    backgroundUrl === bg.url ? 'bg-pink-600 border-pink-500 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                  }`}
                >
                  {bg.name}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Inputs based on template */}
          {(template === 'mvp' || template === 'transfer' || template === 'comparison' || template === 'top_openers') && (
            <div className="flex flex-col gap-3 pt-2 border-t border-white/5">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Игрок 1</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={p1Name}
                  onChange={e => setP1Name(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  placeholder="Ник"
                />
                <input
                  type="text"
                  value={p1Team}
                  onChange={e => setP1Team(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  placeholder="Команда"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={p1Rating}
                  onChange={e => setP1Rating(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  placeholder="Рейтинг"
                />
                <input
                  type="text"
                  value={p1Kd}
                  onChange={e => setP1Kd(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  placeholder="K/D"
                />
                <button
                  onClick={() => { setMediaTargetField('p1Photo'); setShowMediaModal(true); }}
                  className="bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-bold uppercase transition-colors cursor-pointer px-2 py-2 truncate"
                >
                  Фото 1
                </button>
              </div>
            </div>
          )}

          {(template === 'comparison' || template === 'top_openers') && (
            <div className="flex flex-col gap-3 pt-2 border-t border-white/5">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Игрок 2</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={p2Name}
                  onChange={e => setP2Name(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  placeholder="Ник"
                />
                <input
                  type="text"
                  value={p2Team}
                  onChange={e => setP2Team(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  placeholder="Команда"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={p2Rating}
                  onChange={e => setP2Rating(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  placeholder="Рейтинг"
                />
                <input
                  type="text"
                  value={p2Kd}
                  onChange={e => setP2Kd(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  placeholder="K/D"
                />
                <button
                  onClick={() => { setMediaTargetField('p2Photo'); setShowMediaModal(true); }}
                  className="bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-bold uppercase transition-colors cursor-pointer px-2 py-2 truncate"
                >
                  Фото 2
                </button>
              </div>
            </div>
          )}

          {(template === 'mvp' || template === 'transfer') && (
            <div className="flex flex-col gap-3 pt-2 border-t border-white/5">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Заголовок / Турнир</label>
              <input
                type="text"
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                placeholder="MVP Турнира / Переход в команду"
              />
              <input
                type="text"
                value={tournamentName}
                onChange={e => setTournamentName(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                placeholder="Название турнира"
              />
            </div>
          )}
        </div>

        {/* Live Preview Panel (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-black/60 p-6 rounded-3xl border border-white/5 overflow-hidden">
          <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">Интерактивное превью (1200 x 675 px)</div>
          
          <div className="w-full max-w-[640px] aspect-[16/9] shadow-2xl rounded-2xl overflow-hidden relative border border-white/10 flex flex-col">
            {/* The actual exportable card node */}
            <div 
              id="studio-card-preview"
              className="w-full h-full relative flex flex-col justify-between p-8 overflow-hidden select-none"
              style={{
                backgroundImage: `linear-gradient(to bottom, rgba(5,5,10,0.6), rgba(10,10,18,0.95)), url('${backgroundUrl}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {/* Top Bar / Branding */}
              <div className="flex justify-between items-center z-10">
                <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                  <div className="w-7 h-7 bg-pink-600 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-white">MATCH SIMULATOR STUDIO</span>
                </div>
                <div className="bg-pink-600/20 text-pink-400 border border-pink-500/30 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest backdrop-blur-md">
                  {customTitle}
                </div>
              </div>

              {/* Template Body */}
              {template === 'mvp' && (
                <div className="flex items-center justify-between z-10 my-auto">
                  <div className="flex flex-col gap-2 max-w-[60%]">
                    <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 px-3 py-1 rounded-lg text-xs font-black uppercase w-fit">
                      <Trophy className="w-4 h-4" /> MVP of the Tournament
                    </div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-white drop-shadow-md">
                      {p1Name}
                    </h2>
                    <div className="text-lg font-bold text-pink-400 uppercase tracking-wider">
                      {p1Team} • {tournamentName}
                    </div>
                    <div className="flex gap-4 mt-2">
                      <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                        <div className="text-[10px] text-white/50 uppercase">Рейтинг</div>
                        <div className="text-lg font-black text-emerald-400">{p1Rating}</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                        <div className="text-[10px] text-white/50 uppercase">K/D</div>
                        <div className="text-lg font-black text-blue-400">{p1Kd}</div>
                      </div>
                    </div>
                  </div>
                  <div className="relative w-48 h-48 rounded-3xl overflow-hidden border-2 border-pink-500/50 shadow-2xl bg-gradient-to-tr from-pink-600/30 to-purple-600/30 flex items-center justify-center">
                    <img src={p1Photo} className="w-full h-full object-cover" alt={p1Name} />
                  </div>
                </div>
              )}

              {template === 'transfer' && (
                <div className="flex flex-col items-center justify-center text-center z-10 my-auto gap-4">
                  <div className="bg-blue-500/20 border border-blue-500/40 text-blue-300 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4" /> Официальный трансфер
                  </div>
                  <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-blue-500/60 shadow-2xl">
                    <img src={p1Photo} className="w-full h-full object-cover" alt={p1Name} />
                  </div>
                  <h2 className="text-3xl font-black uppercase tracking-tight text-white">
                    {p1Name} переходит в <span className="text-blue-400">{p1Team}</span>!
                  </h2>
                  <p className="text-xs text-white/60 max-w-md">
                    Игрок подписал долгосрочный контракт и уже присоединился к основному составу на предстоящие турниры.
                  </p>
                </div>
              )}

              {template === 'comparison' && (
                <div className="flex items-center justify-between z-10 my-auto px-4">
                  {/* Player 1 */}
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-blue-500/50 shadow-xl">
                      <img src={p1Photo} className="w-full h-full object-cover" alt={p1Name} />
                    </div>
                    <div className="text-lg font-black text-white">{p1Name}</div>
                    <div className="text-xs text-blue-400 font-bold">{p1Team}</div>
                    <div className="flex gap-2 text-xs font-bold">
                      <span className="bg-white/10 px-2.5 py-1 rounded-lg">Рейтинг: {p1Rating}</span>
                      <span className="bg-white/10 px-2.5 py-1 rounded-lg">K/D: {p1Kd}</span>
                    </div>
                  </div>

                  {/* VS Badge */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-xl font-black text-lg italic text-white">
                    VS
                  </div>

                  {/* Player 2 */}
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-purple-500/50 shadow-xl">
                      <img src={p2Photo} className="w-full h-full object-cover" alt={p2Name} />
                    </div>
                    <div className="text-lg font-black text-white">{p2Name}</div>
                    <div className="text-xs text-purple-400 font-bold">{p2Team}</div>
                    <div className="flex gap-2 text-xs font-bold">
                      <span className="bg-white/10 px-2.5 py-1 rounded-lg">Рейтинг: {p2Rating}</span>
                      <span className="bg-white/10 px-2.5 py-1 rounded-lg">K/D: {p2Kd}</span>
                    </div>
                  </div>
                </div>
              )}

              {template === 'top_openers' && (
                <div className="flex flex-col justify-center z-10 my-auto gap-4">
                  <div className="flex items-center justify-between bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-white uppercase">Лучший Опенер (Top Opener)</div>
                        <div className="text-[10px] text-white/50">{p1Team}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-amber-400">{p1Name}</div>
                      <div className="text-xs font-bold text-white/80">Rating {p1Rating}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                        <Crown className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-white uppercase">Король Клатчей (Clutch King)</div>
                        <div className="text-[10px] text-white/50">{p2Team}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-purple-400">{p2Name}</div>
                      <div className="text-xs font-bold text-white/80">Rating {p2Rating}</div>
                    </div>
                  </div>
                </div>
              )}

              {template === 'roster' && (
                <div className="flex flex-col justify-center z-10 my-auto gap-3">
                  <div className="text-center">
                    <h2 className="text-2xl font-black uppercase text-white">{teamName} — Фулл Состав</h2>
                    <p className="text-[10px] text-white/50 uppercase tracking-widest">Основной ростер на сезон</p>
                  </div>
                  <div className="grid grid-cols-5 gap-3 mt-2">
                    {[
                      { name: p1Name, role: 'AWPer', rating: p1Rating },
                      { name: p2Name, role: 'Rifler', rating: p2Rating },
                      { name: 'b1t', role: 'Entry', rating: '1.25' },
                      { name: 'jL', role: 'Support', rating: '1.20' },
                      { name: 'Aleksib', role: 'IGL', rating: '1.12' },
                    ].map((p, i) => (
                      <div key={i} className="flex flex-col items-center bg-black/60 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-center">
                        <div className="w-12 h-12 rounded-xl bg-white/10 mb-2 overflow-hidden flex items-center justify-center">
                          <User className="w-6 h-6 text-white/60" />
                        </div>
                        <div className="text-xs font-black text-white truncate w-full">{p.name}</div>
                        <div className="text-[9px] text-pink-400 uppercase font-bold">{p.role}</div>
                        <div className="text-[10px] font-black text-emerald-400 mt-1">{p.rating}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Footer */}
              <div className="flex justify-between items-center text-[10px] text-white/40 uppercase tracking-widest z-10 pt-2 border-t border-white/10">
                <span>Standoff 2 & CS2 Match Simulator</span>
                <span>Official Media Kit</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Media Library Modal for picking avatars/backgrounds */}
      <So2MediaLibraryModal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        onSelect={(url) => handleSelectMediaItem(url)}
      />
    </div>
  );
}
