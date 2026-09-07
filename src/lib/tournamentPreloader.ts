import { Tournament, Team } from '../components/setka_tourn/types';
import { getTournamentBgImage } from '../components/setka_tourn/storage';
import { prepopulateTeamLogos } from '../components/TeamLogo';

// In-memory cache of preloaded image URLs to ensure instant synchronous display
const loadedImageUrls = new Set<string>();
const activePreloadPromises = new Map<string, Promise<boolean>>();

/**
 * Preloads an image URL into browser cache and memory
 */
export function preloadImage(url: string | null | undefined): Promise<boolean> {
  if (!url || typeof url !== 'string' || url.trim() === '' || url === 'null' || url === 'undefined') {
    return Promise.resolve(false);
  }

  const cleanUrl = url.trim();
  if (loadedImageUrls.has(cleanUrl)) {
    return Promise.resolve(true);
  }

  if (activePreloadPromises.has(cleanUrl)) {
    return activePreloadPromises.get(cleanUrl)!;
  }

  const promise = new Promise<boolean>((resolve) => {
    // Data URLs and blob URLs are already local and immediately accessible
    if (cleanUrl.startsWith('data:') || cleanUrl.startsWith('blob:')) {
      loadedImageUrls.add(cleanUrl);
      resolve(true);
      return;
    }

    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      loadedImageUrls.add(cleanUrl);
      activePreloadPromises.delete(cleanUrl);
      resolve(true);
    };
    img.onerror = () => {
      activePreloadPromises.delete(cleanUrl);
      resolve(false);
    };
    img.src = cleanUrl;
  });

  activePreloadPromises.set(cleanUrl, promise);
  return promise;
}

/**
 * Checks synchronously if an image URL is already in memory cache
 */
export function isImagePreloaded(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const cleanUrl = url.trim();
  return loadedImageUrls.has(cleanUrl) || cleanUrl.startsWith('data:') || cleanUrl.startsWith('blob:');
}

/**
 * Focuses all resource preloading and memory caching on a single tournament object:
 * - High-priority background image preloading
 * - Tournament logo preloading
 * - All participating team logos pre-registration and preloading
 * - Scanning all bracket and group stages to ensure every match team logo is ready in 0ms
 */
export function concentrateOnTournament(tournament: Tournament | null | undefined, userId?: string): Promise<void> {
  if (!tournament) return Promise.resolve();

  const promises: Promise<any>[] = [];

  // 1. Resolve & Preload Background Image (Priority #1)
  const isolatedBg = getTournamentBgImage(tournament.id);
  const rawBg = isolatedBg || tournament.settings?.bgImage;
  const bgImage = (rawBg && rawBg !== 'null' && rawBg !== 'undefined' && String(rawBg).trim() !== '') ? rawBg : null;
  if (bgImage) {
    promises.push(preloadImage(bgImage));
  }

  // 2. Preload Tournament Logo (Priority #1)
  if (tournament.logoUrl) {
    promises.push(preloadImage(tournament.logoUrl));
  }

  // 3. Preload all participating teams and register in TeamLogo cache
  const collectedTeams: Team[] = [];
  if (Array.isArray(tournament.teams)) {
    collectedTeams.push(...tournament.teams);
  }

  // Helper to extract teams from matches
  const extractMatchTeams = (matches: any[]) => {
    if (!Array.isArray(matches)) return;
    for (const m of matches) {
      if (m?.team1 && m.team1.name && !collectedTeams.some(t => t.id === m.team1.id)) {
        collectedTeams.push(m.team1);
      }
      if (m?.team2 && m.team2.name && !collectedTeams.some(t => t.id === m.team2.id)) {
        collectedTeams.push(m.team2);
      }
    }
  };

  // Extract from Single / Double Elim bracket rounds
  if (Array.isArray(tournament.bracketRounds)) {
    tournament.bracketRounds.forEach(extractMatchTeams);
  }
  if (Array.isArray(tournament.losersBracketRounds)) {
    tournament.losersBracketRounds.forEach(extractMatchTeams);
  }
  if (Array.isArray(tournament.tieredBracketRounds)) {
    tournament.tieredBracketRounds.forEach(extractMatchTeams);
  }

  // Extract from Groups
  if (Array.isArray(tournament.groups)) {
    for (const g of tournament.groups) {
      if (Array.isArray(g.teams)) {
        for (const t of g.teams) {
          if (t && !collectedTeams.some(ct => ct.id === t.id)) collectedTeams.push(t);
        }
      }
      if (Array.isArray(g.matches)) extractMatchTeams(g.matches);
    }
  }

  // Extract from GSL Groups
  if (Array.isArray(tournament.gslGroups)) {
    for (const g of tournament.gslGroups) {
      if (Array.isArray(g.teams)) {
        for (const t of g.teams) {
          if (t && !collectedTeams.some(ct => ct.id === t.id)) collectedTeams.push(t);
        }
      }
      if (Array.isArray(g.upperBracket)) g.upperBracket.forEach(extractMatchTeams);
      if (Array.isArray(g.lowerBracket)) g.lowerBracket.forEach(extractMatchTeams);
    }
  }

  // Extract from Swiss rounds (Match[][])
  if (Array.isArray(tournament.swissRounds)) {
    tournament.swissRounds.forEach((matches) => extractMatchTeams(matches));
  }

  // Prepopulate in-memory logo cache for instantaneous O(1) sync access
  prepopulateTeamLogos();

  // Preload team logo URLs into browser image cache
  for (const team of collectedTeams) {
    if (team.logoUrl) {
      promises.push(preloadImage(team.logoUrl));
    }
  }

  return Promise.all(promises).then(() => {});
}
