// The city: one low-poly world that evolves from "today" to 10,000 years without the internet.
// Everything is a pure function of t (seconds), so any frame can be rendered on its own.
import * as THREE from '/node_modules/three/build/three.module.js';
import { mergeGeometries } from '/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
import { clamp, lerp, seg, ss, eio, eo, back, mulberry, hash, vnoise, track, env, TAU } from '/core/lib.js';

// —— story clock ——
export const T = { s10: 6.3, h1: 11.0, h24: 17.8, d7: 26.5, y1: 37.7, y100: 45.5, y1k: 51.3, y10k: 57.7, end: 66.5 };
const rnd = mulberry(20261117);
const R = (a = 0, b = 1) => a + (b - a) * rnd();
const pick = a => a[Math.floor(rnd() * a.length)];
const col = h => new THREE.Color(h);
const tmpC = new THREE.Color(), tmpC2 = new THREE.Color();
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S3 = new THREE.Vector3(), E = new THREE.Euler();
const lerpHex = (a, b, k) => tmpC.set(a).lerp(tmpC2.set(b), clamp(k)).clone();

// ——— renderer / scene / camera ———
export function createWorld(canvas) {
  const W = 1080, H = 1920;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.32;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, W / H, 1, 1600);
  scene.fog = new THREE.Fog(0xdde6ee, 160, 900);

  // ——— lights ———
  const hemi = new THREE.HemisphereLight(0xbcd4f0, 0x6b7a4a, 1.0); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -130, right: 130, top: 130, bottom: -130, near: 10, far: 600 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.4;
  sun.target.position.set(0, 0, -20); scene.add(sun, sun.target);

  // ——— sky dome ———
  const skyU = { top: { value: col('#6f9fd8') }, bot: { value: col('#f3d3a8') }, glow: { value: col('#ffd9a0') }, sunDir: { value: new THREE.Vector3(0, .3, -1) }, glowK: { value: .5 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 top, bot, glow, sunDir; uniform float glowK; varying vec3 vP;
      void main(){ float h = clamp(vP.y*1.6+.08, 0., 1.); vec3 c = mix(bot, top, pow(h, .7));
        float g = max(dot(normalize(vP), normalize(sunDir)), 0.); c += glow * (pow(g, 18.)*glowK*1.2 + pow(g, 4.)*glowK*.35);
        gl_FragColor = vec4(c, 1.);
        #include <colorspace_fragment>
      }`
  }));
  sky.renderOrder = -10; scene.add(sky);

  const W_ = { renderer, scene, camera, hemi, sun, skyU, upd: [] };
  buildGround(W_); buildBuildings(W_); buildBridge(W_); buildTrees(W_); buildCars(W_); buildPeople(W_);
  buildProps(W_); buildFX(W_); buildMountainsClouds(W_);
  return W_;
}

// ———————————————————————————— textures ————————————————————————————
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function windowTex(seed, kind) {
  const r = mulberry(seed);
  return canvasTex(256, 256, (g) => {
    g.fillStyle = kind === 'map' ? '#ffffff' : '#000'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      const x = i * 32, y = j * 32;
      if (kind === 'map') {
        g.fillStyle = '#efefef'; g.fillRect(x, y + 28, 32, 4);              // floor slab line
        g.fillStyle = '#8ea2b8'; g.fillRect(x + 9, y + 9, 14, 14);
        g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x + 9, y + 9, 14, 4);
      } else {
        const lit = r() < .5; if (!lit) continue;
        const b = .55 + r() * .45; g.fillStyle = `rgba(255,${200 + r() * 40 | 0},${130 + r() * 60 | 0},${b})`; g.fillRect(x + 9, y + 9, 14, 14);
      }
    }
  });
}
function iconTex(kind) {
  return canvasTex(128, 128, (g) => {
    g.lineCap = 'round'; g.lineJoin = 'round';
    const disc = (fill) => { g.fillStyle = fill; g.beginPath(); g.arc(64, 64, 56, 0, TAU); g.fill(); };
    if (kind === 'wifi' || kind === 'wifix') {
      disc(kind === 'wifi' ? 'rgba(20,140,255,.92)' : 'rgba(225,45,45,.95)');
      g.strokeStyle = '#fff'; g.lineWidth = 9;
      for (const r of [38, 25, 12]) { g.beginPath(); g.arc(64, 86, r, -Math.PI * .78, -Math.PI * .22); g.stroke(); }
      g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 88, 6, 0, TAU); g.fill();
      if (kind === 'wifix') { g.lineWidth = 10; g.beginPath(); g.moveTo(30, 30); g.lineTo(98, 98); g.stroke(); }
    } else if (kind === 'chat' || kind === 'chatx') {
      disc(kind === 'chat' ? 'rgba(40,200,120,.95)' : 'rgba(225,45,45,.95)');
      g.fillStyle = '#fff'; g.beginPath(); g.roundRect(28, 36, 72, 46, 14); g.fill(); g.beginPath(); g.moveTo(44, 80); g.lineTo(38, 98); g.lineTo(60, 80); g.fill();
      if (kind === 'chat') { g.fillStyle = 'rgba(40,200,120,1)'; for (const x of [46, 64, 82]) { g.beginPath(); g.arc(x, 59, 6, 0, TAU); g.fill(); } }
      else { g.strokeStyle = 'rgba(225,45,45,1)'; g.lineWidth = 8; g.beginPath(); g.moveTo(52, 47); g.lineTo(76, 71); g.moveTo(76, 47); g.lineTo(52, 71); g.stroke(); }
    } else if (kind === 'heart') {
      disc('rgba(255,70,110,.95)'); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(64, 96);
      g.bezierCurveTo(20, 66, 30, 30, 64, 50); g.bezierCurveTo(98, 30, 108, 66, 64, 96); g.fill();
    } else if (kind === 'bell') {
      disc('rgba(255,170,30,.95)'); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(40, 84); g.quadraticCurveTo(44, 40, 64, 36); g.quadraticCurveTo(84, 40, 88, 84); g.closePath(); g.fill();
      g.beginPath(); g.arc(64, 92, 8, 0, TAU); g.fill(); g.fillStyle = '#e8303a'; g.beginPath(); g.arc(94, 34, 18, 0, TAU); g.fill();
    } else if (kind === 'like') {
      disc('rgba(70,110,255,.95)'); g.fillStyle = '#fff'; g.fillRect(34, 62, 14, 32); g.beginPath(); g.moveTo(52, 62); g.lineTo(66, 30); g.quadraticCurveTo(78, 32, 74, 58); g.lineTo(94, 58);
      g.quadraticCurveTo(100, 62, 96, 70); g.lineTo(90, 92); g.lineTo(52, 94); g.closePath(); g.fill();
    } else if (kind === 'navx' || kind === 'cardx') {
      disc('rgba(225,45,45,.95)'); g.fillStyle = '#fff';
      if (kind === 'navx') { g.beginPath(); g.moveTo(64, 26); g.lineTo(92, 96); g.lineTo(64, 80); g.lineTo(36, 96); g.closePath(); g.fill(); }
      else { g.beginPath(); g.roundRect(26, 40, 76, 50, 8); g.fill(); g.fillStyle = 'rgba(225,45,45,1)'; g.fillRect(26, 52, 76, 10); }
      g.strokeStyle = '#fff'; g.lineWidth = 9; g.strokeStyle = '#ffd2d2'; g.beginPath(); g.moveTo(30, 30); g.lineTo(98, 98); g.stroke();
    } else if (kind === 'ring') {
      g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 58, 0, TAU); g.stroke();
    } else if (kind === 'glow') {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    } else if (kind === 'smoke') {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(235,235,235,.8)'); gr.addColorStop(1, 'rgba(235,235,235,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    } else if (kind === 'bird0' || kind === 'bird1') {
      g.strokeStyle = '#2a2420'; g.lineWidth = 7; g.beginPath();
      if (kind === 'bird0') { g.moveTo(20, 50); g.quadraticCurveTo(44, 40, 64, 66); g.quadraticCurveTo(84, 40, 108, 50); }
      else { g.moveTo(24, 80); g.quadraticCurveTo(44, 70, 64, 64); g.quadraticCurveTo(84, 70, 104, 80); }
      g.stroke();
    }
  });
}
function signTex(draw, w = 512, h = 256) { return canvasTex(w, h, draw); }

// ———————————————————————————— ground ————————————————————————————
function buildGround(W) {
  const { scene } = W;
  const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
  const grass = lam('#7fae5a'); const g = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), grass);
  g.rotation.x = -Math.PI / 2; g.position.y = -0.02; g.receiveShadow = true; scene.add(g);
  // river
  const water = new THREE.MeshPhongMaterial({ color: '#3f78ad', shininess: 90, specular: 0x88aacc });
  const river = new THREE.Mesh(new THREE.PlaneGeometry(3000, 23), water); river.rotation.x = -Math.PI / 2; river.position.set(0, -1.2, -14); river.receiveShadow = true; scene.add(river);
  // river banks (concrete walls → mossy)
  const bankM = lam('#b9b4a8'); const banks = [];
  for (const z of [-2.2, -25.8]) { const b = new THREE.Mesh(new THREE.BoxGeometry(3000, 1.6, 0.8), bankM); b.position.set(0, -0.6, z); b.receiveShadow = true; scene.add(b); banks.push(b); }
  const riverbed = new THREE.Mesh(new THREE.BoxGeometry(3000, 0.2, 24), lam('#2b4a63')); riverbed.position.set(0, -1.5, -14); scene.add(riverbed);
  // paved areas (they turn green with age)
  const asphalt = lam('#4a4e57'), walk = lam('#c9c3b6'), plaza = lam('#d8cfbf'), downtownPave = lam('#a7a49c');
  const box = (m, x0, x1, z0, z1, y = 0.02, hh = 0.04) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, hh, z1 - z0), m); b.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); b.receiveShadow = true; scene.add(b); return b; };
  box(walk, -400, 400, 19.6, 21.6, .05); box(walk, -400, 400, 27.4, 29.4, .05);
  box(asphalt, -400, 400, 21.6, 27.4, .03);
  box(plaza, -18, 14.5, 7.6, 19.6, .04);
  box(walk, -400, 400, -1.8, 1.0, .05);                // promenade
  box(asphalt, -25.5, -18.5, 1.0, 19.6, .035);          // bridge road (near side)
  box(downtownPave, -400, 400, -100, -26.2, .03);        // downtown blocks paving
  box(asphalt, -25.5, -18.5, -100, -26.2, .045);        // bridge road (far side)
  box(asphalt, -400, 400, -31.5, -27.5, .045);          // riverside drive
  // lane markings
  const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, .02, .22), lam('#f2efe6'), 160); let n = 0;
  for (let x = -200; x < 200; x += 5) { M4.makeTranslation(x, .07, 24.5); dash.setMatrixAt(n++, M4); }
  for (let z = -95; z < 18; z += 5) { if (z > -27 && z < 1) continue; M4.makeRotationY(Math.PI / 2).setPosition(-22, .08, z); dash.setMatrixAt(n++, M4); }
  dash.count = n; scene.add(dash);
  // zebra crossing in front of plaza
  const zebra = new THREE.InstancedMesh(new THREE.BoxGeometry(.7, .02, 5.6), lam('#f2efe6'), 10);
  for (let i = 0; i < 8; i++) { M4.makeTranslation(-6 + i * 1.4, .075, 24.5); zebra.setMatrixAt(i, M4); } zebra.count = 8; scene.add(zebra);
  W.pave = [asphalt, walk, plaza, downtownPave, bankM]; W.paveBase = W.pave.map(m => m.color.clone());
  W.markings = [dash.material, zebra.material]; W.water = water; W.grass = grass; W.banks = banks;
}

// ———————————————————————————— buildings ————————————————————————————
const TOWER_COLS = ['#ece4d4', '#d0705a', '#9fb7cc', '#f2ece0', '#c9d3d9', '#c46a55', '#a9c0b0', '#e3c29c', '#8aa3bb', '#e2d6c2', '#d9a48c', '#b9c9b4', '#f0d7b8'];
function addBuilding(W, o) {
  const { scene } = W;
  const grp = new THREE.Group(); grp.position.set(o.x, 0, o.z); scene.add(grp);
  const geo = new THREE.BoxGeometry(o.w, o.h, o.d); geo.translate(0, o.h / 2, 0);
  const rep = Math.max(1, o.w / 26), repY = Math.max(1, o.h / 26);
  const map = W.winMaps[o.seed % W.winMaps.length].clone(); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(rep, repY); map.needsUpdate = true;
  const em = W.winEms[o.seed % W.winEms.length].clone(); em.wrapS = em.wrapT = THREE.RepeatWrapping; em.repeat.set(rep, repY); em.needsUpdate = true;
  const side = new THREE.MeshLambertMaterial({ color: o.color, map: o.plain ? null : map, emissive: 0xffd49a, emissiveMap: o.plain ? null : em, emissiveIntensity: 0 });
  const roof = new THREE.MeshLambertMaterial({ color: lerpHex(o.color, '#777', .35) });
  const mesh = new THREE.Mesh(geo, [side, side, roof, roof, side, side]); mesh.castShadow = mesh.receiveShadow = true; grp.add(mesh);
  // ivy overlay (grows up from the ground with age)
  const ivyGeo = new THREE.BoxGeometry(o.w + .16, o.h + .1, o.d + .16); ivyGeo.translate(0, (o.h + .1) / 2, 0);
  const ivyMap = W.ivyTex.clone(); ivyMap.wrapS = ivyMap.wrapT = THREE.RepeatWrapping; ivyMap.repeat.set(o.w / 8, o.h / 8); ivyMap.needsUpdate = true;
  const ivyMat = new THREE.MeshLambertMaterial({ map: ivyMap, alphaMap: W.ivyAlpha, alphaTest: .999, color: '#ffffff' });
  const ivy = new THREE.Mesh(ivyGeo, [ivyMat, ivyMat, ivyMat, ivyMat, ivyMat, ivyMat]); ivy.visible = false; ivy.castShadow = false; ivy.receiveShadow = true; grp.add(ivy);
  const b = { ...o, grp, mesh, side, roof, ivy, ivyMat, base: col(o.color), roofBase: roof.color.clone() };
  W.buildings.push(b); return b;
}
function buildBuildings(W) {
  W.buildings = [];
  W.winMaps = [1, 2, 3, 4].map(s => windowTex(s, 'map')); W.winEms = [11, 12, 13, 14, 15].map(s => windowTex(s, 'em'));
  W.ivyTex = canvasTex(128, 128, (g) => {
    const r = mulberry(77); g.clearRect(0, 0, 128, 128);
    for (let i = 0; i < 260; i++) { const x = r() * 128, y = r() * 128, s = 6 + r() * 10; g.fillStyle = `hsl(${95 + r() * 40},${35 + r() * 25}%,${22 + r() * 22}%)`; g.beginPath(); g.ellipse(x, y, s, s * .7, r() * 3, 0, TAU); g.fill(); }
  });
  W.ivyAlpha = canvasTex(64, 256, (g) => {
    const r = mulberry(99), img = g.createImageData(64, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 64; x++) {
      const v = 1 - y / 255;   // canvas y=0 is the top of the texture → v=1
      const n = vnoise(x * .25 + 3.1) * .35 + vnoise(y * .07 + x * .02) * .25 + r() * .08;
      const a = clamp((1 - v) * .78 + n * .5);   // bottom (v=0) → high
      const i = (y * 64 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = a * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, false);
  // downtown towers
  const r = mulberry(4242); let seed = 0;
  for (let z = -44; z > -112; z -= R(12, 15)) for (let x = -90; x < 95; x += R(11, 15)) {
    if (x > -29 && x < -15) continue;                       // bridge avenue
    const xx = x + R(-1.2, 1.2), zz = z + R(-1, 1);
    const center = Math.exp(-((xx + 2) ** 2) / (2 * 34 ** 2));
    const h = 10 + center * R(18, 50) + R(0, 10) + (zz < -60 ? R(0, 10) : 0);
    const w = R(6.5, 9), d = R(6.5, 9);
    addBuilding(W, { x: xx, z: zz, w, d, h, color: pick(TOWER_COLS), seed: seed++, kind: 'tower', lit: r(), crumbleT: lerp(52.0, 56.0, rnd()), keep: R(.12, .42), tilt: R(-.12, .12), fall: rnd() < .35 });
  }
  // the landmark tower (with broadcast antenna)
  const lm = addBuilding(W, { x: -2, z: -58, w: 10, d: 10, h: 92, color: '#d9d4ca', seed: 3, kind: 'tower', lit: .7, crumbleT: 55.2, keep: .3, tilt: .07, fall: false, landmark: true });
  W.landmark = lm;
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(.25, .5, 18, 6), new THREE.MeshLambertMaterial({ color: '#cfcfcf' })); ant.position.y = 92 + 9; lm.grp.add(ant); W.antenna = ant;
  // foreground: shops facing the camera (back row), side blocks, bank
  const shopCols = ['#e8d6bd', '#c7705a', '#9cb3c4', '#ece4d4'];
  W.shops = [];
  [[-16, -8.5, 5.6], [-8, -.5, 6.6], [0, 6.5, 6.0], [7, 14.5, 7.0]].forEach(([x0, x1, h], i) => {
    const b = addBuilding(W, { x: (x0 + x1) / 2, z: 4, w: x1 - x0, d: 6, h, color: shopCols[i], seed: 20 + i, kind: 'shop', lit: .5, crumbleT: 53 + i * .5, keep: R(.25, .4), tilt: R(-.05, .05), fall: false });
    W.shops.push(b);
  });
  W.leftBlock = [
    addBuilding(W, { x: -33, z: 13.5, w: 13, d: 11, h: 14, color: '#d9c7a6', seed: 30, kind: 'block', lit: .5, crumbleT: 54.2, keep: .3, tilt: .03, fall: false }),
    addBuilding(W, { x: -33, z: 3.5, w: 13, d: 7, h: 11, color: '#b8c6cf', seed: 31, kind: 'block', lit: .5, crumbleT: 53.6, keep: .35, tilt: -.04, fall: false }),
  ];
  W.bank = addBuilding(W, { x: 22.5, z: 14, w: 15, d: 11, h: 12, color: '#efe9de', seed: 32, kind: 'bank', lit: .4, crumbleT: 54.6, keep: .3, tilt: .02, fall: false });
  W.rightBack = addBuilding(W, { x: 22.5, z: 3.8, w: 15, d: 7, h: 16, color: '#a9bccb', seed: 33, kind: 'block', lit: .5, crumbleT: 53.2, keep: .28, tilt: -.05, fall: false });
}

// ———————————————————————————— bridge ————————————————————————————
function buildBridge(W) {
  const { scene } = W; const red = new THREE.MeshLambertMaterial({ color: '#c8392b' }); const deckM = new THREE.MeshLambertMaterial({ color: '#5d6068' });
  const grp = new THREE.Group(); scene.add(grp);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(8, .9, 29), deckM); deck.position.set(-22, .5, -13.5); deck.castShadow = deck.receiveShadow = true; grp.add(deck);
  const towers = [];
  for (const z of [-6, -21]) {
    const tw = new THREE.Group(); tw.position.set(-22, 0, z); grp.add(tw);
    for (const x of [-4.4, 4.4]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(1.1, 26, 1.3), red); leg.position.set(x, 12, 0); leg.castShadow = true; tw.add(leg); }
    for (const y of [9, 17.5, 24.5]) { const bm = new THREE.Mesh(new THREE.BoxGeometry(9.9, 1, 1.1), red); bm.position.y = y; bm.castShadow = true; tw.add(bm); }
    towers.push(tw);
  }
  // main cables + hangers
  const cables = new THREE.Group(); grp.add(cables);
  for (const x of [-4.4, 4.4]) {
    const pts = []; for (let i = 0; i <= 40; i++) { const z = lerp(4, -31, i / 40); let y;
      if (z > -6) y = lerp(2.2, 25, (4 - z) / 10); else if (z > -21) { const u = (z + 6) / -15; y = 25 - 21 * 4 * u * (1 - u); } else y = lerp(25, 2.2, (-21 - z) / 10);
      pts.push(new THREE.Vector3(-22 + x, y, z)); }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, .18, 5), red); cables.add(tube);
    for (let z = -7.5; z > -20.5; z -= 1.5) { const u = (z + 6) / -15, y = 25 - 21 * 4 * u * (1 - u); const hg = new THREE.Mesh(new THREE.BoxGeometry(.08, y - 1, .08), red); hg.position.set(-22 + x, (y + 1) / 2, z); cables.add(hg); }
  }
  W.bridge = { grp, deck, towers, cables, red };
}

// ———————————————————————————— trees ————————————————————————————
function buildTrees(W) {
  const { scene } = W; const list = [];
  const inRiver = z => z < -1.4 && z > -26.6;
  const inFoot = (x, z) => W.buildings.find(b => Math.abs(x - b.x) < b.w / 2 + .8 && Math.abs(z - b.z) < b.d / 2 + .8);
  const add = (x, z, s, t0, dur, kind = rnd() < .28 ? 'cone' : 'round', park = false) => {
    if (inRiver(z)) return; const foot = inFoot(x, z);
    if (foot) { if (t0 < 50) return; t0 = Math.max(t0, foot.crumbleT + R(.4, 1.6)); }
    list.push({ x, z, s, t0, dur, kind, park, hue: R(0, 1), tilt: R(-.08, .08), rot: R(0, TAU) });
  };
  // park trees from the start
  for (let x = -60; x < 60; x += R(5.5, 7.5)) { if (x > -12 && x < 16) continue; add(x, 20.0 + R(-.2, .2), R(.9, 1.2), -1, .1, 'round', true); if (Math.abs(x) > 34) add(x + 3, 29.6, R(.9, 1.2), -1, .1, 'round', true); }
  for (let x = -16; x < 14; x += R(4.2, 5.2)) add(x, 0, R(.8, 1), -1, .1, 'round', true);
  for (const [x, z] of [[-16.5, 9], [-16.5, 18.5]]) add(x, z, R(.85, 1), -1, .1, 'round', true);
  for (let i = 0; i < 110; i++) { const x = R(-90, 90), z = R(34, 95); if ((Math.abs(x) < 14 && z < 50) || (x > -2 && x < 42 && z < 56)) continue; add(x, z, R(.9, 1.5), -1, .1, undefined, true); }       // park beyond the avenue
  for (let i = 0; i < 22; i++) add(R(-60, 60), R(-29.4, -27.6) + (rnd() < .5 ? -3.5 : 0), R(.8, 1.1), -1, .1, 'round', true); // riverside drive on the far bank
  // 100 years: greenery returns
  for (let i = 0; i < 150; i++) add(R(-70, 70), R(-100, 40), R(.8, 1.3), R(45.7, 49.5), R(2, 3.5));
  // 1000 years: forest
  for (let i = 0; i < 420; i++) add(R(-110, 110), R(-130, 60), R(1, 1.9), R(51.8, 56.6), R(1.5, 3));
  // 10,000 years: deep forest
  for (let i = 0; i < 300; i++) add(R(-160, 160), R(-170, 80), R(1.3, 2.4), R(57.8, 60.6), R(1.5, 3));
  W.trees = list;
  const trunkG = new THREE.CylinderGeometry(.22, .32, 2.4, 5); trunkG.translate(0, 1.2, 0);
  const roundG = new THREE.IcosahedronGeometry(2.0, 0); roundG.translate(0, 3.9, 0);
  const coneG = new THREE.ConeGeometry(1.8, 5.2, 6); coneG.translate(0, 4.6, 0);
  const mat = new THREE.MeshLambertMaterial({ flatShading: true });
  const mk = (g, n, m) => { const im = new THREE.InstancedMesh(g, m, n); im.castShadow = true; im.receiveShadow = true; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(im); return im; };
  W.trunks = mk(trunkG, list.length, new THREE.MeshLambertMaterial({ color: '#6b4a35' }));
  const rounds = list.filter(t => t.kind === 'round'), cones = list.filter(t => t.kind === 'cone');
  W.treeRound = mk(roundG, rounds.length, mat); W.treeCone = mk(coneG, cones.length, mat.clone());
  rounds.forEach((t, i) => { t.idx = i; t.mesh = W.treeRound; }); cones.forEach((t, i) => { t.idx = i; t.mesh = W.treeCone; });
  list.forEach((t, i) => { t.ti = i; const g = t.kind === 'cone' ? ['#3f7a4a', '#4f8a52', '#356b45'] : ['#6aa84f', '#7dbb5a', '#5c9a46', '#8cc463', '#4e8f45']; t.green = col(g[Math.floor(t.hue * g.length)]);
    t.autumn = col(['#e0a43a', '#d9772e', '#c9542e', '#e8c04a'][Math.floor(t.hue * 4)]); t.ruinGreen = t.green.clone().multiplyScalar(.85); });
  for (const im of [W.treeRound, W.treeCone]) im.setColorAt(0, new THREE.Color());
}

// ———————————————————————————— cars ————————————————————————————
function buildCars(W) {
  const { scene } = W;
  const body = new THREE.BoxGeometry(4.2, 1.0, 1.9); body.translate(0, .75, 0);
  const cab = new THREE.BoxGeometry(2.3, .8, 1.7); cab.translate(-.25, 1.6, 0);
  const geo = mergeGeometries([body, cab]);
  const cols = ['#e8e8e8', '#d23c3c', '#2f5d9a', '#f1c84b', '#2f2f35', '#8fb3c7', '#ffffff', '#c9c9c9', '#3a7d5c'];
  const cars = [];
  const lane = (n, dir, axis, fixed, lo, hi, stop) => { const v = R(8, 9.5); for (let i = 0; i < n; i++) cars.push({ dir, axis, fixed, lo, hi, stop, s0: lo + (hi - lo) * (i + R(-.2, .2)) / n, v, col: col(pick(cols)) }); };
  lane(16, 1, 'x', 23.0, -90, 90, 13.2);   // eastbound, stops before the crossing at x≈14
  lane(16, -1, 'x', 26.0, -90, 90, -9.0);  // westbound, stops before the zebra (x≈-8)
  lane(6, 1, 'z', -23.6, -100, 21, 18.6);  // from downtown over the bridge, stops at the avenue
  lane(6, -1, 'z', -20.4, -100, 21, -40);  // to downtown
  const T0 = T.h1 + .6, L = c => c.hi - c.lo;
  const wrap = (c, s) => c.lo + ((s - c.lo) % L(c) + L(c)) % L(c);
  // at T0 every car knows where it is; those behind the stop line queue up, those past it drive on and leave
  for (const kind of [[1, 'x', 23.0], [-1, 'x', 26.0], [1, 'z', -23.6], [-1, 'z', -20.4]]) {
    const grp = cars.filter(c => c.dir === kind[0] && c.axis === kind[1] && c.fixed === kind[2]);
    grp.forEach(c => { c.p0 = wrap(c, c.s0 + c.v * T0); c.behind = (c.stop - c.p0) * c.dir > 0; });
    const q = grp.filter(c => c.behind).sort((a, b) => (b.p0 - a.p0) * a.dir);
    q.forEach((c, k) => { c.target = c.stop - c.dir * (k * 5.6); });
  }
  W.cars = cars; W.carT0 = T0;
  const mat = new THREE.MeshLambertMaterial();
  W.carMesh = new THREE.InstancedMesh(geo, mat, cars.length); W.carMesh.castShadow = true; W.carMesh.receiveShadow = true; scene.add(W.carMesh);
  cars.forEach((c, i) => W.carMesh.setColorAt(i, c.col));
  // brake / tail lights and headlights (unlit, coloured per frame)
  const lg = new THREE.BoxGeometry(.12, .3, 1.6); lg.translate(-2.12, .9, 0);
  W.tail = new THREE.InstancedMesh(lg, new THREE.MeshBasicMaterial({ toneMapped: false }), cars.length); scene.add(W.tail);
  const hg = new THREE.BoxGeometry(.12, .25, 1.5); hg.translate(2.12, .85, 0);
  W.head = new THREE.InstancedMesh(hg, new THREE.MeshBasicMaterial({ toneMapped: false }), cars.length); scene.add(W.head);
  cars.forEach((c, i) => { W.tail.setColorAt(i, new THREE.Color()); W.head.setColorAt(i, new THREE.Color()); });
  // plane
  const pm = new THREE.MeshLambertMaterial({ color: '#f4f4f4' });
  const fus = new THREE.CylinderGeometry(.8, .6, 12, 8); fus.rotateZ(Math.PI / 2);
  const wing = new THREE.BoxGeometry(2.6, .2, 13); const tail = new THREE.BoxGeometry(1.6, 2.4, .2); tail.translate(-5.4, 1.2, 0); const tw = new THREE.BoxGeometry(1.4, .15, 4.4); tw.translate(-5.4, .3, 0);
  W.plane = new THREE.Mesh(mergeGeometries([fus, wing, tail, tw]), pm); W.plane.castShadow = true; scene.add(W.plane);
  W.planeLights = [[0, 0, 6.6, '#ff3030'], [0, 0, -6.6, '#30ff60'], [-6, 2.4, 0, '#ffffff']].map(([x, y, z, c]) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex('glow'), color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); s.position.set(x, y, z); s.scale.set(5, 5, 1); W.plane.add(s); return s; });
}

// ———————————————————————————— people ————————————————————————————
function buildPeople(W) {
  const { scene } = W; const N = 170; const P = [];
  const clothes = ['#2f4f7f', '#c0392b', '#f0f0f0', '#2c3e50', '#e67e22', '#8e44ad', '#16a085', '#f1c40f', '#7f8c8d', '#d35400', '#34495e', '#e8d9c0'];
  const skins = ['#f1c7a5', '#d9a07a', '#a8714f', '#7a4e33', '#f5d6bf'];
  for (let i = 0; i < N; i++) {
    const zone = i < 90 ? 'plaza' : i < 130 ? 'walkN' : i < 150 ? 'walkS' : 'prom';
    let x0, z0, vx, vz;
    if (zone === 'plaza') { x0 = R(-16, 12); z0 = R(9, 18.6); const a = R(0, TAU), v = R(.8, 1.4); vx = Math.cos(a) * v; vz = Math.sin(a) * v; }
    else if (zone === 'walkN') { x0 = R(-60, 60); z0 = R(20, 21.2); vx = (rnd() < .5 ? -1 : 1) * R(1, 1.5); vz = 0; }
    else if (zone === 'walkS') { x0 = R(-60, 60); z0 = R(27.8, 29); vx = (rnd() < .5 ? -1 : 1) * R(1, 1.5); vz = 0; }
    else { x0 = R(-30, 30); z0 = R(-1.2, .6); vx = (rnd() < .5 ? -1 : 1) * R(.8, 1.3); vz = 0; }
    P.push({ i, zone, x0, z0, vx, vz, phone: rnd() < .78, cloth: col(pick(clothes)), skin: col(pick(skins)), h: R(.92, 1.08), seed: rnd() * 100 });
  }
  W.people = P;
  const bodyG = new THREE.CylinderGeometry(.27, .33, 1.15, 6); bodyG.translate(0, .62, 0);
  const legG = new THREE.CylinderGeometry(.22, .2, .1, 6); legG.translate(0, .05, 0);
  const headG = new THREE.IcosahedronGeometry(.24, 1); headG.translate(0, 1.42, 0);
  W.pBody = new THREE.InstancedMesh(mergeGeometries([bodyG, legG]), new THREE.MeshLambertMaterial(), N);
  W.pHead = new THREE.InstancedMesh(headG, new THREE.MeshLambertMaterial(), N);
  const phG = new THREE.BoxGeometry(.06, .3, .18); phG.translate(.36, 1.12, 0);
  W.pPhone = new THREE.InstancedMesh(phG, new THREE.MeshBasicMaterial({ toneMapped: false }), N);
  const mapG = new THREE.BoxGeometry(.04, .55, .8); mapG.translate(.42, 1.1, 0);
  W.pMap = new THREE.InstancedMesh(mapG, new THREE.MeshLambertMaterial({ color: '#f3efe2' }), N);
  for (const m of [W.pBody, W.pHead]) { m.castShadow = true; scene.add(m); }
  scene.add(W.pPhone, W.pMap);
  P.forEach((p, i) => { W.pBody.setColorAt(i, p.cloth); W.pHead.setColorAt(i, p.skin); W.pPhone.setColorAt(i, new THREE.Color()); });
  // phone glows (points)
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); pg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  W.phoneGlow = new THREE.Points(pg, new THREE.PointsMaterial({ size: 2.4, map: iconTex('glow'), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false }));
  W.phoneGlow.frustumCulled = false; scene.add(W.phoneGlow);
}

// ———————————————————————————— props: shop fronts, bank, billboards, masts, stalls, houses ————————————————————————————
function buildProps(W) {
  const { scene } = W;
  const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
  const plane = (w, h, mat) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  // shop fronts (canvas signs)
  const fronts = [
    ['КАФЕ', '#7a3b22', '#f6e7cf'], ['ТЕЛЕВИЗОРИ', '#1f2a3a', '#e9eef5'], ['МОБИЛНИ', '#1658c4', '#ffffff'], ['МАРКЕТ', '#2d6a3e', '#f4f1e6'],
  ];
  W.fronts = []; W.shutters = [];
  const shutterTex = signTex((g, w, h) => { g.fillStyle = '#9aa0a6'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 12) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, y, w, 3); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, y + 4, w, 2); } });
  W.shops.forEach((b, i) => {
    const [name, bg, fg] = fronts[i];
    const tex = signTex((g, w, h) => {
      g.fillStyle = '#d9d2c6'; g.fillRect(0, 0, w, h);
      g.fillStyle = bg; g.fillRect(0, 0, w, 64); g.fillStyle = fg; g.font = '600 40px Sans'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, w / 2, 34);
      g.fillStyle = '#2b3442'; g.fillRect(24, 84, w - 48, h - 96);
      const gr = g.createLinearGradient(0, 84, 0, h); gr.addColorStop(0, 'rgba(255,230,180,.75)'); gr.addColorStop(1, 'rgba(255,200,140,.35)'); g.fillStyle = gr; g.fillRect(30, 90, w - 60, h - 108);
      g.fillStyle = '#d9d2c6'; g.fillRect(w / 2 - 4, 84, 8, h - 96);
    });
    const m = new THREE.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0 });
    const f = plane(b.w - .6, 3.6, m); f.position.set(0, 1.9, b.d / 2 + .03); b.grp.add(f); W.fronts.push(f);
    const sh = plane(b.w - 1.4, 2.6, lam('#ffffff', { map: shutterTex })); sh.position.set(0, 1.5, b.d / 2 + .07); sh.scale.y = .001; b.grp.add(sh); W.shutters.push(sh);
  });
  // TV screen in the TV shop
  W.tv = plane(2.6, 1.5, new THREE.MeshBasicMaterial({ color: '#000', toneMapped: false })); W.tv.position.set(-1.6, 1.7, W.shops[1].d / 2 + .06); W.shops[1].grp.add(W.tv);
  W.tv2 = W.tv.clone(); W.tv2.material = W.tv.material; W.tv2.position.x = 1.6; W.shops[1].grp.add(W.tv2);
  // bank facade (faces −x, toward the plaza)
  const bankTex = signTex((g, w, h) => {
    g.fillStyle = '#efe9de'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9bfae'; g.fillRect(0, 0, w, 50); g.fillStyle = '#3d3a35'; g.font = '600 38px Corm'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Б А Н К А', w / 2, 28);
    for (let i = 0; i < 6; i++) { const x = 40 + i * 86; g.fillStyle = '#ddd5c6'; g.fillRect(x, 60, 26, h - 70); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x + 20, 60, 6, h - 70); }
    g.fillStyle = '#3a4250'; g.fillRect(w / 2 - 36, 120, 72, h - 130);
  }, 512, 256);
  W.bankFront = plane(13, 6.5, lam('#ffffff', { map: bankTex })); W.bankFront.rotation.y = -Math.PI / 2; W.bankFront.position.set(-W.bank.w / 2 - .03, 3.25, 0); W.bank.grp.add(W.bankFront);
  // billboards: on top of the market (back row) and on the left block
  const scr = {
    feed: signTex((g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#5b2cff'); gr.addColorStop(1, '#ff3d7f'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.95)'; g.font = '600 64px Sans'; g.textAlign = 'left'; g.fillText('ОНЛАЙН 24/7', 34, 92);
      g.font = '500 30px Sans'; g.fillText('♥ 1,2 млн   ▶ НА ЖИВО   ✉ 99+', 36, 150);
      g.fillStyle = 'rgba(255,255,255,.22)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.roundRect(36 + i * 116, 180, 100, 56, 12); g.fill(); }
    }),
    off: signTex((g, w, h) => {
      g.fillStyle = '#16181d'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#ff4040'; g.lineWidth = 10; g.lineCap = 'round'; for (const r of [56, 38, 20]) { g.beginPath(); g.arc(110, 170, r, -Math.PI * .78, -Math.PI * .22); g.stroke(); }
      g.beginPath(); g.moveTo(58, 80); g.lineTo(162, 190); g.stroke();
      g.fillStyle = '#fff'; g.font = '600 50px Sans'; g.textAlign = 'left'; g.fillText('НЯМА', 200, 120); g.fillText('ВРЪЗКА', 200, 176);
      g.fillStyle = '#ff6060'; g.font = '500 22px Sans'; g.fillText('ERR_INTERNET_DISCONNECTED', 202, 216);
    }),
    dark: signTex((g, w, h) => { g.fillStyle = '#1b1d22'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, 0, w, h / 2); }),
    paper: signTex((g, w, h) => {
      g.fillStyle = '#3a3c40'; g.fillRect(0, 0, w, h); const r = mulberry(5);
      for (let i = 0; i < 9; i++) { g.fillStyle = `hsl(40,${20 + r() * 20}%,${78 + r() * 12}%)`; g.save(); g.translate(40 + r() * 400, 30 + r() * 160); g.rotate(r() * .3 - .15); g.fillRect(0, 0, 70 + r() * 60, 50 + r() * 40); g.restore(); }
      g.fillStyle = '#2a2a2a'; g.font = '600 34px Corm'; g.textAlign = 'center'; g.fillText('ПАЗАР ВСЯКА СЪБОТА', w / 2, 140);
    }),
  };
  W.scr = scr; W.billboards = [];
  const bbMat = new THREE.MeshBasicMaterial({ map: scr.feed, toneMapped: false });
  for (const [b, x, z, rotY, w, h] of [[W.shops[3], 0, 0, 0, 7.2, 3.6], [W.leftBlock[1], 0, 0, .25, 10, 5]]) {
    const g = new THREE.Group(); g.position.set(x, b.h, z); g.rotation.y = rotY; b.grp.add(g);
    for (const px of [-w / 3, w / 3]) { const post = new THREE.Mesh(new THREE.BoxGeometry(.3, 2, .3), lam('#555')); post.position.set(px, 1, 0); g.add(post); }
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + .5, h + .5, .4), lam('#2a2a2e')); frame.position.set(0, 2 + h / 2, -.25); frame.castShadow = true; g.add(frame);
    const s = plane(w, h, bbMat); s.position.set(0, 2 + h / 2, -.03); g.add(s); W.billboards.push(g);
  }
  W.bbMat = bbMat;
  // radio mast (left block) and cell tower (right back)
  const mastG = new THREE.Group(); mastG.position.set(-4, W.leftBlock[0].h, 0); W.leftBlock[0].grp.add(mastG);
  const steel = lam('#c94a3a'), white = lam('#eeeeee');
  for (let i = 0; i < 6; i++) { const seg_ = new THREE.Mesh(new THREE.CylinderGeometry(.35 - i * .04, .42 - i * .04, 3.4, 4), i % 2 ? white : steel); seg_.position.y = 1.7 + i * 3.4; seg_.castShadow = true; mastG.add(seg_); }
  W.mastTop = new THREE.Vector3(-37, W.leftBlock[0].h + 20.6, 13.5);
  W.mastLight = new THREE.Mesh(new THREE.SphereGeometry(.45, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff2a2a', toneMapped: false })); W.mastLight.position.y = 20.6; mastG.add(W.mastLight);
  const cell = new THREE.Group(); cell.position.set(3, W.rightBack.h, 0); W.rightBack.grp.add(cell);
  const cpole = new THREE.Mesh(new THREE.CylinderGeometry(.25, .3, 9, 6), lam('#bdbdbd')); cpole.position.y = 4.5; cell.add(cpole);
  for (let k = 0; k < 3; k++) { const pan = new THREE.Mesh(new THREE.BoxGeometry(.25, 2.2, .8), lam('#efefef')); const a = k * TAU / 3; pan.position.set(Math.cos(a) * .6, 8, Math.sin(a) * .6); pan.rotation.y = -a; cell.add(pan); }
  W.cell = cell;
  // traffic lights
  W.tLights = [];
  for (const [x, z] of [[14.4, 21.0], [-9.6, 28.0], [-19, 19.8]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 4.4, 5), lam('#333')); pole.position.set(x, 2.2, z); scene.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.4, .5), lam('#222')); head.position.set(x, 4.4, z); scene.add(head);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.22, 8, 6), new THREE.MeshBasicMaterial({ color: '#2f2', toneMapped: false })); lamp.position.set(x, 4.4, z + .28); scene.add(lamp);
    W.tLights.push({ pole, head, lamp });
  }
  // streetlights
  const slPos = []; for (let x = -70; x < 70; x += 11) { slPos.push([x, 19.9], [x + 5.5, 29.1]); } for (let x = -40; x < 40; x += 10) slPos.push([x, .7]);
  const sp = new THREE.InstancedMesh(new THREE.CylinderGeometry(.08, .1, 5, 5).translate(0, 2.5, 0), lam('#2f3136'), slPos.length);
  slPos.forEach(([x, z], i) => { M4.makeTranslation(x, 0, z); sp.setMatrixAt(i, M4); }); scene.add(sp); W.streetPoles = sp;
  const lgeo = new THREE.BufferGeometry(); lgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(slPos.flatMap(([x, z]) => [x, 5.1, z])), 3));
  W.streetGlow = new THREE.Points(lgeo, new THREE.PointsMaterial({ size: 5, map: iconTex('glow'), color: '#ffcf8a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  scene.add(W.streetGlow);
  // notice board with a paper map (7 days)
  const nb = new THREE.Group(); nb.position.set(-6, 0, 13.4); scene.add(nb);
  const mapTex = signTex((g, w, h) => {
    g.fillStyle = '#f3ecd8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b9ad8f'; g.lineWidth = 2; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(0, i * 22 + 8); g.bezierCurveTo(150, i * 22 - 20, 330, i * 22 + 40, w, i * 22); g.stroke(); }
    g.strokeStyle = '#4a7bb0'; g.lineWidth = 14; g.beginPath(); g.moveTo(0, 150); g.bezierCurveTo(150, 120, 330, 190, w, 160); g.stroke();
    g.strokeStyle = '#c0392b'; g.lineWidth = 5; g.setLineDash([12, 8]); g.beginPath(); g.moveTo(80, 220); g.lineTo(200, 90); g.lineTo(420, 70); g.stroke();
    g.setLineDash([]); g.fillStyle = '#2a2a2a'; g.font = '600 30px Corm'; g.fillText('КАРТА НА ГРАДА', 24, 40);
  });
  for (const px of [-1.8, 1.8]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.2, 3.2, .2), lam('#6b4a35')); p.position.set(px, 1.6, 0); nb.add(p); }
  const board = plane(4, 2.2, lam('#fff', { map: mapTex })); board.position.set(0, 2.2, .12); nb.add(board);
  const bback = new THREE.Mesh(new THREE.BoxGeometry(4.3, 2.5, .15), lam('#6b4a35')); bback.position.set(0, 2.2, 0); bback.castShadow = true; nb.add(bback);
  nb.scale.setScalar(.001); W.noticeBoard = nb;
  // market stalls (1 year)
  W.stalls = []; const awn = ['#d9483b', '#f2c14e', '#3c9a8f', '#f4f1e6', '#5a8f3e', '#e07a3a'];
  for (let row = 0; row < 2; row++) for (let k = 0; k < 6; k++) {
    const g = new THREE.Group(); g.position.set(-14 + k * 4.6, 0, row ? 16.6 : 11.2); g.rotation.y = row ? Math.PI : 0; scene.add(g);
    const table = new THREE.Mesh(new THREE.BoxGeometry(3, .9, 1.4), lam('#8a5a3a')); table.position.y = .45; table.castShadow = true; g.add(table);
    for (let j = 0; j < 5; j++) { const fr = new THREE.Mesh(new THREE.BoxGeometry(.45, .3, .45), lam(['#e74c3c', '#f39c12', '#7fb34a', '#f1c40f', '#c0392b'][(j + k) % 5])); fr.position.set(-1.1 + j * .55, 1.05, R(-.3, .3)); g.add(fr); }
    for (const px of [-1.4, 1.4]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.12, 2.4, .12), lam('#6b4a35')); p.position.set(px, 1.2, -.6); g.add(p); }
    const a = new THREE.Mesh(new THREE.BoxGeometry(3.4, .14, 2.0), lam(awn[(k + row * 2) % awn.length])); a.position.set(0, 2.45, -.05); a.rotation.x = .22; a.castShadow = true; g.add(a);
    g.scale.setScalar(.001); g.userData.t0 = 38.0 + (row * 6 + k) * .16; W.stalls.push(g);
  }
  // 100-year houses (pitched roofs) and 1000-year village
  const houseG = (w, d, h) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(0, h / 2, 0); return b; };
  const roofG = (w, d, h, rh) => { const g = new THREE.CylinderGeometry(.01, w * .75, rh, 4, 1); g.rotateY(Math.PI / 4); g.scale(1, 1, d / w); g.translate(0, h + rh / 2, 0); return g; };
  W.houses = [];
  const addHouse = (x, z, w, d, h, t0, t1, wall, roofc) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = R(-.2, .2); scene.add(g);
    const m1 = new THREE.Mesh(houseG(w, d, h), lam(wall)); m1.castShadow = m1.receiveShadow = true; g.add(m1);
    const m2 = new THREE.Mesh(roofG(w, d, h, h * .7), lam(roofc, { flatShading: true })); m2.castShadow = true; g.add(m2);
    g.scale.setScalar(.001); g.userData = { t0, t1 }; W.houses.push(g); return g;
  };
  // 100 years: new low-rise on the plaza edges and far bank
  for (const [x, z] of [[-12, 9.5], [-6, 17.6], [8.5, 10], [10.5, 17.2], [-40, 30], [32, 31], [45, -35], [-52, -40]])
    addHouse(x, z, R(3.2, 4.4), R(3.2, 4.4), R(2.6, 3.6), R(46, 48.5), 53.8 + R(0, 1.5), pick(['#e6d8c0', '#d8c3a5', '#efe6d2']), pick(['#b5523b', '#9c4632', '#c4643f']));
  // 1000 years: a village over the old city
  W.smoke = [];
  for (let i = 0; i < 16; i++) {
    const x = R(-24, 18), z = R(4, 34);
    const h = addHouse(x, z, R(2.6, 3.6), R(2.4, 3.4), R(2, 2.8), R(53.6, 56.2), 59.4 + R(0, 1.2), pick(['#d9c8a9', '#cdb998', '#e3d5bb']), pick(['#a8452f', '#b9583a', '#8f3e2b']));
    if (i % 3 === 0) W.smoke.push({ house: h, sprites: [] });
  }
  const smokeTex = iconTex('smoke');
  for (const s of W.smoke) for (let k = 0; k < 5; k++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 })); scene.add(sp); s.sprites.push(sp); }
  // rubble (crumbling city)
  const rb = []; for (const b of W.buildings) { const n = b.kind === 'tower' ? 6 : 3; for (let k = 0; k < n; k++) rb.push({ b, x: b.x + R(-b.w * .7, b.w * .7), z: b.z + R(-b.d * .7, b.d * .7), s: R(.8, 2.4), r: R(0, 3) }); }
  W.rubble = rb; W.rubbleMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: '#9a958b' }), rb.length);
  W.rubbleMesh.castShadow = W.rubbleMesh.receiveShadow = true; scene.add(W.rubbleMesh);
}

// ———————————————————————————— FX: data web, icons, radio rings, birds ————————————————————————————
function buildFX(W) {
  const { scene } = W;
  // the data web
  const tops = W.buildings.filter(b => b.kind === 'tower' && b.h > 30).map(b => new THREE.Vector3(b.x, b.h + .5, b.z));
  const near = [new THREE.Vector3(3, 13.6, 3.8 + 0), new THREE.Vector3(-4, 1.6, 13), new THREE.Vector3(6, 1.6, 15), new THREE.Vector3(-12, 1.6, 11), new THREE.Vector3(25.5, 25, 3.8), new THREE.Vector3(-37, 34.5, 13.5), new THREE.Vector3(10, 10.2, 4), new THREE.Vector3(-30, 11, 3.5)];
  const lm = new THREE.Vector3(W.landmark.x, 110, W.landmark.z);
  const arcs = [];
  const arc = (a, b, lift) => { const m = a.clone().lerp(b, .5); m.y = Math.max(a.y, b.y) + lift; return new THREE.QuadraticBezierCurve3(a, m, b); };
  for (const p of near) { arcs.push(arc(p, lm, R(6, 14))); arcs.push(arc(p, pick(tops), R(10, 22))); }
  for (let i = 0; i < 16; i++) { const a = pick(tops), b = pick(tops); if (a.distanceTo(b) < 15) continue; arcs.push(arc(a, b, R(8, 20))); }
  
  W.webMat = new THREE.MeshBasicMaterial({ color: '#7fe9ff', transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  W.arcs = arcs.map((c, i) => { const g = new THREE.TubeGeometry(c, 40, i < near.length * 2 ? .13 : .22, 4, false); const m = new THREE.Mesh(g, W.webMat); scene.add(m);
    return { c, m, total: g.index.count, t0: R(.0, 1.2), cut: R(5.15, 5.9) }; });
  const NP = W.arcs.length * 3; const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NP * 3), 3));
  W.pulses = new THREE.Points(pg, new THREE.PointsMaterial({ size: 2.2, map: iconTex('glow'), color: '#bff6ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  W.pulses.frustumCulled = false; scene.add(W.pulses);
  // floating icons
  const kinds = ['wifi', 'chat', 'heart', 'bell', 'like'];
  const tex = Object.fromEntries([...kinds, 'wifix', 'chatx', 'navx', 'cardx', 'ring', 'bird0', 'bird1'].map(k => [k, iconTex(k)]));
  W.icons = [];
  const mkSprite = (map) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, toneMapped: false })); s.visible = false; scene.add(s); return s; };
  // hook icons: over people and over the towers
  for (let i = 0; i < 46; i++) {
    const onPerson = i < 30, p = W.people[(i * 7) % 90];
    W.icons.push({ s: mkSprite(tex[pick(kinds)]), kind: 'hook', person: onPerson ? p : null, pos: onPerson ? null : (() => { const b = pick(W.buildings.filter(b => b.kind === 'tower')); return new THREE.Vector3(b.x + R(-2, 2), b.h * R(.5, 1.0), b.z + b.d / 2 + 1); })(),
      t0: R(.25, 4.6), size: onPerson ? 1.5 : R(3.2, 4.4) });
  }
  // offline icons (red), message / payment / navigation failures
  for (let i = 0; i < 26; i++) W.icons.push({ s: mkSprite(tex[i < 20 ? 'wifix' : 'chatx']), kind: 'off', person: W.people[(i * 5 + 2) % 90], t0: T.s10 + .2 + R(0, 1.6), t1: T.h1 - .2 + R(-.2, .2), size: 1.5 });
  for (let i = 0; i < 12; i++) W.icons.push({ s: mkSprite(tex.chatx), kind: 'msg', person: W.people[(i * 9 + 4) % 120], t0: 12.25 + R(0, .9), t1: 13.9, size: 1.5 });
  W.icons.push({ s: mkSprite(tex.cardx), kind: 'fixed', pos: new THREE.Vector3(3.2, 4.6, 8), t0: 13.85, t1: 15.9, size: 2.6 });
  W.icons.push({ s: mkSprite(tex.cardx), kind: 'fixed', pos: new THREE.Vector3(10.8, 4.6, 8), t0: 14.2, t1: 15.9, size: 2.6 });
  W.icons.push({ s: mkSprite(tex.cardx), kind: 'fixed', pos: new THREE.Vector3(15.2, 8.2, 14), t0: 14.5, t1: 15.9, size: 2.6 });
  for (let i = 0; i < 7; i++) W.icons.push({ s: mkSprite(tex.navx), kind: 'car', car: W.cars[i * 3 % 32], t0: 15.8 + i * .14, t1: 17.7, size: 2.2 });
  // radio rings
  W.rings = []; for (let i = 0; i < 9; i++) { const s = mkSprite(tex.ring); s.material.color.set('#ffe7b0'); s.material.blending = THREE.AdditiveBlending; W.rings.push(s); }
  // birds
  W.birdTex = [tex.bird0, tex.bird1]; W.birds = [];
  for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.bird0, transparent: true, depthWrite: false })); s.visible = false; scene.add(s);
    W.birds.push({ s, ph: R(0, TAU), r: R(14, 40), h: R(28, 60), cx: R(-30, 30), cz: R(-60, 0), sp: R(.18, .32) * (rnd() < .5 ? 1 : -1), fl: R(7, 10) }); }
  // sun glow sprite (golden hours)
  W.sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex('glow'), color: '#ffd59a', transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  W.sunGlow.scale.set(260, 260, 1); scene.add(W.sunGlow);
}

function buildMountainsClouds(W) {
  const { scene } = W; const m = new THREE.MeshLambertMaterial({ color: '#8496ad', flatShading: true });
  for (let i = 0; i < 16; i++) { const h = R(50, 140), r = R(60, 120); const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5 + Math.floor(R(0, 3))), m); c.position.set(-380 + i * 52 + R(-20, 20), h / 2 - 4, R(-380, -300)); c.rotation.y = R(0, 3); scene.add(c); }
  W.mountainMat = m;
  W.clouds = []; const cm = new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true, transparent: true, opacity: .92 });
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group(); for (let k = 0; k < 4; k++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(R(5, 9), 0), cm); p.position.set(k * 7 - 10, R(-1, 2), R(-3, 3)); p.scale.y = .6; g.add(p); }
    g.position.set(R(-160, 160), R(85, 120), R(-200, -60)); scene.add(g); W.clouds.push({ g, x0: g.position.x, v: R(1.2, 2.4) });
  }
  W.cloudMat = cm;
}

// ———————————————————————————— lighting keys ————————————————————————————
const LK = [
  // t, skyTop, skyBot, sunCol, sunI, elev, azim, hemiSky, hemiGnd, hemiI, fog, fogNear, fogFar, win, glow
  [0.0, '#7aa6dc', '#f6d6ac', '#ffd8a6', 2.5, 20, -40, '#cfe0f5', '#7a7f55', 1.05, '#ecdcc6', 180, 900, .25, .55],
  [6.0, '#6a9fdc', '#d8e7f3', '#fff3e2', 2.8, 38, -30, '#d2e3f6', '#7f8a5a', 1.0, '#dbe6ee', 180, 900, .05, .15],
  [17.6, '#6b9bd6', '#f1d9b8', '#ffe2b6', 2.5, 22, 20, '#d6e0ee', '#7f8a5a', .95, '#e9dcc8', 170, 880, .10, .3],
  [19.6, '#3d4e86', '#f39a5c', '#ff8a45', 1.6, 5, 35, '#8f8fb8', '#5a4a3a', .7, '#d98d63', 140, 800, .65, .8],
  [21.0, '#0b1230', '#1d2a50', '#9fb4e0', .45, 30, 160, '#3d4c78', '#151a24', .32, '#121a30', 120, 700, 1.0, 0],
  [23.6, '#0b1230', '#1d2a50', '#9fb4e0', .45, 30, 200, '#3d4c78', '#151a24', .32, '#121a30', 120, 700, .95, 0],
  [25.6, '#5a77b3', '#f4b88a', '#ffc08a', 1.8, 8, -45, '#b9c3df', '#6a6048', .8, '#e6c3a6', 150, 850, .4, .7],
  [27.2, '#7ea1cc', '#e2e9ec', '#fff1dc', 2.5, 34, -25, '#d6e2f0', '#7f8a5a', 1.0, '#dfe7ec', 180, 900, .05, .1],
  [37.4, '#7ea1cc', '#e2e9ec', '#fff1dc', 2.5, 34, -15, '#d6e2f0', '#7f8a5a', 1.0, '#dfe7ec', 180, 900, .05, .1],
  [38.6, '#7096c8', '#f0d8b6', '#ffdcae', 2.5, 24, -20, '#e0d8c8', '#8a7a4a', 1.0, '#eadbc4', 170, 880, .08, .3],
  [45.2, '#7096c8', '#f0d8b6', '#ffdcae', 2.5, 26, -10, '#e0d8c8', '#8a7a4a', 1.0, '#eadbc4', 170, 880, .08, .3],
  [46.6, '#6d9ad0', '#dfe8e6', '#fff0d8', 2.6, 36, 0, '#d4e4f0', '#6f8a52', 1.0, '#dbe5e2', 190, 950, .02, .1],
  [51.0, '#6d9ad0', '#dfe8e6', '#fff0d8', 2.6, 36, 10, '#d4e4f0', '#6f8a52', 1.0, '#dbe5e2', 190, 950, 0, .1],
  [57.2, '#7a9fce', '#e8ddc8', '#ffe0b0', 2.5, 26, 0, '#d8e0e8', '#6f8a52', 1.0, '#e4dccc', 190, 950, 0, .3],
  [59.4, '#4f7cc0', '#ffc98a', '#ffbe72', 2.7, 12, 160, '#f0d9bc', '#5f6a3a', 1.0, '#efc99a', 220, 1100, 0, 1.0],
  [77.0, '#4a76bb', '#ffc280', '#ffb060', 2.6, 10, 165, '#f0d9bc', '#5f6a3a', .95, '#eec394', 220, 1100, 0, 1.0],
];
function lightAt(t) {
  let i = 0; while (i < LK.length - 2 && t > LK[i + 1][0]) i++;
  const a = LK[i], b = LK[i + 1], k = ss(seg(t, a[0], b[0]));
  const o = {}; const names = ['t', 'skyTop', 'skyBot', 'sunCol', 'sunI', 'elev', 'azim', 'hemiSky', 'hemiGnd', 'hemiI', 'fog', 'fogNear', 'fogFar', 'win', 'glow'];
  names.forEach((n, j) => { if (j === 0) return; o[n] = typeof a[j] === 'string' ? lerpHex(a[j], b[j], k) : lerp(a[j], b[j], k); });
  return o;
}

// ———————————————————————————— camera ————————————————————————————
const CAM = track([
  [0.0, [0, 80, 150, 0, 8, -30]],
  [5.6, [0, 48, 104, 0, 6, -8]],
  [6.7, [1, 25, 47, -1, 1, 11]],
  [10.6, [0, 23, 44, -1, 1, 11]],
  [11.5, [26, 18, 46, 2, 0, 22]],
  [17.2, [23, 17, 44, 1, 0, 22]],
  [18.8, [8, 34, 112, 0, 16, -24]],
  [25.8, [12, 38, 118, 0, 16, -24]],
  [27.2, [1, 13, 35, 14, 2.5, 15]],
  [29.4, [2, 12.5, 34, 14, 2.5, 15]],
  [30.4, [-8, 12, 30, -6, 2.5, 13]],
  [31.5, [-7.5, 11.5, 29, -6, 2.5, 13]],
  [32.6, [-22, 24, 50, -35, 21, 12]],
  [33.9, [-21, 23, 49, -35, 21, 12]],
  [35.0, [0, 22, 46, -3, 1, 14]],
  [37.2, [1, 21, 44, -3, 1, 14]],
  [38.4, [0, 26, 62, 0, 2, 10]],
  [44.8, [0, 23, 56, 0, 2, 10]],
  [46.4, [-6, 36, 100, 0, 10, -15]],
  [50.8, [-4, 38, 104, 0, 10, -16]],
  [52.2, [4, 50, 140, 0, 11, -25]],
  [57.2, [2, 55, 150, 0, 10, -28]],
  [59.2, [0, 62, 168, 0, 9, -40]],
  [66.6, [0, 100, 252, 0, 4, -60]],
  [77.5, [0, 106, 264, 0, 4, -62]],
]);

// ———————————————————————————— per-frame update ————————————————————————————
export function updateWorld(W, t) {
  const { scene, camera, sun, hemi, skyU } = W;
  // —— time-lapse flicker during the 1000-year jump ——
  let L = lightAt(t);
  const tl = env(t, 51.7, 56.9, .8, 1.0), cyc = .5 - .5 * Math.cos(TAU * Math.max(0, t - 51.7) * 1.15);
  const night = tl * cyc * .38;
  if (night > 0) {
    const N_ = lightAt(22);
    for (const k of ['skyTop', 'skyBot', 'sunCol', 'hemiSky', 'hemiGnd', 'fog']) L[k] = L[k].clone().lerp(N_[k], night);
    for (const k of ['sunI', 'hemiI']) L[k] = lerp(L[k], N_[k], night);
  }
  const age100 = ss(seg(t, T.y100, T.y100 + 3.5)), age1k = ss(seg(t, T.y1k + .3, 56.8)), age10k = ss(seg(t, T.y10k, 60.8));
  const autumn = env(t, T.y1 + .2, T.y100 + .6, 2.0, 1.4);
  // —— sky, fog, lights ——
  skyU.top.value.copy(L.skyTop); skyU.bot.value.copy(L.skyBot); skyU.glow.value.copy(L.sunCol); skyU.glowK.value = L.glow;
  scene.fog.color.copy(L.fog); scene.fog.near = L.fogNear; scene.fog.far = L.fogFar;
  const el = L.elev * Math.PI / 180, az = L.azim * Math.PI / 180;
  const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
  sun.position.copy(sun.target.position).addScaledVector(dir, 260); sun.color.copy(L.sunCol); sun.intensity = L.sunI * 1.35;
  skyU.sunDir.value.copy(dir);
  hemi.color.copy(L.hemiSky); hemi.groundColor.copy(L.hemiGnd); hemi.intensity = L.hemiI * 1.35;
  W.sunGlow.position.copy(dir).multiplyScalar(1100).add(camera.position); W.sunGlow.material.opacity = L.glow * .55 * clamp(1 - Math.max(0, L.elev - 14) / 20);
  W.water.color.copy(lerpHex('#3f78ad', '#16233a', clamp((1 - L.hemiI) * 1.4))).lerp(L.skyBot, .12);
  // —— camera ——
  const c = CAM(t); const sway = .25;
  camera.position.set(c[0] + Math.sin(t * .37) * sway, c[1] + Math.sin(t * .29 + 1) * sway * .6, c[2]);
  camera.lookAt(c[3], c[4], c[5]);
  // —— ground ages ——
  const green = Math.max(age100 * .35, age1k * .92, age10k);
  W.pave.forEach((m, i) => m.color.copy(W.paveBase[i]).lerp(i === 4 ? col('#6f7d5a') : col('#7aa556'), green));
  W.markings.forEach(m => { m.opacity = 1 - green; m.transparent = true; });
  W.grass.color.copy(lerpHex('#7fae5a', '#86ad55', autumn * .3)).lerp(col('#6f9f4c'), age10k * .5);
  // —— buildings ——
  for (const b of W.buildings) {
    const win = L.win * (b.lit * .7 + .3) * (1 - age100 * .85) * (t > T.y1 ? .55 : 1) * (b.kind === 'shop' ? .6 : 1);
    b.side.emissiveIntensity = win * 1.15;
    const weather = Math.max(age100 * .45, age1k * .85);
    b.side.color.copy(b.base).lerp(col('#8d8b80'), weather).lerp(col('#a39a86'), age10k * .5); b.roof.color.copy(b.roofBase).lerp(col('#6b7a52'), Math.max(age100 * .5, age1k));
    // ivy
    const ivyG = Math.max(age100 * .26, age1k * .68, age10k * .74);
    b.ivy.visible = ivyG > .02; if (b.ivy.visible) b.ivyMat.alphaTest = clamp(1 - ivyG * .92, .02, .999);
    // crumble
    const k = eio(seg(t, b.crumbleT, b.crumbleT + 2.4));
    const spire = b.landmark || (b.kind === 'tower' && b.h > 44);
    const keep = b.landmark ? .34 : spire ? Math.max(b.keep, .3) : b.keep;
    let sy = lerp(1, keep, k), sink = 0, tilt = b.tilt * k;
    const falls = b.fall && !spire;
    if (falls) { sink = k * b.h * keep * .9; }
    // 10,000 years: the stumps sink into the forest
    sy *= lerp(1, spire ? .62 : .45, age10k); sink += age10k * (falls ? 2 : spire ? 0 : b.h * sy * .35);
    b.grp.scale.y = Math.max(.001, sy); b.grp.position.y = -sink; b.grp.rotation.z = tilt; b.grp.rotation.x = tilt * .5;
    b.grp.visible = sy * b.h - sink > -.5;
  }
  W.antenna.visible = t < T.y100 + 1.6; W.antenna.scale.y = 1;
  // —— shop fronts, shutters, TV, billboards, bank ——
  const shut = (i) => ss(seg(t, 19.8 + i * .55, 20.8 + i * .55));
  W.shutters.forEach((s, i) => { const v = i === 1 ? 0 : shut(i); const keepDown = t > T.y1 ? 1 : v; s.scale.y = Math.max(.001, keepDown); s.position.y = 1.5 + (1 - keepDown) * 1.3; s.visible = t < T.y100 + 2; });
  W.fronts.forEach((f, i) => { f.material.emissiveIntensity = (L.win * .9 + .05) * (1 - shut(i) * (i === 1 ? 0 : 1)) * (t < T.y1 ? 1 : .2); f.visible = t < 53.5; });
  const tvOn = t > 17.9 && t < 26.6; const flick = .75 + .25 * vnoise(t * 9);
  W.tv.material.color.set(tvOn ? tmpC.setHSL(.58, .5, .55 * flick) : tmpC.set('#0a0a0a'));
  W.billboards.forEach(g => g.visible = t < T.y100 + 1);
  let scr = W.scr.feed; if (t > 6.6) scr = (Math.floor(t * 3) % 7 === 0 && t < 11) ? W.scr.dark : W.scr.off; if (t > T.h24 + 2) scr = W.scr.dark; if (t > T.y1) scr = W.scr.paper;
  if (t > 5.3 && t < 6.6) scr = (Math.floor(t * 14) % 2) ? W.scr.off : W.scr.feed;
  if (W.bbMat.map !== scr) { W.bbMat.map = scr; W.bbMat.needsUpdate = true; }
  W.bbMat.color.setScalar(scr === W.scr.paper ? .85 * L.hemiI : 1);
  W.cell.visible = t < T.y100 + .8;
  W.mastLight.material.color.setScalar(0).setRGB(Math.sin(t * 5) > 0 && t < T.y100 + 2 ? 1 : .15, .1, .1);
  // traffic lights: normal cycle, blinking amber after 1 hour, dark after a year
  W.tLights.forEach((l, i) => {
    let c_ = (Math.floor((t + i * 2) / 3) % 2) ? '#ff3030' : '#30ff60';
    if (t > T.h1) c_ = (Math.floor(t * 2.2) % 2) ? '#ffb020' : '#2a1a05';
    if (t > T.y1) c_ = '#151515';
    l.lamp.material.color.set(c_); const vis = t < T.y100 + 1.5; l.pole.visible = l.head.visible = l.lamp.visible = vis;
  });
  W.streetGlow.material.opacity = clamp((L.win - .3) * 1.6) * (t < T.y1 ? 1 : 0);
  W.streetPoles.visible = t < T.y100 + 1.5;
  // notice board
  W.noticeBoard.scale.setScalar(Math.max(.001, back(seg(t, 29.6, 30.4)) * (1 - seg(t, T.y100 + .5, T.y100 + 1.2))));
  // stalls
  W.stalls.forEach(g => { const a = back(seg(t, g.userData.t0, g.userData.t0 + .6)), z = 1 - ss(seg(t, 52.5, 54)); g.scale.setScalar(Math.max(.001, a * z)); });
  // houses
  W.houses.forEach(g => { const a = eo(seg(t, g.userData.t0, g.userData.t0 + 1.2)), z = 1 - ss(seg(t, g.userData.t1, g.userData.t1 + 1.5)); g.scale.set(1, Math.max(.001, a * z), 1); g.visible = a * z > .002; });
  // smoke
  W.smoke.forEach((s, si) => s.sprites.forEach((sp, k) => {
    const h = s.house, vis = h.visible && h.scale.y > .8 && t > 54;
    const u = ((t * .35 + k / 5 + si * .13) % 1); sp.visible = vis;
    if (vis) { sp.position.set(h.position.x + u * 2.5, 4.5 + u * 9, h.position.z); sp.scale.setScalar(1.5 + u * 4); sp.material.opacity = .55 * (1 - u) * h.scale.y; }
  }));
  // rubble
  W.rubble.forEach((r, i) => {
    const b = r.b, k = seg(t, b.crumbleT + .3, b.crumbleT + 1.8), s = r.s * eo(k) * (1 - age10k * .55);
    M4.compose(V.set(r.x, s * .35 - age10k * .3, r.z), Q.setFromEuler(E.set(r.r, r.r * 2, r.r * .5)), S3.set(s, s * .7, s));
    W.rubbleMesh.setMatrixAt(i, M4);
  });
  W.rubbleMesh.instanceMatrix.needsUpdate = true; W.rubbleMesh.material.color.copy(lerpHex('#9a958b', '#6e7d56', age10k));
  // bridge
  const bc = eio(seg(t, 54.4, 56.0));
  W.bridge.deck.position.y = .5 - bc * 2.2; W.bridge.deck.rotation.x = bc * .05; W.bridge.deck.scale.z = lerp(1, .55, bc); W.bridge.deck.visible = age10k < .6;
  W.bridge.cables.visible = bc < .35;
  W.bridge.towers.forEach((tw, i) => { tw.rotation.x = bc * (i ? -.16 : .12); tw.scale.y = lerp(1, i ? .42 : .6, bc) * lerp(1, .32, age10k); tw.position.y = -age10k * 1.5; });
  W.bridge.red.color.copy(lerpHex('#c8392b', '#7a4a3a', Math.max(age100 * .35, age1k * .8))).lerp(col('#5e6b48'), age10k * .6);
  // —— trees ——
  updateTrees(W, t, autumn, age10k);
  // —— cars, plane ——
  updateCars(W, t, L, age100);
  // —— people ——
  updatePeople(W, t);
  // —— web, icons, rings, birds, clouds ——
  updateFX(W, t, L);
  W.mountainMat.color.copy(L.fog).lerp(col('#7d8fa8'), .45);
  W.clouds.forEach(cl => { const speed = 1 + tl * 18; cl.g.position.x = ((cl.x0 + cl.v * t + tl * cl.v * 40 * Math.max(0, t - 51.7)) + 220) % 440 - 220; });
  W.cloudMat.color.copy(lerpHex('#ffffff', '#ffd9b0', L.glow * .6)).multiplyScalar(lerp(.35, 1, L.hemiI));
  return L;
}

function updateTrees(W, t, autumn, age10k) {
  const { trunks } = W; let any = false;
  for (const tr of W.trees) {
    let s = tr.t0 < 0 ? 1 : eo(seg(t, tr.t0, tr.t0 + tr.dur));
    if (tr.park) s *= lerp(1, 1.35, ss(seg(t, T.y100, T.y100 + 3)));
    s *= lerp(1, 1.18, age10k);
    s *= tr.s;
    const sway = Math.sin(t * 1.3 + tr.rot * 3) * .02;
    M4.compose(V.set(tr.x, 0, tr.z), Q.setFromEuler(E.set(tr.tilt + sway, tr.rot, tr.tilt * .5)), S3.set(Math.max(s, .0001), Math.max(s, .0001), Math.max(s, .0001)));
    trunks.setMatrixAt(tr.ti, M4); tr.mesh.setMatrixAt(tr.idx, M4);
    const c_ = tr.green.clone(); if (tr.park) c_.lerp(tr.autumn, autumn * (.55 + tr.hue * .45));
    if (tr.t0 > 57) c_.lerp(tr.ruinGreen, .4);
    tr.mesh.setColorAt(tr.idx, c_);
  }
  trunks.instanceMatrix.needsUpdate = true;
  for (const m of [W.treeRound, W.treeCone]) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }
}

function carPos(W, c, t) {
  const T0 = W.carT0, L_ = c.hi - c.lo, wrap = s => c.lo + ((s - c.lo) % L_ + L_) % L_;
  if (t < T0) return { s: wrap(c.s0 + c.v * t), v: c.v };
  if (c.behind) {
    const k = seg(t, T0, T0 + 6); const e = 1 - (1 - k) * (1 - k);
    return { s: c.p0 + (c.target - c.p0) * e, v: c.v * (1 - k) * 2 * (k < 1 ? 1 : 0) };
  }
  return { s: c.p0 + c.dir * c.v * (t - T0), v: c.v, gone: true };
}
function updateCars(W, t, L, age100) {
  const night = clamp((L.win - .25) * 1.4);
  W.cars.forEach((c, i) => {
    const p = carPos(W, c, t), s = p.s;
    const x = c.axis === 'x' ? s : c.fixed, z = c.axis === 'x' ? c.fixed : s;
    // hide the cars past the stop line once they've left; and the abandoned cars at 100 years
    const away = p.gone && (c.axis === 'x' ? Math.abs(s) > 95 : (s > 24 || s < -95));
    const sink = ss(seg(t, T.y100 + .3 + (i % 7) * .3, T.y100 + 2.4 + (i % 7) * .3));
    const yaw = c.axis === 'x' ? (c.dir > 0 ? 0 : Math.PI) : (c.dir > 0 ? -Math.PI / 2 : Math.PI / 2);
    // the bridge deck: cars on it would fly when it falls, but by then they are long gone
    const onBridge = c.axis === 'z' && s < 1 && s > -28; const y = onBridge ? .95 : 0;
    const sc = away || sink >= 1 ? 0.0001 : 1;
    M4.compose(V.set(x, y - sink * 1.4, z), Q.setFromEuler(E.set(0, yaw, sink * .2)), S3.set(sc, sc, sc));
    W.carMesh.setMatrixAt(i, M4); W.tail.setMatrixAt(i, M4); W.head.setMatrixAt(i, M4);
    // abandoned: dusty after a week, rusty after a year
    const dust = Math.max(seg(t, T.d7, T.d7 + 3) * .35, seg(t, T.y1, T.y1 + 2) * .7);
    W.carMesh.setColorAt(i, c.col.clone().lerp(col('#8a7058'), dust));
    const braking = t > W.carT0 && t < T.h24 + 1.2 && !p.gone;
    W.tail.setColorAt(i, tmpC.set(braking ? '#ff2a1a' : '#5a1010').multiplyScalar(t > T.h24 + 1.2 ? .25 : 1));
    W.head.setColorAt(i, tmpC.set('#fff2c8').multiplyScalar(t < T.h24 + 1.2 ? .35 + night : .15));
  });
  for (const m of [W.carMesh, W.tail, W.head]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  // plane: crosses the sky at the start, circles in a holding pattern during the first night
  const pl = W.plane; let vis = false;
  if (t < 9) { vis = true; const u = t / 9; pl.position.set(lerp(-160, 120, u), 92, -150 + u * 20); pl.rotation.set(0, -.07, 0); }
  else if (t > 17.6 && t < 26.6) { vis = true; const a = (t - 17.6) * .38; pl.position.set(-10 + Math.cos(a) * 50, 74, -50 + Math.sin(a) * 30); pl.rotation.set(0, -a - Math.PI / 2, -.35); }
  pl.visible = vis; W.planeLights.forEach((s, k) => { s.material.opacity = (k < 2 ? .9 : (Math.floor(t * 2.5) % 2 ? 1 : 0)) * clamp((L.win - .2) * 2); });
}

// people: each stage has its own layout; they walk between them
function personAt(W, p, t) {
  const wrapX = (x, a, b) => a + ((x - a) % (b - a) + (b - a)) % (b - a);
  const walk = (tt) => {
    if (p.zone === 'plaza') { const x = wrapX(p.x0 + p.vx * tt, -16, 12), zr = p.z0 + p.vz * tt; const z = 9 + Math.abs(((zr - 9) % 19.2 + 19.2) % 19.2 - 9.6); return [x, Math.min(18.8, z)]; }
    const lo = p.zone === 'prom' ? -34 : -70, hi = p.zone === 'prom' ? 34 : 70; return [wrapX(p.x0 + p.vx * tt, lo, hi), p.z0];
  };
  const i = p.i; const h = hash(i * 3.7);
  const freeze = walk(T.s10 + .4);
  const L = [];
  // 0 hook: walking, phone in hand
  L.push({ t: 0, pos: walk(t), vis: 1, phone: p.phone ? 1 : 0, look: null });
  // 1 offline: stop dead, phones red
  L.push({ t: T.s10 + .1, pos: freeze, vis: 1, phone: p.phone ? 2 : 0, look: null, dur: .6 });
  // 2 one hour: drift to small clusters, phones dark
  { const cx = Math.round(freeze[0] / 6) * 6, cz = Math.round(freeze[1] / 5) * 5; const a = h * TAU; L.push({ t: T.h1 + .3, pos: [lerp(freeze[0], cx + Math.cos(a) * 1.3, .6), lerp(freeze[1], cz + Math.sin(a) * 1.1, .6)], vis: 1, phone: p.phone ? 3 : 0, dur: 3 }); }
  // 3 24 hours: a crowd at the TV shop, everyone else goes home
  if (i < 46) { const row = Math.floor(i / 12), k = i % 12; const a = lerp(-1.1, 1.1, k / 11) + (row % 2) * .09; const r = 3.2 + row * 1.1; L.push({ t: T.h24 + .2, pos: [-4.25 + Math.sin(a) * r, 7.3 + Math.cos(a) * r], vis: 1, phone: 0, look: [-4.25, 7], dur: 2.6 }); }
  else L.push({ t: T.h24 + .2, pos: freeze, vis: 0, phone: 0, dur: 2.6 });
  // 4 seven days: a bank queue, talk circles, map readers
  if (i < 20) { const k = i; const pos = k < 7 ? [13.6, 13.6 + k * 1.05] : [13.0 - (k - 7) * 1.05, 19.9]; L.push({ t: T.d7 + .2, pos, vis: 1, phone: 0, look: k < 7 ? [20, 13.6 + k * 1.05] : [20, 19.9], dur: 2.4 }); }
  else if (i < 45) { const gI = Math.floor((i - 20) / 5), k = (i - 20) % 5; const C = [[-11, 11.6], [-1.5, 16.4], [5, 11.5], [-12.5, 17.2], [8, 16.5]][gI]; const a = k / 5 * TAU + gI; L.push({ t: T.d7 + .2, pos: [C[0] + Math.cos(a) * 1.25, C[1] + Math.sin(a) * 1.25], vis: 1, phone: 0, look: C, dur: 2.4 }); }
  else if (i < 53) { const k = i - 45; L.push({ t: T.d7 + .2, pos: [-8.2 + (k % 4) * 1.4, 15.3 + Math.floor(k / 4) * 1.1], vis: 1, phone: 0, look: [-6, 13.4], map: 1, dur: 2.4 }); }
  else if (i < 75) { L.push({ t: T.d7 + .2, pos: walk(t * .6), vis: 1, phone: 0, dur: 2.4 }); }
  else L.push({ t: T.d7 + .2, pos: freeze, vis: 0, phone: 0, dur: 2.4 });
  // 5 one year: market
  if (i < 70) { const st = W.stalls[i % 12].position; const side = Math.floor(i / 12) % 2 ? 1 : -1; const wob = [Math.sin(t * .4 + h * 9) * .8, Math.cos(t * .33 + h * 7) * .3];
    L.push({ t: T.y1 + .2, pos: [st.x + (h - .5) * 2.6 + wob[0], st.z + (st.z < 14 ? 1.6 : -1.6) * (1 + (Math.floor(i / 12) % 3) * .7) + wob[1]], vis: 1, phone: 0, look: [st.x, st.z], dur: 2.2 }); }
  else L.push({ t: T.y1 + .2, pos: freeze, vis: 0, phone: 0, dur: 2.2 });
  // 6 one hundred years: children playing in a ring, a few adults
  if (i < 14) { const a = t * .9 + i / 14 * TAU; L.push({ t: T.y100 + .3, pos: [-2 + Math.cos(a) * 4.2, 13.6 + Math.sin(a) * 3.0], vis: 1, phone: 0, kid: 1, dur: 2.2 }); }
  else if (i < 26) L.push({ t: T.y100 + .3, pos: walk(t * .5), vis: 1, phone: 0, dur: 2.2 });
  else L.push({ t: T.y100 + .3, pos: freeze, vis: 0, phone: 0, dur: 2.2 });
  // 7 a thousand years: a handful of villagers
  if (i < 10) { const hs = W.houses[8 + (i % 8)]; L.push({ t: 54.4, pos: [hs.position.x + Math.cos(t * .3 + i) * 2.6, hs.position.z + 2.4 + Math.sin(t * .3 + i) * .8], vis: 1, phone: 0, dur: 1.6 }); }
  else L.push({ t: T.y1k, pos: freeze, vis: 0, phone: 0, dur: 1 });
  // 8 ten thousand years: nobody
  L.push({ t: T.y10k, pos: freeze, vis: 0, phone: 0, dur: 1.4 });
  // blend
  let cur = L[0];
  for (let k = 1; k < L.length; k++) {
    const nx = L[k]; if (t < nx.t) break;
    const b = ss(seg(t, nx.t + (nx.vis ? h * .5 : 0), nx.t + (nx.dur || 1.5) + (nx.vis ? h * .5 : 0)));
    const vis = cur.vis && nx.vis ? 1 : cur.vis ? 1 - b : nx.vis ? b : 0;
    cur = { pos: [lerp(cur.pos[0], nx.pos[0], b), lerp(cur.pos[1], nx.pos[1], b)], vis, phone: b < .5 ? cur.phone : nx.phone, look: b < .5 ? cur.look : nx.look, map: b > .5 ? nx.map : cur.map, kid: b > .5 ? nx.kid : cur.kid };
  }
  return cur;
}
function updatePeople(W, t) {
  const gp = W.phoneGlow.geometry.attributes.position.array, gc = W.phoneGlow.geometry.attributes.color.array;
  W.people.forEach((p, i) => {
    const a = personAt(W, p, t), b = personAt(W, p, t - .08);
    const dx = a.pos[0] - b.pos[0], dz = a.pos[1] - b.pos[1], spd = Math.hypot(dx, dz) / .08;
    let yaw = p.yaw ?? 0;
    if (a.look) yaw = Math.atan2(-(a.look[1] - a.pos[1]), a.look[0] - a.pos[0]);
    else if (spd > .15) yaw = Math.atan2(-dz, dx);
    else yaw = hash(i) * TAU;
    const bob = spd > .2 ? Math.abs(Math.sin(t * 9 + i)) * .08 : 0;
    const s = a.vis * p.h * (a.kid ? .68 : 1);
    M4.compose(V.set(a.pos[0], bob, a.pos[1]), Q.setFromEuler(E.set(0, yaw, 0)), S3.set(Math.max(s, .0001), Math.max(s, .0001), Math.max(s, .0001)));
    W.pBody.setMatrixAt(i, M4); W.pHead.setMatrixAt(i, M4);
    const ph = a.vis > .5 ? a.phone : 0;
    const pm = ph ? M4 : M4.clone().scale(S3.set(.0001, .0001, .0001));
    W.pPhone.setMatrixAt(i, pm);
    W.pMap.setMatrixAt(i, a.map && a.vis > .5 ? M4 : M4.clone().scale(S3.set(.0001, .0001, .0001)));
    const pc = ph === 1 ? tmpC.set('#9fdcff') : ph === 2 ? tmpC.set((Math.floor(t * 4 + i) % 2) ? '#ff3b3b' : '#ff9a9a') : tmpC.set('#202226');
    W.pPhone.setColorAt(i, pc);
    // glow
    const gx = a.pos[0] + Math.cos(yaw) * .4 * s, gz = a.pos[1] - Math.sin(yaw) * .4 * s;
    gp[i * 3] = gx; gp[i * 3 + 1] = 1.15 * s + bob; gp[i * 3 + 2] = gz;
    const gk = ph === 1 ? .55 : ph === 2 ? .8 : 0; const gcl = ph === 2 ? [1, .2, .2] : [.45, .8, 1];
    gc[i * 3] = gcl[0] * gk; gc[i * 3 + 1] = gcl[1] * gk; gc[i * 3 + 2] = gcl[2] * gk;
  });
  for (const m of [W.pBody, W.pHead, W.pPhone, W.pMap]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  W.phoneGlow.geometry.attributes.position.needsUpdate = true; W.phoneGlow.geometry.attributes.color.needsUpdate = true;
}

function updateFX(W, t, L) {
  // data web: draws on during the first second, then snaps on "Завинаги"
  const pp = W.pulses.geometry.attributes.position.array; let n = 0;
  W.arcs.forEach((a, i) => {
    const on = eo(seg(t, a.t0, a.t0 + 1.4));
    const cutK = seg(t, a.cut, a.cut + .35);
    const flick = t > a.cut - .5 && t < a.cut ? (hash(Math.floor(t * 30) + i) > .4 ? 1 : .15) : 1;
    const frac = on * (1 - cutK);
    a.m.visible = frac > .01 && flick > .2;
    a.m.geometry.setDrawRange(cutK > 0 ? Math.floor(a.total * cutK / 6) * 6 : 0, Math.floor(a.total * frac / 6) * 6);
    for (let k = 0; k < 3; k++) {
      let P_;
      if (t < a.cut) { const u = ((t * .45 + k / 3 + i * .17) % 1); P_ = u < on ? a.c.getPoint(u) : new THREE.Vector3(0, -999, 0); }
      else { const u = ((a.cut * .45 + k / 3 + i * .17) % 1); const dt = t - a.cut; P_ = a.c.getPoint(u); P_.y -= 9.8 * dt * dt * 2; if (dt > 1.6 || P_.y < 0) P_.set(0, -999, 0); }
      pp[n++] = P_.x; pp[n++] = P_.y; pp[n++] = P_.z;
    }
  });
  W.pulses.geometry.attributes.position.needsUpdate = true;
  W.webMat.opacity = .85 * (t > 5.0 ? (hash(Math.floor(t * 24)) > .3 ? 1 : .3) : 1);
  // icons
  for (const ic of W.icons) {
    let vis = false, sc = 0, pos = V.set(0, 0, 0), op = 1;
    if (ic.kind === 'hook') {
      const life = t - ic.t0; vis = life > 0 && t < 6.2;
      if (vis) {
        sc = back(seg(life, 0, .35)) * ic.size;
        if (t > 5.25) { const d = t - 5.25; sc *= 1 - seg(d, .3, .9); op = (hash(Math.floor(t * 30) + ic.t0 * 100) > .5 ? 1 : .35); }
        if (ic.person) { const a = personAt(W, ic.person, t); pos.set(a.pos[0], 2.9 + Math.min(life, 2) * .5, a.pos[1]); }
        else pos.copy(ic.pos).add(V.clone().set(0, Math.min(life, 3) * 1.2, 0));
        if (t > 5.25) pos.y -= (t - 5.25) ** 2 * 14;
        if (life > 2.6 && t < 5.25) { sc *= 1 - seg(life, 2.6, 3.0); }
      }
    } else if (ic.kind === 'car') {
      vis = t > ic.t0 && t < ic.t1; if (vis) { const p = carPos(W, ic.car, t), s = p.s; pos.set(ic.car.axis === 'x' ? s : ic.car.fixed, 3.6, ic.car.axis === 'x' ? ic.car.fixed : s); sc = back(seg(t, ic.t0, ic.t0 + .3)) * ic.size * (1 - seg(t, ic.t1 - .3, ic.t1)); }
    } else if (ic.kind === 'fixed') {
      vis = t > ic.t0 && t < ic.t1; if (vis) { pos.copy(ic.pos); pos.y += Math.sin(t * 3) * .1; sc = back(seg(t, ic.t0, ic.t0 + .3)) * ic.size * (1 - seg(t, ic.t1 - .3, ic.t1)); }
    } else {
      vis = t > ic.t0 && t < ic.t1; if (vis) { const a = personAt(W, ic.person, t); pos.set(a.pos[0], 2.9 + Math.sin(t * 3 + ic.t0) * .08, a.pos[1]); sc = back(seg(t, ic.t0, ic.t0 + .3)) * ic.size * (1 - seg(t, ic.t1 - .35, ic.t1)) * a.vis; }
    }
    ic.s.visible = vis && sc > .01; if (ic.s.visible) { ic.s.position.copy(pos); ic.s.scale.set(sc, sc, 1); ic.s.material.opacity = op; }
  }
  // radio rings from the mast
  W.rings.forEach((r, k) => {
    const t0 = 29.4 + k * .95, u = (t - t0) / 2.6; r.visible = u > 0 && u < 1 && t < T.y1 - .2;
    if (r.visible) { r.position.copy(W.mastTop); const s = 2 + u * 22; r.scale.set(s, s, 1); r.material.opacity = (1 - u) * .85; }
  });
  // birds (from 100 years on)
  const bv = Math.max(seg(t, 46.5, 48), 0);
  W.birds.forEach((b, i) => {
    b.s.visible = bv > 0 && t < 67 && i < (t > T.y10k ? 26 : 12);
    if (!b.s.visible) return; const a = b.ph + t * b.sp;
    b.s.position.set(b.cx + Math.cos(a) * b.r, b.h + Math.sin(t * .7 + i) * 2, b.cz + Math.sin(a) * b.r * .6);
    b.s.material.map = W.birdTex[Math.floor(t * b.fl + i) % 2]; b.s.scale.set(2.2, 2.2, 1); b.s.material.opacity = bv;
  });
}
