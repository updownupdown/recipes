export interface Recipe {
  id: string;
  title: string;
  categories: string[];
  servings?: number;
  /** One ingredient per line. Lines starting with "#" are section headers. */
  ingredients: string[];
  /** One step per line. */
  instructions: string[];
  /** Free text; URLs become links. */
  notes?: string;
  source?: string;
  createdAt: number;
  updatedAt: number;
  /** Tombstone: set when deleted so the delete can sync. */
  deleted?: number;
}

export type RecipeDraft = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };

export function newId(): string {
  return crypto.randomUUID();
}
