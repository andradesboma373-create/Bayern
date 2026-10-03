import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Upload, Image, Shield, Users, Map, Download, Sparkles } from 'lucide-react';
import { SO2_TEAMS, SO2_MAPS, getAllSo2Players } from '../lib/so2Assets';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (url: string, type: 'logo' | 'photo') => void;
  initialTab?: 'logos' | 'players' | 'maps' | 'upload';
}

export default function So2MediaLibraryModal({ isOpen, onClose, onSelect, initialTab = 'logos' }: Props) {
  const [activeTab, setActiveTab] = useState<'logos' | 'players' | 'maps' | 'upload'>(initialTab);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [customLogos, setCustomLogos] = useState<{ id: string; name: string; url: string }[]>(() => {
    try {
      const raw = localStorage.getItem('so2_custom_logos');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const [customPhotos, setCustomPhotos] = useState<{ id: string; name: string; url: string }[]>(() => {
    try {
      const raw = localStorage.getItem('so2_custom_player_photos');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState<'logo' | 'photo'>('logo');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  if (!isOpen) return null;

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setUploadPreview(result);
      if (!uploadName) {
        setUploadName(file.name.replace(/\.[^/.]+$/, ""));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUpload = () => {
    if (!uploadPreview || !uploadName.trim()) return;

    if (uploadType === 'logo') {
      const updated = [{ id: `custom_logo_${Date.now()}`, name: uploadName.trim(), url: uploadPreview }, ...customLogos];
      setCustomLogos(updated);
      try { localStorage.setItem('so2_custom_logos', JSON.stringify(updated)); } catch (e) {}
    } else {
      const updated = [{ id: `custom_photo_${Date.now()}`, name: uploadName.trim(), url: uploadPreview }, ...customPhotos];
      setCustomPhotos(updated);
      try { localStorage.setItem('so2_custom_player_photos', JSON.stringify(updated)); } catch (e) {}
    }

    setUploadName('');
    setUploadPreview(null);
    setActiveTab(uploadType === 'logo' ? 'logos' : 'players');
  };

  const allPlayers = getAllSo2Players();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#10121d] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                📂 Папка и Медиатека Standoff 2 (SO2)
              </h2>
              <p className="text-xs text-white/50">
                Каталог официальных логотипов, фотографий игроков и соревновательных карт SO2
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-white/5 bg-black/20 overflow-x-auto">
          <button
            onClick={() => setActiveTab('logos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'logos'
                ? 'bg-[#181b2a] text-[#ff8f00] border-t border-x border-white/10 border-b-2 border-b-[#ff8f00]'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Логотипы команд ({SO2_TEAMS.length + customLogos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('players')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'players'
                ? 'bg-[#181b2a] text-[#ff8f00] border-t border-x border-white/10 border-b-2 border-b-[#ff8f00]'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Игроки и Фото ({allPlayers.length + customPhotos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('maps')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'maps'
                ? 'bg-[#181b2a] text-[#ff8f00] border-t border-x border-white/10 border-b-2 border-b-[#ff8f00]'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Map className="w-4 h-4" />
            <span>Карты SO2 ({SO2_MAPS.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-[#181b2a] text-emerald-400 border-t border-x border-white/10 border-b-2 border-b-emerald-400'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Загрузить свой файл</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: LOGOS */}
          {activeTab === 'logos' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {/* Preset SO2 Teams */}
              {SO2_TEAMS.map((t) => (
                <div
                  key={t.id}
                  className="bg-[#151726] border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-between text-center group hover:border-[#ff8f00]/50 transition-all shadow-md relative"
                >
                  <img src={t.logoUrl} alt={t.name} className="w-16 h-16 object-contain mb-3 drop-shadow-lg" />
                  <div className="font-black text-sm text-white mb-1">{t.name}</div>
                  <div className="text-[10px] text-white/50 mb-3 font-mono">[{t.tag}]</div>
                  
                  <div className="flex items-center gap-2 w-full mt-auto">
                    {onSelect ? (
                      <button
                        onClick={() => {
                          onSelect(t.logoUrl, 'logo');
                          onClose();
                        }}
                        className="flex-1 py-1.5 bg-[#ff8f00] hover:bg-[#ffa733] text-black font-black text-[11px] rounded-lg uppercase tracking-wider cursor-pointer transition-colors shadow-sm"
                      >
                        Выбрать
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCopy(t.logoUrl)}
                        className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors border border-white/10"
                      >
                        {copiedUrl === t.logoUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedUrl === t.logoUrl ? 'Скопировано' : 'Копировать'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Custom User Uploaded Logos */}
              {customLogos.map((cl) => (
                <div
                  key={cl.id}
                  className="bg-[#151726] border border-emerald-500/20 rounded-2xl p-4 flex flex-col items-center justify-between text-center group hover:border-emerald-500/50 transition-all shadow-md relative"
                >
                  <span className="absolute top-2 right-2 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                    Пользовательский
                  </span>
                  <img src={cl.url} alt={cl.name} className="w-16 h-16 object-contain mb-3 drop-shadow-lg" />
                  <div className="font-black text-sm text-white mb-3 line-clamp-1">{cl.name}</div>
                  
                  <div className="flex items-center gap-2 w-full mt-auto">
                    {onSelect ? (
                      <button
                        onClick={() => {
                          onSelect(cl.url, 'logo');
                          onClose();
                        }}
                        className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] rounded-lg uppercase tracking-wider cursor-pointer transition-colors"
                      >
                        Выбрать
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCopy(cl.url)}
                        className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors border border-white/10"
                      >
                        {copiedUrl === cl.url ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedUrl === cl.url ? 'Скопировано' : 'Копировать'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: PLAYERS */}
          {activeTab === 'players' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {allPlayers.map((p) => (
                <div
                  key={p.id}
                  className="bg-[#151726] border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-between text-center group hover:border-[#ff8f00]/50 transition-all shadow-md relative"
                >
                  <img src={p.photoUrl} alt={p.nickname} className="w-16 h-16 rounded-full object-cover mb-3 border-2 border-white/10" />
                  <div className="font-black text-sm text-white mb-0.5">{p.nickname}</div>
                  <div className="text-[10px] text-white/40 mb-1">{p.realName}</div>
                  <div className="text-[10px] font-bold text-[#ff8f00] uppercase tracking-wider mb-3">
                    {p.role} • {p.rating}
                  </div>

                  <div className="flex items-center gap-2 w-full mt-auto">
                    {onSelect ? (
                      <button
                        onClick={() => {
                          onSelect(p.photoUrl, 'photo');
                          onClose();
                        }}
                        className="flex-1 py-1.5 bg-[#ff8f00] hover:bg-[#ffa733] text-black font-black text-[11px] rounded-lg uppercase tracking-wider cursor-pointer transition-colors"
                      >
                        Выбрать
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCopy(p.photoUrl)}
                        className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors border border-white/10"
                      >
                        {copiedUrl === p.photoUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedUrl === p.photoUrl ? 'Скопировано' : 'Копировать'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {customPhotos.map((cp) => (
                <div
                  key={cp.id}
                  className="bg-[#151726] border border-emerald-500/20 rounded-2xl p-4 flex flex-col items-center justify-between text-center group hover:border-emerald-500/50 transition-all shadow-md relative"
                >
                  <span className="absolute top-2 right-2 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                    Пользовательское
                  </span>
                  <img src={cp.url} alt={cp.name} className="w-16 h-16 rounded-full object-cover mb-3 border-2 border-emerald-500/30" />
                  <div className="font-black text-sm text-white mb-3 line-clamp-1">{cp.name}</div>
                  
                  <div className="flex items-center gap-2 w-full mt-auto">
                    {onSelect ? (
                      <button
                        onClick={() => {
                          onSelect(cp.url, 'photo');
                          onClose();
                        }}
                        className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] rounded-lg uppercase tracking-wider cursor-pointer transition-colors"
                      >
                        Выбрать
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCopy(cp.url)}
                        className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors border border-white/10"
                      >
                        {copiedUrl === cp.url ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedUrl === cp.url ? 'Скопировано' : 'Копировать'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: MAPS */}
          {activeTab === 'maps' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SO2_MAPS.map((m) => (
                <div
                  key={m.id}
                  className="bg-[#151726] border border-white/10 rounded-2xl overflow-hidden flex flex-col group hover:border-[#ff8f00]/50 transition-all shadow-md"
                >
                  <div className="h-32 bg-cover bg-center relative" style={{ backgroundImage: `url(${m.imageUrl})` }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#151726] via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-4 font-black text-lg text-white">
                      {m.displayName}
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-1 justify-between">
                    <p className="text-xs text-white/60 mb-3">{m.description}</p>
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold text-white/40 pt-2 border-t border-white/5">
                      <span>T: {Math.round(m.tSideBias * 100)}%</span>
                      <span>CT: {Math.round(m.ctSideBias * 100)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: UPLOAD */}
          {activeTab === 'upload' && (
            <div className="max-w-xl mx-auto flex flex-col gap-6 py-4">
              <div className="bg-[#151726] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-emerald-400" />
                  Загрузить в папку SO2
                </h3>
                <p className="text-xs text-white/50">
                  Вы можете добавить свой логотип команды или фотографию игрока. Файл сохранится в вашей персональной папке Standoff 2.
                </p>

                <div className="flex items-center gap-4 mt-2">
                  <label className="text-xs font-bold text-white/70">Тип файла:</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setUploadType('logo')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        uploadType === 'logo' ? 'bg-[#ff8f00] text-black font-black' : 'bg-white/5 text-white/60'
                      }`}
                    >
                      🛡️ Логотип команды
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadType('photo')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        uploadType === 'photo' ? 'bg-[#ff8f00] text-black font-black' : 'bg-white/5 text-white/60'
                      }`}
                    >
                      👤 Фотография игрока
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1">
                    Название / Никнейм:
                  </label>
                  <input
                    type="text"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder={uploadType === 'logo' ? 'Название команды (например, Horizon)' : 'Ник игрока (например, Nekr0)'}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff8f00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/70 mb-2">
                    Выберите файл изображения (PNG, JPG, SVG, WebP):
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="block w-full text-xs text-white/60 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-[#ff8f00] file:text-black hover:file:bg-[#ffa733] cursor-pointer"
                  />
                </div>

                {uploadPreview && (
                  <div className="flex items-center gap-4 p-4 bg-black/40 rounded-xl border border-white/10">
                    <img src={uploadPreview} alt="Предпросмотр" className="w-16 h-16 object-contain rounded-xl border border-white/20" />
                    <div>
                      <div className="text-xs font-bold text-white">{uploadName || 'Файл готов к сохранению'}</div>
                      <div className="text-[10px] text-emerald-400 font-mono mt-0.5">✓ Изображение обработано</div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveUpload}
                  disabled={!uploadPreview || !uploadName.trim()}
                  className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all mt-2 cursor-pointer ${
                    uploadPreview && uploadName.trim()
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
                  }`}
                >
                  💾 Сохранить в папку SO2
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
