// Render script.
//   node render.mjs              -> out/katana-bg.mp4 (silent, H.264, 1080x1920, 30fps)
//   node render.mjs --with-vo    -> also out/katana-bg-vo.mp4 (muxes assets/voiceover.mp3)
//   node render.mjs --stills     -> PNG stills of key frames into out/stills/
//   node render.mjs --frames=0-299  -> render only a frame range (fast preview)
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = process.argv.slice(2);
const BROWSER = process.env.CHROME_PATH || (existsSync('/opt/pw-browsers/chromium_headless_shell') ? '/opt/pw-browsers/chromium_headless_shell' : undefined);
const root = path.resolve('.');
mkdirSync('out/stills', {recursive: true});

const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
const composition = await selectComposition({serveUrl, id: 'KatanaBG', browserExecutable: BROWSER});

if (args.includes('--stills')) {
  const frames = (args.find((a) => a.startsWith('--at='))?.slice(5) ?? '30,90,180,300,420,520,640,700,780,850,920,1050,1110,1200,1300,1360')
    .split(',')
    .map(Number);
  for (const frame of frames) {
    await renderStill({composition, serveUrl, frame, output: `out/stills/f${String(frame).padStart(4, '0')}.png`, browserExecutable: BROWSER, scale: 0.5});
    console.log('still', frame);
  }
  process.exit(0);
}

const range = args.find((a) => a.startsWith('--frames='))?.slice(9);
const frameRange = range ? range.split('-').map(Number) : null;
const out = frameRange ? `out/preview-${range}.mp4` : 'out/katana-bg.mp4';
let last = -1;
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  crf: 16,
  pixelFormat: 'yuv420p',
  colorSpace: 'bt709',
  outputLocation: out,
  browserExecutable: BROWSER,
  concurrency: Math.max(1, os.cpus().length),
  frameRange,
  muted: true,
  onProgress: ({progress}) => {
    const p = Math.floor(progress * 20);
    if (p !== last) {
      last = p;
      console.log(`render ${Math.round(progress * 100)}%`);
    }
  },
});
console.log('wrote', out);

if (args.includes('--with-vo')) {
  const vo = 'assets/voiceover.mp3';
  if (!existsSync(vo)) throw new Error(`missing ${vo}`);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', out, '-i', vo, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', 'out/katana-bg-vo.mp4']);
  console.log('wrote out/katana-bg-vo.mp4');
}
