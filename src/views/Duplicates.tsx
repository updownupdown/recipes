import { useEffect, useMemo, useState } from 'react';
import { deleteRecipe, saveRecipe } from '../db';
import { changedSteps, findDuplicates, mergeInto, onlyIn, pairKey, wordDiff, type DupPair } from '../duplicates';
import { RecipeBody } from './RecipeBody';
import { Icon } from '../icons';
import type { Recipe } from '../types';
import { RecipeTile, TopBar } from './ui';

const IGNORE_KEY = 'dup-ignore';
const loadIgnored = (): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(IGNORE_KEY) || '[]')); } catch { return new Set(); } };

/** Lists recipes that look like the same one saved twice, so they can be merged or one deleted. */
export function Duplicates({ recipes }: { recipes: Recipe[] }) {
  const [ignored, setIgnored] = useState(loadIgnored);
  const [msg, setMsg] = useState('');
  const [preview, setPreview] = useState<Recipe>();
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
        {pairs.map((p) => <Pair key={pairKey(p.a.id, p.b.id)} pair={p} onIgnore={() => ignore(p)} onDone={setMsg} onPreview={setPreview} />)}
      </div>
      {preview && <Preview recipe={preview} onClose={() => setPreview(undefined)} />}
    </div>
  );
}

function fuller(r: Recipe) { return r.ingredients.length + r.instructions.length + (r.notes ? 1 : 0); }

/** Read-only look at a recipe, over the list so you don't lose your place. */
function Preview({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label={recipe.title}>
      <div className="dim" onClick={onClose} />
      <div className="modal preview">
        <div className="modal-head">
          <span className="muted small">Preview · edited {new Date(recipe.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          <button type="button" className="ib flat" onClick={onClose} aria-label="Close preview"><Icon name="x" /></button>
        </div>
        <div className="modal-body"><RecipeBody recipe={recipe} /></div>
      </div>
    </div>
  );
}

/** Words that differ, highlighted. */
function Diff({ text, other }: { text: string; other?: string }) {
  if (!other) return <>{text}</>;
  return <>{wordDiff(text, other).map((s, i) => (s.changed ? <mark key={i}>{s.text}</mark> : <span key={i}>{s.text}</span>))}</>;
}

/** Shown open when short; folded behind a summary when long. */
function Fold({ summary, long, children }: { summary: string; long: boolean; children: React.ReactNode }) {
  return long
    ? <details className="dup-fold"><summary>{summary}</summary><div className="dup-fold-body">{children}</div></details>
    : <div className="dup-fold open"><small>{summary}</small><div className="dup-fold-body">{children}</div></div>;
}

function Pair({ pair, onIgnore, onDone, onPreview }: { pair: DupPair; onIgnore: () => void; onDone: (m: string) => void; onPreview: (r: Recipe) => void }) {
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
          const steps = changedSteps(r.instructions, other.instructions);
          const on = keepId === r.id;
          return (
            <div key={r.id} className={'dup-ver' + (on ? ' on' : '')}>
              <label className="dup-pick">
                <input type="radio" name={'keep-' + pairKey(a.id, b.id)} checked={on} onChange={() => setKeepId(r.id)} />
                {on ? 'Keep this' : 'Keep this one instead'}
              </label>
              <span className="dup-title"><RecipeTile r={r} size={28} /><b>{r.title}</b></span>
              <small className="muted">
                {r.ingredients.filter((l) => !l.startsWith('#')).length} ingredients · {r.instructions.length} steps
                {r.categories.length > 0 && <> · {r.categories.join(', ')}</>}
                <br />Edited {new Date(r.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                {r.favorite && <> · <Icon name="heart" size={11} /> favorite</>}
              </small>
              {extraIng.length + steps.length === 0 && <span className="dup-diff same"><small>Same ingredients and steps</small></span>}
              {extraIng.length > 0 && (
                <Fold summary={`${extraIng.length} ingredient${extraIng.length === 1 ? '' : 's'} only in this one`} long={extraIng.length > 4}>
                  {extraIng.map((l, i) => {
                    const near = changedSteps([l], other.ingredients)[0]?.other;
                    return <span key={i}><Diff text={l} other={near} /></span>;
                  })}
                </Fold>
              )}
              {steps.length > 0 && (
                <Fold summary={`${steps.length} step${steps.length === 1 ? '' : 's'} worded differently`} long={steps.reduce((n, s) => n + s.text.length, 0) > 320}>
                  {steps.map((s) => <span key={s.n}><b>Step {s.n}.</b> <Diff text={s.text} other={s.other} /></span>)}
                </Fold>
              )}
              <button type="button" className="link small dup-open" onClick={() => onPreview(r)}>Preview</button>
            </div>
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
