// src/hooks/usePointerLight.js
// One global pointer listener. While the cursor is over a card (.spotlight, .command-cell, .node-body, .glass)
// it writes the cursor position into --mouse-x / --mouse-y, which the CSS turns into a soft gold glow.
// Skipped entirely when the visitor prefers reduced motion.

import { useEffect } from 'react';

const SELECTOR = '.spotlight, .command-cell, .node-body, .glass';

export default function usePointerLight() {
  useEffect(() => {
    if (typeof window === 'undefined' || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return undefined;

    let frame = 0;
    let pending = null;

    const apply = () => {
      frame = 0;
      if (!pending) return;
      const { el, x, y } = pending;
      const box = el.getBoundingClientRect();
      el.style.setProperty('--mouse-x', `${x - box.left}px`);
      el.style.setProperty('--mouse-y', `${y - box.top}px`);
    };

    const onMove = (e) => {
      const el = e.target instanceof Element ? e.target.closest(SELECTOR) : null;
      if (!el) return;
      pending = { el, x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(apply);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}
