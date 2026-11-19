# BMW in Heaven: 14.5 s vertical car commercial

Output: `out/bmw-heaven.mp4` (1080×1920, 30 fps, H.264, with the reference soundtrack).

The car is the owner's BMW 1 Series (E87), taken pixel-for-pixel from `assets/my_bmw.jpg`.
It is cut out, relit for a pink sunset, and animated in 2.5D. Nothing about the car is redrawn or generated.

| Time | Shot |
|---|---|
| 0–5 s | A tiny car tumbles out of the sky (motion blur) and grows. It breaks through billows that open around it, then settles into a hovering three-quarter pose with a light sweep. |
| 5–6.6 s | Close-up on the kidney grille, roundel and hood. Slow push-in, light sweep, shallow depth of field. |
| 6.6–8 s | Glide across the headlight with bloom. |
| 8–11 s | Low orbit up the front corner: fog lamp, bumper, fender, mirror. Foreground clouds drift past. |
| 11–14.5 s | Wide pull-back of the car suspended above a sea of clouds. |

## Rebuild

```bash
pip install numpy opencv-python-headless pillow "rembg[cpu]"
python3 clouds.py PLATES/                         # procedural lit cumulus plates
python3 prep_car.py assets/my_bmw.jpg CAR/        # cutout + paint/glass/lamp/depth maps
python3 render.py PLATES/ CAR/ out/bmw-heaven.mp4 [AUDIO_SOURCE]
```

## Limits

The source photo shows only the front of the car, so there are no rear or side-profile shots.
Adding them would mean inventing bodywork. With side and rear photos (or a 3D model of the E87),
those shots could be added the same way.
