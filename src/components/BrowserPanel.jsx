import { useEffect, useState } from 'react';
import {
  describePlatform,
  guessLayoutName,
  hasKeyboardLock,
  hasKeyboardMap,
  hasWebHid,
  useHighEntropyHints,
} from '../browser.js';

function Support({ ok }) {
  return <span className={`support ${ok ? 'support--yes' : 'support--no'}`}>{ok ? 'Available' : 'Not available'}</span>;
}

function KeyboardLock() {
  const supported = hasKeyboardLock();
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) {
        navigator.keyboard?.unlock?.();
        setLocked(false);
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Keyboard Lock only works in fullscreen entered from JavaScript.
  // https://developer.chrome.com/docs/capabilities/web-apis/keyboard-lock
  async function start() {
    setError(null);
    try {
      await document.documentElement.requestFullscreen();
      await navigator.keyboard.lock();
      setLocked(true);
    } catch (err) {
      setError(err.message || String(err));
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
  }

  return (
    <div className="subpanel">
      <h3>
        Keyboard Lock <Support ok={supported} />
      </h3>
      <p className="note">
        Lets the page receive keys the browser or OS normally keeps for itself, such as Esc, the
        Windows key and Alt+Tab, so you can test them too. It runs in fullscreen; Chrome may ask
        for permission first.
      </p>
      {supported &&
        (locked ? (
          <div className="lock-status">
            <p>
              <strong>System keys are captured.</strong> Hold Esc for two seconds, or use the button,
              to leave fullscreen.
            </p>
            <button type="button" className="button" onClick={() => document.exitFullscreen()}>
              Leave fullscreen
            </button>
          </div>
        ) : (
          <button type="button" className="button button--primary" onClick={start}>
            Capture system keys in fullscreen
          </button>
        ))}
      {error && <p className="error">Couldn't lock the keyboard: {error}</p>}
    </div>
  );
}

function KeyboardMap({ keyboardMap }) {
  const { status, map, error } = keyboardMap;
  const entries = map ? [...map].sort(([a], [b]) => a.localeCompare(b)) : [];
  return (
    <div className="subpanel">
      <h3>
        Keyboard Map <Support ok={hasKeyboardMap()} />
      </h3>
      <p className="note">
        Reads what each physical key types in the layout your operating system is set to. It
        describes your OS setting, not the legends printed on the keycaps.
      </p>
      {status === 'ready' && (
        <>
          <dl className="facts">
            <div>
              <dt>Looks like</dt>
              <dd>{guessLayoutName(map) ?? 'No layout reported by the OS'}</dd>
            </div>
            <div>
              <dt>Keys mapped</dt>
              <dd>{map.size}</dd>
            </div>
          </dl>
          <details className="details">
            <summary>Show the full map</summary>
            <ul className="keymap">
              {entries.map(([code, ch]) => (
                <li key={code}>
                  <code>{code}</code>
                  <span>{ch}</span>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
      {status === 'loading' && <p className="note">Reading your layout…</p>}
      {status === 'error' && (
        <p className="error">
          Chrome refused the layout map ({error}). It only works when this page is opened in its own
          tab, not inside a frame.
        </p>
      )}
    </div>
  );
}

export default function BrowserPanel({ browser, keyboardMap }) {
  const hints = useHighEntropyHints();
  const full = hints?.fullVersionList?.find((b) => b.brand === browser.name);
  const languages = navigator.languages?.length ? navigator.languages.join(', ') : navigator.language;

  return (
    <section className="panel" aria-labelledby="browser-title">
      <h2 id="browser-title">What your browser can tell</h2>
      <dl className="facts">
        <div>
          <dt>Browser</dt>
          <dd>
            {browser.name} {full?.version ?? browser.version}
          </dd>
        </div>
        <div>
          <dt>Platform</dt>
          <dd>{describePlatform(browser.platform, hints?.platformVersion)}</dd>
        </div>
        {hints?.architecture && (
          <div>
            <dt>Architecture</dt>
            <dd>
              {hints.architecture}
              {hints.bitness ? ` ${hints.bitness}-bit` : ''}
            </dd>
          </div>
        )}
        <div>
          <dt>Languages</dt>
          <dd>{languages}</dd>
        </div>
        <div>
          <dt>WebHID</dt>
          <dd>
            <Support ok={hasWebHid()} />
          </dd>
        </div>
        <div>
          <dt>Secure context</dt>
          <dd>{window.isSecureContext ? 'Yes' : 'No (WebHID and Keyboard Map need HTTPS or localhost)'}</dd>
        </div>
      </dl>
      <KeyboardMap keyboardMap={keyboardMap} />
      <KeyboardLock />
    </section>
  );
}
