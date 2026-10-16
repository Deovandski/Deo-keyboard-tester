// Tiny Web Audio synth: every key plays a note from a major pentatonic scale,
// higher rows sing higher, so running a finger across the board plays a melody.
let ctx = null;

const PENTATONIC = [0, 2, 4, 7, 9];

export function playKeyNote(key) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const col = Math.round(key?.x ?? 0);
    const rowFromBottom = 5 - Math.round(key?.y ?? 2);
    const degree = col + rowFromBottom * 2;
    const semis = PENTATONIC[degree % 5] + 12 * Math.floor(degree / 5);
    const freq = 261.63 * 2 ** ((semis - 5) / 12); // around middle C

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch {
    // Audio is a nicety; ignore failures (e.g. autoplay policy).
  }
}
