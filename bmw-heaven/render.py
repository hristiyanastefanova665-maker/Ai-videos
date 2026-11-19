"""Render the BMW-in-heaven commercial, 1080x1920 @ 30 fps, ~14.5 s.

usage: python3 render.py PLATES_DIR CAR_DIR OUT.mp4 [AUDIO_SRC] [--frames a:b] [--stills DIR]

Everything is built per frame: parallax cloud layers, a perspective camera
on the car (depth-map parallax, yaw/pitch/roll), live sky reflections on
paint and glass, rim light, lamp bloom, depth of field, motion blur and a
final grade. The car pixels always come from the owner's photo.
"""
import sys, os, subprocess, math
import numpy as np
import cv2
from multiprocessing import Pool

from clouds import sky_gradient

W, H, FPS = 1080, 1920, 30
DUR = 14.5
NF = int(DUR * FPS)

G = {}


# ---------------------------------------------------------------- helpers
def ease(t):           # smooth in/out
    t = min(max(t, 0.0), 1.0)
    return t * t * (3 - 2 * t)


def ease_out(t, p=3):
    t = min(max(t, 0.0), 1.0)
    return 1 - (1 - t) ** p


def lerp(a, b, t):
    return a + (b - a) * t


def seg(t, a, b):
    return (t - a) / (b - a)


