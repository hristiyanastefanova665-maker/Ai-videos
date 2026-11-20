# BMW E87 118d edit

18 s vertical (720x1280, 30 fps) collage edit of my silver 2005 BMW E87 118d, styled after a reference reel:
cut-out pieces sliding over a wide shot, gold neon outlines fading into the real car, zoom-through
headlight / wheel masks, neon badge (blue to gold), car-on-bonnet and stacked cars.

- `assets/my-car.jpg`: the real photo. `grille.jpg`, `headlight.jpg`, `side.jpg`: AI stills of the same car (ElevenLabs, Nano Banana 2).
- `src/cutout.py`: background removal (RMBG-1.4 ONNX) -> `build/*_rgba.png`
- `src/render.py`: renders all scenes and effects -> `build/frames.mp4`
- `output/bmw-e87-118d-edit.mp4`: final video with the reference track's audio.

```
python3 src/cutout.py rmbg.onnx build assets/*.jpg
python3 src/render.py 18.13 build/frames.mp4
ffmpeg -i build/frames.mp4 -i reference.mp4 -map 0:v -map 1:a -c:v copy -shortest output/bmw-e87-118d-edit.mp4
```
