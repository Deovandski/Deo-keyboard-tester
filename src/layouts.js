// Physical keyboard layouts, described in key units (1u = one standard key).
// Every key is identified by its KeyboardEvent.code, which names the *physical*
// position of a key regardless of the OS language layout.
// https://developer.mozilla.org/docs/Web/API/UI_Events/Keyboard_event_code_values

// Printed legends for a US ANSI board. [main, shifted]
const LEGENDS = {
  Escape: ['Esc'],
  Backquote: ['`', '~'],
  Digit1: ['1', '!'], Digit2: ['2', '@'], Digit3: ['3', '#'], Digit4: ['4', '$'],
  Digit5: ['5', '%'], Digit6: ['6', '^'], Digit7: ['7', '&'], Digit8: ['8', '*'],
  Digit9: ['9', '('], Digit0: ['0', ')'],
  Minus: ['-', '_'], Equal: ['=', '+'],
  Backspace: ['Backspace'], Tab: ['Tab'], CapsLock: ['Caps Lock'], Enter: ['Enter'],
  BracketLeft: ['[', '{'], BracketRight: [']', '}'], Backslash: ['\\', '|'],
  Semicolon: [';', ':'], Quote: ["'", '"'], Comma: [',', '<'], Period: ['.', '>'],
  Slash: ['/', '?'], IntlBackslash: ['\\', '|'],
  ShiftLeft: ['Shift'], ShiftRight: ['Shift'],
  ControlLeft: ['Ctrl'], ControlRight: ['Ctrl'],
  AltLeft: ['Alt'], AltRight: ['Alt'],
  MetaLeft: ['Win'], MetaRight: ['Win'],
  ContextMenu: ['Menu'], Space: [''], Fn: ['Fn'],
  PrintScreen: ['PrtSc'], ScrollLock: ['ScrLk'], Pause: ['Pause'],
  Insert: ['Ins'], Home: ['Home'], PageUp: ['PgUp'],
  Delete: ['Del'], End: ['End'], PageDown: ['PgDn'],
  ArrowUp: ['↑'], ArrowDown: ['↓'], ArrowLeft: ['←'], ArrowRight: ['→'],
  NumLock: ['Num'], NumpadDivide: ['/'], NumpadMultiply: ['*'], NumpadSubtract: ['-'],
  NumpadAdd: ['+'], NumpadEnter: ['Enter'], NumpadDecimal: ['.'],
};
for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') LEGENDS[`Key${c}`] = [c];
for (let i = 0; i <= 9; i++) LEGENDS[`Numpad${i}`] = [String(i)];
for (let i = 1; i <= 24; i++) LEGENDS[`F${i}`] = [`F${i}`];

const MAC_LEGENDS = {
  MetaLeft: ['⌘'], MetaRight: ['⌘'], AltLeft: ['⌥'], AltRight: ['⌥'],
  ControlLeft: ['⌃'], ControlRight: ['⌃'],
};

export function legendFor(code, { mac = false } = {}) {
  return (mac && MAC_LEGENDS[code]) || LEGENDS[code] || [code];
}

// Keys the browser can never see (handled inside the keyboard firmware).
export const UNTESTABLE = new Set(['Fn']);

/** Build one row. Items are [code, width?, height?, extra?] or a number (gap in u). */
function row(y, x0, items) {
  const keys = [];
  let x = x0;
  for (const item of items) {
    if (typeof item === 'number') {
      x += item;
      continue;
    }
    const [code, w = 1, h = 1, extra = {}] = item;
    keys.push({ code, x, y, w, h, ...extra });
    x += w;
  }
  return keys;
}

const letters = (s) => [...s].map((c) => [`Key${c}`]);
const digits = [...'1234567890'].map((d) => [`Digit${d}`]);

/**
 * The 15u-wide alphanumeric block shared by every layout.
 * @param {number} y0 y of the number row
 * @param {object} o  iso: ISO variant, firstKey: Backquote or Escape,
 *                    rightShift: width of right shift, bottom: bottom-row variant
 */
function mainBlock(y0, { iso, firstKey = 'Backquote', rightShift = 2.75, bottom = 'full' }) {
  const keys = [];
  keys.push(...row(y0, 0, [[firstKey], ...digits, ['Minus'], ['Equal'], ['Backspace', 2]]));

  if (iso) {
    keys.push(
      ...row(y0 + 1, 0, [['Tab', 1.5], ...letters('QWERTYUIOP'), ['BracketLeft'], ['BracketRight']]),
      { code: 'Enter', x: 13.5, y: y0 + 1, w: 1.5, h: 2, shape: 'iso-enter' },
      ...row(y0 + 2, 0, [['CapsLock', 1.75], ...letters('ASDFGHJKL'), ['Semicolon'], ['Quote'], ['Backslash']]),
      ...row(y0 + 3, 0, [
        ['ShiftLeft', 1.25], ['IntlBackslash'], ...letters('ZXCVBNM'),
        ['Comma'], ['Period'], ['Slash'], ['ShiftRight', rightShift],
      ]),
    );
  } else {
    keys.push(
      ...row(y0 + 1, 0, [['Tab', 1.5], ...letters('QWERTYUIOP'), ['BracketLeft'], ['BracketRight'], ['Backslash', 1.5]]),
      ...row(y0 + 2, 0, [['CapsLock', 1.75], ...letters('ASDFGHJKL'), ['Semicolon'], ['Quote'], ['Enter', 2.25]]),
      ...row(y0 + 3, 0, [
        ['ShiftLeft', 2.25], ...letters('ZXCVBNM'),
        ['Comma'], ['Period'], ['Slash'], ['ShiftRight', rightShift],
      ]),
    );
  }

  const mods = [['ControlLeft', 1.25], ['MetaLeft', 1.25], ['AltLeft', 1.25], ['Space', 6.25]];
  const bottoms = {
    full: [...mods, ['AltRight', 1.25], ['MetaRight', 1.25], ['ContextMenu', 1.25], ['ControlRight', 1.25]],
    compact: [...mods, ['AltRight'], ['Fn'], ['ControlRight']],
    sixty: [...mods, ['AltRight', 1.25], ['Fn', 1.25], ['ContextMenu', 1.25], ['ControlRight', 1.25]],
  };
  keys.push(...row(y0 + 4, 0, bottoms[bottom]));
  return keys;
}

