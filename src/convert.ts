import { formatNumber, LEAD, parseNumber } from './quantity';
import { gramsPerCup } from './units';

/* The free-form converter behind Conversions: "2 cups flour", "350F", "100 g", "1.5 lb". */

type Kind = 'vol' | 'mass' | 'temp';
interface U { re: RegExp; name: string; kind: Kind; size: number }
const UNITS: U[] = [
  { re: /^(?:fl\.?\s*oz|fluid\s+ounces?)$/i, name: 'fl oz', kind: 'vol', size: 29.57 },
  { re: /^(?:cups?|c)$/i, name: 'cup', kind: 'vol', size: 236.6 },
  { re: /^(?:tablespoons?|tbsps?|tbs|T)$/, name: 'tbsp', kind: 'vol', size: 14.79 },
  { re: /^(?:tablespoons?|tbsps?|tbs)$/i, name: 'tbsp', kind: 'vol', size: 14.79 },
  { re: /^(?:teaspoons?|tsps?|t)$/i, name: 'tsp', kind: 'vol', size: 4.93 },
  { re: /^(?:pints?|pt)$/i, name: 'pint', kind: 'vol', size: 473.2 },
  { re: /^(?:quarts?|qt)$/i, name: 'quart', kind: 'vol', size: 946.4 },
  { re: /^(?:millilit(?:re|er)s?|ml)$/i, name: 'ml', kind: 'vol', size: 1 },
  { re: /^(?:lit(?:re|er)s?|l)$/i, name: 'l', kind: 'vol', size: 1000 },
  { re: /^(?:grams?|g|gr)$/i, name: 'g', kind: 'mass', size: 1 },
  { re: /^(?:kilograms?|kgs?)$/i, name: 'kg', kind: 'mass', size: 1000 },
  { re: /^(?:ounces?|oz)$/i, name: 'oz', kind: 'mass', size: 28.35 },
  { re: /^(?:pounds?|lbs?)$/i, name: 'lb', kind: 'mass', size: 453.6 },
  { re: /^(?:°?\s*f|fahrenheit|degrees?\s*f)$/i, name: '°F', kind: 'temp', size: 1 },
  { re: /^(?:°?\s*c|celsius|degrees?\s*c)$/i, name: '°C', kind: 'temp', size: 1 },
];

export interface Result { value: string; unit: string; note?: string }
export interface Conversion { from: string; results: Result[] }

const round = (n: number) => (n >= 100 ? String(Math.round(n)) : n >= 10 ? String(Math.round(n * 10) / 10) : String(Math.round(n * 100) / 100));
const nice = (n: number) => (n >= 10 ? String(Math.round(n)) : formatNumber(n));

/** Converts what someone typed. Undefined when it can't tell the amount or unit. */
export function convertText(input: string): Conversion | undefined {
  const s = input.trim().replace(/º/g, '°');
  const m = s.match(LEAD);
  if (!m) return undefined;
  const amount = parseNumber(m[2]);
  if (!(amount > 0)) return undefined;
  const rest = s.slice(m[0].length).trim();
  // Longest unit phrase first ("fl oz", "degrees f"), then the rest is the ingredient.
  const words = rest.split(/\s+/);
  let unit: U | undefined, used = 0;
  for (let n = Math.min(2, words.length); n >= 1 && !unit; n--) {
    const phrase = words.slice(0, n).join(' ').replace(/\.$/, '');
    unit = UNITS.find((u) => u.re.test(phrase));
    if (unit) used = n;
  }
  if (!unit) return undefined;
  const what = words.slice(used).join(' ').replace(/^of\s+/i, '');
  const unitName = unit.name === 'cup' && amount > 1 ? 'cups' : ['pint', 'quart'].includes(unit.name) && amount > 1 ? unit.name + 's' : unit.name;
  const from = `${nice(amount)} ${unitName}${what ? ' ' + what : ''}`;

  if (unit.kind === 'temp') {
    const c = unit.name === '°F' ? ((amount - 32) * 5) / 9 : amount;
    const f = unit.name === '°C' ? (amount * 9) / 5 + 32 : amount;
    const res: Result[] = unit.name === '°F' ? [{ value: String(Math.round(c)), unit: '°C' }] : [{ value: String(Math.round(f)), unit: '°F' }];
    return { from, results: res };
  }

  const base = amount * unit.size; // ml or g
  const density = gramsPerCup(what);
  const out: Result[] = [];
  if (unit.kind === 'vol') {
    if (density) out.push({ value: round((base / 236.6) * density), unit: 'g', note: `typical weight for ${what}` });
    for (const t of ['ml', 'l', 'tsp', 'tbsp', 'cup', 'fl oz']) add(out, base, t, unit.name);
  } else {
    for (const t of ['g', 'kg', 'oz', 'lb']) add(out, base, t, unit.name);
    if (density) out.push({ value: nice(base / density), unit: base / density > 1 ? 'cups' : 'cup', note: `typical volume for ${what}` });
  }
  return { from, results: out };
}

function add(out: Result[], base: number, target: string, from: string) {
  if (target === from) return;
  const u = UNITS.find((x) => x.name === target)!;
  const v = base / u.size;
  if (v < 0.05 || v > 5000) return; // silly sizes ("0.001 l", "4000 tsp")
  if ((target === 'l' && v < 0.25) || (target === 'kg' && v < 0.25)) return;
  out.push({ value: target === 'ml' || target === 'g' ? round(v) : nice(Math.round(v * 8) / 8 || v), unit: target === 'cup' && v > 1 ? 'cups' : target });
}
