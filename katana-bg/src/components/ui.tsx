import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT, FPS, T, TOTAL_FRAMES} from '../config';
import {a, EIO, EO, glow, LIN, parseCaption, rnd} from '../utils';

/* ───────────────── Background: navy wash + drifting dot grid + vignette ───────────────── */
export const Background: React.FC<{flash?: number}> = () => {
  const f = useCurrentFrame();
  const off = (f * 0.35) % 48;
  return (
    <AbsoluteFill style={{background: C.bg}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 90% 60% at 50% 45%, ${C.bg2} 0%, ${C.bg} 75%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle, ${C.dot} 2.2px, transparent 2.8px)`,
          backgroundSize: '48px 48px',
          backgroundPosition: `${off}px ${off * 0.5}px`,
          opacity: 0.9,
        }}
      />
      <TwinkleDots />
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse 75% 65% at 50% 50%, transparent 55%, rgba(0,0,0,0.75) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};

const TwinkleDots: React.FC = () => {
  const f = useCurrentFrame();
  const off = (f * 0.35) % 48;
  return (
    <AbsoluteFill>
      {new Array(14).fill(0).map((_, i) => {
        const period = 70 + Math.floor(rnd(`tp${i}`) * 80);
        const phase = Math.floor(rnd(`ph${i}`) * period);
        const t = ((f + phase) % period) / period;
        const o = Math.max(0, Math.sin(t * Math.PI * 2)) ** 3;
        const cx = Math.floor(rnd(`tx${i}`) * 22) * 48 + off + 24;
        const cy = Math.floor(rnd(`ty${i}`) * 40) * 48 + off * 0.5 + 24;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: cx - 3,
              top: cy - 3,
              width: 6,
              height: 6,
              borderRadius: 3,
              background: C.lime,
              opacity: o * 0.7,
              boxShadow: `0 0 10px ${C.lime}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/* ───────────────── HUD: corner brackets, frame counter, rec, timecode, progress ───────────────── */
const tc = (f: number) => {
  const s = Math.floor(f / FPS);
  const fr = f % FPS;
  const p = (n: number) => String(n).padStart(2, '0');
  return `00:${p(Math.floor(s / 60))}:${p(s % 60)}:${p(fr)}`;
};

export const Hud: React.FC<{hidden?: number}> = ({hidden = 0}) => {
  const f = useCurrentFrame();
  const intro = a(f, 4, 24, 0, 1);
  const mono: React.CSSProperties = {
    position: 'absolute',
    fontFamily: FONT.mono,
    fontWeight: 700,
    fontSize: 22,
    letterSpacing: 2,
    color: C.grey,
  };
  const br = (s: React.CSSProperties) => (
    <div style={{position: 'absolute', width: 44, height: 44, borderColor: C.grey, borderStyle: 'solid', borderWidth: 0, ...s}} />
  );
  const blink = Math.floor(f / 15) % 2 === 0;
  return (
    <AbsoluteFill style={{opacity: intro * (1 - hidden)}}>
      {br({left: 36, top: 36, borderLeftWidth: 2, borderTopWidth: 2})}
      {br({right: 36, top: 36, borderRightWidth: 2, borderTopWidth: 2})}
      {br({left: 36, bottom: 36, borderLeftWidth: 2, borderBottomWidth: 2})}
      {br({right: 36, bottom: 36, borderRightWidth: 2, borderBottomWidth: 2})}
      <div style={{...mono, left: 96, top: 60}}>
        {T.hud.frame} {String(f).padStart(4, '0')}
      </div>
      <div style={{...mono, right: 96, top: 60}}>{T.hud.brand}</div>
      <div style={{...mono, left: 96, bottom: 62, display: 'flex', alignItems: 'center', gap: 12}}>
        <div style={{width: 14, height: 14, borderRadius: 7, background: blink ? C.warn : 'transparent', border: `2px solid ${C.warn}`}} />
        {T.hud.rec}
      </div>
      <div style={{...mono, right: 96, bottom: 62}}>{tc(f)}</div>
      {/* global progress indicator */}
      <div style={{position: 'absolute', left: 96, right: 96, bottom: 110, height: 2, background: C.dim}}>
        <div style={{width: `${(f / TOTAL_FRAMES) * 100}%`, height: 2, background: C.lime, boxShadow: `0 0 8px ${C.lime}`}} />
      </div>
      {/* top ruler ticks */}
      <div style={{position: 'absolute', left: 96, right: 96, top: 104, height: 12, display: 'flex', justifyContent: 'space-between'}}>
        {new Array(41).fill(0).map((_, i) => (
          <div key={i} style={{width: 2, height: i % 5 === 0 ? 12 : 6, background: C.dim}} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ───────────────── Caption: TikTok-style words with lime highlight boxes ───────────────── */
export const Caption: React.FC<{text: string; start?: number; end?: number; top?: number}> = ({
  text,
  start = 4,
  end = 9999,
  top = 170,
}) => {
  const f = useCurrentFrame();
  const words = parseCaption(text);
  const out = a(f, end - 8, end, 1, 0);
  return (
    <div
      style={{
        position: 'absolute',
        left: 80,
        right: 80,
        top,
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px 16px',
        fontFamily: FONT.head,
        fontWeight: 600,
        fontSize: 52,
        lineHeight: 1.2,
        color: C.white,
        opacity: out,
      }}
    >
      {words.map((w, i) => {
        const s = start + i * 3;
        const p = a(f, s, s + 10, 0, 1);
        const hb = a(f, s + 4, s + 14, 0, 1, EIO);
        return (
          <span
            key={i}
            style={{
              position: 'relative',
              display: 'inline-block',
              opacity: p,
              transform: `translateY(${(1 - p) * 24}px)`,
              color: w.hl && hb > 0.5 ? C.bg : C.white,
              padding: w.hl ? '0 10px' : 0,
            }}
          >
            {w.hl && (
              <span
                style={{
                  position: 'absolute',
                  inset: '6px 0 4px 0',
                  background: C.lime,
                  transform: `scaleX(${hb})`,
                  transformOrigin: 'left',
                  boxShadow: `0 0 24px ${C.lime}88`,
                  zIndex: -1,
                }}
              />
            )}
            {w.w}
          </span>
        );
      })}
    </div>
  );
};

/* ───────────────── Mono label ───────────────── */
export const Label: React.FC<{children: React.ReactNode; style?: React.CSSProperties; start?: number}> = ({
  children,
  style,
  start = 0,
}) => {
  const f = useCurrentFrame();
  const p = a(f, start, start + 12, 0, 1);
  return (
    <div
      style={{
        position: 'absolute',
        fontFamily: FONT.mono,
        fontWeight: 700,
        fontSize: 26,
        letterSpacing: 3,
        color: C.grey,
        opacity: p,
        clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/* ───────────────── Neon slash: a glowing streak crossing the frame ───────────────── */
export const Slash: React.FC<{start: number; dur?: number; angle?: number; cx?: number; cy?: number; len?: number; width?: number}> = ({
  start,
  dur = 12,
  angle = -32,
  cx = 540,
  cy = 960,
  len = 2600,
  width = 10,
}) => {
  const f = useCurrentFrame();
  if (f < start || f > start + dur + 14) return null;
  const head = a(f, start, start + dur, 0, 1, EIO);
  const tail = a(f, start + 3, start + dur + 10, 0, 1, EIO);
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad) * len;
  const dy = Math.sin(rad) * len;
  const x0 = cx - dx / 2;
  const y0 = cy - dy / 2;
  const p = (t: number) => [x0 + dx * t, y0 + dy * t];
  const [hx, hy] = p(head);
  const [tx, ty] = p(tail);
  const o = a(f, start + dur + 4, start + dur + 14, 1, 0);
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: o, overflow: 'visible'}}>
      <defs>
        <filter id={`sg${start}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <line x1={tx} y1={ty} x2={hx} y2={hy} stroke={C.lime} strokeWidth={width} strokeLinecap="round" filter={`url(#sg${start})`} />
      <line x1={tx} y1={ty} x2={hx} y2={hy} stroke="#F7FFD9" strokeWidth={width * 0.35} strokeLinecap="round" />
    </svg>
  );
};

/* ───────────────── Sparks: particle burst ───────────────── */
export const Sparks: React.FC<{
  x: number;
  y: number;
  start: number;
  count?: number;
  seed?: string;
  angle?: number;
  spread?: number;
  power?: number;
  gravity?: number;
}> = ({x, y, start, count = 36, seed = 's', angle = 90, spread = 360, power = 1, gravity = 0.35}) => {
  const f = useCurrentFrame();
  const t = f - start;
  if (t < 0 || t > 50) return null;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      {new Array(count).fill(0).map((_, i) => {
        const ang = ((angle + (rnd(`${seed}a${i}`) - 0.5) * spread) * Math.PI) / 180;
        const v = (6 + rnd(`${seed}v${i}`) * 26) * power;
        const life = 16 + rnd(`${seed}l${i}`) * 26;
        if (t > life) return null;
        const d = v * 9 * (1 - Math.exp(-t / 9));
        const px = x + Math.cos(ang) * d;
        const py = y + Math.sin(ang) * d + gravity * t * t;
        const vx = Math.cos(ang) * v * Math.exp(-t / 9);
        const vy = Math.sin(ang) * v * Math.exp(-t / 9) + gravity * 2 * t;
        const sp = Math.max(0.001, Math.hypot(vx, vy));
        const L = Math.min(34, 6 + sp * 1.3);
        const o = 1 - t / life;
        return (
          <line
            key={i}
            x1={px}
            y1={py}
            x2={px - (vx / sp) * L}
            y2={py - (vy / sp) * L}
            stroke={i % 5 === 0 ? '#FFFFFF' : C.lime}
            strokeWidth={i % 3 === 0 ? 4 : 2.5}
            strokeLinecap="round"
            opacity={o}
            style={{filter: `drop-shadow(0 0 6px ${C.lime})`}}
          />
        );
      })}
    </svg>
  );
};

/* ───────────────── Glitch: RGB split + slice offset while active ───────────────── */
export const Glitch: React.FC<{children: React.ReactNode; on: boolean; seed?: number; style?: React.CSSProperties}> = ({
  children,
  on,
  seed = 1,
  style,
}) => {
  const f = useCurrentFrame();
  if (!on) return <div style={style}>{children}</div>;
  const r = (k: string) => rnd(`${seed}-${f}-${k}`);
  const sx = (r('x') - 0.5) * 40;
  const y1 = r('y1') * 80;
  const y2 = Math.min(100, y1 + 8 + r('h') * 20);
  return (
    <div style={{position: 'relative', ...style}}>
      <div style={{position: 'absolute', inset: 0, transform: `translateX(${-8 - r('a') * 8}px)`, opacity: 0.8, filter: 'drop-shadow(0 0 0 #ff2d6f)', mixBlendMode: 'screen'}}>
        <div style={{filter: 'sepia(1) saturate(8) hue-rotate(-50deg)'}}>{children}</div>
      </div>
      <div style={{position: 'absolute', inset: 0, transform: `translateX(${8 + r('b') * 8}px)`, opacity: 0.8, mixBlendMode: 'screen'}}>
        <div style={{filter: 'sepia(1) saturate(8) hue-rotate(130deg)'}}>{children}</div>
      </div>
      <div style={{position: 'relative', clipPath: `inset(0 0 ${100 - y1}% 0)`}}>{children}</div>
      <div style={{position: 'absolute', inset: 0, clipPath: `inset(${y1}% 0 ${100 - y2}% 0)`, transform: `translateX(${sx}px)`}}>{children}</div>
      <div style={{position: 'absolute', inset: 0, clipPath: `inset(${y2}% 0 0 0)`}}>{children}</div>
    </div>
  );
};

/* ───────────────── Technical panel with cut corners and corner ticks ───────────────── */
export const Panel: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  draw?: number; // 0..1 border draw-on progress
  active?: number; // 0..1 lime highlight
  fill?: string;
  children?: React.ReactNode;
  cut?: number;
  style?: React.CSSProperties;
}> = ({x, y, w, h, draw = 1, active = 0, fill = 'rgba(16,24,32,0.82)', children, cut = 22, style}) => {
  const pts = `${cut},0 ${w},0 ${w},${h - cut} ${w - cut},${h} 0,${h} 0,${cut}`;
  const per = 2 * (w + h);
  const col = active > 0.01 ? mix(C.grey, C.lime, active) : '#9AA4AD';
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, ...style}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: fill,
          clipPath: `polygon(${pts
            .split(' ')
            .map((p) => p.split(',').map((n) => n + 'px').join(' '))
            .join(',')})`,
          opacity: Math.min(1, draw * 1.4),
        }}
      />
      <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <polygon
          points={pts}
          fill="none"
          stroke={col}
          strokeWidth={2.5}
          strokeDasharray={per}
          strokeDashoffset={per * (1 - draw)}
          style={{filter: active > 0.05 ? `drop-shadow(0 0 ${10 * active}px ${C.lime})` : undefined}}
        />
      </svg>
      <div style={{position: 'absolute', inset: 0, opacity: a(draw, 0.5, 1, 0, 1, LIN)}}>{children}</div>
    </div>
  );
};

export const mix = (c1: string, c2: string, t: number) => {
  const h = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const A = h(c1);
  const B = h(c2);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
};

/* ───────────────── Big kinetic headline line with mask reveal ───────────────── */
export const RevealText: React.FC<{
  text: string;
  start: number;
  size: number;
  color?: string;
  font?: string;
  weight?: number;
  glowOn?: boolean;
  style?: React.CSSProperties;
  stagger?: number;
  from?: 'up' | 'down';
}> = ({text, start, size, color = C.white, font = FONT.head, weight = 700, glowOn, style, stagger = 2, from = 'up'}) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        fontFamily: font,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1,
        color,
        textShadow: glowOn ? glow(color, 1) : undefined,
        whiteSpace: 'pre',
        ...style,
      }}
    >
      {text.split('').map((ch, i) => {
        const p = a(f, start + i * stagger, start + i * stagger + 14, 0, 1, EO);
        return (
          <span key={i} style={{display: 'inline-block', overflow: 'hidden', padding: '0.08em 0.01em'}}>
            <span style={{display: 'inline-block', transform: `translateY(${(from === 'up' ? 1 : -1) * (1 - p) * 110}%)`}}>{ch}</span>
          </span>
        );
      })}
    </div>
  );
};
