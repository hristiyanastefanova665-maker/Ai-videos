import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT, SCENES, T} from '../config';
import {Caption, Glitch} from '../components/ui';
import {a, BACK, EI, EIO, EO, glow, LIN} from '../utils';

const B1 = 0; // ТОВА  (3D frame)
const B2 = 34; // ДВИЖЕНИЕ (horizontal glide)
const B3 = 70; // РАЗТЯГАНЕ. (lime flash)
const B4 = 108; // ТАЗИ КАМЕРА.

export const S6Result: React.FC = () => {
  const f = useCurrentFrame();
  const D = SCENES.result.dur;

  return (
    <AbsoluteFill>
      {/* ── beat 1: word inside a tilted 3D frame ── */}
      {f < B2 && (
        <AbsoluteFill style={{perspective: 1400, justifyContent: 'center', alignItems: 'center'}}>
          {(() => {
            const p = a(f, B1, B1 + 16, 0, 1, EO);
            const ry = a(f, B1, B2, 38, -16, EIO);
            const z = a(f, B2 - 8, B2, 0, 700, EI);
            return (
              <div
                style={{
                  width: 820,
                  height: 520,
                  border: `5px solid ${C.lime}`,
                  boxShadow: `${glow(C.lime, 0.7)}, inset 0 0 40px ${C.lime}44`,
                  background: 'rgba(16,24,32,0.85)',
                  transform: `translateZ(${z}px) rotateY(${ry}deg) rotateX(${8 - p * 8}deg) scale(${0.6 + p * 0.4})`,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: p,
                }}
              >
                <div style={{fontFamily: FONT.head, fontWeight: 700, fontSize: 300, color: C.white, filter: `blur(${(1 - a(f, 4, 16, 0, 1)) * 14}px)`, transform: `scale(${a(f, 4, 30, 1.3, 1)})`}}>
                  {T.result.w1}
                </div>
                {/* inner frame */}
                <div style={{position: 'absolute', inset: 26, border: `2px solid ${C.lime}66`}} />
              </div>
            );
          })()}
        </AbsoluteFill>
      )}

      {/* ── beat 2: oversized word gliding past with parallax panels ── */}
      {f >= B2 && f < B3 && (
        <AbsoluteFill style={{justifyContent: 'center'}}>
          {[0, 1, 2, 3].map((k) => {
            const px = a(f, B2, B3, 1200 - k * 120, -700 - k * 300, LIN);
            return (
              <div
                key={k}
                style={{
                  position: 'absolute',
                  left: px + k * 260,
                  top: 560 + (k % 2) * 620,
                  width: 260,
                  height: 180,
                  border: `2px solid ${k % 2 ? C.grey : C.lime}`,
                  opacity: 0.5,
                  transform: `rotate(${k % 2 ? 4 : -3}deg)`,
                }}
              />
            );
          })}
          <div
            style={{
              position: 'absolute',
              top: 800,
              left: a(f, B2, B3, 900, -1240, EIO),
              fontFamily: FONT.head,
              fontWeight: 700,
              fontSize: 360,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              color: C.white,
              textShadow: '0 0 30px rgba(244,244,244,0.3)',
            }}
          >
            {T.result.w2}
          </div>
          {/* speed lines */}
          {new Array(8).fill(0).map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: 500 + i * 120,
                left: ((f * (40 + i * 9) + i * 300) % 1800) - 400,
                width: 180 + i * 30,
                height: 3,
                background: i % 3 === 0 ? C.lime : '#3a4650',
              }}
            />
          ))}
        </AbsoluteFill>
      )}

      {/* ── beat 3: bright neon background, stretched type ── */}
      {f >= B3 && f < B4 && (
        <AbsoluteFill
          style={{
            background: C.lime,
            justifyContent: 'center',
            alignItems: 'center',
            clipPath: `circle(${a(f, B3, B3 + 10, 0, 160, EO)}% at 50% 50%)`,
          }}
        >
          <AbsoluteFill style={{backgroundImage: 'radial-gradient(circle, rgba(8,11,13,0.18) 2.2px, transparent 2.8px)', backgroundSize: '48px 48px'}} />
          <div
            style={{
              fontFamily: FONT.head,
              fontWeight: 700,
              fontSize: 196,
              lineHeight: 1,
              color: C.bg,
              whiteSpace: 'nowrap',
              transform: `scaleX(${a(f, B3 + 2, B3 + 22, 0.25, 1, BACK)}) scaleY(${a(f, B3 + 2, B3 + 22, 2.2, 1, EO)})`,
              letterSpacing: a(f, B3 + 10, B4, -6, 4, LIN),
            }}
          >
            {T.result.w3}
          </div>
          <div style={{position: 'absolute', top: 1140, fontFamily: FONT.mono, fontWeight: 800, fontSize: 28, letterSpacing: 6, color: C.bg, opacity: a(f, B3 + 14, B3 + 22, 0, 1)}}>
            ◀ ───── ▶
          </div>
        </AbsoluteFill>
      )}

      {/* ── beat 4: camera brackets zoom ── */}
      {f >= B4 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', transform: `scale(${a(f, B4, D, 1.25, 1, EO) * (1 + a(f, D - 8, D, 0, 0.5, EI))})`, opacity: a(f, D - 8, D, 1, 0)}}>
          {/* viewfinder brackets */}
          {[
            [0, 0],
            [1, 0],
            [0, 1],
            [1, 1],
          ].map(([x, y], i) => {
            const spread = a(f, B4, B4 + 14, 0, 1, EO);
            const W = 380 * spread + 120;
            const H = 300 * spread + 120;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: 540 + (x ? W : -W) - (x ? 70 : 0),
                  top: 960 + (y ? H : -H) - (y ? 70 : 0),
                  width: 70,
                  height: 70,
                  borderColor: C.lime,
                  borderStyle: 'solid',
                  borderWidth: 0,
                  [x ? 'borderRightWidth' : 'borderLeftWidth']: 6,
                  [y ? 'borderBottomWidth' : 'borderTopWidth']: 6,
                  boxShadow: undefined,
                  filter: `drop-shadow(0 0 8px ${C.lime})`,
                }}
              />
            );
          })}
          <Glitch on={f >= B4 + 2 && f < B4 + 6} seed={21}>
            <div style={{textAlign: 'center', fontFamily: FONT.head, fontWeight: 700, lineHeight: 0.95}}>
              <div style={{fontSize: 170, color: C.white, opacity: a(f, B4, B4 + 8, 0, 1)}}>{T.result.w4a}</div>
              <div style={{fontSize: 230, color: C.lime, textShadow: glow(C.lime, 1), opacity: a(f, B4 + 4, B4 + 12, 0, 1), transform: `translateY(${a(f, B4 + 4, B4 + 16, 60, 0)}px)`}}>
                {T.result.w4b}
              </div>
            </div>
          </Glitch>
          {/* focus crosshair */}
          <div style={{position: 'absolute', left: 530, top: 1280, width: 20, height: 20, border: `3px solid ${C.lime}`, borderRadius: 10, opacity: Math.floor(f / 5) % 2}} />
        </AbsoluteFill>
      )}

      {/* white flash on beat cuts */}
      <AbsoluteFill
        style={{
          background: '#fff',
          opacity: Math.max(a(f, B2, B2 + 4, 0.22, 0, LIN) * (f >= B2 ? 1 : 0), a(f, B4, B4 + 5, 0.3, 0, LIN) * (f >= B4 ? 1 : 0)),
          pointerEvents: 'none',
        }}
      />
      {f < B3 || f >= B4 ? <Caption text={T.result.caption} start={4} end={D} /> : null}
    </AbsoluteFill>
  );
};
