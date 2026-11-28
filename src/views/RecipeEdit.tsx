import { useEffect, useRef, useState } from 'react';
import { categoryLook, lookVars, recipeLook } from '../categories';
import { fixCaps, hasAllCaps } from '../caps';
import { allRecipes, saveRecipe } from '../db';
import { ConfirmBar } from './ui';
import { emptyItem, formatTime, lineToRow, nextId, parseTime, rowToLine, singularUnit, UNIT_OPTIONS, type IngRow, type StepRow } from '../editRows';
import { goBack, replace } from '../hooks';
import { Icon } from '../icons';
import type { Recipe, RecipeDraft } from '../types';
import { CategoryPicker } from './CategoryPicker';

type Mode = 'rows' | 'text';
const EMPTY: RecipeDraft = { title: '', categories: [], ingredients: [], instructions: [] };
const MODE_KEY = 'edit_mode';
const loadMode = (): Mode => { try { return localStorage.getItem(MODE_KEY) === 'rows' ? 'rows' : 'text'; } catch { return 'text'; } };
const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
const toRows = (ing: string[]) => (ing.length ? ing.map(lineToRow) : [emptyItem()]);
const toSteps = (ins: string[]): StepRow[] => (ins.length ? ins : ['']).map((text) => ({ id: nextId(), text }));

/** Focus a field after React has rendered it. */
const focusLater = (sel: string) => setTimeout(() => (document.querySelector(sel) as HTMLElement | null)?.focus(), 30);

