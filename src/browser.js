import { useEffect, useState } from 'react';

// ---- Browser detection ------------------------------------------------------
// Uses User-Agent Client Hints where available (Chromium browsers):
// https://developer.chrome.com/docs/privacy-security/user-agent-client-hints
export function detectBrowser() {
  const uad = navigator.userAgentData;
  if (uad?.brands?.length) {
    const find = (name) => uad.brands.find((b) => b.brand === name);
    const chrome = find('Google Chrome');
    const edge = find('Microsoft Edge');
    const opera = find('Opera');
    const chromium = find('Chromium');
    const pick = chrome ?? edge ?? opera ?? chromium;
    return {
      name: pick?.brand ?? 'Chromium-based browser',
      version: pick?.version ?? '',
      isChrome: !!chrome,
      isChromium: true,
      platform: uad.platform,
      mobile: uad.mobile,
    };
  }
  const ua = navigator.userAgent;
  const firefox = ua.match(/Firefox\/(\d+)/);
  if (firefox) return { name: 'Firefox', version: firefox[1], isChrome: false, isChromium: false, platform: navigator.platform };
  const safari = ua.match(/Version\/(\d+).*Safari/);
  if (safari) return { name: 'Safari', version: safari[1], isChrome: false, isChromium: false, platform: navigator.platform };
  return { name: 'Unknown browser', version: '', isChrome: false, isChromium: false, platform: navigator.platform };
}

export function isMac() {
  const p = navigator.userAgentData?.platform ?? navigator.platform ?? '';
  return /mac/i.test(p);
}

export function useHighEntropyHints() {
  const [hints, setHints] = useState(null);
  useEffect(() => {
    const uad = navigator.userAgentData;
    if (!uad?.getHighEntropyValues) return;
    let alive = true;
    uad
      .getHighEntropyValues(['architecture', 'bitness', 'platformVersion', 'fullVersionList', 'model'])
      .then((h) => alive && setHints(h))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return hints;
}

/** Windows reports platformVersion 13+ for Windows 11. */
export function describePlatform(platform, platformVersion) {
  if (!platform) return 'Unknown';
  if (platform === 'Windows' && platformVersion) {
    const major = parseInt(platformVersion, 10);
    if (major >= 13) return 'Windows 11';
    if (major > 0) return 'Windows 10';
  }
  return platformVersion ? `${platform} ${platformVersion}` : platform;
}

// ---- Keyboard Map API ---------------------------------------------------------
// navigator.keyboard.getLayoutMap() returns what each physical key types in the
// user's current OS layout. Only works in a top-level browsing context.
// https://developer.mozilla.org/docs/Web/API/Keyboard/getLayoutMap
export const hasKeyboardMap = () => typeof navigator !== 'undefined' && !!navigator.keyboard?.getLayoutMap;
export const hasKeyboardLock = () => typeof navigator !== 'undefined' && !!navigator.keyboard?.lock;
export const hasWebHid = () => typeof navigator !== 'undefined' && 'hid' in navigator;

export function useKeyboardMap() {
  const [state, setState] = useState(() =>
    hasKeyboardMap() ? { status: 'loading', map: null } : { status: 'unsupported', map: null },
  );

  useEffect(() => {
    if (!hasKeyboardMap()) return;
    let alive = true;
    const load = () =>
      navigator.keyboard
        .getLayoutMap()
        .then((m) => alive && setState({ status: 'ready', map: new Map(m) }))
        .catch((err) => alive && setState({ status: 'error', map: null, error: err.message }));
    load();
    // The user may switch OS layouts while the tab is in the background.
    window.addEventListener('focus', load);
    return () => {
      alive = false;
      window.removeEventListener('focus', load);
    };
  }, []);

  return state;
}

export function guessLayoutName(map) {
  if (!map || map.size === 0) return null;
  const g = (code) => map.get(code);
  const q = g('KeyQ'), w = g('KeyW'), e = g('KeyE'), r = g('KeyR'), y = g('KeyY'), z = g('KeyZ');
  if (q === 'a' && w === 'z') return 'AZERTY';
  if (q === 'q' && y === 'z' && z === 'y') return 'QWERTZ';
  if (q === "'" && w === ',') return 'Dvorak';
  if (q === 'q' && e === 'f' && r === 'p') return 'Colemak';
  if (q === 'q' && w === 'w' && y === 'y') return 'QWERTY';
  return 'Non-Latin or custom layout';
}
