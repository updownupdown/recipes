import { useEffect, useState } from 'react';
import { deleteRecipe, markViewed, setFavorite } from '../db';
import { download, slug, toJSON, toText } from '../exporters';
import { go } from '../hooks';
import { Icon } from '../icons';
import { shareUrl } from '../share';
import type { Recipe } from '../types';
import { RecipeBody } from './RecipeBody';
import { AppMenu } from './ui';

export function RecipeView({ recipe, recipes }: { recipe?: Recipe; recipes: Recipe[] }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => { if (recipe) markViewed(recipe.id); }, [recipe?.id]);
  if (!recipe) return <p className="pad">This recipe isn't here. <a href="#/">Back to recipes</a></p>;

  const share = async () => {
    const url = await shareUrl(recipe);
    if (navigator.share) {
      try { await navigator.share({ title: recipe.title, url }); } catch { /* cancelled */ }
      return;
    }
    try { await navigator.clipboard.writeText(url); setMsg('Link copied'); } catch { prompt('Copy this link', url); }
  };

  return (
    <div className="page">
      <header className="hd">
        <button className="ib flat" onClick={() => (history.length > 1 ? history.back() : go(''))} aria-label="Back"><Icon name="back" /></button>
        <span className="hd-right">
          <button className={'ib flat' + (recipe.favorite ? ' fav' : '')} onClick={() => setFavorite(recipe.id, !recipe.favorite)} aria-pressed={!!recipe.favorite} aria-label="Favorite">
            <Icon name="heart" style={recipe.favorite ? { fill: 'currentColor' } : undefined} />
          </button>
          <button className="ib flat" onClick={share} aria-label="Share"><Icon name="share" /></button>
          <a className="ib flat" href={`#/edit/${recipe.id}`} aria-label="Edit"><Icon name="edit" /></a>
          <AppMenu recipes={recipes} />
        </span>
      </header>
      {msg && <div className="toast" onAnimationEnd={() => setMsg('')}>{msg}</div>}
      <RecipeBody recipe={recipe} />
      <footer className="recipe-foot">
        <button className="pill" onClick={() => download(slug(recipe.title) + '.json', toJSON([recipe]), 'application/json')}><Icon name="download" size={13} />JSON</button>
        <button className="pill" onClick={() => download(slug(recipe.title) + '.txt', toText([recipe]), 'text/plain')}><Icon name="file" size={13} />Text</button>
        {confirmDelete ? (
          <span className="row gap push">
            <span className="small">Delete this recipe?</span>
            <button className="pill danger" onClick={async () => { await deleteRecipe(recipe.id); go(''); }}>Delete</button>
            <button className="pill" onClick={() => setConfirmDelete(false)}>Keep</button>
          </span>
        ) : (
          <button className="pill danger push" onClick={() => setConfirmDelete(true)}><Icon name="trash" size={13} />Delete</button>
        )}
      </footer>
    </div>
  );
}
