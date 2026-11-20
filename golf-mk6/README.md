# VW Golf Mk6 – 18s vertical reel

`out/golf-mk6-reel.mp4`: 1080×1920, 30 fps, 18.1 s. Uses the soundtrack from the reference video.

- `assets/golf.jpg`: the source photo. `assets/gen/` holds the cutouts, neon outline, detail crops and background made from it.
- `index.html`: the GSAP timeline, with one block per shot (S1–S12).

    npm install
    node render.js                 # full video
    node render.js stills 1.2 5.6  # preview frames

Adding more photos of the car (rear, side, wheel, interior) means replacing the `img(...)` sources in a shot's block.
