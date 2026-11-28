import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lineToRow, nextId, rowToLine, singularUnit, UNIT_RE } from '../editRows';
import { LEAD, parseNumber } from '../quantity';
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
  const [panel, setPanel] = useState<'qty' | 'unit' | null>(null);
  useEffect(() => { if (active === null) setPanel(null); }, [active]);
  const toggle = (p: 'qty' | 'unit') => setPanel((o) => (o === p ? null : p));
  const setQty = (q: string) => {
    if (!cur || row?.kind !== 'item') return;
    patch(rowToLine({ ...row, qty: q, unit: q ? row.unit : '' })); // no amount: a bare "cup sugar" makes no sense
  };
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
        <Toolbar above={row?.kind !== 'item' ? null
          : panel === 'qty' ? <QtyStrip qty={row.qty} onPick={setQty} />
          : panel === 'unit' ? <UnitStrip unit={unit} onPick={setUnit} /> : null}>
          <Tb on={() => move(-1)} label="Move up" cls="sl-ic" disabled={idx(cur.id) === 0}><Icon name="chev" size={19} className="up" /></Tb>
          <Tb on={() => move(1)} label="Move down" cls="sl-ic" disabled={idx(cur.id) === lines.length - 1}><Icon name="chev" size={19} className="down" /></Tb>
          {row?.kind === 'item' && (
            <Tb on={() => toggle('qty')} label="Amount" cls="sl-qty" pressed={panel === 'qty'}>
              {row.qty ? pretty(row.qty) : 'amount'}
            </Tb>
          )}
          {row?.kind === 'item' && (
            <Tb on={() => toggle('unit')} label="Unit" cls="sl-unit" pressed={panel === 'unit'}>
              {unit || 'unit'}
            </Tb>
          )}
          <span className="sl-gap" />
          <Tb on={toggleSection} label={kind === 'ing' ? 'Section heading' : 'Heading'} cls="sl-sec" pressed={kind === 'ing' ? isSection(cur.text) : isHeading(cur.text)}>
            {kind === 'ing' ? <><b>#</b>Section</> : 'Heading'}
          </Tb>
          {undo
            ? <Tb on={restore} label="Undo remove" cls="sl-undo">Undo</Tb>
            : <Tb on={remove} label="Remove line" cls="sl-ic sl-del"><Icon name="trash" size={19} /></Tb>}
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

const WHOLES = [1, 2, 3, 4, 5, 6];
const GLYPH: Record<string, string> = { '1/4': '¼', '1/3': '⅓', '1/2': '½', '2/3': '⅔', '3/4': '¾', '1/8': '⅛' };
/** "1 1/2" -> "1½" for the small toolbar chip, where a plain "1 1/2" reads like "11/2". */
const pretty = (q: string) => q.replace(/(\d+)?\s*\b(\d\/\d)\b/g, (m, w, f) => (GLYPH[f] ? (w ?? '') + GLYPH[f] : m));
const FRACS: [number, string, string][] = [[1 / 4, '¼', '1/4'], [1 / 3, '⅓', '1/3'], [1 / 2, '½', '1/2'], [2 / 3, '⅔', '2/3'], [3 / 4, '¾', '3/4']];
const UNITS = ['cup', 'tbsp', 'tsp', 'g', 'kg', 'ml', 'l', 'oz', 'lb', 'fl oz', 'pinch', 'dash', 'clove', 'can', 'slice', 'piece', 'stick', 'bunch', 'sprig', 'handful', 'package', 'pint', 'quart'];
const keep = (e: React.PointerEvent) => e.preventDefault(); // the line keeps focus, so the keyboard stays up

/** One row of choices: the "none" choice pinned on the left, the rest scrolling sideways. The lit choice scrolls into view. */
function Strip({ kind, none, noneOn, label, children }: { kind: string; none: () => void; noneOn: boolean; label: string; children: React.ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = scroller.current?.querySelector<HTMLElement>('.on');
    if (on && scroller.current) scroller.current.scrollLeft = on.offsetLeft - scroller.current.offsetLeft - 40;
  }, [kind]);
  return (
    <div className={'sl-strip sl-strip-' + kind} onPointerDown={keep} role="group" aria-label={label}>
      <button type="button" className={'sl-sc sl-none' + (noneOn ? ' on' : '')} onClick={none}>{kind === 'qty' ? '–' : 'none'}</button>
      <div className="sl-strip-s" ref={scroller}>{children}</div>
    </div>
  );
}

/** "–" clears the amount; fractions and 1–6 combine ("1 1/2"); tapping a lit one again drops it. Writes plain fractions. */
function QtyStrip({ qty, onPick }: { qty: string; onPick: (q: string) => void }) {
  const n = parseNumber(qty);
  const whole = Math.floor(n + 0.01);
  const fr = FRACS.find(([v]) => Math.abs(v - (n - whole)) < 0.04);
  const frac = fr?.[2] ?? '';
  const shown = whole <= 6; // past 6 the chips can't show the amount, so none light up
  const out = (w: number, f: string) => (w > 0 && f ? `${w} ${f}` : w > 0 ? String(w) : f);
  return (
    <Strip kind="qty" none={() => onPick('')} noneOn={!qty.trim()} label="Amount choices">
      {FRACS.map(([, glyph, plain]) => {
        const on = shown && frac === plain;
        return <button type="button" key={glyph} className={'sl-sc' + (on ? ' on' : '')} aria-label={plain} aria-pressed={on} onClick={() => onPick(out(whole, on ? '' : plain))}>{glyph}</button>;
      })}
      <span className="sl-sep" />
      {WHOLES.map((w) => {
        const on = shown && w === whole;
        return <button type="button" key={w} className={'sl-sc' + (on ? ' on' : '')} aria-pressed={on} onClick={() => onPick(out(on ? 0 : w, frac) || String(w))}>{w}</button>;
      })}
    </Strip>
  );
}

function UnitStrip({ unit, onPick }: { unit: string; onPick: (u: string) => void }) {
  const list = unit && !UNITS.includes(unit) ? [unit, ...UNITS] : UNITS;
  return (
    <Strip kind="unit" none={() => onPick('')} noneOn={!unit} label="Unit choices">
      {list.map((u) => <button type="button" key={u} className={'sl-sc' + (u === unit ? ' on' : '')} aria-pressed={u === unit} onClick={() => onPick(u === unit ? '' : u)}>{u}</button>)}
    </Strip>
  );
}

/** Sits at the bottom of the visible screen, just above the phone keyboard when it is open. */
function Toolbar({ children, above }: { children: React.ReactNode; above?: React.ReactNode }) {
  const [bottom, setBottom] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const fit = () => setBottom(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    fit();
    vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit);
    return () => { vv.removeEventListener('resize', fit); vv.removeEventListener('scroll', fit); };
  }, []);
  return (
    <div className="sl-bar" style={{ bottom }}>
      {above}
      <div className="sl-bar-row" role="toolbar" aria-label="Line tools">{children}</div>
    </div>
  );
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
