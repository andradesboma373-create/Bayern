export type BoxStyle = 'dark' | 'glass' | 'neon' | 'minimal' | 'cyberpunk' | 'clean' | string;

export interface BoxClasses {
  outerCard: string;
  selectedTeamRow: string;
  nonSelectedTeamRow: string;
  innerTeamRow: string;
  winnerText: string;
  loserText: string;
  defaultText: string;
  scoreInput: string;
}

export function getBoxStyle(
  style: BoxStyle = 'dark',
  _cardThemeColor?: string,
  _btnStyle?: string
): BoxClasses {
  switch (style) {
    case 'glass':
      return {
        outerCard: 'backdrop-blur-md bg-white/[0.04] border border-white/10 rounded-2xl p-4 shadow-xl hover:border-white/20 transition-all',
        selectedTeamRow: 'bg-emerald-500/20 border border-emerald-500/40 rounded-xl px-3 py-2 flex items-center justify-between text-white font-bold transition-all shadow-sm',
        nonSelectedTeamRow: 'bg-black/30 border border-white/5 opacity-40 rounded-xl px-3 py-2 flex items-center justify-between text-white/50 transition-all',
        innerTeamRow: 'bg-black/40 border border-white/10 rounded-xl px-3 py-2 flex items-center justify-between text-white/80 hover:bg-black/60 transition-all',
        winnerText: 'text-emerald-400 font-black',
        loserText: 'text-white/40 line-through font-normal',
        defaultText: 'text-white font-semibold',
        scoreInput: 'w-10 bg-black/60 border border-white/20 rounded-lg text-center text-white font-mono font-bold py-1 px-1 text-sm outline-none focus:border-[#ff8f00]'
      };

    case 'neon':
      return {
        outerCard: 'bg-black/90 border-2 border-purple-500/40 rounded-2xl p-4 shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:border-purple-400 transition-all',
        selectedTeamRow: 'bg-purple-900/30 border border-purple-400 rounded-xl px-3 py-2 flex items-center justify-between text-white font-bold transition-all shadow-[0_0_10px_rgba(168,85,247,0.3)]',
        nonSelectedTeamRow: 'bg-black/40 border border-white/5 opacity-40 rounded-xl px-3 py-2 flex items-center justify-between text-white/40 transition-all',
        innerTeamRow: 'bg-zinc-900/80 border border-purple-500/20 rounded-xl px-3 py-2 flex items-center justify-between text-white/80 hover:border-purple-500/50 transition-all',
        winnerText: 'text-purple-300 font-black',
        loserText: 'text-white/40 line-through font-normal',
        defaultText: 'text-white font-semibold',
        scoreInput: 'w-10 bg-black/80 border border-purple-500/40 rounded-lg text-center text-purple-200 font-mono font-bold py-1 px-1 text-sm outline-none focus:border-purple-400'
      };

    case 'minimal':
    case 'clean':
      return {
        outerCard: 'bg-zinc-900/80 border border-white/5 rounded-xl p-3.5 shadow-md hover:border-white/15 transition-all',
        selectedTeamRow: 'bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-white font-bold transition-all',
        nonSelectedTeamRow: 'bg-transparent opacity-30 px-2.5 py-1.5 flex items-center justify-between text-white/40 transition-all',
        innerTeamRow: 'bg-zinc-800/50 border border-white/5 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-white/80 hover:bg-zinc-800 transition-all',
        winnerText: 'text-white font-black',
        loserText: 'text-white/30 line-through font-normal',
        defaultText: 'text-white/90 font-medium',
        scoreInput: 'w-9 bg-zinc-950 border border-white/10 rounded text-center text-white font-mono font-bold py-0.5 px-1 text-xs outline-none focus:border-white/40'
      };

    case 'dark':
    default:
      return {
        outerCard: 'bg-black/75 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl hover:border-white/20 transition-all',
        selectedTeamRow: 'bg-[#ff8f00]/15 border border-[#ff8f00]/40 rounded-xl px-3 py-2 flex items-center justify-between text-white font-bold transition-all shadow-[0_0_12px_rgba(255,143,0,0.15)]',
        nonSelectedTeamRow: 'bg-black/40 border border-white/5 opacity-40 rounded-xl px-3 py-2 flex items-center justify-between text-white/40 transition-all',
        innerTeamRow: 'bg-zinc-900/90 border border-white/10 rounded-xl px-3 py-2 flex items-center justify-between text-white/80 hover:bg-zinc-800 hover:border-white/20 transition-all',
        winnerText: 'text-[#ff8f00] font-black',
        loserText: 'text-white/40 line-through font-normal',
        defaultText: 'text-white font-semibold',
        scoreInput: 'w-10 bg-black/70 border border-white/20 rounded-lg text-center text-white font-mono font-bold py-1 px-1 text-sm outline-none focus:border-[#ff8f00]'
      };
  }
}
