import React, { useState, useEffect } from 'react';
import { lookupBuiltinTeamLogo } from '../teamLogosMap';

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

let cachedLocalTeamsMap: Map<string, string> | null = null;
let lastCacheTime = 0;

export function prepopulateTeamLogos(teams: { id?: string; name?: string; logoUrl?: string }[]) {
  if (!Array.isArray(teams)) return;
  for (const t of teams) {
    if (t?.name && t?.logoUrl && typeof t.logoUrl === 'string' && t.logoUrl.trim() !== '') {
      const lower = t.name.trim().toLowerCase();
      logoCache.set(`all_${lower}`, t.logoUrl);
      logoCache.set(`cs2_${lower}`, t.logoUrl);
      logoCache.set(`s2_${lower}`, t.logoUrl);
      
      // Also register in local map
      if (!cachedLocalTeamsMap) cachedLocalTeamsMap = new Map();
      cachedLocalTeamsMap.set(lower, t.logoUrl);

      // Pre-warm browser image cache
      if (t.logoUrl.startsWith('http') || t.logoUrl.startsWith('data:') || t.logoUrl.startsWith('/')) {
        const img = new Image();
        img.decoding = 'async';
        img.src = t.logoUrl;
      }
    }
  }
}

function getLocalTeamLogo(lowerName: string): string | null {
  if (!lowerName) return null;

  // 1. Direct logo_ cache key in localStorage
  try {
    const directLogo = localStorage.getItem(`logo_${lowerName}`) || localStorage.getItem(`team_logo_${lowerName}`);
    if (directLogo && typeof directLogo === 'string' && directLogo.trim() !== '') {
      return directLogo;
    }
  } catch (e) {}

  // 2. Scan teams_ and tournaments_ from localStorage with 10s caching
  if (!cachedLocalTeamsMap || Date.now() - lastCacheTime > 10000) {
    const map = new Map<string, string>();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('teams_') || key.startsWith('tournaments_'))) {
          try {
            const parsed = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(parsed)) {
              for (const item of parsed) {
                // Team object
                if (item?.name && item?.logoUrl && typeof item.logoUrl === 'string' && item.logoUrl.trim() !== '') {
                  map.set(item.name.trim().toLowerCase(), item.logoUrl);
                }
                // Tournament object with teams array
                if (Array.isArray(item?.teams)) {
                  for (const t of item.teams) {
                    if (t?.name && t?.logoUrl && typeof t.logoUrl === 'string' && t.logoUrl.trim() !== '') {
                      map.set(t.name.trim().toLowerCase(), t.logoUrl);
                    }
                  }
                }
              }
            }
          } catch(e) {}
        }
      }
    } catch (e) {}
    cachedLocalTeamsMap = map;
    lastCacheTime = Date.now();
  }
  return cachedLocalTeamsMap.get(lowerName) || null;
}

// Resolves team logo through fast O(1) in-memory lookups
function resolveTeamLogo(
  cleanName: string, 
  lowerName: string, 
  game?: 'cs2' | 's2', 
  explicitLogoUrl?: string
): Promise<string | null> {
  if (explicitLogoUrl && typeof explicitLogoUrl === 'string' && explicitLogoUrl.trim() !== '') {
    return Promise.resolve(explicitLogoUrl);
  }
  if (!cleanName) {
    return Promise.resolve(null);
  }

  const cacheKey = `${game || 'all'}_${lowerName}`;
  if (logoCache.has(cacheKey)) {
    return Promise.resolve(logoCache.get(cacheKey) || null);
  }

  // 1. Built-in instant professional esports logo map
  const builtin = lookupBuiltinTeamLogo(cleanName);
  if (builtin) {
    logoCache.set(cacheKey, builtin);
    return Promise.resolve(builtin);
  }

  // 2. Check local saved teams
  const localLogo = getLocalTeamLogo(lowerName);
  if (localLogo) {
    logoCache.set(cacheKey, localLogo);
    return Promise.resolve(localLogo);
  }

  // 3. Check for exact file matches in candidates
  if (pendingLogoPromises.has(cacheKey)) {
    return pendingLogoPromises.get(cacheKey)!;
  }

  const promise = new Promise<string | null>((resolve) => {
    const underscoreName = lowerName.replace(/\s+/g, '_');
    const hyphenName = lowerName.replace(/\s+/g, '-');
    const noSpacesName = lowerName.replace(/[^a-z0-9]/g, '');

    const candidates: string[] = [];
    const nameVariations = Array.from(new Set([lowerName, underscoreName, hyphenName, noSpacesName]));

    for (const name of nameVariations) {
      candidates.push(`/logos/${name}.svg`);
      candidates.push(`/logos/${name}.png`);
      candidates.push(`/logos/${name}.webp`);
      candidates.push(`/optimized/${name}.webp`);
    }

    const tryCandidate = (index: number) => {
      if (index >= candidates.length) {
        logoCache.set(cacheKey, null);
        pendingLogoPromises.delete(cacheKey);
        resolve(null);
        return;
      }

      const url = candidates[index];
      const img = new Image();
      img.onload = () => {
        logoCache.set(cacheKey, url);
        pendingLogoPromises.delete(cacheKey);
        resolve(url);
      };
      img.onerror = () => {
        tryCandidate(index + 1);
      };
      img.src = url;
    };

    tryCandidate(0);
  });

  pendingLogoPromises.set(cacheKey, promise);
  return promise;
}

