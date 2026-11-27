const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 1 / 2, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 1 / 4, '¾': 3 / 4, '⅕': 1 / 5, '⅖': 2 / 5,
  '⅗': 3 / 5, '⅘': 4 / 5, '⅙': 1 / 6, '⅚': 5 / 6, '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8,
};
const UF = Object.keys(UNICODE_FRACTIONS).join('');

// One number: "1 1/2", "1½", "½", "1/2", "1.5", "1,5", "2"
const NUM = `(?:\\d+\\/\\d+|\\d+(?:[.,]\\d+)?(?:\\s*[${UF}]|\\s+\\d+\\/\\d+)?|[${UF}])`;
export const LEAD = new RegExp(`^(\\s*)(${NUM})(?:(\\s*(?:-|–|to|or)\\s*)(${NUM}))?`);

export function parseNumber(s: string): number {
  s = s.trim().replace(',', '.');
  let total = 0;
  for (const part of s.split(/\s+/)) {
    const m = part.match(new RegExp(`^(\\d+(?:\\.\\d+)?)?([${UF}])?$`));
    if (m && (m[1] || m[2])) {
      total += (m[1] ? parseFloat(m[1]) : 0) + (m[2] ? UNICODE_FRACTIONS[m[2]] : 0);
      continue;
    }
    const f = part.match(/^(\d+)\/(\d+)$/);
    if (f) total += parseInt(f[1]) / parseInt(f[2]);
  }
  return total;
}

const NICE: [number, string][] = [
  [0, ''], [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'], [1 / 2, '½'],
  [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [7 / 8, '⅞'], [1, ''],
];

export function formatNumber(n: number): string {
  if (n <= 0) return '0';
  if (n >= 10) return String(Math.round(n));
  let whole = Math.floor(n);
  const frac = n - whole;
  let best = NICE[0];
  for (const c of NICE) if (Math.abs(c[0] - frac) < Math.abs(best[0] - frac)) best = c;
  if (Math.abs(best[0] - frac) > 0.04) {
    // Not close to a friendly fraction: one decimal.
    return String(Math.round(n * 10) / 10);
  }
  if (best[0] === 1) whole += 1;
  const f = best[0] === 1 ? '' : best[1];
  if (whole === 0) return f || '0';
  return `${whole}${f}`;
}

/** Scale the leading amount of an ingredient line. Lines without one are returned unchanged. */
export function scaleLine(line: string, factor: number): string {
  if (factor === 1 || line.startsWith('#')) return line;
  const m = line.match(LEAD);
  if (!m) return line;
  const [all, ws, a, sep, b] = m;
  const out = formatNumber(parseNumber(a) * factor) + (b ? sep + formatNumber(parseNumber(b) * factor) : '');
  return ws + out + line.slice(all.length);
}

/** Split a line into [amount, rest] for display. */
export function splitAmount(line: string): [string, string] {
  const m = line.match(LEAD);
  if (!m) return ['', line];
  let amount = m[0].trim();
  let rest = line.slice(m[0].length);
  // Pull a unit along with the amount for nicer columns.
  const u = rest.match(/^\s*(fl\.?\s*oz|cups?|c\.|tbsps?|tablespoons?|tsps?|teaspoons?|g|kg|grams?|ml|cl|dl|l|liters?|litres?|oz|ounces?|lbs?|pounds?|pints?|quarts?|cans?|cloves?|pinch(?:es)?|dash(?:es)?|sticks?|packages?|pkg)\b\.?/i);
  if (u) {
    amount += ' ' + u[0].trim();
    rest = rest.slice(u[0].length);
  }
  return [amount, rest.trim()];
}
