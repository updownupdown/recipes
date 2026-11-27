import { formatNumber, LEAD, parseNumber } from './quantity';

/* Unit switching for ingredient lines and oven temperatures.
   "metric" turns cups/oz/lb into grams or ml, "us" turns grams/ml into cups/oz/lb.
   Teaspoons and tablespoons are left alone: they are the same spoons everywhere.
   Cups of common dry ingredients (flour, sugar, butter…) become grams, using typical weights. */

export type UnitSystem = 'orig' | 'metric' | 'us';

type Kind = 'vol' | 'mass';
interface Unit { kind: Kind; size: number /* ml or g */; system: 'us' | 'metric' | 'both' }

const UNITS: [RegExp, string, Unit][] = [
  [/^(?:fl\.?\s*oz\.?|fluid\s+ounces?)/i, 'fl oz', { kind: 'vol', size: 29.57, system: 'us' }],
  [/^(?:cups?|c\.)(?![a-z])/i, 'cup', { kind: 'vol', size: 236.6, system: 'us' }],
  [/^(?:tablespoons?|tbsps?\.?|tbs\.?)(?![a-z])/i, 'tbsp', { kind: 'vol', size: 14.79, system: 'both' }],
  [/^(?:teaspoons?|tsps?\.?)(?![a-z])/i, 'tsp', { kind: 'vol', size: 4.93, system: 'both' }],
  [/^(?:pints?|pt\.?)(?![a-z])/i, 'pint', { kind: 'vol', size: 473.2, system: 'us' }],
  [/^(?:quarts?|qts?\.?)(?![a-z])/i, 'quart', { kind: 'vol', size: 946.4, system: 'us' }],
  [/^(?:gallons?|gal\.?)(?![a-z])/i, 'gallon', { kind: 'vol', size: 3785, system: 'us' }],
  [/^(?:millilit(?:re|er)s?|ml)(?![a-z])/i, 'ml', { kind: 'vol', size: 1, system: 'metric' }],
  [/^(?:cl)(?![a-z])/i, 'cl', { kind: 'vol', size: 10, system: 'metric' }],
  [/^(?:dl)(?![a-z])/i, 'dl', { kind: 'vol', size: 100, system: 'metric' }],
  [/^(?:lit(?:re|er)s?|l)(?![a-z])/i, 'l', { kind: 'vol', size: 1000, system: 'metric' }],
  [/^(?:kilograms?|kgs?)(?![a-z])/i, 'kg', { kind: 'mass', size: 1000, system: 'metric' }],
  [/^(?:grams?|gr?)(?![a-z])/i, 'g', { kind: 'mass', size: 1, system: 'metric' }],
  [/^(?:ounces?|oz\.?)(?![a-z])/i, 'oz', { kind: 'mass', size: 28.35, system: 'us' }],
  [/^(?:pounds?|lbs?\.?)(?![a-z])/i, 'lb', { kind: 'mass', size: 453.6, system: 'us' }],
];

