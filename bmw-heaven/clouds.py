"""Procedural lit cumulus cloud plates (RGBA) for the pink-sunset sky.

Clouds are built the way cumulus look: hierarchical clusters of billowing
spheres (big body puffs, smaller puffs on their surface, then tiny ones).
The union of the spheres forms a height field; lighting comes from its
normals plus a self-shadow march toward the sun, and the edges are softened
and eroded with noise so they read as vapour, not solids.
"""
import numpy as np
import cv2


def value_noise(h, w, cell, rng):
    gh, gw = int(np.ceil(h / cell)) + 3, int(np.ceil(w / cell)) + 3
    g = rng.random((gh, gw)).astype(np.float32)
    up = cv2.resize(g, (gw * cell, gh * cell), interpolation=cv2.INTER_CUBIC)
    oy, ox = rng.integers(0, cell, 2)
    return up[oy:oy + h, ox:ox + w]


def fbm(h, w, base, octaves, rng, gain=0.5):
    out = np.zeros((h, w), np.float32)
    amp, tot, cell = 1.0, 0.0, base
    for _ in range(octaves):
        out += amp * value_noise(h, w, max(2, int(cell)), rng)
        tot += amp
        amp *= gain
        cell /= 2.0
    return out / tot


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


SHADOW = np.array([0.56, 0.38, 0.48], np.float32)   # lavender belly
MID = np.array([0.88, 0.60, 0.64], np.float32)      # dusty rose
LIGHT = np.array([1.00, 0.79, 0.71], np.float32)    # peach
HOT = np.array([1.00, 0.90, 0.80], np.float32)      # sun-kissed rim


def splat(H, cx, cy, r, z):
    h, w = H.shape
    x0, x1 = int(max(0, cx - r)), int(min(w, cx + r + 1))
    y0, y1 = int(max(0, cy - r)), int(min(h, cy + r + 1))
    if x0 >= x1 or y0 >= y1:
        return
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    d2 = (xx - cx) ** 2 + (yy - cy) ** 2
    s = np.sqrt(np.clip(r * r - d2, 0, None)) + z
    s[d2 > r * r] = 0
    np.maximum(H[y0:y1, x0:x1], s, out=H[y0:y1, x0:x1])