function getTeamInitials(name: string): string {
  if (!name) return '?';
  const clean = name.trim();
  const words = clean.split(/[\s\-_.]+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (clean.length <= 3) {
    return clean.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function getTeamBadgePalette(name: string): { bg: string; border: string; text: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const palettes = [
    { bg: 'bg-gradient-to-br from-amber-500/20 to-orange-600/30', border: 'border-amber-500/40', text: 'text-amber-300' },
    { bg: 'bg-gradient-to-br from-blue-500/20 to-indigo-600/30', border: 'border-blue-500/40', text: 'text-blue-300' },
    { bg: 'bg-gradient-to-br from-emerald-500/20 to-teal-600/30', border: 'border-emerald-500/40', text: 'text-emerald-300' },
    { bg: 'bg-gradient-to-br from-purple-500/20 to-pink-600/30', border: 'border-purple-500/40', text: 'text-purple-300' },
    { bg: 'bg-gradient-to-br from-rose-500/20 to-red-600/30', border: 'border-rose-500/40', text: 'text-rose-300' },
    { bg: 'bg-gradient-to-br from-cyan-500/20 to-blue-600/30', border: 'border-cyan-500/40', text: 'text-cyan-300' }
  ];
  const idx = Math.abs(hash) % palettes.length;
  return palettes[idx];
}

export function TeamLogo({ 
  teamName, 
  sizeClassName, 
  textClassName, 
  size = 'md', 
  className = '', 
  style,
  logoUrl,
  game
}: TeamLogoProps) {
  const cleanName = teamName ? teamName.trim() : "";
  const lowerName = cleanName.toLowerCase();
  const cacheKey = `${game || 'all'}_${lowerName}`;

  // Instant synchronous resolution if logoUrl is provided or already in memory or in builtin map
  const builtin = cleanName ? lookupBuiltinTeamLogo(cleanName) : null;
  const initialLogo = (logoUrl && typeof logoUrl === 'string' && logoUrl.trim() !== '') 
    ? logoUrl 
    : (cleanName ? (logoCache.get(cacheKey) ?? builtin ?? getLocalTeamLogo(lowerName)) : null) || null;

  if (initialLogo && !logoCache.has(cacheKey)) {
    logoCache.set(cacheKey, initialLogo);
  }

  const [resolvedLogo, setResolvedLogo] = useState<string | null>(initialLogo);
  const [isSearching, setIsSearching] = useState<boolean>(!initialLogo && !!cleanName && !logoCache.has(cacheKey));

  useEffect(() => {
    let active = true;

    if (!cleanName) {
      setResolvedLogo(null);
      setIsSearching(false);
      return;
    }

    if (logoUrl && typeof logoUrl === 'string' && logoUrl.trim() !== '') {
      setResolvedLogo(logoUrl);
      setIsSearching(false);
      return;
    }

    if (logoCache.has(cacheKey)) {
      setResolvedLogo(logoCache.get(cacheKey) || null);
      setIsSearching(false);
      return;
    }

    // Fast check builtin
    const bi = lookupBuiltinTeamLogo(cleanName);
    if (bi) {
      logoCache.set(cacheKey, bi);
      setResolvedLogo(bi);
      setIsSearching(false);
      return;
    }

    // Fast check local
    const local = getLocalTeamLogo(lowerName);
    if (local) {
      logoCache.set(cacheKey, local);
      setResolvedLogo(local);
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
  }, [teamName, logoUrl, lowerName, game, cacheKey, cleanName]);

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

  // Если логотип еще ищется или не найден, показываем стильный киберспортивный бейдж с инициалами команды
  if (isSearching || !resolvedLogo) {
    const initials = getTeamInitials(teamName);
    const palette = getTeamBadgePalette(teamName || "team");
    return (
      <div 
        className={`${dimensions} flex items-center justify-center shrink-0 select-none font-black text-center ${palette.bg} border ${palette.border} shadow-sm backdrop-blur-xs ${className}`} 
        style={style}
        title={teamName}
      >
        <span className={textClassName || `${palette.text} tracking-tight`}>{initials}</span>
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
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => {
          logoCache.set(cacheKey, null);
          setResolvedLogo(null);
        }}
        className="w-full h-full object-contain drop-shadow-sm"
      />
    </div>
  );
}

export default TeamLogo;
