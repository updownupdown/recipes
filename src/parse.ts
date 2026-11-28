import type { RecipeDraft } from './types';
import { formatTime, parseTime } from './editRows';

/* Best-effort reading of recipe text people paste or import: plain text, Markdown, copied web pages.
   It looks for section headings (Ingredients, Steps, Notes…), works with Markdown (## headings,
   **bold**, * bullets, numbered lists), and falls back to guessing when there are no headings. */

const ING = /^(ingredients?|ingredient list|you(?:'ll| will)? need|what you(?:'ll)? need|shopping list)$/i;
const INS = /^(instructions?|directions?|method|steps?|preparation|prep|how to make(?: it)?|how to cook|procedure|to make)$/i;
const NOTES = /^(notes?|cook'?s notes?|tips?|variations?|to serve|serving suggestions?|storage|make ahead)$/i;
const META = /^(prep(?:aration)? time|cook(?:ing)? time|total time|time|serves|servings?|yield|makes|portions?|source|from|adapted from|course|cuisine|category|categories|keywords?|calories)$/i;
const SERVES = /\b(?:serves|servings?|yield|yields|makes|portions?|feeds)\b\s*:?\s*(?:about\s+)?(\d+)/i;
const URL_RE = /https?:\/\/[^\s)>\]]+/;
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,}|={3,})\s*$/;

/** Strips Markdown decoration: "## **Ingredients:**" -> "Ingredients:". */
function plain(line: string): string {
  return line
    .replace(/^\s*>+\s?/, '')
    .replace(/^\s*#{1,6}\s+/, '')
    .replace(/\*\*(.+?)\*\*|__(.+?)__/g, '$1$2')
    .replace(/(^|\s)[*_]([^*_]+)[*_](?=\s|$|[.,;:!?])/g, '$1$2')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1 ($2)')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A line that is only a heading word, possibly with a colon or a note in brackets. */
function heading(line: string): string | undefined {
  const m = plain(line).replace(/\s*\([^)]*\)\s*$/, '').match(/^([^:]{2,40}?)\s*:?$/);
  return m ? m[1].trim() : undefined;
}

/** "Notes: Serves 4." -> ["Notes", "Serves 4."] */
function labelled(line: string): [string, string] | undefined {
  const m = plain(line).match(/^([A-Za-z' ]{2,24}):\s+(.+)$/);
  return m ? [m[1].trim(), m[2].trim()] : undefined;
}

const BULLET = /^\s*(?:[-*•▢□☐◦‣–—·+]|\[[ x]\]|\d{1,2}\s*[.)]|step\s*\d+\s*[.:)-]?|[a-z][.)])\s+/i;
function clean(line: string): string {
  return plain(line.replace(BULLET, '')).replace(/^step\s*\d+\s*[.:)-]?\s*/i, '').trim();
}
const startsWithAmount = (l: string) => /^(?:[\d½¼¾⅓⅔⅛⅜⅝⅞]|one |two |three |a (?:pinch|handful|few|dash|splash|little|bunch))/i.test(l);

function servingsFrom(s: string): number | undefined {
  const m = s.match(SERVES);
  const n = m ? parseInt(m[1]) : NaN;
  return n > 0 && n < 200 ? n : undefined;
}

/** Splits a file holding several recipes (separated by --- lines, or by repeated top headings). */
export function splitRecipes(text: string): string[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let parts: string[][] = [[]];
  for (const l of lines) {
    if (RULE.test(l)) parts.push([]);
    else parts[parts.length - 1].push(l);
  }
  parts = parts.flatMap(splitByHeadings);
  return parts.map((p) => p.join('\n').trim()).filter((p) => p && /\S/.test(p) && p.split('\n').some((l) => plain(l).length > 1));
}

/** Within one chunk, a new "# Title" heading after a recipe already has ingredients starts the next recipe. */
function splitByHeadings(lines: string[]): string[][] {
  const out: string[][] = [[]];
  let seenSection = false;
  for (const l of lines) {
    const isTitle = /^\s*#{1,3}\s+\S/.test(l) && !ING.test(heading(l) ?? '') && !INS.test(heading(l) ?? '') && !NOTES.test(heading(l) ?? '');
    if (isTitle && seenSection) { out.push([]); seenSection = false; }
    const h = heading(l);
    if (h && (ING.test(h) || INS.test(h))) seenSection = true;
    out[out.length - 1].push(l);
  }
  return out;
}

