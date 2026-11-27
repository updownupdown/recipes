import { useEffect, useState } from 'react';
import { deleteRecipe, markViewed, setCookNext, setFavorite } from '../db';
import { download, slug, toJSON, toText } from '../exporters';
import { goBack } from '../hooks';
import { Icon } from '../icons';
import { shareUrl } from '../share';
import type { Recipe } from '../types';
import { RecipeBody } from './RecipeBody';
import { AppMenu, BackButton } from './ui';

export function RecipeView({ recipe, recipes }: { recipe?: Recipe; recipes: Recipe[] }) {
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

  const remove = async () => {
    if (!confirm(`Delete “${recipe.title}”?\n\nYou can bring it back from History and undo in the menu.`)) return;
    await deleteRecipe(recipe.id);
    goBack('');
  };

  return (
    <div className="page">
      <header className="hd">
        <BackButton />
        <span className="hd-right">
          <button className={'ib flat' + (recipe.cookNext ? ' queued' : '')} onClick={() => { setCookNext(recipe.id, !recipe.cookNext); setMsg(recipe.cookNext ? 'Removed from Cook next' : 'Added to Cook next'); }} aria-pressed={!!recipe.cookNext} aria-label="Cook next" title="Cook next">
            <Icon name="bookmark" style={recipe.cookNext ? { fill: 'currentColor' } : undefined} />
          </button>
          <button className={'ib flat' + (recipe.favorite ? ' fav' : '')} onClick={() => setFavorite(recipe.id, !recipe.favorite)} aria-pressed={!!recipe.favorite} aria-label="Favorite">
            <Icon name="heart" style={recipe.favorite ? { fill: 'currentColor' } : undefined} />
          </button>
          <button className="ib flat" onClick={share} aria-label="Share"><Icon name="share" /></button>
          <a className="ib flat" href={`#/edit/${recipe.id}`} aria-label="Edit"><Icon name="edit" /></a>
          <AppMenu recipes={recipes} actionsTitle="This recipe" actions={[
            { label: 'Download as JSON', icon: 'download', onClick: () => download(slug(recipe.title) + '.json', toJSON([recipe]), 'application/json') },
            { label: 'Download as text', icon: 'file', onClick: () => download(slug(recipe.title) + '.txt', toText([recipe]), 'text/plain') },
            { label: 'Delete recipe', icon: 'trash', danger: true, onClick: remove },
          ]} />
        </span>
      </header>
      {msg && <div className="toast" onAnimationEnd={() => setMsg('')}>{msg}</div>}
      <RecipeBody recipe={recipe} />
    </div>
  );
}
