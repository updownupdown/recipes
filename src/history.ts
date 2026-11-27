import { db } from './db';
import type { Recipe } from './types';

/* Restoring an old version or a deleted recipe. Restores are written as new edits (fresh updatedAt),
   so they sync to every device like any other change and can themselves be undone from history. */

const content = (r: Recipe) => JSON.stringify([r.title, r.categories, r.servings, r.time, r.ingredients, r.instructions, r.notes, r.source, !!r.favorite, !!r.cookNext]);

export interface VersionDiff { added: Recipe[]; removed: Recipe[]; changed: Recipe[]; total: number }

/** What restoring `version` would change compared with the recipes on this device now. */
export async function diffVersion(version: Recipe[]): Promise<VersionDiff> {
  const local = (await db.recipes.toArray()).filter((r) => !r.deleted);
  const localMap = new Map(local.map((r) => [r.id, r]));
  const live = version.filter((r) => !r.deleted);
  const ids = new Set(live.map((r) => r.id));
  return {
    added: live.filter((v) => !localMap.has(v.id)),
    removed: local.filter((l) => !ids.has(l.id)),
    changed: live.filter((v) => localMap.has(v.id) && content(localMap.get(v.id)!) !== content(v)),
    total: live.length,
  };
}

/** Make this device's recipes match `version`. Returns the number of recipes changed. */
export async function restoreVersion(version: Recipe[]): Promise<number> {
  const d = await diffVersion(version);
  const now = Date.now();
  await db.transaction('rw', db.recipes, async () => {
    for (const r of d.removed) await db.recipes.put({ ...r, deleted: now, updatedAt: now });
    for (const r of [...d.added, ...d.changed]) await db.recipes.put({ ...r, deleted: undefined, updatedAt: now });
  });
  return d.removed.length + d.added.length + d.changed.length;
}

export async function deletedRecipes(): Promise<Recipe[]> {
  return (await db.recipes.toArray()).filter((r) => r.deleted).sort((a, b) => b.deleted! - a.deleted!);
}

export async function undelete(id: string): Promise<void> {
  const r = await db.recipes.get(id);
  if (r) await db.recipes.put({ ...r, deleted: undefined, updatedAt: Date.now() });
}
