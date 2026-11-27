import { forgetToken, rememberEmail } from './auth';

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

export class AuthError extends Error {}

async function call(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, { ...init, headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` } });
  if (res.status === 401) { forgetToken(); throw new AuthError('Google sign-in expired.'); }
  if (!res.ok) throw new Error(`Google Drive error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res;
}

export async function fetchEmail(token: string) {
  const r = await call(token, `${API}/about?fields=user(emailAddress)`);
  const j = await r.json();
  if (j.user?.emailAddress) rememberEmail(j.user.emailAddress);
}

async function findOne(token: string, q: string): Promise<string | null> {
  const r = await call(token, `${API}/files?q=${encodeURIComponent(q + ' and trashed=false')}&fields=files(id)&spaces=drive&orderBy=createdTime`);
  return (await r.json()).files?.[0]?.id ?? null;
}

async function exists(token: string, id: string): Promise<boolean> {
  try {
    const r = await call(token, `${API}/files/${id}?fields=id,trashed`);
    return !(await r.json()).trashed;
  } catch (e) {
    if (e instanceof AuthError) throw e;
    return false;
  }
}

/** The "MyRecipes" folder this app created in the user's Drive. */
export async function folderId(token: string): Promise<string> {
  const cached = ls.get('drive_folder_id');
  if (cached && (await exists(token, cached))) return cached;
  let id = await findOne(token, `mimeType='application/vnd.google-apps.folder' and name='MyRecipes'`);
  if (!id) {
    const r = await call(token, `${API}/files?fields=id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'MyRecipes', mimeType: 'application/vnd.google-apps.folder' }),
    });
    id = (await r.json()).id as string;
  }
  ls.set('drive_folder_id', id);
  return id;
}

/** The recipes.json data file, created empty if missing. */
export async function dataFileId(token: string): Promise<{ id: string; created: boolean }> {
  const cached = ls.get('drive_file_id');
  if (cached && (await exists(token, cached))) return { id: cached, created: false };
  let id = await findOne(token, `name='recipes.json' and appProperties has { key='myrecipes' and value='data' }`);
  let created = false;
  if (!id) {
    const parent = await folderId(token);
    const meta = { name: 'recipes.json', parents: [parent], mimeType: 'application/json', appProperties: { myrecipes: 'data' } };
    id = await multipart(token, meta, JSON.stringify({ app: 'MyRecipes', version: 1, recipes: [] }), 'application/json');
    created = true;
  }
  ls.set('drive_file_id', id);
  return { id, created };
}

async function multipart(token: string, meta: object, body: string, type: string, fields = 'id'): Promise<string> {
  const boundary = 'mr' + Math.random().toString(36).slice(2);
  const payload =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
    `--${boundary}\r\nContent-Type: ${type}; charset=UTF-8\r\n\r\n${body}\r\n--${boundary}--`;
  const r = await call(token, `${UPLOAD}/files?uploadType=multipart&fields=${fields}`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: payload,
  });
  const j = await r.json();
  return fields === 'id' ? j.id : JSON.stringify(j);
}

export async function download(token: string, id: string): Promise<string> {
  return (await call(token, `${API}/files/${id}?alt=media`)).text();
}

export async function upload(token: string, id: string, body: string): Promise<void> {
  await call(token, `${UPLOAD}/files/${id}?uploadType=media`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

/** Create a Google Doc from HTML in the MyRecipes folder. Returns its web link. */
export async function createDoc(token: string, name: string, html: string): Promise<string> {
  const parent = await folderId(token);
  const meta = { name, parents: [parent], mimeType: 'application/vnd.google-apps.document' };
  const j = JSON.parse(await multipart(token, meta, html, 'text/html', 'id,webViewLink'));
  return j.webViewLink as string;
}
