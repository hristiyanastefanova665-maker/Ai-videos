// Renders cover.html -> out/cover.png (1080x1920) + out/cover_grid_preview.png (3:4 profile-grid crop)
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + path.join(__dirname, 'cover.html'));
  await p.waitForFunction('window.ready === true');
  await p.screenshot({ path: path.join(__dirname, 'out/cover.png') });
  await p.screenshot({ path: path.join(__dirname, 'out/cover_grid_preview.png'), clip: { x: 0, y: 240, width: 1080, height: 1440 } });
  await b.close();
})();
