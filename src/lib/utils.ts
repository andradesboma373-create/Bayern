import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeLocalStorageSet(key: string, value: any): boolean {
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (e) {
    console.warn(`[safeLocalStorageSet] Quota exceeded for key ${key}, attempting cleanup...`, e);
    try {
      // Clean up old matches or cache if quota full
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('match_cache_') || k.startsWith('sim_history_') || k.startsWith('temp_'))) {
          localStorage.removeItem(k);
        }
      }
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (inner) {
      console.error(`[safeLocalStorageSet] Failed to write key ${key}:`, inner);
      return false;
    }
  }
}

export function saveMatchesToLocalStorage(matches: any, key: string = 'savedMatches'): void {
  try {
    const arrMatches = Array.isArray(matches) ? matches : [matches];
    const existingStr = localStorage.getItem(key);
    let existing: any[] = [];
    if (existingStr) {
      try {
        existing = JSON.parse(existingStr);
        if (!Array.isArray(existing)) existing = [];
      } catch {}
    }
    const combined = [...arrMatches, ...existing.filter(e => !arrMatches.some(m => m.id === e.id))].slice(0, 500);
    safeLocalStorageSet(key, combined);
  } catch (e) {
    console.error('Error saving matches to localStorage:', e);
  }
}

export function getKdColorClass(kd: number | string): string {
  const num = typeof kd === 'string' ? parseFloat(kd) : kd;
  if (isNaN(num)) return 'text-zinc-400';
  if (num >= 1.3) return 'text-emerald-400 font-bold';
  if (num >= 1.05) return 'text-green-400';
  if (num >= 0.95) return 'text-white/90';
  if (num >= 0.8) return 'text-amber-400';
  return 'text-red-400';
}

export function getSwingColorClass(swing: number | string): string {
  const num = typeof swing === 'string' ? parseFloat(swing) : swing;
  if (isNaN(num) || num === 0) return 'text-zinc-400';
  return num > 0 ? 'text-emerald-400' : 'text-red-400';
}

export function formatSwing(val: number | string): string {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '0.00';
  return (num > 0 ? '+' : '') + num.toFixed(2);
}

export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function compressImage(
  dataUrlOrFile: string | File,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    let src = '';
    if (typeof dataUrlOrFile === 'string') {
      src = dataUrlOrFile;
      processSrc(src);
    } else {
      const reader = new FileReader();
      reader.onload = e => {
        src = e.target?.result as string;
        processSrc(src);
      };
      reader.onerror = reject;
      reader.readAsDataURL(dataUrlOrFile);
    }

    function processSrc(dataSrc: string) {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataSrc);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', quality));
      };
      img.onerror = () => resolve(dataSrc);
      img.src = dataSrc;
    }
  });
}
