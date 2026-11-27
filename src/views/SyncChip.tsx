import { useEffect, useState } from 'react';
import { syncNow, useSyncState } from '../sync';

function ago(t?: number) {
  if (!t) return '';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

export function SyncChip() {
  const s = useSyncState();
  const [, tick] = useState(0);
  const [err, setErr] = useState('');
  useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(i); }, []);
  const tap = () => { setErr(''); syncNow(true).catch((e: Error) => setErr(e.message)); };

  if (s.kind === 'off') return <a className="sync off" href="#/data">Set up sync</a>;
  if (s.kind === 'syncing') return <span className="sync">Syncing…</span>;
  if (s.kind === 'needs-tap')
    return <button className={'sync tap' + (s.dirty ? ' dirty' : '')} onClick={tap} title={err || 'Google sign-in expired. Tap to refresh.'}>{s.dirty ? 'Tap to sync changes' : 'Tap to sync'}</button>;
  if (s.kind === 'error') return <button className="sync dirty" onClick={tap} title={s.message}>Sync failed. Retry</button>;
  return <button className="sync ok" onClick={tap} title="Sync now">Synced {ago(s.last)}</button>;
}
