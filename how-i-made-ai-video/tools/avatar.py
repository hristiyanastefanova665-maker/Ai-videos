# Cut the avatar out of its pink circle and split off mouth/eye layers for animation.
import sys, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
src, outdir = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
H, W, _ = im.shape
pink = np.array([199, 110, 132], np.float32)
dp = np.linalg.norm(im - pink, axis=2)
dw = np.linalg.norm(im - 255, axis=2)
r,g,b = im[...,0],im[...,1],im[...,2]
pinkish = ((r-g) > 22) & ((b-g) > 6)
bgish = (dp < 48) | (dw < 40) | pinkish
lab, n = ndimage.label(bgish)
border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bg = np.isin(lab, list(border))
bg = ndimage.binary_fill_holes(~bg) == 0  # keep only outside region
# soft alpha: shrink by 1px and feather
fg = ~bg
fg = ndimage.binary_erosion(fg, iterations=2)
alpha = ndimage.gaussian_filter(fg.astype(np.float32), 1.0)
# de-fringe: pull pink out of semi-transparent edge pixels
edge = ndimage.binary_dilation((alpha > 0.02) & (alpha < 0.98), iterations=2) & (((r-g) > 15) & ((b-g) > 0))
dark = np.array([40, 22, 22], np.float32)
im2 = im.copy()
im2[edge] = im[edge] * 0.35 + dark * 0.65
# bottom fade (torso cut by circle)
yy = np.arange(H)[:, None]
fade = np.clip((1180 - yy) / 260.0, 0, 1) ** 1.4
alpha = alpha * fade
rgba = np.dstack([im2, alpha * 255]).clip(0, 255).astype(np.uint8)
Image.fromarray(rgba).save(f'{outdir}/avatar.png')
# lower lip layer: region under the parting line, feathered
ys, xs = np.mgrid[0:H, 0:W]
part = 612 + (xs - 612) * -0.06  # slight slant of the lip line
m = (ys > part - 1) & (ys < 662) & (xs > 540) & (xs < 690)
m = ndimage.gaussian_filter(m.astype(np.float32), 3)
ll = np.dstack([im, m * 255]).clip(0, 255).astype(np.uint8)[580:680, 530:700]
Image.fromarray(ll).save(f'{outdir}/lowerlip.png')
print('ok', n)
