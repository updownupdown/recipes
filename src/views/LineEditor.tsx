import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lineToRow, nextId, rowToLine, singularUnit, UNIT_OPTIONS, UNIT_RE } from '../editRows';
import { LEAD } from '../quantity';
import { Icon } from '../icons';

/* "Smart lines": plain text you type or paste one line at a time, with amounts, units, sections and
   step times highlighted as you go. The line you're on gets a toolbar for unit, section, move and remove. */

export type Line = { id: number; text: string };
export const toLines = (texts: string[]): Line[] => (texts.length ? texts : ['']).map((text) => ({ id: nextId(), text }));

type Kind = 'ing' | 'step';
const isSection = (t: string) => /^\s*#/.test(t);
const isHeading = (t: string) => { const s = t.trim(); return s.length > 0 && s.length < 48 && s.endsWith(':'); };
const TIME_RE = /\d+(?:[.,]\d+)?(?:\s*(?:-|–|to)\s*\d+(?:[.,]\d+)?)?\s*(?:minutes?|mins?|hours?|hrs?|seconds?|secs?)\b/gi;

/** The highlighted copy of a line, drawn under the (transparent) text box. Same characters, so the caret lines up. */
function Mirror({ text, kind }: { text: string; kind: Kind }) {
  if (kind === 'ing') {
    if (isSection(text)) { const m = text.match(/^\s*#+\s*/)![0]; return <><span className="sl-hash">{m}</span>{text.slice(m.length)}</>; }
    const q = text.match(LEAD);
    if (!q) return <>{text}</>;
    const rest = text.slice(q[0].length);
    const u = rest.match(UNIT_RE);
    if (!u) return <><span className="sl-q">{q[0]}</span>{rest}</>;
    const lead = u[0].match(/^\s*/)![0];
    return <><span className="sl-q">{q[0]}</span>{lead}<span className="sl-u">{u[0].slice(lead.length)}</span>{rest.slice(u[0].length)}</>;
  }
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TIME_RE)) {
    out.push(text.slice(last, m.index), <span key={m.index} className="sl-t">{m[0]}</span>);
    last = m.index! + m[0].length;
  }
  out.push(text.slice(last));
  return <>{out}</>;
}

const focusLine = (id: number, pos?: number) => setTimeout(() => {
  const el = document.querySelector<HTMLTextAreaElement>(`[data-line="${id}"]`);
  if (!el) return;
  el.focus();
  const p = pos ?? el.value.length;
  el.setSelectionRange(p, p);
}, 0);

