# Deo-keyboard-tester
Just a simple React.js website I span up to learn more about Claude and refresh my React.js skills

## What it does

A keyboard tester in the Miku colour palette (teal, silver, charcoal, pink):

- **Pick a layout**: Full-size, Tenkeyless, 75%, 65% or 60%, in ANSI or ISO.
- **Press every key**: keys glow pink while held and turn teal once confirmed. A progress bar counts what's left. Click a key on screen to hide it if your board doesn't have it.
- **Keystroke roll**: a piano-roll strip that draws each press as a note on its keyboard row, stretched for as long as the key is held.
- **Health check**: total presses, most keys held at once (6KRO vs NKRO), and double-press (chatter) detection with an adjustable window.
- **Last key and event log**: `key`, `code`, `location`, legacy `keyCode`, hold time, modifiers, and Caps/Num/Scroll Lock state.
- **What the browser can tell** (works best in Google Chrome):
  - [Keyboard Map API](https://developer.mozilla.org/docs/Web/API/Keyboard/getLayoutMap): detects your OS layout (QWERTY, AZERTY, QWERTZ, Dvorak, Colemak) and can relabel the on-screen keys.
  - [Keyboard Lock API](https://developer.chrome.com/docs/capabilities/web-apis/keyboard-lock): fullscreen mode that captures Esc, the Windows key and other system keys so they can be tested.
  - [WebHID](https://developer.chrome.com/docs/capabilities/hid): device name, USB vendor/product IDs, HID collections and report sizes; live input reports from non-protected interfaces (media keys, RGB, vendor); and a read-only QMK/VIA query for protocol version and firmware uptime.
  - [User-Agent Client Hints](https://developer.chrome.com/docs/privacy-security/user-agent-client-hints): browser version, OS version and architecture.

Chrome intentionally blocks pages from reading a keyboard's keystroke reports over WebHID (so no site can keylog you); the panel marks those collections as "Protected by Chrome".

## Run it

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm run preview  # serve the build
```

WebHID and the Keyboard Map API need a secure context, so use `localhost` or HTTPS.

## Stack

React 19 and Vite 8 with `@vitejs/plugin-react`. No other runtime dependencies.

```
src/
  App.jsx                 page layout and persisted settings
  layouts.js              physical layouts in key units, keyed by KeyboardEvent.code
  useKeyTester.js         keydown/keyup handling, hold times, chatter, rollover
  browser.js              browser detection, Keyboard Map hook, feature checks
  hid.js                  HID usage names, vendor table, VIA probe
  audio.js                optional per-key notes (Web Audio)
  components/             Keyboard, KeystrokeRoll, KeyDetails, TestSummary,
                          EventLog, BrowserPanel, HidPanel, ChromeNotice, Controls
```
