import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { requestToken } from '../auth';

import { dataFileId, downloadRevision, keepRevision, listRevisions, type Revision } from '../drive';
import { fromJSON } from '../exporters';
import { deletedRecipes, diffVersion, restoreVersion, undelete, type VersionDiff } from '../history';
import { Icon } from '../icons';
import { syncNow } from '../sync';
import type { Recipe } from '../types';
import { RecipeTile } from './ui';

function when(t: string | number) {
  const d = new Date(t);
  const today = new Date();
  const yest = new Date(Date.now() - 86400_000);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
  if (d.toDateString() === yest.toDateString()) return `Yesterday, ${time}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' }) + `, ${time}`;
}

const names = (l: Recipe[]) => l.slice(0, 4).map((r) => r.title).join(', ') + (l.length > 4 ? ` and ${l.length - 4} more` : '');

/** Drive version history: every sync is a version; pick one to see what changed and restore it. */
export function VersionHistory({ connected, onMessage }: { connected: boolean; onMessage: (m: string) => void }) {
  const [revs, setRevs] = useState<Revision[]>();
  const [fileId, setFileId] = useState('');
  const [open, setOpen] = useState<string>();
  const [preview, setPreview] = useState<{ recipes: Recipe[]; diff: VersionDiff }>();
  const [busy, setBusy] = useState('');
  const [limit, setLimit] = useState(15);

  const load = async () => {
    setBusy('list');
    try {
      const token = await requestToken();
      const { id } = await dataFileId(token);
      setFileId(id);
      setRevs((await listRevisions(token, id)).reverse());
    } catch (e) { onMessage(`Couldn't load history: ${(e as Error).message}`); }
    setBusy('');
  };
  const pick = async (rev: Revision) => {
    if (open === rev.id) { setOpen(undefined); return; }
    setOpen(rev.id); setPreview(undefined); setBusy(rev.id);
    try {
      const token = await requestToken();
      const recipes = fromJSON(await downloadRevision(token, fileId, rev.id));
      setPreview({ recipes, diff: await diffVersion(recipes) });
    } catch (e) { onMessage(`Couldn't open that version: ${(e as Error).message}`); setOpen(undefined); }
    setBusy('');
  };
  const restore = async () => {
    if (!preview || !revs) return;
    setBusy('restore');
    try {
      const token = await requestToken();
      // Keep the current version for good first, so this restore can be undone too.
      if (revs[0] && !revs[0].keepForever) await keepRevision(token, fileId, revs[0].id).catch(() => {});
      const n = await restoreVersion(preview.recipes);
      await syncNow(true);
      onMessage(n ? `Restored. ${n} recipe${n === 1 ? '' : 's'} changed. The version before the restore is kept in the history.` : 'That version matches your recipes now. Nothing to restore.');
      setOpen(undefined); setPreview(undefined);
      await load();
    } catch (e) { onMessage(`Couldn't restore: ${(e as Error).message}`); }
    setBusy('');
  };

  return (
    <section className="panel" id="history">
      <div className="panel-head"><span className="tile soft"><Icon name="clock" /></span><span><b>Version history</b><small>Every sync saves a version in your Drive. Restore any of them.</small></span></div>
      {!connected ? (
        <p className="small muted">Connect Google Drive on the Sync tab to keep a version history.</p>
      ) : !revs ? (
        <div><button className="pill" onClick={load} disabled={busy === 'list'}>{busy === 'list' ? 'Loading…' : 'Show versions'}</button></div>
      ) : (
        <div className="versions">
          {revs.length === 0 && <p className="small muted">No versions yet.</p>}
          {revs.slice(0, limit).map((r, i) => (
            <div key={r.id} className={'version' + (open === r.id ? ' open' : '')}>
              <button className="version-row" onClick={() => pick(r)} aria-expanded={open === r.id}>
                <span className="grow">{when(r.modifiedTime)}{i === 0 && <span className="muted"> · current</span>}</span>
                {r.keepForever && <Icon name="check" size={13} className="muted" />}
                <Icon name="chev" size={14} className="muted" />
              </button>
              {open === r.id && (
                <div className="version-body">
                  {busy === r.id || !preview ? <p className="small muted">Opening…</p> : (
                    <>
                      <p className="small">{preview.diff.total} recipes in this version.</p>
                      {preview.diff.added.length + preview.diff.removed.length + preview.diff.changed.length === 0 ? (
                        <p className="small muted">Same as your recipes now.</p>
                      ) : (
                        <ul className="diff small">
                          {preview.diff.added.length > 0 && <li><b>Brings back {preview.diff.added.length}:</b> {names(preview.diff.added)}</li>}
                          {preview.diff.changed.length > 0 && <li><b>Changes {preview.diff.changed.length}:</b> {names(preview.diff.changed)}</li>}
                          {preview.diff.removed.length > 0 && <li><b>Removes {preview.diff.removed.length}</b> added since: {names(preview.diff.removed)}</li>}
                        </ul>
                      )}
                      {i > 0 && <button className="btn" onClick={restore} disabled={busy === 'restore'}>{busy === 'restore' ? 'Restoring…' : 'Restore this version'}</button>}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          {revs.length > limit && <button className="link" onClick={() => setLimit((l) => l + 30)}>Show older versions</button>}
          <p className="small muted">Drive keeps versions for 30 days. One version a week, and the one before any restore, is kept for good (ticked).</p>
        </div>
      )}
    </section>
  );
}

/** Deleted recipes stay on the device as markers (so deletes can sync), which makes undo easy. */
export function RecentlyDeleted({ onMessage }: { onMessage: (m: string) => void }) {
  const [list, setList] = useState<Recipe[]>([]);
  const [all, setAll] = useState(false);
  useEffect(() => {
    const sub = liveQuery(() => deletedRecipes()).subscribe({ next: setList });
    return () => sub.unsubscribe();
  }, []);
  if (!list.length) return (
    <section className="panel" id="deleted">
      <div className="panel-head"><span className="tile soft"><Icon name="trash" /></span><span><b>Recently deleted</b><small>Nothing deleted lately.</small></span></div>
    </section>
  );
  return (
    <section className="panel" id="deleted">
      <div className="panel-head"><span className="tile soft"><Icon name="trash" /></span><span><b>Recently deleted</b><small>Tap Restore to bring a recipe back.</small></span></div>
      <div className="picklist">
        {list.slice(0, all ? 200 : 5).map((r) => (
          <div key={r.id} className="filter-item">
            <RecipeTile r={r} size={26} />
            <span className="grow">{r.title}<br /><small className="muted">{when(r.deleted!)}</small></span>
            <button className="pill" onClick={async () => { await undelete(r.id); onMessage(`Restored “${r.title}”.`); }}>Restore</button>
          </div>
        ))}
      </div>
      {list.length > 5 && !all && <button className="link" onClick={() => setAll(true)}>Show all {list.length}</button>}
    </section>
  );
}
