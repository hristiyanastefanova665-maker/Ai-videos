// Renders index.html frame-by-frame with Playwright and encodes with ffmpeg.
//   node render.js                 -> out/how-i-made-ai-video.mp4 (video + mixed audio)
//   node render.js stills 1.2 5.6  -> out/stills/*.jpg preview frames
//   node render.js cues            -> out/sfx_cues.json only
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const path = require('path'), fs = require('fs');
const FPS = 30, W = 1080, H = 1920, D = __dirname;
const args = process.argv.slice(2), mode = args[0] || 'video';
fs.mkdirSync(path.join(D, 'out/stills'), { recursive: true });
if (!fs.existsSync(path.join(D, 'assets/ref/f0001.jpg'))) {
  fs.mkdirSync(path.join(D, 'assets/ref'), { recursive: true });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(D, 'assets/reference.mp4'), '-vf', 'scale=540:960', '-q:v', '4', path.join(D, 'assets/ref/f%04d.jpg')]);
}
(async () => {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: mode === 'stills' ? 0.5 : 1 });
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
  await page.goto('file://' + path.join(D, 'index.html'));
  await page.waitForFunction('window.ready === true', null, { timeout: 120000 });
  const dur = await page.evaluate('window.DUR');
  fs.writeFileSync(path.join(D, 'out/sfx_cues.json'), JSON.stringify(await page.evaluate('window.SFX')));
  if (mode === 'cues') return browser.close();
  if (mode === 'stills') {
    for (const t of args.slice(1)) {
      await page.evaluate(t => window.seek(t), parseFloat(t));
      await page.screenshot({ path: path.join(D, 'out/stills', `t${(+t).toFixed(2).padStart(6, '0')}.jpg`), type: 'jpeg', quality: 80 });
    }
    return browser.close();
  }
  execFileSync('python3', ['-I', path.join(D, 'tools/audio.py'), D], { stdio: 'inherit' });
  const start = +(args[1] || 0), end = +(args[2] || dur);
  const out = path.join(D, mode === 'part' ? 'out/part.mp4' : 'out/how-i-made-ai-video.mp4');
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-ss', String(start), '-i', path.join(D, 'out/final_audio.wav'), '-t', String(end - start),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-profile:v', 'high',
    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const N = Math.round((end - start) * FPS), t0 = Date.now();
  for (let i = 0; i < N; i++) {
    await page.evaluate(t => window.seek(t), start + i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`frame ${i}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await browser.close();
  console.log('done', out);
})();
