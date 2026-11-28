import { useEffect, useState } from 'react';
import { categoryLook, lookVars, recipeLook } from '../categories';
import { fixCaps, hasAllCaps } from '../caps';
import { allRecipes, saveRecipe } from '../db';
import { ask } from '../ask';
import { formatTime, parseTime } from '../editRows';
import { goBack, replace } from '../hooks';
import { Icon } from '../icons';
import type { Recipe, RecipeDraft } from '../types';
import { CategoryPicker } from './CategoryPicker';
import { LineEditor, toLines, type Line } from './LineEditor';

const EMPTY: RecipeDraft = { title: '', categories: [], ingredients: [], instructions: [] };


export function RecipeEdit({ recipe, draft, similar }: { recipe?: Recipe; draft?: RecipeDraft; similar?: Recipe }) {
  const start = recipe ?? draft ?? EMPTY;
  const [title, setTitle] = useState(start.title);
  const [cats, setCats] = useState<string[]>(start.categories);
  const [picking, setPicking] = useState(false);
  const [servings, setServings] = useState(start.servings ?? 0);
  const [time, setTime] = useState(start.time ?? '');
  const [timeAsText, setTimeAsText] = useState(() => !!start.time && !parseTime(start.time));
  const [ing, setIng] = useState<Line[]>(() => toLines(start.ingredients));
  const [ins, setIns] = useState<Line[]>(() => toLines(start.instructions));
  const [notes, setNotes] = useState(start.notes ?? '');
  const [source, setSource] = useState(start.source ?? '');
  const [error, setError] = useState('');
  const [used, setUsed] = useState<string[]>([]);
  useEffect(() => { allRecipes().then((l) => setUsed([...new Set(l.flatMap((r) => r.categories))])); }, []);

  const texts = (ls: Line[]) => ls.map((l) => l.text.trim()).filter(Boolean);
  const currentIng = () => texts(ing);
  const currentIns = () => texts(ins);
  const setContent = (i: string[], st: string[]) => { setIng(toLines(i)); setIns(toLines(st)); };

  const look = recipeLook({ title, categories: cats, ingredients: currentIng() });
  const snapshot = () => JSON.stringify([title, cats, servings, time, currentIng(), currentIns(), notes, source]);
  const [initial] = useState(snapshot);
  const shouting = hasAllCaps({ title, ingredients: currentIng(), instructions: currentIns() });
  const unshout = () => {
    const f = fixCaps({ title, ingredients: currentIng(), instructions: currentIns(), notes });
    setTitle(f.title); setNotes(f.notes ?? ''); setContent(f.ingredients, f.instructions);
  };

  const cancel = async () => {
    if (snapshot() !== initial && !(await ask({ title: 'Discard your changes?', body: 'Your edits to this recipe will be lost.', yes: 'Discard', no: 'Keep editing', danger: true }))) return;
    goBack(recipe ? 'recipe/' + recipe.id : '');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Give the recipe a name.'); scrollTo(0, 0); return; }
    const saved = await saveRecipe({
      id: recipe?.id,
      title: title.trim(),
      categories: [...new Set(cats)],
      servings: servings > 0 ? servings : undefined,
      time: time.trim() || undefined,
      favorite: recipe?.favorite,
      cookNext: recipe?.cookNext,
      ingredients: currentIng(),
      instructions: currentIns(),
      notes: notes.trim() || undefined,
      source: source.trim() || undefined,
    });
    // Editing returns to the recipe page it came from; a new recipe takes the place of the Add page.
    if (recipe) goBack('recipe/' + saved.id);
    else replace('recipe/' + saved.id);
  };

  const [th, tm] = parseTime(time) ?? [0, 0];

  return (
    <form className="page edit" onSubmit={save}>
      <header className="hd">
        <button type="button" className="ib flat" onClick={cancel} aria-label="Cancel"><Icon name="x" /></button>
        <h1 className="small">{recipe ? 'Edit recipe' : 'New recipe'}</h1>
        <span className="hd-right"><button className="btn" type="submit"><Icon name="check" size={16} />Save</button></span>
      </header>
      <div className="pad-x stack">
        {error && <p className="error">{error}</p>}
        {similar && (
          <div className="banner flush warn row gap">
            <span className="grow small">You already have a recipe like this: <b>{similar.title}</b>.</span>
            <a className="pill" href={`#/recipe/${similar.id}`}>Open it</a>
          </div>
        )}
        {shouting && (
          <div className="banner flush row gap">
            <span className="grow small">Parts of this recipe are in capitals.</span>
            <button type="button" className="pill" onClick={unshout}>Make normal case</button>
          </div>
        )}
        <div className="title-row">
          <span className="tile tint" style={lookVars(look)}><Icon name={look.icon} /></span>
          <input id="title" className="field big" placeholder="Recipe name" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!recipe} />
        </div>

        <div>
          <div className="lbl">Categories <small>colour and icon come from the first one</small></div>
          <div className="catpick">
            {cats.map((c) => {
              const l = categoryLook(c);
              return <button type="button" key={c} className="tag tint" style={lookVars(l)} onClick={() => setCats(cats.filter((x) => x !== c))} title="Remove"><i><Icon name={l.icon} size={12} /></i>{c}<Icon name="x" size={12} /></button>;
            })}
            <button type="button" className="pill" onClick={() => setPicking(true)}><Icon name={cats.length ? 'plus' : 'tag'} size={13} />{cats.length ? 'Add' : 'Choose categories'}</button>
          </div>
        </div>

        <div className="row gap wrap meta-edit">
          <div className="meta-field"><span className="meta-label">Time</span>
            {timeAsText ? (
              <span className="row gap"><input id="time" className="field" value={time} onChange={(e) => setTime(e.target.value)} /><button type="button" className="link small" onClick={() => { setTime(''); setTimeAsText(false); }}>Use h/min</button></span>
            ) : (
              <span className="hm">
                <input id="time-h" className="field" type="number" inputMode="numeric" min="0" placeholder="0" value={th || ''} onChange={(e) => setTime(formatTime(Math.max(0, +e.target.value || 0), tm))} aria-label="Hours" /><span>h</span>
                <input id="time-m" className="field" type="number" inputMode="numeric" min="0" step="5" placeholder="0" value={tm || ''} onChange={(e) => setTime(formatTime(th, Math.max(0, +e.target.value || 0)))} aria-label="Minutes" /><span>min</span>
              </span>
            )}
          </div>
          <div className="meta-field"><span className="meta-label">Servings</span>
            <span className="stp big">
              <button type="button" onClick={() => setServings((s) => Math.max(0, s - 1))} aria-label="Fewer servings"><Icon name="minus" size={13} /></button>
              <input id="servings" type="number" inputMode="numeric" min="0" value={servings || ''} placeholder="–" onChange={(e) => setServings(Math.max(0, +e.target.value || 0))} aria-label="Servings" />
              <button type="button" onClick={() => setServings((s) => s + 1)} aria-label="More servings"><Icon name="plus" size={13} /></button>
            </span>
          </div>
        </div>

        <div className="lbl edit-mode">Ingredients <small>one per line; # starts a section</small></div>
        <LineEditor kind="ing" lines={ing} onChange={setIng} placeholder="2 cups flour, or paste a whole list" />
        <div className="lbl">Steps <small>one per line</small></div>
        <LineEditor kind="step" lines={ins} onChange={setIns} placeholder="First step" />

        <label className="lbl">Notes <small>optional; links work</small>
          <textarea id="notes" className="field" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <label className="lbl">Source link <small>optional</small><input id="source" className="field" type="url" value={source} onChange={(e) => setSource(e.target.value)} /></label>
      </div>
      {picking && <CategoryPicker value={cats} used={used} onChange={setCats} onClose={() => setPicking(false)} />}
    </form>
  );
}
