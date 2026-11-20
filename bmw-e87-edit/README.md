# BMW E87 118d edit

18 s vertical (720x1280, 30 fps) collage edit of my silver 2005 BMW E87 118d, styled after a reference reel:
cut-out pieces sliding over a wide shot, gold neon outlines fading into the real car, zoom-through
headlight / wheel masks, neon badge (blue to gold), car-on-bonnet and stacked cars.

- `assets/my-car.jpg`: the real photo. `grille.jpg`, `headlight.jpg`, `side.jpg`: AI stills of the same car (ElevenLabs, Nano Banana 2).
- `src/cutout.py`: background removal (RMBG-1.4 ONNX) -> `build/*_rgba.png`
- `src/render.py`: renders all scenes and effects -> `build/frames.mp4`
- `output/bmw-e87-118d-edit.mp4`: final video with the reference track's audio.

## Version 2: from raw AI video clips

1. `src/gen_clip.py` / `src/gen_all.sh`: raw clips in `raw/` made with Wan 2.2 image-to-video on the free
   Hugging Face ZeroGPU space (`zerogpu-aoti/wan2-2-fp8da-aoti-faster`), from portrait start frames of the car.
2. Beat map: OpenMontage `music-to-video` skill's `analyze-beatgrid.py` (161 BPM, a cut on every bar) -> `build/audiomap.json`.
3. `src/clip_masks.py`: per-frame cut-outs of the clips (RMBG-1.4).
4. `src/render_clips.py`: the edit itself -> `output/bmw-e87-118d-edit.mp4`.

`src/render.py` is the first, stills-only version (also provides the shared effect helpers).
