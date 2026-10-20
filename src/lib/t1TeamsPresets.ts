import teamsListJson from '../teamsList.json';

export interface T1PlayerPreset {
  id: string;
  nickname: string;
  role: 'captain' | 'sniper' | 'rifler' | 'opener' | 'support' | 'lurker';
  rating: number;
  valRating?: number;
  avatarUrl?: string;
}

export interface T1TeamPreset {
  id: string;
  name: string;
  tag?: string;
  budget: number;
  isT1Preset?: boolean;
  synergy?: number;
  players: T1PlayerPreset[];
}

export const T1_CURATED_TEAMS: T1TeamPreset[] = [
  {
    id: 't1_navi',
    name: 'Natus Vincere',
    tag: 'NAVI',
    budget: 1450000,
    isT1Preset: true,
    synergy: 98,
    players: [
      { id: 'p_aleksib', nickname: 'Aleksib', role: 'captain', rating: 108, valRating: 3100 },
      { id: 'p_b1t', nickname: 'b1t', role: 'rifler', rating: 116, valRating: 3450 },
      { id: 'p_im', nickname: 'iM', role: 'opener', rating: 112, valRating: 3200 },
      { id: 'p_w0nderful', nickname: 'w0nderful', role: 'sniper', rating: 118, valRating: 3500 },
      { id: 'p_jl', nickname: 'jL', role: 'lurker', rating: 117, valRating: 3480 },
    ]
  },
  {
    id: 't1_vitality',
    name: 'Team Vitality',
    tag: 'VIT',
    budget: 1600000,
    isT1Preset: true,
    synergy: 99,
    players: [
      { id: 'p_apex', nickname: 'apEX', role: 'captain', rating: 106, valRating: 3050 },
      { id: 'p_zywoo', nickname: 'ZywOo', role: 'sniper', rating: 126, valRating: 3950 },
      { id: 'p_spinx', nickname: 'Spinx', role: 'rifler', rating: 116, valRating: 3420 },
      { id: 'p_flamez', nickname: 'flameZ', role: 'opener', rating: 114, valRating: 3350 },
      { id: 'p_mezii', nickname: 'mezii', role: 'support', rating: 109, valRating: 3150 },
    ]
  },
  {
    id: 't1_faze',
    name: 'FaZe Clan',
    tag: 'FaZe',
    budget: 1350000,
    isT1Preset: true,
    synergy: 97,
    players: [
      { id: 'p_karrigan', nickname: 'karrigan', role: 'captain', rating: 105, valRating: 3000 },
      { id: 'p_rain', nickname: 'rain', role: 'opener', rating: 113, valRating: 3300 },
      { id: 'p_frozen', nickname: 'frozen', role: 'rifler', rating: 117, valRating: 3490 },
      { id: 'p_broky', nickname: 'broky', role: 'sniper', rating: 118, valRating: 3520 },
      { id: 'p_ropz', nickname: 'ropz', role: 'lurker', rating: 120, valRating: 3650 },
    ]
  },
  {
    id: 't1_spirit',
    name: 'Team Spirit',
    tag: 'Spirit',
    budget: 1500000,
    isT1Preset: true,
    synergy: 98,
    players: [
      { id: 'p_chopper', nickname: 'chopper', role: 'captain', rating: 107, valRating: 3080 },
      { id: 'p_donk', nickname: 'donk', role: 'opener', rating: 128, valRating: 4100 },
      { id: 'p_sh1ro', nickname: 'sh1ro', role: 'sniper', rating: 123, valRating: 3850 },
      { id: 'p_magixx', nickname: 'magixx', role: 'support', rating: 108, valRating: 3120 },
      { id: 'p_zont1x', nickname: 'zont1x', role: 'rifler', rating: 112, valRating: 3280 },
    ]
  },
  {
    id: 't1_g2',
    name: 'G2 Esports',
    tag: 'G2',
    budget: 1750000,
    isT1Preset: true,
    synergy: 96,
    players: [
      { id: 'p_snax', nickname: 'Snax', role: 'captain', rating: 106, valRating: 3040 },
      { id: 'p_niko', nickname: 'NiKo', role: 'rifler', rating: 122, valRating: 3800 },
      { id: 'p_monesy', nickname: 'm0NESY', role: 'sniper', rating: 126, valRating: 3990 },
      { id: 'p_malbsmd', nickname: 'malbsMd', role: 'opener', rating: 117, valRating: 3460 },
      { id: 'p_hunter', nickname: 'huNter-', role: 'rifler', rating: 113, valRating: 3300 },
    ]
  },
  {
    id: 't1_mouz',
    name: 'MOUZ',
    tag: 'MOUZ',
    budget: 1100000,
    isT1Preset: true,
    synergy: 97,
    players: [
      { id: 'p_siuhy', nickname: 'siuhy', role: 'captain', rating: 110, valRating: 3180 },
      { id: 'p_torzsi', nickname: 'torzsi', role: 'sniper', rating: 116, valRating: 3440 },
      { id: 'p_xertion', nickname: 'xertioN', role: 'opener', rating: 115, valRating: 3410 },
      { id: 'p_brollan', nickname: 'Brollan', role: 'rifler', rating: 114, valRating: 3380 },
      { id: 'p_jimpphat', nickname: 'Jimpphat', role: 'lurker', rating: 118, valRating: 3550 },
    ]
  },
  {
    id: 't1_virtus_pro',
    name: 'Virtus.pro',
    tag: 'VP',
    budget: 1250000,
    isT1Preset: true,
    synergy: 97,
    players: [
      { id: 'p_jame', nickname: 'Jame', role: 'sniper', rating: 116, valRating: 3480 },
      { id: 'p_fl1t', nickname: 'FL1T', role: 'rifler', rating: 115, valRating: 3420 },
      { id: 'p_fame', nickname: 'fame', role: 'opener', rating: 113, valRating: 3320 },
      { id: 'p_electronic', nickname: 'electroNic', role: 'rifler', rating: 118, valRating: 3580 },
      { id: 'p_norbert', nickname: 'n0rb3r7', role: 'support', rating: 110, valRating: 3190 },
    ]
  },
  {
    id: 't1_falcons',
    name: 'Team Falcons',
    tag: 'Falcons',
    budget: 3200000, // Super rich billionaire club
    isT1Preset: true,
    synergy: 94,
    players: [
      { id: 'p_snappi', nickname: 'Snappi', role: 'captain', rating: 105, valRating: 3000 },
      { id: 'p_magisk', nickname: 'Magisk', role: 'rifler', rating: 114, valRating: 3390 },
      { id: 'p_dupreeh', nickname: 'dupreeh', role: 'opener', rating: 113, valRating: 3340 },
      { id: 'p_maden', nickname: 'Maden', role: 'rifler', rating: 110, valRating: 3200 },
      { id: 'p_sunpayus', nickname: 'SunPayus', role: 'sniper', rating: 115, valRating: 3430 },
    ]
  },
  {
    id: 't1_astralis',
    name: 'Astralis',
    tag: 'AST',
    budget: 1300000,
    isT1Preset: true,
    synergy: 96,
    players: [
      { id: 'p_device', nickname: 'device', role: 'sniper', rating: 118, valRating: 3550 },
      { id: 'p_cadian', nickname: 'cadiaN', role: 'captain', rating: 111, valRating: 3220 },
      { id: 'p_stavn', nickname: 'stavn', role: 'rifler', rating: 115, valRating: 3430 },
      { id: 'p_jabbi', nickname: 'jabbi', role: 'opener', rating: 114, valRating: 3380 },
      { id: 'p_staehr', nickname: 'Staehr', role: 'rifler', rating: 110, valRating: 3210 },
    ]
  },
  {
    id: 't1_liquid',
    name: 'Team Liquid',
    tag: 'TL',
    budget: 1400000,
    isT1Preset: true,
    synergy: 95,
    players: [
      { id: 'p_twistzz', nickname: 'Twistzz', role: 'captain', rating: 117, valRating: 3520 },
      { id: 'p_naf', nickname: 'NAF', role: 'lurker', rating: 116, valRating: 3470 },
      { id: 'p_ultimate', nickname: 'ultimate', role: 'sniper', rating: 114, valRating: 3360 },
      { id: 'p_jks', nickname: 'jks', role: 'support', rating: 111, valRating: 3240 },
      { id: 'p_yekindar', nickname: 'YEKINDAR', role: 'opener', rating: 113, valRating: 3330 },
    ]
  },
  {
    id: 't1_mongolz',
    name: 'The MongolZ',
    tag: 'MongolZ',
    budget: 680000,
    isT1Preset: true,
    synergy: 98,
    players: [
      { id: 'p_bzka', nickname: 'bzkA', role: 'captain', rating: 107, valRating: 3080 },
      { id: 'p_senzu', nickname: 'Senzu', role: 'opener', rating: 116, valRating: 3450 },
      { id: 'p_mzinho', nickname: 'mzinho', role: 'rifler', rating: 114, valRating: 3360 },
      { id: 'p_910', nickname: '910', role: 'sniper', rating: 117, valRating: 3510 },
      { id: 'p_techno', nickname: 'Techno', role: 'support', rating: 110, valRating: 3200 },
    ]
  },
  {
    id: 't1_eternal_fire',
    name: 'Eternal Fire',
    tag: 'EF',
    budget: 780000,
    isT1Preset: true,
    synergy: 97,
    players: [
      { id: 'p_maj3r', nickname: 'MAJ3R', role: 'captain', rating: 106, valRating: 3030 },
      { id: 'p_xantares', nickname: 'XANTARES', role: 'rifler', rating: 122, valRating: 3820 },
      { id: 'p_woxic', nickname: 'woxic', role: 'sniper', rating: 116, valRating: 3460 },
      { id: 'p_calyx', nickname: 'Calyx', role: 'support', rating: 111, valRating: 3230 },
      { id: 'p_wicadia', nickname: 'Wicadia', role: 'opener', rating: 114, valRating: 3370 },
    ]
  },
  {
    id: 't1_complexity',
    name: 'Complexity',
    tag: 'COL',
    budget: 850000,
    isT1Preset: true,
    synergy: 95,
    players: [
      { id: 'p_jt', nickname: 'JT', role: 'captain', rating: 107, valRating: 3070 },
      { id: 'p_elige', nickname: 'EliGE', role: 'opener', rating: 120, valRating: 3710 },
      { id: 'p_hallzerk', nickname: 'hallzerk', role: 'sniper', rating: 113, valRating: 3340 },
      { id: 'p_floppy', nickname: 'floppy', role: 'rifler', rating: 111, valRating: 3230 },
      { id: 'p_grim', nickname: 'Grim', role: 'rifler', rating: 112, valRating: 3280 },
    ]
  },
  {
    id: 't1_heroic',
    name: 'HEROIC',
    tag: 'HEROIC',
    budget: 920000,
    isT1Preset: true,
    synergy: 96,
    players: [
      { id: 'p_kyxsan', nickname: 'kyxsan', role: 'captain', rating: 107, valRating: 3080 },
      { id: 'p_degster', nickname: 'degster', role: 'sniper', rating: 117, valRating: 3510 },
      { id: 'p_nertz', nickname: 'NertZ', role: 'rifler', rating: 116, valRating: 3450 },
      { id: 'p_teses', nickname: 'TeSeS', role: 'support', rating: 112, valRating: 3280 },
      { id: 'p_sjuush', nickname: 'sjuush', role: 'rifler', rating: 111, valRating: 3240 },
    ]
  },
  {
    id: 't1_cloud9',
    name: 'Cloud9',
    tag: 'C9',
    budget: 1150000,
    isT1Preset: true,
    synergy: 95,
    players: [
      { id: 'p_boombl4', nickname: 'Boombl4', role: 'captain', rating: 109, valRating: 3150 },
      { id: 'p_ax1le', nickname: 'Ax1Le', role: 'rifler', rating: 116, valRating: 3450 },
      { id: 'p_heavygod', nickname: 'HeavyGod', role: 'opener', rating: 114, valRating: 3360 },
      { id: 'p_icy', nickname: 'ICY', role: 'sniper', rating: 112, valRating: 3280 },
      { id: 'p_interz', nickname: 'interz', role: 'support', rating: 108, valRating: 3100 },
    ]
  },
  {
    id: 't1_furia',
    name: 'FURIA',
    tag: 'FURIA',
    budget: 1050000,
    isT1Preset: true,
    synergy: 96,
    players: [
      { id: 'p_fallen', nickname: 'FalleN', role: 'captain', rating: 113, valRating: 3340 },
      { id: 'p_kscerato', nickname: 'KSCERATO', role: 'rifler', rating: 119, valRating: 3620 },
      { id: 'p_yuurih', nickname: 'yuurih', role: 'rifler', rating: 115, valRating: 3410 },
      { id: 'p_chelo', nickname: 'chelo', role: 'opener', rating: 111, valRating: 3220 },
      { id: 'p_skullz', nickname: 'skullz', role: 'support', rating: 109, valRating: 3140 },
    ]
  }
];

