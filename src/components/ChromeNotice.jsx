export default function ChromeNotice({ browser }) {
  const { name, version, isChrome, isChromium, mobile } = browser;
  const label = version ? `${name} ${version}` : name;

  let detail;
  if (mobile) {
    detail = `You're on ${label} on a phone or tablet. Plug in a keyboard, or open this page on a desktop for the full set of tools.`;
  } else if (isChrome) {
    detail = `You're on ${label}, so key testing, layout detection, key lock and WebHID device info are all available.`;
  } else if (isChromium) {
    detail = `You're on ${label}. Most features should work, but this tester is built against Google Chrome's APIs.`;
  } else {
    detail = `You're on ${label}. Key testing works here, but layout detection, key lock and WebHID device info need Google Chrome.`;
  }

  return (
    <aside className={`chrome-notice ${isChrome && !mobile ? 'chrome-notice--ok' : 'chrome-notice--warn'}`}>
      <span className="chrome-notice__dot" aria-hidden="true" />
      <p>
        <strong>Works best in Google Chrome on desktop.</strong> {detail}
      </p>
    </aside>
  );
}
