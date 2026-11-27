import { expect, it } from 'vitest';
import { formatTime, lineToRow, parseTime, rowToLine } from './editRows';

it('splits ingredient lines into rows and back', () => {
  const r = lineToRow('1 1/2 cups flour, sifted');
  expect(r).toMatchObject({ kind: 'item', qty: '1 1/2', unit: 'cups', label: 'flour, sifted' });
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
