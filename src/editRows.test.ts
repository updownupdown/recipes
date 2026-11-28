import { expect, it } from 'vitest';
import { formatTime, lineToRow, parseTime, rowToLine } from './editRows';

it('splits ingredient lines into rows and back', () => {
  const r = lineToRow('1 1/2 cups flour, sifted');
  expect(r).toMatchObject({ kind: 'item', qty: '1 1/2', unit: 'cup', label: 'flour, sifted' });
  expect(rowToLine(r)).toBe('1 1/2 cups flour, sifted');
  expect(lineToRow('1 tablespoon oil')).toMatchObject({ qty: '1', unit: 'tbsp', label: 'oil' });
  expect(lineToRow('2 eggs')).toMatchObject({ qty: '2', unit: '', label: 'eggs' });
  expect(lineToRow('salt to taste')).toMatchObject({ qty: '', unit: '', label: 'salt to taste' });
  expect(rowToLine(lineToRow('# Sauce'))).toBe('# Sauce');
});

it('reads and writes times', () => {
  expect(parseTime('1 h 15 min')).toEqual([1, 15]);
  expect(parseTime('45 minutes')).toEqual([0, 45]);
  expect(parseTime('1.5 hours')).toEqual([1, 30]);
  expect(parseTime('overnight')).toBeUndefined();
  expect(formatTime(0, 90)).toBe('1 h 30 min');
});

it('keeps units singular in the editor and pluralises on save', () => {
  expect(rowToLine({ id: 1, kind: 'item', qty: '2', unit: 'cup', label: 'milk' })).toBe('2 cups milk');
  expect(rowToLine({ id: 1, kind: 'item', qty: '1/2', unit: 'cups', label: 'milk' })).toBe('1/2 cup milk');
  expect(rowToLine({ id: 1, kind: 'item', qty: '1-2', unit: 'clove', label: 'garlic' })).toBe('1-2 cloves garlic');
  expect(rowToLine({ id: 1, kind: 'item', qty: '3', unit: 'lb', label: 'beef' })).toBe('3 lb beef');
  expect(lineToRow('2 pinches salt')).toMatchObject({ unit: 'pinch' });
});
