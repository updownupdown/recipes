import { expect, it } from 'vitest';
import { parseRecipeText } from './parse';

it('parses a typical pasted recipe', () => {
  const r = parseRecipeText(`Banana Bread
Serves 8

Ingredients
- 3 ripe bananas
- 1/3 cup melted butter
For the topping:
- 1 tbsp sugar

Instructions
1. Preheat oven to 350F.
2. Mash bananas and mix.

Notes
From grandma`);
  expect(r.title).toBe('Banana Bread');
  expect(r.servings).toBe(8);
  expect(r.ingredients).toEqual(['3 ripe bananas', '1/3 cup melted butter', '# For the topping', '1 tbsp sugar']);
  expect(r.instructions).toEqual(['Preheat oven to 350F.', 'Mash bananas and mix.']);
  expect(r.notes).toBe('From grandma');
});
