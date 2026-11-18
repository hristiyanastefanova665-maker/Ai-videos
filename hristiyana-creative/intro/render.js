// Renders index.html frame-by-frame with Playwright, then muxes with the mixed soundtrack.
// Usage: node render.js               -> out/video_noaudio.mp4 + out/sfx.json
//        node render.js stills 1.2 4.4 -> PNG stills at given seconds (out/stills)
//        node render.js sfx            -> only dump out/sfx.json
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const FPS = 30, W = 1080, H = 1920;
const url = 'file://' + path.join(__dirname, 'index.html');
(async () => {
  const args = process.argv.slice(2);
  const mode = args[0] || 'video';
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: mode === 'stills' ? 0.5 : 1 });
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
  await page.goto(url);
  await page.waitForFunction('window.ready === true', null, { timeout: 60000 });
  fs.mkdirSync(path.join(__dirname, 'out/stills'), { recursive: true });
  const sfx = await page.evaluate(() => window.SFX);
  fs.writeFileSync(path.join(__dirname, 'out/sfx.json'), JSON.stringify(sfx));
  const DUR = await page.evaluate(() => window.DUR);
  if (mode === 'sfx') { await browser.close(); return; }
  if (mode === 'stills') {
    for (const t of args.slice(1)) {
      await page.evaluate(t => window.seek(t), parseFloat(t));
      await page.screenshot({ path: path.join(__dirname, 'out/stills', `t${(+t).toFixed(2).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 80 });
    }
    await browser.close(); return;
  }
  const from = +(args[1] || 0), to = +(args[2] || DUR);
  const out = path.join(__dirname, args[3] || 'out/video_noaudio.mp4');
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const N0 = Math.round(from * FPS), N1 = Math.round(to * FPS);
  for (let i = N0; i < N1; i++) {
    await page.evaluate(t => window.seek(t), i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 94 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`frame ${i}/${N1}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('done', out);
})();
