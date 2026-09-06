export type BoxStyle = 'dark' | 'neon' | 'glass' | 'brutalist' | 'light' | 'classic' | 'minimalist' | 'cyber' | 'retro' | 'gold';

export interface BoxStyleConfig {
  outerCard: string;
  innerTeamRow: string;
  selectedTeamRow: string;
  nonSelectedTeamRow: string;
  scoreInput: string;
  winnerText: string;
  loserText: string;
  defaultText: string;
  btnConfirm: string;
}

export const CARD_COLOR_PRESETS = [
  { id: '#ff8f00', name: 'Оранжевый', class: 'bg-[#ff8f00]', border: 'border-[#ff8f00]', text: 'text-[#ff8f00]' },
  { id: '#00f0ff', name: 'Неон Голубой', class: 'bg-[#00f0ff]', border: 'border-[#00f0ff]', text: 'text-[#00f0ff]' },
  { id: '#10b981', name: 'Изумруд', class: 'bg-[#10b981]', border: 'border-[#10b981]', text: 'text-[#10b981]' },
  { id: '#a855f7', name: 'Ультрафиолет', class: 'bg-[#a855f7]', border: 'border-[#a855f7]', text: 'text-[#a855f7]' },
  { id: '#ef4444', name: 'Алый Красный', class: 'bg-[#ef4444]', border: 'border-[#ef4444]', text: 'text-[#ef4444]' },
  { id: '#eab308', name: 'Золото', class: 'bg-[#eab308]', border: 'border-[#eab308]', text: 'text-[#eab308]' },
  { id: '#ec4899', name: 'Розовый', class: 'bg-[#ec4899]', border: 'border-[#ec4899]', text: 'text-[#ec4899]' },
];

