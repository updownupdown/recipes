import { useState } from 'react';
import { Icon } from '../icons';
import { parseRecipeText } from '../parse';
import type { RecipeDraft } from '../types';
import { RecipeEdit } from './RecipeEdit';

export function AddRecipe() {
  const [mode, setMode] = useState<'choose' | 'paste' | 'form'>('choose');
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<RecipeDraft>();

  if (mode === 'form') return <RecipeEdit draft={draft} />;

  return (
    <div className="page">
      <header className="hd">
        <a className="ib flat" href="#/" aria-label="Back"><Icon name="back" /></a>
        <h1 className="small">Add a recipe</h1>
      </header>
      {mode === 'choose' && (
        <div className="choices">
          <button className="choice" onClick={() => { setDraft(undefined); setMode('form'); }}>
            <span className="tile soft"><Icon name="type" /></span><span><b>Type it in</b><small>Start from a blank recipe.</small></span><Icon name="chev" size={15} className="end" />
          </button>
          <button className="choice" onClick={() => setMode('paste')}>
            <span className="tile soft"><Icon name="clipboard" /></span><span><b>Paste text</b><small>From a website, email or note. You can tidy it before saving.</small></span><Icon name="chev" size={15} className="end" />
          </button>
          <div className="choice disabled">
            <span className="tile soft"><Icon name="link" /></span><span><b>From a web link</b><small>Coming soon</small></span>
          </div>
          <div className="choice disabled">
            <span className="tile soft"><Icon name="camera" /></span><span><b>From a photo</b><small>Coming later</small></span>
          </div>
        </div>
      )}
      {mode === 'paste' && (
        <div className="pad-x stack">
          <textarea id="paste" className="field" rows={14} value={text} onChange={(e) => setText(e.target.value)} autoFocus
            placeholder={'Banana bread\nServes 8\n\nIngredients\n3 ripe bananas\n1/3 cup melted butter\n\nInstructions\nPreheat oven to 350°F…'} />
          <div className="row gap">
            <button className="btn" disabled={!text.trim()} onClick={() => { setDraft(parseRecipeText(text)); setMode('form'); }}>Continue</button>
            <button className="btn ghost" onClick={() => setMode('choose')}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
}
