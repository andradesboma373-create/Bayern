import React from 'react';
import { getAutoMatchedVectorLogo } from '../lib/logoMatcher';

export interface TeamLogoProps {
  game?: 'cs2' | 's2' | 'so2';
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

  const [error, setError] = React.useState(false);

  if (!cleanName || error) {
    const letter = (cleanName ? cleanName.trim().charAt(0) : '?').toUpperCase();
    return (
      <div 
        className={`${defaultSizeClass} flex items-center justify-center shrink-0 rounded-lg bg-white/5 border border-white/10 ${className}`}
        style={style}
        title={teamName}
      >
        <span className="text-white/50 font-black text-[11px] uppercase">{letter}</span>
      </div>
    );
  }

  // Prioritize user-provided custom logoUrl (e.g. Data URL or custom link)
  let src = logoUrl;
  
  // If no custom logo provided, try auto-matched official vector logo from /logos/
  if (!src) {
    const officialLogo = getAutoMatchedVectorLogo(cleanName);
    if (officialLogo) {
      src = officialLogo;
    }
  }
  
  if (!src) {
    src = `/logos/${encodeURIComponent(cleanName.toLowerCase())}.svg`;
  }

  return (
    <div 
      className={`${defaultSizeClass} flex items-center justify-center shrink-0 ${className}`}
      style={style}
      title={teamName}
    >
      <img
        src={src}
        alt={teamName}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        style={{ imageRendering: '-webkit-optimize-contrast' }}
        className="max-w-full max-h-full object-contain drop-shadow-lg"
        onError={() => setError(true)}
      />
    </div>
  );
}

export default TeamLogo;
