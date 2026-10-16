import { LOCATION_NAMES } from '../layouts.js';
import { displayKey } from './KeyDetails.jsx';

export default function EventLog({ events }) {
  return (
    <section className="panel" aria-labelledby="log-title">
      <h2 id="log-title">Event log</h2>
      {events.length === 0 ? (
        <p className="empty">No key events yet. The newest event appears at the top.</p>
      ) : (
        <div className="log">
          <table>
            <thead>
              <tr>
                <th scope="col">Event</th>
                <th scope="col">key</th>
                <th scope="col">code</th>
                <th scope="col">Location</th>
                <th scope="col">keyCode</th>
                <th scope="col">Held</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className={e.chatter ? 'log__row--warn' : e.repeat ? 'log__row--repeat' : ''}>
                  <td>
                    <span className={`pill pill--${e.type}`}>{e.type === 'down' ? (e.repeat ? 'repeat' : 'down') : 'up'}</span>
                  </td>
                  <td>{displayKey(e.key)}</td>
                  <td><code>{e.code}</code></td>
                  <td>{LOCATION_NAMES[e.location] ?? e.location}</td>
                  <td><code>{e.keyCode}</code></td>
                  <td>
                    {e.held != null && `${e.held} ms`}
                    {e.chatter ? `${e.chatter} ms after release` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
