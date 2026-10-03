import { useState, useEffect, useCallback } from 'react';

export type GameWorld = 'cs2' | 'so2';

const STORAGE_KEY = 'active_game_world';
const EVENT_NAME = 'game-world-changed';

/**
 * Returns current game world ('cs2' or 'so2'). Defaults to 'cs2'.
 */
export function getGameWorld(): GameWorld {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === 'so2' || val === 'cs2') return val;
  } catch (e) {}
  return 'cs2';
}

/**
 * Updates active game world and notifies all components across the app.
 */
export function setGameWorld(world: GameWorld): void {
  try {
    localStorage.setItem(STORAGE_KEY, world);
  } catch (e) {}
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: world }));
}

/**
 * React hook to read and update current game world.
 */
export function useGameWorld() {
  const [gameWorld, setLocalGameWorld] = useState<GameWorld>(getGameWorld);

  useEffect(() => {
    const handleStorage = () => {
      setLocalGameWorld(getGameWorld());
    };

    const handleCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'cs2' || detail === 'so2') {
        setLocalGameWorld(detail);
      } else {
        setLocalGameWorld(getGameWorld());
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(EVENT_NAME, handleCustom);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(EVENT_NAME, handleCustom);
    };
  }, []);

  const switchGameWorld = useCallback((world: GameWorld) => {
    setGameWorld(world);
    setLocalGameWorld(world);
  }, []);

  return { gameWorld, setGameWorld: switchGameWorld };
}
