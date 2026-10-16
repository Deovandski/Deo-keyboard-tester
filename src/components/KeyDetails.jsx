import { LOCATION_NAMES } from '../layouts.js';

export function displayKey(key) {
  if (key === ' ') return 'Space';
  if (key === 'Dead') return 'Dead key';
  return key;
}

const MOD_LABELS = { Shift: 'Shift', Control: 'Ctrl', Alt: 'Alt', Meta: 'Meta / Win', AltGraph: 'AltGr' };
const LOCK_LABELS = { CapsLock: 'Caps Lock', NumLock: 'Num Lock', ScrollLock: 'Scroll Lock' };

export default function KeyDetails({ last, locks }) {
  return (
    <section className="panel key-details" aria-labelledby="last-key-title">
      <h2 id="last-key-title">Last key</h2>
      {last ? (
        <>
          <div className="key-details__hero">
            <div className="key-details__glyph" aria-live="polite">
              {displayKey(last.key)}
            </div>
            <div className="key-details__code">
              <code>{last.code}</code>
              <span>{last.type === 'down' ? (last.repeat ? 'auto-repeat' : 'pressed') : 'released'}</span>
            </div>
          </div>
          <dl className="facts">
            <div>
              <dt>key</dt>
              <dd><code>{JSON.stringify(last.key)}</code></dd>
            </div>
            <div>
              <dt>code</dt>
              <dd><code>{last.code}</code></dd>
            </div>
            <div>
              <dt>location</dt>
              <dd>{LOCATION_NAMES[last.location] ?? last.location} ({last.location})</dd>
            </div>
            <div>
              <dt>keyCode (legacy)</dt>
              <dd><code>{last.keyCode}</code></dd>
            </div>
            <div>
              <dt>Held for</dt>
              <dd>{last.held != null ? `${last.held} ms` : last.type === 'down' ? 'still down' : 'unknown'}</dd>
            </div>
            <div>
              <dt>Event time</dt>
              <dd>{last.t.toFixed(1)} ms</dd>
            </div>
          </dl>
          <div className="lamps" aria-label="Modifiers active during the last event">
            {Object.entries(MOD_LABELS).map(([k, label]) => (
              <span key={k} className={`lamp${last.mods[k] ? ' lamp--on' : ''}`}>{label}</span>
            ))}
          </div>
        </>
      ) : (
        <p className="empty">Press any key to start. Everything you press shows up here and in the log below.</p>
      )}
      <div className="leds" aria-label="Lock key states reported by the browser">
        {Object.entries(LOCK_LABELS).map(([k, label]) => (
          <span key={k} className={`led${locks[k] ? ' led--on' : ''}`}>
            <i aria-hidden="true" />
            {label} {locks[k] ? 'on' : 'off'}
          </span>
        ))}
      </div>
    </section>
  );
}
