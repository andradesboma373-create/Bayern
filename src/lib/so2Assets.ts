/**
 * so2Assets.ts
 * Dedicated Standoff 2 (SO2) Asset Library, Team Logos, Player Photos & Maps.
 * Provides pre-populated high-resolution assets, SVG vectors, and curated rosters.
 */

export interface So2TeamPreset {
  id: string;
  name: string;
  tag: string;
  country: string;
  logoUrl: string;
  primaryColor: string;
  description: string;
  players: So2PlayerPreset[];
}

export interface So2PlayerPreset {
  id: string;
  nickname: string;
  realName: string;
  role: 'captain' | 'sniper' | 'rifler' | 'opener' | 'support' | 'lurker';
  rating: number;
  valRating: number;
  photoUrl: string;
  country: string;
}

export interface So2MapPreset {
  id: string;
  name: string;
  displayName: string;
  imageUrl: string;
  description: string;
  tSideBias: number;
  ctSideBias: number;
}

// Crisp inline SVG helpers to ensure 100% offline availability and instant rendering
function createSvgDataUrl(bgGrad: [string, string], iconSvg: string, text: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGrad[0]}"/>
        <stop offset="100%" stop-color="${bgGrad[1]}"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="24" fill="url(#g)"/>
    <g transform="translate(20, 15) scale(0.6)">${iconSvg}</g>
    <text x="50" y="86" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#ffffff" letter-spacing="1">${text}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createPlayerAvatarUrl(bgColor: string, text: string, roleIcon: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" rx="50" fill="${bgColor}"/>
    <circle cx="50" cy="40" r="22" fill="#ffffff" opacity="0.9"/>
    <path d="M 20 92 C 20 68, 80 68, 80 92 Z" fill="#ffffff" opacity="0.85"/>
    <circle cx="76" cy="76" r="14" fill="#0b0b14"/>
    <text x="76" y="81" text-anchor="middle" font-size="11" fill="#ff8f00" font-weight="900">${roleIcon}</text>
    <text x="50" y="60" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="11" fill="#000000">${text.slice(0, 3)}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// 1. Curated Standoff 2 Teams with Rosters & Logos (Emptied as requested)
export const SO2_TEAMS: So2TeamPreset[] = [];

// 2. Official Standoff 2 Maps
export const SO2_MAPS: So2MapPreset[] = [
  {
    id: 'sandstone',
    name: 'Sandstone',
    displayName: 'Sandstone',
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    description: 'Самая популярная соревновательная карта Standoff 2. Баланс между плентами A и B.',
    tSideBias: 0.50,
    ctSideBias: 0.50
  },
  {
    id: 'province',
    name: 'Province',
    displayName: 'Province',
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    description: 'Узкие улочки старинного европейского городка, фонтан и опасные прострелы.',
    tSideBias: 0.52,
    ctSideBias: 0.48
  },
  {
    id: 'rust',
    name: 'Rust',
    displayName: 'Rust',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    description: 'Индустриальная фабрика и контейнерный терминал с вертикальным геймплеем.',
    tSideBias: 0.48,
    ctSideBias: 0.52
  },
  {
    id: 'sakura',
    name: 'Sakura',
    displayName: 'Sakura',
    imageUrl: 'https://images.unsplash.com/photo-1528164344705-475426879c0d?auto=format&fit=crop&w=800&q=80',
    description: 'Традиционный японский храм, цветущие сакуры и длинные снайперские коридоры.',
    tSideBias: 0.47,
    ctSideBias: 0.53
  },
  {
    id: 'breeze',
    name: 'Breeze',
    displayName: 'Breeze',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    description: 'Солнечное морское побережье, виллы и открытые площади.',
    tSideBias: 0.51,
    ctSideBias: 0.49
  },
  {
    id: 'zone9',
    name: 'Zone 9',
    displayName: 'Zone 9',
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    description: 'Секретный военный комплекс с закрытыми коридорами и быстрыми выходами на точки.',
    tSideBias: 0.49,
    ctSideBias: 0.51
  },
  {
    id: 'dune',
    name: 'Dune',
    displayName: 'Dune',
    imageUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
    description: 'Песчаная буря и древние руины, созданные для тактических перетяжек.',
    tSideBias: 0.50,
    ctSideBias: 0.50
  }
];

// Helper: flat list of all SO2 players
export function getAllSo2Players(): So2PlayerPreset[] {
  return [];
}

export const SO2_PLAYERS: (So2PlayerPreset & { team: string; teamId: string; teamLogo: string; game: string; isAcademy?: boolean })[] = [];

// Helper: get team logo by name
export function getSo2TeamLogo(teamName: string): string | undefined {
  return undefined;
}
