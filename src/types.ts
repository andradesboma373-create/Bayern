export interface Player {
  id: string;
  nickname: string;
  role: string;
  rating: number;
}

export interface MatchResult {
  id: string;
  date: string;
  gameMode: string;
  tournamentName: string;
  format: string;
  bo: number;
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  userId: string;
  team1Stats?: any[];
  team2Stats?: any[];
  maps?: any[];
  mvp?: any;
  timestamp?: number;
  t1StartedAs?: string;
  t2StartedAs?: string;
}

export interface PlayerStat {
  id: string;
  nickname: string;
  teamName: string;
  matches: number;
  kills: number;
  deaths: number;
  userId: string;
  team1Stats?: any[];
  team2Stats?: any[];
  maps?: any[];
  mvp?: any;
  timestamp?: number;
}
