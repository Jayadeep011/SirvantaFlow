// src/components/marketing/SpringNumber.jsx
// A number that rolls to its new value with spring physics (stiffness 100, damping 15).
// Respects "reduce motion" by jumping straight to the value. Screen readers hear only the final value,
// so live regions are not flooded with every frame of the animation.

import React, { useEffect, useState } from 'react';
import { useReducedMotion, useSpring } from 'framer-motion';
import { usd } from '../../finance';

export default function SpringNumber({ value, format = usd, className = '' }) {
  const target = Number.isFinite(value) ? value : 0;
  const reduce = useReducedMotion();
  const spring = useSpring(target, { stiffness: 100, damping: 15 });
  const [shown, setShown] = useState(target);

  useEffect(() => {
    if (reduce) {
      setShown(target);
      return undefined;
    }
    const unsubscribe = spring.on('change', (v) => setShown(v));
    spring.set(target);
    return unsubscribe;
  }, [target, spring, reduce]);

  return (
    <span className={`num ${className}`}>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(target)}</span>
    </span>
  );
}
