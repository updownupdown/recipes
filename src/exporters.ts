import type { Recipe } from './types';

/** A short step line ending in ":" is a sub-heading ("For the sauce:"), not a step. */
export const isStepHeading = (s: string) => s.length < 48 && s.endsWith(':');

export function toJSON(recipes: Recipe[]): string {
  return JSON.stringify({ app: 'MyRecipes', version: 1, exportedAt: new Date().toISOString(), recipes }, null, 2);
}

export function fromJSON(text: string): Recipe[] {
  const data = JSON.parse(text);
  const list: unknown[] = Array.isArray(data) ? data : Array.isArray(data.recipes) ? data.recipes : [data];
  const now = Date.now();
  return list.map((x) => {
    const r = x as Partial<Recipe>;
    if (!r.title) throw new Error('A recipe in this file has no title.');
    return {
      id: r.id ?? crypto.randomUUID(),
      title: r.title,
      categories: r.categories ?? [],
      servings: r.servings,
      ingredients: r.ingredients ?? [],
      instructions: r.instructions ?? [],
      notes: r.notes,
      source: r.source,
      time: r.time,
      favorite: r.favorite,
      cookNext: r.cookNext,
      createdAt: r.createdAt ?? now,
      updatedAt: r.updatedAt ?? now,
      deleted: r.deleted,
    };
  });
}

export function toText(recipes: Recipe[]): string {
  return recipes
    .map((r) => {
      const out = [r.title.toUpperCase()];
      const meta = [r.categories.join(', '), r.time ?? '', r.servings ? `Serves ${r.servings}` : '', r.source ?? ''].filter(Boolean);
      if (meta.length) out.push(meta.join(' · '));
      out.push('', 'INGREDIENTS');
      for (const l of r.ingredients) out.push(l.startsWith('#') ? `\n${l.slice(1).trim()}:` : `- ${l}`);
      if (r.instructions.length) {
        out.push('', 'INSTRUCTIONS');
        let n = 0;
        for (const l of r.instructions) out.push(isStepHeading(l) ? `\n${l}` : `${++n}. ${l}`);
      }
      if (r.notes) out.push('', 'NOTES', r.notes);
      return out.join('\n');
    })
    .join('\n\n' + '-'.repeat(40) + '\n\n');
}

export function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'recipe';
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const linkify = (s: string) => esc(s).replace(/https?:\/\/[^\s<)]+/g, (u) => `<a href="${u}">${u}</a>`);

/** HTML that Google Drive converts into a nicely formatted Google Doc. */
export function toHTML(recipes: Recipe[]): string {
  const body = recipes
    .map((r, i) => {
      const out = [`<h1${i ? ' style="page-break-before:always"' : ''}>${esc(r.title)}</h1>`];
      const meta = [r.categories.join(', '), r.time ?? '', r.servings ? `Serves ${r.servings}` : ''].filter(Boolean).join(' · ');
      if (meta || r.source) out.push(`<p><i>${esc(meta)}${meta && r.source ? ' · ' : ''}${r.source ? linkify(r.source) : ''}</i></p>`);
      out.push('<h2>Ingredients</h2><ul>');
      for (const l of r.ingredients) out.push(l.startsWith('#') ? `</ul><h3>${esc(l.replace(/^#+\s*/, ''))}</h3><ul>` : `<li>${esc(l)}</li>`);
      out.push('</ul>');
      if (r.instructions.length) out.push('<h2>Instructions</h2><ol>', ...r.instructions.map((s) => (isStepHeading(s) ? `</ol><h3>${esc(s.slice(0, -1))}</h3><ol>` : `<li>${esc(s)}</li>`)), '</ol>');
      if (r.notes) out.push('<h2>Notes</h2>', ...r.notes.split('\n').map((p) => `<p>${linkify(p)}</p>`));
      return out.join('');
    })
    .join('');
  return `<html><body>${body}</body></html>`;
}
