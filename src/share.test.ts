import { expect, it } from 'vitest';
import { decodeRecipe, encodeRecipe } from './share';

it('round-trips a recipe through a compact string', async () => {
  const r = {
    id: 'x', title: 'Chicken tikka', categories: ['Dinner'], servings: 4,
    ingredients: Array.from({ length: 15 }, (_, i) => `${i + 1} tbsp something number ${i}`),
    instructions: Array.from({ length: 8 }, () => 'Stir the pot gently over medium heat until it thickens a little.'),
    notes: 'Less salt next time', createdAt: 1, updatedAt: 2,
  };
  const s = await encodeRecipe(r);
  expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
  expect(s.length).toBeLessThan(1000);
  const back = await decodeRecipe(s);
  expect(back.title).toBe('Chicken tikka');
  expect(back.ingredients).toEqual(r.ingredients);
});
