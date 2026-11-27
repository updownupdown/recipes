import { useEffect, useMemo, useRef, useState } from 'react';
import { CATALOG, canonicalCategory, categoryLook, lookVars, type Group } from '../categories';
import { normalize } from '../hooks';
import { Icon } from '../icons';

const GROUPS: Group[] = ['Course', 'Cuisine', 'Main ingredient', 'Diet', 'Method & occasion'];

/** Pop-up for choosing categories: search, grouped lists, and your own custom categories. */
export function CategoryPicker({ value, used, onChange, onClose }: { value: string[]; used: string[]; onChange: (v: string[]) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [onClose]);

  const known = new Set(CATALOG.map((c) => c.name));
  const custom = [...new Set([...used, ...value])].filter((c) => !known.has(c)).sort();
  const nq = normalize(q.trim());
  const match = (name: string, aliases: string[] = []) => !nq || [name, ...aliases].some((n) => normalize(n).includes(nq));
  const sections = useMemo(() => {
    const out: [string, string[]][] = [];
    if (value.length && !nq) out.push(['Selected', value]);
    const mine = custom.filter((c) => match(c));
    if (mine.length) out.push(['Your categories', mine]);
    for (const g of GROUPS) {
      const names = CATALOG.filter((c) => c.group === g && match(c.name, c.aliases)).map((c) => c.name);
      if (names.length) out.push([g, names]);
    }
    return out;
  }, [nq, value.join('|'), custom.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (c: string) => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c]);
  const typed = q.trim();
  const exact = typed && [...known, ...custom].some((c) => normalize(c) === nq || normalize(canonicalCategory(typed)) === normalize(c));
  const create = () => { const c = canonicalCategory(typed); if (!value.includes(c)) onChange([...value, c]); setQ(''); input.current?.focus(); };

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Categories">
      <div className="dim" onClick={onClose} />
      <div className="modal">
        <div className="modal-head">
          <b>Categories</b>
          <button type="button" className="btn" onClick={onClose}>Done</button>
        </div>
        <label className="srch modal-srch">
          <Icon name="search" />
          <input ref={input} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or create a category" aria-label="Search categories"
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              if (!typed) return;
              const hits = sections.flatMap(([, n]) => n);
              const canon = canonicalCategory(typed);
              if (!exact) create();
              else if (hits.includes(canon) || hits.length === 1) { toggle(hits.includes(canon) ? canon : hits[0]); setQ(''); }
            }} />
        </label>
        <div className="modal-body">
          {typed && !exact && (
            <button type="button" className="mi" onClick={create}><Icon name="plus" />Create “{canonicalCategory(typed)}”</button>
          )}
          {sections.map(([title, names]) => (
            <section key={title}>
              <div className="menu-label">{title}</div>
              <div className="chips">
                {names.map((c) => {
                  const l = categoryLook(c);
                  const on = value.includes(c);
                  return (
                    <button type="button" key={c} className={'chip' + (on ? ' on tint' : '')} style={on ? lookVars(l) : undefined} onClick={() => toggle(c)} aria-pressed={on}>
                      <Icon name={on ? 'check' : l.icon} size={13} />{c}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          {sections.length === 0 && !typed && <p className="muted small">No categories.</p>}
        </div>
      </div>
    </div>
  );
}
