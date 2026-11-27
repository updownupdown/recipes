import { expect, it } from 'vitest';
import { fixCaps, isAllCaps, sentenceCase, titleCase } from './caps';

it('detects all caps', () => {
  expect(isAllCaps('GRANDMA’S APPLE PIE')).toBe(true);
  expect(isAllCaps('2 cups FLOUR')).toBe(false);
  expect(isAllCaps('1 TBSP')).toBe(true);
  expect(isAllCaps('TBS')).toBe(false);
});

it('converts case', () => {
  expect(titleCase('GRANDMA’S APPLE PIE WITH A CRUMB TOP')).toBe('Grandma’s Apple Pie with a Crumb Top');
  expect(sentenceCase('PREHEAT OVEN TO 350F. BAKE 1 HOUR.')).toBe('Preheat oven to 350°F. Bake 1 hour.');
  expect(sentenceCase('2 CUPS FLOUR')).toBe('2 cups flour');
});

it('fixes only shouting lines', () => {
  const r = fixCaps({ title: 'BANANA BREAD', ingredients: ['# FOR THE TOPPING', '3 BANANAS', '1 cup Sugar'], instructions: ['MASH.'], notes: undefined });
  expect(r).toEqual({ title: 'Banana Bread', ingredients: ['# For the Topping', '3 bananas', '1 cup Sugar'], instructions: ['Mash.'], notes: undefined });
});
