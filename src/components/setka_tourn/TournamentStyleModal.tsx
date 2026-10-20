import React, { useState } from 'react';
import { X, Check, Palette, Sparkles, Image as ImageIcon, Upload, CheckCircle2 } from 'lucide-react';
import { BOX_STYLE_OPTIONS, CARD_COLOR_PRESETS, getBoxStyle, BoxStyle } from './boxStyles';
import TeamLogo from '../TeamLogo';

interface TournamentStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBoxStyle?: string;
  currentCardColor?: string;
  currentBgTheme?: string;
  bgThemes: Record<string, { name: string; className?: string; preview?: string; style?: any }>;
  onSelectBoxStyle: (styleId: BoxStyle) => void;
  onSelectCardColor: (colorHex: string) => void;
  onSelectBgTheme: (themeId: string) => void;
  onUploadBg?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const TournamentStyleModal: React.FC<TournamentStyleModalProps> = ({
  isOpen,
  onClose,
  currentBoxStyle = 'dark',
  currentCardColor = '#ff8f00',
  currentBgTheme = 'cyber_grid',
  bgThemes,
  onSelectBoxStyle,
  onSelectCardColor,
  onSelectBgTheme,
  onUploadBg,
}) => {
  const [activeTab, setActiveTab] = useState<'cards' | 'colors' | 'background'>('cards');

  if (!isOpen) return null;

  const selectedBoxStyle = (currentBoxStyle as BoxStyle) || 'dark';
  const boxCls = getBoxStyle(selectedBoxStyle, currentCardColor);
  const isCustomAccent = !!currentCardColor && selectedBoxStyle === 'dark';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0e0e16] border border-white/10 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ff8f00]/10 border border-[#ff8f00]/30 flex items-center justify-center text-[#ff8f00]">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Оформление карточек и сетки</h3>
              <p className="text-white/40 text-xs">Настройка внешнего вида матчей («квадратиков») и фона турнира</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Box */}
        <div className="p-5 bg-black/40 border-b border-white/5 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#ff8f00]" /> Живое превью карточки матча
            </span>
            <span className="text-[10px] font-bold text-white/60">
              Стиль: <span className="text-[#ff8f00] font-black">{BOX_STYLE_OPTIONS.find(o => o.id === selectedBoxStyle)?.label || selectedBoxStyle}</span>
            </span>
          </div>

          <div className={`p-3 rounded-2xl max-w-sm mx-auto transition-all ${boxCls.outerCard}`}>
            <div className="space-y-1.5">
              {/* Team 1 Row */}
              <div 
                className={boxCls.selectedTeamRow}
                style={isCustomAccent ? { borderColor: currentCardColor, backgroundColor: `${currentCardColor}20` } : undefined}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <TeamLogo teamName="Team Spirit" sizeClassName="w-5 h-5 shrink-0" />
                  <span className={`text-xs font-black truncate ${boxCls.winnerText}`} style={isCustomAccent ? { color: currentCardColor } : undefined}>
                    Team Spirit
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    WIN
                  </span>
                  <span className={`text-xs font-mono font-black ${boxCls.scoreInput}`}>2</span>
                </div>
              </div>

              {/* Team 2 Row */}
              <div className={boxCls.nonSelectedTeamRow}>
                <div className="flex items-center gap-2 overflow-hidden">
                  <TeamLogo teamName="Natus Vincere" sizeClassName="w-5 h-5 shrink-0" />
                  <span className={`text-xs truncate ${boxCls.loserText}`}>
                    Natus Vincere
                  </span>
                </div>
                <span className={`text-xs font-mono ${boxCls.scoreInput}`}>1</span>
              </div>
            </div>

            <button className={`${boxCls.btnConfirm} cursor-default`}>
              Счет 2 : 1 (Завершено)
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/5 bg-black/20 px-6 pt-3 shrink-0 gap-2">
          <button
            onClick={() => setActiveTab('cards')}
            className={`pb-3 px-4 font-black text-xs uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === 'cards'
                ? 'border-[#ff8f00] text-[#ff8f00]'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            Стиль карточек ({BOX_STYLE_OPTIONS.length})
          </button>
          <button
            onClick={() => setActiveTab('colors')}
            className={`pb-3 px-4 font-black text-xs uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === 'colors'
                ? 'border-[#ff8f00] text-[#ff8f00]'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            Цвет акцента
          </button>
          <button
            onClick={() => setActiveTab('background')}
            className={`pb-3 px-4 font-black text-xs uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === 'background'
                ? 'border-[#ff8f00] text-[#ff8f00]'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            Фон турнира
          </button>
        </div>

        {/* Tab Contents (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 scrollbar-thin scrollbar-thumb-white/10">
          
          {/* TAB 1: Box Styles */}
          {activeTab === 'cards' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BOX_STYLE_OPTIONS.map((style) => {
                const isSelected = selectedBoxStyle === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => onSelectBoxStyle(style.id)}
                    className={`flex items-start gap-3.5 p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-[#ff8f00]/15 border-[#ff8f00] shadow-[0_0_15px_rgba(255,143,0,0.2)]'
                        : 'bg-black/30 border-white/5 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-2xl shrink-0 mt-0.5">{style.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-xs font-black uppercase tracking-wide ${isSelected ? 'text-[#ff8f00]' : 'text-white'}`}>
                          {style.label}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-[#ff8f00] shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-white/40 leading-relaxed">
                        {style.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 2: Accent Colors */}
          {activeTab === 'colors' && (
            <div className="space-y-4">
              <p className="text-xs text-white/60">
                Цвет используется для подсветки победителя матча, акцентных кнопок и контуров в карточках:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CARD_COLOR_PRESETS.map((color) => {
                  const isSelected = currentCardColor === color.id;
                  return (
                    <button
                      key={color.id}
                      onClick={() => onSelectCardColor(color.id)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-white bg-white/10 shadow-lg'
                          : 'border-white/5 bg-black/30 hover:border-white/20 hover:bg-white/5'
                      }`}
                    >
                      <div 
                        className="w-6 h-6 rounded-full shrink-0 shadow-md border border-white/20" 
                        style={{ backgroundColor: color.id }}
                      />
                      <div className="text-left min-w-0 flex-1">
                        <div className="text-xs font-black text-white truncate">{color.name}</div>
                        <div className="text-[9px] font-mono text-white/40 uppercase">{color.id}</div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Background Themes */}
          {activeTab === 'background' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/60">
                  Выберите фоновую тему под турнирной сеткой:
                </p>
                {onUploadBg && (
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 rounded-xl text-[10px] font-black uppercase cursor-pointer transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Своё фото</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={onUploadBg} 
                      className="hidden" 
                    />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(bgThemes).map(([themeKey, themeData]) => {
                  const isSelected = currentBgTheme === themeKey;
                  return (
                    <button
                      key={themeKey}
                      onClick={() => onSelectBgTheme(themeKey)}
                      className={`flex flex-col gap-2 p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'border-[#ff8f00] bg-[#ff8f00]/10 shadow-[0_0_15px_rgba(255,143,0,0.2)]'
                          : 'border-white/5 bg-black/30 hover:border-white/20 hover:bg-white/5'
                      }`}
                    >
                      <div className={`w-full h-14 rounded-xl border border-white/10 ${themeData.className} flex items-center justify-center relative overflow-hidden shadow-inner`}>
                        <ImageIcon className="w-4 h-4 text-white/20" />
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#ff8f00] text-black flex items-center justify-center font-black">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-black text-white uppercase tracking-wider truncate">
                        {themeData.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-white/10 bg-black/40 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-bold text-white/40">
            * Изменения применяются к сетке мгновенно
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#ff8f00] hover:bg-[#ffa733] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-[#ff8f00]/20"
          >
            Готово
          </button>
        </div>

      </div>
    </div>
  );
};
