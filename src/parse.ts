import type { RecipeDraft } from './types';

const ING = /^(ingredients?|you(?:'ll)? need|what you need)\s*:?$/i;
const INS = /^(instructions?|directions?|method|steps?|preparation|how to make( it)?)\s*:?$/i;
const NOTES = /^(notes?|tips?|variations?)\s*:?$/i;
const SERVES = /\b(?:serves|servings?|yield|makes)\s*:?\s*(\d+)/i;
const URL_RE = /https?:\/\/\S+/;

function clean(line: string): string {
  return line
    .replace(/^\s*(?:[-*•▢□☐]|\d+[.)])\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Best-effort parse of pasted text into a recipe draft. The user reviews before saving. */
export function parseRecipeText(text: string): RecipeDraft {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  let title = '';
  let servings: number | undefined;
  let source: string | undefined;
  const ingredients: string[] = [];
  const instructions: string[] = [];
  const notes: string[] = [];
  let mode: 'pre' | 'ing' | 'ins' | 'notes' = 'pre';
  const pre: string[] = [];

  for (const raw of lines) {
    if (!raw) continue;
    if (ING.test(raw)) { mode = 'ing'; continue; }
    if (INS.test(raw)) { mode = 'ins'; continue; }
    if (NOTES.test(raw)) { mode = 'notes'; continue; }
    const sv = raw.match(SERVES);
    if (sv && !servings && raw.length < 40) { servings = parseInt(sv[1]); continue; }
    if (!source && URL_RE.test(raw) && mode !== 'notes') source = raw.match(URL_RE)![0];
    if (mode === 'pre') pre.push(raw);
    else if (mode === 'ing') {
      // A short line ending with ":" inside ingredients is a sub-section ("For the sauce:").
      if (/:$/.test(raw) && raw.length < 40) ingredients.push('# ' + raw.replace(/:$/, ''));
      else ingredients.push(clean(raw));
    } else if (mode === 'ins') instructions.push(clean(raw));
    else notes.push(raw);
  }

  title = pre.shift() ?? 'Untitled recipe';
  // No headings found: guess. Lines starting with an amount are ingredients, longer lines are steps.
  if (!ingredients.length && !instructions.length) {
    for (const l of pre.splice(0)) {
      if (/^[\d½¼¾⅓⅔⅛]/.test(l) && l.length < 80) ingredients.push(clean(l));
      else if (l.length > 60) instructions.push(clean(l));
      else ingredients.push(clean(l));
    }
  }
  const extra = pre.filter((l) => l !== source);
  return {
    title: title.replace(/^#+\s*/, ''),
    categories: [],
    servings,
    ingredients,
    instructions,
    notes: [...extra, ...notes].join('\n') || undefined,
    source,
  };
}
