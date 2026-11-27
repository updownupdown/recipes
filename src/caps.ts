/* ALL CAPS recipes (common in old cards and some sites) become normal case on import. */

const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with', 'au', 'de', 'la', 'le', 'et']);

/** True when a line is shouting: at least 4 letters and (almost) none lowercase. */
export function isAllCaps(s: string): boolean {
  const letters = s.match(/\p{L}/gu) ?? [];
  if (letters.length < 4) return false;
  const lower = letters.filter((c) => c !== c.toUpperCase()).length;
  return lower / letters.length < 0.05;
}

function fixUnits(s: string): string {
  return s.replace(/(\d)\s*°?\s*([fc])\b/g, (_, d, u) => `${d}°${u.toUpperCase()}`);
}

export function titleCase(s: string): string {
  return s.toLowerCase().replace(/[\p{L}\d'’]+/gu, (w, i: number) => (i > 0 && SMALL.has(w) ? w : w[0].toUpperCase() + w.slice(1)));
}

export function sentenceCase(s: string): string {
  return fixUnits(s.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (_, a, b) => a + b.toUpperCase()));
}

/** Fixes the title and any all-caps lines; mixed-case text is left exactly as it was. */
export function fixCaps<T extends { title: string; ingredients: string[]; instructions: string[]; notes?: string }>(r: T): T {
  const line = (l: string) => (isAllCaps(l) ? (l.startsWith('#') ? '# ' + titleCase(l.replace(/^#+\s*/, '')) : sentenceCase(l)) : l);
  return {
    ...r,
    title: isAllCaps(r.title) ? titleCase(r.title) : r.title,
    ingredients: r.ingredients.map(line),
    instructions: r.instructions.map(line),
    notes: r.notes?.split('\n').map(line).join('\n'),
  };
}

export function hasAllCaps(r: { title: string; ingredients: string[]; instructions: string[] }): boolean {
  return [r.title, ...r.ingredients, ...r.instructions].some(isAllCaps);
}