// Helper to get or generate a T1 team from the 372 teams in teamsList.json
export function getT1TeamByName(teamName: string): T1TeamPreset {
  const clean = (teamName || '').toLowerCase().trim();
  const found = T1_CURATED_TEAMS.find(t => 
    t.name.toLowerCase() === clean || 
    (t.tag && t.tag.toLowerCase() === clean) ||
    t.id.toLowerCase() === clean
  );
  if (found) return found;

  // Generate an authentic Tier-1 roster for any JSON team
  const hash = Math.abs(clean.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
  const baseBudget = 400000 + (hash % 120) * 10000; // $400k - $1.6M
  const teamId = `t1_json_${clean.replace(/[^a-z0-9]/g, '_')}`;

  const roles: ('captain' | 'sniper' | 'opener' | 'rifler' | 'support')[] = [
    'captain', 'sniper', 'opener', 'rifler', 'support'
  ];

  const players: T1PlayerPreset[] = roles.map((role, idx) => {
    const pRating = 108 + ((hash * (idx + 3)) % 15); // 108 - 123
    const pVal = 3000 + (pRating - 100) * 35;
    return {
      id: `${teamId}_p${idx + 1}`,
      nickname: `${teamName.substring(0, 4)}_${role.substring(0, 3).toUpperCase()}`,
      role,
      rating: pRating,
      valRating: pVal
    };
  });

  return {
    id: teamId,
    name: teamName,
    tag: teamName.substring(0, 4).toUpperCase(),
    budget: baseBudget,
    isT1Preset: true,
    synergy: 95,
    players
  };
}

// Get all available JSON teams (Curated + Full List from teamsList.json, strictly deduplicated)
export function getAllAvailableJsonTeams(): { id: string; name: string; budget: number; isCurated: boolean }[] {
  const seenKeys = new Set<string>();
  const list: { id: string; name: string; budget: number; isCurated: boolean }[] = [];

  // 1. Curated first
  T1_CURATED_TEAMS.forEach(t => {
    seenKeys.add(t.id);
    seenKeys.add(t.name.toLowerCase().replace(/[^a-z0-9]/g, ''));
    if (t.tag) seenKeys.add(t.tag.toLowerCase().replace(/[^a-z0-9]/g, ''));
    
    list.push({
      id: t.id,
      name: t.name,
      budget: t.budget,
      isCurated: true
    });
  });

  // 2. Extra teams from teamsList.json (deduplicated by normalized alphanumeric key)
  if (Array.isArray(teamsListJson)) {
    // Sort so nicer display names (with spaces or capital letters) come before raw slugs
    const sorted = [...teamsListJson].sort((a, b) => {
      const aClean = String(a || '');
      const bClean = String(b || '');
      const aScore = (aClean.includes(' ') ? 2 : 0) + (/[A-Z]/.test(aClean) ? 1 : 0);
      const bScore = (bClean.includes(' ') ? 2 : 0) + (/[A-Z]/.test(bClean) ? 1 : 0);
      return bScore - aScore;
    });

    sorted.forEach((name: string) => {
      const clean = (name || '').trim();
      if (!clean || clean.toLowerCase() === 'readme') return;
      const normalized = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!normalized) return;

      const teamId = `t1_json_${clean.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      if (seenKeys.has(normalized) || seenKeys.has(teamId)) return;

      seenKeys.add(normalized);
      seenKeys.add(teamId);

      const hash = Math.abs(clean.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
      const budget = 450000 + (hash % 100) * 10000;
      list.push({
        id: teamId,
        name: clean,
        budget,
        isCurated: false
      });
    });
  }

  return list;
}
