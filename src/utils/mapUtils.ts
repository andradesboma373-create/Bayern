export function getMapImageUrl(mapName: string, game: string = 'cs2'): string {
  if (!mapName) return '/maps/dust2.webp';
  const clean = mapName.trim().toLowerCase().replace(/^de_/, '');
  if (game === 'so2') {
    return `/maps/so2/${clean}.webp`;
  }
  return `/maps/cs2/${clean}.webp`;
}
