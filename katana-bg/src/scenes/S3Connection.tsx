import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT, SCENES, T} from '../config';
import {Caption, Label, Panel, Sparks} from '../components/ui';
import {a, EI, EIO, EO, glow, LIN} from '../utils';

const NX = 190;
const NW = 700;
const NH = 190;
const NY = [560, 900, 1240];

export const S3Connection: React.FC = () => {
  const f = useCurrentFrame();
  const D = SCENES.connection.dur;
  const exit = a(f, D - 12, D, 0, 1, EI);

  // pulse travels from node 0 → 1 → 2
  const pulse = a(f, 70, 130, 0, 1, EIO);
  const pulseY = NY[0] + NH + pulse * (NY[2] - NY[0] - NH);
  const act = (i: number) => {
    const t = [64, 96, 128][i];
    return a(f, t, t + 8, 0, 1, EO);
  };

  // camera follows the pulse
  const camY = a(f, 0, D, 60, -60, LIN);
  const camS = a(f, 0, D, 1.0, 1.08, LIN) * (1 + exit * 0.6);

  const lineDraw = (i: number) => a(f, 18 + i * 22, 38 + i * 22, 0, 1, EIO);

  return (
    <AbsoluteFill style={{opacity: 1 - exit}}>
      <AbsoluteFill style={{transform: `translateY(${camY}px) scale(${camS})`}}>
        <Label start={4} style={{left: 80, top: 400}}>
          {T.connection.label}
        </Label>

        {/* connectors */}
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          {[0, 1].map((i) => {
            const y0 = NY[i] + NH;
            const y1 = NY[i + 1];
            const d = lineDraw(i);
            const lit = a(f, [64, 96][i] + 4, [64, 96][i] + 30, 0, 1);
            return (
              <g key={i}>
                <line x1={540} y1={y0} x2={540} y2={y0 + (y1 - y0) * d} stroke={lit > 0 ? C.lime : C.grey} strokeWidth={lit > 0 ? 4 : 2.5} style={{filter: lit > 0 ? `drop-shadow(0 0 8px ${C.lime})` : undefined}} />
                {/* arrow head */}
                <polygon points={`530,${y1 - 16} 550,${y1 - 16} 540,${y1 - 2}`} fill={lit > 0 ? C.lime : C.grey} opacity={d >= 1 ? 1 : 0} />
                {/* side tick marks */}
                {[0.25, 0.5, 0.75].map((t) => (
                  <line key={t} x1={530} x2={550} y1={y0 + (y1 - y0) * t} y2={y0 + (y1 - y0) * t} stroke={C.dim} strokeWidth={2} opacity={d} />
                ))}
              </g>
            );
          })}
          {/* traveling pulse */}
          {f >= 70 && f <= 136 && (
            <g>
              <circle cx={540} cy={pulseY} r={14} fill={C.lime} style={{filter: `drop-shadow(0 0 16px ${C.lime})`}} />
              <line x1={540} x2={540} y1={pulseY - 90} y2={pulseY} stroke={C.lime} strokeWidth={6} strokeLinecap="round" opacity={0.6} />
            </g>
          )}
        </svg>

        {/* packet labels beside lines */}
        {T.connection.packets.map((p, i) => {
          const y = NY[i] + NH + (NY[i + 1] - NY[i] - NH) / 2 - 22;
          const s = 40 + i * 22;
          const o = a(f, s, s + 10, 0, 1);
          const lit = a(f, [70, 100][i], [78, 108][i], 0, 1);
          return (
            <div
              key={p}
              style={{
                position: 'absolute',
                left: i % 2 ? 140 : 590,
                top: y,
                padding: '8px 14px',
                fontFamily: FONT.mono,
                fontWeight: 700,
                fontSize: 24,
                letterSpacing: 2,
                color: lit > 0.5 ? C.bg : C.lime,
                background: lit > 0.5 ? C.lime : 'transparent',
                border: `2px dashed ${C.lime}`,
                opacity: o,
                transform: `translateX(${(1 - o) * (i % 2 ? -30 : 30)}px)`,
                width: 280,
                textAlign: 'center',
              }}
            >
              {p}
            </div>
          );
        })}

        {/* nodes */}
        {T.connection.nodes.map((n, i) => {
          const s = i * 22;
          const draw = a(f, s, s + 20, 0, 1, EIO);
          const ac = act(i);
          const pulseRing = a(f, [64, 96, 128][i], [64, 96, 128][i] + 18, 0, 1);
          return (
            <React.Fragment key={n.title}>
              {pulseRing > 0 && pulseRing < 1 && (
                <div
                  style={{
                    position: 'absolute',
                    left: NX - 20 * pulseRing * 3,
                    top: NY[i] - 20 * pulseRing * 3,
                    width: NW + 40 * pulseRing * 3,
                    height: NH + 40 * pulseRing * 3,
                    border: `3px solid ${C.lime}`,
                    opacity: 1 - pulseRing,
                  }}
                />
              )}
              <Panel x={NX} y={NY[i]} w={NW} h={NH} draw={draw} active={ac} fill={ac > 0.5 ? 'rgba(200,255,0,0.08)' : 'rgba(16,24,32,0.9)'}>
                <div style={{position: 'absolute', left: 40, top: 30, fontFamily: FONT.mono, fontSize: 22, fontWeight: 700, color: C.grey, letterSpacing: 3}}>
                  {String(i + 1).padStart(2, '0')} · {n.sub}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    left: 40,
                    top: 66,
                    fontFamily: FONT.head,
                    fontWeight: 700,
                    fontSize: 84,
                    lineHeight: 1,
                    color: ac > 0.5 ? C.lime : C.white,
                    textShadow: ac > 0.5 ? glow(C.lime, 0.6) : undefined,
                  }}
                >
                  {n.title}
                </div>
                {/* status dot */}
                <div style={{position: 'absolute', right: 40, top: 40, display: 'flex', gap: 8}}>
                  {[0, 1, 2].map((k) => (
                    <div key={k} style={{width: 12, height: 12, background: ac > 0.5 && (Math.floor(f / 4) + k) % 3 === 0 ? C.lime : C.dim}} />
                  ))}
                </div>
                {i === 2 && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 40,
                      bottom: 34,
                      fontFamily: FONT.mono,
                      fontWeight: 800,
                      fontSize: 24,
                      color: C.bg,
                      background: C.lime,
                      padding: '6px 14px',
                      opacity: a(f, 134, 140, 0, 1),
                      transform: `scale(${a(f, 134, 142, 1.4, 1)})`,
                    }}
                  >
                    ✓ {T.connection.ok}
                  </div>
                )}
              </Panel>
            </React.Fragment>
          );
        })}
        <Sparks x={540} y={NY[2]} start={128} count={30} seed="c1" angle={-90} spread={200} power={0.7} />
      </AbsoluteFill>
      <Caption text={T.connection.caption} start={2} end={D} />
    </AbsoluteFill>
  );
};