/** Parses every recipe in the text. Most pastes hold one; Markdown files can hold many. */
export function parseRecipes(text: string): RecipeDraft[] {
  const chunks = splitRecipes(text);
  return chunks.map(parseRecipeText).filter((r) => r.title !== 'Untitled recipe' || r.ingredients.length || r.instructions.length);
}

/** Best-effort parse of pasted text into a recipe draft. The user reviews before saving. */
export function parseRecipeText(text: string): RecipeDraft {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let servings: number | undefined;
  let time: string | undefined;
  let source: string | undefined;
  const ingredients: string[] = [];
  const instructions: string[] = [];
  const notes: string[] = [];
  let mode: 'pre' | 'ing' | 'ins' | 'notes' = 'pre';
  const pre: string[] = [];
  let lastStepNumbered = false;

  for (const raw of lines) {
    if (!raw.trim() || RULE.test(raw)) continue;
    const h = heading(raw);
    if (h && ING.test(h)) { mode = 'ing'; continue; }
    if (h && INS.test(h)) { mode = 'ins'; continue; }
    if (h && NOTES.test(h)) { mode = 'notes'; continue; }

    // "Notes: Serves 4. …", "Serves: 4", "Total time: 45 min", "Source: https://…"
    const lab = labelled(raw);
    if (lab) {
      const [k, v] = lab;
      if (NOTES.test(k)) {
        if (mode !== 'ins') mode = 'notes';
        servings ??= servingsFrom(v);
        notes.push(v);
        continue;
      }
      if (META.test(k) && mode !== 'ins') {
        if (/serv|yield|makes|portion/i.test(k)) servings ??= servingsFrom(k + ' ' + v);
        else if (/total time|^time$/i.test(k) || (/cook/i.test(k) && !time)) { const t = parseTime(v); time = t ? formatTime(...t) || v : v; }
        else if (/source|from/i.test(k) && URL_RE.test(v)) source ??= v.match(URL_RE)![0];
        if (/time|serv|yield|makes|portion/i.test(k)) continue;
      }
    }

    const line = plain(raw);
    if (!servings && line.length < 40 && mode !== 'ins') {
      const sv = servingsFrom(line);
      if (sv) { servings = sv; continue; }
    }
    if (!source && URL_RE.test(line) && mode !== 'notes') {
      source = line.match(URL_RE)![0];
      if (line.replace(URL_RE, '').replace(/^(source|from|via|recipe)\s*:?\s*/i, '').trim() === '') continue;
    }

    if (mode === 'pre') pre.push(line);
    else if (mode === 'ing') {
      // "For the sauce:" or a bold "**Sauce**" inside ingredients is a sub-section.
      const bold = /^\s*(?:\*\*|__)[^*_]+(?:\*\*|__)\s*:?\s*$/.test(raw);
      if (!BULLET.test(raw) && !startsWithAmount(line) && line.length < 40 && (/:$/.test(line) || bold || /^for the\b/i.test(line))) {
        ingredients.push('# ' + line.replace(/:$/, ''));
      } else {
        const c = clean(raw);
        if (c) ingredients.push(c);
      }
    } else if (mode === 'ins') {
      const numbered = /^\s*(?:\d{1,2}\s*[.)]|step\s*\d+)/i.test(raw);
      const c = clean(raw);
      if (!c) continue;
      // A wrapped line of a numbered step (no number of its own) joins the step above.
      if (!numbered && lastStepNumbered && instructions.length && !BULLET.test(raw) && /^[a-z(]/.test(c)) {
        instructions[instructions.length - 1] += ' ' + c;
        continue;
      }
      if (!BULLET.test(raw) && !numbered && c.length < 40 && /:$/.test(c)) instructions.push(c);
      else instructions.push(c);
      lastStepNumbered = numbered;
    } else notes.push(line);
  }

  const title = (pre.shift() ?? 'Untitled recipe').replace(/^recipe\s*:\s*/i, '');
  // No headings found: guess. Lines starting with an amount are ingredients, long sentences are steps.
  if (!ingredients.length && !instructions.length && pre.length) {
    for (const l of pre.splice(0)) {
      const c = clean(l);
      if (startsWithAmount(c) && c.length < 90) ingredients.push(c);
      else if (c.length > 60 || /^\d{1,2}[.)]\s/.test(l)) instructions.push(c);
      else ingredients.push(c);
    }
  }
  const extra = pre.filter((l) => l !== source);
  return {
    title,
    categories: [],
    servings,
    time,
    ingredients,
    instructions,
    notes: [...extra, ...notes].join('\n') || undefined,
    source,
  };
}
