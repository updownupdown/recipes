import { DRIVE_SCOPE, GOOGLE_CLIENT_ID } from './config';

/* Minimal types for Google Identity Services (token model). */
interface TokenResponse { access_token: string; expires_in: number; error?: string; scope?: string }
interface TokenClient { requestAccessToken(o?: { prompt?: string; login_hint?: string }): void; callback: (r: TokenResponse) => void; error_callback?: (e: { type: string }) => void }
declare global {
  interface Window {
    google?: { accounts: { oauth2: {
      initTokenClient(c: { client_id: string; scope: string; callback: (r: TokenResponse) => void; error_callback?: (e: { type: string }) => void }): TokenClient;
      revoke(token: string, done?: () => void): void;
    } } };
  }
}

const K = { token: 'g_token', exp: 'g_exp', email: 'g_email', on: 'g_signedin' };
const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* ignore */ } };

let gisLoad: Promise<void> | null = null;
export function loadGis(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve();
  gisLoad ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { gisLoad = null; reject(new Error('Could not reach Google. Check your connection.')); };
    document.head.appendChild(s);
  });
  return gisLoad;
}

let client: TokenClient | null = null;

/** True if the user has connected Drive on this device (they may still need a fresh token). */
export const isSignedIn = () => get(K.on) === '1';
export const signedInEmail = () => get(K.email);

/** A token that is valid for at least another minute, or null. Never prompts. */
export function currentToken(): string | null {
  const t = get(K.token);
  const exp = Number(get(K.exp) || 0);
  return t && exp - Date.now() > 60_000 ? t : null;
}

/**
 * Get a token, opening Google's popup if needed. Must be called from a tap/click,
 * otherwise the browser blocks the popup. After the first consent the popup closes by itself.
 */
export async function requestToken(): Promise<string> {
  const existing = currentToken();
  if (existing) return existing;
  await loadGis();
  return new Promise((resolve, reject) => {
    const onToken = (r: TokenResponse) => {
      if (r.error || !r.access_token) { reject(new Error(r.error || 'Sign-in was cancelled.')); return; }
      set(K.token, r.access_token);
      set(K.exp, String(Date.now() + r.expires_in * 1000));
      set(K.on, '1');
      resolve(r.access_token);
    };
    const onError = (e: { type: string }) =>
      reject(new Error(e.type === 'popup_closed' ? 'Sign-in window was closed.' : 'Sign-in popup was blocked. Tap again.'));
    client ??= window.google!.accounts.oauth2.initTokenClient({ client_id: GOOGLE_CLIENT_ID, scope: DRIVE_SCOPE, callback: onToken, error_callback: onError });
    client.callback = onToken;
    client.error_callback = onError;
    const hint = get(K.email) ?? undefined;
    client.requestAccessToken(isSignedIn() ? { prompt: '', login_hint: hint } : { prompt: 'consent' });
  });
}

export function rememberEmail(email: string) { set(K.email, email); }

export function signOut() {
  const t = get(K.token);
  if (t && window.google) window.google.accounts.oauth2.revoke(t);
  for (const k of Object.values(K)) set(k, null);
  set('drive_file_id', null);
  set('drive_folder_id', null);
  set('last_sync', null);
}

export function forgetToken() { set(K.token, null); set(K.exp, null); }
