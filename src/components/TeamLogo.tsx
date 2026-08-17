import React, { useState, useEffect } from 'react';

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


let cachedLocalTeams: any[] | null = null;
let lastCacheTime = 0;

function getLocalTeams() {
  if (cachedLocalTeams && Date.now() - lastCacheTime < 5000) {
     return cachedLocalTeams;
  }
  const allTeams: any[] = [];
  for (let i = 0; i < localStorage.length; i++) {
     const key = localStorage.key(i);
     if (key && key.startsWith('teams_')) {
       try {
         const teams = JSON.parse(localStorage.getItem(key) || '[]');
         if (Array.isArray(teams)) {
            allTeams.push(...teams);
         }
       } catch(e) {}
     }
  }
  cachedLocalTeams = allTeams;
  lastCacheTime = Date.now();
  return allTeams;
}

export function TeamLogo({ 

  teamName, 
  sizeClassName, 
  textClassName = "font-black text-white", 
  size = 'md', 
  className = '', 
  style,
  logoUrl,
  game
}: TeamLogoProps) {
  const [resolvedLogo, setResolvedLogo] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(true);

  // Очищаем и нормализуем имя
  const cleanName = teamName ? teamName.trim() : "";
  const lowerName = cleanName.toLowerCase();

  // Метод для генерации красивого детерминированного цвета-градиента на основе имени команды
  const getFallbackStyle = (name: string) => {
    if (!name) return "from-[#ff8f00]/30 to-[#ff5200]/30 border-orange-500/20 text-[#ff8f00]";
    const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = charCodeSum % 6;
    const gradients = [
      "from-[#ff8f00]/30 to-[#ff5200]/30 border-orange-500/20 text-[#ff8f00]",
      "from-blue-600/30 to-purple-600/30 border-blue-500/20 text-blue-400",
      "from-green-600/30 to-teal-600/30 border-green-500/20 text-green-400",
      "from-orange-500/30 to-red-600/30 border-orange-500/20 text-orange-400",
      "from-pink-500/30 to-rose-600/30 border-pink-500/20 text-pink-400",
      "from-indigo-600/30 to-violet-700/30 border-indigo-500/20 text-indigo-400",
    ];
    return gradients[index];
  };

  useEffect(() => {
    let active = true;
    setIsSearching(true);
    setResolvedLogo(null);

    if (!cleanName) {
      setIsSearching(false);
      return;
    }

    const underscoreName = lowerName.replace(/\s+/g, '_');
    const hyphenName = lowerName.replace(/\s+/g, '-');
    const noSpacesName = lowerName.replace(/\s+/g, '');

    // Собираем кандидатов для проверки
    const candidates: string[] = [];

    // 1. Прямой URL из пропса
    if (logoUrl) {
      candidates.push(logoUrl);
      setResolvedLogo(logoUrl);
      setIsSearching(false);
      return;
    }

    // 2. Локальный кэш из localStorage
    const directKey = `team_logo_${lowerName}`;
    const directVal = localStorage.getItem(directKey);
    if (directVal) {
      candidates.push(directVal);
    }

    // 3. Списки команд в localStorage (с кэшированием для оптимизации производительности)
    const localTeams = getLocalTeams();
    const found = localTeams.find((t: any) => t.name && t.name.trim().toLowerCase() === lowerName);
    if (found && found.logoUrl && !candidates.includes(found.logoUrl)) {
      candidates.push(found.logoUrl);
    }

    // 4. Статические пути в /logos/
    const extensions = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
    const nameVariations = [lowerName, underscoreName, hyphenName, noSpacesName];

    for (const name of nameVariations) {
      candidates.push(`/optimized/${name}.webp`);
    }

    for (const ext of extensions) {
      for (const name of nameVariations) {
        if (game === 's2') {
          candidates.push(`/logos2/${name}.${ext}`);
        } else if (game === 'cs2') {
          candidates.push(`/logos/${name}.${ext}`);
        } else {
          candidates.push(`/logos/${name}.${ext}`);
          candidates.push(`/logos2/${name}.${ext}`);
        }
      }
    }

    // Последовательная проверка существования картинок в фоне
    const tryLoad = (index: number) => {
      if (!active) return;
      if (index >= candidates.length) {
        setResolvedLogo(null);
        setIsSearching(false);
        return;
      }

      const url = candidates[index];
      const img = new Image();
      img.src = url;
      img.onload = () => {
        if (!active) return;
        setResolvedLogo(url);
        setIsSearching(false);
        
        // Кэшируем успешный результат для ускорения будущих загрузок
        if (url.startsWith('data:') && !localStorage.getItem(directKey)) {
          try {
            localStorage.setItem(directKey, url);
          } catch (e) {}
        }
      };
      img.onerror = () => {
        if (!active) return;
        tryLoad(index + 1);
      };
    };

    tryLoad(0);

    return () => {
      active = false;
    };
  }, [teamName, logoUrl, lowerName, game]);

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

  const firstLetter = cleanName ? cleanName.charAt(0).toUpperCase() : '?';
  const dimensions = getDimensionClass();

  // Если логотип еще ищется или не найден, показываем аккуратную текстовую заглушку в виде простого вопросика
  if (isSearching || !resolvedLogo) {
    return (
      <div 
        className={`${dimensions} flex items-center justify-center shrink-0 select-none font-black text-center text-white/50 bg-transparent border-0 ${className}`} 
        style={style}
        title={teamName}
      >
        <span>?</span>
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
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => {
          // На крайний случай, если картинка сломалась на этапе рендеринга
          setResolvedLogo(null);
        }}
        className="w-full h-full object-contain"
      />
    </div>
  );
}

export default TeamLogo;
