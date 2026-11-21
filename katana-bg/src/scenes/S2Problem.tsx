import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT, SCENES, T} from '../config';
import {Caption, Glitch, Label, Slash, Sparks} from '../components/ui';
import {a, BACK, EI, EIO, EO, rnd} from '../utils';

const WX = 70;
const WY = 640;
const WW = 940;
const WH = 640;

export const S2Problem: React.FC = () => {
  const f = useCurrentFrame();
  const D = SCENES.problem.dur;
  const winIn = a(f, 0, 20, 0, 1, EO);
  const exit = a(f, D - 14, D, 0, 1, EI);
  const rotY = -14 + winIn * 8 + f * 0.04;
  const camScale = 1.02 + f * 0.0012;

  // laggy playhead (jumps in steps)
  const ph = Math.floor(f / 6) * 6;
  const playX = 230 + a(ph, 8, 90, 0, 120, (t) => t);
  const blink = Math.floor(f / 8) % 2 === 0;

  // tool chips scattered around the window
  const chipPos = [
    [60, 470, -6],
    [610, 455, 5],
    [40, 1330, 4],
    [560, 1345, -5],
    [760, 560, 9],
    [300, 1420, -3],
  ];

  return (
    <AbsoluteFill style={{transform: `scale(${camScale * (1 + exit * 0.4)})`, opacity: 1 - exit}}>
      <Label start={6} style={{left: 80, top: 380}}>
        {T.problem.label}
      </Label>

      {/* tangled connector lines from chips to window */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {chipPos.map(([x, y], i) => {
          const s = 26 + i * 6;
          const p = a(f, s, s + 16, 0, 1, EIO);
          const sx = x + 140;
          const sy = y + 30;
          const tx = WX + 160 + ((i * 137) % 600);
          const ty = y < 900 ? WY + 40 : WY + WH - 40;
          const d = `M${sx},${sy} C${sx + (i % 2 ? 200 : -200)},${(sy + ty) / 2} ${tx + (i % 2 ? -220 : 220)},${(sy + ty) / 2} ${tx},${ty}`;
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={C.grey}
              strokeWidth={2}
              strokeDasharray="8 8"
              pathLength={1}
              style={{strokeDasharray: `${p} 1`}}
              opacity={0.7}
            />
          );
        })}
      </svg>

      {/* After Effects-like window in perspective */}
      <div style={{position: 'absolute', inset: 0, perspective: 1600}}>
        <div
          style={{
            position: 'absolute',
            left: WX,
            top: WY,
            width: WW,
            height: WH,
            transform: `rotateY(${rotY}deg) rotateX(${6 - winIn * 2}deg) translateY(${(1 - winIn) * 200}px) scale(${0.85 + winIn * 0.15})`,
            opacity: winIn,
            border: `2px solid #9AA4AD`,
            borderRadius: 10,
            background: 'rgba(12,18,24,0.94)',
            boxShadow: '0 40px 120px rgba(0,0,0,0.7)',
            fontFamily: FONT.mono,
            color: C.white,
            overflow: 'hidden',
          }}
        >
          <Glitch on={f > 60 && f % 23 < 2} seed={7}>
            <div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '18px 22px', borderBottom: `1px solid ${C.dim}`, fontSize: 22, fontWeight: 700}}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{width: 12, height: 12, borderRadius: 6, background: C.grey}} />
              ))}
              <span style={{marginLeft: 10}}>{T.problem.window}</span>
              <span style={{color: C.warn, opacity: blink ? 1 : 0.35}}>{T.problem.notResponding}</span>
            </div>
          </Glitch>
          {/* layer rows */}
          <div style={{position: 'relative', padding: '10px 0'}}>
            {T.problem.layers.map((l, i) => {
              const rp = a(f, 8 + i * 3, 22 + i * 3, 0, 1, EO);
              const bs = 230 + ((i * 53) % 140);
              const bw = 160 + ((i * 97) % 360);
              return (
                <div key={i} style={{position: 'relative', height: 56, display: 'flex', alignItems: 'center', opacity: rp, transform: `translateX(${(1 - rp) * -40}px)`}}>
                  <span style={{width: 50, textAlign: 'right', fontSize: 20, color: C.grey}}>{i + 1}</span>
                  <span style={{marginLeft: 18, fontSize: 21, fontWeight: 500, width: 260, whiteSpace: 'nowrap', overflow: 'hidden'}}>{l}</span>
                  <div
                    style={{
                      position: 'absolute',
                      left: bs + 120,
                      top: 20,
                      height: 16,
                      width: bw * a(f, 14 + i * 4, 40 + i * 4, 0, 1, EIO),
                      background: 'rgba(154,170,120,0.55)',
                      borderRadius: 3,
                    }}
                  />
                  {[0, 1, 2, 3].map((k) => {
                    const kp = a(f, 30 + i * 4 + k * 3, 36 + i * 4 + k * 3, 0, 1, BACK);
                    return (
                      <div
                        key={k}
                        style={{
                          position: 'absolute',
                          left: bs + 120 + (bw / 3) * k - 7,
                          top: 21,
                          width: 14,
                          height: 14,
                          background: C.white,
                          transform: `rotate(45deg) scale(${kp})`,
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}
            {/* playhead */}
            <div style={{position: 'absolute', top: 0, bottom: 0, left: playX + 120, width: 3, background: C.lime, boxShadow: `0 0 12px ${C.lime}`}} />
          </div>
          {/* loading bar */}
          <div style={{position: 'absolute', left: 22, right: 22, bottom: 20, display: 'flex', alignItems: 'center', gap: 16, fontSize: 19, color: C.grey}}>
            <div style={{width: 18, height: 18, borderRadius: 9, border: `3px solid ${C.grey}`, borderTopColor: C.lime, transform: `rotate(${f * 18}deg)`}} />
            <span>{T.problem.loading}</span>
            <div style={{flex: 1, height: 8, border: `1px solid ${C.grey}`, borderRadius: 4}}>
              <div style={{width: `${a(f, 10, 60, 0, 23)}%`, height: '100%', background: C.lime}} />
            </div>
            <span>{Math.round(a(f, 10, 60, 0, 23))}%</span>
          </div>
        </div>
      </div>

      {/* tool chips */}
      {T.problem.tools.map((t, i) => {
        const [x, y, r] = chipPos[i];
        const s = 20 + i * 6;
        const p = a(f, s, s + 14, 0, 1, BACK);
        const float = Math.sin((f + i * 20) / 14) * 6;
        return (
          <div
            key={t}
            style={{
              position: 'absolute',
              left: x,
              top: y + float,
              padding: '12px 20px',
              border: `2px solid ${i === 3 ? C.lime : '#9AA4AD'}`,
              background: 'rgba(16,24,32,0.95)',
              fontFamily: FONT.mono,
              fontWeight: 800,
              fontSize: 26,
              color: i === 3 ? C.lime : C.white,
              letterSpacing: 1,
              transform: `rotate(${r}deg) scale(${p})`,
              opacity: p,
              whiteSpace: 'nowrap',
            }}
          >
            {t}
          </div>
        );
      })}

      {/* headline */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 1500, textAlign: 'center', fontFamily: FONT.head, fontWeight: 700, lineHeight: 1}}>
        <div style={{fontSize: 96, color: C.white, opacity: a(f, 50, 62, 0, 1), transform: `translateY(${a(f, 50, 62, 40, 0)}px)`}}>
          {T.problem.headline1}
        </div>
        <div
          style={{
            fontSize: 120,
            color: C.bg,
            display: 'inline-block',
            marginTop: 10,
            padding: '4px 24px',
            background: C.lime,
            clipPath: `inset(0 ${a(f, 58, 74, 100, 0, EIO)}% 0 0)`,
          }}
        >
          {T.problem.headline2}
        </div>
      </div>

      <Slash start={D - 22} dur={12} angle={-58} cx={540} cy={960} width={12} />
      <Sparks x={540} y={960} start={D - 16} count={50} seed="p1" />
      <Caption text={T.problem.caption} start={2} end={D} />
    </AbsoluteFill>
  );
};
