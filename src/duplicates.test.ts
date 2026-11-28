import { expect, it } from 'vitest';
import { findDuplicates, mergeInto, onlyIn, similarity } from './duplicates';
import type { Recipe } from './types';

const r = (id: string, title: string, ingredients: string[], extra: Partial<Recipe> = {}): Recipe =>
  ({ id, title, categories: [], ingredients, instructions: [], createdAt: 1, updatedAt: 1, ...extra });

const cassoulet = ['1 lb white beans', '2 duck legs', '1 lb pork shoulder', '4 garlic cloves', '1 onion', 'thyme'];

it('pairs the same recipe saved twice, not just similar ones', () => {
  const list = [
    r('1', 'Kohlrabi Brandade', ['2 kohlrabi', '1 cup milk', '3 garlic cloves', 'olive oil']),
    r('2', 'Vegetarian Kohlrabi Brandade', ['2 kohlrabi, peeled', '1 cup milk', '3 garlic cloves', 'olive oil']),
    r('3', 'Traditional French Cassoulet', cassoulet),
    r('4', 'Cassoulet', [...cassoulet, 'bay leaf']),
    r('5', 'Tofu Bacon', ['1 block tofu', 'soy sauce', 'maple syrup', 'liquid smoke']),
    r('6', 'Tempeh Bacon', ['1 package tempeh', 'soy sauce', 'maple syrup', 'smoked paprika']),
    r('7', 'Thai Peanut Butter Sauce', ['peanut butter', 'soy sauce', 'lime', 'garlic']),
    r('8', 'Peanut Butter Thai Stir Fry', ['peanut butter', 'soy sauce', 'lime', 'garlic', 'noodles', 'broccoli', 'carrots']),
  ];
  const pairs = findDuplicates(list).map((p) => [p.a.id, p.b.id].join('-'));
  expect(pairs).toContain('1-2');
  expect(pairs).toContain('3-4');
  expect(pairs).not.toContain('5-6');
  expect(pairs).not.toContain('7-8');
  expect(similarity(list[0], list[0])).toBe(1);
});

it('merges extras into the kept version', () => {
  const keep = r('1', 'Soup', ['1 onion'], { categories: ['Soup'], notes: 'Freezes well' });
  const drop = r('2', 'Soup', ['1 onion'], { categories: ['Mains'], favorite: true, servings: 4, notes: 'From Mom' });
  expect(mergeInto(keep, drop)).toMatchObject({ id: '1', categories: ['Soup', 'Mains'], favorite: true, servings: 4, notes: 'Freezes well\n\nFrom Mom' });
  expect(onlyIn(['1 onion', '2 carrots'], ['1 Onion.'])).toEqual(['2 carrots']);
});
