export interface Team {
  id: string;
  name: string;
  teamName?: string;
  logoUrl?: string;
  logo?: string;
  rating?: number;
  seed?: number;
  players?: any[];
  [key: string]: any;
}

export interface Match {
  id?: string;
  team1?: Team | null;
  team2?: Team | null;
  score1?: number;
  score2?: number;
  winnerId?: string | null;
  isFinished?: boolean;
  isDraw?: boolean;
  importance?: 'final' | 'semi' | 'none' | string;
  stage?: string;
  map?: string;
  date?: string;
  [key: string]: any;
}

export interface Group {
  id?: string;
  name: string;
  teams?: Team[];
  matches: Match[];
  standings?: any[];
  [key: string]: any;
}

export interface GslGroup {
  id: string;
  name: string;
  upperBracket: Match[][];
  lowerBracket: Match[][];
  consolidationMatch?: Match;
  standings?: any[];
  isGroupFinished?: boolean;
  [key: string]: any;
}

export interface TournamentStageConfig {
  id?: string;
  name?: string;
  type?: string;
  eliminationType?: string;
  bracketRounds?: Match[][];
  losersBracketRounds?: Match[][];
  grandFinal?: Match[];
  groups?: Group[];
  gslGroups?: GslGroup[];
  swissRounds?: Match[][];
  qualifiersBrackets?: any[];
  tieredBracketRounds?: Match[][];
  teams?: Team[];
  [key: string]: any;
}

export interface TournamentSettings {
  mode?: 'single_stage' | 'two_stage' | 'custom' | string;
  stage1Type?: 'playoff' | 'groups' | 'gsl_groups' | 'swiss' | 'qualifier' | string;
  stage2Type?: 'playoff' | 'tiered' | string;
  stages?: TournamentStageConfig[];
  eliminationType?: 'single' | 'double' | string;
  matchFormat?: 'bo1' | 'bo3' | 'bo5' | 'BO1' | 'BO3' | 'BO5' | string;
  bgImage?: string;
  bgTheme?: string;
  swissWinsToAdvance?: number;
  swissLossesToEliminate?: number;
  gslAdvanceCount?: number;
  game?: 'cs2' | 'so2' | string;
  cardThemeColor?: string;
  boxStyle?: string;
  btnStyle?: string;
  bracketMode?: 'standard' | 'realtime';
  [key: string]: any;
}

export interface Tournament {
  id: string;
  name: string;
  logoUrl?: string;
  prizePool?: string;
  game?: 'cs2' | 'so2' | string;
  channelId?: string;
  userId?: string;
  completed?: boolean;
  winnerName?: string;
  activeStage?: number;
  settings?: TournamentSettings;
  teams?: Team[];
  bracketRounds?: Match[][];
  losersBracketRounds?: Match[][];
  grandFinal?: Match[];
  groups?: Group[];
  gslGroups?: GslGroup[];
  swissRounds?: Match[][];
  qualifiersBrackets?: any[];
  tieredBracketRounds?: Match[][];
  matchIds?: string[];
  createdAt?: string;
  [key: string]: any;
}
