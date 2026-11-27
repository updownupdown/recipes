import { describe, expect, it } from 'vitest';
import { decodeEntities, duration, recipeFromJsonLd } from './webImport';

const yoast = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebPage', name: 'Page' },
    {
      '@type': 'Recipe',
      name: 'Easy Chicken &amp; Rice',
      description: 'A weeknight <b>favourite</b>.',
      recipeYield: ['4', '4 servings'],
      totalTime: 'PT1H15M',
      recipeCategory: ['Dinner', 'Main Course'],
      recipeCuisine: 'Mexican',
      recipeIngredient: ['1 &frac12; cups rice', '2 chicken breasts'],
      recipeInstructions: [
        { '@type': 'HowToSection', name: 'Rice', itemListElement: [{ '@type': 'HowToStep', text: 'Rinse rice.' }, { '@type': 'HowToStep', text: 'Simmer 20 minutes.' }] },
        { '@type': 'HowToSection', name: 'Chicken', itemListElement: [{ '@type': 'HowToStep', text: 'Sear chicken.' }] },
      ],
    },
  ],
});

describe('recipeFromJsonLd', () => {
  it('reads a Yoast-style graph with sections', () => {
    const r = recipeFromJsonLd(['{bad json', yoast], 'https://example.com/x')!;
    expect(r.title).toBe('Easy Chicken & Rice');
    expect(r.servings).toBe(4);
    expect(r.time).toBe('1 h 15 min');
    expect(r.ingredients).toEqual(['1 ½ cups rice', '2 chicken breasts']);
    expect(r.instructions).toEqual(['Rice:', 'Rinse rice.', 'Simmer 20 minutes.', 'Chicken:', 'Sear chicken.']);
    expect(r.categories).toContain('Mexican');
    expect(r.categories).toContain('Mains');
    expect(r.notes).toBe('A weeknight favourite.');
    expect(r.source).toBe('https://example.com/x');
  });
  it('reads an array with a multi-type node and string steps', () => {
    const page = JSON.stringify([{ '@type': ['Recipe', 'NewsArticle'], name: 'Banana bread', recipeIngredient: '3 bananas', recipeInstructions: 'Mash.\nBake 1 hour.', recipeYield: 'Makes 10 slices' }]);
    const r = recipeFromJsonLd([page], 'u')!;
    expect(r.instructions).toEqual(['Mash.', 'Bake 1 hour.']);
    expect(r.ingredients).toEqual(['3 bananas']);
    expect(r.servings).toBe(10);
    expect(r.categories).toEqual(['Bread']);
  });
  it('returns undefined without a recipe', () => {
    expect(recipeFromJsonLd([JSON.stringify({ '@type': 'Article' })], 'u')).toBeUndefined();
  });
});

describe('helpers', () => {
  it('formats durations', () => {
    expect(duration('PT45M')).toBe('45 min');
    expect(duration('PT2H')).toBe('2 h');
    expect(duration('P0DT0H0M')).toBeUndefined();
  });
  it('decodes entities', () => expect(decodeEntities('&#8217;s &amp; &#x2013;')).toBe('’s & –'));
});