function functionRow(y, gaps) {
  const g = gaps ? 0.5 : 0;
  return row(y, 0, [
    ['Escape'], gaps ? 1 : 0,
    ['F1'], ['F2'], ['F3'], ['F4'], g,
    ['F5'], ['F6'], ['F7'], ['F8'], g,
    ['F9'], ['F10'], ['F11'], ['F12'],
  ]);
}

function fullOrTkl(iso, withNumpad) {
  const y0 = 1.25;
  const keys = [
    ...functionRow(0, true),
    ...row(0, 15.25, [['PrintScreen'], ['ScrollLock'], ['Pause']]),
    ...mainBlock(y0, { iso }),
    ...row(y0, 15.25, [['Insert'], ['Home'], ['PageUp']]),
    ...row(y0 + 1, 15.25, [['Delete'], ['End'], ['PageDown']]),
    ...row(y0 + 3, 16.25, [['ArrowUp']]),
    ...row(y0 + 4, 15.25, [['ArrowLeft'], ['ArrowDown'], ['ArrowRight']]),
  ];
  if (withNumpad) {
    const nx = 18.5;
    keys.push(
      ...row(y0, nx, [['NumLock'], ['NumpadDivide'], ['NumpadMultiply'], ['NumpadSubtract']]),
      ...row(y0 + 1, nx, [['Numpad7'], ['Numpad8'], ['Numpad9'], ['NumpadAdd', 1, 2]]),
      ...row(y0 + 2, nx, [['Numpad4'], ['Numpad5'], ['Numpad6']]),
      ...row(y0 + 3, nx, [['Numpad1'], ['Numpad2'], ['Numpad3'], ['NumpadEnter', 1, 2]]),
      ...row(y0 + 4, nx, [['Numpad0', 2], ['NumpadDecimal']]),
    );
  }
  return keys;
}

function seventyFive(iso) {
  return [
    ...functionRow(0, false),
    ...row(0, 13, [['PrintScreen'], ['Insert'], ['Delete']]),
    ...mainBlock(1, { iso, rightShift: 1.75, bottom: 'compact' }),
    ...row(1, 15, [['Home']]),
    ...row(2, 15, [['PageUp']]),
    ...row(3, 15, [['PageDown']]),
    ...row(4, 14, [['ArrowUp'], ['End']]),
    ...row(5, 13, [['ArrowLeft'], ['ArrowDown'], ['ArrowRight']]),
  ];
}

function sixtyFive(iso) {
  return [
    ...mainBlock(0, { iso, firstKey: 'Escape', rightShift: 1.75, bottom: 'compact' }),
    ...row(0, 15, [['Delete']]),
    ...row(1, 15, [['PageUp']]),
    ...row(2, 15, [['PageDown']]),
    ...row(3, 14, [['ArrowUp'], ['End']]),
    ...row(4, 13, [['ArrowLeft'], ['ArrowDown'], ['ArrowRight']]),
  ];
}

function sixty(iso) {
  return mainBlock(0, { iso, firstKey: 'Escape', bottom: 'sixty' });
}

export const LAYOUTS = [
  { id: 'full', name: 'Full-size', build: (iso) => fullOrTkl(iso, true) },
  { id: 'tkl', name: 'Tenkeyless', build: (iso) => fullOrTkl(iso, false) },
  { id: '75', name: '75%', build: seventyFive },
  { id: '65', name: '65%', build: sixtyFive },
  { id: '60', name: '60%', build: sixty },
];

/** Returns { keys, width, height, codes } for a layout id and ANSI/ISO choice. */
export function buildLayout(id, iso) {
  const def = LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
  const keys = def.build(iso);
  const width = Math.max(...keys.map((k) => k.x + k.w));
  const height = Math.max(...keys.map((k) => k.y + k.h));
  const codes = new Set(keys.map((k) => k.code));
  return { ...def, keys, width, height, codes };
}

/** Physical key count, as printed on the box (e.g. 104 / 105). */
export function keyCount(id, iso) {
  return buildLayout(id, iso).keys.length;
}

export const LOCATION_NAMES = ['Standard', 'Left', 'Right', 'Numpad'];
