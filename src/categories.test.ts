import { expect, it } from 'vitest';
import { canonicalCategory, categoryLook, guessCategory, recipeLook, CATALOG } from './categories';

it('knows aliases and spelling variants', () => {
  expect(categoryLook('soups').name).toBe('Soup');
  expect(categoryLook('Korean').icon).toBe('pepper');
  expect(categoryLook('québec').name).toBe('Québécois');
  expect(canonicalCategory('bbq')).toBe('Grill & BBQ');
  expect(CATALOG.length).toBeGreaterThan(60);
});
it('gives unknown categories a stable look', () => {
  const a = categoryLook("Grandma's");
  expect(a.known).toBe(false);
  expect(categoryLook("Grandma's").hue).toEqual(a.hue);
});
it('guesses from title, then ingredients', () => {
  expect(guessCategory('Thai Coconut Red Lentil Soup')?.name).toBe('Soup');
  expect(guessCategory('Mystery dish', 'gochujang, rice')?.name).toBe('Korean');
  expect(recipeLook({ title: 'Palak Paneer', categories: [] }).name).toBe('Indian');
  expect(recipeLook({ title: 'X', categories: ['My stuff', 'Dessert'] }).name).toBe('Dessert');
});
