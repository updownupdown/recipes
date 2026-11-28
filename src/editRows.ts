import { LEAD, parseNumber } from './quantity';

/* Converting between the plain-text recipe format (one line each) and the editor's rows. */

export type IngRow = { id: number; kind: 'item'; qty: string; unit: string; label: string } | { id: number; kind: 'section'; label: string };
export type StepRow = { id: number; text: string };

let seq = 0;
export const nextId = () => ++seq;

/** Units offered in the editor, always singular; the saved line gets the plural when the amount needs it. */
export const UNIT_OPTIONS = ['tsp', 'tbsp', 'cup', 'ml', 'l', 'g', 'kg', 'oz', 'lb', 'fl oz', 'pint', 'quart', 'pinch', 'dash', 'clove', 'can', 'slice', 'stick', 'bunch', 'sprig', 'handful', 'package', 'piece'];
export const UNIT_RE = /^\s*(fl\.?\s*oz|cups?|c\.|tbsps?|tablespoons?|tsps?|teaspoons?|kg|g|grams?|ml|cl|dl|l|liters?|litres?|oz|ounces?|lbs?|pounds?|pints?|quarts?|cans?|cloves?|pinch(?:es)?|dash(?:es)?|sticks?|packages?|pkg|slices?|bunch(?:es)?|handfuls?|sprigs?|pieces?)\b\.?/i;

const PLURAL: Record<string, string> = {
  cup: 'cups', pint: 'pints', quart: 'quarts', pinch: 'pinches', dash: 'dashes', clove: 'cloves', can: 'cans', slice: 'slices',
  stick: 'sticks', bunch: 'bunches', sprig: 'sprigs', handful: 'handfuls', package: 'packages', piece: 'pieces',
};
const SINGULAR = Object.fromEntries(Object.entries(PLURAL).map(([a, b]) => [b, a]));
export const singularUnit = (u: string) => SINGULAR[u.toLowerCase()] ?? u;

/** The largest number in a quantity ("1 1/2" -> 1.5, "2-3" -> 3). */
function maxQty(q: string): number {
  return Math.max(0, ...q.split(/\s*(?:-|–|to|or)\s*/).map((p) => parseNumber(p)));
}
/** "cup" with "2" -> "cups"; "cups" with "1/2" -> "cup". Abbreviations (tbsp, g, oz) never change. */
export function unitFor(unit: string, qty: string): string {
  const one = singularUnit(unit.trim());
  return PLURAL[one] && maxQty(qty) > 1 ? PLURAL[one] : one;
}

const SHORT: [RegExp, string][] = [
  [/^tablespoons?$|^tbsps?\.?$|^tbs\.?$/i, 'tbsp'], [/^teaspoons?$|^tsps?\.?$/i, 'tsp'], [/^ounces?$|^oz\.$/i, 'oz'],
  [/^pounds?$|^lbs?\.?$/i, 'lb'], [/^fl\.?\s*oz\.?$/i, 'fl oz'], [/^grams?$/i, 'g'], [/^kilograms?$/i, 'kg'], [/^c\.$/i, 'cup'], [/^pkg\.?$/i, 'package'],
];
/** Standard short units in the editor ("teaspoons" -> "tsp") so they fit the unit box. */
function shortUnit(u: string): string {
  return SHORT.find(([re]) => re.test(u))?.[1] ?? u;
}

export function lineToRow(line: string): IngRow {
  if (line.startsWith('#')) return { id: nextId(), kind: 'section', label: line.replace(/^#+\s*/, '') };
  const m = line.match(LEAD);
  if (!m) return { id: nextId(), kind: 'item', qty: '', unit: '', label: line.trim() };
  let rest = line.slice(m[0].length);
  const u = rest.match(UNIT_RE);
  const unit = u ? singularUnit(shortUnit(u[0].trim())) : '';
  if (u) rest = rest.slice(u[0].length);
  return { id: nextId(), kind: 'item', qty: m[0].trim(), unit, label: rest.trim() };
}

export function rowToLine(r: IngRow): string {
  if (r.kind === 'section') return r.label.trim() ? '# ' + r.label.trim() : '';
  return [r.qty.trim(), unitFor(r.unit, r.qty), r.label.trim()].filter(Boolean).join(' ');
}

export const emptyItem = (): IngRow => ({ id: nextId(), kind: 'item', qty: '', unit: '', label: '' });

/** "1 h 15 min", "45 minutes", "2 hours" -> [hours, minutes]; undefined if it says something else. */
export function parseTime(t: string): [number, number] | undefined {
  const s = t.trim().toLowerCase();
  if (!s) return [0, 0];
  const m = s.match(/^(?:(\d+(?:\.\d+)?)\s*(?:h|hrs?|hours?))?\s*(?:(\d+)\s*(?:m|mins?|minutes?))?$/);
  if (!m || (!m[1] && !m[2])) return undefined;
  const hours = parseFloat(m[1] ?? '0');
  return [Math.floor(hours), Math.round((hours % 1) * 60) + parseInt(m[2] ?? '0')];
}

export function formatTime(h: number, m: number): string {
  const total = h * 60 + m;
  if (!total) return '';
  const hh = Math.floor(total / 60), mm = total % 60;
  return [hh && `${hh} h`, mm && `${mm} min`].filter(Boolean).join(' ');
}
