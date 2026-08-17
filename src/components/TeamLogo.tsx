import React, { useState, useEffect } from 'react';

export interface TeamLogoProps {
  game?: 'cs2' | 's2';
  teamName: string;
  sizeClassName?: string; // например "w-12 h-12 text-xl"
  textClassName?: string; // для текста заглушки
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  style?: React.CSSProperties;
  logoUrl?: string; // Прямая ссылка или Base64 строка
}

// In-memory global caches to avoid redundant requests and prevent localStorage quota bloat
const logoCache = new Map<string, string | null>();
const pendingLogoPromises = new Map<string, Promise<string | null>>();

let cachedLocalTeams: any[] | null = null;
let lastCacheTime = 0;

function getLocalTeams(): any[] {
  if (cachedLocalTeams && Date.now() - lastCacheTime < 10000) {
     return cachedLocalTeams;
  }
  const allTeams: any[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
       const key = localStorage.key(i);
       if (key && key.startsWith('teams_')) {
         try {
           const teams = JSON.parse(localStorage.getItem(key) || '[]');
           if (Array.isArray(teams)) {
              allTeams.push(...teams);
           }
         } catch(e) {}
       }
    }
  } catch (e) {}
  cachedLocalTeams = allTeams;
  lastCacheTime = Date.now();
  return allTeams;
}

// Resolves team logo through fast in-memory candidate checks and image probing
function resolveTeamLogo(
  cleanName: string, 
  lowerName: string, 
  game?: 'cs2' | 's2', 
  explicitLogoUrl?: string
): Promise<string | null> {
  if (explicitLogoUrl) {
    return Promise.resolve(explicitLogoUrl);
  }
  if (!cleanName) {
    return Promise.resolve(null);
  }

  const cacheKey = `${game || 'all'}_${lowerName}`;
  if (logoCache.has(cacheKey)) {
    return Promise.resolve(logoCache.get(cacheKey) || null);
  }
  if (pendingLogoPromises.has(cacheKey)) {
    return pendingLogoPromises.get(cacheKey)!;
  }

  const promise = new Promise<string | null>((resolve) => {
    const underscoreName = lowerName.replace(/\s+/g, '_');
    const hyphenName = lowerName.replace(/\s+/g, '-');
    const noSpacesName = lowerName.replace(/\s+/g, '');

    const candidates: string[] = [];

    // 1. Check local saved teams
    const localTeams = getLocalTeams();
    const found = localTeams.find((t: any) => t.name && t.name.trim().toLowerCase() === lowerName);
    if (found && found.logoUrl && !candidates.includes(found.logoUrl)) {
      candidates.push(found.logoUrl);
    }

    // 2. Optimized webp
    const nameVariations = [lowerName, underscoreName, hyphenName, noSpacesName];
    for (const name of nameVariations) {
      candidates.push(`/optimized/${name}.webp`);
    }

    // 3. Static assets
    const extensions = ['png', 'jpg', 'svg', 'webp'];
    for (const ext of extensions) {
      for (const name of nameVariations) {
        if (game === 's2') {
          candidates.push(`/logos2/${name}.${ext}`);
        } else if (game === 'cs2') {
          candidates.push(`/logos/${name}.${ext}`);
        } else {
          candidates.push(`/logos/${name}.${ext}`);
          candidates.push(`/logos2/${name}.${ext}`);
        }
      }
    }

    const tryCandidate = (index: number) => {
      if (index >= candidates.length) {
        logoCache.set(cacheKey, null);
        pendingLogoPromises.delete(cacheKey);
        resolve(null);
        return;
      }

      const url = candidates[index];
      // Data URLs or direct full URLs from custom teams don't need image preloading
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        logoCache.set(cacheKey, url);
        pendingLogoPromises.delete(cacheKey);
        resolve(url);
        return;
      }

      const img = new Image();
      img.src = url;
      img.onload = () => {
        logoCache.set(cacheKey, url);
        pendingLogoPromises.delete(cacheKey);
        resolve(url);
      };
      img.onerror = () => {
        tryCandidate(index + 1);
      };
    };

    tryCandidate(0);
  });

  pendingLogoPromises.set(cacheKey, promise);
  return promise;
}

export function TeamLogo({ 
  teamName, 
  sizeClassName, 
  textClassName = "font-black text-white", 
  size = 'md', 
  className = '', 
  style,
  logoUrl,
  game
}: TeamLogoProps) {
  const cleanName = teamName ? teamName.trim() : "";
  const lowerName = cleanName.toLowerCase();
  const cacheKey = `${game || 'all'}_${lowerName}`;

  const initialLogo = logoUrl || (cleanName ? logoCache.get(cacheKey) : null) || null;
  const [resolvedLogo, setResolvedLogo] = useState<string | null>(initialLogo);
  const [isSearching, setIsSearching] = useState<boolean>(!initialLogo && !!cleanName);

  useEffect(() => {
    let active = true;

    if (!cleanName) {
      setResolvedLogo(null);
      setIsSearching(false);
      return;
    }

    if (logoUrl) {
      setResolvedLogo(logoUrl);
      setIsSearching(false);
      return;
    }

    if (logoCache.has(cacheKey)) {
      setResolvedLogo(logoCache.get(cacheKey) || null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    resolveTeamLogo(cleanName, lowerName, game, logoUrl).then((url) => {
      if (!active) return;
      setResolvedLogo(url);
      setIsSearching(false);
    });

    return () => {
      active = false;
    };
  }, [teamName, logoUrl, lowerName, game, cacheKey]);

  const getDimensionClass = () => {
    if (sizeClassName) return sizeClassName;
    switch (size) {
      case 'xs': return 'w-5 h-5 text-[10px] rounded-md';
      case 'sm': return 'w-6 h-6 text-xs rounded-md';
      case 'md': return 'w-8 h-8 text-sm rounded-lg';
      case 'lg': return 'w-12 h-12 text-base rounded-xl';
      case 'xl': return 'w-14 h-14 text-xl rounded-2xl';
      default: return 'w-8 h-8 text-sm rounded-lg';
    }
  };

  const dimensions = getDimensionClass();

  // Если логотип еще ищется или не найден, показываем аккуратную текстовую заглушку в виде простого вопросика
  if (isSearching || !resolvedLogo) {
    return (
      <div 
        className={`${dimensions} flex items-center justify-center shrink-0 select-none font-black text-center text-white/50 bg-transparent border-0 ${className}`} 
        style={style}
        title={teamName}
      >
        <span>?</span>
      </div>
    );
  }

  return (
    <div 
      className={`${dimensions} flex items-center justify-center shrink-0 overflow-hidden relative ${className}`}
      style={{ ...style, backgroundColor: 'transparent' }}
      title={teamName}
    >
      <img
        src={resolvedLogo}
        alt={teamName}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => {
          logoCache.set(cacheKey, null);
          setResolvedLogo(null);
        }}
        className="w-full h-full object-contain"
      />
    </div>
  );
}

export default TeamLogo;