// Typical grams per US cup for dry or solid ingredients (liquids stay as ml). Most specific first.
const GRAMS_PER_CUP: [RegExp, number][] = [
  [/almond (?:flour|meal)/i, 96],
  [/(?:bread|00) flour/i, 130],
  [/whole[- ]wheat flour/i, 120],
  [/coconut flour/i, 112],
  [/flour/i, 125],
  [/(?:powdered|icing|confectioners'?) sugar/i, 120],
  [/brown sugar/i, 220],
  [/sugar/i, 200],
  [/butter(?!milk)/i, 227],
  [/cocoa/i, 85],
  [/corn ?starch|corn ?flour/i, 128],
  [/(?:rolled )?oats/i, 90],
  [/chocolate chips?|chocolate chunks?/i, 170],
  [/peanut butter/i, 258],
  [/honey/i, 340],
  [/maple syrup/i, 315],
  [/breadcrumbs|panko/i, 108],
  [/parmesan|pecorino/i, 100],
  [/(?:shredded|grated) (?:cheddar|mozzarella|cheese)/i, 113],
  [/quinoa/i, 170],
  [/lentils/i, 190],
  [/\brice\b/i, 185],
  [/raisins/i, 150],
  [/(?:walnuts|pecans|almonds|cashews|hazelnuts|peanuts)/i, 120],
  [/shredded coconut|desiccated coconut/i, 85],
];

function gramsPerCup(rest: string): number | undefined {
  return GRAMS_PER_CUP.find(([re]) => re.test(rest))?.[1];
}

function roundMetric(n: number): number {
  if (n < 10) return Math.round(n);
  if (n < 100) return Math.round(n / 5) * 5;
  if (n < 1000) return Math.round(n / 10) * 10;
  return Math.round(n / 50) * 50;
}

/** 1250 -> "1.25", 14200 -> "14.2" (kg or l). */
const big = (n: number) => String(n >= 10000 ? Math.round(n / 100) / 10 : Math.round(n / 10) / 100);

function fmtMetric(n: number, kind: Kind): [string, string] {
  const r = roundMetric(n);
  if (r >= 1000) return [big(r), kind === 'mass' ? 'kg' : 'l'];
  return [String(Math.max(r, 1)), kind === 'mass' ? 'g' : 'ml'];
}

/** Picks a friendly US unit for an amount in ml or g. */
function usTarget(base: number, kind: Kind, density?: number): { size: number; label: (n: number) => string; kind: Kind } {
  if (kind === 'mass' && density) return { size: density, label: (n) => (n > 1 ? 'cups' : 'cup'), kind: 'vol' }; // g -> cups
  if (kind === 'mass') {
    return base >= 453.6 ? { size: 453.6, label: () => 'lb', kind } : { size: 28.35, label: () => 'oz', kind };
  }
  if (base < 14) return { size: 4.93, label: () => 'tsp', kind };
  if (base < 59) return { size: 14.79, label: () => 'tbsp', kind };
  return { size: 236.6, label: (n) => (n > 1 ? 'cups' : 'cup'), kind };
}

function roundUs(n: number): number {
  // Quarter steps keep fractions friendly (¼ ½ ¾); thirds are close enough to survive formatNumber.
  return n >= 10 ? Math.round(n) : Math.max(Math.round(n * 4) / 4, 0.125);
}

/** Converts the leading amount and unit of an ingredient line. Lines it can't read come back unchanged. */
export function convertLine(line: string, system: UnitSystem): string {
  if (system === 'orig' || line.startsWith('#')) return line;
  const m = line.match(LEAD);
  if (!m) return line;
  const [all, ws, a, sep, b] = m;
  const after = line.slice(all.length);
  const space = after.match(/^\s*/)![0];
  const unitText = after.slice(space.length);
  const hit = UNITS.find(([re]) => re.test(unitText));
  if (!hit) return line;
  const [re, , unit] = hit;
  if (unit.system === 'both' || unit.system === system) return line;
  const rest = unitText.replace(re, '');
  const nums = [parseNumber(a), ...(b ? [parseNumber(b)] : [])];
  const density = gramsPerCup(rest);

  let out: string[];
  let label: string;
  if (system === 'metric') {
    // Volume of a known dry ingredient -> grams; other volumes -> ml; mass -> g.
    const toMass = unit.kind === 'vol' && density;
    const base = nums.map((n) => (toMass ? (n * unit.size * density) / 236.6 : n * unit.size));
    const kind: Kind = toMass ? 'mass' : unit.kind;
    const top = fmtMetric(Math.max(...base), kind);
    label = top[1];
    const div = label === 'kg' || label === 'l' ? 1000 : 1;
    out = base.map((x) => (div === 1 ? fmtMetric(x, kind)[0] : big(roundMetric(x))));
  } else {
    const base = nums.map((n) => n * unit.size);
    const t = usTarget(Math.max(...base), unit.kind, unit.kind === 'mass' ? density : undefined);
    const vals = base.map((x) => roundUs(x / t.size));
    out = vals.map(formatNumber);
    label = t.label(Math.max(...vals));
  }
  return ws + out.join(sep ?? '') + ' ' + label + rest;
}

/** Converts oven temperatures in a step ("350°F" <-> "175°C"). */
export function convertTemps(text: string, system: UnitSystem): string {
  if (system === 'orig') return text;
  return text.replace(/(\d{2,3})\s*(?:°|º|degrees?\s*)?\s*([FC])\b/g, (all, n, u) => {
    const v = +n;
    if (system === 'metric' && u === 'F') return `${Math.round(((v - 32) * 5) / 9 / 5) * 5}°C`;
    if (system === 'us' && u === 'C') return `${Math.round(((v * 9) / 5 + 32) / 5) * 5}°F`;
    return all;
  });
}

/** The leading amount of a line as a number (first of a range), or undefined. */
export function leadingAmount(line: string): number | undefined {
  const m = line.match(LEAD);
  if (!m) return undefined;
  const n = parseNumber(m[2]);
  return n > 0 ? n : undefined;
}
