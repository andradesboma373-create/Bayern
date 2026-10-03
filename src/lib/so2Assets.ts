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

// 1. Curated Standoff 2 Teams with Rosters & Logos
export const SO2_TEAMS: So2TeamPreset[] = [
  {
    id: 'so2_t_saints',
    name: 'SaiNts',
    tag: 'SN',
    country: 'RU',
    primaryColor: '#eab308',
    description: 'Многократные чемпионы Major-турниров по Standoff 2',
    logoUrl: createSvgDataUrl(['#ca8a04', '#eab308'], '<path d="M50 0 L90 25 L80 75 L50 100 L20 75 L10 25 Z" fill="#ffffff" opacity="0.9"/><path d="M50 15 L75 35 L68 70 L50 85 L32 70 L25 35 Z" fill="#ca8a04"/>', 'SAINTS'),
    players: [
      { id: 'so2_p_gentleman', nickname: 'GentlemaN', realName: 'Артем', role: 'captain', rating: 115, valRating: 1150, photoUrl: createPlayerAvatarUrl('#b45309', 'GNT', '👑'), country: 'RU' },
      { id: 'so2_p_lunax', nickname: 'Lunax', realName: 'Иван', role: 'rifler', rating: 112, valRating: 1120, photoUrl: createPlayerAvatarUrl('#d97706', 'LNX', '🎯'), country: 'RU' },
      { id: 'so2_p_nekr0', nickname: 'Nekr0', realName: 'Кирилл', role: 'opener', rating: 110, valRating: 1100, photoUrl: createPlayerAvatarUrl('#f59e0b', 'NKR', '⚡'), country: 'RU' },
      { id: 'so2_p_sk1ll', nickname: 'SK1LL', realName: 'Максим', role: 'support', rating: 106, valRating: 1060, photoUrl: createPlayerAvatarUrl('#eab308', 'SKL', '🛡️'), country: 'RU' },
      { id: 'so2_p_lunyov', nickname: 'Lunyov', realName: 'Александр', role: 'sniper', rating: 109, valRating: 1090, photoUrl: createPlayerAvatarUrl('#ca8a04', 'LNY', '🎯'), country: 'RU' }
    ]
  },
  {
    id: 'so2_t_horizon',
    name: 'Horizon',
    tag: 'HZ',
    country: 'RU',
    primaryColor: '#06b6d4',
    description: 'Легендарный состав и один из сильнейших клубов СНГ сцены SO2',
    logoUrl: createSvgDataUrl(['#0891b2', '#06b6d4'], '<polygon points="50,5 95,35 78,95 22,95 5,35" fill="#ffffff" opacity="0.9"/><path d="M25 45 H75 V55 H25 Z M50 20 V80" stroke="#0891b2" stroke-width="8" stroke-linecap="round"/>', 'HORIZON'),
    players: [
      { id: 'so2_p_flodder', nickname: 'Flodder', realName: 'Даниил', role: 'sniper', rating: 114, valRating: 1140, photoUrl: createPlayerAvatarUrl('#0e7490', 'FLD', '🎯'), country: 'RU' },
      { id: 'so2_p_silence', nickname: 'Silence', realName: 'Денис', role: 'rifler', rating: 111, valRating: 1110, photoUrl: createPlayerAvatarUrl('#06b6d4', 'SLN', '⚡'), country: 'RU' },
      { id: 'so2_p_fenix', nickname: 'fenix', realName: 'Никита', role: 'opener', rating: 107, valRating: 1070, photoUrl: createPlayerAvatarUrl('#22d3ee', 'FNX', '🔥'), country: 'RU' },
      { id: 'so2_p_cris', nickname: 'cris', realName: 'Илья', role: 'support', rating: 105, valRating: 1050, photoUrl: createPlayerAvatarUrl('#0891b2', 'CRS', '🛡️'), country: 'RU' },
      { id: 'so2_p_spark', nickname: 'spark', realName: 'Роман', role: 'lurker', rating: 106, valRating: 1060, photoUrl: createPlayerAvatarUrl('#0284c7', 'SPK', '🕶️'), country: 'RU' }
    ]
  },
  {
    id: 'so2_t_rgg',
    name: 'Revival Gaming',
    tag: 'RGG',
    country: 'RU',
    primaryColor: '#ef4444',
    description: 'Агрессивная атака и чемпионская тактика в Standoff 2',
    logoUrl: createSvgDataUrl(['#b91c1c', '#ef4444'], '<path d="M50 5 Q75 30 70 60 Q50 95 50 95 Q50 95 30 60 Q25 30 50 5 Z" fill="#ffffff" opacity="0.9"/><circle cx="50" cy="55" r="15" fill="#b91c1c"/>', 'REVIVAL'),
    players: [
      { id: 'so2_p_w1nn', nickname: 'w1nn', realName: 'Владислав', role: 'captain', rating: 113, valRating: 1130, photoUrl: createPlayerAvatarUrl('#991b1b', 'W1N', '👑'), country: 'RU' },
      { id: 'so2_p_tr1ck', nickname: 'tr1ck', realName: 'Егор', role: 'sniper', rating: 112, valRating: 1120, photoUrl: createPlayerAvatarUrl('#dc2626', 'TRK', '🎯'), country: 'RU' },
      { id: 'so2_p_sparky', nickname: 'sparky', realName: 'Матвей', role: 'rifler', rating: 108, valRating: 1080, photoUrl: createPlayerAvatarUrl('#ef4444', 'SPY', '⚡'), country: 'RU' },
      { id: 'so2_p_morphy', nickname: 'morphy', realName: 'Дмитрий', role: 'opener', rating: 106, valRating: 1060, photoUrl: createPlayerAvatarUrl('#b91c1c', 'MRP', '💥'), country: 'RU' },
      { id: 'so2_p_z1k', nickname: 'z1k', realName: 'Тимофей', role: 'support', rating: 104, valRating: 1040, photoUrl: createPlayerAvatarUrl('#7f1d1d', 'Z1K', '🛡️'), country: 'RU' }
    ]
  },
  {
    id: 'so2_t_vp',
    name: 'Virtus.pro SO2',
    tag: 'VP',
    country: 'RU',
    primaryColor: '#f97316',
    description: 'Официальный состав организации Virtus.pro в дисциплине Standoff 2',
    logoUrl: createSvgDataUrl(['#c2410c', '#ea580c'], '<polygon points="50,10 85,30 75,85 50,95 25,85 15,30" fill="#ffffff"/><path d="M35 40 L65 40 L50 70 Z" fill="#ea580c"/>', 'VP SO2'),
    players: [
      { id: 'so2_p_vortex', nickname: 'Vortex', realName: 'Олег', role: 'captain', rating: 111, valRating: 1110, photoUrl: createPlayerAvatarUrl('#9a3412', 'VRX', '👑'), country: 'RU' },
      { id: 'so2_p_jumper', nickname: 'Jumper', realName: 'Павел', role: 'sniper', rating: 112, valRating: 1120, photoUrl: createPlayerAvatarUrl('#ea580c', 'JMP', '🎯'), country: 'RU' },
      { id: 'so2_p_sensei', nickname: 'Sensei', realName: 'Арсений', role: 'rifler', rating: 109, valRating: 1090, photoUrl: createPlayerAvatarUrl('#f97316', 'SNS', '⚡'), country: 'RU' },
      { id: 'so2_p_ghost', nickname: 'Ghost', realName: 'Тимур', role: 'opener', rating: 107, valRating: 1070, photoUrl: createPlayerAvatarUrl('#c2410c', 'GST', '👻'), country: 'RU' },
      { id: 'so2_p_raider', nickname: 'Raider', realName: 'Станислав', role: 'support', rating: 105, valRating: 1050, photoUrl: createPlayerAvatarUrl('#7c2d12', 'RDR', '🛡️'), country: 'RU' }
    ]
  },
  {
    id: 'so2_t_necessary',
    name: 'Necessary',
    tag: 'NC',
    country: 'RU',
    primaryColor: '#8b5cf6',
    description: 'Топовая команда регулярных лиг и кубков Standoff 2',
    logoUrl: createSvgDataUrl(['#6d28d9', '#8b5cf6'], '<path d="M50 5 L85 25 L85 70 L50 95 L15 70 L15 25 Z" fill="#ffffff"/><text x="50" y="65" text-anchor="middle" font-size="45" font-weight="900" fill="#6d28d9">N</text>', 'NECESSARY'),
    players: [
      { id: 'so2_p_avent', nickname: 'Avent', realName: 'Евгений', role: 'captain', rating: 110, valRating: 1100, photoUrl: createPlayerAvatarUrl('#5b21b6', 'AVT', '👑'), country: 'RU' },
      { id: 'so2_p_k1ros', nickname: 'K1ros', realName: 'Степан', role: 'sniper', rating: 109, valRating: 1090, photoUrl: createPlayerAvatarUrl('#7c3aed', 'KRS', '🎯'), country: 'RU' },
      { id: 'so2_p_bl1nk', nickname: 'Bl1nk', realName: 'Марк', role: 'rifler', rating: 107, valRating: 1070, photoUrl: createPlayerAvatarUrl('#8b5cf6', 'BLK', '⚡'), country: 'RU' },
      { id: 'so2_p_swift', nickname: 'Swift', realName: 'Сергей', role: 'opener', rating: 105, valRating: 1050, photoUrl: createPlayerAvatarUrl('#6d28d9', 'SWF', '💨'), country: 'RU' },
      { id: 'so2_p_frost', nickname: 'Frost', realName: 'Андрей', role: 'support', rating: 104, valRating: 1040, photoUrl: createPlayerAvatarUrl('#4c1d95', 'FRS', '🛡️'), country: 'RU' }
    ]
  },
  {
    id: 'so2_t_forze',
    name: 'ForZe SO2',
    tag: 'FZ',
    country: 'RU',
    primaryColor: '#dc2626',
    description: 'Бойцовский состав с жесткой дисциплиной и сильными снайперами',
    logoUrl: createSvgDataUrl(['#991b1b', '#dc2626'], '<polygon points="50,5 90,30 75,90 50,75 25,90 10,30" fill="#ffffff"/><circle cx="50" cy="45" r="16" fill="#991b1b"/>', 'FORZE'),
    players: [
      { id: 'so2_p_phantom', nickname: 'Phantom', realName: 'Алексей', role: 'sniper', rating: 110, valRating: 1100, photoUrl: createPlayerAvatarUrl('#7f1d1d', 'PHT', '🎯'), country: 'RU' },
      { id: 'so2_p_striker', nickname: 'Striker', realName: 'Богдан', role: 'captain', rating: 108, valRating: 1080, photoUrl: createPlayerAvatarUrl('#991b1b', 'STR', '👑'), country: 'RU' },
      { id: 'so2_p_blade', nickname: 'Blade', realName: 'Виктор', role: 'rifler', rating: 106, valRating: 1060, photoUrl: createPlayerAvatarUrl('#dc2626', 'BLD', '⚡'), country: 'RU' },
      { id: 'so2_p_hunter', nickname: 'Hunter', realName: 'Василий', role: 'opener', rating: 105, valRating: 1050, photoUrl: createPlayerAvatarUrl('#b91c1c', 'HNT', '🏹'), country: 'RU' },
      { id: 'so2_p_viper', nickname: 'Viper', realName: 'Георгий', role: 'support', rating: 104, valRating: 1040, photoUrl: createPlayerAvatarUrl('#450a0a', 'VPR', '🐍'), country: 'RU' }
    ]
  },
  {
    id: 'so2_t_streeteight',
    name: 'Streeteight',
    tag: 'S8',
    country: 'RU',
    primaryColor: '#10b981',
    description: 'Молодая и взрывная команда, гроза фаворитов турниров',
    logoUrl: createSvgDataUrl(['#047857', '#10b981'], '<circle cx="50" cy="50" r="45" fill="#ffffff"/><circle cx="50" cy="35" r="14" fill="#047857"/><circle cx="50" cy="65" r="18" fill="#047857"/>', 'STREET8'),
    players: [
      { id: 'so2_p_shadow', nickname: 'Shadow', realName: 'Вячеслав', role: 'captain', rating: 108, valRating: 1080, photoUrl: createPlayerAvatarUrl('#065f46', 'SHD', '👑'), country: 'RU' },
      { id: 'so2_p_diesel', nickname: 'Diesel', realName: 'Константин', role: 'sniper', rating: 107, valRating: 1070, photoUrl: createPlayerAvatarUrl('#047857', 'DSL', '🎯'), country: 'RU' },
      { id: 'so2_p_rex', nickname: 'Rex', realName: 'Михаил', role: 'rifler', rating: 106, valRating: 1060, photoUrl: createPlayerAvatarUrl('#10b981', 'REX', '⚡'), country: 'RU' },
      { id: 'so2_p_spike', nickname: 'Spike', realName: 'Платон', role: 'opener', rating: 105, valRating: 1050, photoUrl: createPlayerAvatarUrl('#059669', 'SPK', '💥'), country: 'RU' },
      { id: 'so2_p_bullet', nickname: 'Bullet', realName: 'Юрий', role: 'support', rating: 103, valRating: 1030, photoUrl: createPlayerAvatarUrl('#022c22', 'BLT', '🛡️'), country: 'RU' }
    ]
  },
  {
    id: 'so2_t_bullsfight',
    name: 'Bullsfight',
    tag: 'BF',
    country: 'RU',
    primaryColor: '#f43f5e',
    description: 'Мощный коллектив с агрессивным стилем на картах Sandstone и Rust',
    logoUrl: createSvgDataUrl(['#be123c', '#f43f5e'], '<path d="M20 30 Q50 0 80 30 Q65 80 50 95 Q35 80 20 30 Z" fill="#ffffff"/><polygon points="50,35 65,65 35,65" fill="#be123c"/>', 'BULLS'),
    players: [
      { id: 'so2_p_tornado', nickname: 'Tornado', realName: 'Ярослав', role: 'captain', rating: 107, valRating: 1070, photoUrl: createPlayerAvatarUrl('#9f1239', 'TRN', '👑'), country: 'RU' },
      { id: 'so2_p_beast', nickname: 'Beast', realName: 'Руслан', role: 'sniper', rating: 108, valRating: 1080, photoUrl: createPlayerAvatarUrl('#e11d48', 'BST', '🎯'), country: 'RU' },
      { id: 'so2_p_titan', nickname: 'Titan', realName: 'Семен', role: 'rifler', rating: 105, valRating: 1050, photoUrl: createPlayerAvatarUrl('#f43f5e', 'TTN', '⚡'), country: 'RU' },
      { id: 'so2_p_rage', nickname: 'Rage', realName: 'Валерий', role: 'opener', rating: 104, valRating: 1040, photoUrl: createPlayerAvatarUrl('#be123c', 'RGE', '💥'), country: 'RU' },
      { id: 'so2_p_storm', nickname: 'Storm', realName: 'Давид', role: 'support', rating: 103, valRating: 1030, photoUrl: createPlayerAvatarUrl('#881337', 'STM', '🛡️'), country: 'RU' }
    ]
  }
];

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
  const list: So2PlayerPreset[] = [];
  for (const team of SO2_TEAMS) {
    list.push(...team.players);
  }
  return list;
}

export const SO2_PLAYERS: (So2PlayerPreset & { team: string; teamId: string; teamLogo: string; game: string; isAcademy?: boolean })[] = SO2_TEAMS.flatMap(t =>
  t.players.map(p => ({
    ...p,
    team: t.name,
    teamId: t.id,
    teamLogo: t.logoUrl,
    game: 'so2',
    isAcademy: false
  }))
);

// Helper: get team logo by name
export function getSo2TeamLogo(teamName: string): string | undefined {
  if (!teamName) return undefined;
  const clean = teamName.trim().toLowerCase();
  const found = SO2_TEAMS.find(t => t.name.toLowerCase() === clean || t.tag.toLowerCase() === clean);
  return found?.logoUrl;
}
