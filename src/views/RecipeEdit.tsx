import { useState } from 'react';
import { saveRecipe } from '../db';
import { go } from '../hooks';
import type { Recipe, RecipeDraft } from '../types';

const EMPTY: RecipeDraft = { title: '', categories: [], ingredients: [], instructions: [] };

export function RecipeEdit({ recipe, draft }: { recipe?: Recipe; draft?: RecipeDraft }) {
  const start = recipe ?? draft ?? EMPTY;
  const [title, setTitle] = useState(start.title);
  const [cats, setCats] = useState(start.categories.join(', '));
  const [servings, setServings] = useState(start.servings ? String(start.servings) : '');
  const [ing, setIng] = useState(start.ingredients.join('\n'));
  const [ins, setIns] = useState(start.instructions.join('\n'));
  const [notes, setNotes] = useState(start.notes ?? '');
  const [source, setSource] = useState(start.source ?? '');
  const [error, setError] = useState('');

  const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Give the recipe a name.'); return; }
    const saved = await saveRecipe({
      id: recipe?.id,
      title: title.trim(),
      categories: cats.split(',').map((c) => c.trim()).filter(Boolean),
      servings: parseFloat(servings) || undefined,
      ingredients: lines(ing),
      instructions: lines(ins),
      notes: notes.trim() || undefined,
      source: source.trim() || undefined,
    });
    go('recipe/' + saved.id);
  };

  return (
    <form className="edit" onSubmit={save}>
      <nav className="bar">
        <a href={recipe ? `#/recipe/${recipe.id}` : '#/'}>Cancel</a>
        <button className="btn" type="submit">Save</button>
      </nav>
      <h2>{recipe ? 'Edit recipe' : 'New recipe'}</h2>
      {error && <p className="error">{error}</p>}
      <label>Name<input id="title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!recipe} /></label>
      <div className="row gap">
        <label className="grow">Categories <small>comma separated</small><input id="cats" value={cats} onChange={(e) => setCats(e.target.value)} placeholder="Dinner, Vegetarian" /></label>
        <label className="narrow">Servings<input id="servings" type="number" min="0" step="any" inputMode="decimal" value={servings} onChange={(e) => setServings(e.target.value)} /></label>
      </div>
      <label>Ingredients <small>one per line; start a line with # for a section, e.g. “# Sauce”</small>
        <textarea id="ing" rows={10} value={ing} onChange={(e) => setIng(e.target.value)} placeholder={'2 cups flour\n1 tsp salt\n# Topping\n2 tbsp sugar'} />
      </label>
      <label>Instructions <small>optional, one step per line</small>
        <textarea id="ins" rows={8} value={ins} onChange={(e) => setIns(e.target.value)} />
      </label>
      <label>Notes <small>optional; links work</small>
        <textarea id="notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <label>Source URL <small>optional</small><input id="source" type="url" value={source} onChange={(e) => setSource(e.target.value)} /></label>
    </form>
  );
}
