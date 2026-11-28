import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { allRecipes } from './db';
import type { Recipe } from './types';

/* Navigation. Each history entry gets a depth, so Back can tell whether the previous page is
   inside the app (go back to it, keeping its scroll position) or not (go home instead).
   Going Home rewinds to the first entry instead of adding one, so Home always starts a fresh trail:
   Home > A > Home > B, then Back, lands on Home (not A), and Back again leaves the app. */
let depth = typeof history.state?.depth === 'number' ? history.state.depth : 0;
let replacing = false;
let homing = false;
const isHome = () => read().length === 0;
addEventListener('popstate', () => {
  if (typeof history.state?.depth === 'number') depth = history.state.depth;
  if (homing && depth === 0 && isHome()) homing = false; // landed on Home (no hash change needed)
});
const scrolls = new Map<number, number>();
if (typeof history.state?.depth !== 'number') history.replaceState({ depth }, '');
addEventListener('scroll', () => scrolls.set(depth, scrollY), { passive: true });

function onHashChange(): number | undefined {
  const st = history.state;
  if (replacing) {
    replacing = false;
    history.replaceState({ depth }, '');
    return 0;
  }
  if (st && typeof st.depth === 'number') {
    depth = st.depth; // back or forward to a page we've seen
    if (homing && depth === 0) {
      homing = false;
      if (!isHome()) { replace(''); return 0; } // the app was opened on another page: swap it for Home
    }
    return scrolls.get(depth) ?? 0;
  }
  if (isHome() && depth > 0) {
    // A link to Home: rewind to the first entry rather than stacking Home on top.
    history.replaceState({ depth: depth + 1 }, '');
    homing = true;
    history.go(-(depth + 1));
    return 0;
  }
  depth += 1;
  history.replaceState({ depth }, '');
  scrolls.delete(depth);
  return 0;
}

const read = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);

export function useHashRoute(): string[] {
  const [parts, setParts] = useState(read);
  useEffect(() => {
    const on = () => {
      const y = onHashChange();
      const next = read();
      setParts(next);
      if (/^(settings|data)\b/.test(next[0] ?? '')) return; // a pop-up: leave the page under it where it is
      // Restore after React has rendered the page.
      requestAnimationFrame(() => requestAnimationFrame(() => scrollTo(0, y ?? 0)));
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return parts;
}

/** Open a page (adds a history entry). */
export function go(path: string) {
  location.hash = '#/' + path.replace(/^\//, '');
}

/** Swap the current page for another without adding history (after save, delete, import). */
export function replace(path: string) {
  const target = '#/' + path.replace(/^\//, '');
  if (location.hash === target) return;
  replacing = true;
  location.replace(target);
}

/** Home, starting a fresh trail (see the note at the top). */
export function goHome() {
  if (depth > 0) { homing = true; history.go(-depth); }
  else if (!isHome()) replace('');
}

/** Back to the previous page in the app, or to `fallback` when the app was opened on this page. */
export function goBack(fallback = '') {
  if (depth > 0) history.back();
  else replace(fallback);
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

/** useState that survives leaving the page and coming back in the same session (filters, search). */
export function useSessionState<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [v, setV] = useState<T>(() => {
    try { const s = sessionStorage.getItem(key); return s === null ? initial : (JSON.parse(s) as T); } catch { return initial; }
  });
  const set = (n: T | ((p: T) => T)) => setV((p) => {
    const next = typeof n === 'function' ? (n as (p: T) => T)(p) : n;
    try { sessionStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });
  return [v, set];
}
