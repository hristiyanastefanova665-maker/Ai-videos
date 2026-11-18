# Как създадох AI видео безплатно — Instagram Reel

`out/how-i-made-ai-video.mp4` — 1080×1920, 30 fps, H.264 + AAC, ~106 s (follows the 103 s ElevenLabs voiceover).

Built as an HTML/CSS/SVG + GSAP timeline, captured frame-by-frame with Playwright and encoded with ffmpeg.

| Scene | Time | Content |
|---|---|---|
| 01 кука | 0–11.8 | Avatar + reference video in phones, „ИСКАШ ТАКИВА ВИДЕА?“, crossed-out prices, „БЕЗПЛАТНО!“ stamp |
| 02 идеята | 11.8–34.7 | Step 1 title + idea bulb, AI chat (ChatGPT, not Claude), „ЗАЩО?“ token jar, idea + reference video → prompt |
| 03 гласът | 34.7–54.5 | Step 2 title, voiceover script with [tags], ElevenLabs-style TTS, languages, MP3 out |
| 04 магията | 54.5–78.3 | Step 3 Claude / Claude Code, laptop, 3 files fly in, dev environment, timeline, render |
| 05 резултатът | 78.3–93 | Finished video reveal, free tools/plans + limits disclaimer, „не е нужно да си…“ |
| 06 за теб | 93–106.6 | CTA (save / follow), Hristiyana Creative end card |

## Re-render

    npm install
    node render.js                 # full video -> out/how-i-made-ai-video.mp4
    node render.js stills 3 45.5   # preview frames -> out/stills/
    node render.js part 54 66      # render a section -> out/part.mp4

`tools/prep.py` builds `data.js` (corrected Bulgarian subtitles aligned to the ASR word timings in
`tools/asr_transcript.json`, plus the mouth-movement envelope). `tools/avatar.py` cuts the avatar out of
its circle and makes the lip layer. `tools/audio.py` synthesizes the SFX and music bed and mixes them under
the voiceover (called automatically by `render.js`).
