import { HUES, lookVars, type Look } from '../categories';
import { useMemo, useState } from 'react';
import { recentIds } from '../db';
import { Icon } from '../icons';
import { categoryCounts, searchRecipes } from '../search';
import type { Recipe } from '../types';
import { CategoryTile, RecipeCard, SearchBox, TopBar } from './ui';

const ss = {
  get: (k: string) => { try { return sessionStorage.getItem(k) ?? ''; } catch { return ''; } },
  set: (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch { /* ignore */ } },
};

export function Home({ recipes }: { recipes: Recipe[] }) {
  const [q, setQ] = useState(() => ss.get('home_q'));
  const setQuery = (v: string) => { setQ(v); ss.set('home_q', v); };
  const results = useMemo(() => (q.trim() ? searchRecipes(recipes, q) : []), [recipes, q]);
  const favs = recipes.filter((r) => r.favorite);
  const queue = recipes.filter((r) => r.cookNext).sort((a, b) => a.cookNext! - b.cookNext!);
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const added = [...recipes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
  const addedIds = new Set(added.map((r) => r.id));
  const recent = recentIds().map((id) => byId.get(id)).filter((r): r is Recipe => !!r && !r.favorite && !addedIds.has(r.id)).slice(0, 3);
  const cats = categoryCounts(recipes);

  return (
    <div className="page">
      <TopBar title="MyRecipes" logo recipes={recipes} />
      <div className="pad-x">
        <SearchBox value={q} onChange={setQuery} placeholder={`Search ${recipes.length} recipes or ingredients`} />
      </div>

      {q.trim() ? (
        <section>
          <div className="sec"><b>{results.length} result{results.length === 1 ? '' : 's'}</b></div>
          <div className="cards">{results.map((r) => <RecipeCard key={r.id} r={r} />)}</div>
          {results.length === 0 && <p className="muted pad-x">Nothing matches “{q}”. Try an ingredient, like “lentils”.</p>}
        </section>
      ) : recipes.length === 0 ? (
        <div className="empty">
          <span className="empty-ic"><Icon name="book" size={26} /></span>
          <h2>Your recipe box is empty</h2>
          <p className="muted">Add a recipe, or import your JSON file from the menu.</p>
          <div className="row gap center"><a className="btn" href="#/add"><Icon name="plus" size={16} />Add a recipe</a><a className="btn ghost" href="#/settings#import">Import</a></div>
        </div>
      ) : (
        <>
          <nav className="qa">
            <a href="#/favorites" className="solid" style={lookVars({ hue: HUES.pink } as Look)}><Icon name="heart" size={22} /><b>Favorites</b></a>
            <a href="#/all" className="solid" style={lookVars({ hue: HUES.indigo } as Look)}><Icon name="list" size={22} /><b>All</b></a>
            <a href="#/add" className="solid" style={lookVars({ hue: HUES.green } as Look)}><Icon name="plus" size={22} /><b>Add</b></a>
          </nav>

          <section>
            <div className="sec"><b>Cook next</b>{queue.length > 0 && <span className="muted small">{queue.length}</span>}</div>
            {queue.length > 0
              ? <div className="cards">{queue.map((r) => <RecipeCard key={r.id} r={r} />)}</div>
              : <p className="hint pad-x small muted"><Icon name="bookmark" size={13} />Tap the bookmark on a recipe to line it up here.</p>}
          </section>

          {favs.length > 0 && (
            <section>
              <div className="sec"><b>Favorites</b>{favs.length > 3 && <a href="#/favorites">See all<Icon name="chev" size={13} /></a>}</div>
              <div className="cards">{favs.slice(0, 3).map((r) => <RecipeCard key={r.id} r={r} />)}</div>
            </section>
          )}

          {added.length > 0 && (
            <section>
              <div className="sec"><b>Recently added</b>{recipes.length > 3 && <a href="#/all" onClick={() => ss.set('list:all:sort', JSON.stringify('new'))}>See all<Icon name="chev" size={13} /></a>}</div>
              <div className="cards">{added.map((r) => <RecipeCard key={r.id} r={r} />)}</div>
            </section>
          )}

          {recent.length > 0 && (
            <section>
              <div className="sec"><b>Recently viewed</b></div>
              <div className="cards">{recent.map((r) => <RecipeCard key={r.id} r={r} />)}</div>
            </section>
          )}

          {cats.length > 0 && (
            <section>
              <div className="sec"><b>Categories</b><span className="muted small">{cats.length}</span></div>
              <div className="cats">
                {cats.map(([c, n]) => <CategoryTile key={c} name={c} count={n} href={`#/c/${encodeURIComponent(c)}`} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
