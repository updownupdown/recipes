import { useMemo, useState } from 'react';
import { CATALOG, canonicalCategory, categoryLook, lookVars, recipeLook } from '../categories';
import { allRecipes, saveRecipe } from '../db';
import { go } from '../hooks';
import { Icon } from '../icons';
import type { Recipe, RecipeDraft } from '../types';
import { useEffect } from 'react';

const EMPTY: RecipeDraft = { title: '', categories: [], ingredients: [], instructions: [] };

export function RecipeEdit({ recipe, draft }: { recipe?: Recipe; draft?: RecipeDraft }) {
  const start = recipe ?? draft ?? EMPTY;
  const [title, setTitle] = useState(start.title);
  const [cats, setCats] = useState<string[]>(start.categories);
  const [catInput, setCatInput] = useState('');
  const [servings, setServings] = useState(start.servings ? String(start.servings) : '');
  const [time, setTime] = useState(start.time ?? '');
  const [ing, setIng] = useState(start.ingredients.join('\n'));
  const [ins, setIns] = useState(start.instructions.join('\n'));
  const [notes, setNotes] = useState(start.notes ?? '');
  const [source, setSource] = useState(start.source ?? '');
  const [error, setError] = useState('');
  const [used, setUsed] = useState<string[]>([]);
  useEffect(() => { allRecipes().then((l) => setUsed([...new Set(l.flatMap((r) => r.categories))])); }, []);

  const suggestions = useMemo(() => [...new Set([...used, ...CATALOG.map((c) => c.name)])].filter((c) => !cats.includes(c)), [used, cats]);
  const addCat = (v: string) => {
    const c = canonicalCategory(v);
    if (c && !cats.includes(c)) setCats([...cats, c]);
    setCatInput('');
  };
  const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
  const look = recipeLook({ title, categories: cats, ingredients: lines(ing) });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Give the recipe a name.'); return; }
    const all = catInput.trim() ? [...cats, canonicalCategory(catInput)] : cats;
    const saved = await saveRecipe({
      id: recipe?.id,
      title: title.trim(),
      categories: [...new Set(all)],
      servings: parseFloat(servings) || undefined,
      time: time.trim() || undefined,
      favorite: recipe?.favorite,
      ingredients: lines(ing),
      instructions: lines(ins),
      notes: notes.trim() || undefined,
      source: source.trim() || undefined,
    });
    go('recipe/' + saved.id);
  };

  return (
    <form className="page edit" onSubmit={save}>
      <header className="hd">
        <a className="ib flat" href={recipe ? `#/recipe/${recipe.id}` : '#/'} aria-label="Cancel"><Icon name="x" /></a>
        <h1 className="small">{recipe ? 'Edit recipe' : 'New recipe'}</h1>
        <span className="hd-right"><button className="btn" type="submit"><Icon name="check" size={16} />Save</button></span>
      </header>
      <div className="pad-x stack">
        {error && <p className="error">{error}</p>}
        <div className="title-row">
          <span className="tile tint" style={lookVars(look)}><Icon name={look.icon} /></span>
          <input id="title" className="field big" placeholder="Recipe name" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!recipe} />
        </div>

        <div className="lbl">Categories <small>colour and icon come from the first one</small></div>
        <div className="catpick">
          {cats.map((c) => {
            const l = categoryLook(c);
            return <button type="button" key={c} className="tag tint" style={lookVars(l)} onClick={() => setCats(cats.filter((x) => x !== c))} title="Remove"><i><Icon name={l.icon} size={12} /></i>{c}<Icon name="x" size={12} /></button>;
          })}
          <input id="cat" className="catpick-input" list="cat-suggest" placeholder={cats.length ? 'Add another' : 'e.g. Dinner, Italian, Vegan'} value={catInput}
            onChange={(e) => setCatInput(e.target.value)}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ',') && catInput.trim()) { e.preventDefault(); addCat(catInput); } }}
            onBlur={() => { if (catInput.trim()) addCat(catInput); }} />
          <datalist id="cat-suggest">{suggestions.map((c) => <option key={c} value={c} />)}</datalist>
        </div>

        <div className="row gap">
          <label className="lbl grow">Time<input id="time" className="field" placeholder="e.g. 40 min" value={time} onChange={(e) => setTime(e.target.value)} /></label>
          <label className="lbl grow">Servings<input id="servings" className="field" type="number" min="0" step="any" inputMode="decimal" value={servings} onChange={(e) => setServings(e.target.value)} /></label>
        </div>
        <label className="lbl">Ingredients <small>one per line; start a line with # for a section, like “# Sauce”</small>
          <textarea id="ing" className="field" rows={10} value={ing} onChange={(e) => setIng(e.target.value)} placeholder={'2 cups flour\n1 tsp salt\n# Topping\n2 tbsp sugar'} />
        </label>
        <label className="lbl">Steps <small>optional, one per line</small>
          <textarea id="ins" className="field" rows={8} value={ins} onChange={(e) => setIns(e.target.value)} />
        </label>
        <label className="lbl">Notes <small>optional; links work</small>
          <textarea id="notes" className="field" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <label className="lbl">Source link <small>optional</small><input id="source" className="field" type="url" value={source} onChange={(e) => setSource(e.target.value)} /></label>
      </div>
    </form>
  );
}