export const BOX_STYLES: Record<string, BoxStyleConfig> = {
  dark: {
    outerCard: 'bg-[#12121a]/85 backdrop-blur-md p-4 rounded-xl border w-full shadow-xl transition-all border-white/10 hover:border-white/20',
    innerTeamRow: 'flex items-center justify-between p-2.5 rounded-lg border bg-black/30 border-white/5 transition-colors',
    selectedTeamRow: 'flex items-center justify-between p-2.5 rounded-lg border bg-[#ff8f00]/15 border-[#ff8f00]/40 text-white transition-colors shadow-[0_0_12px_rgba(255,143,0,0.2)]',
    nonSelectedTeamRow: 'flex items-center justify-between p-2.5 rounded-lg border bg-black/10 border-white/5 opacity-50 transition-colors',
    scoreInput: 'w-10 bg-black p-1 rounded text-center border border-white/10 text-white font-mono focus:border-[#ff8f00]/50 outline-none text-sm',
    winnerText: 'text-[#ff8f00] font-bold',
    loserText: 'text-white/40',
    defaultText: 'text-white/70 font-semibold',
    btnConfirm: 'mt-1 w-full bg-gradient-to-r from-[#ff8f00] to-[#ffa733] text-black py-1.5 rounded-lg font-black text-xs uppercase hover:brightness-110 transition-all shadow-[0_4px_12px_rgba(255,143,0,0.25)]',
  },
  glass: {
    outerCard: 'bg-white/10 backdrop-blur-xl p-4 rounded-2xl border-2 border-white/20 w-full shadow-[0_8px_32px_0_rgba(255,255,255,0.1)] hover:border-white/40 transition-all',
    innerTeamRow: 'flex items-center justify-between p-2.5 rounded-xl border bg-white/10 border-white/10 transition-colors backdrop-blur-md',
    selectedTeamRow: 'flex items-center justify-between p-2.5 rounded-xl border-2 bg-white/30 border-white/70 text-white font-black shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-colors',
    nonSelectedTeamRow: 'flex items-center justify-between p-2.5 rounded-xl border bg-white/5 border-white/5 opacity-40 transition-colors',
    scoreInput: 'w-10 bg-black/50 p-1 rounded-lg text-center border border-white/30 text-white font-mono focus:border-white outline-none text-sm',
    winnerText: 'text-white font-black drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]',
    loserText: 'text-white/30',
    defaultText: 'text-white/80 font-bold',
    btnConfirm: 'mt-2 w-full bg-white/20 hover:bg-white/30 text-white border-2 border-white/40 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all backdrop-blur-md shadow-[0_4px_15px_rgba(255,255,255,0.2)]',
  },
  cyber: {
    outerCard: 'bg-[#050b14]/90 p-4 rounded-xl border-2 w-full shadow-[0_0_15px_rgba(0,240,255,0.15)] transition-all border-cyan-500/50 hover:border-cyan-400 hover:shadow-[0_0_25px_rgba(0,240,255,0.3)]',
    innerTeamRow: 'flex items-center justify-between p-2.5 rounded-lg border bg-black/60 border-cyan-500/20 transition-colors',
    selectedTeamRow: 'flex items-center justify-between p-2.5 rounded-lg border-2 bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-colors',
    nonSelectedTeamRow: 'flex items-center justify-between p-2.5 rounded-lg border bg-black/30 border-white/5 opacity-35 transition-colors',
    scoreInput: 'w-10 bg-black p-1 rounded text-center border border-cyan-500/40 text-cyan-400 font-mono focus:border-cyan-400 outline-none text-sm shadow-[0_0_5px_rgba(0,240,255,0.2)]',
    winnerText: 'text-cyan-400 font-black drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]',
    loserText: 'text-white/30 line-through',
    defaultText: 'text-white/80 font-bold',
    btnConfirm: 'mt-1.5 w-full bg-cyan-950/60 border-2 border-cyan-400 text-cyan-300 py-1.5 rounded-lg font-black text-xs uppercase hover:bg-cyan-400 hover:text-black transition-all shadow-[0_0_12px_rgba(0,240,255,0.3)]',
  },
  neon: {
    outerCard: 'bg-[#0a0014]/90 p-4 rounded-xl border-2 w-full shadow-[0_0_15px_rgba(168,85,247,0.25)] transition-all border-purple-500/50 hover:border-purple-400 hover:shadow-[0_0_25px_rgba(168,85,247,0.4)]',
    innerTeamRow: 'flex items-center justify-between p-2.5 rounded-lg border bg-black/60 border-purple-500/20 transition-colors',
    selectedTeamRow: 'flex items-center justify-between p-2.5 rounded-lg border-2 bg-purple-950/60 border-purple-400 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-colors',
    nonSelectedTeamRow: 'flex items-center justify-between p-2.5 rounded-lg border bg-black/30 border-white/5 opacity-35 transition-colors',
    scoreInput: 'w-10 bg-black p-1 rounded text-center border border-purple-500/40 text-purple-300 font-mono focus:border-purple-400 outline-none text-sm',
    winnerText: 'text-purple-300 font-black drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]',
    loserText: 'text-white/30',
    defaultText: 'text-white/80 font-semibold',
    btnConfirm: 'mt-1.5 w-full bg-purple-600 hover:bg-purple-500 text-white py-1.5 rounded-lg font-black text-xs uppercase transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)]',
  },
  gold: {
    outerCard: 'bg-gradient-to-b from-[#1a1500] to-[#0a0800] p-4 rounded-xl border-2 w-full shadow-[0_0_15px_rgba(234,179,8,0.2)] transition-all border-yellow-500/50 hover:border-yellow-400 hover:shadow-[0_0_25px_rgba(234,179,8,0.35)]',
    innerTeamRow: 'flex items-center justify-between p-2.5 rounded-lg border bg-black/50 border-yellow-500/20 transition-colors',
    selectedTeamRow: 'flex items-center justify-between p-2.5 rounded-lg border-2 bg-yellow-500/20 border-yellow-400 text-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.4)] transition-colors',
    nonSelectedTeamRow: 'flex items-center justify-between p-2.5 rounded-lg border bg-black/20 border-white/5 opacity-35 transition-colors',
    scoreInput: 'w-10 bg-black p-1 rounded text-center border border-yellow-500/40 text-yellow-400 font-mono focus:border-yellow-400 outline-none text-sm',
    winnerText: 'text-yellow-400 font-black drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]',
    loserText: 'text-white/30',
    defaultText: 'text-white/80 font-bold',
    btnConfirm: 'mt-1.5 w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-black py-1.5 rounded-lg font-black text-xs uppercase hover:from-yellow-400 hover:to-amber-500 transition-all shadow-[0_0_12px_rgba(234,179,8,0.3)]',
  },
  retro: {
    outerCard: 'bg-[#001100] p-4 rounded-none border-2 border-green-500/80 w-full font-mono shadow-[0_0_12px_rgba(34,197,94,0.25)] hover:border-green-400 transition-colors',
    innerTeamRow: 'flex items-center justify-between p-2.5 rounded-none border border-green-500/30 bg-black transition-colors',
    selectedTeamRow: 'flex items-center justify-between p-2.5 rounded-none border-2 border-green-400 bg-green-950/80 text-green-300 font-bold transition-colors shadow-[0_0_10px_rgba(34,197,94,0.3)]',
    nonSelectedTeamRow: 'flex items-center justify-between p-2.5 rounded-none border border-dashed border-green-900 bg-black opacity-40 transition-colors',
    scoreInput: 'w-10 bg-black p-1 rounded-none text-center border border-green-500/50 text-green-400 font-mono focus:border-green-400 outline-none text-sm',
    winnerText: 'text-green-400 font-black uppercase tracking-widest',
    loserText: 'text-green-950',
    defaultText: 'text-green-500 font-bold',
    btnConfirm: 'mt-1.5 w-full bg-green-900/60 hover:bg-green-500 hover:text-black text-green-400 border-2 border-green-500/60 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider transition-colors',
  },
  brutalist: {
    outerCard: 'bg-black p-4 rounded-none border-4 border-white w-full shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] transition-transform active:translate-x-0.5 active:translate-y-0.5',
    innerTeamRow: 'flex items-center justify-between p-2.5 rounded-none border-2 border-white/40 bg-black transition-colors',
    selectedTeamRow: 'flex items-center justify-between p-2.5 rounded-none border-4 border-white bg-[#ff8f00] text-black font-black transition-colors',
    nonSelectedTeamRow: 'flex items-center justify-between p-2.5 rounded-none border-2 border-dashed border-white/20 bg-black opacity-40 transition-colors',
    scoreInput: 'w-10 bg-black p-1 rounded-none text-center border-2 border-white text-white font-mono focus:border-[#ff8f00] outline-none text-sm font-black',
    winnerText: 'text-black font-extrabold uppercase',
    loserText: 'text-white/30',
    defaultText: 'text-white font-bold',
    btnConfirm: 'mt-2 w-full bg-white text-black py-2 rounded-none font-black text-xs uppercase border-2 border-black hover:bg-[#ff8f00] transition-colors shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]',
  },
  minimalist: {
    outerCard: 'bg-black/40 backdrop-blur-md p-4 rounded-2xl border w-full transition-all border-white/15 hover:border-white/30 shadow-lg',
    innerTeamRow: 'flex items-center justify-between p-2.5 rounded-xl border bg-white/5 border-white/10 transition-colors',
    selectedTeamRow: 'flex items-center justify-between p-2.5 rounded-xl border-2 bg-white/20 border-white/40 text-white font-black transition-colors shadow-sm',
    nonSelectedTeamRow: 'flex items-center justify-between p-2.5 rounded-xl border bg-black/20 border-white/5 opacity-40 transition-colors',
    scoreInput: 'w-10 bg-black/60 p-1 rounded-lg text-center border border-white/20 text-white font-mono focus:border-white/50 outline-none text-sm',
    winnerText: 'text-white font-extrabold',
    loserText: 'text-white/30',
    defaultText: 'text-white/80 font-medium',
    btnConfirm: 'mt-1.5 w-full bg-white/15 hover:bg-white/25 text-white py-1.5 rounded-xl font-bold text-xs uppercase transition-colors border border-white/20',
  },
  light: {
    outerCard: 'bg-slate-50 p-4 rounded-xl border-2 w-full shadow-lg transition-colors border-slate-300 hover:border-slate-400 text-slate-800',
    innerTeamRow: 'flex items-center justify-between p-2.5 rounded-lg border bg-white border-slate-200 transition-colors text-slate-700 shadow-sm',
    selectedTeamRow: 'flex items-center justify-between p-2.5 rounded-lg border-2 bg-slate-900 border-slate-900 text-white font-extrabold shadow-md transition-colors',
    nonSelectedTeamRow: 'flex items-center justify-between p-2.5 rounded-lg border bg-slate-100 border-slate-200 opacity-50 text-slate-400 transition-colors',
    scoreInput: 'w-10 bg-slate-100 p-1 rounded text-center border border-slate-300 text-slate-900 font-mono focus:border-slate-500 outline-none text-sm font-bold',
    winnerText: 'text-white font-extrabold',
    loserText: 'text-slate-400',
    defaultText: 'text-slate-800 font-bold',
    btnConfirm: 'mt-1.5 w-full bg-slate-900 text-white py-1.5 rounded-lg font-black text-xs uppercase hover:bg-slate-800 transition-colors shadow-md',
  }
};

