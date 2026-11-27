/* Cleaning up text read from a photo: common misreads, and re-joining lines that a narrow
   cookbook column wrapped ("1 teaspoon ground" / "sumac" -> "1 teaspoon ground sumac"). */

const FRACTION_MISREADS: [RegExp, string][] = [
  [/^(?:Ya|¥a|Y4|V4|v4|%4)(?=\s)/, '¼'],
  [/^(?:Y%|%|¥%)(?=\s+(?:cups?|teaspoons?|tablespoons?|tsp|tbsp|pound|lb))/i, '¾'],
  [/^1\/,(?=\s)/, '½'],
  [/^(?:1;|1,|Y2|V2|v2|¥%|3%|Vz)(?=\s+(?:cups?|teaspoons?|tablespoons?|tsp|tbsp|small|medium|large|pound|lb|oz|ounce))/i, '½'],
];

export function tidyLine(l: string): string {
  let t = l.replace(/[|]/g, 'l').replace(/^[«»•·*©®]\s*/, '').replace(/[ \t]+/g, ' ').trim();
  for (const [re, f] of FRACTION_MISREADS) t = t.replace(re, f);
  return t.replace(/(\d) ?\/ ?(\d)/g, '$1/$2').replace(/\b(?:Ya|¥a|Y4)-inch/g, '¼-inch').replace(/\b(?:Y2|1;)-inch/g, '½-inch');
}

/** Joins wrapped lines. `kind` decides how: ingredients wrap onto lines starting in lowercase;
    steps are paragraphs separated by blank lines. */
export function joinWrapped(text: string, kind: 'ingredients' | 'steps' | 'title'): string[] {
  const raw = text.split(/\r?\n/).map(tidyLine);
  if (kind === 'title') return [raw.filter(Boolean).join(' ')];
  const out: string[] = [];
  let blank = true;
  for (const l of raw) {
    if (!l || l.length < 2 && !/\d/.test(l)) { blank = true; continue; }
    const prev = out[out.length - 1] ?? '';
    // Steps: a paragraph continues until a blank line that follows a finished sentence.
    const cont = kind === 'steps' ? !blank || !/[.!?:)]$/.test(prev) : /^[a-z(]/.test(l);
    if (cont && out.length) out[out.length - 1] += ' ' + l;
    else out.push(l);
    blank = false;
  }
  return out.map((l) => l.replace(/(\w)- (\w)/g, '$1$2'));
}
