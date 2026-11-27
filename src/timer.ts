import { useEffect, useState } from 'react';

/* One kitchen timer for the whole app, pinned to the top of the screen. It survives reloads
   (the end time is saved) and rings with sound, vibration and, when the app is hidden, a notification. */

export type TimerState =
  | { kind: 'off' }
  | { kind: 'setup'; seconds: number }
  | { kind: 'running'; endsAt: number; total: number; label: string }
  | { kind: 'paused'; left: number; total: number; label: string }
  | { kind: 'ringing'; label: string };

const KEY = 'timer';
let state: TimerState = load();
const subs = new Set<(s: TimerState) => void>();

function load(): TimerState {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null') as TimerState | null;
    if (!s || s.kind === 'setup') return { kind: 'off' };
    if (s.kind === 'running' && s.endsAt <= Date.now()) return { kind: 'ringing', label: s.label };
    return s;
  } catch { return { kind: 'off' }; }
}
function set(s: TimerState) {
  state = s;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
  subs.forEach((f) => f(s));
  schedule();
}

export function useTimer(): TimerState {
  const [s, setS] = useState(state);
  useEffect(() => { subs.add(setS); setS(state); return () => { subs.delete(setS); }; }, []);
  return s;
}
export const timerState = () => state;

export function secondsLeft(s: TimerState): number {
  if (s.kind === 'running') return Math.max(0, Math.ceil((s.endsAt - Date.now()) / 1000));
  if (s.kind === 'paused') return s.left;
  if (s.kind === 'setup') return s.seconds;
  return 0;
}

export function fmt(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return (h ? `${h}:` : '') + `${mm}:${String(s).padStart(2, '0')}`;
}

export function describe(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
  return [h && `${h} h`, m && `${m} min`].filter(Boolean).join(' ') || `${sec} s`;
}

export const isActive = () => state.kind === 'running' || state.kind === 'paused' || state.kind === 'ringing';

export function startTimer(seconds: number, label = describe(seconds)) {
  stopRinging();
  askNotify();
  set({ kind: 'running', endsAt: Date.now() + seconds * 1000, total: seconds, label });
}

/** From a step: asks before replacing a timer that's already going. */
export function startFromStep(seconds: number, text: string) {
  if (isActive()) {
    const left = secondsLeft(state);
    const what = state.kind === 'ringing' ? 'A timer is ringing.' : `A timer is running (${fmt(left)} left).`;
    if (!confirm(`${what}\n\nReset it to ${text}?`)) return;
  }
  startTimer(seconds, text);
}

export function openSetup() { if (!isActive()) set({ kind: 'setup', seconds: 0 }); }
export function addSeconds(n: number) {
  const s = state;
  if (s.kind === 'setup') set({ ...s, seconds: Math.max(0, s.seconds + n) });
  else if (s.kind === 'running') set({ ...s, endsAt: Math.max(Date.now(), s.endsAt + n * 1000), total: s.total + n });
  else if (s.kind === 'paused') set({ ...s, left: Math.max(0, s.left + n), total: s.total + n });
  else if (s.kind === 'ringing') startTimer(n);
}
export function pause() { const s = state; if (s.kind === 'running') set({ kind: 'paused', left: secondsLeft(s), total: s.total, label: s.label }); }
export function resume() { const s = state; if (s.kind === 'paused') set({ kind: 'running', endsAt: Date.now() + s.left * 1000, total: s.total, label: s.label }); }
export function stopTimer() { stopRinging(); set({ kind: 'off' }); }

/** "20 minutes", "10-15 min", "1 hour", "1.5 hrs", "2h" -> seconds (first number of a range). */
export function parseDuration(text: string): number | undefined {
  const m = text.match(/(\d+(?:[.,]\d+)?)(?:\s*(?:-|to)\s*\d+(?:[.,]\d+)?)?\s*(minutes?|mins?|hours?|hrs?|h|seconds?|secs?)\b/i);
  if (!m) return undefined;
  const n = parseFloat(m[1].replace(',', '.'));
  const u = m[2].toLowerCase();
  const sec = u.startsWith('h') ? n * 3600 : u.startsWith('s') ? n : n * 60;
  return sec > 0 ? Math.round(sec) : undefined;
}

// Ringing
let tick: ReturnType<typeof setTimeout> | undefined;
let ring: ReturnType<typeof setInterval> | undefined;
let audio: AudioContext | undefined;

function schedule() {
  clearTimeout(tick);
  const s = state;
  if (s.kind === 'running') {
    const ms = s.endsAt - Date.now();
    if (ms <= 0) { set({ kind: 'ringing', label: s.label }); return; }
    tick = setTimeout(schedule, Math.min(ms, 30_000));
  } else if (s.kind === 'ringing' && !ring) startRinging(s.label);
}

function beep() {
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    for (const [i, f] of [880, 1175, 880].entries()) {
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = f; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, t + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.4, t + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.16);
      o.connect(g).connect(audio.destination);
      o.start(t + i * 0.18); o.stop(t + i * 0.18 + 0.17);
    }
  } catch { /* no audio */ }
}

function startRinging(label: string) {
  let n = 0;
  const once = () => { beep(); navigator.vibrate?.([300, 150, 300]); if (++n > 60) stopRinging(); };
  once();
  ring = setInterval(once, 1500);
  if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
    try { new Notification('Time’s up', { body: label, tag: 'myrecipes-timer' }); } catch { /* ignore */ }
  }
}
function stopRinging() { clearInterval(ring); ring = undefined; }

function askNotify() {
  try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch { /* ignore */ }
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') schedule(); });
schedule();
