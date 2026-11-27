import { useEffect, useState } from 'react';
import { db, saveRecipe } from '../db';
import { go } from '../hooks';
import { decodeRecipe } from '../share';
import { RecipeBody } from './RecipeBody';

type Decoded = Awaited<ReturnType<typeof decodeRecipe>>;

export function SharedRecipe({ data }: { data: string }) {
  const [r, setR] = useState<Decoded | null>();
  const [have, setHave] = useState(false);
  useEffect(() => {
    decodeRecipe(data).then(async (x) => { setR(x); setHave(!!(await db.recipes.get(x.id))?.updatedAt); }).catch(() => setR(null));
  }, [data]);

  if (r === undefined) return <p className="pad muted">Opening recipe…</p>;
  if (r === null) return <p className="pad">This link looks broken or incomplete. Ask for it to be sent again. <a href="#/">Go to MyRecipes</a></p>;

  const save = async () => {
    const { id, ...rest } = r;
    // Keep the same id if it's new here, so re-sharing doesn't duplicate; otherwise make a copy.
    const saved = await saveRecipe(have ? { ...rest, title: rest.title } : { ...rest, id });
    go('recipe/' + saved.id);
  };

  return (
    <>
      <nav className="bar">
        <a href="#/">MyRecipes</a>
        <button className="btn" onClick={save}>{have ? 'Save a copy' : 'Save to my recipes'}</button>
      </nav>
      <p className="banner">Shared recipe. You can read it here without saving.</p>
      <RecipeBody recipe={{ ...r, categories: r.categories ?? [], ingredients: r.ingredients ?? [], instructions: r.instructions ?? [] }} />
    </>
  );
}
