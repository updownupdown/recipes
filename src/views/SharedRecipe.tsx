import { useEffect, useState } from 'react';
import { db, saveRecipe } from '../db';
import { replace } from '../hooks';
import { decodeRecipe } from '../share';
import { RecipeBody } from './RecipeBody';
import { Icon } from '../icons';

type Decoded = Awaited<ReturnType<typeof decodeRecipe>>;

export function SharedRecipe({ data }: { data: string }) {
  const [r, setR] = useState<Decoded | null>();
  const [have, setHave] = useState(false);
  useEffect(() => {
    decodeRecipe(data).then(async (x) => { setR(x); const cur = await db.recipes.get(x.id); setHave(!!cur && !cur.deleted); }).catch(() => setR(null));
  }, [data]);

  if (r === undefined) return <p className="pad muted">Opening recipe…</p>;
  if (r === null) return <p className="pad">This link looks broken or incomplete. Ask for it to be sent again. <a href="#/">Go to MyRecipes</a></p>;

  const save = async () => {
    const { id, ...rest } = r;
    // Keep the same id if it's new here, so re-sharing doesn't duplicate; otherwise make a copy.
    const saved = await saveRecipe(have ? rest : { ...rest, id });
    replace('recipe/' + saved.id);
  };

  return (
    <div className="page">
      <header className="hd">
        <a className="ib flat" href="#/" aria-label="MyRecipes"><Icon name="book" /></a>
        <span className="hd-right"><button className="btn" onClick={save}><Icon name="plus" size={16} />{have ? 'Save a copy' : 'Save to my recipes'}</button></span>
      </header>
      <p className="banner">Someone shared this recipe with you. Read it here, or save it to your own MyRecipes.</p>
      <RecipeBody recipe={{ ...r, categories: r.categories ?? [], ingredients: r.ingredients ?? [], instructions: r.instructions ?? [] }} />
    </div>
  );
}