def cumulus(H, cx, cy, size, rng, flat_base=True):
    """One cumulus tower/bank: body puffs, then surface puffs, then fine."""
    puffs = []
    n = rng.integers(5, 9)
    for _ in range(n):
        ox = rng.normal(0, size * 0.55)
        oy = -abs(rng.normal(0, size * 0.25)) if flat_base else rng.normal(0, size * 0.3)
        r = size * rng.uniform(0.35, 0.6) * float(np.clip(1 - abs(ox) / (size * 2.2), 0.4, 1))
        puffs.append((cx + ox, cy + oy, r, 0.0))
    for level, (cnt, rs) in enumerate([(14, 0.45), (26, 0.4)]):
        new = []
        for (px, py, pr, pz) in puffs:
            for _ in range(int(cnt / (level + 1)) // 2 + 1):
                a = rng.uniform(np.pi * 1.05, np.pi * 1.95) if flat_base else rng.uniform(0, 2 * np.pi)
                rr = pr * rs * rng.uniform(0.6, 1.1)
                dist = pr * rng.uniform(0.6, 0.95)
                new.append((px + np.cos(a) * dist, py + np.sin(a) * dist, rr, pz + pr * 0.35))
        puffs += new
    for (px, py, pr, pz) in puffs:
        splat(H, px, py, pr, pz)


def make_plate(h, w, seed, n_clouds=40, size=(120, 320), band=(0.0, 1.0),
               sun=(-0.4, 0.55), haze=0.0, flat_base=True, ybias=0.0):
    rng = np.random.default_rng(seed)
    H = np.zeros((h, w), np.float32)
    for _ in range(n_clouds):
        t = rng.uniform(band[0], band[1]) ** (1 + ybias)
        cy = h * t
        cx = rng.uniform(-0.1, 1.1) * w
        s = rng.uniform(*size) * (0.6 + 0.8 * t if ybias else 1)
        cumulus(H, cx, cy, s, rng, flat_base)

    # vapour: warp the height field with noise so outlines are irregular
    nx = (fbm(h, w, 90, 4, rng) - 0.5) * 40
    ny = (fbm(h, w, 90, 4, rng) - 0.5) * 40
    gy, gx = np.mgrid[0:h, 0:w].astype(np.float32)
    H = cv2.remap(H, gx + nx, gy + ny, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    detail = fbm(h, w, 40, 4, rng)
    H = H + (detail - 0.5) * 9 * smoothstep(0, 30, H)
    Hs = cv2.GaussianBlur(H, (0, 0), 9)

    # normals
    gxh = cv2.Sobel(Hs, cv2.CV_32F, 1, 0, ksize=3) / 8
    gyh = cv2.Sobel(Hs, cv2.CV_32F, 0, 1, ksize=3) / 8
    nz = np.ones_like(gxh)
    nl = np.sqrt(gxh ** 2 + gyh ** 2 + 1)
    sx, sy = sun
    sz = 0.6
    sl = np.sqrt(sx * sx + sy * sy + sz * sz)
    lam = np.clip((-gxh * sx - gyh * sy + nz * sz) / (nl * sl), 0, 1)

    # self shadow (soft) toward the sun
    dens = cv2.GaussianBlur(smoothstep(0, 60, H), (0, 0), 8)
    occl = np.zeros_like(H)
    for i in range(1, 14):
        M = np.float32([[1, 0, -sx * 14 * i], [0, 1, -sy * 14 * i]])
        occl += cv2.warpAffine(dens, M, (w, h), borderMode=cv2.BORDER_REPLICATE) / (1 + 0.2 * i)
    shad = np.exp(-occl * 0.45)
    # cloud bottoms are darker (ambient from above)
    thick = cv2.GaussianBlur(smoothstep(0, 120, H), (0, 0), 50)

    light = 0.62 * lam * (0.35 + 0.65 * shad) + 0.25 * shad
    light *= (1 - 0.25 * thick)
    m = smoothstep(0, 40, H) > 0.5
    lo, hi = np.percentile(light[m], [3, 99.3]) if m.any() else (0, 1)
    light = np.clip((light - lo) / (hi - lo + 1e-6), 0, 1) ** 1.1
    t = light[..., None]
    col = np.where(t < 0.45, SHADOW + (MID - SHADOW) * (t / 0.45),
                   MID + (LIGHT - MID) * ((t - 0.45) / 0.35).clip(0, 1))
    col = col + (HOT - col) * smoothstep(0.82, 1.0, t)

    # soft vapour alpha + backlit silver lining at thin edges
    alpha = smoothstep(-5, 110, H) * (0.75 + 0.25 * detail)
    alpha = cv2.GaussianBlur(alpha, (0, 0), 5.0)
    rim = smoothstep(0.05, 0.5, alpha) * (1 - smoothstep(0.5, 0.95, alpha))
    col = col + (HOT - col) * (rim[..., None] * 0.35 * shad[..., None])
    # internal glow/scatter softening
    col = col * 0.7 + cv2.GaussianBlur(col, (0, 0), 7) * 0.3
    # fine billow texture only as subtle luminance, not as relief
    col = col * (0.94 + 0.12 * detail[..., None])
    if haze:
        col = col * (1 - haze) + np.array([0.85, 0.62, 0.66], np.float32) * haze
    return np.dstack([col, alpha]).astype(np.float32)


def sky_gradient(h, w, sun_xy=(0.5, 0.78), sun_r=0.55):
    y = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    x = np.linspace(0, 1, w, dtype=np.float32)[None, :]
    top = np.array([0.45, 0.35, 0.50], np.float32)
    mid = np.array([0.80, 0.57, 0.63], np.float32)
    low = np.array([1.00, 0.78, 0.68], np.float32)
    t = y[..., None]
    c = np.where(t < 0.6, top + (mid - top) * (t / 0.6), mid + (low - mid) * ((t - 0.6) / 0.4))
    c = np.broadcast_to(c, (h, w, 3)).copy()
    dx, dy = (x - sun_xy[0]) * (w / h), y - sun_xy[1]
    g = np.exp(-(dx * dx + dy * dy) / (sun_r * sun_r * 0.25))[..., None]
    return c + (np.array([1.0, 0.88, 0.76], np.float32) - c) * g * 0.75


SPECS = {
    # distant hazy bank, many small clouds
    "far": dict(seed=11, n_clouds=140, size=(90, 220), haze=0.35),
    # main mid-distance cumulus
    "mid": dict(seed=23, n_clouds=55, size=(180, 380), haze=0.12),
    # big close billows (used in front of / around the car)
    "near": dict(seed=37, n_clouds=18, size=(380, 700)),
    # cloud sea: clouds piling up toward the bottom of frame
    "sea": dict(seed=51, n_clouds=150, size=(120, 300), band=(0.38, 1.05), ybias=0.4, haze=0.05),
}

if __name__ == "__main__":
    import sys, os
    out = sys.argv[1]
    names = sys.argv[2:] or list(SPECS)
    os.makedirs(out, exist_ok=True)
    H, W = 3600, 2200
    for name in names:
        p = make_plate(H, W, **SPECS[name])
        p = np.clip(p, 0, 1)
        np.save(f"{out}/{name}.npy", (p * 65535).astype(np.uint16))
        prev = sky_gradient(H, W)
        prev = prev * (1 - p[..., 3:]) + p[..., :3] * p[..., 3:]
        cv2.imwrite(f"{out}/{name}_prev.jpg",
                    cv2.cvtColor((cv2.resize(prev, (W // 4, H // 4), interpolation=cv2.INTER_AREA) * 255).clip(0, 255).astype(np.uint8), cv2.COLOR_RGB2BGR))
        print(name, "done", flush=True)
