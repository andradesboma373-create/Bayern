export interface So2Player {
  id: string;
  nickname: string;
  teamName: string;
  role?: string;
  photoUrl?: string;
}

export interface So2Team {
  id: string;
  name: string;
  logoUrl: string;
  players: { id: string; nickname: string; role?: string; photoUrl?: string }[];
}

export interface So2Map {
  id: string;
  name: string;
  imageUrl: string;
}

export const SO2_MAPS: So2Map[] = [
  { id: 'sandstone', name: 'Sandstone', imageUrl: '/maps/so2/sandstone.webp' },
  { id: 'rust', name: 'Rust', imageUrl: '/maps/so2/rust.webp' },
  { id: 'province', name: 'Province', imageUrl: '/maps/so2/province.webp' },
  { id: 'breeze', name: 'Breeze', imageUrl: '/maps/so2/breeze.webp' },
  { id: 'dune', name: 'Dune', imageUrl: '/maps/so2/dune.webp' },
  { id: 'hanami', name: 'Hanami', imageUrl: '/maps/so2/hanami.webp' },
  { id: 'prison', name: 'Prison', imageUrl: '/maps/so2/prison.webp' },
];

export const SO2_TEAMS: So2Team[] = [
  {
    id: 'saints',
    name: 'Saints',
    logoUrl: '/logos/saints.svg',
    players: [
      { id: 'p_sai_1', nickname: 'GentemaN', role: 'Captain' },
      { id: 'p_sai_2', nickname: 'w1ne', role: 'Sniper' },
      { id: 'p_sai_3', nickname: 'lunax', role: 'Rifler' },
      { id: 'p_sai_4', nickname: 'FL4NE', role: 'Entry' },
      { id: 'p_sai_5', nickname: 'sk1ll', role: 'Support' },
    ]
  },
  {
    id: 'horizon',
    name: 'Horizon',
    logoUrl: '/logos/horizon.png',
    players: [
      { id: 'p_hzn_1', nickname: 'johan', role: 'Captain' },
      { id: 'p_hzn_2', nickname: 'erax', role: 'Sniper' },
      { id: 'p_hzn_3', nickname: 'traffer', role: 'Rifler' },
      { id: 'p_hzn_4', nickname: 'f1ash', role: 'Entry' },
      { id: 'p_hzn_5', nickname: 'k1d', role: 'Support' },
    ]
  },
  {
    id: 'necessary',
    name: 'Necessary',
    logoUrl: '/logos/necessary.svg',
    players: [
      { id: 'p_ncs_1', nickname: 'kronos', role: 'Captain' },
      { id: 'p_ncs_2', nickname: 'blitz', role: 'Sniper' },
      { id: 'p_ncs_3', nickname: 'nexus', role: 'Rifler' },
      { id: 'p_ncs_4', nickname: 'spark', role: 'Entry' },
      { id: 'p_ncs_5', nickname: 'venom', role: 'Support' },
    ]
  },
  {
    id: 'streeteight',
    name: 'StreetEight',
    logoUrl: '/logos/streeteight.svg',
    players: [
      { id: 'p_str_1', nickname: 'dexter', role: 'Captain' },
      { id: 'p_str_2', nickname: 'shadow', role: 'Sniper' },
      { id: 'p_str_3', nickname: 'ghost', role: 'Rifler' },
      { id: 'p_str_4', nickname: 'storm', role: 'Entry' },
      { id: 'p_str_5', nickname: 'frost', role: 'Support' },
    ]
  },
  {
    id: 'noobs',
    name: 'Noobs Team',
    logoUrl: '/logos/noobs.svg',
    players: [
      { id: 'p_nb_1', nickname: 'alpha', role: 'Captain' },
      { id: 'p_nb_2', nickname: 'bravo', role: 'Sniper' },
      { id: 'p_nb_3', nickname: 'charlie', role: 'Rifler' },
      { id: 'p_nb_4', nickname: 'delta', role: 'Entry' },
      { id: 'p_nb_5', nickname: 'echo', role: 'Support' },
    ]
  },
];

export function getAllSo2Players(): So2Player[] {
  const result: So2Player[] = [];
  SO2_TEAMS.forEach(team => {
    team.players.forEach(p => {
      result.push({
        id: p.id,
        nickname: p.nickname,
        teamName: team.name,
        role: p.role,
        photoUrl: p.photoUrl
      });
    });
  });
  return result;
}
