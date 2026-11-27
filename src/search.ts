import { normalize } from './hooks';
import type { Recipe } from './types';

/** Title matches first, then category, then ingredient/notes matches. */
export function searchRecipes(list: Recipe[], q: string): Recipe[] {
  const terms = normalize(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return list;
  const scored: [number, Recipe][] = [];
  for (const r of list) {
    const title = normalize(r.title);
    const cats = normalize(r.categories.join(' '));
    const rest = normalize(r.ingredients.join(' ') + ' ' + (r.notes ?? ''));
    let score = 0;
    let ok = true;
    for (const t of terms) {
      if (title.includes(t)) score += 3;
      else if (cats.includes(t)) score += 2;
      else if (rest.includes(t)) score += 1;
      else { ok = false; break; }
    }
    if (ok) scored.push([score, r]);
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].title.localeCompare(b[1].title)).map((x) => x[1]);
}

export function categoryCounts(list: Recipe[]): [string, number][] {
  const m = new Map<string, number>();
  for (const r of list) for (const c of r.categories) m.set(c, (m.get(c) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
