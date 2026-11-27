import { useEffect, useState } from 'react';
import { useHashRoute, useRecipes } from './hooks';
import { Home } from './views/Home';
import { AllRecipes } from './views/AllRecipes';
import { RecipeView } from './views/RecipeView';
import { RecipeEdit } from './views/RecipeEdit';
import { AddRecipe } from './views/AddRecipe';
import { SharedRecipe } from './views/SharedRecipe';
import { Settings } from './views/Settings';

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

  const [rawPage = '', arg] = route;
  const [page, anchor] = rawPage.split('#');
  let body;
  if (page === 'r' && arg) body = <SharedRecipe data={arg} />;
  else if (!recipes) body = <p className="muted pad">Loading…</p>;
  else if (page === 'recipe' && arg) body = <RecipeView key={arg} recipe={recipes.find((r) => r.id === arg)} recipes={recipes} />;
  else if (page === 'edit') body = <RecipeEdit key={arg ?? 'new'} recipe={arg ? recipes.find((r) => r.id === arg) : undefined} />;
  else if (page === 'add') body = <AddRecipe />;
  else if (page === 'all') body = <AllRecipes key="all" recipes={recipes} />;
  else if (page === 'favorites') body = <AllRecipes key="fav" recipes={recipes} favoritesOnly />;
  else if (page === 'c' && arg) body = <AllRecipes key={'c' + arg} recipes={recipes} category={decodeURIComponent(arg)} />;
  else if (page === 'settings' || page === 'data') body = <Settings recipes={recipes} anchor={anchor} />;
  else body = <Home recipes={recipes} />;

  return (
    <div className="app">
      {!online && <div className="offline">Offline. Everything still works, and changes sync later.</div>}
      {body}
    </div>
  );
}
