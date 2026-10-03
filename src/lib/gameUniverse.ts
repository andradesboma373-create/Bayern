import { useState, useEffect } from 'react';

export type GameUniverse = 'cs2' | 'so2';

export interface GameUniverseInfo {
  id: GameUniverse;
  name: string;
  fullName: string;
  shortName: string;
  icon: string;
  badge: string;
  primaryColor: string;
  gradient: string;
  tagline: string;
}

export const GAME_UNIVERSES: Record<GameUniverse, GameUniverseInfo> = {
  cs2: {
    id: 'cs2',
    name: 'CS2',
    fullName: 'Counter-Strike 2',
    shortName: 'CS2',
    icon: '',
    badge: 'Valve / HLTV',
    primaryColor: '#ff8f00',
    gradient: 'from-amber-500 to-orange-600',
    tagline: 'Мировая соревновательная сцена Counter-Strike 2'
  },
  so2: {
    id: 'so2',
    name: 'SO2',
    fullName: 'Standoff 2',
    shortName: 'SO2',
    icon: '',
    badge: 'Axlebolt / Major',
    primaryColor: '#f97316',
    gradient: 'from-orange-500 to-red-600',
    tagline: 'Мобильный киберспорт и официальные лиги Standoff 2'
  }
};

const STORAGE_KEY = 'app_game_universe';

export function getGameUniverse(): GameUniverse {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === 'so2' || val === 'cs2') return val;
  } catch (e) {}
  return 'cs2';
}

export function setGameUniverse(game: GameUniverse) {
  try {
    localStorage.setItem(STORAGE_KEY, game);
  } catch (e) {}
  window.dispatchEvent(new CustomEvent('game-universe-changed', { detail: { game } }));
}

export function useGameUniverse(): [GameUniverse, (game: GameUniverse) => void, GameUniverseInfo] {
  const [game, setGame] = useState<GameUniverse>(getGameUniverse);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'so2' || e.newValue === 'cs2')) {
        setGame(e.newValue);
      }
    };

    const handleCustom = (e: Event) => {
      const customEvent = e as CustomEvent<{ game: GameUniverse }>;
      if (customEvent.detail && (customEvent.detail.game === 'so2' || customEvent.detail.game === 'cs2')) {
        setGame(customEvent.detail.game);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('game-universe-changed', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('game-universe-changed', handleCustom);
    };
  }, []);

  const updateGame = (newGame: GameUniverse) => {
    setGame(newGame);
    setGameUniverse(newGame);
  };

  return [game, updateGame, GAME_UNIVERSES[game]];
}
