import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT, SCENES, T} from '../config';
import {Caption, Sparks} from '../components/ui';
import {a, BACK, EI, EIO, EO, glow, LIN, rnd} from '../utils';

// arc from first idea (bottom-left) to final result frame (right)
const P0 = [190, 1330];
const P1 = [300, 560];
const P2 = [760, 560];
const P3 = [810, 1010];
const bez = (t: number) => {
  const u = 1 - t;
  const x = u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0];
  const y = u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1];
  return [x, y];
};
const PATH = `M${P0} C${P1} ${P2} ${P3}`;
const ZOOM = 112; // start zoom into the result frame
const END = 132; // final headline section starts

export const S9Final: React.FC = () => {
  const f = useCurrentFrame();
  const D = SCENES.final.dur;

  const dotIn = a(f, 4, 16, 0, 1, BACK);
  const arc = a(f, 26, 84, 0, 1, EIO);
  const [hx, hy] = bez(arc);
  const frameIn = a(f, 14, 30, 0, 1, EO);
  const filled = a(f, 84, 96, 0, 1, EO);
  // zoom into result frame (center ~ 810,1010 → frame box center)
  const z = a(f, ZOOM, END, 0, 1, EI);
  const zs = 1 + z * 7;

  if (f < END) {
    return (
      <AbsoluteFill>
        <AbsoluteFill style={{transform: `scale(${zs})`, transformOrigin: '810px 1110px', opacity: 1 - a(f, END - 6, END, 0, 1)}}>
          {/* baseline axis */}
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
            <line x1={110} x2={110 + 860 * a(f, 0, 20, 0, 1, EIO)} y1={1420} y2={1420} stroke={C.grey} strokeWidth={2} />
            {new Array(18).fill(0).map((_, i) => (
              <line key={i} x1={110 + i * 50} x2={110 + i * 50} y1={1420} y2={1432} stroke={C.grey} strokeWidth={2} opacity={a(f, i, i + 8, 0, 1)} />
            ))}
            {/* guide dotted arc */}
            <path d={PATH} fill="none" stroke={C.grey} strokeWidth={3} strokeDasharray="4 16" strokeLinecap="round" opacity={a(f, 8, 20, 0, 0.8)} />
            {/* glowing arc */}
            <path d={PATH} fill="none" stroke={C.lime} strokeWidth={7} pathLength={1} strokeDasharray={`${arc} 1`} strokeLinecap="round" style={{filter: `drop-shadow(0 0 12px ${C.lime})`}} />
            {/* comet head */}
            {arc > 0 && arc < 1 && <circle cx={hx} cy={hy} r={16} fill="#F7FFD9" style={{filter: `drop-shadow(0 0 20px ${C.lime})`}} />}
            {/* start dot */}
            <circle cx={P0[0]} cy={P0[1]} r={22 * dotIn} fill={C.lime} style={{filter: `drop-shadow(0 0 18px ${C.lime})`}} />
            <circle cx={P0[0]} cy={P0[1]} r={22 + ((f * 1.5) % 40)} fill="none" stroke={C.lime} strokeWidth={2} opacity={dotIn * (1 - ((f * 1.5) % 40) / 40)} />
          </svg>
          <div style={{position: 'absolute', left: 110, top: 1450, fontFamily: FONT.mono, fontWeight: 800, fontSize: 28, letterSpacing: 2, color: C.white, opacity: dotIn}}>
            <span style={{color: C.lime}}>■ </span>
            {T.final.start}
          </div>
          <div style={{position: 'absolute', left: 110, top: 1500, fontFamily: FONT.mono, fontWeight: 700, fontSize: 22, color: C.grey, opacity: dotIn}}>00:00</div>

          {/* result frame */}
          <div
            style={{
              position: 'absolute',
              left: 620,
              top: 1010,
              width: 380,
              height: 250,
              border: `3px ${filled > 0 ? 'solid' : 'dashed'} ${filled > 0 ? C.lime : C.grey}`,
              boxShadow: filled > 0 ? glow(C.lime, 0.6 * filled) : undefined,
              background: `rgba(16,24,32,${0.6 + filled * 0.35})`,
              opacity: frameIn,
              transform: `scale(${0.8 + frameIn * 0.2})`,
              overflow: 'hidden',
            }}
          >
            {filled < 1 && (
              <div style={{position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: FONT.head, fontWeight: 700, fontSize: 130, color: C.grey, opacity: 1 - filled}}>?</div>
            )}
            {/* mini preview of the finished piece */}
            <div style={{position: 'absolute', inset: 0, opacity: filled, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
              <div style={{fontFamily: FONT.impact, fontWeight: 900, fontSize: 62, color: '#F7FFD9', textShadow: glow(C.lime, 0.6), transform: 'skewX(-10deg)'}}>KATANA</div>
              <div style={{width: 260 * filled, height: 4, background: C.lime, marginTop: 10}} />
              <div style={{position: 'absolute', left: (f * 9) % 380, top: 0, bottom: 0, width: 3, background: C.lime, opacity: 0.6}} />
            </div>
          </div>
          <div style={{position: 'absolute', left: 620, top: 1280, fontFamily: FONT.mono, fontWeight: 800, fontSize: 28, letterSpacing: 2, color: filled > 0.5 ? C.lime : C.white, opacity: frameIn}}>
            {T.final.end}
          </div>
          <div style={{position: 'absolute', right: 80, top: 1330, fontFamily: FONT.mono, fontWeight: 700, fontSize: 22, color: C.grey, opacity: frameIn}}>00:15</div>
          <Sparks x={P3[0]} y={P3[1]} start={84} count={40} seed="f1" power={0.9} />
        </AbsoluteFill>
        <Caption text={T.final.caption} start={4} end={ZOOM + 4} />
        <AbsoluteFill style={{background: C.lime, opacity: a(f, END - 8, END, 0, 1, EI)}} />
      </AbsoluteFill>
    );
  }

  // ── final composition ──
  const g = f - END;
  const l1 = a(g, 2, 14, 0, 1, EO);
  const l2 = a(g, 8, 22, 0, 1, EO);
  const shake = g >= 8 && g < 16 ? (rnd(`fs${g}`) - 0.5) * 20 * (1 - (g - 8) / 8) : 0;
  const breathe = 1 + Math.sin(g / 18) * 0.012;
  const tag = a(g, 30, 48, 0, 1, EIO);
  const fadeOut = a(f, D - 10, D, 0, 1, LIN);

  return (
    <AbsoluteFill style={{opacity: 1 - fadeOut}}>
      {/* flash out of lime into glow */}
      <AbsoluteFill style={{background: C.lime, opacity: a(g, 0, 10, 1, 0, EO)}} />
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 50%, rgba(200,255,0,${0.28 + Math.sin(g / 12) * 0.05}) 0%, rgba(200,255,0,0.06) 38%, transparent 62%)`}} />
      {/* rising particles */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {new Array(40).fill(0).map((_, i) => {
          const x = rnd(`px${i}`) * 1080;
          const sp = 2 + rnd(`ps${i}`) * 5;
          const y = 1920 - ((g * sp + rnd(`py${i}`) * 1920) % 1920);
          return <circle key={i} cx={x + Math.sin(g / 20 + i) * 20} cy={y} r={1.5 + rnd(`pr${i}`) * 3} fill={C.lime} opacity={0.3 + rnd(`po${i}`) * 0.5} />;
        })}
        {/* expanding rings */}
        {[0, 1].map((k) => {
          const t = a(g, k * 6, k * 6 + 40, 0, 1, EO);
          return <circle key={k} cx={540} cy={960} r={100 + t * 900} fill="none" stroke={C.lime} strokeWidth={6 * (1 - t)} opacity={1 - t} />;
        })}
      </svg>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', transform: `translateX(${shake}px) scale(${breathe})`}}>
        <div style={{textAlign: 'center', fontFamily: FONT.head, fontWeight: 700, lineHeight: 0.92}}>
          <div style={{fontSize: 250, color: C.white, opacity: l1, transform: `translateY(${(1 - l1) * -120}px) scale(${1.4 - l1 * 0.4})`, filter: `blur(${(1 - l1) * 14}px)`, textShadow: '0 0 40px rgba(244,244,244,0.35)'}}>
            {T.final.l1}
          </div>
          <div
            style={{
              fontSize: 236,
              color: '#E4FF7A',
              textShadow: glow(C.lime, 1.8),
              opacity: l2,
              transform: `scale(${2 - l2}) skewX(-6deg)`,
              filter: `blur(${(1 - l2) * 20}px)`,
            }}
          >
            {T.final.l2}
          </div>
        </div>
        <div style={{marginTop: 40, height: 6, width: 760 * a(g, 20, 40, 0, 1, EIO), background: C.lime, boxShadow: glow(C.lime)}} />
        <div
          style={{
            marginTop: 34,
            fontFamily: FONT.mono,
            fontWeight: 800,
            fontSize: 30,
            letterSpacing: 6,
            color: C.white,
            clipPath: `inset(0 ${(1 - tag) * 100}% 0 0)`,
          }}
        >
          {T.final.tag}
        </div>
      </AbsoluteFill>
      <Sparks x={540} y={1000} start={END + 10} count={70} seed="fin" power={1.4} gravity={0.25} />
    </AbsoluteFill>
  );
};
