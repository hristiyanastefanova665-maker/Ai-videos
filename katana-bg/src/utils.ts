import {Easing, interpolate, random} from 'remotion';

export const EO = Easing.bezier(0.16, 1, 0.3, 1); // expo out
export const EIO = Easing.bezier(0.76, 0, 0.24, 1); // strong in-out
export const EI = Easing.bezier(0.7, 0, 0.84, 0); // expo in
export const BACK = Easing.bezier(0.34, 1.56, 0.64, 1); // overshoot
export const LIN = (t: number) => t;

/** Clamped interpolation from frame range [i0,i1] to value range [o0,o1]. */
export const a = (f: number, i0: number, i1: number, o0: number, o1: number, e: (t: number) => number = EO) =>
  interpolate(f, [i0, i1], [o0, o1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: e,
  });

export const rnd = (seed: string | number) => random(seed);

export const glow = (c: string, s = 1) =>
  `0 0 ${8 * s}px ${c}, 0 0 ${24 * s}px ${c}99, 0 0 ${60 * s}px ${c}55`;

/** Splits "word [highlight] word" into tokens. */
export const parseCaption = (s: string) =>
  s.split(' ').map((w) => {
    const hl = w.startsWith('[');
    const clean = w.replace(/[[\]]/g, '');
    return {w: clean, hl};
  });
