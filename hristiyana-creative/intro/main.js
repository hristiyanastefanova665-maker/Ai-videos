// Hristiyana – personal brand intro reel. GSAP master timeline, seekable frame by frame.
// window.seek(t) renders time t; window.SFX holds the sound-effect cue list for the audio mix.
(() => {
const DUR = 87.0;
const $ = (s, r = document) => r.querySelector(s);
const world = $('#world'), fx = $('#fx'), pres = $('#pres'), presIn = $('#presIn');
const I = window.ICON;
const K = '#171318', R = '#C66F8C', C = '#FFF9F5', B = '#E8D7CF', G = '#D6B27C';

function mk(parent, html, style = '', cls = 'a pp') {
  const d = document.createElement('div'); d.className = cls; if (style) d.style.cssText = style;
  d.innerHTML = html; parent.appendChild(d); return d;
}
const icon = (p, name, x, y, size, arg) => mk(p, I[name](arg), `left:${x}px;top:${y}px;width:${size}px;height:${size}px`, 'ic pp');
const img = (p, src, x, y, w, h, extra = '') => mk(p, `<img src="${src}" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:inherit">`, `left:${x}px;top:${y}px;width:${w}px;height:${h}px;${extra}`);

const tl = gsap.timeline({ paused: true });
const SFX = []; window.SFX = SFX;
const sfx = (t, type, vol = 1) => SFX.push([+t.toFixed(3), type, vol]);

function show(el, t, o = {}) {
  tl.fromTo(el, { autoAlpha: 0, scale: .3, ...(o.from || {}) },
    { autoAlpha: 1, scale: 1, x: 0, y: 0, rotation: o.rot || 0, duration: o.d || .5, ease: o.ease || 'back.out(1.7)', immediateRender: false, ...(o.to || {}) }, t);
  if (o.s) sfx(t, o.s, o.v || 1);
}
function hide(el, t, o = {}) {
  tl.to(el, { autoAlpha: 0, scale: o.scale ?? .85, duration: o.d || .3, ease: 'power2.in', ...(o.to || {}) }, t);
}
const set = (el, t, v) => tl.set(el, v, t);

function scene(bg, t0, t1, dots = '') {
  const L = mk(world, '', '', 'L pp ' + bg);
  if (dots !== null) mk(L, '', '', 'dots ' + dots);
  const cam = mk(L, '', '', 'cam');
  mk(L, '', '', 'grain');
  set(L, t0, { autoAlpha: 1 }); set(L, t1, { autoAlpha: 0 });
  return { L, cam, t0, t1 };
}

// ---------- transitions ----------
const wipes = $('#wipes');
function wipe(t, cols = [R, G, K]) {
  cols.forEach((c, i) => {
    const w = mk(wipes, '', `background:${c}`, 'wp');
    const st = t - .42 + (i - (cols.length - 1)) * .07;
    tl.fromTo(w, { x: -2600 }, { x: 2600, duration: .84, ease: 'power3.inOut', immediateRender: false }, st);
  });
  sfx(t - .35, 'whoosh');
}
function flash(t, a = .85) { tl.fromTo('#flash', { opacity: a }, { opacity: 0, duration: .35, ease: 'power2.out', immediateRender: false }, t); }
function shake(el, t, amp = 18, n = 6) {
  for (let i = 0; i < n; i++) tl.to(el, { x: (i % 2 ? -1 : 1) * amp * (1 - i / n), y: (i % 3 - 1) * amp * .5 * (1 - i / n), duration: .035, ease: 'none' }, t + i * .035);
  tl.to(el, { x: 0, y: 0, duration: .05 }, t + n * .035);
}
function camPush(cam, t0, t1, s0 = 1, s1 = 1.06, extra = {}) {
  tl.fromTo(cam, { scale: s0 }, { scale: s1, duration: t1 - t0, ease: 'sine.inOut', immediateRender: false, ...extra }, t0);
}

// ---------- presenter ----------
const P = {
  off: { x: 1150, y: 1220, scale: .6 },
  def: { x: 478, y: 1222, scale: .6 },
  close: { x: -345, y: 255, scale: 1.5 },
  center: { x: -21, y: 690, scale: .95 },
  left: { x: -205, y: 1222, scale: .62 },
};
gsap.set(pres, P.off);
const presTo = (t, p, d = .8, ease = 'power3.inOut') => tl.to(pres, { ...p, duration: d, ease }, t);
const hop = (t, a = 1.06) => { tl.to(presIn, { scale: a, duration: .12, ease: 'power2.out' }, t); tl.to(presIn, { scale: 1, duration: .45, ease: 'elastic.out(1,.45)' }, t + .12); };

// face overlay: eyelids + mouth (image coordinate space 1254x1100)
const face = $('#face');
face.innerHTML = `
<defs>
  <linearGradient id="lidL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c46c5d"/><stop offset="1" stop-color="#d98468"/></linearGradient>
  <linearGradient id="lidR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d27768"/><stop offset="1" stop-color="#e48d70"/></linearGradient>
</defs>
<g id="lidLg" style="transform-origin:500px 430px">
  <path d="M450 452 C468 424 528 420 552 444 C534 474 478 480 450 452Z" fill="url(#lidL)"/>
</g>
<path id="lashL" d="M452 452 C478 468 526 466 550 446" stroke="#2a1719" stroke-width="6" fill="none" stroke-linecap="round"/>
<g id="lidRg" style="transform-origin:665px 402px">
  <path d="M604 428 C624 396 694 388 730 406 C710 440 650 452 604 428Z" fill="url(#lidR)"/>
</g>
<path id="lashR" d="M606 428 C640 444 700 436 728 408" stroke="#2a1719" stroke-width="6" fill="none" stroke-linecap="round"/>
<path id="mouth" d="" fill="#5a2630"/>
<path id="teeth" d="" fill="#f4e8e4"/>`;
const lidL = $('#lidLg'), lidR = $('#lidRg'), lashL = $('#lashL'), lashR = $('#lashR'), mouth = $('#mouth'), teeth = $('#teeth');

// pointing arms (image space). Pivot near bottom of frame; angle 0 = straight up.
function armSVG(mirror) {
  const skin = '#E79C78', line = '#5b2d27', sl = '#1d161b';
  return `<g transform="scale(${mirror ? -1 : 1},1)">
    <path d="M-66 60 L-50 -380 Q0 -398 50 -380 L66 60Z" fill="${sl}" stroke="#0c090b" stroke-width="5"/>
    <path d="M-40 -330 Q-30 -120 -40 40" stroke="#3a2e36" stroke-width="6" fill="none" opacity=".7"/>
    <path d="M-50 -372 Q0 -390 50 -372 L52 -350 Q0 -366 -52 -350Z" fill="#2c2229"/>
    <g stroke="${line}" stroke-width="5" stroke-linejoin="round" fill="${skin}">
      <rect x="-37" y="-596" width="30" height="140" rx="15"/>
      <rect x="-9" y="-508" width="25" height="48" rx="12"/>
      <rect x="13" y="-500" width="24" height="44" rx="12"/>
      <rect x="32" y="-488" width="21" height="38" rx="10"/>
      <path d="M-44 -476 Q-48 -420 -40 -388 L42 -388 Q54 -430 52 -470 Q20 -480 -44 -476Z"/>
      <path d="M-46 -452 Q-30 -470 4 -456 Q10 -446 0 -440 Q-24 -436 -40 -426Z" fill="#dd8d6b"/>
    </g>
    <path d="M-30 -586 Q-22 -594 -14 -586" stroke="#fff" stroke-opacity=".5" stroke-width="4" fill="none"/>
  </g>`;
}
function makeArm(px, py, mirror) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('width', 1254); s.setAttribute('height', 1100); s.setAttribute('class', 'arm');
  s.innerHTML = `<g transform="translate(${px},${py}) scale(1.45)"><g class="armRot">${armSVG(mirror)}</g></g>`;
  presIn.appendChild(s);
  const rot = s.querySelector('.armRot');
  gsap.set(rot, { rotation: 0, y: 700, svgOrigin: '0 0' });
  return rot;
}
const armL = makeArm(300, 1160, false);
const armR = makeArm(960, 1160, true);
function point(arm, t, ang, hold, lift = 0) {
  tl.to(arm, { y: lift, rotation: ang, duration: .45, ease: 'back.out(1.6)' }, t);
  tl.to(arm, { rotation: ang + (ang > 0 ? -4 : 4), duration: .25, ease: 'sine.inOut', yoyo: true, repeat: 1 }, t + .45);
  if (hold) tl.to(arm, { y: 700, rotation: 0, duration: .45, ease: 'power2.in' }, t + hold);
}

// reaction bubbles near the presenter head
function react(t, name, dx, dy, size = 120, dur = 1.6, arg) {
  const e = icon(fx, name, 0, 0, size, arg);
  e.dataset.dx = dx; e.dataset.dy = dy; reacts.push(e);
  show(e, t, { from: { rotation: -30 }, rot: dx < 0 ? -10 : 10, s: 'pop', v: .7 });
  hide(e, t + dur);
}
const reacts = [];

// ---------- captions ----------
const CAPS = window.CAPS, capBox = $('#capBox');
let capIdx = -2;
function renderCaps(t) {
  let idx = -1;
  for (let i = 0; i < CAPS.length; i++) if (t >= CAPS[i].t - .05 && t < CAPS[i].e) { idx = i; }
  if (idx !== capIdx) {
    capIdx = idx;
    capBox.innerHTML = idx < 0 ? '' : CAPS[idx].words.map(w => `<span class="w ${w.h}">${w.w}</span>`).join(' ');
  }
  capBox.style.visibility = idx < 0 ? 'hidden' : 'visible';
  if (idx < 0) return;
  const c = CAPS[idx], k = Math.min(1, (t - c.t + .05) / .16);
  capBox.style.transform = `translateY(${(1 - k) * 18}px) scale(${.94 + .06 * k})`;
  capBox.style.opacity = Math.min(1, k * 1.5);
  const spans = capBox.children;
  c.words.forEach((w, i) => {
    const on = t >= w.t - .04;
    spans[i].classList.toggle('on', on);
    const p = Math.max(0, Math.min(1, (t - w.t + .04) / .14));
    spans[i].style.transform = on && p < 1 ? `translateY(${-6 * Math.sin(p * Math.PI)}px) scale(${1 + .08 * Math.sin(p * Math.PI)})` : '';
  });
}

// =====================================================================
// SCENE 1 — HOOK (0 – 9.03)
// =====================================================================
{
  const S = scene('bg-dark', 0, 9.03), c = S.cam;
  set(S.L, 0, { autoAlpha: 1 });
  const term = mk(c, `
    <div style="height:64px;display:flex;align-items:center;gap:14px;padding:0 28px;border-bottom:2px solid #3a3038">
      <i style="width:20px;height:20px;border-radius:50%;background:${R}"></i><i style="width:20px;height:20px;border-radius:50%;background:${G}"></i><i style="width:20px;height:20px;border-radius:50%;background:${C};opacity:.8"></i>
      <span class="mono" style="margin-left:18px;color:#8f8189;font-size:24px">hristiyana@creative: ~</span></div>
    <div id="termTxt" class="mono" style="padding:34px 40px;color:${C};font-size:52px;line-height:1.3;font-weight:700"></div>`,
    `left:70px;top:500px;width:940px;height:330px;background:#201a22;border:3px solid #3a3038;border-radius:28px;box-shadow:0 30px 80px rgba(0,0,0,.5),0 0 0 1px rgba(214,178,124,.15)`, 'a');
  window.__termTxt = $('#termTxt', term);
  for (let i = 0; i < 12; i++) sfx(.1 + i * .115, 'key', .55);
  // ENTER → burst
  set(term, 0, { autoAlpha: 1 });
  shake(term, 1.55, 14); flash(1.55, .35); sfx(1.55, 'enter'); sfx(1.58, 'burst');
  tl.to(term, { y: -90, scale: .86, duration: .5, ease: 'power3.out' }, 1.6);
  const burst = [
    ['chip', 70, 980, 150], ['image', 860, 930, 130], ['play', 40, 410, 120], ['sparkle', 900, 420, 100], ['palette', 230, 1250, 120],
    ['bulb', 880, 1150, 120], ['chat', 690, 1300, 110], ['code', 460, 900, 120], ['wand', 300, 860, 100], ['pen', 640, 860, 100],
  ];
  const bEls = burst.map(([n, x, y, s], i) => {
    const e = icon(c, n, x, y, s);
    tl.fromTo(e, { autoAlpha: 0, scale: .2, x: 540 - x - s / 2, y: 665 - y - s / 2, rotation: -60 + i * 17 },
      { autoAlpha: 1, scale: 1, x: 0, y: 0, rotation: (i % 2 ? 8 : -8), duration: .7, ease: 'expo.out', immediateRender: false }, 1.6 + i * .025);
    tl.to(e, { y: -24 + (i % 3) * 12, rotation: (i % 2 ? -4 : 6), duration: 3.4, ease: 'sine.inOut' }, 2.35);
    return e;
  });
  const posters = [['../assets/car.png', 760, 1080, -9], ['../assets/caric.jpg', 30, 1100, 7], ['../assets/girlboss.jpg', 820, 560, 10]].map(([src, x, y, r], i) => {
    const e = img(c, src, x, y, 170, 240, 'border:5px solid #FFF9F5;border-radius:10px;box-shadow:0 16px 30px rgba(0,0,0,.45)');
    tl.fromTo(e, { autoAlpha: 0, scale: .2, x: 540 - x - 85, y: 665 - y - 120, rotation: 0 },
      { autoAlpha: 1, scale: 1, x: 0, y: 0, rotation: r, duration: .8, ease: 'expo.out', immediateRender: false }, 1.65 + i * .05);
    return e;
  });
  camPush(c, 1.55, 6.0, 1.08, 1.0);
  // presenter enters
  presTo(2.15, P.def, .75, 'back.out(1.2)'); sfx(2.1, 'swoosh', .7);
  // assumption tags
  const tags = [['ПРОГРАМИСТ', 'code', 2.55, 70, 900, -3], ['ДИЗАЙНЕР', 'pen', 3.2, 130, 1020, 2], ['ТЕХНОЛОГИЧЕН ГЕНИЙ', 'chip', 4.05, 60, 1140, -2]];
  const tagEls = tags.map(([txt, ic, t, x, y, r]) => {
    const e = mk(c, `<span style="width:52px;height:52px;display:inline-block">${I[ic]()}</span>${txt}
      <i class="strike" style="position:absolute;left:-14px;right:-14px;top:50%;height:12px;margin-top:-6px;background:${R};border-radius:6px;transform-origin:0 50%;transform:scaleX(0)"></i>`,
      `left:${x}px;top:${y}px;`, 'a pp chipT');
    e.style.background = K; e.style.color = C; e.style.borderColor = G;
    show(e, t, { from: { scale: 1.8, rotation: r * 3 }, rot: r, d: .35, ease: 'power4.out', s: 'stamp', v: .8 });
    return e;
  });
  tagEls.forEach((e, i) => tl.to(e.querySelector('.strike'), { scaleX: 1, duration: .22, ease: 'power3.out' }, 5.25 + i * .1));
  sfx(5.25, 'swipe'); sfx(5.35, 'swipe', .7); sfx(5.45, 'swipe', .6);
  const notNeeded = mk(c, `НЕ Е<br>НУЖНО!`, `left:610px;top:930px;width:380px;text-align:center;font:900 64px/1 Montserrat;color:${K};background:${G};padding:22px 10px;border-radius:20px;border:5px solid ${K};box-shadow:0 12px 0 rgba(0,0,0,.35)`);
  show(notNeeded, 5.55, { from: { scale: 2.2, rotation: 20 }, rot: 6, d: .35, ease: 'power4.out', s: 'stamp' });
  hide(notNeeded, 6.15);
  [...tagEls, term].forEach((e, i) => hide(e, 6.1 + i * .04, { to: { y: -60 } }));
  [...bEls, ...posters].forEach((e, i) => tl.to(e, { autoAlpha: 0, scale: .2, x: '+=' + ((540 - parseFloat(e.style.left)) * .6), y: '+=' + ((760 - parseFloat(e.style.top)) * .6), duration: .45, ease: 'power3.in' }, 6.05 + i * .015));
  // AI core + orbit
  const glow = mk(c, '', `left:190px;top:420px;width:700px;height:700px;border-radius:50%;background:radial-gradient(closest-side,rgba(214,178,124,.45),rgba(198,111,140,.18) 55%,rgba(0,0,0,0))`);
  show(glow, 6.3, { d: .8, ease: 'power2.out' });
  const core = icon(c, 'chip', 400, 630, 280);
  show(core, 6.35, { from: { rotation: -90 }, d: .6, s: 'magic' });
  const orbit = mk(c, '', `left:540px;top:770px;width:0;height:0`);
  set(orbit, 6.3, { autoAlpha: 1 });
  const oNames = ['image', 'play', 'palette', 'chat', 'pen', 'bulb', 'sparkle', 'wand'];
  const oEls = oNames.map((n, i) => {
    const a = i / oNames.length * Math.PI * 2, r = 330;
    const e = icon(orbit, n, Math.cos(a) * r - 50, Math.sin(a) * r * .62 - 50, 100);
    show(e, 6.45 + i * .06, { d: .45 });
    return e;
  });
  const ring = mk(c, `<svg width="760" height="480"><ellipse cx="380" cy="240" rx="330" ry="205" stroke="${G}" stroke-width="3" stroke-dasharray="6 14" fill="none"/></svg>`, `left:160px;top:530px`);
  show(ring, 6.3, { d: .6, ease: 'power2.out' });
  tl.fromTo(orbit, { rotation: 0 }, { rotation: 0, duration: .01, immediateRender: false }, 6.3);
  window.__orbit1 = { els: oEls, t0: 6.3, r: 330 };
  const ai = mk(c, `ИЗКУСТВЕН<br><span style="color:${G}">ИНТЕЛЕКТ?</span>`, `left:0;top:1040px;width:1080px;text-align:center;font:900 108px/1 Montserrat;color:${C};letter-spacing:-.01em`);
  show(ai, 7.35, { from: { y: 60, scale: .9 }, d: .5, ease: 'power3.out', s: 'hit' });
  react(7.6, 'question', -300, -40, 120, 1.3);
  camPush(c, 6.2, 9.03, 1, 1.08);
}

// =====================================================================
// SCENE 2 — WHO AM I (9.03 – 19.13)
// =====================================================================
{
  wipe(9.03);
  const S = scene('bg-cream', 9.03, 19.13, 'k'), c = S.cam;
  const disc = mk(c, '', `left:30px;top:470px;width:1020px;height:1020px;border-radius:50%;background:${R}`);
  set(pres, 9.03, P.close);
  show(disc, 9.03, { from: { scale: .6 }, d: .6, ease: 'power3.out' });
  const hi = mk(fx, `<div class="h-serif" style="font-size:104px;color:${K}">Здравей!</div>`, `left:50px;top:430px;padding:18px 44px 26px;background:${C};border:5px solid ${K};border-radius:40px 40px 40px 6px;box-shadow:0 14px 0 rgba(23,19,24,.18)`);
  show(hi, 9.1, { from: { rotation: -20 }, rot: -6, s: 'pop' });
  const wave = mk(fx, `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" stroke="${G}" stroke-width="8" stroke-linecap="round"><path d="M20 70 Q30 40 60 30"/><path d="M14 98 Q40 92 52 70"/><path d="M80 18 Q96 26 100 44"/></svg>`, `left:520px;top:400px`);
  show(wave, 9.2, { d: .4 });
  hop(9.05, 1.04);
  const name = mk(c, `<div class="lbl" style="font-size:30px;color:${R};margin-bottom:6px">аз съм</div>
     <div class="h-serif" style="font-size:150px;line-height:1;color:${K}">Християна</div>
     <svg width="640" height="40" style="margin-top:4px"><path id="swash" d="M10 26 C160 6 330 38 630 12" stroke="${G}" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="700" stroke-dashoffset="700"/></svg>`,
    `left:90px;top:1460px;width:900px;padding:30px 50px 28px;background:${C};border:5px solid ${K};border-radius:30px;box-shadow:0 16px 0 rgba(23,19,24,.18);z-index:45`, 'a pp');
  fx.appendChild(name);
  show(name, 9.78, { from: { y: 120, scale: 1 }, d: .55, ease: 'power3.out', s: 'whoosh2' });
  tl.to(name.querySelector('#swash'), { attr: { 'stroke-dashoffset': 0 }, duration: .7, ease: 'power2.out' }, 10.15);
  react(10.2, 'sparkle', 330, -260, 90, .7);
  hide(name, 10.95, { to: { y: 80 } }); hide(hi, 10.9); hide(wave, 10.9);
  // board
  tl.to(disc, { scale: .1, autoAlpha: 0, duration: .6, ease: 'power3.in' }, 10.85);
  presTo(10.9, P.def, .8);
  const board = mk(c, `<div class="lbl" style="position:absolute;left:44px;top:34px;font-size:30px;color:${R}">обичам</div>
     <div style="position:absolute;right:40px;top:38px;display:flex;gap:10px"><i style="width:18px;height:18px;border-radius:50%;background:${R}"></i><i style="width:18px;height:18px;border-radius:50%;background:${G}"></i><i style="width:18px;height:18px;border-radius:50%;background:${K}"></i></div>`,
    `left:50px;top:440px;width:980px;height:760px;`, 'a pp card');
  show(board, 10.95, { from: { y: 80, scale: .9 }, d: .55, ease: 'power3.out', s: 'whoosh2', v: .6 });
  const tiles = [['ДИЗАЙН', 'pen', 11.35], ['ИДЕИ', 'bulb', 12.45], ['ТЕХНОЛОГИИ', 'laptop', 13.35]].map(([txt, ic, t], i) => {
    const e = mk(board, `<div style="width:170px;height:170px;margin:34px auto 18px">${I[ic]()}</div><div class="lbl" style="text-align:center;font-size:30px;color:${K}">${txt}</div>`,
      `left:${44 + i * 304}px;top:120px;width:284px;height:300px;background:${i == 1 ? B : C};border:4px solid ${K};border-radius:24px`);
    show(e, t, { from: { y: 50 }, s: 'pop' });
    return e;
  });
  point(armL, 11.25, -38, 1.6);
  const curve = mk(board, `<svg width="900" height="200"><path d="M20 150 C200 -20 380 220 560 70 S820 40 880 120" stroke="${R}" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="1300" stroke-dashoffset="1300"/>
     <circle cx="20" cy="150" r="12" fill="${C}" stroke="${K}" stroke-width="4"/><circle cx="560" cy="70" r="12" fill="${C}" stroke="${K}" stroke-width="4"/><circle cx="880" cy="120" r="12" fill="${C}" stroke="${K}" stroke-width="4"/></svg>`, `left:40px;top:460px`);
  set(curve, 11.4, { autoAlpha: 1 });
  tl.to(curve.querySelector('path'), { attr: { 'stroke-dashoffset': 0 }, duration: 2.4, ease: 'power1.inOut' }, 11.4);
  const rays = mk(tiles[1], `<svg width="240" height="240" viewBox="0 0 240 240" stroke="${G}" stroke-width="8" stroke-linecap="round">${[...Array(8)].map((_, i) => { const a = i / 8 * Math.PI * 2; return `<path d="M${120 + Math.cos(a) * 92} ${120 + Math.sin(a) * 92} L${120 + Math.cos(a) * 116} ${120 + Math.sin(a) * 116}"/>`; }).join('')}</svg>`, `left:22px;top:-2px`);
  show(rays, 12.7, { d: .4, s: 'ding', v: .5 });
  // tiles shrink → idea transformation
  tiles.forEach((e, i) => tl.to(e, { scale: .5, x: -[44, 348, 652][i] * .5 + 20 + i * 150 - 44 * 0 + (i * 4), y: -100, duration: .6, ease: 'power3.inOut' }, 14.2 + i * .05));
  hide(curve, 14.2);
  const sketch = mk(board, `<div class="lbl" style="font-size:24px;color:#8b7d84;margin:18px 0 0 22px">идея.jpg</div>
     <svg width="360" height="300" viewBox="0 0 360 300" fill="none" stroke="#5c5058" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" style="margin:10px 0 0 6px">
       <path class="sk" d="M30 200 L60 150 Q90 110 160 108 L230 110 Q270 116 300 150 L330 158 Q344 166 340 196 L340 206 L30 206Z"/>
       <circle class="sk" cx="96" cy="210" r="30"/><circle class="sk" cx="272" cy="210" r="30"/>
       <path class="sk" d="M110 148 L140 120 L200 120 L222 148Z"/><path class="sk" d="M30 250 L340 250" stroke-dasharray="10 12"/></svg>`,
    `left:50px;top:300px;width:380px;height:420px;background:#fffdf9;border:3px dashed #a99aa2;border-radius:14px;`);
  show(sketch, 15.4, { from: { rotation: -14, y: 40 }, rot: -4, d: .5, s: 'paper' });
  sketch.querySelectorAll('.sk').forEach((p, i) => { p.style.strokeDasharray = 900; p.style.strokeDashoffset = 900; tl.to(p, { strokeDashoffset: 0, duration: 1.1, ease: 'power1.inOut' }, 15.55 + i * .12); });
  const arrow = mk(board, `<svg width="150" height="80"><path d="M10 40 H120 M96 16 L126 40 L96 64" stroke="${G}" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`, `left:440px;top:470px`);
  show(arrow, 17.0, { from: { x: -40, scale: 1 }, d: .4, ease: 'power3.out', s: 'swoosh', v: .5 });
  const real = img(board, '../assets/car.png', 600, 270, 330, 467, `border-radius:10px;border:6px solid ${K};box-shadow:0 18px 0 rgba(23,19,24,.2)`);
  show(real, 17.6, { from: { rotation: 12, scale: .2 }, rot: 3, d: .6, s: 'ding' });
  const realTag = mk(board, `РЕАЛНО ✓`, `left:690px;top:690px;font:900 34px Montserrat;color:${K};background:${G};padding:10px 22px;border-radius:999px;border:4px solid ${K}`);
  show(realTag, 17.95, { s: 'pop', v: .6 });
  react(17.7, 'sparkle', -330, -240, 100, 1.2);
  camPush(c, 10.9, 19.13, 1, 1.05);
}

// =====================================================================
// SCENE 3 — MY STORY (19.13 – 30.5)
// =====================================================================
{
  wipe(19.13, [G, K]);
  const S = scene('bg-dark', 19.13, 21.56), c = S.cam;
  const frame = mk(c, `<svg width="900" height="520"><rect x="6" y="6" width="888" height="508" rx="30" stroke="${G}" stroke-width="4" fill="none" stroke-dasharray="2800" stroke-dashoffset="2800" id="lf"/></svg>`, `left:90px;top:500px`);
  set(frame, 19.15, { autoAlpha: 1 });
  tl.to(frame.querySelector('#lf'), { attr: { 'stroke-dashoffset': 0 }, duration: 1.3, ease: 'power2.inOut' }, 19.2);
  const lbl = mk(c, `създадох`, `left:0;top:560px;width:1080px;text-align:center;font:800 32px Montserrat;letter-spacing:.3em;text-transform:uppercase;color:${R}`);
  show(lbl, 19.2, { from: { y: 20, scale: 1 }, d: .4, ease: 'power2.out' });
  const logo = mk(c, `<div class="h-serif" style="font-size:156px;color:${C};line-height:1.05">Hristiyana</div>
     <div style="font:800 46px Montserrat;letter-spacing:.62em;color:${G};margin-top:10px;padding-left:.62em">CREATIVE</div>
     <div class="sweep" style="position:absolute;inset:-20px;background:linear-gradient(100deg,transparent 35%,rgba(255,249,245,.55) 50%,transparent 65%);mix-blend-mode:overlay;transform:translateX(-120%)"></div>`,
    `left:0;top:640px;width:1080px;text-align:center;overflow:hidden`);
  show(logo, 19.45, { from: { scale: 1.25, y: 0 }, d: .9, ease: 'expo.out', s: 'magic' });
  tl.to(logo.querySelector('.sweep'), { x: '120%', duration: 1, ease: 'power2.inOut' }, 20.0);
  [[150, 520], [900, 950], [120, 940], [930, 540]].forEach(([x, y], i) => { const e = icon(c, 'sparkle', x, y, 60 + i * 8); show(e, 19.7 + i * .12, { d: .4 }); });
  const sub = mk(c, `дизайн · постери · идеи`, `left:0;top:900px;width:1080px;text-align:center;font:600 36px Montserrat;color:${B};letter-spacing:.08em`);
  show(sub, 20.4, { from: { y: 20, scale: 1 }, d: .5, ease: 'power2.out' });
  camPush(c, 19.13, 21.56, 1.0, 1.05);
}
{
  wipe(21.56, [R, C]);
  const S = scene('bg-beige', 21.56, 30.5, 'k'), c = S.cam;
  // studio upgrade background (appears at 26.7)
  const studioBg = mk(c, `<div style="position:absolute;inset:0;background:linear-gradient(180deg,#f3e6df 0%,#E8D7CF 100%)"></div>
     <div style="position:absolute;left:0;right:0;top:0;height:600px;background:${R};opacity:.95"></div>
     <div style="position:absolute;left:0;right:0;top:592px;height:16px;background:${G}"></div>`, `left:0;top:0;width:1080px;height:1920px`);
  // wall frames
  const wall = [['../assets/car.png', 80, 470, 240, 340, -2, 22.75], ['../assets/caric.jpg', 360, 450, 240, 336, 2, 23.75], ['../assets/wedding.jpg', 640, 470, 230, 322, -1, 24.45]];
  const wallEls = wall.map(([src, x, y, w, h, r, t]) => {
    const e = img(c, src, x, y, w, h, `border:8px solid ${K};border-radius:6px;box-shadow:0 16px 0 rgba(23,19,24,.18);background:#fff`);
    show(e, t, { from: { y: -80, rotation: r * 6 }, rot: r, d: .5, ease: 'back.out(1.5)', s: 'pop' });
    return e;
  });
  const wallTags = [['ПОСТЕРИ', 110, 820, 22.95], ['КАРИКАТУРИ', 370, 800, 23.95], ['ПОКАНИ', 680, 805, 24.65]].map(([t, x, y, tt]) => {
    const e = mk(c, t, `left:${x}px;top:${y}px;`, 'a pp chipT'); e.style.fontSize = '28px'; e.style.padding = '10px 20px';
    show(e, tt, { d: .35 }); return e;
  });
  // desk
  const desk = mk(c, `<div style="position:absolute;left:0;top:0;width:1080px;height:34px;background:${K};border-radius:8px"></div>
     <div style="position:absolute;left:70px;top:30px;width:26px;height:500px;background:${K}"></div>`, `left:0;top:1250px;width:1080px;height:600px`);
  set(desk, 21.56, { autoAlpha: 1 });
  const monitor = mk(c, `<div style="position:absolute;left:0;top:0;width:420px;height:280px;background:${K};border-radius:18px;padding:14px">
       <div style="width:100%;height:100%;border-radius:8px;background:${C};position:relative;overflow:hidden">
         <div style="position:absolute;left:0;top:0;bottom:0;width:56px;background:${B}"></div>
         <img src="../assets/car.png" style="position:absolute;left:150px;top:18px;height:216px;border:3px solid ${K}">
         <div style="position:absolute;left:12px;top:18px;width:32px;height:32px;border-radius:8px;background:${R}"></div>
         <div style="position:absolute;left:12px;top:62px;width:32px;height:32px;border-radius:8px;background:${G}"></div>
         <div style="position:absolute;left:12px;top:106px;width:32px;height:32px;border-radius:8px;background:${K}"></div>
       </div></div>
     <div style="position:absolute;left:180px;top:280px;width:60px;height:50px;background:${K}"></div>
     <div style="position:absolute;left:120px;top:322px;width:180px;height:18px;background:${K};border-radius:9px"></div>`, `left:110px;top:910px;width:420px;height:340px`);
  show(monitor, 21.7, { from: { y: 80, scale: .9 }, d: .5, ease: 'power3.out' });
  const lamp = mk(c, `<svg width="160" height="300" viewBox="0 0 160 300" fill="${G}" stroke="${K}" stroke-width="6" stroke-linejoin="round"><path d="M40 296 H130"/><path d="M84 296 L60 160 L120 60" fill="none"/><path d="M90 20 L150 60 L120 90 L70 70Z"/></svg>`, `left:590px;top:952px`);
  show(lamp, 21.85, { from: { y: 60 }, d: .45 });
  const plant = mk(c, `<svg width="110" height="170" viewBox="0 0 110 170" stroke="${K}" stroke-width="5" stroke-linejoin="round"><path d="M55 100 C20 90 10 50 20 20 C45 40 55 70 55 100Z" fill="#9fb48f"/><path d="M55 100 C90 90 104 54 92 26 C66 44 56 70 55 100Z" fill="#b7c7a6"/><path d="M28 100 H82 L74 166 H36Z" fill="${R}"/></svg>`, `left:30px;top:1084px`);
  show(plant, 21.95, { from: { y: 60 }, d: .45 });
  // printer prints
  const printer = mk(c, `<div class="paper" style="position:absolute;left:44px;top:110px;width:192px;height:0;overflow:hidden;border:4px solid ${K};border-top:none;background:#fff;z-index:2">
        <img src="../assets/hands.jpg" style="width:100%;display:block"></div>
     <div style="position:absolute;left:40px;top:0;width:200px;height:60px;background:${C};border:5px solid ${K};border-bottom:none"></div>
     <div style="position:absolute;left:0;top:50px;width:280px;height:110px;background:${B};border:5px solid ${K};border-radius:18px;z-index:1"></div>
     <div style="position:absolute;left:30px;top:84px;width:220px;height:16px;background:${K};border-radius:8px;z-index:3"></div>
     <div class="led" style="position:absolute;left:236px;top:68px;width:18px;height:18px;border-radius:50%;background:${R};z-index:3"></div>`,
    `left:740px;top:1090px;width:280px;height:160px`);
  show(printer, 25.0, { from: { y: 80, scale: .9 }, d: .4, ease: 'power3.out' });
  tl.fromTo(printer.querySelector('.paper'), { height: 0 }, { height: 270, duration: 1.3, ease: 'steps(9)', immediateRender: false }, 25.35);
  sfx(25.3, 'printer');
  const pTag = mk(c, 'ПЕЧАТ', `left:820px;top:1000px;`, 'a pp chipT'); pTag.style.fontSize = '28px'; pTag.style.padding = '10px 20px';
  show(pTag, 25.3, { d: .35 });
  point(armL, 22.6, -30, 1.4);
  // studio transformation 26.7
  show(studioBg, 26.68, { from: { scale: 1, y: -1920 }, d: .55, ease: 'power3.inOut' });
  flash(27.05, .35); sfx(26.7, 'magic');
  wallEls.forEach((e, i) => tl.to(e, { borderColor: G, y: 0, duration: .3 }, 26.9 + i * .06));
  [...wallTags].forEach(e => hide(e, 26.7));
  hide(lamp, 26.7); hide(plant, 26.7);
  const sign = mk(c, `<span class="h-serif" style="font-size:96px;color:${C};text-shadow:0 0 18px rgba(255,249,245,.8),0 0 40px rgba(214,178,124,.9)">Hristiyana</span> <span style="font:800 36px Montserrat;letter-spacing:.4em;color:${G};text-shadow:0 0 18px rgba(214,178,124,.9)">CREATIVE</span>`,
    `left:0;top:450px;width:1080px;text-align:center`);
  // reposition frames lower for studio
  wallEls.forEach((e, i) => tl.to(e, { top: '+=150', scale: .86, duration: .5, ease: 'power3.inOut' }, 26.75));
  show(sign, 27.0, { from: { scale: 1.1 }, d: .25, ease: 'power1.out', s: 'neon' });
  tl.to(sign, { opacity: .35, duration: .05, yoyo: true, repeat: 3 }, 27.25);
  const ring = mk(c, `<svg width="180" height="320" viewBox="0 0 180 320"><circle cx="90" cy="90" r="74" fill="none" stroke="${C}" stroke-width="22"/><circle cx="90" cy="90" r="74" fill="none" stroke="${K}" stroke-width="4"/><circle cx="90" cy="90" r="85" fill="none" stroke="${K}" stroke-width="4"/><circle cx="90" cy="90" r="63" fill="none" stroke="${K}" stroke-width="4"/><path d="M90 170 V316 M50 316 H130" stroke="${K}" stroke-width="8"/></svg>`, `left:580px;top:934px`);
  show(ring, 26.95, { from: { y: 60 }, d: .45 });
  const checks = [['УЧА СЕ', 26.95], ['ЕКСПЕРИМЕНТИРАМ', 27.75], ['ИЗГРАЖДАМ НЕЩО СВОЕ', 28.7]].map(([t, tt], i) => {
    const e = mk(c, `<span style="width:46px;height:46px;display:inline-block">${I.check()}</span>${t}`, `left:50px;top:${1330 + i * 104}px;`, 'a pp chipT');
    e.style.fontSize = '32px'; e.style.padding = '12px 24px';
    show(e, tt, { from: { x: -120, scale: 1 }, d: .4, ease: 'power3.out', s: 'tick' });
    return e;
  });
  camPush(c, 21.56, 30.5, 1, 1.04);
}

// =====================================================================
// SCENE 4A — PASSION: AI (30.5 – 36.15)  [pattern interrupt]
// =====================================================================
{
  const S = scene('bg-dark', 30.5, 34.41), c = S.cam;
  flash(30.5, .9); sfx(30.48, 'glitch');
  const gl = mk(world, '', `left:0;top:0;width:1080px;height:1920px;z-index:5;background:repeating-linear-gradient(0deg,rgba(198,111,140,.0) 0 22px,rgba(198,111,140,.55) 22px 30px,rgba(214,178,124,.0) 30px 70px)`);
  tl.fromTo(gl, { autoAlpha: 1, y: -40 }, { autoAlpha: 0, y: 40, duration: .35, ease: 'steps(5)', immediateRender: false }, 30.5);
  const heart = icon(c, 'heart', 350, 560, 380);
  show(heart, 30.6, { d: .6, ease: 'elastic.out(1,.5)', s: 'pop' });
  window.__heart = heart;
  const t1 = mk(c, `ОЩЕ ЕДНА<br><span style="color:${R}">ГОЛЯМА СТРАСТ</span>`, `left:0;top:1000px;width:1080px;text-align:center;font:900 92px/1.02 Montserrat;color:${C}`);
  show(t1, 31.1, { from: { y: 50, scale: 1 }, d: .5, ease: 'power3.out' });
  // heart → AI
  hide(heart, 32.65, { scale: .1, to: { rotation: 90 } }); hide(t1, 32.6, { to: { y: -40 } });
  flash(32.74, .7); sfx(32.72, 'glitch'); sfx(32.78, 'hit');
  shake(c, 32.74, 22);
  const circ = mk(c, `<svg width="1080" height="900" viewBox="0 0 1080 900" fill="none" stroke="${G}" stroke-width="5" stroke-linecap="round">
      ${[[540, 450, 120, 120], [540, 450, 960, 160], [540, 450, 100, 760], [540, 450, 980, 740], [540, 450, 540, 40], [540, 450, 540, 880], [540, 450, 60, 450], [540, 450, 1020, 450]].map(([a, b, x, y]) => `<path class="ln" d="M${a} ${b} L${(a + x) / 2} ${b} L${x} ${y}"/><circle class="nd" cx="${x}" cy="${y}" r="14" fill="${R}" stroke="${C}"/>`).join('')}
    </svg>`, `left:0;top:350px`);
  set(circ, 32.74, { autoAlpha: 1 });
  circ.querySelectorAll('.ln').forEach((p, i) => { p.style.strokeDasharray = 900; p.style.strokeDashoffset = 900; tl.to(p, { strokeDashoffset: 0, duration: .7, ease: 'power2.out' }, 32.78 + i * .03); });
  const big = icon(c, 'chip', 330, 590, 420);
  show(big, 32.76, { from: { scale: 2.2, rotation: 25 }, d: .45, ease: 'power4.out' });
  const t2 = mk(c, `ИЗКУСТВЕНИЯТ<br><span style="color:${G}">ИНТЕЛЕКТ</span>`, `left:0;top:1060px;width:1080px;text-align:center;font:900 88px/1 Montserrat;color:${C}`);
  show(t2, 32.9, { from: { scale: 1.5 }, d: .4, ease: 'power4.out' });
  camPush(c, 32.74, 34.41, 1.12, 1.0);
}
{
  const S = scene('bg-beige', 34.41, 36.15, 'k'), c = S.cam;
  const disc = mk(c, '', `left:30px;top:470px;width:1020px;height:1020px;border-radius:50%;background:${R}`);
  show(disc, 34.41, { from: { scale: .4 }, d: .5, ease: 'power3.out' });
  presTo(34.41, P.close, .45, 'power3.out'); sfx(34.4, 'zoom');
  react(34.7, 'question', -420, -380, 150, 1.4);
  react(35.0, 'question', 380, -420, 120, 1.1, G);
  react(35.3, 'exclaim', 430, -120, 110, .8);
  const card = mk(fx, `<div class="lbl" style="font-size:30px;color:${R}">знаеш ли кое е</div><div style="font:900 78px/1 Montserrat;color:${K};white-space:nowrap">НАЙ-ХУБАВОТО?</div>`,
    `left:70px;top:1500px;width:940px;padding:28px 40px;background:${C};border:5px solid ${K};border-radius:30px;box-shadow:0 16px 0 rgba(23,19,24,.18);text-align:center`);
  show(card, 34.9, { from: { y: 120, scale: 1 }, d: .45, ease: 'power3.out', s: 'whoosh2' });
  hide(card, 36.1, { scale: 1, to: { y: 100 }, d: .2 });
}

// =====================================================================
// SCENE 4B — COMPLICATED → SIMPLE (36.15 – 42.7)
// =====================================================================
{
  wipe(36.15, [K, R]);
  const S = scene('bg-cream', 36.15, 42.7, 'k'), c = S.cam;
  presTo(36.15, P.def, .01, 'none');
  const mon = mk(c, `<div style="height:56px;background:${K};display:flex;align-items:center;padding:0 22px;gap:12px">
       <i style="width:16px;height:16px;border-radius:50%;background:#ff5f57"></i><i style="width:16px;height:16px;border-radius:50%;background:#febc2e"></i><i style="width:16px;height:16px;border-radius:50%;background:#28c840"></i>
       <span class="mono" style="color:#9a8d94;font-size:22px;margin-left:12px">AI_STUDIO_PRO_v13.7 — untitled (1).json</span></div>
     <div class="screen" style="position:absolute;left:0;right:0;top:56px;bottom:0;background:#efe9e6"></div>`,
    `left:70px;top:440px;width:940px;height:560px;border:6px solid ${K};border-radius:24px;overflow:hidden;background:#efe9e6;box-shadow:0 18px 0 rgba(23,19,24,.16)`);
  show(mon, 36.2, { from: { y: 80, scale: .9 }, d: .45, ease: 'power3.out' });
  const scr = mon.querySelector('.screen');
  // chaos UI
  const jargon = ['TEMPERATURE 0.7', 'TOP-P 0.92', 'SEED 482193', 'CFG SCALE 7.5', 'STEPS 50', 'LoRA weight', 'NEGATIVE PROMPT', 'API KEY ••••••', 'MAX TOKENS 4096', 'SAMPLER euler_a', 'VAE fp16', 'CONTEXT 128k'];
  const chaos = [];
  jargon.forEach((j, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const e = mk(scr, `<span class="mono" style="font-size:19px;font-weight:700;color:${K}">${j}</span><div style="height:8px;background:#cfc4c0;border-radius:4px;margin-top:6px;position:relative"><i style="position:absolute;left:0;top:0;bottom:0;width:${30 + (i * 37) % 60}%;background:${['#7a9cc6', '#c67a7a', '#86b38a', '#c9a35a'][i % 4]};border-radius:4px"></i></div>`,
      `left:${20 + col * 290}px;top:${18 + row * 78}px;width:260px`);
    show(e, 36.3 + i * .05, { d: .25, from: { scale: .6 } }); chaos.push(e);
  });
  const code = mk(scr, `<pre class="mono" style="font-size:18px;line-height:1.35;color:#2b5c86">{
  "model": "xl-v2.1",
  "guidance": 7.5,
  "scheduler": "DPM++",
  "lora": ["v3", 0.8],
  "seed": -1,
  "tokens": 4096,
  "fp16": true
}</pre>`, `left:610px;top:18px;width:300px;height:420px;background:#1f2430;border-radius:12px;padding:14px;color:#ddd`);
  code.querySelector('pre').style.color = '#b8d0ea';
  show(code, 36.5, { d: .3 }); chaos.push(code);
  const btnRow = mk(scr, ['RUN', 'BATCH', 'UPSCALE', 'INPAINT', '?!'].map((b, i) => `<span style="display:inline-block;margin-right:8px;padding:8px 12px;border-radius:8px;font:800 18px Montserrat;color:#fff;background:${['#5a7fb0', '#888', '#a86a6a', '#6f9a74', '#333'][i]}">${b}</span>`).join(''), `left:20px;top:440px`);
  show(btnRow, 36.7, { d: .3 }); chaos.push(btnRow);
  const errs = [['ERROR 401', 'Invalid API key', 36.75, 130, 120], ['WARNING', 'Token limit exceeded', 37.3, 330, 230], ['ERROR', 'CUDA out of memory', 37.9, 180, 320]].map(([h, m, t, x, y]) => {
    const e = mk(scr, `<div style="background:#c94b4b;color:#fff;font:800 20px Montserrat;padding:8px 14px">⚠ ${h}</div><div class="mono" style="padding:14px;font-size:20px;color:${K}">${m}</div>`,
      `left:${x}px;top:${y}px;width:400px;background:#fff;border:3px solid ${K};box-shadow:0 10px 0 rgba(0,0,0,.2)`);
    show(e, t, { from: { scale: .6 }, d: .25, ease: 'back.out(2)', s: 'error', v: .7 }); chaos.push(e); return e;
  });
  // confused person
  const person = mk(c, `<svg width="360" height="520" viewBox="0 0 360 520" stroke="${K}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">
      <path d="M40 520 C40 380 90 330 180 330 C270 330 320 380 320 520Z" fill="${B}"/>
      <path d="M150 330 L180 380 L210 330" fill="none"/>
      <rect x="155" y="280" width="50" height="60" fill="#e7b48f"/>
      <ellipse cx="180" cy="200" rx="92" ry="102" fill="#f0c19c"/>
      <path d="M88 196 C80 120 120 88 180 88 C250 88 284 130 272 196 C262 160 236 138 190 140 C150 142 120 150 88 196Z" fill="#4a3a33"/>
      <g class="confused">
        <path d="M128 168 L160 178" /><path d="M204 182 L236 166"/>
        <circle cx="146" cy="206" r="9" fill="${K}"/><circle cx="216" cy="206" r="9" fill="${K}"/>
        <path d="M150 262 Q165 250 180 262 Q195 274 210 262" fill="none"/>
      </g>
      <g class="happy" opacity="0">
        <path d="M128 172 Q146 160 164 172" fill="none"/><path d="M198 172 Q216 160 234 172" fill="none"/>
        <path d="M134 206 Q146 194 158 206" fill="none"/><path d="M204 206 Q216 194 228 206" fill="none"/>
        <path d="M146 250 Q180 290 214 250Z" fill="#fff"/>
        <circle cx="120" cy="236" r="12" fill="${R}" stroke="none" opacity=".45"/><circle cx="240" cy="236" r="12" fill="${R}" stroke="none" opacity=".45"/>
      </g>
      <path class="scratch" d="M276 300 C300 250 300 190 278 150" fill="none" stroke-width="34" stroke="${B}"/>
      <path class="scratch" d="M276 300 C300 250 300 190 278 150" fill="none" stroke-width="4"/>
      <circle class="scratch" cx="270" cy="140" r="26" fill="#f0c19c"/>
    </svg>`, `left:40px;top:1110px`);
  show(person, 36.5, { from: { y: 200, scale: 1 }, d: .5, ease: 'power3.out' });
  const qs = [[300, 1060, 90, 37.0], [40, 1020, 70, 37.5], [330, 1200, 60, 38.0], [170, 980, 80, 38.2]].map(([x, y, s, t]) => {
    const e = icon(c, 'question', x, y, s, t > 37.9 ? G : R); show(e, t, { from: { rotation: -40 }, rot: 10, s: 'pop', v: .5 }); return e;
  });
  // the snap
  hop(39.15, 1.08); sfx(39.15, 'snap'); point(armL, 39.0, -24, 2.2);
  react(39.2, 'wand', -250, -330, 130, 1.4);
  chaos.forEach((e, i) => tl.to(e, { autoAlpha: 0, scale: 0, rotation: (i % 2 ? 140 : -140), x: 470 - (parseFloat(e.style.left) || 0) - 120, y: 220 - (parseFloat(e.style.top) || 0), duration: .4, ease: 'power3.in' }, 39.2 + i * .012));
  qs.forEach(e => hide(e, 39.25));
  tl.to(mon.querySelector('.screen'), { backgroundColor: C, duration: .3 }, 39.4);
  set(person.querySelector('.confused'), 39.6, { opacity: 0 }); set(person.querySelector('.happy'), 39.6, { opacity: 1 });
  person.querySelectorAll('.scratch').forEach(e => set(e, 39.6, { opacity: 0 }));
  const steps = [['ИДЕЯ', 'bulb', 39.45], ['ОПИШИ Я', 'chat', 39.75], ['РЕЗУЛТАТ', 'image', 40.05]].map(([txt, ic, t], i) => {
    const e = mk(scr, `<div style="position:absolute;left:-14px;top:-14px;width:56px;height:56px;border-radius:50%;background:${K};color:${G};font:900 30px/56px Montserrat;text-align:center">${i + 1}</div>
      <div style="width:130px;height:130px;margin:40px auto 16px">${I[ic]()}</div><div class="lbl" style="text-align:center;font-size:28px;color:${K};letter-spacing:.06em">${txt}</div>`,
      `left:${40 + i * 296}px;top:110px;width:250px;height:280px;background:#fff;border:5px solid ${K};border-radius:24px;box-shadow:0 10px 0 rgba(23,19,24,.15)`);
    show(e, t, { from: { y: 60 }, s: 'pop' }); return e;
  });
  [0, 1].forEach(i => { const a = mk(scr, `<svg width="50" height="40"><path d="M4 20 H40 M28 8 L42 20 L28 32" stroke="${R}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`, `left:${284 + i * 296}px;top:230px`); show(a, 39.7 + i * .3, { d: .3 }); });
  const easy = mk(c, `<span>AI МОЖЕ ДА</span><br><span style="background:${R};color:${C};padding:0 18px;border-radius:14px;box-decoration-break:clone">БЪДЕ ЛЕСЕН.</span>`,
    `left:60px;top:1030px;width:960px;font:900 86px/1.14 Montserrat;color:${K}`);
  tl.to(person, { y: 230, scale: .8, transformOrigin: '0% 100%', duration: .4, ease: 'power3.inOut' }, 40.1);
  show(easy, 40.3, { from: { y: 50, scale: .8 }, d: .45, ease: 'back.out(1.6)', s: 'hit' });
  react(40.6, 'sparkle', -330, -200, 90, 1.2);
  camPush(c, 36.15, 39.1, 1, 1.08); tl.to(c, { scale: 1, duration: .5, ease: 'back.out(2)' }, 39.15);
}

// =====================================================================
// SCENE 4C — LEARN TO USE AI (42.7 – 49.94)
// =====================================================================
const aiTitleHTML = (sz) => `<div class="lbl" style="font-size:${sz * .36}px;color:${G};margin-bottom:12px">НАЧИН №1</div><div style="font:900 ${sz}px/1 Montserrat;color:${C}">НАУЧИ СЕ<br>ДА ИЗПОЛЗВАШ <span style="color:${G}">AI</span></div>`;
{
  wipe(42.7, [G, K]);
  const S = scene('bg-dark', 42.7, 49.94), c = S.cam;
  const title = mk(c, aiTitleHTML(84), `left:60px;top:440px;width:960px`);
  show(title, 42.75, { from: { x: -100, scale: 1 }, d: .5, ease: 'power3.out' });
  const cards = [
    ['AI ИНСТРУМЕНТИ', 42.95, `<div style="display:flex;gap:16px;justify-content:center;margin-top:26px">${['chat', 'image', 'play', 'wand'].map(n => `<div style="width:84px;height:84px">${I[n]()}</div>`).join('')}</div>`],
    ['СЪДЪРЖАНИЕ', 44.55, `<div class="mono typ" style="margin:24px 22px 0;padding:14px 16px;background:#fff;border:3px solid ${K};border-radius:14px;font-size:22px;height:92px;color:${K}"></div>`],
    ['ВИДЕО', 46.6, `<div style="display:flex;gap:18px;align-items:center;margin:20px 26px 0"><div style="width:90px;height:90px">${I.clapper()}</div><div style="flex:1">${[R, G, K].map((cc, i) => `<div class="bar" style="height:20px;margin:8px 0;border-radius:6px;background:${cc};width:${[90, 65, 80][i]}%;transform-origin:0 50%"></div>`).join('')}</div></div>`],
    ['ДИЗАЙН', 47.05, `<div style="display:flex;gap:16px;align-items:center;justify-content:center;margin-top:20px"><div style="width:90px;height:90px">${I.palette()}</div><img src="../assets/girlboss.jpg" style="height:110px;border:3px solid ${K};border-radius:6px"><div style="width:80px;height:80px">${I.pen()}</div></div>`],
  ].map(([h, t, inner], i) => {
    const e = mk(c, `<div class="lbl" style="font-size:28px;color:${K};margin:24px 0 0 26px">${h}</div>${inner}`,
      `left:${60 + (i % 2) * 490}px;top:${720 + Math.floor(i / 2) * 270}px;width:470px;height:250px`, 'a pp card');
    e.style.borderRadius = '24px';
    show(e, t, { from: { y: 70 }, d: .45, s: 'pop' });
    return e;
  });
  window.__typ = { el: cards[1].querySelector('.typ'), t0: 44.8, text: 'Напиши ми 5 идеи за пост за моя бранд…' };
  cards[2].querySelectorAll('.bar').forEach((b, i) => tl.fromTo(b, { scaleX: 0 }, { scaleX: 1, duration: .6, ease: 'power2.out', immediateRender: false }, 46.75 + i * .12));
  point(armL, 43.0, -20, 1.5);
  // automation modal
  cards.forEach(e => tl.to(e, { opacity: .25, duration: .3 }, 47.55));
  const auto = mk(c, `<div style="display:flex;align-items:center;gap:20px;margin:28px 34px 10px"><div class="gear" style="width:90px;height:90px">${I.gear()}</div>
        <div><div class="lbl" style="font-size:26px;color:${R}">автоматизация</div><div style="font:900 48px/1 Montserrat;color:${K}">ЕЖЕДНЕВНА РАБОТА</div></div></div>
      ${['Идеи за съдържание', 'Текстове и описания', 'План за седмицата'].map((x, i) => `<div class="row" style="display:flex;align-items:center;gap:18px;margin:16px 34px;padding:14px 20px;background:#fff;border:3px solid ${K};border-radius:16px;font:700 34px Montserrat;color:${K}"><span class="bx" style="width:44px;height:44px;border:4px solid ${K};border-radius:10px;display:inline-block;position:relative"></span>${x}</div>`).join('')}`,
    `left:110px;top:700px;width:860px;height:530px`, 'a pp card');
  show(auto, 47.6, { from: { scale: .7 }, d: .45, s: 'whoosh2', v: .6 });
  window.__gear = { el: auto.querySelector('.gear'), t0: 47.6 };
  auto.querySelectorAll('.bx').forEach((b, i) => {
    const ck = mk(b, `<svg width="44" height="44" viewBox="0 0 44 44"><path d="M8 22 L18 32 L36 10" stroke="${R}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`, `left:-4px;top:-6px`);
    show(ck, 48.1 + i * .5, { from: { scale: 2 }, d: .25, ease: 'power3.out', s: 'tick' });
  });
  camPush(c, 42.7, 49.94, 1, 1.05);
}

// =====================================================================
// SCENE 5A — TWO WAYS + POSTER BUSINESS (49.94 – 57.45)
// =====================================================================
{
  const S = scene('bg-dark', 49.94, 57.45, null), c = S.cam;
  sfx(49.9, 'whoosh');
  const left = mk(c, `<div class="dots c" style="position:absolute;inset:0"></div>
      <div style="position:absolute;left:44px;top:520px;width:460px">${aiTitleHTML(56)}</div>
      ${[['chip', 60, 840], ['chat', 270, 840], ['play', 60, 1010], ['gear', 270, 1010]].map(([n, x, y]) => `<div style="position:absolute;left:${x}px;top:${y}px;width:150px;height:150px">${I[n]()}</div>`).join('')}
      <div class="mono" style="position:absolute;left:44px;top:1190px;width:440px;padding:16px;border:3px dashed ${G};border-radius:14px;color:${C};font-size:24px">&gt; промпт + идея = резултат</div>`,
    `left:0;top:0;width:540px;height:1920px;background:${K};overflow:hidden`);
  tl.fromTo(left, { autoAlpha: 1, x: -540 }, { x: 0, duration: .5, ease: 'power3.out', immediateRender: false }, 49.94);
  const right = mk(c, `<div class="dots k" style="position:absolute;inset:0"></div>
      <div class="rt" style="position:absolute;left:40px;top:520px;width:470px"><div class="lbl" style="font-size:20px;color:${R};margin-bottom:12px">НАЧИН №2</div>
      <div style="font:900 56px/1 Montserrat;color:${K}">ЗАПОЧНИ БИЗНЕС С <span style="color:${R}">ПОСТЕРИ</span> ОТ НУЛАТА</div></div>
      <div class="blank" style="position:absolute;left:110px;top:830px;width:300px;height:424px;border:5px dashed #9c8a92;border-radius:10px;background:#fff"></div>
      <img class="fill" src="../assets/car.png" style="position:absolute;left:110px;top:830px;width:300px;height:424px;border:5px solid ${K};border-radius:10px;clip-path:inset(0 0 100% 0)">`,
    `left:540px;top:0;width:540px;height:1920px;background:${B};overflow:hidden`);
  tl.fromTo(right, { autoAlpha: 1, x: 540 }, { x: 0, duration: .5, ease: 'power3.out', immediateRender: false }, 50.05);
  const div = mk(c, '', `left:536px;top:0;width:8px;height:1920px;background:${G}`);
  tl.fromTo(div, { autoAlpha: 1, scaleY: 0 }, { scaleY: 1, duration: .5, ease: 'power3.out', immediateRender: false }, 50.1);
  const two = mk(c, `2 НАЧИНА ДА ТИ ПОМОГНА`, `left:300px;top:420px;`, 'a pp chipT');
  two.style.background = G; two.style.fontSize = '30px';
  show(two, 50.35, { d: .4, s: 'pop', v: .6 }); hide(two, 52.45);
  tl.to(right.querySelector('.fill'), { clipPath: 'inset(0 0 0% 0)', duration: .9, ease: 'power2.inOut' }, 51.3); sfx(51.3, 'brush', .8);
  // expand right side to full
  tl.to(left, { x: -560, duration: .55, ease: 'power3.inOut' }, 52.5);
  tl.to(div, { x: -560, duration: .55, ease: 'power3.inOut' }, 52.5);
  tl.to(right, { left: 0, width: 1080, duration: .55, ease: 'power3.inOut' }, 52.5);
  tl.to(right.querySelector('.rt'), { width: 960, top: 440, duration: .55, ease: 'power3.inOut' }, 52.5); sfx(52.45, 'whoosh2', .7);
  tl.to(right.querySelector('.blank'), { autoAlpha: 0, duration: .2 }, 52.5);
  tl.to(right.querySelector('.fill'), { left: 70, top: 700, width: 330, height: 467, rotation: -3, duration: .55, ease: 'power3.inOut' }, 52.5);
  const pipe = [['printer', 'ПЕЧАТ', 450, 680, 53.4], ['box', 'ОПАКОВКА', 760, 680, 53.95]].map(([ic, t, x, y, tt]) => {
    const e = mk(c, `<div style="width:140px;height:140px;margin:22px auto 8px">${I[ic]()}</div><div class="lbl" style="text-align:center;font-size:24px">${t}</div>`, `left:${x}px;top:${y}px;width:260px;height:240px;border-radius:24px`, 'a pp card');
    show(e, tt, { from: { y: 50 }, s: 'pop' }); return e;
  });
  sfx(53.5, 'printer', .5);
  const shop = mk(c, `<div style="display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:3px solid ${K}"><i style="width:14px;height:14px;border-radius:50%;background:${R}"></i><i style="width:14px;height:14px;border-radius:50%;background:${G}"></i><span class="lbl" style="font-size:20px;margin-left:8px">онлайн магазин</span></div>
      <div style="display:flex;gap:16px;padding:16px 20px">${['car.png', 'caric.jpg', 'hands.jpg'].map(f => `<img src="../assets/${f}" style="width:120px;height:160px;object-fit:cover;border:3px solid ${K};border-radius:6px">`).join('')}
      <div style="display:flex;flex-direction:column;justify-content:center;gap:10px"><div style="width:70px;height:70px">${I.tag()}</div></div></div>
      <div class="buy" style="position:absolute;right:22px;bottom:18px;background:${R};color:${C};font:800 24px Montserrat;padding:10px 20px;border-radius:999px;border:3px solid ${K}">ПОРЪЧАЙ</div>`,
    `left:450px;top:950px;width:570px;height:300px;border-radius:24px;overflow:hidden`, 'a pp card');
  show(shop, 54.6, { from: { y: 60 }, s: 'pop' });
  tl.to(shop.querySelector('.buy'), { scale: .9, duration: .1, yoyo: true, repeat: 1 }, 55.2); sfx(55.2, 'click');
  point(armL, 53.3, -22, 1.6);
  // from zero
  [right.querySelector('.fill'), ...pipe, shop].forEach((e, i) => tl.to(e, { autoAlpha: 0, scale: .7, duration: .3, ease: 'power2.in' }, 55.6 + i * .03));
  tl.to(right.querySelector('.rt'), { autoAlpha: 0, duration: .25 }, 55.6);
  const zero = mk(c, `<div class="h-serif" style="font-size:520px;line-height:1;color:transparent;-webkit-text-stroke:12px ${K};text-align:center">0</div>`, `left:0;top:400px;width:1080px`);
  show(zero, 55.75, { from: { scale: 3, y: -100 }, d: .45, ease: 'power4.in', s: 'thud' });
  shake(c, 56.2, 16);
  const zTag = mk(c, `ОТ <span style="color:${G}">АБСОЛЮТНАТА</span> НУЛА`, `left:60px;top:1010px;width:960px;text-align:center;font:900 70px/1.1 Montserrat;color:${C};background:${K};padding:22px;border-radius:22px;transform-origin:50% 50%`);
  show(zTag, 56.3, { from: { rotation: -8, scale: 1.4 }, rot: -3, d: .35, ease: 'power4.out', s: 'stamp' });
}

// =====================================================================
// SCENE 5B — THE ROADMAP (57.45 – 60.15)
// =====================================================================
{
  wipe(57.45, [R, K]);
  const S = scene('bg-cream', 57.45, 60.15, 'k'), c = S.cam;
  const head = mk(c, `<div class="lbl" style="font-size:30px;color:${R}">по същата схема</div><div style="font:900 74px/1 Montserrat;color:${K}">ПО КОЯТО ЗАПОЧНАХ</div>`, `left:60px;top:440px;width:960px`);
  show(head, 57.5, { from: { y: 40, scale: 1 }, d: .4, ease: 'power3.out' });
  const nodes = [[170, 700], [540, 760], [900, 830], [700, 1060], [300, 1110]];
  const dPath = `M${nodes[0][0]} ${nodes[0][1]} C 330 680, 420 790, ${nodes[1][0]} ${nodes[1][1]} S 820 760, ${nodes[2][0]} ${nodes[2][1]} S 900 1050, ${nodes[3][0]} ${nodes[3][1]} S 420 1060, ${nodes[4][0]} ${nodes[4][1]}`;
  const road = mk(c, `<svg width="1080" height="1300"><path d="${dPath}" stroke="${B}" stroke-width="26" fill="none" stroke-linecap="round"/><path class="rp" d="${dPath}" stroke="${K}" stroke-width="7" fill="none" stroke-dasharray="18 16" stroke-linecap="round"/></svg>`, `left:0;top:0`);
  set(road, 57.5, { autoAlpha: 1 });
  const rp = road.querySelector('.rp'); const len = 1700;
  const mask = mk(road, '', '', 'a'); // placeholder
  rp.style.strokeDasharray = `${len}`; rp.style.strokeDashoffset = len;
  tl.to(rp, { strokeDashoffset: 0, duration: 2.3, ease: 'none' }, 57.6);
  const labels = [['ПРОДУКТИ', 'box'], ['ДИЗАЙН', 'pen'], ['ПЕЧАТ', 'printer'], ['ЦЕНИ', 'tag'], ['ПЪРВИ КЛИЕНТИ', 'users']];
  nodes.forEach(([x, y], i) => {
    const e = mk(c, `<div style="width:124px;height:124px;border-radius:50%;background:${C};border:5px solid ${K};padding:16px;box-shadow:0 10px 0 rgba(23,19,24,.15)">${I[labels[i][1]]()}</div>
      <div style="position:absolute;left:50%;top:132px;transform:translateX(-50%);white-space:nowrap;font:800 28px Montserrat;color:${K};background:${i == 4 ? G : C};padding:6px 14px;border-radius:999px;border:3px solid ${K}">${i + 1}. ${labels[i][0]}</div>`,
      `left:${x - 62}px;top:${y - 62}px;width:124px;height:124px`);
    show(e, 57.65 + i * .44, { s: 'pop', v: .7 });
  });
  const tok = mk(c, `<div style="width:110px;height:110px;border-radius:50%;border:5px solid ${G};background:url(assets/avatar.png) 52% 34%/360px auto ${R};box-shadow:0 8px 0 rgba(0,0,0,.2)"></div>`, `left:0;top:0;width:110px;height:110px`);
  window.__road = { tok, path: rp, t0: 57.6, t1: 59.9 };
  set(tok, 57.6, { autoAlpha: 1 });
}

// =====================================================================
// SCENE 5C — NOT A BIG BUDGET (60.15 – 68.42)
// =====================================================================
{
  wipe(60.15, [G, R]);
  const S = scene('bg-beige', 60.15, 68.42, 'k'), c = S.cam;
  const bag = icon(c, 'bag', 330, 520, 420);
  show(bag, 60.35, { from: { y: -300, rotation: -20 }, d: .6, ease: 'bounce.out', s: 'coins' });
  const bills = [[140, 760, -14], [740, 720, 12], [600, 880, -6]].map(([x, y, r], i) => { const e = icon(c, 'bills', x, y, 200); show(e, 60.6 + i * .08, { rot: r, s: i ? '' : 'pop' }); return e; });
  const bt = mk(c, `ОГРОМЕН БЮДЖЕТ`, `left:0;top:1000px;width:1080px;text-align:center;font:900 92px Montserrat;color:${K}`);
  show(bt, 61.9, { from: { y: 40, scale: 1 }, d: .35, ease: 'power3.out' });
  const X = mk(c, `<svg width="700" height="700" viewBox="0 0 700 700"><path class="x1" d="M90 90 L610 610" stroke="${R}" stroke-width="70" stroke-linecap="round"/><path class="x2" d="M610 90 L90 610" stroke="${R}" stroke-width="70" stroke-linecap="round"/></svg>`, `left:190px;top:440px`);
  set(X, 62.55, { autoAlpha: 1 });
  [X.querySelector('.x1'), X.querySelector('.x2')].forEach((p, i) => { p.style.strokeDasharray = 740; p.style.strokeDashoffset = 740; tl.to(p, { strokeDashoffset: 0, duration: .16, ease: 'power3.in' }, 62.55 + i * .14); });
  sfx(62.6, 'stamp'); sfx(62.74, 'stamp'); shake(c, 62.72, 14);
  tl.to(bt, { color: '#9a8890', textDecoration: 'line-through', duration: .01 }, 62.7);
  [bag, ...bills, X, bt].forEach((e, i) => hide(e, 63.05 + i * .03, { scale: .2, to: { y: 300 } }));
  // formula
  const items = [['ИДЕЯ', 'bulb', 63.55], ['ЖЕЛАНИЕ', 'heart', 64.5], ['НЯКОЙ ДА ТИ ПОКАЖЕ', null, 65.3]];
  items.forEach(([t, ic, tt], i) => {
    const inner = ic ? `<div style="width:170px;height:170px;margin:30px auto 10px">${I[ic]()}</div>` :
      `<div style="width:170px;height:170px;margin:30px auto 10px;border-radius:50%;border:6px solid ${K};background:url(assets/avatar.png) 52% 32%/560px auto ${R}"></div>`;
    const e = mk(c, `${inner}<div style="text-align:center;font:900 ${i == 2 ? 26 : 34}px/1.1 Montserrat;color:${K};padding:0 14px">${t}</div>`,
      `left:${50 + i * 340}px;top:540px;width:300px;height:330px;border-radius:26px;${i == 2 ? `background:${G}` : ''}`, 'a pp card');
    show(e, tt, { from: { y: 80, rotation: (i - 1) * 10 }, rot: (i - 1) * 2, s: 'pop' });
    if (i < 2) { const p = mk(c, '+', `left:${330 + i * 340}px;top:640px;width:80px;text-align:center;font:900 90px Montserrat;color:${R}`); show(p, tt + .3, { d: .3 }); }
  });
  const start = mk(c, `<div style="display:flex;align-items:center;justify-content:center;gap:24px"><div style="width:140px;height:140px">${I.pin()}</div><div style="text-align:left"><div class="lbl" style="font-size:28px;color:${R}">= откъде да започнеш</div><div style="font:900 100px/1 Montserrat;color:${K}">ТВОЯТ СТАРТ</div></div></div>`,
    `left:0;top:940px;width:1080px`);
  show(start, 67.0, { from: { y: 60, scale: .8 }, d: .5, s: 'ding' });
  react(67.3, 'rocket', -330, -260, 110, 1.0);
  camPush(c, 63.0, 68.42, 1, 1.05);
}

// =====================================================================
// SCENE 6A — FOLLOW (68.42 – 73.62)
// =====================================================================
{
  wipe(68.42, [K, G, C]);
  const S = scene('bg-rose', 68.42, 73.62, 'c'), c = S.cam;
  presTo(68.42, P.center, .01, 'none');
  const ring = mk(c, `<svg width="1000" height="1000"><circle cx="500" cy="500" r="430" stroke="${G}" stroke-width="5" fill="none" stroke-dasharray="4 16" stroke-linecap="round"/><circle cx="500" cy="500" r="360" stroke="${C}" stroke-opacity=".35" stroke-width="3" fill="none"/></svg>`, `left:40px;top:640px`);
  show(ring, 68.5, { from: { scale: .6, rotation: -60 }, d: .8, ease: 'power3.out' });
  const orbit = mk(c, '', `left:540px;top:1140px;width:0;height:0`);
  set(orbit, 68.5, { autoAlpha: 1 });
  const on = ['chip', 'laptop', 'palette', 'printer', 'image', 'play', 'pen', 'sparkle'];
  const els = on.map((n, i) => { const e = icon(orbit, n, 0, 0, 120); show(e, 68.6 + i * .06, { d: .4 }); return e; });
  window.__orbit2 = { els, t0: 68.5, r: 430 };
  const head = mk(c, `ПОСЛЕДВАЙ МЕ<br><span style="color:${K}">ЗА ОЩЕ!</span>`, `left:0;top:440px;width:1080px;text-align:center;font:900 108px/1 Montserrat;color:${C};text-shadow:0 8px 0 rgba(23,19,24,.15)`);
  show(head, 68.8, { from: { y: 60, scale: .8 }, d: .5, s: 'hit' });
  const chips = ['УЧИМ', 'ЕКСПЕРИМЕНТИРАМЕ', 'СЪЗДАВАМЕ'];
  const cw = mk(c, chips.map(x => `<span class="ch chipT" style="font-size:30px;padding:10px 20px;margin:0 6px">${x}</span>`).join(''), `left:0;top:690px;width:1080px;text-align:center`);
  set(cw, 70.3, { autoAlpha: 1 });
  [...cw.children].forEach((e, i) => show(e, [70.45, 71.15, 72.0][i], { from: { y: 30 }, d: .35, s: 'pop', v: .6 }));
  const together = mk(c, `<span style="width:56px;height:56px;display:inline-block;vertical-align:middle">${I.heart(C)}</span> ЗАЕДНО`, `left:0;top:790px;width:1080px;text-align:center;font:900 52px Montserrat;color:${C}`);
  show(together, 72.6, { d: .4, s: 'ding', v: .6 });
  // follow button
  const btn = mk(fx, `<div class="f1" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:16px;font:900 52px Montserrat;color:${K}"><span style="font-size:70px;line-height:0;margin-top:-6px">+</span>ПОСЛЕДВАЙ</div>
      <div class="f2" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:16px;font:900 52px Montserrat;color:${G};opacity:0"><span style="width:56px;height:56px;display:inline-block">${I.check()}</span>СЛЕДВАШ</div>`,
    `left:240px;top:1560px;width:600px;height:130px;border-radius:999px;background:${C};border:5px solid ${K};box-shadow:0 14px 0 rgba(23,19,24,.3)`);
  show(btn, 69.1, { from: { y: 120, scale: .6 }, d: .5, s: 'pop' });
  const cur = icon(fx, 'cursor', 900, 1900, 110);
  tl.fromTo(cur, { autoAlpha: 1, x: 0, y: 0 }, { x: -260, y: -250, duration: .6, ease: 'power3.out', immediateRender: false }, 69.55);
  tl.to(cur, { scale: .85, duration: .08, yoyo: true, repeat: 1 }, 70.15);
  tl.to(btn, { scale: .93, duration: .08, yoyo: true, repeat: 1 }, 70.15); sfx(70.15, 'click');
  tl.to(btn, { backgroundColor: K, borderColor: G, duration: .15 }, 70.25);
  set(btn.querySelector('.f1'), 70.25, { opacity: 0 }); set(btn.querySelector('.f2'), 70.25, { opacity: 1 });
  sfx(70.3, 'notif');
  hide(cur, 70.6);
  [[200, 1500], [860, 1520], [140, 1700], [900, 1700]].forEach(([x, y], i) => { const e = icon(fx, i % 2 ? 'heart' : 'sparkle', x, y, 70); show(e, 70.3 + i * .05, { d: .3 }); hide(e, 71.3 + i * .05, { to: { y: -120 } }); });
  hide(btn, 73.5, { d: .2 });
}

// =====================================================================
// SCENE 6B — WHAT DO YOU WANT TO LEARN NEXT (73.62 – 87)
// =====================================================================
{
  wipe(73.62, [G, K]);
  const S = scene('bg-cream', 73.62, DUR + 1, 'k'), c = S.cam;
  presTo(73.62, P.left, .01, 'none');
  const q = mk(c, `<div style="background:${R};padding:26px 40px 22px;border-bottom:5px solid ${K}"><div class="lbl" style="font-size:28px;color:${C}">твоят избор</div>
        <div style="font:900 70px/1.02 Montserrat;color:${C}">КАКВО ИСКАШ ДА<br>НАУЧИШ СЛЕДВАЩО?</div></div>
      <div class="opts" style="padding:26px 34px"></div>`,
    `left:60px;top:430px;width:960px;height:840px;border-radius:34px;overflow:hidden;transform-origin:50% 0`, 'a pp card');
  tl.fromTo(q, { autoAlpha: 0, rotationX: -80, y: -40 }, { autoAlpha: 1, rotationX: 0, y: 0, duration: .7, ease: 'back.out(1.4)', immediateRender: false }, 73.9); sfx(73.9, 'whoosh2');
  const opts = [['A', 'AI ИНСТРУМЕНТИ', 'chip', 77.2, 46], ['B', 'СЪЗДАВАНЕ НА ВИДЕО', 'clapper', 78.35, 31], ['C', 'БИЗНЕС С ПОСТЕРИ', 'image', 81.0, 23]];
  const optEls = opts.map(([L, txt, ic, t, pct], i) => {
    const e = mk(q.querySelector('.opts'), `<div style="display:flex;align-items:center;gap:22px">
        <div style="width:64px;height:64px;border-radius:50%;background:${K};color:${G};font:900 34px/64px Montserrat;text-align:center;flex:none">${L}</div>
        <div style="width:84px;height:84px;flex:none">${I[ic]()}</div>
        <div style="font:900 40px Montserrat;color:${K}">${txt}</div></div>
        <div style="height:14px;border-radius:7px;background:${B};margin:16px 0 0 0;overflow:hidden"><div class="pb" style="height:100%;width:${pct * 1.8}%;background:${[R, G, K][i]};transform-origin:0 50%;transform:scaleX(0)"></div></div>`,
      `position:relative;margin-bottom:26px;padding:20px 24px;border:4px solid ${K};border-radius:22px;background:#fff`, 'pp');
    show(e, t, { from: { x: 120, scale: 1 }, d: .45, ease: 'power3.out', s: 'pop' });
    tl.to(e.querySelector('.pb'), { scaleX: 1, duration: 1.2, ease: 'power2.out' }, t + .3);
    return e;
  });
  react(74.4, 'question', 340, -330, 120, 1.6);
  // comments
  tl.to(q, { scale: .78, y: -60, duration: .5, ease: 'power3.inOut' }, 82.6);
  const cm = mk(c, `<div style="width:220px;height:220px">${I.comment()}</div><div class="badge" style="position:absolute;right:-6px;top:-6px;min-width:70px;height:70px;border-radius:35px;background:${R};border:5px solid ${K};color:${C};font:900 36px/60px Montserrat;text-align:center">1</div>`,
    `left:800px;top:1180px;width:220px;height:220px`);
  show(cm, 82.75, { from: { rotation: -30 }, d: .55, ease: 'elastic.out(1,.5)', s: 'notif' });
  window.__cm = { el: cm, t0: 83.3 };
  const cmt = ['Искам AI инструменти!', 'Бизнес с постери ✓', 'Видео, моля!'];
  cmt.forEach((txt, i) => {
    const e = mk(c, txt, `left:${420 - i * 40}px;top:${1430 + i * 0}px;font:700 32px Montserrat;color:${K};background:#fff;border:4px solid ${K};border-radius:26px 26px 26px 6px;padding:14px 22px;white-space:nowrap;box-shadow:0 8px 0 rgba(23,19,24,.15)`);
    tl.fromTo(e, { autoAlpha: 0, y: 60, scale: .6 }, { autoAlpha: 1, y: -60 - i * 0, scale: 1, duration: .4, ease: 'back.out(1.6)', immediateRender: false }, 83.2 + i * .55);
    tl.to(e, { y: -330, autoAlpha: 0, duration: 1.2, ease: 'power1.in' }, 83.75 + i * .55);
    sfx(83.2 + i * .55, 'notif', .5);
  });
  const arr = mk(c, `<svg width="420" height="260" viewBox="0 0 420 260"><path class="ap" d="M20 230 C120 220 240 190 330 110" stroke="${K}" stroke-width="9" fill="none" stroke-linecap="round" stroke-dasharray="14 14"/><path d="M296 92 L346 96 L332 146" stroke="${K}" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`, `left:420px;top:1180px`);
  show(arr, 82.9, { from: { x: -60, scale: .8 }, d: .4, ease: 'power3.out' });
  point(armR, 82.7, 58, null, 0);
  const pick = mk(c, `ТИ ИЗБИРАШ!`, `left:300px;top:1000px;font:900 72px Montserrat;color:${K};background:${G};padding:14px 34px;border:5px solid ${K};border-radius:20px;box-shadow:0 12px 0 rgba(23,19,24,.2)`);
  show(pick, 84.1, { from: { scale: 2, rotation: 14 }, rot: -4, d: .35, ease: 'power4.out', s: 'stamp' });
  // end lockup
  const lock = mk(c, `<span class="h-serif" style="font-size:56px;color:${K}">Hristiyana</span> <span style="font:800 24px Montserrat;letter-spacing:.4em;color:${R}">CREATIVE</span>`, `left:0;top:290px;width:1080px;text-align:center`);
  show(lock, 86.15, { from: { y: 20, scale: 1 }, d: .5, ease: 'power2.out' });
  hop(84.1, 1.05);
}

// =====================================================================
// procedural per-frame layer
// =====================================================================
const blinks = []; { let t = 1.3; let k = 7; while (t < DUR) { blinks.push(t); k = (k * 9301 + 49297) % 233280; t += 2.6 + (k / 233280) * 2.6; } }
const ENV = window.ENV;
function face_(t) {
  let b = 0;
  for (const bt of blinks) { const d = t - bt; if (d >= 0 && d < .2) { b = d < .07 ? d / .07 : d < .12 ? 1 : 1 - (d - .12) / .08; break; } }
  lidL.style.transform = `scaleY(${b})`; lidR.style.transform = `scaleY(${b})`;
  lashL.style.opacity = b > .6 ? 1 : 0; lashR.style.opacity = b > .6 ? 1 : 0;
  const f = Math.floor(t * 30); const e = (ENV[f] || 0);
  const h = e * 11;
  if (h < .8) { mouth.setAttribute('d', ''); teeth.setAttribute('d', ''); }
  else {
    mouth.setAttribute('d', `M562 606 Q610 ${611 - h * .25} 660 603 Q612 ${611 + h * 1.9} 562 606Z`);
    teeth.setAttribute('d', h > 5 ? `M574 607 Q610 ${611 - h * .2} 648 605 Q610 ${612 + h * .5} 574 607Z` : '');
  }
}
function idle(t) {
  const r = Math.sin(t * .9) * 1.1 + Math.sin(t * 2.3) * .4;
  const y = Math.sin(t * 1.7) * 5;
  gsap.set(presIn, { rotation: r, y });
}
function procedural(t) {
  // terminal typing
  const tt = window.__termTxt;
  if (tt) {
    const full = 'Мислиш, че AI е само за програмисти?';
    const n = Math.max(1, Math.min(full.length, Math.floor((t + .05) / .038)));
    const cur = (Math.floor(t * 3) % 2 === 0 || n < full.length) ? `<span style="background:${G};color:${G}">_</span>` : '<span style="opacity:0">_</span>';
    tt.innerHTML = '<span style="color:' + R + '">&gt;</span> ' + full.slice(0, n).replace('AI', `<span style="color:${G}">AI</span>`) + cur;
  }
  // orbits
  for (const o of [window.__orbit1, window.__orbit2]) {
    if (!o) continue;
    const base = (t - o.t0) * .35;
    o.els.forEach((e, i) => {
      const a = base + i / o.els.length * Math.PI * 2;
      const sq = o === window.__orbit1 ? .62 : 1;
      e.style.left = (Math.cos(a) * o.r - e.offsetWidth / 2) + 'px';
      e.style.top = (Math.sin(a) * o.r * sq - e.offsetHeight / 2) + 'px';
    });
  }
  if (window.__heart) { const k = 1 + Math.max(0, Math.sin(t * 8)) * .06; window.__heart.firstChild.style.transform = `scale(${k})`; }
  if (window.__gear) window.__gear.el.style.transform = `rotate(${Math.max(0, t - window.__gear.t0) * 120}deg)`;
  if (window.__typ) {
    const o = window.__typ, n = Math.max(0, Math.min(o.text.length, Math.floor((t - o.t0) / .045)));
    o.el.innerHTML = o.text.slice(0, n) + (t > o.t0 ? `<span style="color:${R}">▍</span>` : '');
  }
  if (window.__road) {
    const o = window.__road, p = Math.max(0, Math.min(1, (t - o.t0) / (o.t1 - o.t0)));
    const L = o.path.getTotalLength(), pt = o.path.getPointAtLength(L * p);
    o.tok.style.left = (pt.x - 55) + 'px'; o.tok.style.top = (pt.y - 55 - 70) + 'px';
  }
  if (window.__cm && t > window.__cm.t0) { window.__cm.el.firstChild.style.transform = `translateY(${-Math.abs(Math.sin((t - window.__cm.t0) * 5)) * 14}px)`; }
  // reaction bubbles follow the presenter head
  const px = gsap.getProperty(pres, 'x'), py = gsap.getProperty(pres, 'y'), ps = gsap.getProperty(pres, 'scale');
  const hx = px + 600 * ps, hy = py + 470 * ps;
  for (const e of reacts) { e.style.left = (hx + (+e.dataset.dx) - e.offsetWidth / 2) + 'px'; e.style.top = (hy + (+e.dataset.dy) - e.offsetHeight / 2) + 'px'; }
}

window.DUR = DUR;
window.seek = (t) => {
  tl.time(t, false);
  idle(t); face_(t); procedural(t); renderCaps(t);
};
window.tl = tl;
Promise.all([document.fonts.ready, ...[...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))]).then(() => {
  // preload all images in the page
  return Promise.all([...document.querySelectorAll('img')].map(i => i.decode ? i.decode().catch(() => 0) : 0));
}).then(() => { window.seek(0); window.ready = true; });

// live preview: open index.html#play
if (location.hash === '#play') {
  const au = new Audio('assets/voiceover.mp3');
  document.body.addEventListener('click', () => { au.play(); const t0 = performance.now(); const loop = () => { window.seek((performance.now() - t0) / 1000); requestAnimationFrame(loop); }; loop(); }, { once: true });
}
})();
