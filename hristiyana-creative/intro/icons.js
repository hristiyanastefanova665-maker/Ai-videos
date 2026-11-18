// Flat "sticker" icon set in the Hristiyana Creative palette.
// All icons: viewBox 0 0 120 120, deep-black outline, cream / rose / gold / beige fills.
(function () {
  const K = '#171318', R = '#C66F8C', C = '#FFF9F5', B = '#E8D7CF', G = '#D6B27C';
  const s = (inner, extra = '') =>
    `<svg viewBox="0 0 120 120" ${extra} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="${K}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">${inner}</svg>`;
  const I = {};
  I.chip = () => s(`
    <g stroke-width="5">${[30, 50, 70, 90].map(x => `<path d="M${x} 10v12M${x} 98v12M10 ${x}h12M98 ${x}h12"/>`).join('')}</g>
    <rect x="22" y="22" width="76" height="76" rx="16" fill="${R}"/>
    <rect x="34" y="34" width="52" height="52" rx="10" fill="${K}" stroke="none"/>
    <text x="60" y="71" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="30" fill="${G}" stroke="none">AI</text>`);
  I.sparkle = (c = G) => s(`<path d="M60 8 C64 40 80 56 112 60 C80 64 64 80 60 112 C56 80 40 64 8 60 C40 56 56 40 60 8Z" fill="${c}"/>`);
  I.image = () => s(`<rect x="12" y="20" width="96" height="80" rx="12" fill="${C}"/><circle cx="82" cy="44" r="10" fill="${G}"/><path d="M14 92 L44 56 L66 80 L78 68 L106 96" fill="${R}"/>`);
  I.play = () => s(`<rect x="10" y="22" width="100" height="76" rx="16" fill="${K}"/><path d="M50 42 L78 60 L50 78Z" fill="${G}" stroke="${G}"/>`);
  I.palette = () => s(`<path d="M60 12 C30 12 10 34 10 60 C10 88 32 108 58 108 C70 108 70 98 64 92 C58 86 62 76 72 76 L88 76 C102 76 110 66 110 54 C110 30 88 12 60 12Z" fill="${B}"/><circle cx="38" cy="50" r="8" fill="${R}"/><circle cx="58" cy="34" r="8" fill="${G}"/><circle cx="82" cy="42" r="8" fill="${K}"/><circle cx="34" cy="76" r="8" fill="${C}"/>`);
  I.pen = () => s(`<path d="M60 10 L92 58 L74 104 H46 L28 58Z" fill="${G}"/><path d="M60 10 V62"/><circle cx="60" cy="68" r="7" fill="${C}"/><path d="M42 104 H78 V114 H42Z" fill="${K}"/>`);
  I.bulb = (lit = true) => s(`<path d="M60 10 C36 10 22 28 22 48 C22 64 32 72 40 82 V92 H80 V82 C88 72 98 64 98 48 C98 28 84 10 60 10Z" fill="${lit ? G : C}"/><path d="M42 100 H78 M46 110 H74"/><path d="M50 74 L56 54 L64 64 L70 46" stroke-width="4"/>`);
  I.chat = () => s(`<path d="M14 22 H106 V82 H52 L30 102 V82 H14Z" fill="${C}"/><path d="M30 42 H90 M30 60 H72" stroke="${R}" stroke-width="7"/>`);
  I.code = () => s(`<rect x="10" y="18" width="100" height="84" rx="14" fill="${K}"/><path d="M42 44 L26 60 L42 76 M78 44 L94 60 L78 76" stroke="${G}" stroke-width="7"/><path d="M66 38 L54 82" stroke="${R}" stroke-width="7"/>`);
  I.wand = () => s(`<path d="M20 100 L76 44" stroke-width="12"/><path d="M20 100 L76 44" stroke="${C}" stroke-width="4"/><path d="M84 8 L88 26 L106 30 L88 34 L84 52 L80 34 L62 30 L80 26Z" fill="${G}"/><circle cx="100" cy="62" r="5" fill="${R}"/><circle cx="58" cy="18" r="4" fill="${R}"/>`);
  I.gear = () => s(`<path d="M52 8h16l3 14 12 6 12-8 11 11-8 12 6 12 14 3v16l-14 3-6 12 8 12-11 11-12-8-12 6-3 14H52l-3-14-12-6-12 8-11-11 8-12-6-12-14-3V52l14-3 6-12-8-12 11-11 12 8 12-6z" fill="${B}"/><circle cx="60" cy="60" r="16" fill="${R}"/>`);
  I.laptop = () => s(`<rect x="20" y="20" width="80" height="58" rx="8" fill="${K}"/><rect x="28" y="28" width="64" height="42" rx="3" fill="${R}" stroke="none"/><path d="M36 40 H70 M36 50 H82 M36 60 H60" stroke="${C}" stroke-width="5"/><path d="M8 86 H112 L104 98 H16Z" fill="${B}"/>`);
  I.printer = () => s(`<rect x="30" y="10" width="60" height="34" fill="${C}"/><rect x="10" y="40" width="100" height="46" rx="10" fill="${B}"/><circle cx="92" cy="56" r="5" fill="${R}"/><rect x="28" y="70" width="64" height="40" fill="${C}"/><path d="M40 84 H80 M40 96 H70"/>`);
  I.heart = (c = R) => s(`<path d="M60 104 C30 84 10 64 10 42 C10 24 24 12 40 12 C50 12 56 18 60 26 C64 18 70 12 80 12 C96 12 110 24 110 42 C110 64 90 84 60 104Z" fill="${c}"/>`);
  I.bills = () => s(`<rect x="10" y="44" width="92" height="54" rx="6" fill="${B}" transform="rotate(-8 56 71)"/><rect x="18" y="38" width="92" height="54" rx="6" fill="#d9e6c9"/><circle cx="64" cy="65" r="14" fill="${C}"/><path d="M28 50 h10 M90 80 h10"/>`);
  I.bag = () => s(`<path d="M44 14 H76 L68 32 H52Z" fill="${G}"/><path d="M52 32 C20 46 12 72 16 90 C20 106 34 110 60 110 C86 110 100 106 104 90 C108 72 100 46 68 32Z" fill="${G}"/><path d="M48 32 H72" stroke-width="7"/><text x="60" y="86" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="34" fill="${K}" stroke="none">€</text>`);
  I.comment = () => s(`<path d="M60 12 C32 12 12 30 12 54 C12 66 18 76 28 84 L22 106 L46 94 C50 95 55 96 60 96 C88 96 108 78 108 54 C108 30 88 12 60 12Z" fill="${C}"/><circle cx="40" cy="54" r="6" fill="${K}" stroke="none"/><circle cx="60" cy="54" r="6" fill="${K}" stroke="none"/><circle cx="80" cy="54" r="6" fill="${K}" stroke="none"/>`);
  I.pin = () => s(`<path d="M60 112 C60 112 22 70 22 46 C22 24 40 8 60 8 C80 8 98 24 98 46 C98 70 60 112 60 112Z" fill="${R}"/><circle cx="60" cy="46" r="15" fill="${C}"/>`);
  I.check = () => s(`<circle cx="60" cy="60" r="48" fill="${G}"/><path d="M38 62 L54 76 L84 44" stroke-width="9"/>`);
  I.cursor = () => s(`<path d="M24 10 L24 96 L46 76 L62 110 L78 102 L62 70 L92 68Z" fill="${C}"/>`);
  I.clapper = () => s(`<rect x="12" y="44" width="96" height="62" rx="8" fill="${K}"/><path d="M12 26 L104 12 L108 36 L16 50Z" fill="${C}"/><path d="M34 22 L46 46 M58 18 L70 42 M82 15 L94 39" stroke-width="6"/><path d="M50 62 L72 75 L50 88Z" fill="${G}" stroke="${G}"/>`);
  I.doc = () => s(`<path d="M24 8 H76 L98 30 V112 H24Z" fill="${C}"/><path d="M76 8 V30 H98" fill="${B}"/><path d="M38 52 H84 M38 68 H84 M38 84 H66" stroke="${R}" stroke-width="6"/>`);
  I.calendar = () => s(`<rect x="12" y="20" width="96" height="88" rx="12" fill="${C}"/><path d="M12 46 H108" /><rect x="14" y="22" width="92" height="22" rx="8" fill="${R}" stroke="none"/><path d="M36 10 V30 M84 10 V30"/><path d="M40 74 L54 88 L82 58" stroke="${K}" stroke-width="7"/>`);
  I.mail = () => s(`<rect x="10" y="24" width="100" height="72" rx="10" fill="${C}"/><path d="M12 28 L60 66 L108 28" /><circle cx="100" cy="26" r="13" fill="${R}"/>`);
  I.box = () => s(`<path d="M14 40 L60 20 L106 40 V90 L60 110 L14 90Z" fill="${B}"/><path d="M14 40 L60 60 L106 40 M60 60 V110"/><path d="M36 30 L82 50 V66" stroke="${G}" stroke-width="6"/>`);
  I.tag = () => s(`<path d="M12 50 V16 H46 L106 76 L72 110Z" fill="${G}"/><circle cx="32" cy="36" r="8" fill="${C}"/>`);
  I.users = () => s(`<circle cx="42" cy="40" r="17" fill="${B}"/><path d="M12 102 C12 76 26 64 42 64 C58 64 72 76 72 102Z" fill="${R}"/><circle cx="82" cy="46" r="14" fill="${C}"/><path d="M62 102 C62 82 72 72 84 72 C98 72 108 82 108 102Z" fill="${G}"/>`);
  I.star = () => s(`<path d="M60 10 L74 42 L108 46 L82 70 L90 104 L60 86 L30 104 L38 70 L12 46 L46 42Z" fill="${G}"/>`);
  I.question = (c = R) => s(`<circle cx="60" cy="60" r="50" fill="${c}"/><path d="M44 46 C44 30 76 28 76 46 C76 58 60 58 60 72" stroke="${C}" stroke-width="10"/><circle cx="60" cy="90" r="6" fill="${C}" stroke="${C}"/>`);
  I.exclaim = (c = G) => s(`<circle cx="60" cy="60" r="50" fill="${c}"/><path d="M60 30 V70" stroke="${K}" stroke-width="12"/><circle cx="60" cy="88" r="7" fill="${K}"/>`);
  I.compass = () => s(`<circle cx="60" cy="60" r="50" fill="${C}"/><path d="M60 22 L72 60 L60 98 L48 60Z" fill="${R}"/><path d="M60 60 L72 60 L60 98 L48 60Z" fill="${K}"/><circle cx="60" cy="60" r="6" fill="${G}"/>`);
  I.rocket = () => s(`<path d="M60 8 C84 26 88 56 80 84 H40 C32 56 36 26 60 8Z" fill="${C}"/><circle cx="60" cy="46" r="11" fill="${R}"/><path d="M40 70 L22 92 L40 88 M80 70 L98 92 L80 88" fill="${G}"/><path d="M48 92 C50 104 56 110 60 114 C64 110 70 104 72 92" fill="${G}"/>`);
  window.ICON = I;
})();
