import { expect, it } from 'vitest';
import { convertAmount, TABLES } from './convert';

it('converts custom amounts each way', () => {
  expect(convertAmount('oven', 'imp', '350', '°F')).toBe('177°C');
  expect(convertAmount('oven', 'met', '180', '°C')).toBe('356°F');
  expect(convertAmount('weight', 'imp', '1', 'lb')).toBe('454 g');
  expect(convertAmount('weight', 'imp', '3', 'lb')).toBe('1.36 kg');
  expect(convertAmount('weight', 'met', '100', 'g')).toBe('3 1/2 oz');
  expect(convertAmount('weight', 'met', '1', 'kg')).toBe('2 lb 3 oz');
  expect(convertAmount('vol', 'imp', '1 1/2', 'cup')).toBe('355 ml');
  expect(convertAmount('vol', 'imp', '½', 'tsp')).toBe('2 ml');
  expect(convertAmount('vol', 'met', '250', 'ml')).toBe('1 cup');
  expect(convertAmount('vol', 'met', '30', 'ml')).toBe('2 tbsp');
  expect(convertAmount('vol', 'met', '5', 'ml')).toBe('1 tsp');
  expect(convertAmount('vol', 'met', '1', 'l')).toBe('4 1/4 cups');
  expect(convertAmount('vol', 'imp', 'abc', 'cup')).toBeUndefined();
  expect(convertAmount('vol', 'imp', '', 'cup')).toBeUndefined();
});

it('has no gas marks and every table has rows both ways', () => {
  for (const k of ['oven', 'weight', 'vol'] as const) for (const d of ['imp', 'met'] as const) expect(TABLES[k][d].length).toBeGreaterThan(5);
  expect(JSON.stringify(TABLES)).not.toMatch(/gas/i);
});
