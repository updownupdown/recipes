import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { allRecipes } from './db';
import type { Recipe } from './types';

export function useHashRoute(): string[] {
  const read = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [parts, setParts] = useState(read);
  useEffect(() => {
    const on = () => { setParts(read()); window.scrollTo(0, 0); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return parts;
}

export function go(path: string) {
  location.hash = '#/' + path.replace(/^\//, '');
}

export function useRecipes(): Recipe[] | undefined {
  const [list, setList] = useState<Recipe[]>();
  useEffect(() => {
    const sub = liveQuery(allRecipes).subscribe({ next: setList });
    return () => sub.unsubscribe();
  }, []);
  return list;
}

/** Screen Wake Lock, re-acquired when the page becomes visible again. */
export function useWakeLock(on: boolean): boolean {
  const supported = 'wakeLock' in navigator;
  useEffect(() => {
    if (!on || !supported) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        if (document.visibilityState === 'visible' && !cancelled) lock = await navigator.wakeLock.request('screen');
      } catch { /* denied, e.g. low battery */ }
    };
    const onVis = () => { if (document.visibilityState === 'visible') acquire(); };
    acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      lock?.release().catch(() => {});
    };
  }, [on, supported]);
  return supported;
}

export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
