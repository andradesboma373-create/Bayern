import React, { useState, useEffect, useMemo } from 'react';

export interface PlayerAvatarProps {
  key?: React.Key;
  game?: 'cs2' | 's2' | 'so2' | string;
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
  const [candidateIdx, setCandidateIdx] = useState(0);

  // Reset candidate index when player, game or direct avatar changes
  useEffect(() => {
    setCandidateIdx(0);
  }, [cleanName, game, avatarUrl]);

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
  const normalizedNick = cleanName.toLowerCase().replace(/[\s\-_.]/g, '');
  const isSo2 = game === 'so2' || game === 's2';

  const candidates = useMemo(() => {
    if (effectiveAvatar && !isAiGenerated) {
      return [effectiveAvatar];
    }
    if (isSo2) {
      return [
        `/avatars/so2/${normalizedNick}.webp`,
        `/avatars/so2/${normalizedNick}.png`,
        `/avatars/so2/${normalizedNick}.jpg`,
        `/assets/so2/${normalizedNick}.webp`,
        `/assets/so2/${normalizedNick}.png`,
        `/assets/so2/${normalizedNick}.jpg`,
        `/avatars/${normalizedNick}.webp`,
        `/avatars/${normalizedNick}.png`,
        `/avatars/${normalizedNick}.jpg`
      ];
    }
    // CS2 / default fallback
    return [
      `/avatars/cs2/${normalizedNick}.webp`,
      `/avatars/${normalizedNick}.webp`,
      `/avatars/cs2/${normalizedNick}.png`,
      `/avatars/${normalizedNick}.png`,
      `/avatars/cs2/${normalizedNick}.jpg`,
      `/avatars/${normalizedNick}.jpg`
    ];
  }, [effectiveAvatar, isAiGenerated, isSo2, normalizedNick]);

  const currentSrc = candidates[candidateIdx];
  const isOutOfCandidates = !currentSrc || candidateIdx >= candidates.length;

  if (isOutOfCandidates) {
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
        key={currentSrc}
        src={currentSrc}
        alt={playerName}
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover"
        onError={() => setCandidateIdx(prev => prev + 1)}
      />
    </div>
  );
}

export default PlayerAvatar;
