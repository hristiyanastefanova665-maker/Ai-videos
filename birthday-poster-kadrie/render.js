// Renders poster.html to a print-ready PNG. Usage: node render.js [scale]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const scale = Number(process.argv[2] || 3.5);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 1414 }, deviceScaleFactor: scale });
  await page.goto('file://' + path.resolve(__dirname, 'poster.html'));
  await page.waitForSelector('body[data-ready="1"]');
  await page.waitForTimeout(300);
  const out = path.resolve(__dirname, 'out', `kadrie-birthday-poster${scale === 1 ? '-preview' : ''}.png`);
  await page.screenshot({ path: out });
  await browser.close();
  console.log(out);
})();
