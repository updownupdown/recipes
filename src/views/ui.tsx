import { useEffect, useRef, useState } from 'react';
import { categoryLook, lookVars, recipeLook } from '../categories';
import { Icon } from '../icons';
import { isSignedIn } from '../auth';
import { go, goBack } from '../hooks';
import { answer, useAsk } from '../ask';
import { openSetup } from '../timer';
import { syncNow, useSyncState } from '../sync';
import type { Recipe } from '../types';

export function RecipeTile({ r, size = 38 }: { r: Pick<Recipe, 'title' | 'categories' | 'ingredients'>; size?: number }) {
  const look = recipeLook(r);
  return <span className="tile tint" style={{ ...lookVars(look), width: size, height: size }}><Icon name={look.icon} size={Math.round(size * 0.47)} /></span>;
}

export function RecipeCard({ r }: { r: Recipe }) {
  const cats = r.categories.slice(0, 3).join(', ');
  const flags = !!r.cookNext || !!r.favorite;
  return (
    <a className="card" href={`#/recipe/${r.id}`}>
      <RecipeTile r={r} />
      <span className="card-body">
        <span className="card-title">{r.title}</span>
        {(cats || flags) && (
          <span className="card-meta">
            {r.cookNext && <Icon name="bookmark" size={12} className="flag next" />}
            {r.favorite && <Icon name="heart" size={12} className="flag fav" />}
            {cats && <span className="card-cats">{cats}</span>}
          </span>
        )}
      </span>
      <span className="card-end"><Icon name="chev" size={15} /></span>
    </a>
  );
}

export function CategoryTile({ name, count, href }: { name: string; count: number; href: string }) {
  const look = categoryLook(name);
  return (
    <a className="cat tint" style={lookVars(look)} href={href}>
      <span className="cat-ic"><Icon name={look.icon} size={16} /></span>
      <span><b>{name}</b><small>{count} recipe{count === 1 ? '' : 's'}</small></span>
    </a>
  );
}

export function SyncBadge() {
  const s = useSyncState();
  if (s.kind === 'off') return null;
  if (s.kind === 'syncing') return <span className="sync-badge"><Icon name="refresh" size={13} className="spin" />Syncing</span>;
  if (s.kind === 'idle') return <span className="sync-badge ok"><Icon name="cloud" size={13} />Synced</span>;
  return (
    <button className="sync-badge warn" onClick={() => syncNow(true).catch(() => {})}>
      <Icon name="cloudOff" size={13} />{s.kind === 'error' ? 'Retry sync' : 'Tap to sync'}
    </button>
  );
}

