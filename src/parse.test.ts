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

import md from './fixtures/markdown-recipes.md?raw';
import { parseRecipes } from './parse';

it('reads a Markdown file with several recipes', () => {
  const rs = parseRecipes(md);
  expect(rs).toHaveLength(3);
  for (const r of rs) {
    expect(r.ingredients.length).toBeGreaterThan(4);
    expect(r.instructions.length).toBeGreaterThan(4);
    expect(r.servings).toBeGreaterThan(1);
    expect(r.title).not.toMatch(/[#*]/);
    expect(r.ingredients.join('\n')).not.toMatch(/^\*|\*\*/m);
  }
  expect(rs[0].title).toBe('Garlic Greens With Lemon');
  expect(rs[0].ingredients[0]).toBe('1 pound greens, trimmed and chopped');
  expect(rs[0].instructions[0]).toMatch(/^Heat a glug/);
  expect(rs[0].notes).toMatch(/^Serves 4\. Any sturdy/);
});

it('handles other common layouts', () => {
  const r = parseRecipeText(`# **Lemon Cake**
Prep time: 15 min
Total time: 1 hour
Yield: 12 slices

### Ingredients:
**For the cake**
- 2 cups flour
- 1 cup sugar
**Glaze**
* 1 cup icing sugar

## Method
Step 1: Heat the oven to 350F.
Step 2: Mix everything and
bake for 40 minutes.
Note: keeps for 3 days.`);
  expect(r.title).toBe('Lemon Cake');
  expect(r.servings).toBe(12);
  expect(r.time).toBe('1 h');
  expect(r.ingredients).toEqual(['# For the cake', '2 cups flour', '1 cup sugar', '# Glaze', '1 cup icing sugar']);
  expect(r.instructions).toEqual(['Heat the oven to 350F.', 'Mix everything and bake for 40 minutes.']);
  expect(r.notes).toBe('keeps for 3 days.');
});

it('keeps a single pasted recipe as one', () => {
  expect(parseRecipes('Toast\nIngredients\n1 slice bread\nSteps\nToast it.')).toHaveLength(1);
});

it('drops page clutter copied from recipe sites', () => {
  const r = parseRecipeText(`Best Chili Recipe | Tasty Site
Jump to Recipe
Print Recipe
★★★★★ 4.8 from 120 votes
Ingredients for 6 people
▢ 1 lb beef
▢ 1 onion
Advertisement
Instructions
1. Brown the beef. 2. Add the onion. 3. Simmer for 1 hour.
Nutrition
Calories: 400kcal
Protein: 30g`);
  expect(r.title).toBe('Best Chili');
  expect(r.servings).toBe(6);
  expect(r.ingredients).toEqual(['1 lb beef', '1 onion']);
  expect(r.instructions).toEqual(['Brown the beef.', 'Add the onion.', 'Simmer for 1 hour.']);
  expect(r.notes).toBeUndefined();
});
