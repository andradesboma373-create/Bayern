import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

export interface PlayerAvatarProps {
  key?: React.Key;
  game?: 'cs2' | 's2';
  playerName: string;
  sizeClassName?: string;
  className?: string;
  style?: React.CSSProperties;
  avatarUrl?: string; // Прямая ссылка или Base64 строка
}

// In-memory global caches for player avatars
const avatarCache = new Map<string, string | null>();
const pendingAvatarPromises = new Map<string, Promise<string | null>>();

let cachedLocalPlayers: any[] | null = null;
let lastPlayersCacheTime = 0;

function getLocalPlayers(): any[] {
  if (cachedLocalPlayers && Date.now() - lastPlayersCacheTime < 10000) {
    return cachedLocalPlayers;
  }
  const allPlayers: any[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('players_')) {
        try {
          const players = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(players)) {
            allPlayers.push(...players);
          }
        } catch (e) {}
      } else if (key && key.startsWith('teams_')) {
        try {
          const teams = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(teams)) {
            teams.forEach((t: any) => {
              if (t.players && Array.isArray(t.players)) {
                allPlayers.push(...t.players);
              }
            });
          }
        } catch(e) {}
      }
    }
  } catch (e) {}
  cachedLocalPlayers = allPlayers;
  lastPlayersCacheTime = Date.now();
  return allPlayers;
}

function resolvePlayerAvatar(
  cleanName: string,
  lowerName: string,
  game?: 'cs2' | 's2',
  explicitAvatarUrl?: string
): Promise<string | null> {
  if (explicitAvatarUrl) {
    return Promise.resolve(explicitAvatarUrl);
  }
  if (!cleanName) {
    return Promise.resolve(null);
  }

  const cacheKey = `${game || 'all'}_${lowerName}`;
  if (avatarCache.has(cacheKey)) {
    return Promise.resolve(avatarCache.get(cacheKey) || null);
  }
  if (pendingAvatarPromises.has(cacheKey)) {
    return pendingAvatarPromises.get(cacheKey)!;
  }

  const promise = new Promise<string | null>((resolve) => {
    const underscoreName = lowerName.replace(/\s+/g, '_');
    const hyphenName = lowerName.replace(/\s+/g, '-');
    const noSpacesName = lowerName.replace(/\s+/g, '');
    
    const candidates: string[] = [];

    // 1. Lists of players and teams in local state
    const localPlayers = getLocalPlayers();
    const found = localPlayers.find((p: any) => p.nickname && p.nickname.trim().toLowerCase() === lowerName);
    if (found && found.avatarUrl && !candidates.includes(found.avatarUrl)) {
      candidates.push(found.avatarUrl);
    }

    // 2. Static paths in /avatars/
    const extensions = ['png', 'jpg', 'webp'];
    const nameVariations = [lowerName, underscoreName, hyphenName, noSpacesName];

    for (const ext of extensions) {
      for (const name of nameVariations) {
        if (game === 's2') {
          candidates.push(`/avatars2/${name}.${ext}`);
        } else if (game === 'cs2') {
          candidates.push(`/avatars/${name}.${ext}`);
        } else {
          candidates.push(`/avatars/${name}.${ext}`);
          candidates.push(`/avatars2/${name}.${ext}`);
        }
      }
    }

    // 3. UI-Avatars fallback candidate
    candidates.push(`https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=222338&color=ff8f00&bold=true`);

    const tryCandidate = (index: number) => {
      if (index >= candidates.length) {
        avatarCache.set(cacheKey, null);
        pendingAvatarPromises.delete(cacheKey);
        resolve(null);
        return;
      }

      const url = candidates[index];
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        avatarCache.set(cacheKey, url);
        pendingAvatarPromises.delete(cacheKey);
        resolve(url);
        return;
      }

      const img = new Image();
      img.src = url;
      img.onload = () => {
        avatarCache.set(cacheKey, url);
        pendingAvatarPromises.delete(cacheKey);
        resolve(url);
      };
      img.onerror = () => {
        tryCandidate(index + 1);
      };
    };

    tryCandidate(0);
  });

  pendingAvatarPromises.set(cacheKey, promise);
  return promise;
}

export function PlayerAvatar({ 
  playerName, 
  sizeClassName = "w-8 h-8", 
  className = '', 
  style,
  avatarUrl,
  game
}: PlayerAvatarProps) {
  const cleanName = playerName ? playerName.trim() : "";
  const lowerName = cleanName.toLowerCase();
  const cacheKey = `${game || 'all'}_${lowerName}`;

  const initialAvatar = avatarUrl || (cleanName ? avatarCache.get(cacheKey) : null) || null;
  const [resolvedAvatar, setResolvedAvatar] = useState<string | null>(initialAvatar);
  const [isSearching, setIsSearching] = useState<boolean>(!initialAvatar && !!cleanName);

  useEffect(() => {
    let active = true;

    if (!cleanName) {
      setResolvedAvatar(null);
      setIsSearching(false);
      return;
    }

    if (avatarUrl) {
      setResolvedAvatar(avatarUrl);
      setIsSearching(false);
      return;
    }

    if (avatarCache.has(cacheKey)) {
      setResolvedAvatar(avatarCache.get(cacheKey) || null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    resolvePlayerAvatar(cleanName, lowerName, game, avatarUrl).then((url) => {
      if (!active) return;
      setResolvedAvatar(url);
      setIsSearching(false);
    });

    return () => { active = false; };
  }, [playerName, avatarUrl, lowerName, game, cacheKey]);

  if (isSearching) {
    return (
      <div 
        className={`${sizeClassName} flex items-center justify-center shrink-0 select-none bg-[#1e1f32] text-[#ff8f00] font-black rounded-full border border-white/10 ${className}`} 
        style={style}
        title={playerName}
      >
        <span className="text-[0.8em]">{cleanName ? cleanName.charAt(0).toUpperCase() : '?'}</span>
      </div>
    );
  }

  if (resolvedAvatar) {
    return (
      <div 
        className={`${sizeClassName} flex items-center justify-center shrink-0 overflow-hidden rounded-full border border-white/10 ${className}`}
        style={style}
        title={playerName}
      >
        <img
          src={resolvedAvatar}
          alt={playerName}
          referrerPolicy="no-referrer"
          onError={() => {
            avatarCache.set(cacheKey, null);
            setResolvedAvatar(null);
          }}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  // Fallback showing player's first letter
  return (
    <div 
      className={`${sizeClassName} flex items-center justify-center shrink-0 select-none bg-[#1e1f32] text-[#ff8f00] font-black rounded-full border border-white/10 ${className}`} 
      style={style}
      title={playerName}
    >
      <span className="text-[0.8em]">{cleanName ? cleanName.charAt(0).toUpperCase() : '?'}</span>
    </div>
  );
}

export default PlayerAvatar;
