import { expect, it } from 'vitest';
import { joinWrapped } from './ocrText';

it('joins wrapped ingredient lines', () => {
  const t = '» Serves 6\n1 teaspoon ground\nsumac\nYa cup plain whole-milk\nor low-fat yogurt\n(not Greek)\n1; teaspoon ground\ncumin\nHot sauce, such as';
  expect(joinWrapped(t, 'ingredients')).toEqual(['Serves 6', '1 teaspoon ground sumac', '¼ cup plain whole-milk or low-fat yogurt (not Greek)', '½ teaspoon ground cumin', 'Hot sauce, such as']);
});

it('joins step paragraphs', () => {
  const t = 'Stir together the yogurt,\nand herbs. Let it sit.\n\nToss the chick-\npeas.';
  expect(joinWrapped(t, 'steps')).toEqual(['Stir together the yogurt, and herbs. Let it sit.', 'Toss the chickpeas.']);
});

it('keeps a paragraph together across a stray blank line', () => {
  expect(joinWrapped('Mix the sumac, chile flakes,\n\n1 teaspoon salt.\n\nLay out.', 'steps')).toEqual(['Mix the sumac, chile flakes, 1 teaspoon salt.', 'Lay out.']);
});
