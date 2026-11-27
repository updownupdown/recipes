import Dexie, { type Table } from 'dexie';
import { newId, type Recipe, type RecipeDraft } from './types';

class RecipeDB extends Dexie {
  recipes!: Table<Recipe, string>;
  constructor() {
    super('myrecipes');
    this.version(1).stores({ recipes: 'id, title, updatedAt, deleted' });
  }
}

export const db = new RecipeDB();

export async function allRecipes(): Promise<Recipe[]> {
  const list = await db.recipes.toArray();
  return list.filter((r) => !r.deleted).sort((a, b) => a.title.localeCompare(b.title));
}

export async function saveRecipe(draft: RecipeDraft): Promise<Recipe> {
  const now = Date.now();
  const existing = draft.id ? await db.recipes.get(draft.id) : undefined;
  const recipe: Recipe = {
    ...draft,
    id: draft.id ?? newId(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    deleted: undefined,
  };
  await db.recipes.put(recipe);
  return recipe;
}

export async function deleteRecipe(id: string): Promise<void> {
  const r = await db.recipes.get(id);
  if (!r) return;
  const now = Date.now();
  await db.recipes.put({ ...r, deleted: now, updatedAt: now });
}

/** Merge incoming recipes (from import or sync). Newest updatedAt wins per id. Returns count changed. */
export async function mergeRecipes(incoming: Recipe[]): Promise<number> {
  let changed = 0;
  await db.transaction('rw', db.recipes, async () => {
    for (const r of incoming) {
      const cur = await db.recipes.get(r.id);
      if (!cur || r.updatedAt > cur.updatedAt) {
        await db.recipes.put(r);
        changed++;
      }
    }
  });
  return changed;
}
