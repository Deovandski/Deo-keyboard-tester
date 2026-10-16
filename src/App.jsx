import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { buildLayout, legendFor, UNTESTABLE } from './layouts.js';
import { useKeyTester } from './useKeyTester.js';
import { detectBrowser, isMac, useKeyboardMap } from './browser.js';
import ChromeNotice from './components/ChromeNotice.jsx';
import Controls from './components/Controls.jsx';
import Keyboard from './components/Keyboard.jsx';
import KeystrokeRoll from './components/KeystrokeRoll.jsx';
import KeyDetails from './components/KeyDetails.jsx';
import TestSummary from './components/TestSummary.jsx';
import EventLog from './components/EventLog.jsx';
import BrowserPanel from './components/BrowserPanel.jsx';
import HidPanel from './components/HidPanel.jsx';

function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(`deo-kbt:${key}`);
      return raw != null ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(`deo-kbt:${key}`, JSON.stringify(value));
    } catch {
      // Storage can be unavailable (private mode, blocked site data); settings just won't persist.
    }
  }, [key, value]);
  return [value, setValue];
}

const prefersDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export default function App() {
  const [layoutId, setLayoutId] = usePersistentState('layout', 'full');
  const [iso, setIso] = usePersistentState('iso', false);
  const [legendMode, setLegendMode] = usePersistentState('legends', 'printed');
  const [sound, setSound] = usePersistentState('sound', false);
  const [capture, setCapture] = usePersistentState('capture', true);
  const [chatterMs, setChatterMs] = usePersistentState('chatterMs', 30);
  const [theme, setTheme] = usePersistentState('theme', prefersDark() ? 'dark' : 'light');
  const [ignoredList, setIgnoredList] = usePersistentState(`ignored`, []);

  const browser = useMemo(detectBrowser, []);
  const mac = useMemo(isMac, []);
  const keyboardMap = useKeyboardMap();

  // Layout effect so the theme attribute is set before children read CSS colors.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const layout = useMemo(() => {
    const l = buildLayout(layoutId, iso);
    return { ...l, keyByCode: new Map(l.keys.map((k) => [k.code, k])) };
  }, [layoutId, iso]);

  const tester = useKeyTester({ layout, capture, chatterMs, sound });
  const ignored = useMemo(() => new Set(ignoredList), [ignoredList]);

  const toggleIgnored = useCallback(
    (code) =>
      setIgnoredList((list) => (list.includes(code) ? list.filter((c) => c !== code) : [...list, code])),
    [setIgnoredList],
  );

  const useOsLegends = legendMode === 'os' && keyboardMap.status === 'ready';
  const legendForCode = useCallback(
    (code) => {
      if (useOsLegends) {
        const ch = keyboardMap.map.get(code);
        if (ch) return [ch.length === 1 ? ch.toUpperCase() : ch];
      }
      return legendFor(code, { mac });
    },
    [useOsLegends, keyboardMap.map, mac],
  );

  const testable = layout.keys.filter((k) => !UNTESTABLE.has(k.code) && !ignored.has(k.code));
  const testedCount = testable.filter((k) => tester.tested.has(k.code)).length;

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead__title">
          <h1>Deo Keyboard Tester</h1>
          <p>Pick your layout, then press every key until the whole board glows teal.</p>
        </div>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
          {theme === 'dark' ? 'Light stage' : 'Dark stage'}
        </button>
      </header>

      <ChromeNotice browser={browser} />

      <main>
        <section className="tester" aria-label="Keyboard tester">
          <Controls
            layoutId={layoutId}
            onLayout={setLayoutId}
            iso={iso}
            onIso={setIso}
            legendMode={legendMode}
            onLegendMode={setLegendMode}
            keyboardMapReady={keyboardMap.status === 'ready'}
            sound={sound}
            onSound={setSound}
            capture={capture}
            onCapture={setCapture}
            onReset={tester.reset}
            onClearIgnored={() => setIgnoredList([])}
            ignoredCount={ignored.size}
          />

          <div className="progress" role="status" aria-live="polite">
            <div className="progress__text">
              <strong>{testedCount}</strong> of {testable.length} keys confirmed
              {testedCount === testable.length && testable.length > 0 && (
                <span className="progress__done"> Every key works.</span>
              )}
            </div>
            <div className="progress__bar" aria-hidden="true">
              <div style={{ width: `${(testedCount / Math.max(1, testable.length)) * 100}%` }} />
            </div>
          </div>

          <KeystrokeRoll notesRef={tester.notes} lanes={Math.ceil(layout.height)} theme={theme} />

          <Keyboard
            layout={layout}
            tested={tester.tested}
            held={tester.held}
            ignored={ignored}
            onToggleIgnored={toggleIgnored}
            legendFor={legendForCode}
          />
          <p className="tester__hint">
            Click a key on screen to mark it as missing from your keyboard. Fn keys are handled
            inside the keyboard itself, so no browser can see them.
            {capture && ' Capture is on: Tab, Space and F-keys are held for testing instead of moving around the page.'}
          </p>
        </section>

        <div className="columns">
          <div className="column">
            <KeyDetails last={tester.last} locks={tester.locks} />
            <TestSummary
              presses={tester.presses}
              maxHeld={tester.maxHeld}
              chatter={tester.chatter}
              chatterMs={chatterMs}
              onChatterMs={setChatterMs}
              extras={tester.extras}
            />
            <EventLog events={tester.events} />
          </div>
          <div className="column">
            <BrowserPanel browser={browser} keyboardMap={keyboardMap} />
            <HidPanel />
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>
          Built with React. Browser features follow the{' '}
          <a href="https://developer.chrome.com/docs/capabilities" target="_blank" rel="noreferrer">
            Chrome capabilities documentation
          </a>
          . Nothing you type leaves this page.
        </p>
      </footer>
    </div>
  );
}
