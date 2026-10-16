// Helpers for the WebHID API.
// Chrome docs: https://developer.chrome.com/docs/capabilities/hid

export const hex = (n, len = 4) => `0x${n.toString(16).toUpperCase().padStart(len, '0')}`;

// HID Usage Tables 1.5 (subset relevant to keyboards).
const USAGE_PAGES = {
  0x01: 'Generic Desktop',
  0x06: 'Generic Device Controls',
  0x07: 'Keyboard/Keypad',
  0x08: 'LED',
  0x09: 'Button',
  0x0c: 'Consumer',
  0x0d: 'Digitizer',
  0x0f: 'Physical Input Device',
  0x14: 'Auxiliary Display',
  0x59: 'Lighting and Illumination',
  0xf1d0: 'FIDO Alliance',
};

const GENERIC_DESKTOP_USAGES = {
  0x01: 'Pointer', 0x02: 'Mouse', 0x04: 'Joystick', 0x05: 'Gamepad',
  0x06: 'Keyboard', 0x07: 'Keypad', 0x08: 'Multi-axis Controller',
  0x80: 'System Control', 0x0e: 'System Multi-Axis Controller',
};

export function usagePageName(page) {
  if (USAGE_PAGES[page]) return USAGE_PAGES[page];
  if (page >= 0xff00) return 'Vendor-defined';
  return 'Unknown page';
}

export function usageName(page, usage) {
  if (page === 0x01) return GENERIC_DESKTOP_USAGES[usage] ?? 'Generic Desktop usage';
  if (page === 0x0c && usage === 0x01) return 'Consumer Control (media keys)';
  if (page === 0x59 && usage === 0x01) return 'LampArray (RGB lighting)';
  if (page === 0xff60 && usage === 0x61) return 'QMK / VIA raw HID';
  if (page >= 0xff00) return 'Vendor-specific';
  return `Usage ${hex(usage, 2)}`;
}

/**
 * Chrome refuses to send or receive reports for "protected" top-level
 * collections so a web page can't act as a keylogger. Keyboards, mice and
 * system controls fall in this group (see hid_report_utils.cc in Chromium).
 */
export function isProtectedCollection(c) {
  if (c.usagePage === 0xf1d0) return true;
  if (c.usagePage === 0x01) {
    return [0x01, 0x02, 0x06, 0x07].includes(c.usage) || (c.usage >= 0x80 && c.usage <= 0x83);
  }
  return false;
}

export const isViaCollection = (c) => c.usagePage === 0xff60 && c.usage === 0x61;

// A small, best-effort table of USB vendor IDs common on keyboards.
const VENDORS = {
  0x03f0: 'HP', 0x045e: 'Microsoft', 0x046a: 'Cherry', 0x046d: 'Logitech',
  0x04d9: 'Holtek (used by many brands)', 0x05ac: 'Apple', 0x0951: 'Kingston / HyperX',
  0x0b05: 'ASUS', 0x0c45: 'Microdia (used by many brands)', 0x1038: 'SteelSeries',
  0x1209: 'pid.codes (open hardware)', 0x16c0: 'Van Ooijen / V-USB', 0x17ef: 'Lenovo',
  0x1b1c: 'Corsair', 0x1e7d: 'ROCCAT', 0x24f0: 'Das Keyboard', 0x2516: 'Cooler Master',
  0x258a: 'Sino Wealth (used by many brands)', 0x31e3: 'Wooting', 0x320f: 'Glorious',
  0x3434: 'Keychron', 0x413c: 'Dell', 0x1532: 'Razer', 0xfeed: 'QMK default ID',
};

export const vendorName = (vid) => VENDORS[vid] ?? null;

/** Flatten a collection tree into [{ collection, depth }]. */
export function flattenCollections(collections, depth = 0, out = []) {
  for (const c of collections ?? []) {
    out.push({ collection: c, depth });
    flattenCollections(c.children, depth + 1, out);
  }
  return out;
}

export function reportSummary(reports) {
  return (reports ?? []).map((r) => {
    const bits = (r.items ?? []).reduce((sum, it) => sum + (it.reportSize ?? 0) * (it.reportCount ?? 0), 0);
    return { reportId: r.reportId, bytes: Math.ceil(bits / 8), items: r.items?.length ?? 0 };
  });
}

/** Stable key for grouping several HID interfaces of one physical device. */
export const physicalKey = (d) => `${d.vendorId}:${d.productId}:${d.productName}`;

export const bytesToHex = (dataView) =>
  Array.from(new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ');

// ---- QMK / VIA raw HID probe ----------------------------------------------
// VIA talks to QMK firmware over a vendor collection (usage page 0xFF60,
// usage 0x61) using fixed 32-byte reports. These read-only commands come from
// quantum/via.h in QMK.
const VIA_GET_PROTOCOL_VERSION = 0x01;
const VIA_GET_KEYBOARD_VALUE = 0x02;
const VIA_UPTIME = 0x01;
const VIA_LAYOUT_OPTIONS = 0x02;
const VIA_FIRMWARE_VERSION = 0x04;

function viaRequest(device, bytes, timeoutMs = 1200) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      device.removeEventListener('inputreport', onReport);
      reject(new Error('No reply from the keyboard'));
    }, timeoutMs);
    function onReport(e) {
      const data = new Uint8Array(e.data.buffer, e.data.byteOffset, e.data.byteLength);
      if (data[0] !== bytes[0] && data[0] !== 0xff) return;
      clearTimeout(timer);
      device.removeEventListener('inputreport', onReport);
      resolve(data);
    }
    device.addEventListener('inputreport', onReport);
    const payload = new Uint8Array(32);
    payload.set(bytes);
    device.sendReport(0, payload).catch((err) => {
      clearTimeout(timer);
      device.removeEventListener('inputreport', onReport);
      reject(err);
    });
  });
}

const u32 = (d, i) => ((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0;

export async function probeVia(device) {
  if (!device.opened) await device.open();
  const v = await viaRequest(device, [VIA_GET_PROTOCOL_VERSION]);
  if (v[0] === 0xff) throw new Error('The firmware answered but does not speak the VIA protocol');
  const result = { protocolVersion: (v[1] << 8) | v[2] };
  try {
    const up = await viaRequest(device, [VIA_GET_KEYBOARD_VALUE, VIA_UPTIME]);
    if (up[0] !== 0xff) result.uptimeMs = u32(up, 2);
    const lo = await viaRequest(device, [VIA_GET_KEYBOARD_VALUE, VIA_LAYOUT_OPTIONS]);
    if (lo[0] !== 0xff) result.layoutOptions = u32(lo, 2);
    const fw = await viaRequest(device, [VIA_GET_KEYBOARD_VALUE, VIA_FIRMWARE_VERSION]);
    if (fw[0] !== 0xff) result.firmwareVersion = u32(fw, 2);
  } catch {
    // Older firmware may not answer the optional queries; keep what we have.
  }
  return result;
}

export function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h} h ${m} min` : m ? `${m} min ${s % 60} s` : `${s} s`;
}
