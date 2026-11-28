import { useMemo, useState } from 'react';
import { useSessionState } from '../hooks';
import { categoryLook, lookVars } from '../categories';
import { Icon } from '../icons';
import { categoryCounts, searchRecipes } from '../search';
import type { Recipe } from '../types';
import { RecipeCard, SearchBox, TopBar } from './ui';

type Sort = 'az' | 'new';

const AZ = new Intl.Collator(undefined, { sensitivity: 'base', ignorePunctuation: true, numeric: true });

export function AllRecipes({ recipes, favoritesOnly: favStart, category }: { recipes: Recipe[]; favoritesOnly?: boolean; category?: string }) {
  const k = 'list:' + (category ?? (favStart ? 'fav' : 'all')) + ':';
  const [q, setQ] = useSessionState(k + 'q', '');
  const [sort, setSort] = useSessionState<Sort>(k + 'sort', 'az');
  const [favOnly, setFavOnly] = useSessionState(k + 'fav', !!favStart);
  const [catList, setCatList] = useSessionState<string[]>(k + 'cats', []);
  const cats = new Set(catList);
  const setCats = (f: Set<string> | ((s: Set<string>) => Set<string>)) => setCatList((l) => [...(typeof f === 'function' ? f(new Set(l)) : f)]);
  const [filterOpen, setFilterOpen] = useState(false);
  const counts = useMemo(() => categoryCounts(recipes), [recipes]);

  let list = category ? recipes.filter((r) => r.categories.includes(category)) : recipes;
  if (favOnly) list = list.filter((r) => r.favorite);
  if (cats.size) list = list.filter((r) => r.categories.some((c) => cats.has(c)));
  list = q.trim() ? searchRecipes(list, q) : [...list].sort(sort === 'az' ? (a, b) => AZ.compare(a.title, b.title) : (a, b) => b.createdAt - a.createdAt);

  // A to Z headers only when browsing alphabetically.
  const groups: [string, Recipe[]][] = [];
  if (sort === 'az' && !q.trim()) {
    for (const r of list) {
      // Group by the first letter, ignoring quotes and other punctuation ('"Chinese" Beef' goes under C).
      const first = r.title.normalize('NFD').replace(/[^\p{L}\p{N}]/gu, '')[0] ?? '';
      const L = /[a-z]/i.test(first) ? first.toUpperCase() : '#';
      if (groups.at(-1)?.[0] !== L) groups.push([L, []]);
      groups.at(-1)![1].push(r);
    }
  } else groups.push(['', list]);

  const toggleCat = (c: string) => setCats((s) => { const n = new Set(s); if (n.has(c)) n.delete(c); else n.add(c); return n; });
  const look = category ? categoryLook(category) : undefined;
  const title = category ?? (favStart ? 'Favorites' : 'All recipes');

  return (
    <div className="page">
      <TopBar back="" title={category ? undefined : title} recipes={recipes} />
      {look && (
        <div className="band tint" style={lookVars(look)}>
          <span className="band-ic"><Icon name={look.icon} size={22} /></span>
          <h1>{category}</h1>
          <p>{list.length} recipe{list.length === 1 ? '' : 's'}</p>
        </div>
      )}
      <div className="pad-x">
        <SearchBox value={q} onChange={setQ} placeholder={category ? `Search ${category}` : favStart ? 'Search favorites' : `Search all ${recipes.length}`} />
      </div>
      <div className="tools">
        <button className="pill" onClick={() => setSort(sort === 'az' ? 'new' : 'az')}><Icon name="sliders" size={13} />{sort === 'az' ? 'A to Z' : 'Newest'}</button>
        {!category && (
          <button className={'pill' + (cats.size ? ' dark' : '')} onClick={() => setFilterOpen((o) => !o)} aria-expanded={filterOpen}>
            <Icon name="filter" size={13} />{cats.size ? `${cats.size} categor${cats.size === 1 ? 'y' : 'ies'}` : 'Filter'}
          </button>
        )}
        <button className={'pill push' + (favOnly ? ' dark' : '')} onClick={() => setFavOnly((f) => !f)} aria-pressed={favOnly}><Icon name="heart" size={13} />Favorites</button>
      </div>
      {filterOpen && !category && (
        <div className="filter">
          <div className="filter-head"><b>Show categories</b>{cats.size > 0 && <button className="link" onClick={() => setCats(new Set())}>Clear</button>}</div>
          <div className="filter-list">
            {counts.map(([c, n]) => {
              const l = categoryLook(c);
              return (
                <label key={c} className="filter-item">
                  <input type="checkbox" checked={cats.has(c)} onChange={() => toggleCat(c)} />
                  <span className="dot tint" style={lookVars(l)}><Icon name={l.icon} size={13} /></span>
                  <span className="grow">{c}</span><span className="muted small">{n}</span>
                </label>
              );
            })}
          </div>
          <button className="btn block" onClick={() => setFilterOpen(false)}>Show {list.length} recipe{list.length === 1 ? '' : 's'}</button>
        </div>
      )}
      {groups.map(([L, rs]) => (
        <section key={L || 'all'}>
          {L && <div className="letter">{L}</div>}
          <div className="cards">{rs.map((r) => <RecipeCard key={r.id} r={r} />)}</div>
        </section>
      ))}
      {list.length === 0 && <p className="muted pad">{favOnly ? 'No favorites here yet. Tap the heart on a recipe to add it.' : 'No recipes match.'}</p>}
    </div>
  );
}
