import { RECIPE_READER_URL } from './config';
import { canonicalCategory, categoryLook, guessCategory } from './categories';
import { parseRecipeText, tidyDraft } from './parse';
import { fixCaps } from './caps';
import type { RecipeDraft } from './types';

/* Add-from-link. Browsers can't read other sites directly, so a small free Cloudflare Worker
   (worker/recipe-reader.js) fetches the page and hands back its structured recipe data
   (schema.org "Recipe" JSON-LD, which nearly every recipe site publishes for Google). */

export class WebImportError extends Error {}

export function readerConfigured(): boolean {
  return !!RECIPE_READER_URL;
}

export async function recipeFromUrl(link: string): Promise<RecipeDraft> {
  if (!RECIPE_READER_URL) throw new WebImportError('Link import is not switched on yet.');
  let res: Response;
  try {
    res = await fetch(RECIPE_READER_URL + '?url=' + encodeURIComponent(link));
  } catch {
    throw new WebImportError('Could not reach the recipe reader. Are you online?');
  }
  const data = await res.json().catch(() => ({ error: 'Unexpected reply' }));
  if (!res.ok || data.error) throw new WebImportError(data.error || 'That page could not be read.');
  const draft = recipeFromJsonLd(data.jsonld ?? [], data.url ?? link);
  if (draft) return fixCaps(draft);
  // No structured data: fall back to the page text, which the person tidies before saving.
  if (data.text) {
    const d = parseRecipeText(decodeEntities((data.title ? data.title + '\n' : '') + data.text));
    const f = fixCaps(d);
    return { ...f, source: data.url ?? link, categories: guessed(f.title, f.ingredients.join(' ')) };
  }
  throw new WebImportError('No recipe found on that page.');
}

type Node = Record<string, any>;

function isRecipe(n: unknown): n is Node {
  if (!n || typeof n !== 'object') return false;
  const t = (n as Node)['@type'];
  return t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'));
}

function findRecipe(n: unknown, depth = 0): Node | undefined {
  if (depth > 6 || !n || typeof n !== 'object') return undefined;
  if (isRecipe(n)) return n;
  const kids = Array.isArray(n) ? n : [(n as Node)['@graph'], (n as Node).mainEntity, (n as Node).mainEntityOfPage].filter(Boolean);
  for (const k of kids) {
    const r = findRecipe(k, depth + 1);
    if (r) return r;
  }
  return undefined;
}

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', frac12: '½', frac14: '¼', frac34: '¾', deg: '°', hellip: '…', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', eacute: 'é', egrave: 'è' };

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+\d*);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
}

function txt(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') {
    return decodeEntities(String(v)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/ ([.,;:!?])/g, '$1').trim();
  }
  if (typeof v === 'object') return txt((v as Node).text ?? (v as Node).name ?? '');
  return '';
}

function list(v: unknown): unknown[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

function steps(v: unknown, out: string[] = []): string[] {
  for (const item of list(v)) {
    if (typeof item === 'string') {
      // Some sites put all steps in one string separated by newlines.
      for (const line of decodeEntities(item).split(/\n+|<br\s*\/?>/i)) if (txt(line)) out.push(txt(line));
    } else if (item && typeof item === 'object') {
      const n = item as Node;
      const type = list(n['@type']);
      if (type.includes('HowToSection') || (n.itemListElement && !n.text)) {
        if (n.name) out.push(txt(n.name).replace(/:?$/, ':'));
        steps(n.itemListElement, out);
      } else if (n.text || n.name) out.push(txt(n.text ?? n.name));
    }
  }
  return out;
}

/** ISO 8601 duration ("PT1H30M") to "1 h 30 min". */
export function duration(iso: unknown): string | undefined {
  if (typeof iso !== 'string') return undefined;
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return undefined;
  const mins = (+(m[1] ?? 0)) * 1440 + (+(m[2] ?? 0)) * 60 + +(m[3] ?? 0);
  if (!mins) return undefined;
  const h = Math.floor(mins / 60), mm = mins % 60;
  return [h && `${h} h`, mm && `${mm} min`].filter(Boolean).join(' ');
}

function servings(v: unknown): number | undefined {
  for (const y of list(v)) {
    const n = parseInt(String(y).match(/\d+/)?.[0] ?? '');
    if (n > 0 && n < 200) return n;
  }
  return undefined;
}

function guessed(title: string, body: string): string[] {
  const g = guessCategory(title, body);
  return g ? [g.name] : [];
}

/** Turns the page's JSON-LD blocks into a draft, or undefined when the page has no Recipe. */
export function recipeFromJsonLd(blocks: string[], url: string): RecipeDraft | undefined {
  let r: Node | undefined;
  for (const b of blocks) {
    try {
      r = findRecipe(JSON.parse(b.replace(/^\s*<!--|-->\s*$/g, '')));
    } catch { /* some sites ship broken JSON; skip it */ }
    if (r) break;
  }
  if (!r) return undefined;
  const title = txt(r.name) || 'Untitled recipe';
  const ingredients = list(r.recipeIngredient ?? r.ingredients).map(txt).filter(Boolean);
  const instructions = steps(r.recipeInstructions);
  // Only keep site categories the app knows ("Italian", "Dessert"); sites also use labels like "Dinner".
  const fromSite = [...list(r.recipeCategory), ...list(r.recipeCuisine)]
    .flatMap((c) => txt(c).split(/,\s*/))
    .filter((c) => c && categoryLook(c).known)
    .map(canonicalCategory);
  const categories = [...new Set(fromSite)].slice(0, 3);
  const desc = txt(r.description);
  return tidyDraft({
    title,
    categories: categories.length ? categories : guessed(title, ingredients.join(' ')),
    servings: servings(r.recipeYield),
    time: duration(r.totalTime) ?? duration(r.cookTime),
    ingredients,
    instructions,
    notes: desc || undefined,
    source: url,
  });
}
