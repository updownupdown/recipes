import { describe, expect, it } from 'vitest';
import { formatNumber, parseNumber, scaleLine, splitAmount } from './quantity';

describe('quantity', () => {
  it('parses', () => {
    expect(parseNumber('1 1/2')).toBe(1.5);
    expect(parseNumber('½')).toBe(0.5);
    expect(parseNumber('1½')).toBe(1.5);
    expect(parseNumber('0,25')).toBe(0.25);
  });
  it('formats', () => {
    expect(formatNumber(1.5)).toBe('1½');
    expect(formatNumber(0.333)).toBe('⅓');
    expect(formatNumber(2.999)).toBe('3');
    expect(formatNumber(14.2)).toBe('14');
  });
  it('scales lines', () => {
    expect(scaleLine('2 1/2 cups flour', 2)).toBe('5 cups flour');
    expect(scaleLine('¾ cup yogurt', 2)).toBe('1½ cup yogurt');
    expect(scaleLine('2-3 cloves garlic', 2)).toBe('4-6 cloves garlic');
    expect(scaleLine('salt to taste', 2)).toBe('salt to taste');
    expect(scaleLine('# Sauce', 2)).toBe('# Sauce');
  });
  it('splits amount', () => {
    expect(splitAmount('700 g chicken thighs')).toEqual(['700 g', 'chicken thighs']);
    expect(splitAmount('4 garlic cloves')).toEqual(['4', 'garlic cloves']);
    expect(splitAmount('salt')).toEqual(['', 'salt']);
    expect(splitAmount('1/2 lb ground pork')).toEqual(['1/2 lb', 'ground pork']);
    expect(scaleLine('1/2 lb pork', 2)).toBe('1 lb pork');
    expect(scaleLine('1 1/2 cup rice', 2)).toBe('3 cup rice');
  });
});

import { scaleLine as sl2, splitAmount as sa2 } from './quantity';
it('treats "1 or 2" as a range', () => {
  expect(sa2('1 or 2 onions')).toEqual(['1 or 2', 'onions']);
  expect(sl2('1 or 2 onions', 2)).toBe('2 or 4 onions');
});
