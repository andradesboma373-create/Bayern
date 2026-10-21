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
};

export function getAutoMatchedVectorLogo(teamName: string): string | null {
  if (!teamName) return null;
  const normalized = teamName.trim().toLowerCase();
  if (LOGO_MAP[normalized]) {
    return LOGO_MAP[normalized];
  }
  return `/api/logo/${encodeURIComponent(normalized)}`;
}
