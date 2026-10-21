import React from 'react';
import { getAutoMatchedVectorLogo, generateInitialsLogo } from '../lib/logoMatcher';

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
  const [guessIdx, setGuessIdx] = React.useState(0);

  // Fallback initials (if name empty or all loading attempts failed)
  if (!cleanName || (error && guessIdx >= 3)) {
    const isActuallyTBD = !cleanName || cleanName.toUpperCase() === 'TBD';
    const initials = isActuallyTBD ? '?' : (cleanName ? cleanName.trim().charAt(0).toUpperCase() : '?');
    
    return (
      <div 
        className={`${defaultSizeClass} flex items-center justify-center shrink-0 rounded-lg ${isActuallyTBD ? 'bg-[#050508] border-white/5' : 'bg-white/20 border-white/30'} ${className}`}
        style={style}
        title={teamName}
      >
        <span className={`${isActuallyTBD ? 'text-white/30' : 'text-white/90'} font-black text-[11px] uppercase`}>{initials}</span>
      </div>
    );
  }

  // Prioritize user-provided custom logoUrl (e.g. Data URL or custom link)
  let src = logoUrl;
  
  // If no custom logo provided, try auto-matched official vector logo from matcher map
  if (!src) {
    const officialLogo = getAutoMatchedVectorLogo(cleanName, game);
    if (officialLogo) {
      src = officialLogo;
    }
  }
  
  // If still no src, or if we had an error and want to try guessing
  if (!src || error) {
    const nameLow = cleanName.toLowerCase();
    const nameNoSpaces = nameLow.replace(/[\s._-]+/g, '');
    
    const guesses = [
      `/logos/${encodeURIComponent(nameLow)}.svg`,
      `/logos/${encodeURIComponent(nameNoSpaces)}.svg`,
      `/logos/${encodeURIComponent(nameLow)}.webp`,
      `/logos/${encodeURIComponent(nameNoSpaces)}.webp`,
      `/logos/${encodeURIComponent(nameLow)}.png`,
      `/logos/${encodeURIComponent(nameNoSpaces)}.png`
    ];
    
    src = guesses[guessIdx] || generateInitialsLogo(cleanName);
  }

  return (
    <div 
      className={`${defaultSizeClass} flex items-center justify-center shrink-0 ${className}`}
      style={style}
      title={teamName}
    >
      <img
        key={`${src}-${guessIdx}`}
        src={src}
        alt={teamName}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        style={{ imageRendering: '-webkit-optimize-contrast' }}
        className="max-w-full max-h-full object-contain drop-shadow-lg"
        onError={() => {
          if (guessIdx < 6) {
            setError(true);
            setGuessIdx(prev => prev + 1);
          } else {
            setError(true);
          }
        }}
      />
    </div>
  );
}

export default TeamLogo;
