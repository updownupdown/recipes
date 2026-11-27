import { useEffect, useState } from 'react';
import { currentToken, isSignedIn, requestToken } from './auth';
import { db, mergeRecipes } from './db';
import { AuthError, dataFileId, download, fetchEmail, keepWeeklyRevision, upload } from './drive';
import { fromJSON, toJSON } from './exporters';

export type SyncState =
  | { kind: 'off' }                       // never connected on this device
  | { kind: 'idle'; last?: number }       // connected, up to date as far as we know
  | { kind: 'syncing' }
  | { kind: 'needs-tap'; dirty: boolean } // token expired; one tap to refresh
  | { kind: 'error'; message: string };

const LAST = 'last_sync';
let state: SyncState = initial();
const subs = new Set<(s: SyncState) => void>();

function initial(): SyncState {
  if (!isSignedIn()) return { kind: 'off' };
  return currentToken() ? { kind: 'idle', last: lastSync() } : { kind: 'needs-tap', dirty: false };
}
function lastSync(): number | undefined {
  try { return Number(localStorage.getItem(LAST)) || undefined; } catch { return undefined; }
}
function setState(s: SyncState) { state = s; subs.forEach((f) => f(s)); }

export function useSyncState(): SyncState {
  const [s, set] = useState(state);
  useEffect(() => { subs.add(set); set(state); return () => { subs.delete(set); }; }, []);
  return s;
}

async function hasLocalChanges(): Promise<boolean> {
  const since = lastSync() ?? 0;
  return (await db.recipes.where('updatedAt').above(since).count()) > 0;
}

let running: Promise<void> | null = null;
let again = false;      // an edit arrived mid-sync; run once more afterwards
let applying = false;   // merging Drive data: not a local edit

/** Download, merge, upload. Uses only a valid token unless `interactive` (must be from a tap). */
export function syncNow(interactive = false): Promise<void> {
  if (running) { again = true; return running; }
  running = (async () => {
    let token = currentToken();
    if (!token) {
      if (!interactive) {
        if (isSignedIn()) setState({ kind: 'needs-tap', dirty: await hasLocalChanges() });
        return;
      }
      token = await requestToken();
    }
    if (!navigator.onLine) { setState({ kind: 'idle', last: lastSync() }); return; }
    setState({ kind: 'syncing' });
    if (!localStorage.getItem('g_email')) fetchEmail(token).catch(() => {});
    const { id } = await dataFileId(token);
    const remote = fromJSON(await download(token, id));
    applying = true;
    try { await mergeRecipes(remote); } finally { applying = false; }
    const local = await db.recipes.toArray();
    const remoteMap = new Map(remote.map((r) => [r.id, r.updatedAt]));
    const needUpload = local.length !== remote.length || local.some((r) => remoteMap.get(r.id) !== r.updatedAt);
    if (needUpload) await upload(token, id, toJSON(local));
    keepWeeklyRevision(token, id).catch(() => {});
    localStorage.setItem(LAST, String(Date.now()));
    setState({ kind: 'idle', last: Date.now() });
  })()
    .catch((e: Error) => {
      if (e instanceof AuthError) setState({ kind: 'needs-tap', dirty: true });
      else setState({ kind: 'error', message: e.message });
      if (interactive) throw e;
    })
    .finally(() => {
      running = null;
      if (again) { again = false; setTimeout(() => syncNow(false).catch(() => {}), 500); }
    });
  return running;
}

export function markSignedOut() { setState({ kind: 'off' }); }

/** Background sync: on start, when the app regains focus, when back online, and shortly after edits. */
export function startAutoSync() {
  const quiet = () => { if (isSignedIn()) syncNow(false).catch(() => {}); };
  quiet();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') quiet(); });
  addEventListener('online', quiet);
  let t: ReturnType<typeof setTimeout> | undefined;
  const edited = () => { if (applying) return; clearTimeout(t); t = setTimeout(quiet, 1500); };
  db.recipes.hook('creating', edited);
  db.recipes.hook('updating', edited);
  // Token expiry: flip to "needs tap" when it lapses.
  setInterval(() => { if (isSignedIn() && !currentToken() && state.kind === 'idle') quiet(); }, 60_000);
}
