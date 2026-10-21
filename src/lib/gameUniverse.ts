import { useState, useEffect } from 'react';

export type GameUniverse = 'cs2' | 'so2';

let globalGameUniverse: GameUniverse = (typeof window !== 'undefined' && localStorage.getItem('active_game_universe') as GameUniverse) || 'cs2';
const listeners = new Set<(game: GameUniverse) => void>();

export function setGlobalGameUniverse(newGame: GameUniverse) {
  globalGameUniverse = newGame;
  try {
    localStorage.setItem('active_game_universe', newGame);
  } catch {}
  listeners.forEach(fn => fn(newGame));
}

export function useGameUniverse(): [GameUniverse, (game: GameUniverse) => void] {
  const [game, setGame] = useState<GameUniverse>(globalGameUniverse);

  useEffect(() => {
    const handler = (newGame: GameUniverse) => {
      setGame(newGame);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const updateGame = (newGame: GameUniverse) => {
    setGlobalGameUniverse(newGame);
  };

  return [game, updateGame];
}
