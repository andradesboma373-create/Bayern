import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

export interface PlayerAvatarProps {
  key?: React.Key;
  game?: 'cs2' | 's2';
  playerName: string;
  sizeClassName?: string;
  className?: string;
  style?: React.CSSProperties;
  avatarUrl?: string; // Прямая ссылка
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
  const [hasError, setHasError] = useState(false);
  
  if (!cleanName) {
    return (
      <div 
        className={`${sizeClassName} flex items-center justify-center shrink-0 select-none bg-[#1e1f32] text-[#ff8f00] font-black rounded-full border border-white/10 ${className}`} 
        style={style}
      >
        <span className="text-[0.8em]">?</span>
      </div>
    );
  }

  // Check direct prop or saved avatar in localStorage
  let effectiveAvatar = avatarUrl;
  if (!effectiveAvatar && typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(`player_avatar_${cleanName.toLowerCase()}`);
      if (saved && saved !== 'null' && saved !== 'undefined') {
        effectiveAvatar = saved;
      }
    } catch (e) {}
  }

  // Ignore external generated avatars to avoid "AI photos"
  const isAiGenerated = effectiveAvatar && (effectiveAvatar.includes('dicebear.com') || effectiveAvatar.includes('ui-avatars.com'));
  
  // Use explicitly provided URL or the backend resolver API
  const src = (effectiveAvatar && !isAiGenerated && !hasError) 
    ? effectiveAvatar 
    : `/api/avatar/${encodeURIComponent(cleanName)}?game=${game || 'cs2'}`;

  if (hasError) {
    return (
      <div 
        className={`${sizeClassName} flex items-center justify-center shrink-0 select-none bg-[#1e1f32] text-[#ff8f00] font-black rounded-full border border-white/10 ${className}`} 
        style={style}
        title={playerName}
      >
        <span className="text-[0.7em] uppercase">{cleanName.charAt(0) || '?'}</span>
      </div>
    );
  }

  return (
    <div 
      className={`${sizeClassName} flex items-center justify-center shrink-0 overflow-hidden rounded-full border border-white/10 ${className}`}
      style={style}
      title={playerName}
    >
      <img
        src={src}
        alt={playerName}
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export default PlayerAvatar;
