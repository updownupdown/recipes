import { describe, expect, it } from 'vitest';
import { convertLine, convertTemps, leadingAmount } from './units';

describe('convertLine', () => {
  it('turns cups of flour and sugar into grams', () => {
    expect(convertLine('2 cups all-purpose flour', 'metric')).toBe('250 g all-purpose flour');
    expect(convertLine('1/2 cup brown sugar, packed', 'metric')).toBe('110 g brown sugar, packed');
  });
  it('turns liquids into ml and weights into g/kg', () => {
    expect(convertLine('1 cup milk', 'metric')).toBe('240 ml milk');
    expect(convertLine('4 cups chicken stock', 'metric')).toBe('950 ml chicken stock');
    expect(convertLine('8 oz cream cheese', 'metric')).toBe('230 g cream cheese');
    expect(convertLine('3 lb pork shoulder', 'metric')).toBe('1.35 kg pork shoulder');
    expect(convertLine('2-3 cups water', 'metric')).toBe('470-710 ml water');
  });
  it('leaves spoons and unknown lines alone', () => {
    expect(convertLine('1 tbsp olive oil', 'metric')).toBe('1 tbsp olive oil');
    expect(convertLine('2 eggs', 'metric')).toBe('2 eggs');
    expect(convertLine('1 large onion', 'us')).toBe('1 large onion');
    expect(convertLine('250 g flour', 'metric')).toBe('250 g flour');
  });
  it('turns metric into US units', () => {
    expect(convertLine('250 g flour', 'us')).toBe('2 cups flour');
    expect(convertLine('500 g ground beef', 'us')).toBe('1 lb ground beef');
    expect(convertLine('100 g feta', 'us')).toBe('3 1/2 oz feta');
    expect(convertLine('250 ml milk', 'us')).toBe('1 cup milk');
    expect(convertLine('30 ml lemon juice', 'us')).toBe('2 tbsp lemon juice');
    expect(convertLine('1 l stock', 'us')).toBe('4 1/4 cups stock');
  });
});

describe('convertTemps', () => {
  it('converts oven temperatures both ways', () => {
    expect(convertTemps('Preheat oven to 350°F.', 'metric')).toBe('Preheat oven to 175°C.');
    expect(convertTemps('Bake at 200 C for 20 min', 'us')).toBe('Bake at 390°F for 20 min');
    expect(convertTemps('Bake at 350 degrees F', 'metric')).toBe('Bake at 175°C');
    expect(convertTemps('Bake at 350°F', 'orig')).toBe('Bake at 350°F');
  });
});

it('reads leading amounts', () => {
  expect(leadingAmount('1 1/2 cups rice')).toBe(1.5);
  expect(leadingAmount('salt')).toBeUndefined();
});
