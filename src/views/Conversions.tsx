import { useEffect, useState } from 'react';
import { convertText } from '../convert';
import { Icon } from '../icons';

/* Kitchen conversions: a box to convert anything typed, and ready-made tables with the common ones first. */

let setOpenFn: ((v: boolean) => void) | undefined;
export const openConversions = () => setOpenFn?.(true);

const COMMON: [string, string][] = [
  ['1 cup', '240 ml'], ['1 tbsp', '15 ml · 3 tsp'], ['1 tsp', '5 ml'], ['1 stick butter', '113 g · 1/2 cup'],
  ['1 oz', '28 g'], ['1 lb', '454 g'], ['1 fl oz', '30 ml'], ['1 pint (US)', '473 ml'],
];
const OVEN: [number, number][] = [[250, 120], [300, 150], [325, 165], [350, 180], [375, 190], [400, 200], [425, 220], [450, 230], [475, 245]];
const CUPS: [string, number][] = [
  ['All-purpose flour', 125], ['Bread flour', 130], ['Whole wheat flour', 120], ['White sugar', 200], ['Brown sugar (packed)', 220],
  ['Icing sugar', 120], ['Butter', 227], ['Cocoa powder', 85], ['Rolled oats', 90], ['Rice (uncooked)', 185], ['Grated parmesan', 100], ['Honey', 340],
];
const VOLUME: [string, string][] = [['1/4 cup', '60 ml'], ['1/3 cup', '80 ml'], ['1/2 cup', '120 ml'], ['2/3 cup', '160 ml'], ['3/4 cup', '180 ml'], ['1 cup', '240 ml'], ['2 cups', '475 ml'], ['4 cups', '950 ml']];
const WEIGHT: [string, string][] = [['1 oz', '28 g'], ['2 oz', '57 g'], ['4 oz', '113 g'], ['8 oz', '227 g'], ['12 oz', '340 g'], ['1 lb', '454 g'], ['2 lb', '907 g'], ['2.2 lb', '1 kg']];
const EXAMPLES = ['2 cups flour', '350 F', '100 g butter', '1.5 lb'];

export function ConversionsHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpenFn = setOpen; return () => { setOpenFn = undefined; }; }, []);
  return open ? <Conversions onClose={() => setOpen(false)} /> : null;
}

function Conversions({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [onClose]);
  const res = q.trim() ? convertText(q) : undefined;

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Conversions">
      <div className="dim" onClick={onClose} />
      <div className="modal conv">
        <div className="modal-head">
          <b>Conversions</b>
          <button type="button" className="ib flat" onClick={onClose} aria-label="Close conversions"><Icon name="x" /></button>
        </div>
        <label className="srch modal-srch">
          <Icon name="scale" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Convert… e.g. 2 cups flour" aria-label="Amount to convert" autoFocus />
          {q && <button className="srch-x" onClick={() => setQ('')} aria-label="Clear"><Icon name="x" size={15} /></button>}
        </label>
        <div className="modal-body">
          {q.trim() ? (
            res ? (
              <section className="conv-live">
                <div className="conv-from">{res.from} =</div>
                <div className="conv-results">
                  {res.results.map((r) => (
                    <div key={r.unit + r.value} className={'conv-res' + (r.note ? ' hint' : '')}>
                      <b>{r.value}</b><span>{r.unit}</span>{r.note && <small>{r.note}</small>}
                    </div>
                  ))}
                </div>
              </section>
            ) : <p className="muted small conv-help">Type an amount and a unit, like “2 cups flour”, “350 F” or “100 g”.</p>
          ) : (
            <>
              <div className="conv-try">
                {EXAMPLES.map((e) => <button key={e} type="button" className="chip" onClick={() => setQ(e)}>{e}</button>)}
              </div>
              <Table title="Most used" rows={COMMON} />
              <section>
                <div className="menu-label">Oven temperatures</div>
                <div className="conv-table oven">
                  <div className="conv-row head"><span>°F</span><span>°C</span></div>
                  {OVEN.map(([f, c]) => <div key={f} className="conv-row"><b>{f}°F</b><span>{c}°C</span></div>)}
                </div>
              </section>
              <section>
                <div className="menu-label">1 cup weighs about</div>
                <div className="conv-table">
                  {CUPS.map(([n, g]) => <div key={n} className="conv-row"><span>{n}</span><b>{g} g</b></div>)}
                </div>
              </section>
              <Table title="Cups to millilitres" rows={VOLUME} />
              <Table title="Ounces and pounds to grams" rows={WEIGHT} />
              <p className="muted small conv-help">US cups and spoons. Weights per cup are typical; how you fill the cup changes them a little.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Table({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <section>
      <div className="menu-label">{title}</div>
      <div className="conv-table">
        {rows.map(([a, b]) => <div key={a} className="conv-row"><span>{a}</span><b>{b}</b></div>)}
      </div>
    </section>
  );
}
