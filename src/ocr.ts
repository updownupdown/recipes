/* Add-from-photo: text recognition runs entirely in the browser with Tesseract.js (free, open source).
   The engine and English data are served from this app (public/ocr) and cached after first use;
   photos never leave the device. Recognition is done one region at a time (a column of ingredients,
   the steps…), which is what makes multi-column cookbook pages readable. */

import type { Worker } from 'tesseract.js';

export type OcrProgress = (label: string, fraction: number) => void;
export interface Box { x: number; y: number; w: number; h: number } // 0..1 of the photo

let progress: OcrProgress = () => {};
let workerP: Promise<Worker> | null = null;

function worker(): Promise<Worker> {
  workerP ??= (async () => {
    const { createWorker } = await import('tesseract.js');
    const here = (p: string) => new URL(import.meta.env.BASE_URL + p, location.href).href;
    return createWorker('eng', 1, {
      workerPath: here('ocr/worker.min.js'),
      corePath: here('ocr'),
      langPath: here('ocr'),
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') progress('Reading…', m.progress);
        else progress('Loading text recognition…', 0);
      },
    });
  })().catch((e) => { workerP = null; throw e; });
  return workerP;
}

export async function closeOcr() {
  const p = workerP;
  workerP = null;
  if (p) (await p.catch(() => null))?.terminate();
}

export async function loadPhoto(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: 'from-image' });
}

/** Crop, enlarge small text and turn grey: Tesseract reads that far better than a raw phone photo. */
function prepare(bmp: ImageBitmap, box: Box): HTMLCanvasElement {
  const sx = box.x * bmp.width, sy = box.y * bmp.height, sw = box.w * bmp.width, sh = box.h * bmp.height;
  const scale = Math.min(3, Math.max(1, 1400 / sw), 3200 / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.round(sw * scale);
  c.height = Math.round(sh * scale);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, c.width, c.height);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = g;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export async function readBox(bmp: ImageBitmap, box: Box, onProgress: OcrProgress): Promise<string> {
  progress = onProgress;
  onProgress('Loading text recognition…', 0);
  const w = await worker();
  const { data } = await w.recognize(prepare(bmp, box));
  return data.text;
}
