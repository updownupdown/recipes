import { useEffect, useRef, useState } from 'react';
import { isSignedIn, requestToken, signedInEmail, signOut } from '../auth';
import { mergeRecipes } from '../db';
import { createDoc } from '../drive';
import { download, fromJSON, toHTML, toJSON, toText } from '../exporters';
import { Icon } from '../icons';
import { markSignedOut, syncNow, useSyncState } from '../sync';
import type { Recipe } from '../types';
import { BackButton, RecipeTile, SyncBadge } from './ui';
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

  useEffect(() => { if (anchor) document.getElementById(anchor)?.scrollIntoView({ block: 'start' }); }, [anchor]);

  const connect = async () => {
    setMsg('');
    try { await syncNow(true); setMsg('Connected. Your recipes sync to MyRecipes/recipes.json in your Drive.'); }
    catch (e) { setMsg((e as Error).message); }
  };
  const disconnect = () => { signOut(); markSignedOut(); setMsg('Disconnected. Your recipes stay on this device.'); };
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      let total = 0, seen = 0;
      for (const f of files) {
        const list = fromJSON(await f.text());
        seen += list.length;
        total += await mergeRecipes(list);
      }
      const same = seen - total;
      setMsg(`Imported ${total} recipe${total === 1 ? '' : 's'}.` + (same ? ` ${same} ${same === 1 ? 'was' : 'were'} already up to date.` : ''));
    } catch (e) {
      setMsg(`Couldn't import: ${(e as Error).message} Check that it's a MyRecipes JSON file.`);
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
    <div className="page">
      <header className="hd">
        <BackButton />
        <h1 className="small">Settings</h1>
      </header>
      <div className="pad-x stack">
        {msg && <p className="banner flush">{msg}</p>}

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

        <VersionHistory connected={connected} onMessage={(m) => { setMsg(m); scrollTo(0, 0); }} />
        <RecentlyDeleted onMessage={(m) => { setMsg(m); scrollTo(0, 0); }} />

        <section className="panel" id="import">
          <div className="panel-head"><span className="tile soft"><Icon name="upload" /></span><span><b>Import</b><small>MyRecipes JSON files. Existing recipes are updated, not duplicated.</small></span></div>
          <label className="btn ghost filebtn"><Icon name="upload" size={16} />Choose file<input ref={file} type="file" accept=".json,application/json" multiple onChange={(e) => onFiles(e.target.files)} /></label>
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

        <p className="muted small center">MyRecipes · your recipes stay on your device and in your own Google Drive. <a href="./privacy.html">Privacy</a></p>
      </div>
    </div>
  );
}