export function RecipeEdit({ recipe, draft, similar }: { recipe?: Recipe; draft?: RecipeDraft; similar?: Recipe }) {
  const start = recipe ?? draft ?? EMPTY;
  const [mode, setModeState] = useState<Mode>(loadMode);
  const [title, setTitle] = useState(start.title);
  const [cats, setCats] = useState<string[]>(start.categories);
  const [picking, setPicking] = useState(false);
  const [servings, setServings] = useState(start.servings ?? 0);
  const [time, setTime] = useState(start.time ?? '');
  const [timeAsText, setTimeAsText] = useState(() => !!start.time && !parseTime(start.time));
  // Plain-text mode edits these strings; rows mode edits the arrays. Switching converts between them.
  const [ingText, setIngText] = useState(start.ingredients.join('\n'));
  const [insText, setInsText] = useState(start.instructions.join('\n'));
  const [rows, setRows] = useState<IngRow[]>(() => toRows(start.ingredients));
  const [steps, setSteps] = useState<StepRow[]>(() => toSteps(start.instructions));
  const [notes, setNotes] = useState(start.notes ?? '');
  const [source, setSource] = useState(start.source ?? '');
  const [error, setError] = useState('');
  const [used, setUsed] = useState<string[]>([]);
  useEffect(() => { allRecipes().then((l) => setUsed([...new Set(l.flatMap((r) => r.categories))])); }, []);

  const currentIng = () => (mode === 'text' ? lines(ingText) : rows.map(rowToLine).filter(Boolean));
  const currentIns = () => (mode === 'text' ? lines(insText) : steps.map((s) => s.text.trim()).filter(Boolean));
  const setContent = (ing: string[], ins: string[]) => {
    setIngText(ing.join('\n')); setInsText(ins.join('\n'));
    setRows(toRows(ing)); setSteps(toSteps(ins));
  };
  const setMode = (m: Mode) => {
    if (m === mode) return;
    setContent(currentIng(), currentIns());
    setModeState(m);
    try { localStorage.setItem(MODE_KEY, m); } catch { /* ignore */ }
  };

  const look = recipeLook({ title, categories: cats, ingredients: currentIng() });
  const snapshot = () => JSON.stringify([title, cats, servings, time, currentIng(), currentIns(), notes, source]);
  const [initial] = useState(snapshot);
  const shouting = hasAllCaps({ title, ingredients: currentIng(), instructions: currentIns() });
  const unshout = () => {
    const f = fixCaps({ title, ingredients: currentIng(), instructions: currentIns(), notes });
    setTitle(f.title); setNotes(f.notes ?? ''); setContent(f.ingredients, f.instructions);
  };

  const cancel = () => {
    if (snapshot() !== initial && !confirm('Discard your changes?')) return;
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

  // Rows editing helpers
  const patchRow = (id: number, p: Partial<IngRow>) => setRows((rs) => rs.map((r) => (r.id === id ? ({ ...r, ...p } as IngRow) : r)));
  const addRowAfter = (id: number | null, row: IngRow) => {
    setRows((rs) => { const i = id === null ? rs.length - 1 : rs.findIndex((r) => r.id === id); const n = [...rs]; n.splice(i + 1, 0, row); return n; });
    focusLater(`[data-row="${row.id}"]`);
  };
  const [ask, setAsk] = useState<{ text: string; yes: () => void }>();
  const removeRow = (r: IngRow) => {
    const go = () => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.id !== r.id) : [emptyItem()]));
    const line = rowToLine(r).replace(/^#\s*/, '');
    if (line) setAsk({ text: `Remove “${line}”?`, yes: go }); else go();
  };
  const removeStep = (st: StepRow) => {
    const go = () => setSteps((ss) => (ss.length > 1 ? ss.filter((x) => x.id !== st.id) : [{ id: nextId(), text: '' }]));
    if (st.text.trim()) setAsk({ text: 'Remove this step?', yes: go }); else go();
  };
  const ingDrag = useDragReorder(setRows);
  const stepDrag = useDragReorder(setSteps);
  const addStepAfter = (id: number | null) => {
    const s = { id: nextId(), text: '' };
    setSteps((ss) => { const i = id === null ? ss.length - 1 : ss.findIndex((x) => x.id === id); const n = [...ss]; n.splice(i + 1, 0, s); return n; });
    focusLater(`[data-step="${s.id}"]`);
  };

  const [th, tm] = parseTime(time) ?? [0, 0];
  let stepNo = 0;

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

        <div className="row edit-mode">
          <span className="lbl">Ingredients and steps</span>
          <div className="seg sm push" role="group" aria-label="Editor">
            <button type="button" className={mode === 'text' ? 'on' : ''} onClick={() => setMode('text')}>Plain text</button>
            <button type="button" className={mode === 'rows' ? 'on' : ''} onClick={() => setMode('rows')}>Rows</button>
          </div>
        </div>

        {mode === 'text' ? (
          <>
            <label className="lbl">Ingredients <small>one per line; start a line with # for a section, like “# Sauce”</small>
              <textarea id="ing" className="field" rows={10} value={ingText} onChange={(e) => setIngText(e.target.value)} placeholder={'2 cups flour\n1 tsp salt\n# Topping\n2 tbsp sugar'} />
            </label>
            <label className="lbl">Steps <small>optional, one per line</small>
              <textarea id="ins" className="field" rows={8} value={insText} onChange={(e) => setInsText(e.target.value)} />
            </label>
          </>
        ) : (
          <>
            <div className="lbl">Ingredients</div>
            <div className="rows" ref={ingDrag.list}>
              {rows.map((r, i) => r.kind === 'section' ? (
                <div key={r.id} data-idx={i} className={'erow section' + (ingDrag.dragging === i ? ' dragging' : '')}>
                  <Grip {...ingDrag.handle(i)} />
                  <input data-row={r.id} className="field" value={r.label} placeholder="Section, e.g. Sauce" onChange={(e) => patchRow(r.id, { label: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRowAfter(r.id, emptyItem()); } }} aria-label="Section name" />
                  <Trash onClick={() => removeRow(r)} />
                </div>
              ) : (
                <div key={r.id} data-idx={i} className={'erow' + (ingDrag.dragging === i ? ' dragging' : '')}>
                  <Grip {...ingDrag.handle(i)} />
                  <input data-row={r.id} className="field qty" value={r.qty} placeholder="Qty" inputMode="decimal" onChange={(e) => patchRow(r.id, { qty: e.target.value })} aria-label="Quantity" />
                  <select className={'field unit' + (r.unit ? '' : ' empty')} value={singularUnit(r.unit)} onChange={(e) => patchRow(r.id, { unit: e.target.value })} aria-label="Unit">
                    <option value="">Unit</option>
                    {[...(r.unit && !UNIT_OPTIONS.includes(singularUnit(r.unit)) ? [singularUnit(r.unit)] : []), ...UNIT_OPTIONS].map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input className="field grow" value={r.label} placeholder="Ingredient" onChange={(e) => patchRow(r.id, { label: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRowAfter(r.id, emptyItem()); } }} aria-label="Ingredient" />
                  <Trash onClick={() => removeRow(r)} />
                </div>
              ))}
            </div>
            <div className="row gap">
              <button type="button" className="pill" onClick={() => addRowAfter(null, emptyItem())}><Icon name="plus" size={13} />Ingredient</button>
              <button type="button" className="pill" onClick={() => addRowAfter(null, { id: nextId(), kind: 'section', label: '' })}><Icon name="plus" size={13} />Section</button>
            </div>

            <div className="lbl">Steps <small>a short line ending in “:” becomes a heading</small></div>
            <div className="rows" ref={stepDrag.list}>
              {steps.map((s, i) => {
                const heading = s.text.trim().length < 48 && s.text.trim().endsWith(':');
                if (!heading && s.text.trim()) stepNo++;
                return (
                  <div key={s.id} data-idx={i} className={'erow step' + (stepDrag.dragging === i ? ' dragging' : '')}>
                    <Grip {...stepDrag.handle(i)} />
                    <i className={heading ? 'h' : ''}>{heading ? <Icon name="type" size={12} /> : s.text.trim() ? stepNo : '·'}</i>
                    <textarea data-step={s.id} className="field grow" rows={Math.max(1, Math.ceil(s.text.length / 34))} value={s.text} placeholder={i === 0 ? 'First step' : 'Next step'}
                      onChange={(e) => setSteps((ss) => ss.map((x) => (x.id === s.id ? { ...x, text: e.target.value.replace(/\n/g, ' ') } : x)))}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStepAfter(s.id); } }} aria-label={`Step ${i + 1}`} />
                    <Trash onClick={() => removeStep(s)} />
                  </div>
                );
              })}
            </div>
            <div><button type="button" className="pill" onClick={() => addStepAfter(null)}><Icon name="plus" size={13} />Step</button></div>
          </>
        )}

        <label className="lbl">Notes <small>optional; links work</small>
          <textarea id="notes" className="field" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <label className="lbl">Source link <small>optional</small><input id="source" className="field" type="url" value={source} onChange={(e) => setSource(e.target.value)} /></label>
      </div>
      {ask && <ConfirmBar text={ask.text} action="Remove" onYes={() => { ask.yes(); setAsk(undefined); }} onNo={() => setAsk(undefined)} />}
      {picking && <CategoryPicker value={cats} used={used} onChange={setCats} onClose={() => setPicking(false)} />}
    </form>
  );
}

