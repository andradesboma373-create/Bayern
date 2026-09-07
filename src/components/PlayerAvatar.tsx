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

  // Ignore external generated avatars to avoid "AI photos"
  const isAiGenerated = avatarUrl && (avatarUrl.includes('dicebear.com') || avatarUrl.includes('ui-avatars.com'));
  
  // Use explicitly provided URL or the backend resolver API
  const src = (avatarUrl && !isAiGenerated) ? avatarUrl : `/api/avatar/${encodeURIComponent(cleanName)}?game=${game || 'cs2'}`;

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
        className="w-full h-full object-contain"
        onError={(e) => {
          // If even the API fails (shouldn't happen, it redirects to fallback), we hide the image
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
}

export default PlayerAvatar;
