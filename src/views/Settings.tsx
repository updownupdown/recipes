import { useEffect, useRef, useState } from 'react';
import { isSignedIn, requestToken, signedInEmail, signOut } from '../auth';
import { allRecipes, mergeRecipes, saveRecipe } from '../db';
import { existingMatch } from '../duplicates';
import { parseRecipes } from '../parse';
import { fixCaps } from '../caps';
import { guessCategory } from '../categories';
import { createDoc } from '../drive';
import { download, fromJSON, toHTML, toJSON, toText } from '../exporters';
import { Icon } from '../icons';
import { markSignedOut, syncNow, useSyncState } from '../sync';
import type { Recipe } from '../types';
import { RecipeTile, SyncBadge } from './ui';
import { go, goBack, replace } from '../hooks';
import { categoryCounts } from '../search';
import { RecentlyDeleted, VersionHistory } from './History';

export function Settings({ recipes, anchor }: { recipes: Recipe[]; anchor?: string }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [showPick, setShowPick] = useState(false);
  const [msg, setMsg] = useState('');
  const [docLink, setDocLink] = useState('');
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const sync = useSyncState();
  const connected = sync.kind !== 'off' && isSignedIn();
  const chosen = picked.size ? recipes.filter((r) => picked.has(r.id)) : recipes;
  const label = picked.size ? `${picked.size} selected` : `all ${recipes.length}`;
  const stamp = new Date().toISOString().slice(0, 10);

  const tab: Tab = anchor === 'import' || anchor === 'export' || anchor === 'data' ? 'data' : anchor === 'history' || anchor === 'deleted' ? 'history' : 'sync';
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => { body.current?.scrollTo(0, 0); }, [tab]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') goBack(''); };
    addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, []);
  const close = () => goBack('');
  const stats = [
    [recipes.length, 'recipes'],
    [recipes.filter((r) => r.favorite).length, 'favorites'],
    [categoryCounts(recipes).length, 'categories'],
    [recipes.filter((r) => r.cookNext).length, 'to cook next'],
  ] as const;

  const connect = async () => {
    setMsg('');
    try { await syncNow(true); setMsg('Connected. Your recipes sync to MyRecipes/recipes.json in your Drive.'); }
    catch (e) { setMsg((e as Error).message); }
  };
  const disconnect = () => { signOut(); markSignedOut(); setMsg('Disconnected. Your recipes stay on this device.'); };
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      let total = 0, seen = 0, skipped = 0;
      for (const f of files) {
        const body = await f.text();
        if (/^\s*[[{]/.test(body)) {
          const list = fromJSON(body);
          seen += list.length;
          total += await mergeRecipes(list);
        } else {
          // Plain text or Markdown: one or many recipes.
          const saved = await allRecipes();
          const all = parseRecipes(body).map(fixCaps);
          const drafts = all.filter((d) => !existingMatch(d, saved));
          skipped += all.length - drafts.length;
          for (const d of drafts) {
            const g = d.categories.length ? undefined : guessCategory(d.title, d.ingredients.join(' '));
            await saveRecipe(g ? { ...d, categories: [g.name] } : d);
          }
          seen += drafts.length; total += drafts.length;
        }
      }
      const same = seen - total;
      setMsg(`Imported ${total} recipe${total === 1 ? '' : 's'}.` + (same ? ` ${same} ${same === 1 ? 'was' : 'were'} already up to date.` : '') + (skipped ? ` Skipped ${skipped} you already have.` : ''));
    } catch (e) {
      setMsg(`Couldn't import: ${(e as Error).message} Check that it's a MyRecipes JSON file or a text file of recipes.`);
    }
    if (file.current) file.current.value = '';
  };
  const exportDoc = async () => {
    setMsg(''); setDocLink(''); setBusy(true);
    try {
      const token = await requestToken();
      const name = chosen.length === 1 ? chosen[0].title : `MyRecipes (${chosen.length} recipes) ${stamp}`;
      setDocLink(await createDoc(token, name, toHTML(chosen)));
    } catch (e) { setMsg(`Couldn't create the Google Doc: ${(e as Error).message}`); }
    setBusy(false);
  };
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="dim" onClick={close} />
      <div className="modal settings">
        <div className="modal-head">
          <b>Settings</b>
          <button type="button" className="ib flat" onClick={close} aria-label="Close settings"><Icon name="x" /></button>
        </div>
        <div className="tabs" role="tablist">
          {TABS.map(([id, name]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => { setMsg(''); replace('settings#' + id); }}>{name}</button>
          ))}
        </div>
      <div className="modal-body stack" ref={body}>
        {msg && <p className="banner flush">{msg}</p>}

        {tab === 'sync' && <>
        <div className="stats">
          {stats.map(([n, l]) => <div key={l}><b>{n}</b><small>{l}</small></div>)}
        </div>
        <section className="panel" id="sync">
          <div className="panel-head"><span className="tile soft"><Icon name="cloud" /></span><span><b>Google Drive sync</b><small>{connected ? `Signed in${signedInEmail() ? ` as ${signedInEmail()}` : ''}` : 'Keep your phone and computer in sync'}</small></span></div>
          {connected ? (
            <div className="row gap wrap"><SyncBadge /><button className="pill" onClick={() => syncNow(true).catch((e) => setMsg(e.message))}><Icon name="refresh" size={13} />Sync now</button><button className="pill danger push" onClick={disconnect}>Disconnect</button></div>
          ) : (
            <>
              <p className="muted small">Sign in once. Recipes are saved to a MyRecipes folder in your own Drive. The app can only see files it creates.</p>
              <div><button className="btn" onClick={connect}>Connect Google Drive</button></div>
            </>
          )}
        </section>

        <div className="about">
          <img src={import.meta.env.BASE_URL + 'icon.svg'} alt="" width={40} height={40} />
          <b>MyRecipes</b>
          <p>Your recipes are saved on this device,<br />and in your own Google Drive if you connect it.</p>
          <a href="./privacy.html">Privacy policy</a>
        </div>
        </>}

        {tab === 'history' && <>
        <VersionHistory connected={connected} onMessage={(m) => { setMsg(m); body.current?.scrollTo(0, 0); }} />
        <RecentlyDeleted onMessage={(m) => { setMsg(m); body.current?.scrollTo(0, 0); }} />
        </>}

        {tab === 'data' && <>

        <section className="panel" id="import">
          <div className="panel-head"><span className="tile soft"><Icon name="upload" /></span><span><b>Import</b><small>MyRecipes JSON backups, or text and Markdown files with one or more recipes.</small></span></div>
          <label className="btn ghost filebtn"><Icon name="upload" size={16} />Choose file<input ref={file} type="file" accept=".json,.txt,.md,application/json,text/plain,text/markdown" multiple onChange={(e) => onFiles(e.target.files)} /></label>
        </section>

        <section className="panel" id="export">
          <div className="panel-head"><span className="tile soft"><Icon name="download" /></span><span><b>Export {label}</b><small>Pick recipes below, or export everything.</small></span></div>
          <div className="row gap wrap">
            <button className="pill" disabled={!recipes.length} onClick={() => download(`myrecipes-${stamp}.json`, toJSON(chosen), 'application/json')}><Icon name="download" size={13} />JSON</button>
            <button className="pill" disabled={!recipes.length} onClick={() => download(`myrecipes-${stamp}.txt`, toText(chosen), 'text/plain')}><Icon name="file" size={13} />Plain text</button>
            <button className="pill" disabled={!recipes.length || busy} onClick={exportDoc}><Icon name="file" size={13} />{busy ? 'Creating…' : 'Google Doc'}</button>
          </div>
          {docLink && <p className="banner flush">Google Doc created in your MyRecipes folder. <a href={docLink} target="_blank" rel="noreferrer">Open it</a></p>}
          {recipes.length > 0 && (
            <button className="link" onClick={() => setShowPick((s) => !s)}>{showPick ? 'Hide recipe list' : 'Choose recipes'}{picked.size > 0 && ` (${picked.size})`}</button>
          )}
          {showPick && (
            <div className="picklist">
              {picked.size > 0 && <button className="link" onClick={() => setPicked(new Set())}>Clear selection</button>}
              {recipes.map((r) => (
                <label key={r.id} className="filter-item"><input type="checkbox" checked={picked.has(r.id)} onChange={() => toggle(r.id)} /><RecipeTile r={r} size={26} /><span className="grow">{r.title}</span></label>
              ))}
            </div>
          )}
        </section>

        <section className="panel" id="duplicates">
          <div className="panel-head"><span className="tile soft"><Icon name="merge" /></span><span><b>Merge duplicates</b><small>Find recipes that look alike and combine them.</small></span></div>
          <div className="row gap"><button className="pill" onClick={() => go('duplicates')}><Icon name="merge" size={13} />Find duplicates</button></div>
        </section>
        </>}
      </div>
      </div>
    </div>
  );
}

type Tab = 'sync' | 'data' | 'history';
const TABS: [Tab, string][] = [['sync', 'Sync'], ['data', 'Import & export'], ['history', 'History']];
