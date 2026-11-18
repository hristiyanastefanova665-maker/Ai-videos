# Hristiyana – Personal brand intro reel

`out/hristiyana-intro-reel.mp4` — 1080×1920, 30 fps, ~87 s, Bulgarian voice-over, burned-in subtitles,
original music bed + sound design.

## Structure (synced to `assets/voiceover.mp3`)

| Time | Scene | Engagement |
|---|---|---|
| 0–9 s | Hook: terminal types „Мислиш, че AI е само за програмисти?“, screen bursts with AI icons & her posters, ПРОГРАМИСТ / ДИЗАЙНЕР / ТЕХНОЛОГИЧЕН ГЕНИЙ get crossed out | challenge an assumption |
| 9–19 s | Close-up „Здравей!“ + name card, presentation board: design · ideas · tech, sketch → real car poster | |
| 19–30 s | Hristiyana Creative logo, home desk with her real work (poster, caricature, invitation, printer) turning into a studio | |
| 30–42 s | Glitch pattern-interrupt → AI passion, „най-хубавото?“ close-up, confused person + chaotic AI UI → 3 easy steps, „AI МОЖЕ ДА БЪДЕ ЛЕСЕН.“ | complicated → simple |
| 42–50 s | Way #1 – НАУЧИ СЕ ДА ИЗПОЛЗВАШ AI (tools, content, video, design, automation) | |
| 50–68 s | Split screen of both ways → poster business from zero, roadmap (продукти → дизайн → печат → цени → първи клиенти), „not a huge budget“ → idea + desire + someone to show you | |
| 68–87 s | Follow CTA with animated button, poll card „КАКВО ИСКАШ ДА НАУЧИШ СЛЕДВАЩО?“, she points to the comments | invite participation |

## Files

- `index.html` + `main.js` – the whole animation (GSAP timeline, `window.seek(t)`), `icons.js` – brand icon set
- `words.js` – word-level subtitle timings, `env.js` – voice loudness per frame (lip movement)
- `assets/avatar.png` – background-removed avatar, `assets/voiceover.mp3` – narration
- `mix.py` – synthesizes music + SFX and mixes under the voice → `out/soundtrack.wav`
- `render.js` – Playwright frame renderer

## Rebuild

    cd .. && npm install && cd intro
    node render.js sfx                      # dump sound cue list
    python3 mix.py                          # numpy, scipy, soundfile
    node render.js video 0 87 out/video_noaudio.mp4
    ffmpeg -i out/video_noaudio.mp4 -i out/soundtrack.wav -c:v copy -c:a aac -b:a 192k -shortest out/hristiyana-intro-reel.mp4
    node render.js stills 5 40.5 70        # preview frames

Open `index.html#play` in a browser and click for a live preview with voice.