function Grip(props: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className="grip" aria-label="Drag to reorder" {...props}><Icon name="grip" size={16} /></span>;
}

function Trash({ onClick }: { onClick: () => void }) {
  return <button type="button" className="trash" onClick={onClick} aria-label="Remove"><Icon name="trash" size={16} /></button>;
}

/** Drag-and-drop reordering by a handle; works with touch and mouse. Rows carry data-idx. */
function useDragReorder<T>(setItems: React.Dispatch<React.SetStateAction<T[]>>) {
  const list = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const cur = useRef<number | null>(null);
  const handle = (i: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      cur.current = i; setDragging(i);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (cur.current === null || !list.current) return;
      const rowsEls = [...list.current.querySelectorAll<HTMLElement>(':scope > [data-idx]')];
      let to = rowsEls.findIndex((el) => { const b = el.getBoundingClientRect(); return e.clientY < b.top + b.height / 2; });
      if (to === -1) to = rowsEls.length - 1;
      const from = cur.current;
      if (to === from) return;
      setItems((items) => { const n = [...items]; const [it] = n.splice(from, 1); n.splice(to, 0, it); return n; });
      cur.current = to; setDragging(to);
    },
    onPointerUp: () => { cur.current = null; setDragging(null); },
    onPointerCancel: () => { cur.current = null; setDragging(null); },
  });
  return { list, dragging, handle };
}
