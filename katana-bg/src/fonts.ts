import {continueRender, delayRender, staticFile} from 'remotion';

const LATIN =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const CYR = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';

const faces: [string, string, string][] = [
  ['Unbounded', 'unbounded', '900'],
  ['Oswald', 'oswald', '500'],
  ['Oswald', 'oswald', '600'],
  ['Oswald', 'oswald', '700'],
  ['JetBrains Mono', 'jetbrains-mono', '500'],
  ['JetBrains Mono', 'jetbrains-mono', '700'],
  ['JetBrains Mono', 'jetbrains-mono', '800'],
];

let started = false;
export const loadFonts = () => {
  if (started || typeof document === 'undefined') return;
  started = true;
  const handle = delayRender('Loading fonts');
  const all: Promise<FontFace>[] = [];
  for (const [family, file, weight] of faces) {
    for (const [sub, range] of [
      ['latin', LATIN],
      ['cyrillic', CYR],
    ]) {
      const ff = new FontFace(family, `url(${staticFile(`fonts/${file}-${sub}-${weight}-normal.woff2`)}) format('woff2')`, {
        weight,
        unicodeRange: range,
      });
      document.fonts.add(ff);
      all.push(ff.load());
    }
  }
  Promise.all(all)
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
};
