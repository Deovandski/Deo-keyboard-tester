import { useEffect, useRef } from 'react';

const WINDOW_MS = 6000;

/**
 * A piano-roll strip, like a vocal synth editor: each key press is a note,
 * its lane is the keyboard row, its length is how long the key was held.
 */
export default function KeystrokeRoll({ notesRef, lanes, theme }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const color = (name) => css.getPropertyValue(name).trim();
    const colors = {
      laneA: color('--roll-lane-a'),
      laneB: color('--roll-lane-b'),
      grid: color('--roll-grid'),
      note: color('--teal'),
      held: color('--pink'),
      extra: color('--violet'),
      text: color('--roll-text'),
      chatter: color('--warn'),
    };
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let lastDraw = 0;

    const draw = (now) => {
      raf = requestAnimationFrame(draw);
      if (reduceMotion && now - lastDraw < 250) return; // a calmer refresh rate
      lastDraw = now;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const laneH = h / lanes;
      for (let i = 0; i < lanes; i++) {
        ctx.fillStyle = i % 2 ? colors.laneB : colors.laneA;
        ctx.fillRect(0, i * laneH, w, laneH);
      }

      // Second markers scroll with time, like bar lines.
      const pxPerMs = w / WINDOW_MS;
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      const firstSecond = Math.ceil((now - WINDOW_MS) / 1000) * 1000;
      for (let t = firstSecond; t <= now; t += 1000) {
        const x = Math.round(w - (now - t) * pxPerMs) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      ctx.font = `600 ${Math.max(10, Math.min(13, laneH * 0.55))}px "M PLUS Rounded 1c", system-ui, sans-serif`;
      ctx.textBaseline = 'middle';
      const notes = notesRef.current;
      for (const n of notes) {
        const end = n.end ?? now;
        if (end < now - WINDOW_MS) continue;
        const x0 = w - (now - n.start) * pxPerMs;
        const x1 = Math.max(x0 + 6, w - (now - end) * pxPerMs);
        const y = Math.min(n.lane, lanes - 1) * laneH + 2;
        const nh = laneH - 4;
        ctx.fillStyle = n.end == null ? colors.held : n.extra ? colors.extra : n.chatter ? colors.chatter : colors.note;
        ctx.beginPath();
        ctx.roundRect(x0, y, x1 - x0, nh, Math.min(6, nh / 2));
        ctx.fill();
        if (x1 - x0 > 18) {
          ctx.fillStyle = colors.text;
          ctx.save();
          ctx.beginPath();
          ctx.rect(x0, y, x1 - x0, nh);
          ctx.clip();
          ctx.fillText(n.label, x0 + 5, y + nh / 2 + 1);
          ctx.restore();
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [notesRef, lanes, theme]);

  return (
    <figure className="roll">
      <canvas ref={canvasRef} className="roll__canvas" aria-hidden="true" />
      <figcaption>
        Keystroke roll: each press is a note on its keyboard row, stretched for as long as you hold
        it. Pink is held now, amber is a suspected double-press, violet is a key outside your
        chosen layout.
      </figcaption>
    </figure>
  );
}
