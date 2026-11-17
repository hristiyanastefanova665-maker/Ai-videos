# What if the internet disappeared forever? / Какво ако интернетът изчезне завинаги?

A 77-second vertical (1080×1920, 30 fps) animated short: one low-poly 3D city that changes over 10,000 years after the internet stops. The narration is in Bulgarian, with Bulgarian subtitles.

**Final video:** `out/WHAT_IF_INTERNET_DISAPPEARED.mp4` (subtitles burned in) · `out/WHAT_IF_INTERNET_DISAPPEARED.srt` (the same subtitles as a separate file)

## What's here

| File | What it is |
|---|---|
| `TREATMENT.md` | the plan: three possible structures, the one chosen, and the timing of every scene |
| `index.html`, `main.js` | the page that draws each frame: on-screen text (title, counter, big stage numbers, subtitles, end card, TinyPlot Studio logo) |
| `world.js` | the three.js city and how it changes over time (lighting, camera path, buildings, people, cars, trees, data web, icons) |
| `cues.js` | subtitle timings, matched to the narration |
| `audio/mix.py` | the music, sound effects and final mix, all generated in code; the narration is the supplied recording |
| `audio/events.json` | sound cue times exported from the scene, so notification pings and crumbling sounds land on the picture |
| `assets/StoryAudio.mp3`, `assets/reference.mp4` | the narration and reference video you supplied |

## Rebuild

From `../lemo-opuscar` (the toolkit submodule), with its npm packages installed:

```sh
node core/render/video.mjs ../what-if-internet --fps 30 --workers 3 --size 1080x1920 --out ../what-if-internet/out/video.mp4
node core/render/events.mjs ../what-if-internet --size 1080x1920 --out ../what-if-internet/audio/events.json
python3 ../what-if-internet/audio/mix.py ../what-if-internet/assets/StoryAudio.mp3 ../what-if-internet/audio/events.json ../what-if-internet/audio/mix.wav
sh core/render/mux.sh ../what-if-internet/out/video.mp4 ../what-if-internet/audio/mix.wav ../what-if-internet/out/WHAT_IF_INTERNET_DISAPPEARED.mp4 30 2
```

To preview single frames: `node core/render/still.mjs ../what-if-internet 12 40 60 --size 1080x1920`.
