import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT, SCENES, T} from '../config';
import {Caption, Label, Sparks} from '../components/ui';
import {a, BACK, EI, EIO, EO, glow, LIN} from '../utils';

const CARD_Y = [560, 760, 960];
const COLLAPSE = 86;

export const S8Time: React.FC = () => {
  const f = useCurrentFrame();
  const D = SCENES.time.dur;
  const exit = a(f, D - 10, D, 0, 1, EI);
  const col = a(f, COLLAPSE, COLLAPSE + 18, 0, 1, EIO);
  const maxH = 4;

  // running total
  let total = 0;
  T.time.cards.forEach((c, i) => {
    total += c.h * a(f, 14 + i * 16, 34 + i * 16, 0, 1, LIN);
  });

  const big = a(f, COLLAPSE + 10, COLLAPSE + 28, 0, 1, EO);
  const bigN = Math.round(a(f, COLLAPSE + 10, COLLAPSE + 34, 0, 9, EO));

  return (
    <AbsoluteFill style={{opacity: 1 - exit, transform: `scale(${1 + exit * 0.3})`}}>
      <Label start={4} style={{left: 80, top: 400}}>
        {T.time.label}
      </Label>
      {/* running total chip */}
      <div
        style={{
          position: 'absolute',
          right: 80,
          top: 386,
          fontFamily: FONT.mono,
          fontWeight: 800,
          fontSize: 30,
          color: C.lime,
          opacity: a(f, 8, 16, 0, 1) * (1 - col),
          display: 'flex',
          gap: 14,
          alignItems: 'center',
        }}
      >
        <span style={{color: C.grey}}>{T.time.total}</span>
        <span style={{fontSize: 52}}>
          {total.toFixed(1).replace('.', ',')}
          {T.time.unitShort}
        </span>
      </div>

      {/* cards: flip in, then collapse into a stack */}
      <div style={{position: 'absolute', inset: 0, perspective: 1500}}>
        {T.time.cards.map((c, i) => {
          const st = 8 + i * 16;
          const p = a(f, st, st + 18, 0, 1, EO);
          const cnt = a(f, st + 6, st + 26, 0, c.h, LIN);
          const fill = a(f, st + 6, st + 26, 0, c.h / maxH, EIO);
          const y = CARD_Y[i] + col * (1450 - CARD_Y[i] + i * 26);
          const sc = 1 - col * 0.3;
          return (
            <div
              key={c.t}
              style={{
                position: 'absolute',
                left: 80,
                top: y,
                width: 920,
                height: 170,
                transform: `rotateX(${(1 - p) * -80}deg) scale(${sc}) rotateZ(${col * (i - 1) * -2}deg)`,
                transformOrigin: '50% 0%',
                opacity: p * (1 - col * 0.85),
                background: 'rgba(14,20,27,0.96)',
                border: `2px solid ${cnt >= c.h ? C.lime : '#8C969F'}`,
                boxShadow: cnt >= c.h ? `0 0 22px ${C.lime}55` : undefined,
              }}
            >
              <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, background: C.lime}} />
              <div style={{position: 'absolute', left: 40, top: 22, fontFamily: FONT.mono, fontWeight: 700, fontSize: 22, color: C.grey, letterSpacing: 3}}>0{i + 1}</div>
              <div style={{position: 'absolute', left: 40, top: 52, fontFamily: FONT.head, fontWeight: 700, fontSize: 60, lineHeight: 1, color: C.white}}>{c.t}</div>
              <div style={{position: 'absolute', right: 40, top: 30, fontFamily: FONT.impact, fontWeight: 900, fontSize: 50, color: C.lime, textShadow: glow(C.lime, 0.4)}}>
                {Math.floor(cnt + 0.001)} {Math.floor(cnt + 0.001) === 1 ? T.time.unitOne : T.time.unit}
              </div>
              {/* progress bar */}
              <div style={{position: 'absolute', left: 40, right: 40, bottom: 18, height: 8, background: C.dim}}>
                <div style={{width: `${fill * 100}%`, height: '100%', background: C.lime, boxShadow: `0 0 10px ${C.lime}`}} />
              </div>
            </div>
          );
        })}
      </div>

      {/* big 9 ЧАСА */}
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', top: -160}}>
        <div style={{opacity: big, transform: `scale(${2.2 - big * 1.2})`, filter: `blur(${(1 - big) * 18}px)`, textAlign: 'center'}}>
          <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 24}}>
            <span style={{fontFamily: FONT.impact, fontWeight: 900, fontSize: 420, lineHeight: 1, color: C.lime, textShadow: glow(C.lime, 1.6)}}>{bigN}</span>
            <span style={{fontFamily: FONT.head, fontWeight: 700, fontSize: 170, color: C.white}}>{T.time.unit}</span>
          </div>
          <div
            style={{
              marginTop: 10,
              fontFamily: FONT.mono,
              fontWeight: 800,
              fontSize: 32,
              letterSpacing: 4,
              color: C.bg,
              background: C.lime,
              display: 'inline-block',
              padding: '8px 18px',
              clipPath: `inset(0 ${a(f, COLLAPSE + 30, COLLAPSE + 46, 100, 0, EIO)}% 0 0)`,
            }}
          >
            {T.time.sub}
          </div>
        </div>
      </AbsoluteFill>
      {/* clock ticks ring */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: big * 0.8}}>
        {new Array(60).fill(0).map((_, i) => {
          const ang = (i / 60) * Math.PI * 2 - Math.PI / 2;
          const lit = i / 60 <= a(f, COLLAPSE + 10, COLLAPSE + 40, 0, 0.75, EO);
          const r0 = 410;
          const r1 = i % 5 === 0 ? 450 : 432;
          return (
            <line
              key={i}
              x1={540 + Math.cos(ang) * r0}
              y1={800 + Math.sin(ang) * r0}
              x2={540 + Math.cos(ang) * r1}
              y2={800 + Math.sin(ang) * r1}
              stroke={lit ? C.lime : C.dim}
              strokeWidth={i % 5 === 0 ? 5 : 3}
            />
          );
        })}
      </svg>
      <Sparks x={540} y={800} start={COLLAPSE + 14} count={50} seed="t9" power={1.2} gravity={0.2} />
      <Caption text={T.time.caption} start={2} end={D} />
    </AbsoluteFill>
  );
};
