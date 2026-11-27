import { useState } from 'react';
import { scaleLine, splitAmount } from '../quantity';
import { useWakeLock } from '../hooks';
import type { Recipe } from '../types';

const FACTORS = [0.5, 1, 2, 3];

function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s)]+)/g);
  return <>{parts.map((p, i) => (/^https?:\/\//.test(p) ? <a key={i} href={p} target="_blank" rel="noreferrer">{p}</a> : p))}</>;
}

type Body = Pick<Recipe, 'title' | 'categories' | 'servings' | 'ingredients' | 'instructions' | 'notes' | 'source'>;

export function RecipeBody({ recipe }: { recipe: Body }) {
  const [factor, setFactor] = useState(1);
  const [awake, setAwake] = useState(() => localStorage.getItem('awake') === '1');
  const [done, setDone] = useState<Set<string>>(new Set());
  const wakeSupported = useWakeLock(awake);

  const toggle = (key: string) =>
    setDone((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const toggleAwake = () => { setAwake((a) => { localStorage.setItem('awake', a ? '0' : '1'); return !a; }); };
  const servings = recipe.servings ? Math.round(recipe.servings * factor * 100) / 100 : undefined;

  let host = '';
  try { if (recipe.source) host = new URL(recipe.source).hostname.replace(/^www\./, ''); } catch { /* not a URL */ }

  return (
    <article className="recipe">
      <h2>{recipe.title}</h2>
      <p className="meta">
        {[recipe.categories.join(', '), servings ? `${servings} servings` : ''].filter(Boolean).join(' · ')}
        {recipe.source && <> · {host ? <a href={recipe.source} target="_blank" rel="noreferrer">{host}</a> : recipe.source}</>}
      </p>
      <div className="row gap wrap tools">
        <div className="seg" role="group" aria-label="Scale">
          {FACTORS.map((f) => (
            <button key={f} className={factor === f ? 'on' : ''} onClick={() => setFactor(f)}>{f === 0.5 ? '½' : f}×</button>
          ))}
        </div>
        {recipe.servings && (
          <label className="servings">
            Servings
            <input type="number" min="1" inputMode="numeric" value={servings ?? ''}
              onChange={(e) => { const v = parseFloat(e.target.value); if (v > 0) setFactor(v / recipe.servings!); }} />
          </label>
        )}
        {wakeSupported && (
          <button className={'pill' + (awake ? ' on' : '')} onClick={toggleAwake} aria-pressed={awake}>
            {awake ? 'Screen stays on' : 'Keep screen on'}
          </button>
        )}
      </div>

      <h3>Ingredients</h3>
      <ul className="ing">
        {recipe.ingredients.map((line, i) => {
          if (line.startsWith('#')) return <li key={i} className="sub">{line.replace(/^#+\s*/, '')}</li>;
          const [amt, rest] = splitAmount(scaleLine(line, factor));
          const key = 'i' + i;
          return (
            <li key={i} className={done.has(key) ? 'done' : ''} onClick={() => toggle(key)}>
              <span className="q">{amt}</span><span>{rest}</span>
            </li>
          );
        })}
      </ul>

      {recipe.instructions.length > 0 && (
        <>
          <h3>Instructions</h3>
          <ol className="steps">
            {recipe.instructions.map((s, i) => (
              <li key={i} className={done.has('s' + i) ? 'done' : ''} onClick={() => toggle('s' + i)}>{s}</li>
            ))}
          </ol>
        </>
      )}

      {recipe.notes && (
        <>
          <h3>Notes</h3>
          <div className="notes"><Linkify text={recipe.notes} /></div>
        </>
      )}
    </article>
  );
}
