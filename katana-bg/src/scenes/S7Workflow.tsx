import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT, SCENES, T} from '../config';
import {Panel} from '../components/ui';
import {a, BACK, EI, EIO, EO, glow, LIN} from '../utils';

// 2×2 snake layout: 01 → 02 ↓ 03 ← 04 ... rendered as Z: TL, TR, BL, BR? use TL→TR→BR→BL loop
const PW = 400;
const PH = 360;
const POS = [
  [90, 640],
  [590, 640],
  [590, 1130],
  [90, 1130],
];
const FROM = [
  [-700, -300, -40],
  [900, -400, 30],
  [800, 600, -25],
  [-800, 500, 35],
];

const Mini: React.FC<{i: number; f: number; on: number}> = ({i, f, on}) => {
  // small motion visual unique to each step
  if (i === 0) {
    const r = 26 + Math.sin(f / 5) * 6;
    return (
      <svg width={200} height={140}>
        <circle cx={100} cy={70} r={r} fill={C.lime} opacity={0.9 * on} style={{filter: `drop-shadow(0 0 14px ${C.lime})`}} />
        <circle cx={100} cy={70} r={r + 22 + ((f * 2) % 30)} fill="none" stroke={C.lime} strokeWidth={2} opacity={on * (1 - ((f * 2) % 30) / 30)} />
      </svg>
    );
  }
  if (i === 1) {
    const n = Math.floor(a(f, 30, 60, 0, 14, LIN));
    return (
      <div style={{width: 280, height: 140, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14}}>
        {[1, 0.7, 0.85].map((w, k) => (
          <div key={k} style={{height: 12, width: `${Math.min(1, Math.max(0, (n - k * 4) / 6)) * w * 100}%`, background: k === 1 ? C.lime : C.grey}} />
        ))}
      </div>
    );
  }
  if (i === 2) {
    return (
      <svg width={280} height={140}>
        <line x1={10} x2={270} y1={70} y2={70} stroke={C.dim} strokeWidth={3} />
        {[0, 1, 2, 3, 4].map((k) => {
          const p = a(f, 40 + k * 4, 48 + k * 4, 0, 1, BACK);
          return <rect key={k} x={30 + k * 55 - 10} y={60} width={20} height={20} fill={k % 2 ? C.white : C.lime} transform={`rotate(45 ${30 + k * 55} 70) scale(1)`} opacity={p} />;
        })}
        <path d={`M10,110 C80,${110 - 80 * on} 180,${30 + 80 * (1 - on)} 270,30`} fill="none" stroke={C.lime} strokeWidth={3} />
      </svg>
    );
  }
  const pr = a(f, 50, 90, 0, 1, EIO);
  return (
    <div style={{width: 280, height: 140, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12}}>
      <div style={{height: 22, border: `2px solid ${C.grey}`}}>
        <div style={{width: `${pr * 100}%`, height: '100%', background: C.lime, boxShadow: `0 0 12px ${C.lime}`}} />
      </div>
      <div style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: 26, color: C.lime}}>{Math.round(pr * 100)}%</div>
    </div>
  );
};

export const S7Workflow: React.FC = () => {
  const f = useCurrentFrame();
  const D = SCENES.workflow.dur;
  const exit = a(f, D - 8, D, 0, 1, EI);
  const camS = a(f, 0, D, 1.08, 1, EO);

  const t1 = a(f, 0, 10, 0, 1, EO);
  const t2 = a(f, 6, 18, 0, 1, EIO);

  // connector loop path through panel centers
  const ctr = POS.map(([x, y]) => [x + PW / 2, y + PH / 2]);
  const draw = a(f, 34, 70, 0, 1, EIO);

  return (
    <AbsoluteFill style={{transform: `scale(${camS})`, opacity: 1 - exit}}>
      {/* title */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center', fontFamily: FONT.head, fontWeight: 700, lineHeight: 1}}>
        <span style={{fontSize: 150, color: C.white, display: 'inline-block', transform: `translateY(${(1 - t1) * 60}px)`, opacity: t1}}>{T.workflow.title1} </span>
        <span
          style={{
            fontSize: 150,
            color: C.bg,
            background: C.lime,
            padding: '0 20px',
            display: 'inline-block',
            clipPath: `inset(0 ${(1 - t2) * 100}% 0 0)`,
            boxShadow: glow(C.lime, 0.6),
          }}
        >
          {T.workflow.title2}
        </span>
      </div>

      {/* connector */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {[0, 1, 2].map((k) => {
          const [x0, y0] = ctr[k];
          const [x1, y1] = ctr[k + 1];
          const seg = a(draw, k / 3, (k + 1) / 3, 0, 1, LIN);
          return (
            <line
              key={k}
              x1={x0}
              y1={y0}
              x2={x0 + (x1 - x0) * seg}
              y2={y0 + (y1 - y0) * seg}
              stroke={C.lime}
              strokeWidth={5}
              style={{filter: `drop-shadow(0 0 10px ${C.lime})`}}
            />
          );
        })}
      </svg>

      {T.workflow.steps.map((s, i) => {
        const st = 8 + i * 6;
        const p = a(f, st, st + 18, 0, 1, EO);
        const [fx, fy, fr] = FROM[i];
        const on = a(f, 34 + i * 12, 44 + i * 12, 0, 1);
        return (
          <div
            key={s.n}
            style={{
              position: 'absolute',
              inset: 0,
              transform: `translate(${fx * (1 - p)}px, ${fy * (1 - p)}px) rotate(${fr * (1 - p)}deg)`,
              opacity: p,
            }}
          >
            <Panel x={POS[i][0]} y={POS[i][1]} w={PW} h={PH} draw={p} active={on} fill="rgba(12,18,24,0.96)">
              <div style={{position: 'absolute', left: 30, top: 26, fontFamily: FONT.mono, fontWeight: 800, fontSize: 26, color: on > 0.5 ? C.lime : C.grey}}>{s.n}</div>
              <div style={{position: 'absolute', right: 30, top: 30, width: 14, height: 14, background: on > 0.5 ? C.lime : C.dim, boxShadow: on > 0.5 ? `0 0 10px ${C.lime}` : undefined}} />
              <div style={{position: 'absolute', left: 30, top: 70}}>
                <Mini i={i} f={f} on={on} />
              </div>
              <div style={{position: 'absolute', left: 30, bottom: 26, fontFamily: FONT.head, fontWeight: 700, fontSize: 58, color: C.white}}>{s.t}</div>
            </Panel>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
