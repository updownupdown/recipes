import { useState } from 'react';
import { parseRecipeText } from '../parse';
import type { RecipeDraft } from '../types';
import { RecipeEdit } from './RecipeEdit';

export function AddRecipe() {
  const [mode, setMode] = useState<'choose' | 'paste' | 'form'>('choose');
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<RecipeDraft>();

  if (mode === 'form') return <RecipeEdit draft={draft} />;

  return (
    <>
      <nav className="bar"><a href="#/">‹ Recipes</a><span /></nav>
      <h2 className="pad-x">Add a recipe</h2>
      {mode === 'choose' && (
        <div className="choices">
          <button className="choice" onClick={() => { setDraft(undefined); setMode('form'); }}>
            <b>Type it in</b><span>Fill in a blank form.</span>
          </button>
          <button className="choice" onClick={() => setMode('paste')}>
            <b>Paste text</b><span>Paste a recipe from anywhere. You can fix it up before saving.</span>
          </button>
          <div className="choice disabled">
            <b>From a web link</b><span>Coming soon.</span>
          </div>
          <div className="choice disabled">
            <b>From a photo</b><span>Coming later.</span>
          </div>
        </div>
      )}
      {mode === 'paste' && (
        <div className="pad-x stack">
          <textarea id="paste" rows={14} value={text} onChange={(e) => setText(e.target.value)} autoFocus
            placeholder={'Banana bread\nServes 8\n\nIngredients\n3 ripe bananas\n1/3 cup melted butter\n\nInstructions\nPreheat oven to 350°F…'} />
          <div className="row gap">
            <button className="btn" disabled={!text.trim()} onClick={() => { setDraft(parseRecipeText(text)); setMode('form'); }}>Continue</button>
            <button className="btn ghost" onClick={() => setMode('choose')}>Back</button>
          </div>
        </div>
      )}
    </>
  );
}
