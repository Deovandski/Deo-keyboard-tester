import { displayKey } from './KeyDetails.jsx';

export default function TestSummary({ presses, maxHeld, chatter, chatterMs, onChatterMs, extras }) {
  return (
    <section className="panel" aria-labelledby="summary-title">
      <h2 id="summary-title">Health check</h2>
      <dl className="stats">
        <div>
          <dt>Key presses</dt>
          <dd>{presses}</dd>
        </div>
        <div>
          <dt>Most keys held at once</dt>
          <dd>{maxHeld}</dd>
        </div>
        <div className={chatter.length ? 'stats--warn' : ''}>
          <dt>Suspected double-presses</dt>
          <dd>{chatter.length}</dd>
        </div>
      </dl>
      <p className="note">
        Rollover: hold down as many letter keys as you can. If the count tops out at 6 (plus any
        modifiers), the board is 6-key rollover; going past that means NKRO. A double-press, or
        chatter, is a key firing again within the window below after you let go, a common sign of
        a worn or dirty switch.
      </p>
      <label className="slider">
        <span>Double-press window: {chatterMs} ms</span>
        <input
          type="range"
          min="5"
          max="100"
          step="5"
          value={chatterMs}
          onChange={(e) => onChatterMs(Number(e.target.value))}
        />
      </label>
      {chatter.length > 0 && (
        <ul className="chips chips--warn" aria-label="Keys that re-pressed suspiciously fast">
          {chatter.map((c) => (
            <li key={c.id}>
              <code>{c.code}</code> {c.gap} ms
            </li>
          ))}
        </ul>
      )}
      {extras.size > 0 && (
        <>
          <h3>Also detected outside this layout</h3>
          <ul className="chips chips--extra">
            {[...extras].map(([code, key]) => (
              <li key={code}>
                <code>{code}</code> {displayKey(key)}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
