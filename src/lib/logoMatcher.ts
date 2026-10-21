const LOGO_MAP: Record<string, string> = {
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
};

function generateInitialsLogo(teamName: string): string {
  const clean = teamName.trim();
  const initials = clean
    .split(/\s+/)
    .map(w => w.charAt(0))
    .join('')
    .substring(0, 3)
    .toUpperCase() || '?';

  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const color1 = `hsl(${hue}, 85%, 48%)`;
  const color2 = `hsl(${(hue + 45) % 360}, 90%, 25%)`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color1}"/>
        <stop offset="100%" stop-color="${color2}"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="24" ry="24" fill="url(#grad)" stroke="rgba(255,255,255,0.25)" stroke-width="3"/>
    <text x="50" y="52" dominant-baseline="central" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${initials.length > 2 ? '30' : '38'}" font-weight="900" fill="#ffffff" letter-spacing="1">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getAutoMatchedVectorLogo(teamName: string): string {
  if (!teamName) return generateInitialsLogo('TBD');
  const raw = teamName.trim();
  const normalized = raw.toLowerCase();
  
  if (LOGO_MAP[normalized]) {
    return LOGO_MAP[normalized];
  }

  // Try stripping common suffixes
  const stripped = normalized
    .replace(/\s+(esports|team|gaming|club|gg|hq)$/g, '')
    .trim();
  
  if (LOGO_MAP[stripped]) {
    return LOGO_MAP[stripped];
  }

  // Try removing dots, dashes and spaces
  const compact = stripped.replace(/[\s._-]/g, '');
  for (const [key, val] of Object.entries(LOGO_MAP)) {
    if (key.replace(/[\s._-]/g, '') === compact) {
      return val;
    }
  }

  // Fallback to generated high-quality initials badge so no team ever lacks a logo
  return generateInitialsLogo(raw);
}