export function LineEditor({ kind, lines, onChange, placeholder }: { kind: Kind; lines: Line[]; onChange: (l: Line[]) => void; placeholder: string }) {
  const [active, setActive] = useState<number | null>(null);
  const [undo, setUndo] = useState<{ line: Line; at: number } | null>(null);
  const blurTimer = useRef<number>();
  const drag = useDragReorder(lines, onChange);

  const set = (next: Line[]) => { onChange(next.length ? next : toLines([])); };
  const idx = (id: number) => lines.findIndex((l) => l.id === id);

  // Typing, Enter and paste all arrive here: any newline splits the line into several.
  const edit = (l: Line, el: HTMLTextAreaElement) => {
    const v = el.value;
    setUndo(null);
    if (!v.includes('\n')) { set(lines.map((x) => (x.id === l.id ? { ...x, text: v } : x))); return; }
    const caret = el.selectionStart;
    const before = v.slice(0, caret);
    const caretLine = before.split('\n').length - 1;
    const caretPos = caret - (before.lastIndexOf('\n') + 1);
    const parts = v.split('\n').map((t) => t.replace(/\r/g, ''));
    const made = parts.map((text, k) => (k === 0 ? { ...l, text } : { id: nextId(), text }));
    const i = idx(l.id);
    set([...lines.slice(0, i), ...made, ...lines.slice(i + 1)]);
    focusLine(made[caretLine].id, caretPos);
  };

  const keys = (l: Line, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget, i = idx(l.id);
    const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
    const atEnd = el.selectionStart === el.value.length;
    if (e.key === 'Backspace' && atStart && i > 0) {
      e.preventDefault();
      const prev = lines[i - 1];
      set(lines.filter((x) => x.id !== l.id).map((x) => (x.id === prev.id ? { ...x, text: prev.text + l.text } : x)));
      focusLine(prev.id, prev.text.length);
    } else if (e.key === 'Delete' && atEnd && i < lines.length - 1) {
      e.preventDefault();
      const next = lines[i + 1];
      set(lines.filter((x) => x.id !== next.id).map((x) => (x.id === l.id ? { ...x, text: l.text + next.text } : x)));
      focusLine(l.id, l.text.length);
    } else if (e.key === 'ArrowUp' && atStart && i > 0) { e.preventDefault(); focusLine(lines[i - 1].id); }
    else if (e.key === 'ArrowDown' && atEnd && i < lines.length - 1) { e.preventDefault(); focusLine(lines[i + 1].id, 0); }
  };

  // The toolbar stays while focus is on a line or on the toolbar itself (the unit picker takes focus).
  const onFocus = (id: number) => { clearTimeout(blurTimer.current); setActive(id); };
  const onBlur = () => {
    blurTimer.current = window.setTimeout(() => {
      const a = document.activeElement;
      if (!a?.closest('.sl-bar') && !a?.closest(`.sl-${kind}`)) { setActive(null); setUndo(null); }
    }, 120);
  };
  useEffect(() => () => clearTimeout(blurTimer.current), []);

  const cur = active === null ? undefined : lines.find((l) => l.id === active);
  const patch = (text: string) => { if (!cur) return; set(lines.map((x) => (x.id === cur.id ? { ...x, text } : x))); focusLine(cur.id); };
  const move = (d: -1 | 1) => {
    if (!cur) return;
    const i = idx(cur.id), j = i + d;
    if (j < 0 || j >= lines.length) return;
    const n = [...lines]; [n[i], n[j]] = [n[j], n[i]];
    set(n); focusLine(cur.id);
  };
  const remove = () => {
    if (!cur) return;
    const i = idx(cur.id);
    const rest = lines.filter((x) => x.id !== cur.id);
    const next = rest.length ? rest : toLines([]);
    set(next);
    if (cur.text.trim()) setUndo({ line: cur, at: i });
    focusLine(next[Math.min(i, next.length - 1)].id);
  };
  const restore = () => {
    if (!undo) return;
    const n = [...lines]; n.splice(Math.min(undo.at, n.length), 0, undo.line);
    set(n); setUndo(null); focusLine(undo.line.id);
  };
  const toggleSection = () => {
    if (!cur) return;
    if (kind === 'ing') patch(isSection(cur.text) ? cur.text.replace(/^\s*#+\s*/, '') : '# ' + cur.text.trim());
    else patch(isHeading(cur.text) ? cur.text.trim().replace(/:$/, '') : cur.text.trim().replace(/[.:]?$/, ':'));
  };
  const row = cur && kind === 'ing' && !isSection(cur.text) ? lineToRow(cur.text) : undefined;
  const unit = row?.kind === 'item' ? singularUnit(row.unit) : '';
  const setUnit = (u: string) => {
    if (!cur || row?.kind !== 'item') return;
    patch(rowToLine({ ...row, unit: u }));
  };

  const empty = lines.every((l) => !l.text.trim());
  let stepNo = 0;
  return (
    <div className={`sl sl-${kind}`} ref={drag.list}>
      {lines.map((l, i) => {
        const section = kind === 'ing' ? isSection(l.text) : isHeading(l.text);
        if (kind === 'step' && !section && l.text.trim()) stepNo++;
        return (
          <div key={l.id} data-idx={i} className={'sl-line' + (section ? ' sl-head' : '') + (active === l.id ? ' on' : '') + (drag.dragging === i ? ' dragging' : '')}>
            <span className="sl-gut" aria-label="Drag to reorder" {...drag.handle(i)}>
              {kind === 'step' && l.text.trim() && !section ? <i>{stepNo}</i> : <Icon name="grip" size={14} />}
            </span>
            <div className="sl-box">
              <div className="sl-mirror" aria-hidden="true"><Mirror text={l.text} kind={kind} />{'​'}</div>
              <textarea data-line={l.id} rows={1} value={l.text} spellCheck={kind === 'step'} autoCapitalize="sentences"
                placeholder={empty && i === 0 ? placeholder : ''} aria-label={kind === 'ing' ? `Ingredient ${i + 1}` : `Step line ${i + 1}`}
                onChange={(e) => edit(l, e.currentTarget)} onKeyDown={(e) => keys(l, e)} onFocus={() => onFocus(l.id)} onBlur={onBlur} />
            </div>
          </div>
        );
      })}
      <button type="button" className="sl-add" onClick={() => {
        const last = lines[lines.length - 1];
        if (last && !last.text.trim()) { focusLine(last.id); return; }
        const n = { id: nextId(), text: '' }; set([...lines, n]); focusLine(n.id);
      }}><Icon name="plus" size={14} />{kind === 'ing' ? 'Add ingredient' : 'Add step'}</button>

      {cur && createPortal(
        <Toolbar>
          {kind === 'ing' && (
            <label className={'sl-tb sl-unit' + (row?.kind === 'item' ? '' : ' off')}>
              <span>{unit || 'unit'}</span><Icon name="chev" size={12} />
              <select value={unit} disabled={row?.kind !== 'item'} onChange={(e) => setUnit(e.target.value)} aria-label="Unit">
                <option value="">no unit</option>
                {[...(unit && !UNIT_OPTIONS.includes(unit) ? [unit] : []), ...UNIT_OPTIONS].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
          )}
          <Tb on={toggleSection} label={kind === 'ing' ? 'Section' : 'Heading'} pressed={kind === 'ing' ? isSection(cur.text) : isHeading(cur.text)}>
            <Icon name="type" size={14} />{kind === 'ing' ? 'Section' : 'Heading'}
          </Tb>
          <Tb on={() => move(-1)} label="Move up" disabled={idx(cur.id) === 0}><Icon name="chev" size={15} className="up" /></Tb>
          <Tb on={() => move(1)} label="Move down" disabled={idx(cur.id) === lines.length - 1}><Icon name="chev" size={15} className="down" /></Tb>
          {undo
            ? <Tb on={restore} label="Undo remove" cls="sl-undo">Undo</Tb>
            : <Tb on={remove} label="Remove line" cls="sl-del"><Icon name="trash" size={15} /></Tb>}
        </Toolbar>,
        document.body,
      )}
    </div>
  );
}

function Tb({ on, label, children, disabled, pressed, cls = '' }: { on: () => void; label: string; children: React.ReactNode; disabled?: boolean; pressed?: boolean; cls?: string }) {
  // pointerdown is cancelled so the line keeps focus (and the phone keyboard stays up).
  return <button type="button" className={'sl-tb ' + cls + (pressed ? ' on' : '')} aria-label={label} aria-pressed={pressed} disabled={disabled}
    onPointerDown={(e) => e.preventDefault()} onClick={on}>{children}</button>;
}

/** Sits at the bottom of the visible screen, just above the phone keyboard when it is open. */
function Toolbar({ children }: { children: React.ReactNode }) {
  const [bottom, setBottom] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const fit = () => setBottom(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    fit();
    vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit);
    return () => { vv.removeEventListener('resize', fit); vv.removeEventListener('scroll', fit); };
  }, []);
  return <div className="sl-bar" style={{ bottom }} role="toolbar" aria-label="Line tools">{children}</div>;
}

/** Drag-and-drop reordering by a handle; works with touch and mouse. Rows carry data-idx. */
function useDragReorder(items: Line[], set: (l: Line[]) => void) {
  const list = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const cur = useRef<number | null>(null);
  const latest = useRef(items);
  latest.current = items;
  const handle = (i: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      cur.current = i; setDragging(i);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (cur.current === null || !list.current) return;
      const els = [...list.current.querySelectorAll<HTMLElement>(':scope > [data-idx]')];
      let to = els.findIndex((el) => { const b = el.getBoundingClientRect(); return e.clientY < b.top + b.height / 2; });
      if (to === -1) to = els.length - 1;
      const from = cur.current;
      if (to === from) return;
      const n = [...latest.current]; const [it] = n.splice(from, 1); n.splice(to, 0, it);
      set(n); cur.current = to; setDragging(to);
    },
    onPointerUp: () => { cur.current = null; setDragging(null); },
    onPointerCancel: () => { cur.current = null; setDragging(null); },
  });
  return { list, dragging, handle };
}
