const preloadedCache = new Set<string>();

export function isImagePreloaded(url: string): boolean {
  if (!url) return false;
  return preloadedCache.has(url);
}

export function preloadImage(url: string): Promise<boolean> {
  return new Promise(resolve => {
    if (!url) {
      resolve(false);
      return;
    }
    if (preloadedCache.has(url)) {
      resolve(true);
      return;
    }
    const img = new Image();
    img.onload = () => {
      preloadedCache.add(url);
      resolve(true);
    };
    img.onerror = () => {
      resolve(false);
    };
    img.src = url;
  });
}

export function concentrateOnTournament(tournament: any, _userId?: string): void {
  if (!tournament) return;
  const bg = tournament.settings?.bgImage;
  if (bg) {
    preloadImage(bg);
  }
  if (tournament.logoUrl) {
    preloadImage(tournament.logoUrl);
  }
  if (Array.isArray(tournament.teams)) {
    tournament.teams.forEach((t: any) => {
      if (t?.logoUrl) preloadImage(t.logoUrl);
    });
  }
}
