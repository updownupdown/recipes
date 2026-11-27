/* Add-from-photo: text recognition runs entirely in the browser with Tesseract.js (free, open source).
   The engine and English language data (a few MB) download from a CDN the first time it's used;
   photos never leave the device. Works best on printed pages and screenshots, poorly on handwriting. */

export type OcrProgress = (label: string, fraction: number) => void;

/** Shrinks big phone photos first: recognition is much faster and just as accurate at ~2000px. */
async function prepare(file: Blob): Promise<Blob | HTMLCanvasElement> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2200 / Math.max(bmp.width, bmp.height));
    if (scale === 1) return file;
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    return c;
  } catch {
    return file;
  }
}

export async function textFromPhotos(files: File[], onProgress: OcrProgress): Promise<string> {
  onProgress('Loading text recognition…', 0);
  const { createWorker } = await import('tesseract.js');
  let page = 0;
  const here = (p: string) => new URL(import.meta.env.BASE_URL + p, location.href).href;
  const worker = await createWorker('eng', 1, {
    workerPath: here('ocr/worker.min.js'),
    corePath: here('ocr'),
    langPath: here('ocr'),
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') {
        onProgress(files.length > 1 ? `Reading photo ${page + 1} of ${files.length}…` : 'Reading the photo…', (page + m.progress) / files.length);
      } else if (/loading|initializ/.test(m.status)) onProgress('Loading text recognition…', 0);
    },
  });
  try {
    const parts: string[] = [];
    for (; page < files.length; page++) {
      const { data } = await worker.recognize(await prepare(files[page]));
      parts.push(data.text.trim());
    }
    return tidy(parts.join('\n\n'));
  } finally {
    await worker.terminate();
  }
}

/** Common OCR slips in recipes: fractions, bullets, stray spacing. */
export function tidy(t: string): string {
  return t
    .replace(/[|]/g, 'l')
    .replace(/^[«•·*©®o]\s+(?=\S)/gm, '')
    .replace(/(\d) ?\/ ?(\d)/g, '$1/$2')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
