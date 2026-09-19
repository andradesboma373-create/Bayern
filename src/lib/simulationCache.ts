/**
 * In-Memory Simulation Cache
 * Caches players, teams, and maps to prevent redundant reads and network operations.
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class SimulationCache {
  public static playersCache = new Map<string, CacheEntry<any>>();
  public static teamsCache = new Map<string, CacheEntry<any>>();
  public static mapsCache = new Map<string, CacheEntry<any>>();
  
  // Default TTL: 10 minutes
  private static TTL_MS = 10 * 60 * 1000;

  public static getPlayer(key: string): any | null {
    const entry = this.playersCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.TTL_MS) {
      this.playersCache.delete(key);
      return null;
    }
    return entry.data;
  }

  public static setPlayer(key: string, data: any) {
    this.playersCache.set(key, { data, timestamp: Date.now() });
  }

  public static getTeam(key: string): any | null {
    const entry = this.teamsCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.TTL_MS) {
      this.teamsCache.delete(key);
      return null;
    }
    return entry.data;
  }

  public static setTeam(key: string, data: any) {
    this.teamsCache.set(key, { data, timestamp: Date.now() });
  }

  public static getMap(key: string): any | null {
    const entry = this.mapsCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.TTL_MS) {
      this.mapsCache.delete(key);
      return null;
    }
    return entry.data;
  }

  public static setMap(key: string, data: any) {
    this.mapsCache.set(key, { data, timestamp: Date.now() });
  }

  public static clearAll() {
    this.playersCache.clear();
    this.teamsCache.clear();
    this.mapsCache.clear();
  }
}
