import { useEffect, useState } from 'react';
import { convertAmount, FROM_UNITS, TABLES, type Dir, type Kind } from '../convert';
import { Icon } from '../icons';

/* Kitchen conversions: pick a direction (pinned on top) and a type, read the table, or convert your own amount at the bottom. */

let setOpenFn: ((v: boolean) => void) | undefined;
export const openConversions = () => setOpenFn?.(true);

const KEY = 'conv-prefs';
const TYPES: [Kind, string, string][] = [['oven', 'flame', 'Oven'], ['weight', 'scale', 'Weight'], ['vol', 'drop', 'Volume']];

function loadPrefs(): { dir: Dir; kind: Kind } {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { dir: p.dir === 'met' ? 'met' : 'imp', kind: TYPES.some((t) => t[0] === p.kind) ? p.kind : 'oven' };
  } catch { return { dir: 'imp', kind: 'oven' }; }
}

export function ConversionsHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpenFn = setOpen; return () => { setOpenFn = undefined; }; }, []);
  return open ? <Conversions onClose={() => setOpen(false)} /> : null;
}

function Conversions({ onClose }: { onClose: () => void }) {
  const [{ dir, kind }, setPrefs] = useState(loadPrefs);
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('');
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [onClose]);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify({ dir, kind })); } catch { /* private mode */ } }, [dir, kind]);

  const units = FROM_UNITS[kind][dir];
  const u = units.includes(unit) ? unit : units[0];
  const result = convertAmount(kind, dir, amount, u);
  const set = (p: Partial<{ dir: Dir; kind: Kind }>) => { setPrefs((s) => ({ ...s, ...p })); setAmount(''); };

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Conversions">
      <div className="dim" onClick={onClose} />
      <div className="modal conv">
        <div className="modal-head">
          <b>Conversions</b>
          <button type="button" className="ib flat" onClick={onClose} aria-label="Close conversions"><Icon name="x" /></button>
        </div>
        <div className="conv-top">
          <div className="seg conv-dir" role="group" aria-label="Direction">
            <button type="button" className={dir === 'imp' ? 'on' : ''} aria-pressed={dir === 'imp'} onClick={() => set({ dir: 'imp' })}>Imperial → Metric</button>
            <button type="button" className={dir === 'met' ? 'on' : ''} aria-pressed={dir === 'met'} onClick={() => set({ dir: 'met' })}>Metric → Imperial</button>
          </div>
          <div className="conv-tabs" role="tablist">
            {TYPES.map(([k, ic, label]) => (
              <button key={k} type="button" role="tab" aria-selected={kind === k} className={kind === k ? 'on' : ''} onClick={() => set({ kind: k })}><Icon name={ic} size={16} />{label}</button>
            ))}
          </div>
        </div>
        <div className="modal-body">
          <div className="conv-table">
            {TABLES[kind][dir].map(([a, b]) => <div key={a} className="conv-row"><span>{a}</span><b>{b}</b></div>)}
            <div className="conv-row conv-custom">
              <span className="conv-in">
                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="Amount" aria-label="Your amount" />
                {units.length > 1
                  ? <select value={u} onChange={(e) => setUnit(e.target.value)} aria-label="Unit">{units.map((x) => <option key={x}>{x}</option>)}</select>
                  : <span className="conv-unit">{u}</span>}
              </span>
              <b aria-live="polite">{result ? `= ${result}` : amount.trim() ? <small className="muted">Try 1 1/2</small> : ''}</b>
            </div>
          </div>
          {kind === 'vol' && <p className="muted small conv-help">US cups and spoons.</p>}
        </div>
      </div>
    </div>
  );
}
