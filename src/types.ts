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
  folderId?: string;
  stageId?: string; // New field for stage organization
  priority?: number; // Importance level 1-3
}

export interface MatchFolder {
  id: string;
  name: string;
  userId: string;
  gameMode: string;
  createdAt: number;
  priority?: number; // 1 = Low, 2 = Medium, 3 = High
  isExcluded?: boolean; // Exclude from global counts
}

export interface MatchStage {
  id: string;
  name: string;
  folderId: string; // Belongs to a folder
  userId: string;
  createdAt: number;
  priority?: number;
  isExcluded?: boolean;
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
