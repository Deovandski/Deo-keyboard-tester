import { useCallback, useEffect, useReducer, useRef } from 'react';
import { playKeyNote } from './audio.js';

const MAX_EVENTS = 150;

const initialState = {
  tested: new Set(),
  held: new Set(),
  events: [],
  presses: 0,
  maxHeld: 0,
  chatter: [],
  extras: new Map(), // code -> key, for keys outside the selected layout
  last: null,
  locks: { CapsLock: false, NumLock: false, ScrollLock: false },
};

function reducer(state, action) {
  switch (action.type) {
    case 'down':
    case 'up': {
      const { ev, inLayout } = action;
      const isDown = action.type === 'down';
      const tested = state.tested.has(ev.code) ? state.tested : new Set(state.tested).add(ev.code);
      const held = new Set(state.held);
      if (isDown) held.add(ev.code);
      else held.delete(ev.code);
      let extras = state.extras;
      if (!inLayout && !extras.has(ev.code)) {
        extras = new Map(extras).set(ev.code, ev.key);
      }
      return {
        ...state,
        tested,
        held,
        extras,
        events: [ev, ...state.events].slice(0, MAX_EVENTS),
        presses: state.presses + (isDown && !ev.repeat ? 1 : 0),
        maxHeld: Math.max(state.maxHeld, held.size),
        chatter: ev.chatter ? [{ code: ev.code, gap: ev.chatter, id: ev.id }, ...state.chatter].slice(0, 20) : state.chatter,
        last: ev,
        locks: ev.locks,
      };
    }
    case 'blur':
      return state.held.size ? { ...state, held: new Set() } : state;
    case 'reset':
      return { ...initialState, locks: state.locks };
    default:
      return state;
  }
}

function isTypingTarget(el) {
  if (!el || !(el instanceof Element)) return false;
  if (el.closest('textarea, select, [contenteditable="true"]')) return true;
  const input = el.closest('input');
  return !!input && !['checkbox', 'radio', 'range', 'button'].includes(input.type);
}

// Shortcuts we never swallow, so the page can still be reloaded, zoomed and inspected.
function isBrowserShortcut(e) {
  if (e.key === 'F12') return true;
  if (!(e.ctrlKey || e.metaKey)) return false;
  const k = e.key.toLowerCase();
  if (['r', '+', '-', '=', '0'].includes(k)) return true;
  return e.shiftKey && ['i', 'j', 'c'].includes(k);
}

/**
 * Listens to keydown/keyup on the window and turns them into tester state.
 * Timing-sensitive data (held start times, last release) lives in refs so the
 * reducer stays pure.
 */
export function useKeyTester({ layout, capture, chatterMs, sound }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const heldAt = useRef(new Map());
  const lastUp = useRef(new Map());
  const notes = useRef([]); // read by the keystroke roll canvas
  const nextId = useRef(1);
  const opts = useRef({});
  opts.current = { layout, capture, chatterMs, sound };

  useEffect(() => {
    const snapshot = (e, extra) => ({
      id: nextId.current++,
      type: e.type === 'keydown' ? 'down' : 'up',
      key: e.key,
      code: e.code || 'Unidentified',
      location: e.location,
      keyCode: e.keyCode,
      repeat: e.repeat,
      mods: {
        Shift: e.shiftKey, Control: e.ctrlKey, Alt: e.altKey, Meta: e.metaKey,
        AltGraph: e.getModifierState('AltGraph'),
      },
      locks: {
        CapsLock: e.getModifierState('CapsLock'),
        NumLock: e.getModifierState('NumLock'),
        ScrollLock: e.getModifierState('ScrollLock'),
      },
      isComposing: e.isComposing,
      t: e.timeStamp,
      ...extra,
    });

    function onDown(e) {
      if (isTypingTarget(e.target)) return;
      const o = opts.current;
      if (o.capture && !isBrowserShortcut(e)) e.preventDefault();
      const code = e.code || 'Unidentified';
      const key = o.layout.keyByCode.get(code);
      const inLayout = !!key;
      if (e.repeat) {
        dispatch({ type: 'down', ev: snapshot(e), inLayout });
        return;
      }
      const t = e.timeStamp;
      const prevUp = lastUp.current.get(code);
      const gap = prevUp != null ? t - prevUp : null;
      const chatter = gap != null && gap < o.chatterMs ? Math.max(0.1, Math.round(gap * 10) / 10) : 0;
      heldAt.current.set(code, t);
      notes.current.push({
        code,
        label: e.key === ' ' ? 'Space' : e.key,
        lane: key ? Math.floor(key.y) : 0,
        start: performance.now(),
        end: null,
        extra: !inLayout,
        chatter: !!chatter,
      });
      if (notes.current.length > 200) notes.current.splice(0, notes.current.length - 200);
      if (o.sound) playKeyNote(key);
      dispatch({ type: 'down', ev: snapshot(e, { chatter }), inLayout });
    }

    function onUp(e) {
      if (isTypingTarget(e.target)) return;
      const o = opts.current;
      if (o.capture && !isBrowserShortcut(e)) e.preventDefault();
      const code = e.code || 'Unidentified';
      const t = e.timeStamp;
      const start = heldAt.current.get(code);
      heldAt.current.delete(code);
      lastUp.current.set(code, t);
      for (let i = notes.current.length - 1; i >= 0; i--) {
        const n = notes.current[i];
        if (n.code === code && n.end == null) {
          n.end = performance.now();
          break;
        }
      }
      const held = start != null ? Math.round((t - start) * 10) / 10 : null;
      dispatch({ type: 'up', ev: snapshot(e, { held }), inLayout: o.layout.keyByCode.has(code) });
    }

    // If the window loses focus mid-press the keyup never arrives; release everything.
    function onBlur() {
      heldAt.current.clear();
      const now = performance.now();
      for (const n of notes.current) if (n.end == null) n.end = now;
      dispatch({ type: 'blur' });
    }

    window.addEventListener('keydown', onDown, true);
    window.addEventListener('keyup', onUp, true);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown, true);
      window.removeEventListener('keyup', onUp, true);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const reset = useCallback(() => {
    heldAt.current.clear();
    lastUp.current.clear();
    notes.current = [];
    dispatch({ type: 'reset' });
  }, []);

  return { ...state, notes, reset };
}
