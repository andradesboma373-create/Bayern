export interface Weapon {
  id: string;
  name: string;
  type: 'PISTOL' | 'SMG' | 'RIFLE' | 'SNIPER' | 'SHOTGUN' | 'KNIFE';
  price: number;
  damage: number;
  headshotMultiplier: number;
  armorPenetration: number;
  fireRate: number; // bullets per second
  accuracy: number; // 0-100
  range: number;
}

export const WEAPONS: Record<string, Weapon> = {
  knife: { id: 'knife', name: 'Knife', type: 'KNIFE', price: 0, damage: 40, headshotMultiplier: 1, armorPenetration: 0.8, fireRate: 1.5, accuracy: 100, range: 2 },
  usp: { id: 'usp', name: 'USP-S', type: 'PISTOL', price: 0, damage: 35, headshotMultiplier: 4, armorPenetration: 0.5, fireRate: 6, accuracy: 85, range: 40 },
  glock: { id: 'glock', name: 'Glock-18', type: 'PISTOL', price: 0, damage: 30, headshotMultiplier: 4, armorPenetration: 0.47, fireRate: 6.6, accuracy: 75, range: 30 },
  p250: { id: 'p250', name: 'P250', type: 'PISTOL', price: 300, damage: 38, headshotMultiplier: 4, armorPenetration: 0.64, fireRate: 6.6, accuracy: 75, range: 35 },
  deagle: { id: 'deagle', name: 'Desert Eagle', type: 'PISTOL', price: 700, damage: 53, headshotMultiplier: 3.5, armorPenetration: 0.93, fireRate: 4.4, accuracy: 80, range: 50 },
  mac10: { id: 'mac10', name: 'MAC-10', type: 'SMG', price: 1050, damage: 29, headshotMultiplier: 4, armorPenetration: 0.57, fireRate: 13, accuracy: 65, range: 25 },
  mp9: { id: 'mp9', name: 'MP9', type: 'SMG', price: 1250, damage: 26, headshotMultiplier: 4, armorPenetration: 0.6, fireRate: 14, accuracy: 70, range: 30 },
  galil: { id: 'galil', name: 'Galil AR', type: 'RIFLE', price: 1800, damage: 30, headshotMultiplier: 4, armorPenetration: 0.77, fireRate: 11, accuracy: 80, range: 60 },
  famas: { id: 'famas', name: 'FAMAS', type: 'RIFLE', price: 2050, damage: 30, headshotMultiplier: 4, armorPenetration: 0.7, fireRate: 11, accuracy: 82, range: 60 },
  ak47: { id: 'ak47', name: 'AK-47', type: 'RIFLE', price: 2700, damage: 36, headshotMultiplier: 4, armorPenetration: 0.77, fireRate: 10, accuracy: 88, range: 80 },
  m4a4: { id: 'm4a4', name: 'M4A4', type: 'RIFLE', price: 3100, damage: 33, headshotMultiplier: 4, armorPenetration: 0.7, fireRate: 11, accuracy: 88, range: 80 },
  m4a1s: { id: 'm4a1s', name: 'M4A1-S', type: 'RIFLE', price: 2900, damage: 38, headshotMultiplier: 4, armorPenetration: 0.7, fireRate: 10, accuracy: 90, range: 80 },
  awp: { id: 'awp', name: 'AWP', type: 'SNIPER', price: 4750, damage: 115, headshotMultiplier: 4, armorPenetration: 0.97, fireRate: 0.6, accuracy: 99, range: 150 },
};

export const EQUIPMENT_PRICES = {
  kevlar: 650,
  helmet: 350, // if already have kevlar
  fullArmor: 1000,
  defuseKit: 400,
  flash: 200,
  smoke: 300,
  he: 300,
  molotov: 400
};
