// Renders index.html frame-by-frame with Playwright and encodes with ffmpeg.
// Usage: node render.js            -> full video (out/golf-mk6-reel.mp4)
//        node render.js stills 1.2 4.4 ...  -> PNG stills at given times (out/stills)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const FPS = 30, DUR = 18.1, W = 1080, H = 1920;
const url = 'file://' + path.join(__dirname, 'index.html');

(async () => {
  const browser = await chromium.launch();
  const args = process.argv.slice(2);
  const stills = args[0] === 'stills';
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: stills ? 0.5 : 1 });
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  await page.goto(url);
  await page.waitForFunction('window.ready === true');
  fs.mkdirSync(path.join(__dirname, 'out/stills'), { recursive: true });

  if (stills) {
    for (const t of args.slice(1)) {
      await page.evaluate(t => window.seek(t), parseFloat(t));
      await page.screenshot({ path: path.join(__dirname, 'out/stills', `t${(+t).toFixed(2)}.jpg`), type: 'jpeg', quality: 80 });
    }
    await browser.close();
    return;
  }

  const out = path.join(__dirname, 'out/golf-mk6-reel.mp4');
  const ff = spawn('ffmpeg', ['-y', '-v', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-i', path.join(__dirname, 'assets/audio.mp3'),
    '-t', String(DUR), '-af', `afade=t=out:st=${DUR - 0.25}:d=0.25`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const N = Math.round(FPS * DUR);
  for (let i = 0; i < N; i++) {
    await page.evaluate(t => window.seek(t), i / FPS);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log(`frame ${i}/${N}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('done', out);
})();
