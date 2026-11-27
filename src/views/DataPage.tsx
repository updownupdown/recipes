import { useRef, useState } from 'react';
import { mergeRecipes } from '../db';
import { download, fromJSON, toJSON, toText } from '../exporters';
import type { Recipe } from '../types';

export function DataPage({ recipes }: { recipes: Recipe[] }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const chosen = picked.size ? recipes.filter((r) => picked.has(r.id)) : recipes;
  const label = picked.size ? `${picked.size} selected` : `all ${recipes.length}`;
  const stamp = new Date().toISOString().slice(0, 10);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      let total = 0;
      for (const f of files) total += await mergeRecipes(fromJSON(await f.text()));
      setMsg(`Imported ${total} recipe${total === 1 ? '' : 's'}.`);
    } catch (e) {
      setMsg(`Couldn't import: ${(e as Error).message} Check that it's a MyRecipes JSON file.`);
    }
    if (file.current) file.current.value = '';
  };

  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <>
      <nav className="bar"><a href="#/">‹ Recipes</a><span /></nav>
      <div className="pad-x stack">
        <h2>Import and export</h2>
        {msg && <p className="banner">{msg}</p>}

        <section className="card stack">
          <h3>Google Drive sync</h3>
          <p className="muted">Coming next: sign in once and your recipes sync across your phone and computer.</p>
        </section>

        <section className="card stack">
          <h3>Import</h3>
          <p className="muted">Add recipes from MyRecipes JSON files. Recipes you already have are updated, not duplicated.</p>
          <input ref={file} type="file" accept=".json,application/json" multiple onChange={(e) => onFiles(e.target.files)} />
        </section>

        <section className="card stack">
          <h3>Export {label}</h3>
          <div className="row gap wrap">
            <button className="btn" disabled={!recipes.length} onClick={() => download(`myrecipes-${stamp}.json`, toJSON(chosen), 'application/json')}>JSON</button>
            <button className="btn" disabled={!recipes.length} onClick={() => download(`myrecipes-${stamp}.txt`, toText(chosen), 'text/plain')}>Plain text</button>
            <button className="btn" disabled title="Needs Google sign-in">Google Doc</button>
          </div>
          {recipes.length > 0 && (
            <>
              <div className="row gap"><span className="muted">Pick recipes, or leave all unticked to export everything.</span>
                {picked.size > 0 && <button className="link" onClick={() => setPicked(new Set())}>Clear</button>}</div>
              <ul className="picklist">
                {recipes.map((r) => (
                  <li key={r.id}><label><input type="checkbox" checked={picked.has(r.id)} onChange={() => toggle(r.id)} /> {r.title}</label></li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </>
  );
}
