const LOGO_MAP: Record<string, string> = {
  // CS2 / General
  'natus vincere': '/logos/natus vincere.svg',
  'navi': '/logos/natus vincere.svg',
  'faze': '/logos/faze.webp',
  'faze clan': '/logos/faze.webp',
  'vitality': '/logos/vitality.webp',
  'team vitality': '/logos/vitality.webp',
  'g2': '/logos/g2.webp',
  'g2 esports': '/logos/g2.webp',
  'spirit': '/logos/team spirit.webp',
  'team spirit': '/logos/team spirit.webp',
  'mouz': '/logos/mouz.svg',
  'astralis': '/logos/astralis.svg',
  'virtus.pro': '/logos/virtus pro.svg',
  'virtus pro': '/logos/virtus pro.svg',
  'vp': '/logos/virtus pro.svg',
  'cloud9': '/logos/cloud9.svg',
  'c9': '/logos/cloud9.svg',
  'heroic': '/logos/heroic.webp',
  'liquid': '/logos/liquid.svg',
  'team liquid': '/logos/liquid.svg',
  'fnatic': '/logos/fnatic.svg',
  'furia': '/logos/furia.svg',
  'furia esports': '/logos/furia.svg',
  'eternal fire': '/logos/ef.webp',
  'ef': '/logos/ef.webp',
  'the mongolz': '/logos/the mongolz.webp',
  'mongolz': '/logos/the mongolz.webp',
  'complexity': '/logos/col.webp',
  'col': '/logos/col.webp',
  'big': '/logos/big.svg',
  'betboom': '/logos/betboom.webp',
  'betboom team': '/logos/betboom.webp',
  'aurora': '/logos/aurora.webp',
  'aurora gaming': '/logos/aurora.webp',
  'amkal': '/logos/amkal.svg',
  'amkal esports': '/logos/amkal.svg',
  'parivision': '/logos/parivision.webp',
  'pain': '/logos/pain.webp',
  'pain gaming': '/logos/pain.webp',
  'mibr': '/logos/mibr.webp',
  '9z': '/logos/9z.webp',
  '9z team': '/logos/9z.webp',
  '3dmax': '/logos/3dmax.webp',
  'b8': '/logos/b8.webp',
  '1win': '/logos/1win.webp',
  'nip': '/logos/nip.webp',
  'ninjas in pyjamas': '/logos/ninjas in pyjamas.webp',
  'gamerlegion': '/logos/gamerlegion.webp',
  'imperial': '/logos/imperial.webp',
  'ence': '/logos/ence.webp',
  'sashi': '/logos/sashi.webp',
  'sangal': '/logos/sanghal.webp',
  '100 thieves': '/logos/100 thieves.webp',
  '100t': '/logos/100 thieves.webp',
  'absolute': '/logos/absolute.svg',
  'acend': '/logos/acend.webp',
  'alliance': '/logos/alliance.webp',
  'alpha7': '/logos/alpha7.svg',
  'anable': '/logos/anable.svg',
  'bbl': '/logos/bbl esports.jpg',
  'bc.game': '/logos/bc game.jpg',
  'berser': '/logos/berser.svg',
  'bullet flame': '/logos/bullet flame.svg',
  'cybershoke': '/logos/cybershoke.svg',
  'cyberhero': '/logos/cyberhero.svg',
  'dplus': '/logos/dplus kia.webp',
  'eyeballers': '/logos/eyeballers.webp',
  'forze': '/logos/forze.webp',
  'heretics': '/logos/heretics.webp',
  'hotu': '/logos/hotu.webp',
  'inner circle': '/logos/inner circle.webp',
  'k27': '/logos/k27.webp',
  'legacy': '/logos/legacy.webp',
  'monte': '/logos/monte.webp',
  'nemesis': '/logos/nemesis.webp',
  'sharks': '/logos/sharks.webp',
  'falcons': '/logos/team falcons.webp',
  'team falcons': '/logos/team falcons.webp',
  'tyloo': '/logos/tyloo.svg',
  
  // Standoff 2 / Mobile
  'heavenly spirits': '/logos/heavenly spirits.svg',
  'shadow tigers': '/logos/shadow tigers.svg',
  'saints': '/logos/saints.svg',
  'horizon': '/logos/horizon.png',
  'hzn': '/logos/horizon.png',
  'rcb': '/logos/rcb.svg',
  'rgc': '/logos/rgc.svg',
  'rgg': '/logos/rgg.svg',
  'st': '/logos/ST.svg',
  'noway': '/logos/NoWay.svg',
};

export function generateInitialsLogo(teamName: string): string {
  const clean = teamName.trim();
  let initials = clean
    .split(/\s+/)
    .map(w => w.charAt(0))
    .join('')
    .substring(0, 3)
    .toUpperCase() || '?';

  if (initials === 'TBD') initials = '?';

  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const isTBD = initials === '?' || initials === 'TBD' || clean.toUpperCase() === 'TBD';
  const hue = Math.abs(hash) % 360;
  
  // Use dark neutral colors for TBD, colorful for actual teams
  const color1 = isTBD ? '#0a0a0f' : `hsl(${hue}, 85%, 48%)`;
  const color2 = isTBD ? '#12121a' : `hsl(${(hue + 45) % 360}, 90%, 25%)`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color1}"/>
        <stop offset="100%" stop-color="${color2}"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="24" ry="24" fill="url(#grad)" stroke="rgba(255,255,255,0.15)" stroke-width="3"/>
    <text x="50" y="52" dominant-baseline="central" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${initials.length > 2 ? '30' : '38'}" font-weight="900" fill="${isTBD ? 'rgba(255,255,255,0.4)' : '#ffffff'}" letter-spacing="1">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getAutoMatchedVectorLogo(teamName: string, game?: string): string | null {
  if (!teamName) return null;
  const raw = teamName.trim();
  const normalized = raw.toLowerCase();
  
  // 1. Exact match in map
  if (LOGO_MAP[normalized]) {
    return LOGO_MAP[normalized];
  }

  // 2. Try stripping common suffixes
  const stripped = normalized
    .replace(/\s+(esports|team|gaming|club|gg|hq|clan|2)$/g, '')
    .trim();
  
  if (LOGO_MAP[stripped]) {
    return LOGO_MAP[stripped];
  }

  // 3. Try fuzzy/partial match in map (only for longer names)
  if (normalized.length > 3) {
    for (const [key, val] of Object.entries(LOGO_MAP)) {
      if (key.length > 3 && (key.includes(normalized) || normalized.includes(key))) {
        return val;
      }
    }
  }

  // 4. Try removing dots, dashes and spaces
  const compact = stripped.replace(/[\s._-]/g, '');
  for (const [key, val] of Object.entries(LOGO_MAP)) {
    if (key.replace(/[\s._-]/g, '') === compact) {
      return val;
    }
  }

  // Return null to allow TeamLogo to try guessed paths or fall back to initials correctly
  return null;
}
