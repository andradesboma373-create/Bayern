export type TeamSide = 'CT' | 'T';
export type PlayerRole = 'Captain' | 'Entry' | 'Rifler' | 'Support' | 'Sniper' | 'Lurker';
export type NodeZone = 'T_SPAWN' | 'CT_SPAWN' | 'MID' | 'A_SITE' | 'B_SITE' | 'A_MAIN' | 'B_MAIN' | 'CONNECTOR' | 'LONG' | 'SHORT' | 'APARTMENTS';

export interface Vector2D {
  x: number;
  y: number;
}

export interface MapNode {
  id: string;
  x: number;
  y: number;
  zone: NodeZone;
  connections: string[]; // Node IDs
  visibilityConnections: string[]; // Nodes visible from this node
  isPlantZone?: boolean;
}

export interface PlayerStats {
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  headshots: number;
  openingKills: number;
  openingDeaths: number;
  trades: number;
  tradeDeaths: number;
  plants: number;
  defuses: number;
  utilityDamage: number;
  clutches?: number;
  shots?: number;
  hits?: number;
}

export interface PlayerMemory {
  enemyId: string;
  position: Vector2D;
  nodeId: string;
  timestamp: number;
  confidence: number;
}

export interface Player {
  id: string;
  name: string;
  teamId: string;
  side: TeamSide;
  role: PlayerRole;

  // Base Characteristics
  rating: number;
  aim: number;
  iq: number;
  movement: number;
  reaction: number;
  roleSkill: number;

  // State
  hp: number;
  armor: number; // 0, 1 (Kevlar), 2 (Helmet)
  money: number;
  
  // Loadout
  weaponId: string;
  primaryWeaponId?: string | null;
  secondaryWeaponId?: string;
  hasDefuseKit: boolean;
  grenades: string[];
  ammo?: number;

  // Physical
  position: Vector2D;
  currentNodeId?: string;
  targetNodeId?: string | null;
  targetPosition?: Vector2D | null;
  path?: string[];
  speed: number;
  
  // Logical
  alive: boolean;
  state: 'IDLE' | 'MOVING' | 'HOLDING' | 'ENGAGING' | 'PLANTING' | 'DEFUSING' | 'DEAD' | 'SAVING' | 'RELOADING';
  targetEnemyId: string | null;
  
  // Perception & Memory
  knownEnemies: Map<string, PlayerMemory>;
  
  // Timers
  reactionTimer: number;
  shootTimer: number;
  actionTimer: number;
  aimProgress?: number; // 0 to 1

  statistics: PlayerStats;
  damageTaken?: Map<string, number>;
  lastRoundKills?: number;
}

export interface Team {
  id: string;
  name: string;
  score: number;
  money: number;
  side: TeamSide;
  players: string[]; // Player IDs
  tactic: string;
  strategy: 'DEFAULT' | 'FAST_A' | 'FAST_B' | 'EXECUTE_A' | 'EXECUTE_B' | 'SPLIT' | 'CONTACT' | 'FAKE' | 'SLOW' | 'AGGRESSIVE' | 'PASSIVE' | 'STACK_A' | 'STACK_B' | 'RETAKE' | 'SAVE' | 'DEFEND_BOMB' | 'RECOVER_BOMB';
  lossStreak?: number;
}

export interface BombState {
  state: 'CARRIED' | 'DROPPED' | 'PLANTING' | 'PLANTED' | 'DEFUSING' | 'DEFUSED' | 'EXPLODED';
  position: Vector2D | null;
  nodeId?: string | null;
  carrierId: string | null;
  timer: number;
  explosionTimer?: number;
  defuseTimer?: number; // ticks left for plant/defuse/explode
  defuserPlayerId?: string | null;
}

export interface MatchState {
  matchId: string;
  seed: number;
  mapId: string;
  isCS2: boolean;
  format: string; // MR12, MR15
  
  phase: 'FREEZE' | 'BUY' | 'LIVE' | 'ROUND_END' | 'MATCH_END';
  round: number;
  half: number;
  tick: number; // For simulation timing
  
  teams: Record<string, Team>;
  players: Record<string, Player>;
  
  bomb: BombState;
  
  events: MatchEvent[];
  roundLogs: RoundLog[];
  roundFirstKillId?: string | null;
}

export interface MatchEvent {
  type: string;
  tick: number;
  data: any;
}

export interface RoundLog {
  round: number;
  winnerTeamId: string;
  reason: 'ELIMINATION' | 'DEFUSE' | 'EXPLOSION' | 'TIME';
  duration: number;
  t1Score: number;
  t2Score: number;
  kills: number;
  firstKillId?: string;
  aces?: string[];
  clutch?: string;
  t1EcoType: string;
  t2EcoType: string;
}
