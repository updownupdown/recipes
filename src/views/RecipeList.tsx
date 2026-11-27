import { useMemo, useState } from 'react';
import { go, normalize } from '../hooks';
import type { Recipe } from '../types';
import { SyncChip } from './SyncChip';

export function RecipeList({ recipes }: { recipes: Recipe[] }) {
  const [q, setQ] = useState(() => sessionStorage.getItem('q') ?? '');
  const [cat, setCat] = useState<string | null>(() => sessionStorage.getItem('cat'));

  const cats = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of recipes) for (const c of r.categories) m.set(c, (m.get(c) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [recipes]);

  const shown = useMemo(() => {
    const terms = normalize(q).split(/\s+/).filter(Boolean);
    return recipes.filter((r) => {
      if (cat && !r.categories.includes(cat)) return false;
      if (!terms.length) return true;
      const hay = normalize([r.title, r.categories.join(' '), r.ingredients.join(' '), r.notes ?? ''].join(' '));
      return terms.every((t) => hay.includes(t));
    });
  }, [recipes, q, cat]);

  const setQuery = (v: string) => { setQ(v); sessionStorage.setItem('q', v); };
  const pickCat = (c: string | null) => {
    setCat(c);
    if (c) sessionStorage.setItem('cat', c); else sessionStorage.removeItem('cat');
  };

  return (
    <>
      <header className="top">
        <div className="row between">
          <h1>Recipes</h1>
          <div className="row gap"><SyncChip /><a className="btn ghost small" href="#/data">Menu</a></div>
        </div>
        <input
          className="search"
          type="search"
          placeholder="Search name, ingredient, category"
          value={q}
          onChange={(e) => setQuery(e.target.value)}
        />
      </header>
      {cats.length > 0 && (
        <div className="chips">
          <button className={'chip' + (cat ? '' : ' on')} onClick={() => pickCat(null)}>All {recipes.length}</button>
          {cats.map(([c, n]) => (
            <button key={c} className={'chip' + (cat === c ? ' on' : '')} onClick={() => pickCat(cat === c ? null : c)}>
              {c} <span className="n">{n}</span>
            </button>
          ))}
        </div>
      )}
      {recipes.length === 0 ? (
        <div className="empty">
          <p><b>No recipes yet.</b></p>
          <p className="muted">Add one, paste one in, or import a JSON file.</p>
          <div className="row gap"><a className="btn" href="#/add">Add a recipe</a><a className="btn ghost" href="#/data">Import</a></div>
        </div>
      ) : (
        <ul className="list">
          {shown.map((r) => (
            <li key={r.id}>
              <a href={`#/recipe/${r.id}`}>
                <b>{r.title}</b>
                <span>{[r.categories.join(', '), r.servings ? `${r.servings} servings` : ''].filter(Boolean).join(' · ')}</span>
              </a>
            </li>
          ))}
          {shown.length === 0 && <li className="muted pad">No recipes match “{q}”.</li>}
        </ul>
      )}
      <button className="fab" onClick={() => go('add')}>+ Add</button>
    </>
  );
}
