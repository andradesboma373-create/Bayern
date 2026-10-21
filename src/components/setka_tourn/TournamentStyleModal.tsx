import React, { useRef } from 'react';
import { X, Palette, Image as ImageIcon, Sliders, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentBoxStyle: string;
  currentCardColor: string;
  currentBgTheme: string;
  bgThemes: Record<string, any>;
  onSelectBoxStyle: (styleId: string) => void;
  onSelectCardColor: (colorHex: string) => void;
  onSelectBgTheme: (themeId: string) => void;
  onUploadBg: (file: File) => void;
  currentBgBlur?: number;
  currentBgOverlay?: number;
  onSelectBgBlur?: (val: number) => void;
  onSelectBgOverlay?: (val: number) => void;
}

const BOX_STYLES = [
  { id: 'dark', name: 'Тёмный CS2', desc: 'Классический контрастный стиль' },
  { id: 'glass', name: 'Стекло (Glass)', desc: 'Полупрозрачный матовый стиль' },
  { id: 'neon', name: 'Киберпанк Неон', desc: 'Яркие фиолетовые и неоновые акценты' },
  { id: 'minimal', name: 'Минимализм', desc: 'Лаконичный строгий контур' },
  { id: 'clean', name: 'Чистый', desc: 'Нейтральный светлый контраст' },
];

const PRESET_COLORS = [
  '#ff8f00', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'
];

export function TournamentStyleModal({
  isOpen,
  onClose,
  currentBoxStyle,
  currentCardColor,
  currentBgTheme,
  bgThemes,
  onSelectBoxStyle,
  onSelectCardColor,
  onSelectBgTheme,
  onUploadBg,
  currentBgBlur = 10,
  currentBgOverlay = 40,
  onSelectBgBlur,
  onSelectBgOverlay
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f1015] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ff8f00]/10 border border-[#ff8f00]/30 flex items-center justify-center text-[#ff8f00]">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Оформление и Стили</h2>
              <p className="text-xs text-white/50">Настройка внешнего вида сетки и карточек матчей</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-8">
          {/* Box Style */}
          <div>
            <label className="text-xs font-black uppercase text-white/60 tracking-wider flex items-center gap-2 mb-3">
              <Sliders className="w-4 h-4 text-[#ff8f00]" />
              Стиль карточек матчей
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BOX_STYLES.map(style => {
                const isSelected = currentBoxStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => onSelectBoxStyle(style.id)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start justify-between ${
                      isSelected
                        ? 'bg-[#ff8f00]/10 border-[#ff8f00] shadow-[0_0_15px_rgba(255,143,0,0.2)]'
                        : 'bg-black/40 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-white">{style.name}</div>
                      <div className="text-xs text-white/40 mt-1">{style.desc}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#ff8f00] shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent Color */}
          <div>
            <label className="text-xs font-black uppercase text-white/60 tracking-wider flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-[#ff8f00]" />
              Цвет акцентов
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {PRESET_COLORS.map(color => {
                const isSelected = currentCardColor?.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onSelectCardColor(color)}
                    className={`w-9 h-9 rounded-xl border-2 transition-transform cursor-pointer relative flex items-center justify-center ${
                      isSelected ? 'scale-110 border-white shadow-lg' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white drop-shadow" />}
                  </button>
                );
              })}
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="color"
                  value={currentCardColor || '#ff8f00'}
                  onChange={e => onSelectCardColor(e.target.value)}
                  className="w-9 h-9 rounded-xl bg-transparent border border-white/20 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Background Adjustments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-black uppercase text-white/60 tracking-wider flex items-center justify-between mb-3">
                <span className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-blue-400" /> Размытие фона</span>
                <span className="text-white/40">{currentBgBlur}px</span>
              </label>
              <input 
                type="range"
                min="0"
                max="40"
                value={currentBgBlur}
                onChange={(e) => onSelectBgBlur?.(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-white/60 tracking-wider flex items-center justify-between mb-3">
                <span className="flex items-center gap-2"><Palette className="w-4 h-4 text-emerald-400" /> Затемнение</span>
                <span className="text-white/40">{currentBgOverlay}%</span>
              </label>
              <input 
                type="range"
                min="0"
                max="90"
                value={currentBgOverlay}
                onChange={(e) => onSelectBgOverlay?.(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          {/* Background Theme */}
          <div>
            <label className="text-xs font-black uppercase text-white/60 tracking-wider flex items-center gap-2 mb-3">
              <ImageIcon className="w-4 h-4 text-[#ff8f00]" />
              Фоновая тема турнира
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(bgThemes || {}).map(([key, theme]: [string, any]) => {
                const isSelected = currentBgTheme === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSelectBgTheme(key)}
                    className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                        : 'bg-black/40 border-white/5 text-white/60 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div className="text-sm font-bold truncate">{theme.name || key}</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">Пользовательский фон</div>
                <div className="text-xs text-white/40">Загрузите своё изображение для фона турнира</div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) onUploadBg(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Загрузить фото
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#ff8f00] hover:bg-[#ff8f00]/90 text-black font-black text-sm uppercase rounded-xl transition-all shadow-[0_0_15px_rgba(255,143,0,0.3)] cursor-pointer"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}
