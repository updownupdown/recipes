import { expect, it } from 'vitest';
import { convertText } from './convert';

const pick = (s: string, u: string) => convertText(s)?.results.find((r) => r.unit === u)?.value;

it('converts what people type', () => {
  expect(pick('2 cups flour', 'g')).toBe('250');
  expect(pick('1 cup milk', 'ml')).toBe('237');
  expect(pick('350F', '°C')).toBe('177');
  expect(pick('180 °C', '°F')).toBe('356');
  expect(pick('1 lb', 'g')).toBe('454');
  expect(pick('100 g', 'oz')).toBe('3 1/2');
  expect(pick('3 tsp', 'tbsp')).toBe('1');
  expect(convertText('banana')).toBeUndefined();
});
