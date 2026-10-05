import React from 'react';
import { getAutoMatchedVectorLogo } from '../lib/logoMatcher';

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

  const [error, setError] = React.useState(false);

  if (!cleanName || error) {
    return (
      <div 
        className={`${defaultSizeClass} flex items-center justify-center shrink-0 rounded-lg bg-white/5 border border-white/10 ${className}`}
        style={style}
      >
        <span className="text-white/40 font-black text-[10px]">?</span>
      </div>
    );
  }

  let src = logoUrl;
  
  // Prioritize official auto-matched logos from /public/logos/ if no external URL or if name matches official map
  const officialLogo = getAutoMatchedVectorLogo(cleanName);
  if (officialLogo) {
    src = officialLogo;
  }
  
  if (!src) {
    src = `/api/logo/${encodeURIComponent(cleanName)}?game=${game || 'cs2'}`;
  }
  
  if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
    // Route external URLs through server proxy with CORS headers so canvas export won't be tainted
    src = `/api/proxy-image?url=${encodeURIComponent(src)}`;
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
