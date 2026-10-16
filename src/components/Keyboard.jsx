import { memo, useLayoutEffect, useRef, useState } from 'react';
import { UNTESTABLE } from '../layouts.js';

const MIN_UNIT = 30;
const MAX_UNIT = 58;
const CASE_PADDING_U = 0.5; // case border around the keys, in units

function useUnit(ref, widthU) {
  const [unit, setUnit] = useState(48);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => {
      const available = el.clientWidth;
      const u = Math.floor(available / (widthU + CASE_PADDING_U * 2));
      setUnit(Math.max(MIN_UNIT, Math.min(MAX_UNIT, u)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, widthU]);
  return unit;
}

const Key = memo(function Key({ k, unit, status, legend, onToggle }) {
  const [main, shifted] = legend;
  const long = main.length > 3;
  const untestable = UNTESTABLE.has(k.code);
  const style = {
    left: k.x * unit,
    top: k.y * unit,
    width: k.w * unit,
    height: k.h * unit,
  };
  const statusText = {
    held: 'pressed now',
    tested: 'works',
    ignored: 'marked as missing',
    idle: 'not pressed yet',
    untestable: 'not visible to browsers',
  }[status];

  return (
    <button
      type="button"
      className={`key key--${status}${k.shape ? ` key--${k.shape}` : ''}${long ? ' key--long' : ''}`}
      style={style}
      disabled={untestable}
      aria-label={`${k.code}, ${statusText}`}
      title={untestable ? 'Fn is handled inside the keyboard; browsers never receive it' : `${k.code}: click to ${status === 'ignored' ? 'restore' : 'hide'} this key`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onToggle(k.code)}
    >
      <span className="key__cap">
        {shifted && <span className="key__shift">{shifted}</span>}
        <span className="key__main">{main}</span>
      </span>
    </button>
  );
});

export default function Keyboard({ layout, tested, held, ignored, onToggleIgnored, legendFor }) {
  const wrapRef = useRef(null);
  const unit = useUnit(wrapRef, layout.width);
  const pad = unit * CASE_PADDING_U;

  return (
    <div className="keyboard-wrap" ref={wrapRef}>
      <div
        className="keyboard"
        style={{
          width: layout.width * unit + pad * 2,
          height: layout.height * unit + pad * 2,
          padding: pad,
          '--u': `${unit}px`,
        }}
      >
        <div className="keyboard__plate" style={{ width: layout.width * unit, height: layout.height * unit }}>
          {layout.keys.map((k) => {
            let status = 'idle';
            if (UNTESTABLE.has(k.code)) status = 'untestable';
            else if (held.has(k.code)) status = 'held';
            else if (tested.has(k.code)) status = 'tested';
            else if (ignored.has(k.code)) status = 'ignored';
            return (
              <Key
                key={`${k.code}-${k.x}-${k.y}`}
                k={k}
                unit={unit}
                status={status}
                legend={legendFor(k.code)}
                onToggle={onToggleIgnored}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
