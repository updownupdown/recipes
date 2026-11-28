import type { Recipe, RecipeDraft } from './types';

/* Finding recipes that are probably the same one saved twice: similar titles and similar ingredients. */

const STOP = new Set('a an and the with of in on for to or style my moms mom grandmas best easy simple quick homemade recipe vegan vegetarian healthy classic'.split(' '));
const NOISE = new Set(('cup cups tbsp tsp tablespoon tablespoons teaspoon teaspoons g kg ml l oz lb lbs pound pounds ounce ounces can cans clove cloves ' +
  'pinch large small medium chopped diced sliced minced fresh freshly ground taste optional finely roughly cut into pieces peeled divided about plus more').split(' '));

const words = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
const titleWords = (t: string) => new Set(words(t).filter((w) => !STOP.has(w)));
function ingredientWords(r: Pick<Recipe, 'ingredients'>): Set<string> {
  const s = new Set<string>();
  for (const l of r.ingredients) if (!l.startsWith('#')) for (const w of words(l)) if (w.length > 2 && !/^\d/.test(w) && !NOISE.has(w) && !STOP.has(w)) s.add(w.replace(/e?s$/, ''));
  return s;
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 0;
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / (a.size + b.size - n);
}

/** 0 to 1: how alike two recipes look. */
export function similarity(a: Pick<Recipe, 'title' | 'ingredients'>, b: Pick<Recipe, 'title' | 'ingredients'>): number {
  const ta = titleWords(a.title), tb = titleWords(b.title);
  // Half overlap, half "one title is inside the other" ("Cassoulet" vs "French Cassoulet").
  let shared = 0;
  for (const w of ta) if (tb.has(w)) shared++;
  const t = (jaccard(ta, tb) + (Math.min(ta.size, tb.size) ? shared / Math.min(ta.size, tb.size) : 0)) / 2;
  const ia = ingredientWords(a), ib = ingredientWords(b);
  if (ia.size < 3 || ib.size < 3) return t; // too little to compare but the title
  const i = jaccard(ia, ib);
  // Nearly the same ingredient list is a strong sign on its own.
  return i >= 0.8 ? Math.max(i, (t + i) / 2) : (t + i) / 2;
}

export const DUP_THRESHOLD = 0.7;

export interface DupPair { a: Recipe; b: Recipe; score: number }

/** Likely duplicate pairs, most alike first. Pairs in `ignored` ("idA|idB") are skipped. */
export function findDuplicates(list: Recipe[], ignored: Set<string> = new Set()): DupPair[] {
  const out: DupPair[] = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const [a, b] = [list[i], list[j]];
      if (ignored.has(pairKey(a.id, b.id))) continue;
      const score = similarity(a, b);
      if (score >= DUP_THRESHOLD) out.push({ a, b, score });
    }
  }
  return out.sort((x, y) => y.score - x.score);
}

export const pairKey = (x: string, y: string) => [x, y].sort().join('|');

/** The closest saved recipe to a new one, if it's probably the same. */
export function existingMatch(draft: Pick<RecipeDraft, 'title' | 'ingredients'>, list: Recipe[]): Recipe | undefined {
  let best: Recipe | undefined, score = 0;
  for (const r of list) { const s = similarity(draft, r); if (s > score) { score = s; best = r; } }
  return score >= DUP_THRESHOLD ? best : undefined;
}

/** Lines in `a` that `b` doesn't have (ignoring case and spacing). */
export function onlyIn(a: string[], b: string[]): string[] {
  const key = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/[.,;:]$/, '').trim();
  const other = new Set(b.map(key));
  return a.filter((l) => !other.has(key(l)));
}

/** Keeps `keep`'s text and brings over what the other one adds: categories, notes, flags, source, servings, time. */
export function mergeInto(keep: Recipe, drop: Recipe): RecipeDraft {
  const notes = [keep.notes, drop.notes].filter((n): n is string => !!n?.trim());
  return {
    ...keep,
    categories: [...new Set([...keep.categories, ...drop.categories])],
    notes: [...new Set(notes)].join('\n\n') || undefined,
    favorite: keep.favorite || drop.favorite || undefined,
    cookNext: keep.cookNext ?? drop.cookNext,
    source: keep.source ?? drop.source,
    servings: keep.servings ?? drop.servings,
    time: keep.time ?? drop.time,
  };
}
