import React from 'react';

export interface TeamLogoProps {
  game?: 'cs2' | 's2';
  teamName: string;
  sizeClassName?: string;
  textClassName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  style?: React.CSSProperties;
  logoUrl?: string;
}

export function prepopulateTeamLogos() {
  // No longer needed, handled by backend
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
  
  let defaultSizeClass = sizeClassName;
  if (!defaultSizeClass) {
    switch (size) {
      case 'xs': defaultSizeClass = 'w-4 h-4'; break;
      case 'sm': defaultSizeClass = 'w-6 h-6'; break;
      case 'lg': defaultSizeClass = 'w-16 h-16'; break;
      case 'xl': defaultSizeClass = 'w-24 h-24'; break;
      case 'md':
      default: defaultSizeClass = 'w-10 h-10'; break;
    }
  }

  if (!cleanName) {
    return (
      <div 
        className={`${defaultSizeClass} flex items-center justify-center shrink-0 rounded-lg bg-black/20 border border-white/5 ${className}`}
        style={style}
      />
    );
  }

  const src = logoUrl || `/api/logo/${encodeURIComponent(cleanName)}?game=${game || 'cs2'}`;

  return (
    <div 
      className={`${defaultSizeClass} flex items-center justify-center shrink-0 ${className}`}
      style={style}
      title={teamName}
    >
      <img
        src={src}
        alt={teamName}
        referrerPolicy="no-referrer"
        className="max-w-full max-h-full object-contain drop-shadow-lg"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
}

export default TeamLogo;
