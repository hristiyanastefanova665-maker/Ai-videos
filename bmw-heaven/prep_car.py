"""Cut the BMW out of the photo and build the maps used for relighting.

Outputs (in OUT dir), all cropped to the car's bounding box:
  car_rgba.png  - the original photo pixels with a clean alpha
  maps.npz      - paint / glass / lamp / depth maps (float32, 0..1)
"""
import sys
import numpy as np
import cv2
from PIL import Image
from rembg import remove, new_session

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
rgb = np.asarray(im).astype(np.float32) / 255
h, w = rgb.shape[:2]

masks = []
for m in ("u2net", "isnet-general-use"):
    a = np.asarray(remove(im, session=new_session(m), only_mask=True)).astype(np.float32) / 255
    masks.append(a)
a = np.maximum(masks[0], masks[1])
# only keep the car region (isnet picks up some background)
keep = np.zeros_like(a)
keep[455:1240, 100:1080] = 1
a = a * keep

# recover the right-hand mirror (silver against the dark hedge)
lum = rgb.mean(2)
box = np.zeros_like(a)
box[615:700, 895:1010] = 1
mirror = (lum > 0.42).astype(np.float32) * box
mirror = cv2.morphologyEx(mirror, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
mirror = cv2.morphologyEx(mirror, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
# keep only the component that touches the body
n, lab, st, _ = cv2.connectedComponentsWithStats((mirror > 0.5).astype(np.uint8))
if n > 1:
    big = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])
    mirror = (lab == big).astype(np.float32)
a = np.maximum(a, cv2.GaussianBlur(mirror, (0, 0), 1.2))

# clean alpha: threshold + tight feather, small erosion to kill hedge fringe
hard = (a > 0.5).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(hard)
big = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])
hard = (lab == big).astype(np.uint8)
hard = cv2.morphologyEx(hard, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
hard = cv2.erode(hard, np.ones((3, 3), np.uint8))
alpha = cv2.GaussianBlur(hard.astype(np.float32), (0, 0), 1.3)

# fade the bottom of the car (ground contact shadow) into a dark underbody
ys = np.arange(h, dtype=np.float32)[:, None]

ys0, ys1 = np.where(hard.any(1))[0][[0, -1]]
xs0, xs1 = np.where(hard.any(0))[0][[0, -1]]
pad = 12
y0, y1, x0, x1 = ys0 - pad, ys1 + pad, xs0 - pad, xs1 + pad
rgb_c = rgb[y0:y1, x0:x1]
alpha_c = alpha[y0:y1, x0:x1]
H, W = alpha_c.shape

# decontaminate edge colours (pull dark hedge spill out of the silhouette)
inner = cv2.erode((alpha_c > 0.98).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(np.float32)
num = cv2.GaussianBlur(rgb_c * inner[..., None], (0, 0), 4)
den = cv2.GaussianBlur(inner, (0, 0), 4)[..., None] + 1e-4
fill = num / den
edge = np.clip((1 - inner) * (alpha_c > 0.02), 0, 1)[..., None]
rgb_c = rgb_c * (1 - edge * 0.6) + fill * edge * 0.6

# ---- maps (coords in the cropped image) ----
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
u, v = xx / W, yy / H
L = rgb_c.mean(2)
sat = rgb_c.max(2) - rgb_c.min(2)

# windscreen: dark region in the upper part, inside the A-pillars
glass = ((L < 0.42) & (v > 0.06) & (v < 0.30)).astype(np.float32)
glass *= (np.abs(u - 0.5) < 0.40 - (0.30 - v) * 0.25)
glass = cv2.morphologyEx(glass, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
glass = cv2.GaussianBlur(glass, (0, 0), 3)

# lamps: very bright pixels in the headlight band
heads = np.zeros((H, W), np.float32)
for cx in (0.155, 0.85):   # the two headlight housings (fraction of crop)
    cv2.ellipse(heads, (int(cx * W), int(0.585 * H)), (int(0.115 * W), int(0.07 * H)), 0, 0, 360, 1, -1)
lamp = np.clip((L - 0.80) / 0.15, 0, 1) * heads
lamp = cv2.GaussianBlur(lamp.astype(np.float32), (0, 0), 2)

# paint: neutral, mid/bright, not glass/lamp
paint = np.clip((L - 0.30) / 0.25, 0, 1) * np.clip(1 - sat / 0.15, 0, 1)
paint = paint * (1 - glass) * (1 - lamp)
# hood is the big upward-facing panel (between windscreen and lamps)
hood = paint * np.exp(-((v - 0.42) / 0.12) ** 2) * (v < 0.55)
paint = cv2.GaussianBlur(paint, (0, 0), 1.5)

# depth (+ = towards camera). Rounded nose, recessed screen/roof, mirrors out.
ex = (u - 0.5) / 0.5
depth = 0.55 + 0.45 * np.clip(1 - ex ** 2, 0, 1)            # rounded front
depth = depth * np.clip((v - 0.05) / 0.35, 0, 1) ** 0.6       # roof/screen back
depth = depth - glass * 0.15
depth = cv2.GaussianBlur(depth.astype(np.float32), (0, 0), 25) * (alpha_c > 0.01)
# underbody: darker toward the bottom edge (no ground in the sky)
under = np.clip((v - 0.86) / 0.14, 0, 1)

Image.fromarray((np.dstack([rgb_c, alpha_c]) * 255).clip(0, 255).astype(np.uint8)).save(f"{out}/car_rgba.png")
np.savez_compressed(f"{out}/maps.npz", glass=glass, lamp=lamp.astype(np.float32), paint=paint.astype(np.float32),
                    hood=hood.astype(np.float32), depth=depth, under=under.astype(np.float32))
dbg = np.hstack([np.dstack([m] * 3) for m in (glass, lamp, paint, hood, depth)])
cv2.imwrite(f"{out}/maps_dbg.jpg", (cv2.resize(dbg, (dbg.shape[1] // 3, dbg.shape[0] // 3)) * 255).astype(np.uint8))
chk = rgb_c * alpha_c[..., None] + np.array([1, 0, 1]) * (1 - alpha_c[..., None])
cv2.imwrite(f"{out}/cut_chk.jpg", cv2.cvtColor((chk * 255).astype(np.uint8), cv2.COLOR_RGB2BGR))
print("crop", (x0, y0, x1, y1), "size", W, H)
