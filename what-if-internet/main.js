// Page contract for core/render: window.render(t), window.READY, window.DUR, window.TEXTS(t)
import { createWorld, updateWorld, T } from './world.js';
import { CUES } from './cues.js';
import { clamp, lerp, seg, ss, eo, back, hash } from '/core/lib.js';

const DUR = 77.5; window.DUR = DUR;
for (const f of ['600 40px Corm', '500 40px Sans', 'italic 500 40px Corm', '600 40px Sans']) await document.fonts.load(f, 'АБВ abc 123');
await document.fonts.ready;
const W = createWorld(document.getElementById('gl'));
const $ = s => document.querySelector(s);
const el = { title: $('#title'), big: $('#title .big'), kicker: $('#title .kicker'), counter: $('#counter'), lab: $('#counter .lab'), num: $('#counter .num'),
  stage: $('#stagebig'), sn: $('#stagebig .n'), su: $('#stagebig .u'), sub: $('#sub'), flash: $('#flash'), black: $('#black'), end1: $('#end1'), end2: $('#end2'), logo: $('#logo'), shade: $('#shade'), vig: $('#vignette') };

// title letters
const TITLE = ['ИНТЕРНЕТЪТ', 'ИЗЧЕЗНЕ', 'ЗАВИНАГИ?'];
el.big.innerHTML = TITLE.map(l => [...l].map(ch => `<span>${ch}</span>`).join('')).join('<br>');
const letters = [...el.big.querySelectorAll('span')];

const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const plural = (n, one, many) => (n === 1 ? one : many);
function counterAt(t) {
  if (t < T.s10) {   // people online, ticking up — then crashing to zero
    const crash = seg(t, 5.25, 6.1);
    const n = (5512304118 + t * 2117) * (1 - eo(crash));
    return { lab: 'ХОРА ОНЛАЙН В МОМЕНТА', n: fmt(n), u: '', red: crash > 0 };
  }
  const lab = 'ВРЕМЕ БЕЗ ИНТЕРНЕТ';
  if (t < T.h1) { const n = Math.max(1, Math.round(10 * seg(t, T.s10 + .1, 9.6))); return { lab, n: fmt(n), u: plural(n, 'СЕКУНДА', 'СЕКУНДИ') }; }
  if (t < T.h24) return { lab, n: '1', u: 'ЧАС' };
  if (t < T.d7) { const n = 1 + Math.round(23 * seg(t, T.h24 + .3, 25.4)); return { lab, n: fmt(n), u: plural(n, 'ЧАС', 'ЧАСА') }; }
  if (t < T.y1) { const n = 1 + Math.round(6 * seg(t, T.d7 + .2, 29.0)); return { lab, n: fmt(n), u: plural(n, 'ДЕН', 'ДНИ') }; }
  if (t < T.y100) return { lab, n: '1', u: 'ГОДИНА' };
  if (t < T.y1k) { const n = Math.round(lerp(1, 100, ss(seg(t, T.y100 + .1, 47.6)))); return { lab, n: fmt(n), u: plural(n, 'ГОДИНА', 'ГОДИНИ') }; }
  if (t < T.y10k) { const n = Math.round(lerp(100, 1000, ss(seg(t, T.y1k + .2, 56.6)))); return { lab, n: fmt(n), u: 'ГОДИНИ' }; }
  const n = Math.round(lerp(1000, 10000, ss(seg(t, T.y10k + .1, 60.6)))); return { lab, n: fmt(n), u: 'ГОДИНИ' };
}
const STAGES = [[T.s10, '10', 'СЕКУНДИ'], [T.h1, '1', 'ЧАС'], [T.h24, '24', 'ЧАСА'], [T.d7, '7', 'ДНИ'], [T.y1, '1', 'ГОДИНА'], [T.y100, '100', 'ГОДИНИ'], [T.y1k, '1 000', 'ГОДИНИ'], [T.y10k, '10 000', 'ГОДИНИ']];

