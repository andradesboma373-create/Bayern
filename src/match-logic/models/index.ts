export type TeamSide = 'T' | 'CT';

export type NodeZone =
  | 'T_SPAWN'
  | 'CT_SPAWN'
  | 'A_SITE'
  | 'B_SITE'
  | 'MID'
  | 'A_MAIN'
  | 'B_MAIN'
  | 'APARTMENTS'
  | 'CONNECTOR'
  | 'SHORT'
  | string;

export interface Vector2D {
  x: number;
  y: number;
}

export interface MapNode {
  id: string;
  x: number;
  y: number;
  zone: NodeZone;
  connections: string[];
  visibilityConnections: string[];
  isPlantZone?: boolean;
  [key: string]: any;
}

export interface PlayerStatistics {
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  headshots: number;
  shots: number;
  hits: number;
  openingKills: number;
  openingDeaths: number;
  trades: number;
  tradeDeaths: number;
  plants: number;
  defuses: number;
  utilityDamage: number;
  hltvRating?: string | number;
  adr?: number | string;
  kast?: string;
  impact?: number | string;
  kd?: number | string;
  roundSwingNum?: number;
  roundSwing?: number;
  [key: string]: any;
}

export interface Player {
  id: string;
  name: string;
  teamId: string;
  side: TeamSide;
  role: string;
  originalRole?: string;
  isAdaptedRole?: boolean;
  isNewPlayer?: boolean;
  rating: number;
  subclass?: string;
  calls?: number;
  aim: number;
  iq: number;
  movement: number;
  reaction: number;
  roleSkill: number;
  utility: number;
  focus: number;
  aggression: number;
  impact: number;
  perk?: any;
  hp: number;
  armor: number;
  money: number;
  weaponId: string;
  hasDefuseKit: boolean;
  grenades: any[];
  position: Vector2D;
  targetPosition: Vector2D | null;
  speed: number;
  alive: boolean;
  state: string;
  targetEnemyId: string | null;
  knownEnemies: Map<string, any>;
  reactionTimer: number;
  shootTimer: number;
  actionTimer: number;
  statistics: PlayerStatistics;
  currentNodeId?: string;
  targetNodeId?: string;
  path?: string[];
  aimProgress?: number;
  [key: string]: any;
}

export interface Team {
  id: string;
  name: string;
  side: TeamSide;
  score: number;
  economy: number;
  lossStreak: number;
  players: string[];
  tactic: string;
  strategy: string;
  timeoutsRemaining: number;
  synergy?: number;
  mapExp?: number;
  calls?: number;
  callsNorm?: number;
  captainPlayerId?: string | null;
  [key: string]: any;
}

export interface MatchEvent {
  type: string;
  tick?: number;
  round?: number;
  playerId?: string;
  targetId?: string;
  weapon?: string;
  isHeadshot?: boolean;
  damage?: number;
  message?: string;
  [key: string]: any;
}

export type BombStatus = 'CARRIED' | 'DROPPED' | 'PLANTING' | 'PLANTED' | 'DEFUSING' | 'DEFUSED' | 'EXPLODED';

export interface BombState {
  state: BombStatus;
  position: Vector2D | null;
  nodeId: string | null;
  carrierId: string | null;
  timer: number;
  [key: string]: any;
}

export interface MatchState {
  round: number;
  tick: number;
  phase: string;
  isCS2: boolean;
  mapId: string;
  format: string;
  teams: Record<string, Team>;
  players: Record<string, Player>;
  bomb: BombState;
  events: MatchEvent[];
  roundLogs: any[];
  seed?: number;
  t1StartedAs?: TeamSide;
  t2StartedAs?: TeamSide;
  t1Overall?: number;
  t2Overall?: number;
  teamRatingDiff?: number;
  [key: string]: any;
}
