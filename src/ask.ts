import { useEffect, useState } from 'react';

/* One in-app way to ask "are you sure?", used everywhere instead of the browser's confirm()/prompt(). */

export interface Ask {
  title: string;
  body?: string;
  yes: string;
  no?: string | null; // null: only one button
  danger?: boolean;
  copy?: string; // text shown selectable (for "copy this link")
}
type Pending = Ask & { resolve: (v: boolean) => void };

let current: Pending | undefined;
const subs = new Set<(p?: Pending) => void>();
const emit = () => subs.forEach((f) => f(current));

/** Shows the floating prompt and resolves true for the main button, false for Cancel. */
export function ask(a: Ask): Promise<boolean> {
  current?.resolve(false);
  return new Promise((resolve) => { current = { ...a, resolve }; emit(); });
}
export function answer(v: boolean) {
  const p = current;
  current = undefined;
  emit();
  p?.resolve(v);
}
export function useAsk(): Pending | undefined {
  const [p, set] = useState(current);
  useEffect(() => { subs.add(set); set(current); return () => { subs.delete(set); }; }, []);
  return p;
}
