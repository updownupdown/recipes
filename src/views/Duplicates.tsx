import { useMemo, useState } from 'react';
import { deleteRecipe, saveRecipe } from '../db';
import { findDuplicates, mergeInto, onlyIn, pairKey, type DupPair } from '../duplicates';
import { Icon } from '../icons';
import type { Recipe } from '../types';
import { RecipeTile, TopBar } from './ui';

const IGNORE_KEY = 'dup-ignore';
const loadIgnored = (): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(IGNORE_KEY) || '[]')); } catch { return new Set(); } };

/** Lists recipes that look like the same one saved twice, so they can be merged or one deleted. */
export function Duplicates({ recipes }: { recipes: Recipe[] }) {
  const [ignored, setIgnored] = useState(loadIgnored);
  const [msg, setMsg] = useState('');
  const pairs = useMemo(() => findDuplicates(recipes, ignored), [recipes, ignored]);

  const ignore = (p: DupPair) => {
    const n = new Set(ignored); n.add(pairKey(p.a.id, p.b.id));
    try { localStorage.setItem(IGNORE_KEY, JSON.stringify([...n])); } catch { /* ignore */ }
    setIgnored(n);
  };

  return (
    <div className="page">
      <TopBar title="Merge duplicates" back="" recipes={recipes} />
      <div className="pad-x stack dups">
        {msg && <p className="banner flush">{msg}</p>}
        {pairs.length === 0 ? (
          <div className="empty">
            <span className="empty-ic"><Icon name="check" size={26} /></span>
            <h2>No duplicates</h2>
            <p className="muted">None of your recipes look like the same one saved twice.</p>
          </div>
        ) : (
          <p className="muted small">{pairs.length} pair{pairs.length === 1 ? '' : 's'} that look like the same recipe. Pick the version to keep. <b>Merge</b> also brings over the other one’s categories, notes, favorite and Cook next. Deleted recipes can be restored from Settings › History.</p>
        )}
        {pairs.map((p) => <Pair key={pairKey(p.a.id, p.b.id)} pair={p} onIgnore={() => ignore(p)} onDone={setMsg} />)}
      </div>
    </div>
  );
}

function fuller(r: Recipe) { return r.ingredients.length + r.instructions.length + (r.notes ? 1 : 0); }

function Pair({ pair, onIgnore, onDone }: { pair: DupPair; onIgnore: () => void; onDone: (m: string) => void }) {
  const { a, b } = pair;
  // Suggest the fuller version, then the more recently edited one.
  const [keepId, setKeepId] = useState(fuller(a) !== fuller(b) ? (fuller(a) > fuller(b) ? a.id : b.id) : a.updatedAt >= b.updatedAt ? a.id : b.id);
  const [busy, setBusy] = useState(false);
  const keep = keepId === a.id ? a : b, drop = keep === a ? b : a;

  const act = async (merge: boolean) => {
    setBusy(true);
    if (merge) await saveRecipe(mergeInto(keep, drop));
    await deleteRecipe(drop.id);
    onDone(merge ? `Merged into “${keep.title}”.` : `Deleted the other “${drop.title}”.`);
    scrollTo(0, 0);
  };

  return (
    <section className="dup">
      <div className="dup-head"><span>{Math.round(pair.score * 100)}% alike</span><button className="link" onClick={onIgnore}>Not duplicates</button></div>
      <div className="dup-cols">
        {[a, b].map((r) => {
          const other = r === a ? b : a;
          const extraIng = onlyIn(r.ingredients, other.ingredients).filter((l) => !l.startsWith('#'));
          const extraSteps = onlyIn(r.instructions, other.instructions);
          const on = keepId === r.id;
          return (
            <label key={r.id} className={'dup-ver' + (on ? ' on' : '')}>
              <span className="dup-pick">
                <input type="radio" name={'keep-' + pairKey(a.id, b.id)} checked={on} onChange={() => setKeepId(r.id)} />
                {on ? 'Keep this' : 'Keep this one instead'}
              </span>
              <span className="dup-title"><RecipeTile r={r} size={28} /><b>{r.title}</b></span>
              <small className="muted">
                {r.ingredients.filter((l) => !l.startsWith('#')).length} ingredients · {r.instructions.length} steps
                {r.categories.length > 0 && <> · {r.categories.join(', ')}</>}
                <br />Edited {new Date(r.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                {r.favorite && <> · <Icon name="heart" size={11} /> favorite</>}
              </small>
              {extraIng.length + extraSteps.length > 0 ? (
                <span className="dup-diff">
                  <small>Only in this one:</small>
                  {extraIng.slice(0, 5).map((l, i) => <span key={'i' + i}>{l}</span>)}
                  {extraIng.length > 5 && <span className="muted">and {extraIng.length - 5} more ingredients</span>}
                  {extraSteps.length > 0 && <span className="muted">{extraSteps.length} step{extraSteps.length === 1 ? '' : 's'} worded differently</span>}
                </span>
              ) : <span className="dup-diff same"><small>Same ingredients and steps</small></span>}
              <a className="link small" href={`#/recipe/${r.id}`} onClick={(e) => e.stopPropagation()}>Open</a>
            </label>
          );
        })}
      </div>
      <div className="dup-actions">
        <button className="btn" disabled={busy} onClick={() => act(true)}>Merge</button>
        <button className="btn ghost" disabled={busy} onClick={() => act(false)}>Delete the other</button>
      </div>
    </section>
  );
}
