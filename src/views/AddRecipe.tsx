import { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons';
import { parseRecipeText } from '../parse';
import { guessCategory } from '../categories';
import { fixCaps } from '../caps';
import { readerConfigured, recipeFromUrl } from '../webImport';
import type { RecipeDraft } from '../types';
import { RecipeEdit } from './RecipeEdit';
import { BackButton } from './ui';

type Mode = 'choose' | 'paste' | 'link' | 'form';

/** Something shared into the app from another app (Android share sheet), stashed by main.tsx. */
export function takeShared(): { url?: string; text?: string } | undefined {
  try {
    const s = sessionStorage.getItem('shared_in');
    if (!s) return undefined;
    sessionStorage.removeItem('shared_in');
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

function withGuess(d: RecipeDraft): RecipeDraft {
  if (d.categories.length) return d;
  const g = guessCategory(d.title, d.ingredients.join(' '));
  return g ? { ...d, categories: [g.name] } : d;
}

export function AddRecipe() {
  const [shared] = useState(takeShared);
  const [mode, setMode] = useState<Mode>(shared?.url ? 'link' : shared?.text ? 'paste' : 'choose');
  const [text, setText] = useState(shared?.text ?? '');
  const [link, setLink] = useState(shared?.url ?? '');
  const [draft, setDraft] = useState<RecipeDraft>();
  const [busy, setBusy] = useState<{ label: string; fraction?: number }>();
  const [error, setError] = useState('');
  const autoFetched = useRef(false);

  const fetchLink = async (u = link) => {
    const url = u.trim().match(/https?:\/\/\S+/)?.[0] ?? (u.trim() && !/\s/.test(u.trim()) ? 'https://' + u.trim() : '');
    if (!url) { setError('That does not look like a web link.'); return; }
    setError('');
    setBusy({ label: 'Reading the recipe…' });
    try {
      setDraft(await recipeFromUrl(url));
      setMode('form');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(undefined);
    }
  };

  useEffect(() => {
    if (mode === 'link' && shared?.url && readerConfigured() && !autoFetched.current) {
      autoFetched.current = true;
      fetchLink(shared.url);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (mode === 'form') return <RecipeEdit draft={draft} />;

  const back = mode === 'choose' ? undefined : () => { setMode('choose'); setError(''); };
  const titles: Record<Mode, string> = { choose: 'Add a recipe', paste: 'Paste text', link: 'From a web link', form: '' };

  return (
    <div className="page">
      <header className="hd">
        {back ? <button className="ib flat" onClick={back} aria-label="Back"><Icon name="back" /></button>
          : <BackButton />}
        <h1 className="small">{titles[mode]}</h1>
      </header>

      {mode === 'choose' && (
        <div className="choices">
          <button className="choice" onClick={() => setMode('link')}>
            <span className="tile soft"><Icon name="link" /></span><span><b>From a web link</b><small>Paste the address of a recipe page.</small></span><Icon name="chev" size={15} className="end" />
          </button>
          <button className="choice" onClick={() => setMode('paste')}>
            <span className="tile soft"><Icon name="clipboard" /></span><span><b>Paste text</b><small>From an email, message or note.</small></span><Icon name="chev" size={15} className="end" />
          </button>
          <button className="choice" onClick={() => { setDraft(undefined); setMode('form'); }}>
            <span className="tile soft"><Icon name="type" /></span><span><b>Type it in</b><small>Start from a blank recipe.</small></span><Icon name="chev" size={15} className="end" />
          </button>
        </div>
      )}

      {mode === 'link' && (
        <div className="pad-x stack">
          {readerConfigured() ? (
            <>
              <form className="srch" onSubmit={(e) => { e.preventDefault(); fetchLink(); }}>
                <Icon name="link" size={18} />
                <input type="url" inputMode="url" placeholder="https://…" value={link} onChange={(e) => setLink(e.target.value)} autoFocus={!shared?.url} aria-label="Recipe link" />
              </form>
              <button className="btn" disabled={!link.trim() || !!busy} onClick={() => fetchLink()}>
                {busy ? <><Icon name="refresh" size={16} className="spin" /> {busy.label}</> : 'Get recipe'}
              </button>
              <p className="muted small">Works with most recipe sites. You can check and edit everything before saving.</p>
              {error && (
                <div className="panel">
                  <p className="error">{error}</p>
                  <p className="small muted">You can still copy the recipe from the page and paste it here.</p>
                  <button className="btn ghost" onClick={() => { setError(''); setMode('paste'); }}><Icon name="clipboard" size={16} /> Paste text instead</button>
                </div>
              )}
            </>
          ) : (
            <div className="panel">
              <p>Reading recipes from links needs a small free helper that isn't switched on yet.</p>
              <p className="small muted">Until then, copy the recipe from the page and paste it.</p>
              <button className="btn ghost" onClick={() => { setText(link); setMode('paste'); }}><Icon name="clipboard" size={16} /> Paste text instead</button>
            </div>
          )}
        </div>
      )}

      {mode === 'paste' && (
        <div className="pad-x stack">
          <textarea id="paste" className="field" rows={14} value={text} onChange={(e) => setText(e.target.value)} autoFocus
            placeholder={'Banana bread\nServes 8\n\nIngredients\n3 ripe bananas\n1/3 cup melted butter\n\nInstructions\nPreheat oven to 350°F…'} />
          <div className="row gap">
            <button className="btn" disabled={!text.trim()} onClick={() => { setDraft(withGuess(fixCaps(parseRecipeText(text)))); setMode('form'); }}>Continue</button>
          </div>
        </div>
      )}
    </div>
  );
}