def blur(img, s):
    if s < 0.4:
        return img
    if s > 6:   # big blurs at half res
        h, w = img.shape[:2]
        sm = cv2.resize(img, (w // 2, h // 2), interpolation=cv2.INTER_AREA)
        sm = cv2.GaussianBlur(sm, (0, 0), s / 2)
        return cv2.resize(sm, (w, h), interpolation=cv2.INTER_LINEAR)
    return cv2.GaussianBlur(img, (0, 0), s)


def over(dst, rgba):
    a = rgba[..., 3:4]
    return dst * (1 - a) + rgba[..., :3] * a


def screen(a, b):
    return 1 - (1 - a) * (1 - b)


# ---------------------------------------------------------------- loading
def load(plates, cardir):
    for n in ("far", "mid", "near", "sea"):
        G[n] = np.load(f"{plates}/{n}.npy").astype(np.float32) / 65535
    car = cv2.cvtColor(cv2.imread(f"{cardir}/car_rgba.png", cv2.IMREAD_UNCHANGED), cv2.COLOR_BGRA2RGBA)
    car = car.astype(np.float32) / 255
    m = np.load(f"{cardir}/maps.npz")
    # upsample texture 2x (Lanczos + gentle unsharp) for the close-ups
    S = 2
    th, tw = car.shape[0] * S, car.shape[1] * S
    up = lambda x: cv2.resize(x, (tw, th), interpolation=cv2.INTER_LANCZOS4)
    rgb = np.clip(up(car[..., :3]), 0, 1)
    rgb = np.clip(rgb + (rgb - cv2.GaussianBlur(rgb, (0, 0), 2.2)) * 0.6, 0, 1)
    a = np.clip(up(car[..., 3]), 0, 1)
    G["tex_rgb"], G["tex_a"] = rgb, a
    for k in ("glass", "lamp", "paint", "hood", "depth", "under"):
        G[k] = np.clip(up(m[k]), 0, 1) * (a if k != "depth" else 1)
    G["th"], G["tw"] = th, tw
    yy, xx = np.mgrid[0:th, 0:tw].astype(np.float32)
    G["gx"], G["gy"] = xx, yy
    G["u"], G["v"] = xx / tw, yy / th
    # rim mask (outer band of the silhouette)
    er = cv2.erode((a > 0.5).astype(np.uint8), np.ones((25, 25), np.uint8)).astype(np.float32)
    G["rim"] = np.clip(a - cv2.GaussianBlur(er, (0, 0), 6), 0, 1)
    # big sky texture for reflections (sky + mid clouds), small for speed
    sky = sky_gradient(1800, 1100)
    midp = cv2.resize(G["mid"], (1100, 1800), interpolation=cv2.INTER_AREA)
    G["refl_src"] = over(sky, midp)
    G["sky"] = sky_gradient(H * 2, W * 2)


# ---------------------------------------------------------------- clouds
def hole(cx, cy, r, soft):
    yy, xx = np.ogrid[0:H, 0:W]
    d = np.sqrt((xx - cx) ** 2 + ((yy - cy) * 0.8) ** 2)
    return np.clip((d - r) / soft, 0, 1).astype(np.float32)


def vramp(y0, y1):
    y = np.linspace(0, 1, H, dtype=np.float32)
    return np.clip((y - y0) / (y1 - y0), 0, 1)[:, None] * np.ones((1, W), np.float32)


def layer(name, cx, cy, zoom, rot=0.0, sigma=0.0, alpha=1.0, flip=False, mask=None):
    """Sample plate `name`: plate point (cx,cy) [0..1] to frame centre,
    `zoom` = frame px per plate px * plate/frame scale."""
    P = G[name]
    ph, pw = P.shape[:2]
    s = zoom * W / (pw * 0.62)          # zoom 1 -> 62% of plate width fills frame
    c, si = math.cos(rot) * s, math.sin(rot) * s
    px, py = cx * pw, cy * ph
    M = np.float32([[c, -si, W / 2 - (c * px - si * py)],
                    [si, c, H / 2 - (si * px + c * py)]])
    out = cv2.warpAffine(P, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    if sigma:
        out = blur(out, sigma)
    if alpha != 1:
        out[..., 3] *= alpha
    if mask is not None:
        out[..., 3] *= mask
    return out


def sky_bg(shift_y=0.0, zoom=1.0):
    s = G["sky"]
    sh, sw = s.shape[:2]
    sc = zoom * W / (sw * 0.5)
    M = np.float32([[sc, 0, W / 2 - sc * sw / 2], [0, sc, H / 2 - sc * (sh / 2 + shift_y * sh)]])
    return cv2.warpAffine(s, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)


# ---------------------------------------------------------------- car
def rotmat(yaw, pitch, roll):
    cy, sy = math.cos(yaw), math.sin(yaw)
    cp, sp = math.cos(pitch), math.sin(pitch)
    cr, sr = math.cos(roll), math.sin(roll)
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    Rx = np.array([[1, 0, 0], [0, cp, -sp], [0, sp, cp]])
    Rz = np.array([[cr, -sr, 0], [sr, cr, 0], [0, 0, 1]])
    return Rz @ Ry @ Rx


def shade_car(t, yaw, pitch, sweep=None, lamp_gain=1.0):
    """Relight the photo for the sunset world. Returns rgb, a, lamp."""
    rgb, a = G["tex_rgb"], G["tex_a"]
    u, v = G["u"], G["v"]
    # warm/pink ambient grade, keep silver luminance
    col = np.power(rgb, 1.04) * np.array([1.04, 0.86, 0.88], np.float32) * 1.03
    col = np.clip((col - 0.45) * 1.14 + 0.45, 0, None)
    col = col + np.array([0.02, 0.0, 0.03], np.float32) * (1 - rgb) ** 3
    # live sky reflection: mirrored sky window that slides with the camera
    R = G["refl_src"]
    rh, rw = R.shape[:2]
    th, tw = G["th"], G["tw"]
    ox = 0.5 + yaw * 0.55 + t * 0.006
    oy = 0.45 - pitch * 0.6
    sc = 0.55 * rw / tw
    M = np.float32([[sc, 0, ox * rw - sc * tw / 2], [0, -sc * 0.9, oy * rh + sc * 0.9 * th / 2]])
    refl = cv2.warpAffine(R, M, (tw, th), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP,
                          borderMode=cv2.BORDER_REFLECT)
    refl_soft = cv2.GaussianBlur(refl, (0, 0), 5)
    fres = np.clip(np.abs(u - 0.5) * 2, 0, 1) ** 2
    m_paint = (G["hood"] * 0.55 + G["paint"] * (0.22 + 0.25 * fres))[..., None]
    m_glass = G["glass"][..., None]
    col = col * (1 - m_paint) + screen(col, refl_soft * 0.85) * m_paint
    col = col * (1 - m_glass * 0.75) + (col * 0.4 + refl * 0.75) * m_glass * 0.75
    # sun key from low-left behind: peach wash on left panels + rim
    key = np.clip(1.15 - u * 1.4, 0, 1) * 0.10
    col = col + np.array([1.0, 0.72, 0.55], np.float32) * (key * G["paint"])[..., None]
    rim = G["rim"] * np.clip(1.2 - v * 1.3, 0.15, 1)
    col = col + np.array([1.0, 0.78, 0.66], np.float32) * (rim * 0.22)[..., None]
    # cinematic light sweep across the bodywork
    if sweep is not None:
        d = (u * 0.8 + v * 0.6) - sweep
        band = np.exp(-(d / 0.05) ** 2) * (G["paint"] + G["glass"] * 0.6)
        col = col + np.array([1.0, 0.9, 0.85], np.float32) * (band * 0.38)[..., None]
    # underbody falls into cool shadow (no ground in the sky)
    un = G["under"][..., None]
    col = col * (1 - un * 0.55) + np.array([0.22, 0.15, 0.22], np.float32) * un * 0.3
    lamp = G["lamp"] * lamp_gain
    return np.clip(col, 0, 1.5), a, lamp


def draw_car(frame, add, t, cx, cy, width, yaw=0.0, pitch=0.0, roll=0.0,
             focus=(0.5, 0.5), dist=3.2, sweep=None, lamp_gain=1.0,
             blur_s=0.0, dof=None, haze=0.0, back=None):
    """Composite the car. (cx,cy) is where texture point `focus` lands;
    `width` = on-screen width of the full car (px) at the focus plane."""
    th, tw = G["th"], G["tw"]
    R = rotmat(yaw, pitch, roll)
    facing = (R @ np.array([0, 0, -1.0]))[2] < 0

    if facing:
        rgb, a, lamp = shade_car(t, yaw, pitch, sweep, lamp_gain)
        # depth parallax: nose moves against roof as the camera orbits
        z = G["depth"] * 0.20 * tw
        mx = G["gx"] + z * math.sin(yaw) * 0.9
        my = G["gy"] - z * math.sin(pitch) * 0.9
        pack = np.dstack([rgb, a])
        pack = cv2.remap(pack, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
        lamp = cv2.remap(lamp, mx, my, cv2.INTER_LINEAR)
    else:
        # seen from behind/underneath while tumbling: dark underbody silhouette
        a = G["tex_a"][:, ::-1]
        sil = np.empty((th, tw, 3), np.float32)
        sil[:] = (0.20, 0.15, 0.20)
        sil += (G["rim"][:, ::-1] * 0.35)[..., None] * np.array([1.0, 0.75, 0.68], np.float32)
        pack = np.dstack([sil, a])
        lamp = np.zeros((th, tw), np.float32)

    # project the 4 corners through a pinhole camera
    fu, fv = focus
    f = width * dist
    src, dst = [], []
    for (px, py) in ((0, 0), (tw, 0), (tw, th), (0, th)):
        X = px / tw - fu
        Y = (py / th - fv) * th / tw
        P = R @ np.array([X, Y, 0.0]) + np.array([0, 0, dist])
        src.append((px, py))
        dst.append((cx + f * P[0] / P[2], cy + f * P[1] / P[2]))
    Hm = cv2.getPerspectiveTransform(np.float32(src), np.float32(dst))
    car = cv2.warpPerspective(pack, Hm, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT)
    car = np.clip(car, 0, 1.5)
    lmp = cv2.warpPerspective(lamp, Hm, (W, H), flags=cv2.INTER_LINEAR)

    if dof is not None:          # screen-space focus falloff (shallow DoF)
        fx, fy, r, smax = dof
        yy, xx = np.ogrid[0:H, 0:W]
        dd = np.sqrt(((xx - fx) / W) ** 2 + ((yy - fy) / H) ** 2 * 0.6)
        k = np.clip((dd - r) / 0.35, 0, 1)[..., None]
        bl = blur(car * np.concatenate([np.ones(3), [1]]), smax)
        # premultiplied blur so edges stay clean
        pm = np.dstack([car[..., :3] * car[..., 3:], car[..., 3]])
        pmb = blur(pm, smax)
        pm = pm * (1 - k) + pmb * k
        car = np.dstack([pm[..., :3] / np.maximum(pm[..., 3:], 1e-4), pm[..., 3]])
    if blur_s:
        pm = blur(np.dstack([car[..., :3] * car[..., 3:], car[..., 3]]), blur_s)
        car = np.dstack([pm[..., :3] / np.maximum(pm[..., 3:], 1e-4), pm[..., 3]])
    if haze:
        car[..., :3] = car[..., :3] * (1 - haze) + np.array([0.86, 0.64, 0.68], np.float32) * haze
    frame[:] = over(frame, car)
    if lmp.max() > 0:
        add += lmp[..., None] * np.array([1.0, 0.95, 0.9], np.float32) * 0.6
    return car[..., 3]


def bloom_lamps(add, size_scale=1.0):
    g1 = blur(add, 6 * size_scale)
    g2 = blur(add, 28 * size_scale)
    g3 = blur(add, 90 * size_scale)
    return g1 * 0.8 + g2 * 1.0 + g3 * 0.9


def grade(img, t):
    img = np.clip(img, 0, None)
    # highlight bloom
    hl = np.clip(img - 0.78, 0, None)
    img = img + blur(hl, 40) * 0.55
    # gentle filmic curve, slight mauve shadows
    img = img / (1 + 0.12 * img)
    img = np.clip(img, 0, 1)
    img = img + (img - img.mean()) * 0.05
    img = img * np.array([1.0, 0.97, 0.99], np.float32) + np.array([0.012, 0.0, 0.018], np.float32)
    # vignette
    yy, xx = np.ogrid[0:H, 0:W]
    r = np.sqrt(((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - H / 2) / (H * 0.75)) ** 2)
    img = img * (1 - 0.28 * np.clip(r - 0.35, 0, 1) ** 1.5)[..., None]
    # film grain
    rng = np.random.default_rng(int(t * 1000))
    gr = rng.normal(0, 0.012, (H // 2, W // 2)).astype(np.float32)
    img = img + cv2.resize(gr, (W, H))[..., None]
    return np.clip(img, 0, 1)


# ---------------------------------------------------------------- scenes
def scene_fall(t):
    """0-5 s: tiny car tumbles out of the sky and settles in a 3/4 hover."""
    # camera slowly pushes through the cloudscape
    k = t / 5.0
    fr = sky_bg(shift_y=-0.12 + 0.05 * k, zoom=1.0)
    fr = over(fr, layer("far", 0.5, 0.42 + 0.03 * k, 0.75 + 0.12 * k, sigma=1.5 + 2 * ease(seg(t, 2, 4)), alpha=0.85))
    fr = over(fr, layer("mid", 0.47 + 0.02 * k, 0.40 + 0.05 * k, 0.75 + 0.25 * k, sigma=ease(seg(t, 2, 4)) * 4, alpha=0.9))
    add = np.zeros((H, W, 3), np.float32)

    # car trajectory
    p = ease_out(seg(t, 0.0, 3.6), 3)
    width = lerp(12, 760, ease(seg(t, 0.0, 3.6)) ** 2.0)
    cx = lerp(560, 545, p) + 30 * math.sin(t * 1.3) * (1 - p)
    cy = lerp(560, 860, ease(seg(t, 0, 3.6)))
    # tumble decays into the settled pose
    spin = (1 - ease_out(seg(t, 0.0, 3.4), 2))
    yaw_set, pitch_set, roll_set = math.radians(-16), math.radians(10), math.radians(-6)
    yaw = yaw_set + spin * 4.4 * math.pi * 0.5
    pitch = pitch_set + spin * math.radians(200) * math.sin(t * 1.7)
    roll = roll_set + spin * 3.0 * math.pi * 0.35
    # floating bob once settled
    s = ease(seg(t, 3.2, 4.2))
    cy += s * 10 * math.sin((t - 3.2) * 1.9)
    roll += s * math.radians(1.2) * math.sin((t - 3.2) * 1.4)
    yaw += s * math.radians(4) * ease(seg(t, 3.4, 5.0))

    # motion blur while tumbling: average subframes
    sub = 5 if spin > 0.05 else 1
    if sub > 1:
        acc = np.zeros_like(fr)
        acc_add = np.zeros_like(add)
        for i in range(sub):
            dt = (i / sub - 0.5) / FPS
            f2, a2 = fr.copy(), np.zeros_like(add)
            sp = (1 - ease_out(seg(t + dt, 0.0, 3.4), 2))
            draw_car(f2, a2, t, cx, cy, width,
                     yaw=yaw_set + sp * 4.4 * math.pi * 0.5,
                     pitch=pitch_set + sp * math.radians(200) * math.sin((t + dt) * 1.7),
                     roll=roll_set + sp * 3.0 * math.pi * 0.35,
                     haze=0.35 * (1 - p), lamp_gain=p)
            acc += f2
            acc_add += a2
        fr, add = acc / sub, acc_add / sub
    else:
        draw_car(fr, add, t, cx, cy, width, yaw=yaw, pitch=pitch, roll=roll,
                 lamp_gain=1.0, sweep=lerp(-0.4, 1.8, ease(seg(t, 3.6, 5.0))))

    # near billows the car emerges from (pass in front, then clear)
    ne = ease(seg(t, 1.6, 3.6))
    nl = layer("near", 0.5 + 0.10 * ne, 0.55 - 0.32 * ne, 1.05 + 0.6 * ne, sigma=3 + 10 * ne,
               alpha=0.9 * ease(seg(t, 1.2, 2.0)) * (1 - ease(seg(t, 3.0, 4.0))),
               mask=hole(cx, cy, width * lerp(0.2, 0.9, ne), 260))
    fr = over(fr, nl)
    # cloud floor drifting below
    fl = layer("sea", 0.5 + 0.02 * k, 0.40 - 0.03 * k, 0.95 + 0.15 * k, sigma=6 * ease(seg(t, 2, 4)),
               alpha=ease(seg(t, 2.6, 4.0)), mask=vramp(0.55, 0.8))
    fr = over(fr, fl)
    return fr + bloom_lamps(add, max(0.2, width / 760))


def scene_grille(t):
    """5-6.6 s: close-up on kidney grille, roundel and hood with light sweep."""
    k = seg(t, 5.0, 6.6)
    fr = sky_bg(shift_y=0.02)
    fr = over(fr, layer("mid", 0.62 - 0.05 * k, 0.55, 1.6, sigma=14))
    add = np.zeros((H, W, 3), np.float32)
    draw_car(fr, add, t, W * 0.5, H * lerp(0.50, 0.53, k), width=lerp(2500, 2850, ease(k)),
             yaw=math.radians(lerp(-11, -4, ease(k))), pitch=math.radians(lerp(14, 9, k)),
             roll=math.radians(-2), focus=(0.5, lerp(0.56, 0.50, ease(k))), dist=2.2,
             sweep=lerp(-0.2, 1.6, ease(k)), dof=(W * 0.5, H * 0.52, 0.18, 9))
    fr = over(fr, layer("near", 0.3 + 0.2 * k, 0.85, 1.8, sigma=22, alpha=0.7, mask=vramp(0.82, 1.0)))
    return fr + bloom_lamps(add, 2.5)


def scene_headlight(t):
    """6.6-8 s: glide across the headlight with bloom, shallow DoF."""
    k = seg(t, 6.6, 8.0)
    fr = sky_bg(shift_y=0.06)
    fr = over(fr, layer("mid", 0.40 + 0.06 * k, 0.6, 1.8, sigma=16))
    add = np.zeros((H, W, 3), np.float32)
    draw_car(fr, add, t, W * lerp(0.56, 0.46, ease(k)), H * 0.52, width=lerp(3300, 3600, k),
             yaw=math.radians(lerp(14, 9, ease(k))), pitch=math.radians(8), roll=math.radians(1.5),
             focus=(0.84, 0.585), dist=2.0, lamp_gain=1.15,
             dof=(W * 0.5, H * 0.52, 0.16, 10), sweep=lerp(1.6, 0.2, ease(k)))
    fr = over(fr, layer("near", 0.6 - 0.15 * k, 0.2, 2.0, sigma=26, alpha=0.6, mask=1 - vramp(0.0, 0.18)))
    return fr + bloom_lamps(add, 2.2)


def scene_corner(t):
    """8-11 s: low-angle orbit along the front corner, bumper, fog lamp,
    fender and mirror while billows slide past in the foreground."""
    k = seg(t, 8.0, 11.0)
    e = ease(k)
    fr = sky_bg(shift_y=lerp(0.10, 0.0, e))
    fr = over(fr, layer("far", 0.55 - 0.1 * e, 0.62, 1.2, sigma=8))
    fr = over(fr, layer("mid", 0.65 - 0.25 * e, 0.62 - 0.05 * e, 1.5, sigma=10))
    add = np.zeros((H, W, 3), np.float32)
    draw_car(fr, add, t, W * lerp(0.62, 0.55, e), H * lerp(0.47, 0.55, e), width=lerp(2150, 1900, e),
             yaw=math.radians(lerp(-20, -9, e)), pitch=math.radians(lerp(-4, 9, e)),
             roll=math.radians(lerp(-3, 1, e)), focus=(lerp(0.2, 0.15, e), lerp(0.80, 0.30, e)), dist=2.4,
             sweep=lerp(1.7, -0.3, e), dof=(W * 0.55, H * lerp(0.47, 0.55, e), 0.2, 8))
    # foreground billows drifting past the lens
    fr = over(fr, layer("near", 0.15 + 0.5 * e, 0.8, 2.4, sigma=30, alpha=0.75,
                        mask=hole(W * 0.62, H * 0.5, 380, 420)))
    return fr + bloom_lamps(add, 1.8)


def scene_wide(t):
    """11-14.5 s: wide pull-back, car suspended above the cloud sea."""
    k = seg(t, 11.0, 14.5)
    e = ease(k)
    fr = sky_bg(shift_y=lerp(0.02, 0.06, e), zoom=lerp(1.08, 1.0, e))
    fr = over(fr, layer("far", 0.5, lerp(0.45, 0.48, e), lerp(1.0, 0.85, e), sigma=2.5))
    fr = over(fr, layer("mid", 0.48 + 0.03 * e, lerp(0.30, 0.34, e), lerp(1.15, 0.95, e), sigma=1.5, alpha=0.8, mask=1 - vramp(0.3, 0.6) * 0.6))
    add = np.zeros((H, W, 3), np.float32)
    cy = H * lerp(0.47, 0.49, e) + 12 * math.sin((t - 11) * 1.6)
    draw_car(fr, add, t, W * lerp(0.52, 0.50, e), cy, width=lerp(700, 470, e),
             yaw=math.radians(lerp(-12, -18, e)), pitch=math.radians(lerp(11, 13, e)),
             roll=math.radians(-4 + 1.2 * math.sin((t - 11) * 1.2)),
             sweep=lerp(-0.3, 1.7, ease(seg(t, 11.6, 13.6))), haze=0.05 * e)
    fr = over(fr, layer("sea", 0.5 + 0.02 * e, lerp(0.25, 0.28, e), lerp(1.25, 1.0, e), mask=vramp(0.58, 0.72)))
    fr = over(fr, layer("near", 0.4 + 0.2 * e, 0.6, 1.9, sigma=20, alpha=0.8, mask=vramp(0.72, 0.95)))
    return fr + bloom_lamps(add, max(0.6, 470 / 700))


SCENES = [(0.0, 5.0, scene_fall), (5.0, 6.6, scene_grille), (6.6, 8.0, scene_headlight),
          (8.0, 11.0, scene_corner), (11.0, 99, scene_wide)]
XF = 0.2   # cross-dissolve length (s)


def render_frame(i):
    t = i / FPS
    out = None
    for j, (a, b, fn) in enumerate(SCENES):
        if a <= t < b:
            out = fn(t)
            # dissolve from the previous scene
            if j > 0 and t < a + XF:
                prev = SCENES[j - 1][2](t)
                w = ease((t - a) / XF)
                out = prev * (1 - w) + out * w
            break
    out = grade(out, t)
    # fade in from the sky at the very start
    if t < 0.4:
        out = out * (0.55 + 0.45 * ease(t / 0.4))
    return (out * 255 + 0.5).astype(np.uint8)


def init(plates, cardir):
    cv2.setNumThreads(1)
    load(plates, cardir)


if __name__ == "__main__":
    plates, cardir, outp = sys.argv[1:4]
    audio = sys.argv[4] if len(sys.argv) > 4 and not sys.argv[4].startswith("--") else None
    frames = range(NF)
    stills = None
    if "--frames" in sys.argv:
        a, b = sys.argv[sys.argv.index("--frames") + 1].split(":")
        frames = range(int(a), int(b))
    if "--stills" in sys.argv:
        stills = sys.argv[sys.argv.index("--stills") + 1]
        os.makedirs(stills, exist_ok=True)
        frames = [int(x) for x in sys.argv[sys.argv.index("--stills") + 2].split(",")]

    with Pool(4, initializer=init, initargs=(plates, cardir)) as pool:
        if stills:
            for i, fr in zip(frames, pool.imap(render_frame, frames)):
                cv2.imwrite(f"{stills}/f{i:03d}.jpg", cv2.cvtColor(fr, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 92])
            sys.exit(0)
        cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
               "-r", str(FPS), "-i", "-"]
        if audio:
            cmd += ["-i", audio, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "192k", "-shortest"]
        cmd += ["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
                "-profile:v", "high", "-movflags", "+faststart", outp]
        ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        for n, fr in enumerate(pool.imap(render_frame, frames, chunksize=2)):
            ff.stdin.write(fr.tobytes())
            if n % 30 == 0:
                print("frame", n, flush=True)
        ff.stdin.close()
        ff.wait()
