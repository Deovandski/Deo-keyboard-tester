import { LAYOUTS, keyCount } from '../layouts.js';

function Segmented({ label, options, value, onChange }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      <span className="control-label">{label}</span>
      <div className="segmented__options">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={value === o.value}
            disabled={o.disabled}
            title={o.title}
            onClick={() => onChange(o.value)}
          >
            {o.label}
            {o.meta && <small>{o.meta}</small>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange, title }) {
  return (
    <label className="toggle" title={title}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" aria-hidden="true" />
      {label}
    </label>
  );
}

export default function Controls(props) {
  const {
    layoutId, onLayout, iso, onIso, legendMode, onLegendMode, keyboardMapReady,
    sound, onSound, capture, onCapture, onReset, onClearIgnored, ignoredCount,
  } = props;

  return (
    <div className="controls">
      <Segmented
        label="Layout"
        value={layoutId}
        onChange={onLayout}
        options={LAYOUTS.map((l) => ({ value: l.id, label: l.name, meta: keyCount(l.id, iso) }))}
      />
      <Segmented
        label="Standard"
        value={iso}
        onChange={onIso}
        options={[
          { value: false, label: 'ANSI', title: 'US-style: wide Enter, long left Shift' },
          { value: true, label: 'ISO', title: 'European-style: tall Enter, extra key beside left Shift' },
        ]}
      />
      <Segmented
        label="Legends"
        value={keyboardMapReady ? legendMode : 'printed'}
        onChange={onLegendMode}
        options={[
          { value: 'printed', label: 'US printed' },
          {
            value: 'os',
            label: 'My OS layout',
            disabled: !keyboardMapReady,
            title: keyboardMapReady
              ? 'Label keys with what they type in your current OS layout (Keyboard Map API)'
              : 'Needs the Keyboard Map API in Google Chrome',
          },
        ]}
      />
      <div className="controls__toggles">
        <Toggle label="Key notes" checked={sound} onChange={onSound} title="Play a short note for each key press" />
        <Toggle
          label="Capture keys"
          checked={capture}
          onChange={onCapture}
          title="Stop Tab, Space, arrows and F-keys from scrolling or triggering the browser"
        />
        <button type="button" className="button" onClick={onReset}>
          Reset test
        </button>
        {ignoredCount > 0 && (
          <button type="button" className="button button--quiet" onClick={onClearIgnored}>
            Show {ignoredCount} hidden {ignoredCount === 1 ? 'key' : 'keys'}
          </button>
        )}
      </div>
    </div>
  );
}