let visibleTexts = [];
window.render = (t) => {
  updateWorld(W, t);
  W.renderer.render(W.scene, W.camera);
  visibleTexts = [];
  // —— title ——
  const tIn = .15, tOut = 5.25;
  if (t < 6.2) {
    el.title.style.display = '';
    letters.forEach((s, i) => {
      const k = eo(seg(t, tIn + i * .045, tIn + i * .045 + .5));
      const g = t > tOut ? seg(t, tOut, 6.0) : 0;
      const jit = g > 0 ? (hash(i * 13 + Math.floor(t * 30)) - .5) * 40 * g : 0;
      s.style.opacity = (k * (1 - g * (hash(i + Math.floor(t * 24)) > .45 ? 1 : .4))).toFixed(3);
      s.style.transform = `translate(${jit}px, ${(1 - k) * 26 + g * g * 120 * hash(i * 7)}px)`;
      s.style.filter = `blur(${((1 - k) * 8 + g * 6).toFixed(1)}px)`;
    });
    el.kicker.style.opacity = (eo(seg(t, 0, .4)) * (1 - seg(t, tOut, 5.8))).toFixed(3);
    el.title.style.textShadow = t > tOut ? `${(6 * Math.sin(t * 50)).toFixed(1)}px 0 rgba(255,40,60,.7), ${(-6 * Math.sin(t * 50)).toFixed(1)}px 0 rgba(40,220,255,.7)` : '';
    if (t > .6 && t < tOut) visibleTexts.push({ id: 'title', text: 'КАКВО АКО ИНТЕРНЕТЪТ ИЗЧЕЗНЕ ЗАВИНАГИ?', ...box(el.title) });
  } else el.title.style.display = 'none';
  // —— counter ——
  const cv = counterAt(t), cOp = (t < 66.2 ? 1 : 1 - seg(t, 66.2, 66.7)) * eo(seg(t, .2, .8));
  el.counter.style.opacity = cOp.toFixed(3);
  el.lab.textContent = cv.lab; el.num.innerHTML = `${cv.n}${cv.u ? `<small>${cv.u}</small>` : ''}`;
  el.num.style.color = cv.red ? '#ff6b6b' : '#fff';
  // —— big stage numbers ——
  let st = null; for (const s of STAGES) if (t >= s[0] - .05 && t < s[0] + (s[1].length > 3 ? 2.3 : 1.8)) st = s;
  if (st) {
    const u = t - st[0], len = st[1].length > 3 ? 2.3 : 1.8, k = eo(seg(u, 0, .35)), o = 1 - seg(u, len - .45, len);
    el.stage.style.opacity = (k * o).toFixed(3);
    el.stage.style.transform = `scale(${(1.08 - .08 * k + u * .02).toFixed(4)})`; el.stage.style.filter = `blur(${((1 - k) * 10 + (1 - o) * 6).toFixed(1)}px)`;
    el.sn.textContent = '+' + st[1]; el.su.textContent = st[2];
  } else el.stage.style.opacity = 0;
  // —— subtitles ——
  const cue = CUES.find(c => c.show !== false && t >= c.t0 && t < c.t1);
  if (cue) { const k = Math.min(seg(t, cue.t0, cue.t0 + .18), 1 - seg(t, cue.t1 - .15, cue.t1)); el.sub.style.opacity = k.toFixed(3); el.sub.textContent = cue.text; el.sub.style.transform = `translateY(${((1 - k) * 8).toFixed(1)}px)`; }
  else el.sub.style.opacity = 0;
  // —— flash on the disconnect ——
  el.flash.style.opacity = (Math.max(0, 1 - Math.abs(t - 5.62) / .14) * .55 + Math.max(0, 1 - Math.abs(t - T.y10k) / .25) * .18).toFixed(3);
  // —— ending ——
  const bk = ss(seg(t, 66.25, 67.0));
  el.black.style.opacity = bk.toFixed(3);
  const e1 = eo(seg(t, 66.75, 67.6)) * (1 - seg(t, 72.6, 73.1)), e2 = eo(seg(t, 69.85, 70.7)) * (1 - seg(t, 72.6, 73.1));
  el.end1.style.opacity = e1.toFixed(3); el.end2.style.opacity = e2.toFixed(3);
  el.end1.style.filter = `blur(${((1 - e1) * 6).toFixed(1)}px)`; el.end2.style.filter = `blur(${((1 - e2) * 6).toFixed(1)}px)`;
  el.end1.style.transform = `translateY(${((1 - e1) * 14).toFixed(1)}px)`; el.end2.style.transform = `translateY(${((1 - e2) * 14).toFixed(1)}px)`;
  const lg = eo(seg(t, 73.35, 74.3)) * (1 - seg(t, 76.7, 77.4));
  el.logo.style.opacity = lg.toFixed(3); el.logo.style.transform = `scale(${(.96 + .04 * lg + (t - 73.35) * .004).toFixed(4)})`;
  el.shade.style.opacity = (1 - bk).toFixed(3); el.vig.style.opacity = (1 - bk).toFixed(3);
  if (e1 > .99) visibleTexts.push({ id: 'end1', text: el.end1.textContent, ...box(el.end1) });
  if (e2 > .99) visibleTexts.push({ id: 'end2', text: el.end2.textContent, ...box(el.end2) });
};
function box(e) { const r = e.getBoundingClientRect(); return { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }; }
window.TEXTS = (t) => { window.render(t); return visibleTexts; };

// sound cues exported for the mix (core/render/events.mjs)
window.EV = [
  ...W.icons.filter(i => i.kind === 'hook').map(i => ({ t: i.t0, type: 'ping', far: !i.person })),
  ...W.icons.filter(i => i.kind !== 'hook').map(i => ({ t: i.t0, type: 'err', kind: i.kind })),
  ...W.buildings.map(b => ({ t: b.crumbleT, type: 'crumble', h: b.h, x: b.x })),
  ...W.stalls.map(g => ({ t: g.userData.t0, type: 'stall' })),
  ...W.houses.map(g => ({ t: g.userData.t0, type: 'house' })),
];
window.render(0);
window.READY = true;
