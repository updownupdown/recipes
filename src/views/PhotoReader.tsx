import { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons';
import { closeOcr, loadPhoto, readBox, type Box } from '../ocr';
import { joinWrapped } from '../ocrText';

type Kind = 'title' | 'ingredients' | 'steps';
interface Sections { title: string; ingredients: string[]; steps: string[] }
const FULL: Box = { x: 0, y: 0, w: 1, h: 1 };
const LABEL: Record<Kind, string> = { title: 'Title', ingredients: 'Ingredients', steps: 'Steps' };

export function composeText(s: Sections): string {
  return [s.title, '', 'Ingredients', ...s.ingredients, '', 'Instructions', ...s.steps].join('\n').trim();
}

/** Photo -> text, one box at a time: draw a box around a column, say what it is, repeat. */
export function PhotoReader({ onDone }: { onDone: (text: string) => void }) {
  const [bmp, setBmp] = useState<ImageBitmap>();
  const [view, setView] = useState<Box>(FULL);      // part of the photo on screen (zoom)
  const [box, setBox] = useState<Box>();            // selection, in photo coordinates
  const [done, setDone] = useState<{ box: Box; kind: Kind }[]>([]);
  const [sections, setSections] = useState<Sections>({ title: '', ingredients: [], steps: [] });
  const [busy, setBusy] = useState<{ label: string; fraction: number }>();
  const [error, setError] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => () => { closeOcr(); }, []);

  // Draw the visible part of the photo, earlier boxes, and the current selection.
  useEffect(() => {
    const c = canvas.current;
    if (!c || !bmp) return;
    const cssW = c.parentElement!.clientWidth;
    const aspect = (view.h * bmp.height) / (view.w * bmp.width);
    const cssH = Math.min(cssW * aspect, innerHeight * 0.62);
    const width = cssH / aspect;
    const dpr = devicePixelRatio || 1;
    c.style.width = width + 'px';
    c.style.height = cssH + 'px';
    c.width = Math.round(width * dpr);
    c.height = Math.round(cssH * dpr);
    const ctx = c.getContext('2d')!;
    ctx.drawImage(bmp, view.x * bmp.width, view.y * bmp.height, view.w * bmp.width, view.h * bmp.height, 0, 0, c.width, c.height);
    const toView = (b: Box) => [((b.x - view.x) / view.w) * c.width, ((b.y - view.y) / view.h) * c.height, (b.w / view.w) * c.width, (b.h / view.h) * c.height] as const;
    for (const d of done) {
      ctx.fillStyle = 'rgba(47, 138, 91, .22)';
      ctx.fillRect(...toView(d.box));
    }
    if (box) {
      const [x, y, w, h] = toView(box);
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fillRect(0, 0, c.width, y);
      ctx.fillRect(0, y + h, c.width, c.height - y - h);
      ctx.fillRect(0, y, x, h);
      ctx.fillRect(x + w, y, c.width - x - w, h);
      ctx.strokeStyle = '#ffd34d';
      ctx.lineWidth = 2 * dpr;
      ctx.strokeRect(x, y, w, h);
    }
  }, [bmp, view, box, done]);

  const pick = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    setError('');
    try {
      setBmp(await loadPhoto(f));
      setView(FULL); setBox(undefined); setDone([]);
    } catch {
      setError("Couldn't open that photo.");
    }
  };

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    return { x: view.x + px * view.w, y: view.y + py * view.h };
  };
  const down = (e: React.PointerEvent) => { if (busy) return; (e.target as Element).setPointerCapture(e.pointerId); drag.current = point(e); setBox(undefined); };
  const move = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const p = point(e), s = drag.current;
    setBox({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
  };
  const up = () => {
    drag.current = null;
    setBox((b) => (b && b.w * bmp!.width > 20 && b.h * bmp!.height > 12 ? b : undefined));
  };

  const read = async (kind: Kind) => {
    if (!bmp) return;
    const region = box ?? view;
    setError('');
    setBusy({ label: 'Loading text recognition…', fraction: 0 });
    try {
      const text = await readBox(bmp, region, (label, fraction) => setBusy({ label, fraction }));
      const lines = joinWrapped(text, kind).filter(Boolean);
      if (!lines.length) throw new Error('No text found there. Try a box that sits snugly around the text.');
      setSections((s) => kind === 'title' ? { ...s, title: lines.join(' ') } : { ...s, [kind]: [...s[kind], ...lines] });
      setDone((d) => [...d, { box: region, kind }]);
      setBox(undefined);
    } catch (e) {
      setError((e as Error).message || 'Text recognition failed.');
    } finally {
      setBusy(undefined);
    }
  };

  const zoom = () => {
    if (!box) return;
    const pad = 0.03;
    const x = Math.max(0, box.x - pad), y = Math.max(0, box.y - pad);
    setView({ x, y, w: Math.min(1 - x, box.w + 2 * pad), h: Math.min(1 - y, box.h + 2 * pad) });
    setBox(undefined);
  };

  const have = sections.title || sections.ingredients.length || sections.steps.length;

  if (!bmp) {
    return (
      <div className="pad-x stack">
        <label className="choice">
          <span className="tile soft"><Icon name="camera" /></span><span><b>Take a photo</b><small>Hold the page flat, straight on, in good light.</small></span>
          <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files)} />
        </label>
        <label className="choice">
          <span className="tile soft"><Icon name="grid" /></span><span><b>Choose a photo</b><small>A cookbook page, recipe card or screenshot.</small></span>
          <input type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files)} />
        </label>
        {have ? <button className="btn" onClick={() => onDone(composeText(sections))}>Review the text</button> : null}
        <p className="muted small">The text is read on your phone, and you check it before saving. Printed pages work best; handwriting usually doesn't. The first use downloads about 7 MB.</p>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="pad-x stack">
      <p className="small muted">Drag a box around <b>one column</b> of text, then say what it is. Repeat for each part, then review.</p>
      <div className="photo">
        <canvas ref={canvas} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      </div>
      <div className="row gap wrap">
        {box && <button className="pill" onClick={zoom}><Icon name="search" size={13} />Zoom to box</button>}
        {view !== FULL && <button className="pill" onClick={() => { setView(FULL); setBox(undefined); }}><Icon name="grid" size={13} />Whole photo</button>}
        {box && <button className="pill" onClick={() => setBox(undefined)}><Icon name="x" size={13} />Clear box</button>}
      </div>
      {busy ? (
        <div className="panel">
          <div className="row gap"><Icon name="refresh" size={18} className="spin" /><b>{busy.label}</b></div>
          <div className="bar"><i style={{ width: `${Math.round(busy.fraction * 100)}%` }} /></div>
        </div>
      ) : (
        <div className="read-as">
          <span className="small muted">{box ? 'Read the box as' : 'Read the whole view as'}</span>
          <div className="row gap wrap">
            {(['title', 'ingredients', 'steps'] as const).map((k) => <button key={k} className="pill dark" onClick={() => read(k)}>{LABEL[k]}</button>)}
          </div>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      {have ? (
        <div className="panel">
          <div className="small">
            {sections.title && <div><b>Title:</b> {sections.title}</div>}
            {sections.ingredients.length > 0 && <div><b>Ingredients:</b> {sections.ingredients.length} lines</div>}
            {sections.steps.length > 0 && <div><b>Steps:</b> {sections.steps.length}</div>}
          </div>
          <div className="row gap wrap">
            <button className="btn" onClick={() => onDone(composeText(sections))}>Review the text</button>
            <button className="btn ghost" onClick={() => setBmp(undefined)}>Another photo</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
