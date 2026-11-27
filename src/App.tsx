import { useEffect, useRef, useState } from 'react';
import { useHashRoute, useRecipes } from './hooks';
import { Home } from './views/Home';
import { AllRecipes } from './views/AllRecipes';
import { RecipeView } from './views/RecipeView';
import { RecipeEdit } from './views/RecipeEdit';
import { AddRecipe } from './views/AddRecipe';
import { SharedRecipe } from './views/SharedRecipe';
import { Settings } from './views/Settings';
import { TimerBar } from './views/TimerBar';

export function App() {
  const route = useHashRoute();
  const under = useRef<string[]>([]);
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
  // Settings opens as a pop-up over the page you were on.
  const isSettings = page === 'settings' || page === 'data';
  if (!isSettings) under.current = route;
  const [upPage = '', upArg] = isSettings ? under.current : route;
  const base = upPage.split('#')[0];
  let body;
  if (base === 'r' && upArg) body = <SharedRecipe data={upArg} />;
  else if (!recipes) body = <p className="muted pad">Loading…</p>;
  else if (base === 'recipe' && upArg) body = <RecipeView key={upArg} recipe={recipes.find((r) => r.id === upArg)} recipes={recipes} />;
  else if (base === 'edit') body = <RecipeEdit key={upArg ?? 'new'} recipe={upArg ? recipes.find((r) => r.id === upArg) : undefined} />;
  else if (base === 'add') body = <AddRecipe />;
  else if (base === 'all') body = <AllRecipes key="all" recipes={recipes} />;
  else if (base === 'favorites') body = <AllRecipes key="fav" recipes={recipes} favoritesOnly />;
  else if (base === 'c' && upArg) body = <AllRecipes key={'c' + upArg} recipes={recipes} category={decodeURIComponent(upArg)} />;
  else body = <Home recipes={recipes} />;

  return (
    <div className="app">
      <TimerBar />
      {!online && <div className="offline">Offline. Everything still works, and changes sync later.</div>}
      {body}
      {isSettings && recipes && <Settings recipes={recipes} anchor={anchor} />}
    </div>
  );
}
