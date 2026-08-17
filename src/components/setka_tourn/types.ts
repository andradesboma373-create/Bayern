export interface Team {
  id: string;
  name: string;
  logoUrl?: string;
  game?: string;
  players?: any[];
}

export interface Match {
  id: string;
  round?: number;
  team1: Team | null;
  team2: Team | null;
  score1: number;
  score2: number;
  winnerId: string | null;
  isDraw?: boolean;
  isFinished?: boolean;
}

export interface Group {
  id: string;
  name: string;
  teams: Team[];
  matches: Match[];
}

export interface GslGroup {
  id: string;
  name: string;
  teams: Team[];
  upperBracket: Match[][];
  lowerBracket: Match[][];
}

export interface TournamentSettings {
  mode: 'single_stage' | 'two_stage' | 'swiss';
  game?: string;
  matchFormat?: string;
  eliminationType?: 'single' | 'double';
  stage1Type?: 'groups' | 'swiss' | 'playoff' | 'gsl_groups';
  stage2Type?: 'tiered' | 'single' | 'double';
  hasStage2?: boolean;
  
  // Swiss stage settings
  swissWinsToAdvance?: number;
  swissLossesToEliminate?: number;
  
  // Single elimination
  singleEliminationTeams?: Team[];
  
  // Seeding type
  seedingType?: 'random' | 'manual';
  
  // Group stage settings
  matchesPerPairing?: 1 | 2;
  winPoints?: number;
  drawPoints?: number;
  lossPoints?: number;
  advancingPerGroup?: number;
  numberOfGroups?: number;
  groupAssignments?: Record<string, string[]>; // groupId -> array of team ids (or team objects)

  // Bracket mode
  bracketMode?: 'standard' | 'realtime';

  // Custom styling settings
  boxStyle?: 'classic' | 'minimalist' | 'cyber' | 'retro' | 'dark' | 'neon' | 'glass' | 'brutalist' | 'light' | 'gold';
  cardThemeColor?: string; // hex or color preset e.g. '#ff8f00', '#00f0ff', '#10b981', '#a855f7', '#ef4444', '#eab308'
  btnStyle?: 'gradient' | 'neon' | 'solid' | 'brutal';
  bracketScale?: number; // percentage 50 - 150
  bgBlur?: number;
  bgOpacity?: number;
  bgTheme?: string;
  bgImage?: string;
}

export function getBoxStyle(style?: 'classic' | 'minimalist' | 'cyber' | 'retro') {
  const s = style || 'classic';
  switch (s) {
    case 'minimalist':
      return {
        outerCard: 'bg-transparent border border-white/10 rounded-lg p-3 hover:border-white/20',
        winnerText: 'text-white font-black',
        loserText: 'text-white/30 font-normal',
        defaultText: 'text-white/70 font-medium',
        scoreInput: 'bg-transparent text-center text-xs font-bold border border-white/10 rounded focus:border-white/35 outline-none text-white',
        btnConfirm: 'w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer'
      };
    case 'cyber':
      return {
        outerCard: 'bg-black/45 rounded-xl border border-cyan-500/30 p-3 shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:border-cyan-400/60',
        winnerText: 'text-cyan-400 font-extrabold drop-shadow-[0_0_5px_rgba(34,211,238,0.3)]',
        loserText: 'text-white/20 line-through',
        defaultText: 'text-white/80 font-bold',
        scoreInput: 'bg-black text-center text-xs font-black font-mono border border-cyan-500/30 rounded focus:border-cyan-400 outline-none text-cyan-400',
        btnConfirm: 'w-full bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-400 border border-cyan-500/40 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer'
      };
    case 'retro':
      return {
        outerCard: 'bg-[#001100] rounded-none border border-green-500/40 p-3 font-mono hover:border-green-400',
        winnerText: 'text-green-400 font-bold uppercase tracking-widest',
        loserText: 'text-green-950',
        defaultText: 'text-green-600',
        scoreInput: 'bg-black text-center text-xs font-bold border border-green-500/40 rounded-none focus:border-green-400 outline-none text-green-400',
        btnConfirm: 'w-full bg-black hover:bg-green-950/30 text-green-400 border border-green-500/40 py-1 rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer'
      };
    case 'classic':
    default:
      return {
        outerCard: 'bg-black/35 rounded-xl border border-white/5 p-3 hover:border-white/20',
        winnerText: 'text-emerald-400 font-extrabold',
        loserText: 'text-white/40',
        defaultText: 'text-white/80 font-bold',
        scoreInput: 'bg-black text-center text-xs font-black font-mono border border-white/10 rounded focus:border-[#ff8f00]/50 outline-none text-white',
        btnConfirm: 'w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer'
      };
  }
}

export interface Tournament {
  channelId?: string;
  id: string;
  name: string;
  logoUrl?: string;
  createdAt: number;
  status?: 'active' | 'completed' | 'upcoming' | string;
  settings: TournamentSettings;
  teams: Team[];
  winnerName?: string;
  winnerTeam?: string;
  prizePool?: string;
  matchIds?: string[];
  matches?: Match[];
  completed?: boolean;
  mvpAward?: any;
  evpAwards?: any[];
  awards?: { mvpId?: string; evpIds?: string[] };
  
  // State
  activeStage: 1 | 2; // 1 = Group (if two stage) or bracket (if single), 2 = bracket (if two stage)
  
  // Stage 1 (Group stage)
  groups?: Group[];
  gslGroups?: GslGroup[];
  
  // Bracket
  bracketRounds?: Match[][];
  losersBracketRounds?: Match[][];
  grandFinal?: Match[];
  tieredBracketRounds?: Match[][];

  // Swiss
  swissRounds?: Match[][];
}
