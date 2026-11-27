import { useState } from 'react';
import { categoryLook, lookVars, recipeLook } from '../categories';
import { Icon } from '../icons';
import { isStepHeading } from '../exporters';
import { scaleLine, splitAmount } from '../quantity';
import { convertLine, convertTemps, type UnitSystem } from '../units';
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

const SHORT: [RegExp, string][] = [
  [/\btablespoons?\b|\btbsps\b/i, 'tbsp'], [/\bteaspoons?\b|\btsps\b/i, 'tsp'], [/\bounces?\b/i, 'oz'],
  [/\bpounds?\b|\blbs\b/i, 'lb'], [/\bgrams?\b/i, 'g'], [/\bpackages?\b/i, 'pkg'], [/\bpinches\b/i, 'pinch'],
];
const FRAC: Record<string, string> = { '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾', '1/8': '⅛', '3/8': '⅜' };

/** Compact amount for the amount column: "1 1/2 teaspoons" -> "1½ tsp". */
function shortAmount(a: string): string {
  let t = a.replace(/\.$/, '');
  for (const [re, s] of SHORT) t = t.replace(re, s);
  return t.replace(/(\d+)\s+(\d\/\d)\b/g, (m, w, f) => (FRAC[f] ? w + FRAC[f] : m)).replace(/\b(\d\/\d)\b/g, (m) => FRAC[m] ?? m);
}

export function RecipeBody({ recipe, actions }: { recipe: Body; actions?: React.ReactNode }) {
  const [factor, setFactor] = useState(1);
  const [cook, setCook] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());
  const wakeSupported = useWakeLock(cook);
  const [units, setUnitsState] = useState<UnitSystem>(() => { try { return (localStorage.getItem('units') as UnitSystem) || 'orig'; } catch { return 'orig'; } });
  const setUnits = (u: UnitSystem) => { setUnitsState(u); try { localStorage.setItem('units', u); } catch { /* ignore */ } };
  const look = recipeLook(recipe);

  const toggle = (key: string) => setDone((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const servings = recipe.servings ? Math.round(recipe.servings * factor * 100) / 100 : undefined;
  const setServings = (v: number) => { if (recipe.servings && v > 0) setFactor(v / recipe.servings); };
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
        <div className="seg sm" role="group" aria-label="Scale">
          {FACTORS.map((f) => <button key={f} className={factor === f ? 'on' : ''} onClick={() => setFactor(f)}>{f === 0.5 ? '½' : f}×</button>)}
        </div>
        <div className="seg sm" role="group" aria-label="Units">
          {(['orig', 'metric', 'us'] as const).map((u) => <button key={u} className={units === u ? 'on' : ''} onClick={() => setUnits(u)}>{u === 'orig' ? 'Original' : u === 'metric' ? 'Metric' : 'US'}</button>)}
        </div>
      </div>
      {recipe.servings && <div className="ctl">
        {recipe.servings && (
          <div className="stp" aria-label="Servings">
            <button onClick={() => setServings((servings ?? 1) - 1)} aria-label="Fewer servings"><Icon name="minus" size={12} /></button>
            <span>{servings}</span>
            <button onClick={() => setServings((servings ?? 0) + 1)} aria-label="More servings"><Icon name="plus" size={12} /></button>
          </div>
        )}
        {actions}
      </div>}

      <div className="h5"><b>Ingredients</b>
        <button className={'cook' + (cook ? ' on' : '')} onClick={() => setCook((c) => !c)} aria-pressed={cook}>
          <Icon name="flame" size={15} />Cook mode
        </button>
      </div>
      {cook && <p className="awake-note"><Icon name="sun" size={12} />{wakeSupported ? 'Screen stays on. ' : ''}{ingDone ? `${ingDone} of ${ingCount} ready.` : 'Tap ingredients and steps to check them off.'}</p>}
      <div className={'ing' + (cook ? ' cooking' : '')}>
        {recipe.ingredients.map((line, i) => {
          if (line.startsWith('#')) return <div key={i} className="ing-sub">{line.replace(/^#+\s*/, '')}</div>;
          const [amt, rest] = splitAmount(convertLine(scaleLine(line, factor), units));
          const key = 'i' + i;
          const on = done.has(key);
          const cells = <>
              {cook && <span className="bx">{on && <Icon name="check" size={11} />}</span>}
              <span className={'q' + (amt ? '' : ' none')}>{amt ? shortAmount(amt) : '–'}</span>
              <span className="tx">{rest}</span>
            </>;
            return cook
              ? <button key={i} className={'ing-row' + (on ? ' dn' : '')} onClick={() => toggle(key)} aria-pressed={on}>{cells}</button>
              : <div key={i} className="ing-row">{cells}</div>;
        })}
      </div>

      {recipe.instructions.length > 0 && (
        <>
          <div className="h5"><b>Steps</b>{cook && <span>tap to mark done</span>}</div>
          <ol className="steps">
            {(() => {
              let n = 0;
              return recipe.instructions.map((s, i) => {
                // A short line ending in ":" is a sub-heading inside the steps.
                if (isStepHeading(s)) return <li key={i} className="step-sub">{s.slice(0, -1)}</li>;
                n++;
                const on = cook && done.has('s' + i);
                return (
                  <li key={i} className={(on ? 'dn' : '') + (cook ? ' tap' : '')} onClick={cook ? () => toggle('s' + i) : undefined}>
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

