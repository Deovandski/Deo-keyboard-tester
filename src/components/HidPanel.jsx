import { useCallback, useEffect, useRef, useState } from 'react';
import { hasWebHid } from '../browser.js';
import {
  bytesToHex,
  flattenCollections,
  formatUptime,
  hex,
  isProtectedCollection,
  isViaCollection,
  physicalKey,
  probeVia,
  reportSummary,
  usageName,
  usagePageName,
  vendorName,
} from '../hid.js';

// Show only devices that look like keyboards (or keyboard side-channels) in Chrome's picker.
const KEYBOARD_FILTERS = [
  { usagePage: 0x01, usage: 0x06 }, // Generic Desktop / Keyboard
  { usagePage: 0x0c, usage: 0x01 }, // Consumer Control (media keys)
  { usagePage: 0xff60, usage: 0x61 }, // QMK / VIA raw HID
  { usagePage: 0x59, usage: 0x01 }, // LampArray (RGB)
];

function ReportList({ label, reports }) {
  const list = reportSummary(reports);
  if (!list.length) return null;
  return (
    <span className="reports">
      {label}{' '}
      {list.map((r) => (
        <code key={r.reportId}>
          #{r.reportId} {r.bytes} B
        </code>
      ))}
    </span>
  );
}

function HidInterface({ device, index }) {
  const [watching, setWatching] = useState(false);
  const [reports, setReports] = useState([]);
  const [via, setVia] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const listener = useRef(null);

  const rows = flattenCollections(device.collections);
  const topLevel = device.collections ?? [];
  const readable = topLevel.some((c) => !isProtectedCollection(c));
  const hasVia = rows.some(({ collection }) => isViaCollection(collection));

  useEffect(
    () => () => {
      if (listener.current) device.removeEventListener('inputreport', listener.current);
    },
    [device],
  );

  async function toggleWatch() {
    setError(null);
    try {
      if (watching) {
        device.removeEventListener('inputreport', listener.current);
        listener.current = null;
        setWatching(false);
        return;
      }
      if (!device.opened) await device.open();
      listener.current = (e) => {
        const entry = { id: performance.now(), reportId: e.reportId, bytes: bytesToHex(e.data) };
        setReports((r) => [entry, ...r].slice(0, 8));
      };
      device.addEventListener('inputreport', listener.current);
      setWatching(true);
    } catch (err) {
      setError(`Couldn't open this interface: ${err.message}`);
    }
  }

  async function askVia() {
    setError(null);
    setBusy(true);
    try {
      setVia(await probeVia(device));
    } catch (err) {
      setError(`VIA query failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="hid-iface">
      <div className="hid-iface__head">
        <strong>Interface {index + 1}</strong>
        <span className="muted">{device.opened ? 'open' : 'closed'}</span>
      </div>
      <ul className="collections">
        {rows.map(({ collection: c, depth }, i) => (
          <li key={i} style={{ '--depth': depth }}>
            <span className="collections__usage">
              {usagePageName(c.usagePage)} <code>{hex(c.usagePage)}</code> / {usageName(c.usagePage, c.usage)}{' '}
              <code>{hex(c.usage, 2)}</code>
            </span>
            {depth === 0 &&
              (isProtectedCollection(c) ? (
                <span className="badge badge--locked" title="Chrome blocks reports from this collection so pages can't log keystrokes">
                  Protected by Chrome
                </span>
              ) : (
                <span className="badge badge--open">Readable</span>
              ))}
            <span className="collections__reports">
              <ReportList label="in" reports={c.inputReports} />
              <ReportList label="out" reports={c.outputReports} />
              <ReportList label="feature" reports={c.featureReports} />
            </span>
          </li>
        ))}
      </ul>
      <div className="hid-iface__actions">
        {readable && (
          <button type="button" className="button" onClick={toggleWatch}>
            {watching ? 'Stop watching reports' : 'Watch input reports'}
          </button>
        )}
        {hasVia && (
          <button type="button" className="button" onClick={askVia} disabled={busy}>
            {busy ? 'Asking firmware…' : 'Ask the firmware (QMK/VIA)'}
          </button>
        )}
      </div>
      {watching && (
        <div className="raw-reports">
          {reports.length === 0 ? (
            <p className="note">Waiting for reports. Try media keys, the volume knob or RGB controls.</p>
          ) : (
            <ol>
              {reports.map((r) => (
                <li key={r.id}>
                  <span className="muted">#{r.reportId}</span> <code>{r.bytes || '(empty)'}</code>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      {via && (
        <dl className="facts facts--compact">
          <div>
            <dt>VIA protocol</dt>
            <dd>{hex(via.protocolVersion)}</dd>
          </div>
          {via.uptimeMs != null && (
            <div>
              <dt>Firmware uptime</dt>
              <dd>{formatUptime(via.uptimeMs)}</dd>
            </div>
          )}
          {via.layoutOptions != null && (
            <div>
              <dt>Layout options</dt>
              <dd><code>{hex(via.layoutOptions, 8)}</code></dd>
            </div>
          )}
          {via.firmwareVersion != null && (
            <div>
              <dt>VIA firmware version</dt>
              <dd><code>{hex(via.firmwareVersion, 8)}</code></dd>
            </div>
          )}
        </dl>
      )}
      {error && <p className="error">{error}</p>}
    </li>
  );
}

function HidDevice({ interfaces, onForget }) {
  const d = interfaces[0];
  const vendor = vendorName(d.vendorId);
  return (
    <article className="hid-device">
      <header>
        <h3>{d.productName || 'Unnamed HID device'}</h3>
        <button type="button" className="button button--quiet" onClick={() => onForget(d)}>
          Forget device
        </button>
      </header>
      <dl className="facts facts--compact">
        <div>
          <dt>Vendor ID</dt>
          <dd>
            <code>{hex(d.vendorId)}</code>
            {vendor && <span className="muted"> {vendor}</span>}
          </dd>
        </div>
        <div>
          <dt>Product ID</dt>
          <dd><code>{hex(d.productId)}</code></dd>
        </div>
        <div>
          <dt>HID interfaces shared</dt>
          <dd>{interfaces.length}</dd>
        </div>
      </dl>
      <ul className="hid-ifaces">
        {interfaces.map((iface, i) => (
          <HidInterface key={i} device={iface} index={i} />
        ))}
      </ul>
    </article>
  );
}

export default function HidPanel() {
  const supported = hasWebHid();
  const [devices, setDevices] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setDevices(await navigator.hid.getDevices());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (!supported) return undefined;
    refresh();
    navigator.hid.addEventListener('connect', refresh);
    navigator.hid.addEventListener('disconnect', refresh);
    return () => {
      navigator.hid.removeEventListener('connect', refresh);
      navigator.hid.removeEventListener('disconnect', refresh);
    };
  }, [supported, refresh]);

  async function pick() {
    setError(null);
    try {
      await navigator.hid.requestDevice({ filters: showAll ? [] : KEYBOARD_FILTERS });
      await refresh();
    } catch (err) {
      if (err.name !== 'NotFoundError') setError(err.message);
    }
  }

  async function forget(device) {
    try {
      await device.forget();
    } finally {
      refresh();
    }
  }

  const groups = new Map();
  for (const d of devices) {
    const k = physicalKey(d);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(d);
  }

  return (
    <section className="panel" aria-labelledby="hid-title">
      <h2 id="hid-title">
        Keyboard hardware (WebHID) <span className={`support ${supported ? 'support--yes' : 'support--no'}`}>{supported ? 'Available' : 'Not available'}</span>
      </h2>
      <p className="note">
        Chrome hides a keyboard's keystroke reports from web pages so no site can log what you type,
        but it does share the device name, USB vendor and product IDs, and how its reports are laid
        out. Many keyboards also expose extra interfaces for media keys, lighting or QMK/VIA
        configuration, and those can be read.
      </p>
      {supported ? (
        <>
          <div className="hid-actions">
            <button type="button" className="button button--primary" onClick={pick}>
              Choose a keyboard
            </button>
            <label className="toggle">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
              <span className="toggle__track" aria-hidden="true" />
              List every HID device in the picker
            </label>
          </div>
          {error && <p className="error">{error}</p>}
          {groups.size === 0 ? (
            <p className="empty">
              No device shared yet. Choose a keyboard and Chrome will ask which device this page may see.
              If yours isn't listed, turn on the option above.
            </p>
          ) : (
            [...groups.entries()].map(([k, ifaces]) => <HidDevice key={k} interfaces={ifaces} onForget={forget} />)
          )}
        </>
      ) : (
        <p className="empty">
          This browser doesn't offer WebHID. Open this page in Google Chrome 89 or newer on Windows,
          macOS, Linux or ChromeOS to see your keyboard's hardware details.
        </p>
      )}
    </section>
  );
}