function ago(t?: number) {
  if (!t) return 'not yet';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

export interface MenuAction { label: string; icon: string; onClick: () => void; danger?: boolean }

export function AppMenu({ recipes, actions, actionsTitle }: { recipes: Recipe[]; actions?: MenuAction[]; actionsTitle?: string }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');
  const s = useSyncState();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { const t = e.target as Element; if (!ref.current?.contains(t) || t.classList?.contains('dim')) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  const nav = (path: string) => { setOpen(false); go(path); };
  const sync = () => { setErr(''); syncNow(true).catch((e: Error) => setErr(e.message)); };
  const surprise = () => { if (recipes.length) nav('recipe/' + recipes[Math.floor(Math.random() * recipes.length)].id); };

  const status = s.kind === 'off' || !isSignedIn() ? 'Not connected'
    : s.kind === 'syncing' ? 'Syncing…'
    : s.kind === 'idle' ? `Synced ${ago(s.last)}`
    : s.kind === 'error' ? 'Sync failed' : 'Sign-in expired';

  return (
    <div className="menu-wrap" ref={ref}>
      <button className={'ib' + (open ? ' on' : '')} onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
        <Icon name={open ? 'x' : 'menu'} />
      </button>
      {open && (
        <>
          <div className="dim" onPointerDown={(e) => { e.preventDefault(); setOpen(false); }} onClick={() => setOpen(false)} />
          <div className="menu" role="menu">
            <div className={'menu-sync' + (s.kind === 'off' ? ' off' : '')}>
              <Icon name={s.kind === 'idle' || s.kind === 'syncing' ? 'cloud' : 'cloudOff'} size={18} />
              <span><b>Google Drive</b><small>{err || status}</small></span>
              {s.kind === 'off'
                ? <button className="mini" onClick={() => nav('settings')}>Connect</button>
                : <button className="mini" onClick={sync} disabled={s.kind === 'syncing'}>Sync</button>}
            </div>
            {actions && actions.length > 0 && (
              <>
                {actionsTitle && <div className="menu-label">{actionsTitle}</div>}
                {actions.map((a) => (
                  <button key={a.label} className={'mi' + (a.danger ? ' danger' : '')} onClick={() => { setOpen(false); a.onClick(); }}><Icon name={a.icon} />{a.label}</button>
                ))}
              </>
            )}
            <div className="menu-label">General</div>
            <button className="mi" onClick={() => nav('add')}><Icon name="plus" />Add a recipe</button>
            <button className="mi" onClick={() => { setOpen(false); openSetup(); }}><Icon name="timer" />Timer</button>
            <button className="mi" onClick={surprise}><Icon name="shuffle" />Random recipe</button>
            <button className="mi" onClick={() => nav('duplicates')}><Icon name="merge" />Merge duplicates</button>
            <div className="menu-label"><Icon name="settings" size={12} />Settings</div>
            <button className="mi sub" onClick={() => nav('settings#sync')}><Icon name="cloud" />Sync and stats<Icon name="chev" size={14} /></button>
            <button className="mi sub" onClick={() => nav('settings#data')}><Icon name="upload" />Import and export<Icon name="chev" size={14} /></button>
            <button className="mi sub" onClick={() => nav('settings#history')}><Icon name="clock" />History and undo<Icon name="chev" size={14} /></button>
          </div>
        </>
      )}
    </div>
  );
}

/** Back to the previous page (or Home when there isn't one in the app). */
export function BackButton({ fallback }: { fallback?: string }) {
  return <button type="button" className="ib flat" onClick={() => goBack(fallback ?? '')} aria-label="Back"><Icon name="back" /></button>;
}

export function TopBar({ title, back, recipes, extra, logo }: { title?: string; back?: string; recipes: Recipe[]; extra?: React.ReactNode; logo?: boolean }) {
  return (
    <header className="hd">
      {back !== undefined && <BackButton fallback={back} />}
      {logo && <img className="logo" src={import.meta.env.BASE_URL + 'icon.svg'} alt="" width={34} height={34} />}
      {title && <h1 className={back !== undefined ? 'small' : ''}>{title}</h1>}
      <span className="hd-right">{extra}<SyncBadge /><AppMenu recipes={recipes} /></span>
    </header>
  );
}

export function SearchBox({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean }) {
  return (
    <label className="srch">
      <Icon name="search" />
      <input type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} autoFocus={autoFocus} aria-label="Search recipes" />
      {value && <button className="srch-x" onClick={(e) => { e.preventDefault(); onChange(''); }} aria-label="Clear search"><Icon name="x" size={15} /></button>}
    </label>
  );
}

/** The app's one confirmation prompt: a floating card at the bottom of the screen (see ask.ts). */
export function AskHost() {
  const a = useAsk();
  useEffect(() => {
    if (!a) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') answer(false); };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [a]);
  if (!a) return null;
  return (
    <div className="ask-wrap">
      <div className="ask-dim" onClick={() => answer(false)} />
      <div className="ask" role="alertdialog" aria-label={a.title}>
        <b>{a.title}</b>
        {a.body && <p>{a.body}</p>}
        {a.copy && <input className="ask-copy" readOnly value={a.copy} onFocus={(e) => e.target.select()} autoFocus />}
        <div className="ask-btns">
          {a.no !== null && <button type="button" className="ask-no" onClick={() => answer(false)}>{a.no ?? 'Cancel'}</button>}
          <button type="button" className={'ask-yes' + (a.danger ? ' danger' : '')} onClick={() => answer(true)} autoFocus={!a.copy}>{a.yes}</button>
        </div>
      </div>
    </div>
  );
}
