import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT, SCENES, T} from '../config';
import {Caption, Slash, Sparks} from '../components/ui';
import {a, BACK, EI, EIO, EO, glow, LIN, rnd} from '../utils';

const CX = 540;
const CY = 1010;
const R = 390;

export const S5Katana: React.FC = () => {
  const f = useCurrentFrame();
  const D = SCENES.katana.dur;
  const exit = a(f, D - 10, D, 0, 1, EI);

  // phase A: hero title; phase B: title shrinks into hub node
  const heroIn = a(f, 6, 18, 0, 1, EO);
  const shrink = a(f, 40, 62, 0, 1, EIO);
  const heroScale = (1.25 - heroIn * 0.25) * (1 - shrink * 0.62);
  const heroY = CY - 40 + shrink * 40;

  const rot = a(f, 0, D, -4, 4, LIN);
  const camS = a(f, 0, D, 1.06, 0.98, LIN) * (1 + exit * 2);

  const sats = T.katana.satellites.map((t, i) => {
    const ang = (-90 + i * 60) * (Math.PI / 180);
    return {t, x: CX + Math.cos(ang) * R, y: CY + Math.sin(ang) * R * 1.12, i};
  });

  const hubOn = shrink;
  const beat = (f % 20) / 20;

  return (
    <AbsoluteFill style={{opacity: 1 - exit}}>
      <AbsoluteFill style={{transform: `scale(${camS}) rotate(${rot}deg)`, transformOrigin: `${CX}px ${CY}px`}}>
        {/* radial lines + travelling pulses */}
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          {sats.map((s) => {
            const st = 54 + s.i * 5;
            const d = a(f, st, st + 16, 0, 1, EIO);
            const lx = CX + (s.x - CX) * d;
            const ly = CY + (s.y - CY) * d;
            const pt = ((f - st - 10 + s.i * 7) % 26) / 26;
            const pon = f > st + 16;
            const dirIn = s.i % 2 === 0; // alternate inbound/outbound
            const pp = dirIn ? 1 - pt : pt;
            return (
              <g key={s.t}>
                <line x1={CX} y1={CY} x2={lx} y2={ly} stroke={C.lime} strokeWidth={2.5} opacity={0.55} />
                <line x1={CX} y1={CY} x2={lx} y2={ly} stroke={C.lime} strokeWidth={8} opacity={0.12} />
                {pon && (
                  <circle
                    cx={CX + (s.x - CX) * pp}
                    cy={CY + (s.y - CY) * pp}
                    r={8}
                    fill="#F7FFD9"
                    style={{filter: `drop-shadow(0 0 10px ${C.lime})`}}
                  />
                )}
              </g>
            );
          })}
          {/* pulsing rings around hub */}
          {hubOn > 0.5 &&
            [0, 1, 2].map((k) => {
              const t = ((f + k * 14) % 42) / 42;
              return <circle key={k} cx={CX} cy={CY} r={150 + t * 260} fill="none" stroke={C.lime} strokeWidth={3 * (1 - t)} opacity={(1 - t) * 0.7} />;
            })}
          {/* orbiting particles */}
          {hubOn > 0.3 &&
            new Array(26).fill(0).map((_, i) => {
              const rr = 200 + rnd(`or${i}`) * 300;
              const sp = (0.6 + rnd(`os${i}`)) * (i % 2 ? 1 : -1);
              const ang = rnd(`oa${i}`) * Math.PI * 2 + (f * sp) / 40;
              return (
                <circle
                  key={i}
                  cx={CX + Math.cos(ang) * rr}
                  cy={CY + Math.sin(ang) * rr}
                  r={2 + rnd(`orr${i}`) * 3}
                  fill={C.lime}
                  opacity={hubOn * (0.3 + 0.7 * Math.abs(Math.sin(f / 9 + i)))}
                />
              );
            })}
        </svg>

        {/* satellites */}
        {sats.map((s) => {
          const st = 62 + s.i * 5;
          const p = a(f, st, st + 12, 0, 1, BACK);
          const lit = Math.floor((f - 60) / 10) % 6 === s.i && f > 70;
          return (
            <div
              key={s.t}
              style={{
                position: 'absolute',
                left: s.x,
                top: s.y,
                transform: `translate(-50%,-50%) scale(${p}) rotate(${-rot}deg)`,
                padding: '14px 22px',
                background: lit ? C.lime : 'rgba(16,24,32,0.96)',
                border: `2px solid ${lit ? C.lime : '#AEB7BF'}`,
                fontFamily: FONT.mono,
                fontWeight: 800,
                fontSize: 28,
                letterSpacing: 1,
                color: lit ? C.bg : C.white,
                whiteSpace: 'nowrap',
                boxShadow: lit ? glow(C.lime, 0.7) : undefined,
              }}
            >
              {s.t}
            </div>
          );
        })}

        {/* hub node background */}
        <div
          style={{
            position: 'absolute',
            left: CX - 230,
            top: CY - 95,
            width: 460,
            height: 190,
            border: `3px solid ${C.lime}`,
            background: 'rgba(8,11,13,0.95)',
            boxShadow: `${glow(C.lime, 0.8 + 0.4 * Math.sin(beat * Math.PI * 2))}`,
            opacity: hubOn,
            transform: `scale(${0.6 + hubOn * 0.4 + Math.sin(beat * Math.PI * 2) * 0.015})`,
          }}
        />

        {/* hero title (becomes hub label) */}
        <div style={{position: 'absolute', left: 0, right: 0, top: heroY, transform: `translateY(-50%) scale(${heroScale})`, textAlign: 'center'}}>
          <div style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: 36, letterSpacing: 12, color: C.white, opacity: heroIn * (1 - shrink)}}>{T.katana.thisIs}</div>
          <div style={{fontFamily: FONT.head, fontWeight: 600, fontSize: 64, color: C.lime, textShadow: glow(C.lime, 0.5), opacity: heroIn * (1 - shrink), marginTop: 8}}>
            {T.katana.brand}
          </div>
          <div
            style={{
              fontFamily: FONT.impact,
              fontWeight: 900,
              fontSize: 170,
              lineHeight: 1.05,
              color: '#F7FFD9',
              letterSpacing: -2,
              textShadow: glow(C.lime, 1.4),
              transform: `skewX(-10deg)`,
              clipPath: `inset(0 ${(1 - heroIn) * 50}% 0 ${(1 - heroIn) * 50}%)`,
            }}
          >
            {T.katana.name}
          </div>
        </div>

        <Slash start={4} dur={10} angle={-24} cy={CY} width={12} />
        <Sparks x={CX} y={CY} start={10} count={60} seed="k1" power={1.1} />
        <Sparks x={CX} y={CY} start={44} count={30} seed="k2" power={0.6} gravity={0.1} />
      </AbsoluteFill>
      <Caption text={T.katana.caption} start={30} end={D} />
    </AbsoluteFill>
  );
};
