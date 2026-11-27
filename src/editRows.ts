import { LEAD } from './quantity';

/* Converting between the plain-text recipe format (one line each) and the editor's rows. */

export type IngRow = { id: number; kind: 'item'; qty: string; unit: string; label: string } | { id: number; kind: 'section'; label: string };
export type StepRow = { id: number; text: string };

let seq = 0;
export const nextId = () => ++seq;

export const UNIT_OPTIONS = ['cup', 'cups', 'tbsp', 'tsp', 'g', 'kg', 'ml', 'l', 'oz', 'lb', 'pinch', 'clove', 'cloves', 'can', 'cans', 'slice', 'slices', 'bunch', 'handful', 'package', 'stick', 'sticks', 'dash'];
const UNIT_RE = /^\s*(fl\.?\s*oz|cups?|c\.|tbsps?|tablespoons?|tsps?|teaspoons?|kg|g|grams?|ml|cl|dl|l|liters?|litres?|oz|ounces?|lbs?|pounds?|pints?|quarts?|cans?|cloves?|pinch(?:es)?|dash(?:es)?|sticks?|packages?|pkg|slices?|bunch(?:es)?|handfuls?)\b\.?/i;

const SHORT: [RegExp, string][] = [
  [/^tablespoons?$|^tbsps?\.?$|^tbs\.?$/i, 'tbsp'], [/^teaspoons?$|^tsps?\.?$/i, 'tsp'], [/^ounces?$|^oz\.$/i, 'oz'],
  [/^pounds?$|^lbs?\.?$/i, 'lb'], [/^grams?$/i, 'g'], [/^kilograms?$/i, 'kg'], [/^c\.$/i, 'cup'],
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
  const unit = u ? shortUnit(u[0].trim()) : '';
  if (u) rest = rest.slice(u[0].length);
  return { id: nextId(), kind: 'item', qty: m[0].trim(), unit, label: rest.trim() };
}

export function rowToLine(r: IngRow): string {
  if (r.kind === 'section') return r.label.trim() ? '# ' + r.label.trim() : '';
  return [r.qty.trim(), r.unit.trim(), r.label.trim()].filter(Boolean).join(' ');
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