// Aliases
BOX_STYLES.classic = BOX_STYLES.dark;
BOX_STYLES.brutalist = BOX_STYLES.dark;
BOX_STYLES.light = BOX_STYLES.dark;

export function getBoxStyle(
  styleName: BoxStyle | string | undefined,
  cardThemeColor?: string,
  btnStyle?: string
): BoxStyleConfig {
  const key = styleName || 'dark';
  const base = BOX_STYLES[key] || BOX_STYLES.dark;
  
  // If box style is custom dark or if specific button overrides were chosen
  if (btnStyle === 'neon') {
    return {
      ...base,
      btnConfirm: `mt-1.5 w-full bg-transparent border-2 border-[#ff8f00] text-[#ff8f00] py-1.5 rounded-lg font-black text-xs uppercase hover:bg-[#ff8f00] hover:text-black transition-all shadow-[0_0_10px_rgba(255,143,0,0.3)]`,
    };
  } else if (btnStyle === 'solid') {
    return {
      ...base,
      btnConfirm: `mt-1.5 w-full bg-white text-black py-1.5 rounded-lg font-black text-xs uppercase hover:bg-white/80 transition-all shadow-md`,
    };
  } else if (btnStyle === 'brutal') {
    return {
      ...base,
      btnConfirm: `mt-1.5 w-full bg-black text-white py-1.5 rounded-none font-black text-xs uppercase border-2 border-white hover:bg-white hover:text-black transition-colors shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]`,
    };
  }

  return base;
}


