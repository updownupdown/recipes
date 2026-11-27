import type { Recipe } from './types';

type Shared = Pick<Recipe, 'id' | 'title' | 'categories' | 'servings' | 'ingredients' | 'instructions' | 'notes' | 'source'>;

function toB64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64Url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([data as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodeRecipe(r: Recipe): Promise<string> {
  const s: Shared = {
    id: r.id, title: r.title, categories: r.categories, servings: r.servings,
    ingredients: r.ingredients, instructions: r.instructions, notes: r.notes, source: r.source,
  };
  const json = new TextEncoder().encode(JSON.stringify(s));
  return toB64Url(await pipe(json, new CompressionStream('deflate-raw')));
}

export async function decodeRecipe(data: string): Promise<Shared> {
  const bytes = await pipe(fromB64Url(data), new DecompressionStream('deflate-raw'));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function shareUrl(r: Recipe): Promise<string> {
  const base = location.origin + import.meta.env.BASE_URL;
  return `${base}#/r/${await encodeRecipe(r)}`;
}
