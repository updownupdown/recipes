import { useEffect, useState } from 'react';
import { useHashRoute, useRecipes } from './hooks';
import { RecipeList } from './views/RecipeList';
import { RecipeView } from './views/RecipeView';
import { RecipeEdit } from './views/RecipeEdit';
import { AddRecipe } from './views/AddRecipe';
import { SharedRecipe } from './views/SharedRecipe';
import { DataPage } from './views/DataPage';

export function App() {
  const route = useHashRoute();
  const recipes = useRecipes();
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    addEventListener('online', on);
    addEventListener('offline', on);
    return () => { removeEventListener('online', on); removeEventListener('offline', on); };
  }, []);

  const [page, arg] = route;
  let body;
  if (page === 'r' && arg) body = <SharedRecipe data={arg} />;
  else if (!recipes) body = <p className="muted pad">Loading…</p>;
  else if (page === 'recipe' && arg) body = <RecipeView recipe={recipes.find((r) => r.id === arg)} />;
  else if (page === 'edit') body = <RecipeEdit recipe={arg ? recipes.find((r) => r.id === arg) : undefined} />;
  else if (page === 'add') body = <AddRecipe />;
  else if (page === 'data') body = <DataPage recipes={recipes} />;
  else body = <RecipeList recipes={recipes} />;

  return (
    <div className="app">
      {!online && <div className="offline">Offline. Everything still works; changes sync later.</div>}
      {body}
    </div>
  );
}
