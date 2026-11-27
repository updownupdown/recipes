import { useState } from 'react';
import { categoryLook, lookVars, recipeLook } from '../categories';
import { Icon } from '../icons';
import { isStepHeading } from '../exporters';
import { LEAD, formatNumber, scaleLine, splitAmount } from '../quantity';
import { convertLine, convertTemps, leadingAmount, type UnitSystem } from '../units';
import { useWakeLock } from '../hooks';
import type { Recipe } from '../types';

const FACTORS = [0.5, 1, 2, 3];
type Body = Pick<Recipe, 'title' | 'categories' | 'servings' | 'ingredients' | 'instructions' | 'notes' | 'source' | 'time'>;

function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s)]+)/g);
  return <>{parts.map((p, i) => (/^https?:\/\//.test(p) ? <a key={i} href={p} target="_blank" rel="noreferrer">{p.replace(/^https?:\/\/(www\.)?/, '').slice(0, 48)}{p.length > 56 ? '…' : ''}</a> : p))}</>;
}

/** Highlight durations like "20 minutes" or "1h" in a step. */
function StepText({ text }: { text: string }) {
  const re = /(\d+(?:[.,]\d+)?(?:\s*(?:-|to)\s*\d+(?:[.,]\d+)?)?\s*(?:minutes?|mins?|hours?|hrs?|h)\b)/gi;
  const parts = text.split(re);
  return <>{parts.map((p, i) => (i % 2 ? <span key={i} className="tm"><Icon name="timer" size={11} />{p}</span> : p))}</>;
}

export function RecipeBody({ recipe, actions }: { recipe: Body; actions?: React.ReactNode }) {
  const [factor, setFactor] = useState(1);
  const [awake, setAwake] = useState(() => { try { return localStorage.getItem('awake') === '1'; } catch { return false; } });
  const [done, setDone] = useState<Set<string>>(new Set());
  const wakeSupported = useWakeLock(awake);
  const [units, setUnitsState] = useState<UnitSystem>(() => { try { return (localStorage.getItem('units') as UnitSystem) || 'orig'; } catch { return 'orig'; } });
  const setUnits = (u: UnitSystem) => { setUnitsState(u); try { localStorage.setItem('units', u); } catch { /* ignore */ } };
  const [haveOpen, setHaveOpen] = useState(false);
  const [scaledTo, setScaledTo] = useState('');
  const pickFactor = (f: number) => { setFactor(f); setScaledTo(''); };
  const look = recipeLook(recipe);

  const toggle = (key: string) => setDone((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const toggleAwake = () => setAwake((a) => { try { localStorage.setItem('awake', a ? '0' : '1'); } catch { /* ignore */ } return !a; });
  const servings = recipe.servings ? Math.round(recipe.servings * factor * 100) / 100 : undefined;
  const setServings = (v: number) => { if (recipe.servings && v > 0) pickFactor(v / recipe.servings); };
  const ingCount = recipe.ingredients.filter((l) => !l.startsWith('#')).length;
  const ingDone = [...done].filter((k) => k.startsWith('i')).length;

  let host = '';
  try { if (recipe.source) host = new URL(recipe.source).hostname.replace(/^www\./, ''); } catch { /* not a URL */ }

  return (
    <article className="recipe" style={lookVars(look)}>
      <div className="rh">
        <div className="tags">
          {recipe.categories.length ? recipe.categories.map((c) => {
            const l = categoryLook(c);
            return <a key={c} className="tag tint" style={lookVars(l)} href={`#/c/${encodeURIComponent(c)}`}><i><Icon name={l.icon} size={12} /></i>{c}</a>;
          }) : look.name && <span className="tag tint"><i><Icon name={look.icon} size={12} /></i>{look.name}</span>}
        </div>
        <h1>{recipe.title}</h1>
        <div className="mt">
          {recipe.time && <span><Icon name="clock" size={13} />{recipe.time}</span>}
          {servings && <span><Icon name="users" size={13} />{servings} serving{servings === 1 ? '' : 's'}</span>}
          {recipe.source && <a href={recipe.source} target="_blank" rel="noreferrer"><Icon name="link" size={13} />{host || 'source'}</a>}
        </div>
      </div>

      <div className="ctl">
        <div className="seg" role="group" aria-label="Scale">
          {FACTORS.map((f) => <button key={f} className={factor === f ? 'on' : ''} onClick={() => pickFactor(f)}>{f === 0.5 ? '½' : f}×</button>)}
        </div>
        {recipe.servings && (
          <div className="stp" aria-label="Servings">
            <button onClick={() => setServings((servings ?? 1) - 1)} aria-label="Fewer servings"><Icon name="minus" size={12} /></button>
            <span>{servings}</span>
            <button onClick={() => setServings((servings ?? 0) + 1)} aria-label="More servings"><Icon name="plus" size={12} /></button>
          </div>
        )}
        {wakeSupported && (
          <button className={'awk' + (awake ? ' on' : '')} onClick={toggleAwake} aria-pressed={awake} title={awake ? 'Screen stays on' : 'Keep screen on'}>
            <Icon name="sun" size={17} />
          </button>
        )}
        {actions}
      </div>
      <div className="ctl">
        <div className="seg sm" role="group" aria-label="Units">
          {(['orig', 'metric', 'us'] as const).map((u) => <button key={u} className={units === u ? 'on' : ''} onClick={() => setUnits(u)}>{u === 'orig' ? 'As written' : u === 'metric' ? 'Metric' : 'US'}</button>)}
        </div>
        <button className={'pill' + (haveOpen ? ' dark' : '')} onClick={() => setHaveOpen((o) => !o)} aria-expanded={haveOpen}><Icon name="sliders" size={13} />I have…</button>
      </div>
      {haveOpen && <HavePanel ingredients={recipe.ingredients} units={units} onScale={(f, label) => { setFactor(f); setScaledTo(label); setHaveOpen(false); }} />}
      {scaledTo && factor !== 1 && (
        <p className="awake-note"><Icon name="sliders" size={12} />Scaled to {scaledTo} (×{formatNumber(factor)})<button className="link small" onClick={() => pickFactor(1)}>Reset</button></p>
      )}
      {awake && wakeSupported && <p className="awake-note"><Icon name="sun" size={12} />Screen stays on while this recipe is open</p>}

      <div className="h5"><b>Ingredients</b><span>{ingDone ? `${ingDone} of ${ingCount} ready` : 'tap to check off'}</span></div>
      <div className="ing">
        {recipe.ingredients.map((line, i) => {
          if (line.startsWith('#')) return <div key={i} className="ing-sub">{line.replace(/^#+\s*/, '')}</div>;
          const [amt, rest] = splitAmount(convertLine(scaleLine(line, factor), units));
          const key = 'i' + i;
          const on = done.has(key);
          return (
            <button key={i} className={'ing-row' + (on ? ' dn' : '')} onClick={() => toggle(key)} aria-pressed={on}>
              <span className="bx">{on && <Icon name="check" size={11} />}</span>
              {amt && <span className="q">{amt}</span>}
              <span className="tx">{rest}</span>
            </button>
          );
        })}
      </div>

      {recipe.instructions.length > 0 && (
        <>
          <div className="h5"><b>Steps</b><span>tap to mark done</span></div>
          <ol className="steps">
            {(() => {
              let n = 0;
              return recipe.instructions.map((s, i) => {
                // A short line ending in ":" is a sub-heading inside the steps.
                if (isStepHeading(s)) return <li key={i} className="step-sub">{s.slice(0, -1)}</li>;
                n++;
                const on = done.has('s' + i);
                return (
                  <li key={i} className={on ? 'dn' : ''} onClick={() => toggle('s' + i)}>
                    <i>{on ? <Icon name="check" size={12} /> : n}</i><span><StepText text={convertTemps(s, units)} /></span>
                  </li>
                );
              });
            })()}
          </ol>
        </>
      )}

      {recipe.notes && (
        <>
          <div className="h5"><b>Notes</b></div>
          <div className="notes"><Linkify text={recipe.notes} /></div>
        </>
      )}
    </article>
  );
}

/** "I have 300 g of flour": pick an ingredient, enter what you have, and scale the whole recipe to it. */
function HavePanel({ ingredients, units, onScale }: { ingredients: string[]; units: UnitSystem; onScale: (factor: number, label: string) => void }) {
  const options = ingredients
    .map((line, i) => ({ i, line: convertLine(line, units) }))
    .filter((o) => !o.line.startsWith('#') && leadingAmount(o.line));
  const [idx, setIdx] = useState(options[0]?.i ?? -1);
  const [have, setHave] = useState('');
  if (!options.length) return <div className="have"><p className="small muted">None of the ingredients have amounts to scale by.</p></div>;
  const cur = options.find((o) => o.i === idx) ?? options[0];
  const [amt, rest] = splitAmount(cur.line);
  const unit = amt.replace(LEAD, '').trim();
  const n = parseFloat(have.replace(',', '.'));
  const apply = () => { if (n > 0) onScale(n / leadingAmount(cur.line)!, `${have} ${unit ? unit + ' ' : ''}${rest}`.trim()); };
  return (
    <form className="have" onSubmit={(e) => { e.preventDefault(); apply(); }}>
      <b>Scale to what you have</b>
      <select className="field" value={cur.i} onChange={(e) => setIdx(+e.target.value)} aria-label="Ingredient">
        {options.map((o) => <option key={o.i} value={o.i}>{o.line}</option>)}
      </select>
      <div className="row gap">
        <input className="field grow" type="number" inputMode="decimal" min="0" step="any" placeholder={`I have… (recipe uses ${amt})`} value={have} onChange={(e) => setHave(e.target.value)} aria-label="Amount you have" />
        {unit && <span className="muted">{unit}</span>}
      </div>
      <button className="btn" disabled={!(n > 0)}>Scale recipe</button>
    </form>
  );
}
