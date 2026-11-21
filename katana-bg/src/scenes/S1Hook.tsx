import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT, SCENES, T} from '../config';
import {Caption, Glitch, Slash, Sparks} from '../components/ui';
import {a, BACK, EI, EIO, EO, glow, rnd} from '../utils';

export const S1Hook: React.FC = () => {
  const f = useCurrentFrame();
  const D = SCENES.hook.dur;

  // neon orb -> line
  const orbIn = a(f, 2, 12, 0, 1, BACK);
  const stretch = a(f, 10, 24, 0, 1, EIO);
  const orbOut = a(f, 26, 34, 1, 0);
  const lineW = 18 + stretch * 760;

  // "ЛЕЛЕ." reveal then sliced at 46
  const w1 = a(f, 16, 30, 0, 1, EO);
  const cut = a(f, 48, 62, 0, 1, EI);

  // second headline slam
  const s2 = a(f, 60, 72, 0, 1, EO);
  const s3 = a(f, 66, 80, 0, 1, EO);
  const shake = f >= 66 && f < 76 ? (rnd(`sh${f}`) - 0.5) * 22 * (1 - (f - 66) / 10) : 0;

  // camera: slow push + exit zoom-through
  const push = a(f, 0, D, 1, 1.12, (t) => t);
  const exit = a(f, D - 12, D, 0, 1, EI);
  const cam = push * (1 + exit * 2.5);

  return (
    <AbsoluteFill style={{opacity: 1 - exit, transform: `scale(${cam}) translateX(${shake}px)`}}>
      {/* neon orb / line */}
      <div
        style={{
          position: 'absolute',
          left: 540 - lineW / 2,
          top: 1210 - 9,
          width: lineW,
          height: 18,
          borderRadius: 9,
          background: C.lime,
          boxShadow: glow(C.lime, 1.4),
          transform: `scale(${orbIn})`,
          opacity: orbOut,
        }}
      />

      {/* ЛЕЛЕ. (sliced in two halves) */}
      {f < 64 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          {[0, 1].map((half) => (
            <div
              key={half}
              style={{
                position: 'absolute',
                fontFamily: FONT.head,
                fontWeight: 700,
                fontSize: 330,
                color: C.white,
                letterSpacing: -4,
                textShadow: `0 0 40px rgba(244,244,244,0.35)`,
                clipPath: half === 0 ? 'polygon(0 0,100% 0,100% 38%,0 62%)' : 'polygon(0 62%,100% 38%,100% 100%,0 100%)',
                transform: `translate(${(half ? 1 : -1) * cut * 120}px, ${(half ? 1 : -1) * cut * 160 + (1 - w1) * 80}px) scale(${0.9 + w1 * 0.1}) rotate(${(half ? 1 : -1) * cut * 6}deg)`,
                opacity: w1 * (1 - cut),
                filter: `blur(${(1 - w1) * 12}px)`,
              }}
            >
              {T.hook.word1}
            </div>
          ))}
        </AbsoluteFill>
      )}
      <Slash start={44} dur={10} angle={-22} cy={960} width={12} />
      <Sparks x={540} y={960} start={48} count={46} seed="h1" />

      {/* НЕ СТЕ / ГОТОВИ */}
      {f >= 58 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
          <Glitch on={f >= 60 && f < 64} seed={3}>
            <div
              style={{
                fontFamily: FONT.head,
                fontWeight: 700,
                fontSize: 220,
                lineHeight: 0.95,
                color: C.white,
                transform: `scale(${1.8 - s2 * 0.8})`,
                opacity: s2,
                filter: `blur(${(1 - s2) * 16}px)`,
              }}
            >
              {T.hook.line1}
            </div>
          </Glitch>
          <Glitch on={f >= 66 && f < 70} seed={4}>
            <div
              style={{
                fontFamily: FONT.head,
                fontWeight: 700,
                fontSize: 250,
                lineHeight: 0.95,
                color: C.lime,
                textShadow: glow(C.lime, 1.2),
                transform: `scale(${2.2 - s3 * 1.2}) skewX(-6deg)`,
                whiteSpace: 'nowrap',
                opacity: s3,
                filter: `blur(${(1 - s3) * 20}px)`,
              }}
            >
              {T.hook.line2}
            </div>
          </Glitch>
          {/* underline sweep */}
          <div
            style={{
              marginTop: 30,
              height: 6,
              width: a(f, 74, 92, 0, 760, EIO),
              background: C.lime,
              boxShadow: glow(C.lime),
            }}
          />
        </AbsoluteFill>
      )}
      <Sparks x={540} y={1060} start={68} count={30} seed="h2" angle={-90} spread={160} power={0.8} />
      <Caption text={T.hook.caption} start={60} />
    </AbsoluteFill>
  );
};
