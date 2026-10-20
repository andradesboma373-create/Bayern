/**
 * Helper to resolve map background images across CS2 and SO2
 * Guaranteed to work both in local development, server environment,
 * and on static hosting (Vercel, Netlify).
 */
export function getMapImageUrl(mapName?: string, game?: string): string {
  if (!mapName) return '/maps/mirage.webp';
  
  let clean = mapName.toLowerCase().trim();
  // Strip common map prefixes like de_ or cs_
  clean = clean.replace(/^(de_|cs_)/i, '');
  // Map legacy names
  if (clean.includes('sakura')) clean = 'hanami';
  // Strip non-alphanumeric
  clean = clean.replace(/[^a-z0-9]/g, '');

  if (!clean) return '/maps/mirage.webp';

  // In /public/maps we have all maps as .webp both in root and in subfolders
  return `/maps/${clean}.webp`;
}
