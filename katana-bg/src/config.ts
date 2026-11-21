// ─────────────────────────────────────────────────────────────
//  ЕДИННО МЯСТО ЗА НАСТРОЙКИ: цветове, тайминг, текстове.
//  Single place to edit colors, timing (in frames @30fps) and all copy.
// ─────────────────────────────────────────────────────────────

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const C = {
  bg: '#080B0D', // почти черно
  bg2: '#101820', // тъмно синьо
  lime: '#C8FF00', // неоново лайм
  white: '#F4F4F4',
  grey: '#7D8790', // приглушено сиво
  dim: '#26313A', // линии / рамки
  dot: '#1E2932', // точкова мрежа
  warn: '#FF4D5E', // само за „Не отговаря“
};

export const FONT = {
  head: 'Oswald', // сгъстен, удебелен заглавен шрифт
  impact: 'Unbounded', // широк, тежък за акценти
  mono: 'JetBrains Mono', // терминален шрифт
};

// Сцените са рязани по паузите в гласа (ElevenLabs, 45.9 s).
// Scene cuts follow the pauses of the voice-over. Change `from`/`dur` to retime.
export const SCENES = {
  hook: {from: 0, dur: 114}, //        0.0 – 3.8 s
  problem: {from: 114, dur: 117}, //   3.8 – 7.7 s
  connection: {from: 231, dur: 159}, // 7.7 – 13.0 s
  prompt: {from: 390, dur: 204}, //   13.0 – 19.8 s
  katana: {from: 594, dur: 141}, //   19.8 – 24.5 s
  result: {from: 735, dur: 147}, //   24.5 – 29.4 s
  workflow: {from: 882, dur: 96}, //  29.4 – 32.6 s
  time: {from: 978, dur: 162}, //     32.6 – 38.0 s
  final: {from: 1140, dur: 240}, //   38.0 – 46.0 s
};

export const TOTAL_FRAMES = 1380; // 46 s

// Думи в [квадратни скоби] се осветяват в лайм кутия в надписа.
export const T = {
  hud: {
    frame: 'КАДЪР',
    brand: 'HIGGSFIELD · KATANA',
    rec: 'ЗАП',
  },
  hook: {
    caption: 'Не сте [готови] за това.',
    word1: 'ЛЕЛЕ.',
    line1: 'НЕ СТЕ',
    line2: 'ГОТОВИ',
  },
  problem: {
    caption: 'Без дори да [отворя] After Effects',
    label: '// ТРАДИЦИОННИЯТ ПРОЦЕС',
    window: 'After Effects — Проект_без_име.aep',
    notResponding: '(Не отговаря)',
    layers: [
      'Текст — ДВИЖЕНИЕ',
      'Форма 14',
      'Нулев обект 7',
      'Корекционен слой 2',
      'Камера 1',
      'Светлина 3',
      'Прекомпозиция 9',
      'Плътен фон',
    ],
    loading: 'Зареждане на плъгини… (ост. 4 мин)',
    tools: ['КЛЮЧОВИ КАДРИ', 'МАСКИ', 'ИЗРАЗИ', 'ГРАФ РЕДАКТОР', 'ПЛЪГИНИ', 'РЕНДЕР'],
    headline1: 'ТВЪРДЕ МНОГО',
    headline2: 'ИНСТРУМЕНТИ.',
  },
  connection: {
    caption: 'Claude [управлява] After Effects',
    label: '// ВРЪЗКАТА',
    nodes: [
      {title: 'CLAUDE', sub: 'ИИ МОДЕЛ'},
      {title: 'MCP СЪРВЪР', sub: 'МОСТ · ПРОТОКОЛ'},
      {title: 'AFTER EFFECTS', sub: 'КОМПОЗИЦИЯ'},
    ],
    packets: ['ИНСТРУКЦИИ', 'КОМАНДИ'],
    ok: 'СВЪРЗАНО',
  },
  prompt: {
    caption: 'Дадох му [този] промпт:',
    title: 'ПРОМПТЪТ:',
    header: 'KATANA  ›  НОВА ГЕНЕРАЦИЯ',
    chars: 'ЗНАКА',
    status: 'ПИШЕ',
    button: 'ГЕНЕРИРАЙ',
    text:
      'Създай 15-секундна кинематографична анимация с кинетична типография, преливащи форми, 3D елементи и плавни движения на камерата.',
    highlights: [
      '15-секундна',
      'кинематографична',
      'кинетична типография',
      'преливащи форми',
      '3D елементи',
      'плавни движения',
    ],
  },
  katana: {
    caption: '[Katana] поема всичко останало',
    thisIs: 'ТОВА Е',
    brand: 'Higgsfield',
    name: 'KATANA',
    satellites: ['CLAUDE', 'MCP СЪРВЪР', 'AFTER EFFECTS', 'ПРОМПТ', 'СЛОЕВЕ', 'РЕНДЕР'],
  },
  result: {
    caption: 'Това [движение] на камерата',
    w1: 'ТОВА',
    w2: 'ДВИЖЕНИЕ',
    w3: 'РАЗТЯГАНЕ.',
    w4a: 'ТАЗИ',
    w4b: 'КАМЕРА.',
  },
  workflow: {
    title1: 'ТВОЯТ',
    title2: 'ПРОЦЕС',
    steps: [
      {n: '01', t: 'ИДЕЯ'},
      {n: '02', t: 'ПРОМПТ'},
      {n: '03', t: 'АНИМАЦИЯ'},
      {n: '04', t: 'РЕНДЕР'},
    ],
  },
  time: {
    caption: 'Ето колко [време] спестяваш',
    label: '// СПЕСТЕНО ВРЕМЕ',
    cards: [
      {t: 'КЛЮЧОВИ КАДРИ', h: 4},
      {t: 'СЛОЕВЕ', h: 3},
      {t: 'AFTER EFFECTS', h: 2},
    ],
    unit: 'ЧАСА',
    unitOne: 'ЧАС',
    unitShort: 'Ч',
    total: 'ОБЩО',
    big: '9',
    sub: 'СПЕСТЕНИ С ЕДИН ПРОМПТ',
  },
  final: {
    caption: 'От първата [идея] до [резултата]',
    start: 'ПЪРВА ИДЕЯ',
    end: 'ФИНАЛЕН РЕЗУЛТАТ',
    l1: 'ЕДИН',
    l2: 'ПРОМПТ.',
    tag: 'FABLE 5.5 × HIGGSFIELD KATANA',
  },
};
