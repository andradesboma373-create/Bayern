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

export function PlayerAvatar({ 
  playerName, 
  sizeClassName = "w-8 h-8", 
  className = '', 
  style,
  avatarUrl,
  game
}: PlayerAvatarProps) {
  const [resolvedAvatar, setResolvedAvatar] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(true);

  const cleanName = playerName ? playerName.trim() : "";
  const lowerName = cleanName.toLowerCase();

  useEffect(() => {
    let active = true;
    setIsSearching(true);
    setResolvedAvatar(null);

    if (!cleanName) {
      setIsSearching(false);
      return;
    }

    const underscoreName = lowerName.replace(/\s+/g, '_');
    const hyphenName = lowerName.replace(/\s+/g, '-');
    const noSpacesName = lowerName.replace(/\s+/g, '');
    
    const candidates: string[] = [];

    // 1. URL from prop
    if (avatarUrl) {
      candidates.push(avatarUrl);
      setResolvedAvatar(avatarUrl);
      setIsSearching(false);
      return;
    }

    // 2. Direct cache in localStorage
    const directKey = `player_avatar_${lowerName}`;
    const directVal = localStorage.getItem(directKey);
    if (directVal && !candidates.includes(directVal)) candidates.push(directVal);

    // 3. Lists of players and teams in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('players_')) {
        try {
          const players = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(players)) {
            const found = players.find((p: any) => p.nickname && p.nickname.trim().toLowerCase() === lowerName);
            if (found && found.avatarUrl && !candidates.includes(found.avatarUrl)) {
              candidates.push(found.avatarUrl);
            }
          }
        } catch (e) {}
      } else if (key && key.startsWith('teams_')) {
        try {
          const teams = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(teams)) {
            teams.forEach((t: any) => {
              if (t.players && Array.isArray(t.players)) {
                const found = t.players.find((p: any) => p.nickname && p.nickname.trim().toLowerCase() === lowerName);
                if (found && found.avatarUrl && !candidates.includes(found.avatarUrl)) {
                  candidates.push(found.avatarUrl);
                }
              }
            });
          }
        } catch(e) {}
      }
    }

    // 4. Static paths in /avatars/
    const extensions = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
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

    // 4. UI-Avatars fallback candidate
    candidates.push(`https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=222338&color=ff8f00&bold=true`);

    const tryLoad = (index: number) => {
      if (!active) return;
      if (index >= candidates.length) {
        setIsSearching(false);
        return;
      }

      const url = candidates[index];
      const img = new Image();
      img.src = url;
      img.onload = () => {
        if (!active) return;
        setResolvedAvatar(url);
        setIsSearching(false);
        // Cache successful result only if not a huge base64 data URL
        if (!url.startsWith('data:') && !localStorage.getItem(directKey)) {
           try { localStorage.setItem(directKey, url); } catch (e) {}
        }
      };
      img.onerror = () => {
        if (!active) return;
        tryLoad(index + 1);
      };
    };

    tryLoad(0);

    return () => { active = false; };
  }, [playerName, avatarUrl, lowerName, game]);

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
