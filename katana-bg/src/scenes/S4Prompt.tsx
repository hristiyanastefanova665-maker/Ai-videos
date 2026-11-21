import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT, SCENES, T} from '../config';
import {Caption, Glitch} from '../components/ui';
import {a, BACK, EI, EIO, EO, glow, LIN} from '../utils';

const TYPE_START = 26;
const TYPE_END = 170;

// morphing shape: circle -> triangle -> hexagon (sampled polygons)
const shapePts = (kind: number, n = 36, r = 70) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 - Math.PI / 2;
    if (kind === 0) {
      pts.push([Math.cos(t) * r, Math.sin(t) * r]);
    } else {
      const sides = kind === 1 ? 3 : 6;
      const seg = (Math.PI * 2) / sides;
      const k = Math.floor((t + Math.PI / 2) / seg);
      const a0 = k * seg - Math.PI / 2;
      const a1 = a0 + seg;
      const u = (t + Math.PI / 2 - k * seg) / seg;
      const p0 = [Math.cos(a0) * r, Math.sin(a0) * r];
      const p1 = [Math.cos(a1) * r, Math.sin(a1) * r];
      pts.push([p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u]);
    }
  }
  return pts;
};
const SH = [shapePts(0), shapePts(1), shapePts(2)];

export const S4Prompt: React.FC = () => {
  const f = useCurrentFrame();
  const D = SCENES.prompt.dur;
  const text = T.prompt.text;
  const n = Math.floor(a(f, TYPE_START, TYPE_END, 0, text.length, LIN));

  // which characters are inside highlight ranges
  const hlMask = new Array(text.length).fill(false);
  for (const h of T.prompt.highlights) {
    const i = text.indexOf(h);
    if (i >= 0) for (let k = i; k < i + h.length; k++) hlMask[k] = true;
  }

  const winIn = a(f, 6, 26, 0, 1, EO);
  const press = a(f, 176, 182, 0, 1, EO);
  const exit = a(f, D - 14, D, 0, 1, EI);
  const camS = (1 + a(f, 0, 170, 0, 0.05, LIN)) * (1 + exit * 1.8);
  const camR = a(f, 0, 170, -1.2, 0.8, LIN);

  // morph
  const mt = (f / 40) % 3;
  const k0 = Math.floor(mt);
  const u = EIO(Math.min(1, (mt - k0) * 1.6));
  const A = SH[k0];
  const B = SH[(k0 + 1) % 3];
  const poly = A.map((p, i) => `${p[0] + (B[i][0] - p[0]) * u},${p[1] + (B[i][1] - p[1]) * u}`).join(' ');

  const cursorOn = Math.floor(f / 8) % 2 === 0;

  return (
    <AbsoluteFill style={{opacity: 1 - exit}}>
      <AbsoluteFill style={{transform: `scale(${camS}) rotate(${camR}deg)`, transformOrigin: '50% 48%'}}>
        {/* title */}
        <Glitch on={f >= 8 && f < 13} seed={11} style={{position: 'absolute', left: 80, top: 370}}>
          <div style={{fontFamily: FONT.head, fontWeight: 700, fontSize: 140, lineHeight: 1, color: C.white, opacity: a(f, 4, 14, 0, 1)}}>{T.prompt.title}</div>
        </Glitch>

        {/* timeline ruler 0:00 → 0:15 */}
        <div style={{position: 'absolute', left: 80, right: 80, top: 560, height: 60, opacity: a(f, 10, 20, 0, 1)}}>
          <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: FONT.mono, fontWeight: 700, fontSize: 22, color: C.grey}}>
            <span>00:00</span>
            <span style={{color: C.lime}}>00:15</span>
          </div>
          <div style={{position: 'relative', marginTop: 8, height: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
            {new Array(46).fill(0).map((_, i) => (
              <div key={i} style={{width: 2, height: i % 3 === 0 ? 18 : 9, background: '#4B5761'}} />
            ))}
            <div style={{position: 'absolute', left: `${(n / text.length) * 100}%`, top: -6, width: 4, height: 32, background: C.lime, boxShadow: `0 0 10px ${C.lime}`}} />
          </div>
        </div>

        {/* prompt window */}
        <div
          style={{
            position: 'absolute',
            left: 60,
            top: 660,
            width: 960,
            height: 640,
            transform: `scale(${0.92 + winIn * 0.08}) translateY(${(1 - winIn) * 60}px)`,
            opacity: winIn,
          }}
        >
          <svg width={960} height={640} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
            <polygon
              points="0,0 960,0 960,600 920,640 0,640"
              fill="rgba(12,18,24,0.92)"
              stroke={press > 0 ? C.lime : '#C9D1D8'}
              strokeWidth={3}
              style={{filter: press > 0 ? `drop-shadow(0 0 ${16 * press}px ${C.lime})` : 'drop-shadow(0 0 6px rgba(244,244,244,0.25))'}}
            />
            <line x1={0} x2={960} y1={70} y2={70} stroke={C.dim} strokeWidth={2} />
          </svg>
          <div style={{position: 'absolute', left: 30, top: 22, display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT.mono, fontWeight: 800, fontSize: 22, letterSpacing: 2, color: C.white}}>
            <div style={{width: 12, height: 12, background: C.lime, boxShadow: `0 0 8px ${C.lime}`}} />
            {T.prompt.header}
          </div>
          <div style={{position: 'absolute', right: 30, top: 24, fontFamily: FONT.mono, fontWeight: 700, fontSize: 22, color: C.grey}}>
            {n} / 2000 {T.prompt.chars}
          </div>

          {/* typed text — untyped chars are hidden but keep layout stable */}
          <div style={{position: 'absolute', left: 36, right: 36, top: 104, fontFamily: FONT.mono, fontWeight: 700, fontSize: 44, lineHeight: 1.62, color: C.white}}>
            {text.split('').map((ch, i) => {
              const typed = i < n;
              const hl = hlMask[i] && typed;
              const isCur = i === n;
              return (
                <span
                  key={i}
                  style={{
                    visibility: typed ? 'visible' : 'hidden',
                    background: hl ? C.lime : 'transparent',
                    color: hl ? C.bg : C.white,
                    boxShadow: hl ? `0 0 18px ${C.lime}66` : undefined,
                    position: 'relative',
                  }}
                >
                  {isCur && cursorOn && (
                    <span style={{position: 'absolute', left: 0, top: 6, width: 24, height: 54, background: C.lime, visibility: 'visible', boxShadow: `0 0 12px ${C.lime}`}} />
                  )}
                  {ch}
                </span>
              );
            })}
            {n >= text.length && cursorOn && <span style={{display: 'inline-block', width: 24, height: 50, background: C.lime, verticalAlign: 'middle'}} />}
          </div>

          {/* status + generate button */}
          <div style={{position: 'absolute', left: 36, bottom: 32, display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT.mono, fontWeight: 700, fontSize: 22, color: C.grey}}>
            <div style={{width: 12, height: 12, borderRadius: 6, background: C.lime, opacity: cursorOn ? 1 : 0.3}} />
            {T.prompt.status}
            {'.'.repeat(1 + (Math.floor(f / 6) % 3))}
          </div>
          <div
            style={{
              position: 'absolute',
              right: 64,
              bottom: 26,
              padding: '12px 24px',
              border: `2px solid ${C.lime}`,
              fontFamily: FONT.mono,
              fontWeight: 800,
              fontSize: 26,
              letterSpacing: 2,
              color: press > 0.5 ? C.bg : C.lime,
              background: press > 0.5 ? C.lime : 'transparent',
              transform: `scale(${1 - a(f, 174, 178, 0, 0.1) + a(f, 178, 186, 0, 0.1, BACK)})`,
              boxShadow: press > 0.5 ? glow(C.lime, 0.8) : undefined,
              opacity: a(f, 150, 160, 0.35, 1),
            }}
          >
            {T.prompt.button} ›
          </div>
        </div>

        {/* kinetic decor: "Аа" weight morph + morphing shape */}
        <div
          style={{
            position: 'absolute',
            left: 90,
            top: 1390,
            fontFamily: FONT.head,
            fontWeight: 700,
            fontSize: 170,
            lineHeight: 1,
            color: C.white,
            transform: `scaleX(${1 + Math.sin(f / 10) * 0.25}) skewX(${Math.sin(f / 13) * 10}deg)`,
            transformOrigin: 'left',
            opacity: a(f, 40, 52, 0, 1),
          }}
        >
          Аа
        </div>
        <svg width={260} height={260} style={{position: 'absolute', left: 720, top: 1370, opacity: a(f, 48, 60, 0, 1), overflow: 'visible'}}>
          <g transform={`translate(130,130) rotate(${f * 2})`}>
            <polygon points={poly} fill="none" stroke={C.lime} strokeWidth={5} style={{filter: `drop-shadow(0 0 10px ${C.lime})`}} />
          </g>
        </svg>
        {/* chips */}
        <div style={{position: 'absolute', left: 80, right: 80, top: 1640, display: 'flex', gap: 18, justifyContent: 'center'}}>
          {['15 СЕК', '1080 × 1920', '30 FPS', '3D'].map((c, i) => {
            const p = a(f, 100 + i * 8, 112 + i * 8, 0, 1, BACK);
            return (
              <div key={c} style={{padding: '10px 18px', border: `2px solid ${C.grey}`, fontFamily: FONT.mono, fontWeight: 700, fontSize: 24, color: C.white, transform: `scale(${p})`, opacity: p}}>
                {c}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      {/* generate flash */}
      <AbsoluteFill style={{background: C.lime, opacity: a(f, 180, 184, 0, 0.5) * a(f, 184, 196, 1, 0), mixBlendMode: 'screen'}} />
      <Caption text={T.prompt.caption} start={2} end={D} />
    </AbsoluteFill>
  );
};
