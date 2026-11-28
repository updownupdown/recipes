import { formatNumber, parseNumber } from './quantity';

/* Conversions pop-up: ready-made tables per type and direction, plus a custom amount converter for each. */

export type Dir = 'imp' | 'met';
export type Kind = 'oven' | 'weight' | 'vol';

const ML: Record<string, number> = { tsp: 4.93, tbsp: 14.79, cup: 236.6, 'fl oz': 29.57, ml: 1, l: 1000 };
const G: Record<string, number> = { oz: 28.35, lb: 453.6, g: 1, kg: 1000 };

/** Units the custom converter offers, per type and direction. */
export const FROM_UNITS: Record<Kind, Record<Dir, string[]>> = {
  oven: { imp: ['°F'], met: ['°C'] },
  weight: { imp: ['oz', 'lb'], met: ['g', 'kg'] },
  vol: { imp: ['cup', 'tbsp', 'tsp', 'fl oz'], met: ['ml', 'l'] },
};

const OVEN: [number, number][] = [[250, 120], [275, 140], [300, 150], [325, 165], [350, 180], [375, 190], [400, 200], [425, 220], [450, 230], [475, 245], [500, 260]];

export const TABLES: Record<Kind, Record<Dir, [string, string][]>> = {
  oven: {
    imp: OVEN.map(([f, c]) => [`${f}°F`, `${c}°C`]),
    met: OVEN.map(([f, c]) => [`${c}°C`, `${f}°F`]),
  },
  weight: {
    imp: [['1 oz', '28 g'], ['2 oz', '57 g'], ['4 oz', '113 g'], ['8 oz', '227 g'], ['12 oz', '340 g'], ['1 lb', '454 g'], ['2 lb', '907 g'], ['1 stick butter', '113 g']],
    met: [['25 g', '1 oz'], ['50 g', '1 3/4 oz'], ['100 g', '3 1/2 oz'], ['125 g', '4 1/2 oz'], ['250 g', '9 oz'], ['500 g', '1 lb 2 oz'], ['1 kg', '2 lb 3 oz']],
  },
  vol: {
    imp: [['1 tsp', '5 ml'], ['1 tbsp', '15 ml'], ['1/4 cup', '60 ml'], ['1/3 cup', '80 ml'], ['1/2 cup', '120 ml'], ['3/4 cup', '180 ml'], ['1 cup', '240 ml'], ['2 cups', '475 ml'], ['1 fl oz', '30 ml'], ['1 pint', '475 ml']],
    met: [['5 ml', '1 tsp'], ['15 ml', '1 tbsp'], ['50 ml', '3 1/2 tbsp'], ['100 ml', '1/3 cup + 2 tbsp'], ['125 ml', '1/2 cup'], ['250 ml', '1 cup'], ['500 ml', '2 cups'], ['1 l', '4 1/4 cups']],
  },
};

const plural = (n: string, u: string) => (u === 'cup' && n !== '1' && !/^\d\/\d$/.test(n) ? 'cups' : u);

/** Converts a custom amount ("1 1/2", "½", "2.5"). Undefined when the amount can't be read. */
export function convertAmount(kind: Kind, dir: Dir, amountText: string, unit: string): string | undefined {
  const t = amountText.trim();
  if (!t) return undefined;
  const a = parseNumber(t);
  if (!(a > 0) || !Number.isFinite(a)) return undefined;
  if (kind === 'oven') return dir === 'imp' ? `${Math.round(((a - 32) * 5) / 9)}°C` : `${Math.round((a * 9) / 5 + 32)}°F`;
  if (kind === 'weight') {
    const g = a * G[unit];
    if (dir === 'imp') return g >= 1000 ? `${Math.round(g / 10) / 100} kg` : `${Math.round(g)} g`;
    const oz = g / G.oz;
    if (oz < 16) return `${formatNumber(Math.round(oz * 4) / 4)} oz`;
    const lb = Math.floor(oz / 16), rest = Math.round(oz - lb * 16);
    return rest === 16 ? `${lb + 1} lb` : rest ? `${lb} lb ${rest} oz` : `${lb} lb`;
  }
  const ml = a * ML[unit];
  if (dir === 'imp') return ml >= 1000 ? `${Math.round(ml / 10) / 100} l` : `${Math.round(ml)} ml`;
  if (ml < 14) { const n = formatNumber(Math.round((ml / ML.tsp) * 4) / 4); return `${n} tsp`; }
  if (ml < 59) { const n = formatNumber(Math.round((ml / ML.tbsp) * 2) / 2); return `${n} tbsp`; }
  const n = formatNumber(Math.round((ml / ML.cup) * 8) / 8);
  return `${n} ${plural(n, 'cup')}`;
}
