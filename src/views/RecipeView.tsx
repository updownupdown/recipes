import { useState } from 'react';
import { deleteRecipe } from '../db';
import { download, slug, toJSON, toText } from '../exporters';
import { go } from '../hooks';
import { shareUrl } from '../share';
import type { Recipe } from '../types';
import { RecipeBody } from './RecipeBody';

export function RecipeView({ recipe }: { recipe?: Recipe }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState('');
  if (!recipe) return <p className="pad">This recipe isn't here. <a href="#/">Back to recipes</a></p>;

  const share = async () => {
    const url = await shareUrl(recipe);
    if (navigator.share) {
      try { await navigator.share({ title: recipe.title, url }); return; } catch { /* cancelled */ return; }
    }
    try { await navigator.clipboard.writeText(url); setMsg('Link copied'); } catch { prompt('Copy this link', url); }
  };

  return (
    <>
      <nav className="bar">
        <a href="#/">‹ Recipes</a>
        <div className="row gap">
          <button className="link" onClick={share}>Share</button>
          <a href={`#/edit/${recipe.id}`}>Edit</a>
        </div>
      </nav>
      {msg && <div className="toast" onAnimationEnd={() => setMsg('')}>{msg}</div>}
      <RecipeBody recipe={recipe} />
      <footer className="recipe-foot">
        <button className="link" onClick={() => download(slug(recipe.title) + '.json', toJSON([recipe]), 'application/json')}>Export JSON</button>
        <button className="link" onClick={() => download(slug(recipe.title) + '.txt', toText([recipe]), 'text/plain')}>Export text</button>
        {confirmDelete ? (
          <span className="row gap">
            Delete this recipe?
            <button className="link danger" onClick={async () => { await deleteRecipe(recipe.id); go(''); }}>Delete</button>
            <button className="link" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </span>
        ) : (
          <button className="link danger" onClick={() => setConfirmDelete(true)}>Delete</button>
        )}
      </footer>
    </>
  );
}
