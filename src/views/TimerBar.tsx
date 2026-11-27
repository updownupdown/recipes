import { useEffect, useState } from 'react';
import { Icon } from '../icons';
import { addSeconds, fmt, pause, resume, secondsLeft, startTimer, stopTimer, useTimer } from '../timer';

/** The kitchen timer, pinned to the top of every page while it's in use. */
export function TimerBar() {
  const t = useTimer();
  const [, force] = useState(0);
  useEffect(() => {
    document.documentElement.style.setProperty('--timer-on', t.kind === 'off' ? '0' : '1');
    if (t.kind !== 'running') return;
    const i = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(i);
  }, [t]);
  if (t.kind === 'off') return null;

  const left = secondsLeft(t);
  const pct = t.kind === 'running' || t.kind === 'paused' ? 100 * (1 - left / Math.max(1, t.total)) : t.kind === 'ringing' ? 100 : 0;

  return (
    <div className={'timer ' + t.kind} role="timer" aria-live={t.kind === 'ringing' ? 'assertive' : 'off'}>
      <div className="timer-fill" style={{ width: pct + '%' }} />
      <Icon name="timer" size={18} />
      {t.kind === 'setup' ? (
        <>
          <b className="timer-time">{fmt(left)}</b>
          <span className="timer-btns">
            {[60, 300, 600].map((n) => <button key={n} onClick={() => addSeconds(n)}>+{n / 60}</button>)}
            <button className="go" disabled={!left} onClick={() => startTimer(left)}>Start</button>
          </span>
        </>
      ) : t.kind === 'ringing' ? (
        <>
          <b className="timer-time">Time’s up</b><span className="timer-label">{t.label}</span>
          <span className="timer-btns">
            <button onClick={() => addSeconds(60)}>+1 min</button>
            <button className="go" onClick={stopTimer}>OK</button>
          </span>
        </>
      ) : (
        <>
          <b className="timer-time">{fmt(left)}</b><span className="timer-label">{t.label}</span>
          <span className="timer-btns">
            <button onClick={() => addSeconds(60)} aria-label="Add a minute">+1</button>
            {t.kind === 'running'
              ? <button onClick={pause} aria-label="Pause"><Icon name="pause" size={15} /></button>
              : <button onClick={resume} aria-label="Resume"><Icon name="play" size={15} /></button>}
          </span>
        </>
      )}
      <button className="timer-x" onClick={stopTimer} aria-label="Close timer"><Icon name="x" size={16} /></button>
    </div>
  );
}
