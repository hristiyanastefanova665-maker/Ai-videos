"""Render the BMW E87 collage edit (720x1280, 30 fps) to build/frames.mp4 via ffmpeg pipe.

Layers come from build/*_rgba.png (made by cutout.py). Style follows the reference edit:
cut-out car pieces sliding over a wide shot, gold neon outlines that fade into the real
car, zoom-through shape masks (headlight, wheel), collage splits and stacked cars.
"""
import subprocess, sys
import numpy as np, cv2

W, H, FPS = 720, 1280, 30
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 18.13
OUT = sys.argv[2] if len(sys.argv) > 2 else "build/frames.mp4"
NF = int(round(DUR * FPS))
B = "build/"
A = "assets/"
rng = np.random.default_rng(7)

# ---------------------------------------------------------------- utils
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def prog(t, a, b): return clamp((t - a) / (b - a))
def e_out(x): return 1 - (1 - x) ** 3
def e_inout(x): return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2
def e_back(x, s=1.4): x -= 1; return x * x * ((s + 1) * x + s) + 1
def lerp(a, b, x): return a + (b - a) * x

def load_rgb(p): return cv2.imread(p).astype(np.float32) / 255.0
def load_rgba(p, crop=True):
    a = cv2.imread(p, cv2.IMREAD_UNCHANGED).astype(np.float32) / 255.0
    if crop:
        ys, xs = np.where(a[..., 3] > 0.05)
        a = a[max(ys.min() - 4, 0):ys.max() + 5, max(xs.min() - 4, 0):xs.max() + 5]
    return np.ascontiguousarray(a)

def warm(img, k=1.0):
    out = img.copy()
    out[..., 0] *= 1 - 0.10 * k; out[..., 2] *= 1 + 0.08 * k
    return np.clip(out, 0, 1)

def affine(sw, sh, cx, cy, s, ang):
    M = cv2.getRotationMatrix2D((sw / 2, sh / 2), ang, s)
    M[0, 2] += cx - sw / 2; M[1, 2] += cy - sh / 2
    return M

def warp(src, M, interp=cv2.INTER_LINEAR):
    return cv2.warpAffine(src, M, (W, H), flags=interp, borderMode=cv2.BORDER_CONSTANT, borderValue=0)

def cover(img, zoom=1.0, fx=.5, fy=.5, ang=0.0, dx=0.0, dy=0.0):
    ih, iw = img.shape[:2]
    s = max(W / iw, H / ih) * zoom
    cx = clamp(fx * iw, W / (2 * s), iw - W / (2 * s)); cy = clamp(fy * ih, H / (2 * s), ih - H / (2 * s))
    M = cv2.getRotationMatrix2D((cx, cy), ang, s)
    M[0, 2] += W / 2 - cx + dx; M[1, 2] += H / 2 - cy + dy
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

def over(dst, rgba, alpha=1.0):
    a = rgba[..., 3:4] * alpha
    dst *= 1 - a; dst += rgba[..., :3] * a
    return dst

# ---------------------------------------------------------------- neon
GOLD = (np.array([0.10, 0.62, 1.0]), np.array([0.55, 0.92, 1.0]))   # glow, core (BGR)
BLUE = (np.array([1.0, 0.62, 0.10]), np.array([1.0, 0.92, 0.6]))

def neon_maps(rgba):
    a = rgba[..., 3]
    a8 = (a * 255).astype(np.uint8)
    edge_a = cv2.Canny(a8, 60, 160)
    g = cv2.cvtColor((rgba[..., :3] * 255).astype(np.uint8), cv2.COLOR_BGR2GRAY)
    g = cv2.GaussianBlur(g, (3, 3), 0)
    inner = cv2.Canny(g, 70, 170)
    inner[cv2.erode(a8, np.ones((9, 9), np.uint8)) < 128] = 0
    core = np.maximum(edge_a, inner).astype(np.float32) / 255.0
    core = cv2.dilate(core, np.ones((2, 2), np.uint8))
    glow = cv2.GaussianBlur(core, (0, 0), 4) * 2.2 + cv2.GaussianBlur(core, (0, 0), 14) * 2.5
    return np.dstack([core, np.clip(glow, 0, 1.5)]).astype(np.float32)

class Piece:
    """A cut-out layer with an optional precomputed neon outline."""
    def __init__(self, rgba, neon=True):
        self.rgba = rgba
        self.h, self.w = rgba.shape[:2]
        self.neon = neon_maps(rgba) if neon else None

    def draw(self, frame, cx, cy, s, ang=0.0, alpha=1.0, neon=0.0, dark=None, color=GOLD, shadow=0.0):
        M = affine(self.w, self.h, cx, cy, s, ang)
        lay = warp(self.rgba, M)
        if shadow > 0:
            sh = cv2.GaussianBlur(lay[..., 3], (0, 0), 18) * shadow * alpha
            frame *= (1 - 0.55 * sh)[..., None]
        if dark is None: dark = neon
        if dark > 0:
            lay[..., :3] *= 1 - 0.82 * dark
        over(frame, lay, alpha)
        if neon > 0 and self.neon is not None:
            nm = warp(self.neon, M)
            glow_c, core_c = color
            frame += (nm[..., 1:2] * glow_c + nm[..., 0:1] * core_c) * neon * alpha
        return frame

# ---------------------------------------------------------------- assets
photo = load_rgba(B + "my-car_rgba.png")
side_full = load_rgb(A + "side.jpg")
grille_full = load_rgb(A + "grille.jpg")
head_full = load_rgb(A + "headlight.jpg")
side_rgba_full = cv2.imread(B + "side_rgba.png", cv2.IMREAD_UNCHANGED).astype(np.float32) / 255.0

# clean background plate: the empty strip left of the car in the side shot, mirrored
cols = np.where(side_rgba_full[..., 3].max(0) > 0.08)[0]
strip = side_full[:640, :cols.min() - 6]
plate = np.hstack([strip, strip[:, ::-1]])
PW, PH = 1080, 1920
plate_p = cv2.resize(plate, (PW, PH), interpolation=cv2.INTER_CUBIC)
plate_p = cv2.GaussianBlur(plate_p, (0, 0), 1.2)
plate_p += rng.normal(0, 0.01, plate_p.shape).astype(np.float32)

# my car (front, from the user's photo) graded warm to sit in the golden-hour plate
car_front = photo.copy()
car_front[..., :3] = warm(car_front[..., :3] * 1.04, 1.4)
# warm rim light from above-left
yy, xx = np.mgrid[0:car_front.shape[0], 0:car_front.shape[1]].astype(np.float32)
rim = np.clip(1 - (yy / car_front.shape[0]) * 1.6, 0, 1) * np.clip(1 - xx / car_front.shape[1], 0.3, 1)
car_front[..., :3] = np.clip(car_front[..., :3] + rim[..., None] * np.array([0.0, 0.05, 0.10]) , 0, 1)

def make_wide():
    img = plate_p.copy()
    cw = 700; s = cw / car_front.shape[1]
    ch = car_front.shape[0] * s
    cx, cy = PW / 2, 1290 - ch / 2
    # ground shadow
    sh = np.zeros((PH, PW), np.float32)
    cv2.ellipse(sh, (int(cx), int(cy + ch / 2 - 18)), (int(cw * 0.56), 46), 0, 0, 360, 1.0, -1)
    sh = cv2.GaussianBlur(sh, (0, 0), 22)
    img *= (1 - 0.6 * sh)[..., None]
    M = cv2.getRotationMatrix2D((car_front.shape[1] / 2, car_front.shape[0] / 2), 0, s)
    M[0, 2] += cx - car_front.shape[1] / 2; M[1, 2] += cy - car_front.shape[0] / 2
    lay = cv2.warpAffine(car_front, M, (PW, PH), flags=cv2.INTER_AREA)
    a = lay[..., 3:4]
    return img * (1 - a) + lay[..., :3] * a

wide = make_wide()

# pieces
P_front = Piece(car_front)
P_side = Piece(load_rgba(B + "side_rgba.png"))
P_grille = Piece(load_rgba(B + "grille_rgba.png"))
P_head = Piece(load_rgba(B + "headlight_rgba.png"))
# bumper + plate strip from my photo
fb = photo.copy(); fb[..., :3] = warm(fb[..., :3], 1.3)
bh = fb.shape[0]
P_bumper = Piece(np.ascontiguousarray(fb[int(bh * 0.52):, :]))

# BMW roundel from the grille close-up (for the neon badge)
gh, gw = grille_full.shape[:2]
rc = (int(gw * 0.570), int(gh * 0.193)); rr = int(gh * 0.135)
badge = np.zeros((2 * rr, 2 * rr, 4), np.float32)
badge[..., :3] = grille_full[rc[1] - rr:rc[1] + rr, rc[0] - rr:rc[0] + rr]
cm = np.zeros((2 * rr, 2 * rr), np.float32); cv2.circle(cm, (rr, rr), rr - 3, 1.0, -1)
badge[..., 3] = cv2.GaussianBlur(cm, (0, 0), 1.2)
P_badge = Piece(badge)

# ---------------------------------------------------------------- grading
yv, xv = np.mgrid[0:H, 0:W].astype(np.float32)
vign = 1 - 0.38 * (((xv - W / 2) / (W * 0.72)) ** 2 + ((yv - H / 2) / (H * 0.72)) ** 2)
vign = np.clip(vign, 0, 1)[..., None]

def grade(f, t, grey=0.0):
    f = np.clip(f, 0, 1.6)
    f = f / (1 + 0.25 * f)                       # soft highlight roll-off
    f = f * 1.25
    f = np.clip(f, 0, 1)
    f = f * f * (3 - 2 * f) * 0.35 + f * 0.65     # filmic contrast
    f[..., 0] = f[..., 0] * 0.95 + 0.02           # teal-ish shadows / warm highs
    f[..., 2] = f[..., 2] * 1.03
    if grey > 0:
        g = f.mean(axis=2, keepdims=True)
        f = f * (1 - grey) + (g * 0.85 + 0.08) * grey
    f *= vign
    f += rng.normal(0, 0.018, (H, W, 1)).astype(np.float32)
    return np.clip(f, 0, 1)

def flare(f, x, y, k=1.0):
    d = ((xv - x) ** 2 + (yv - y) ** 2)
    f += np.exp(-d / (2 * 90 ** 2))[..., None] * np.array([0.25, 0.55, 0.9]) * 0.6 * k
    f += np.exp(-d / (2 * 9 ** 2))[..., None] * np.array([0.8, 0.95, 1.0]) * 0.9 * k
    # small green ghost like the reference
    gx, gy = W - x * 0.9, H - y * 0.55
    f += np.exp(-((xv - gx) ** 2 + (yv - gy) ** 2) / (2 * 7 ** 2))[..., None] * np.array([0.3, 0.9, 0.3]) * 0.5 * k
    return f

def shape_mask_circle(cx, cy, r, feather=2.0):
    d = np.sqrt((xv - cx) ** 2 + (yv - cy) ** 2)
    return np.clip((r - d) / feather + 0.5, 0, 1)[..., None]

def punch(t, cut, amt=0.05, dur=0.25):
    x = prog(t, cut, cut + dur)
    return 1 + amt * (1 - e_out(x)) if t >= cut else 1.0

# ---------------------------------------------------------------- scenes
def wide_bg(t, zoom, fx=.5, fy=.58, ang=0.0):
    return cover(wide, zoom, fx, fy, ang)

def scene(t):
    # ---- S1 0.0-2.0: wide + gold neon grille drops from the top
    if t < 2.0:
        f = wide_bg(t, lerp(1.02, 1.12, t / 6.0) * punch(t, 0.0, .06), fy=.6)
        x = e_back(prog(t, 0.10, 0.55), 1.2)
        y = lerp(-520, 205, x)
        neon = 1.0 - e_inout(prog(t, 0.95, 1.55))
        P_grille.draw(f, 360, y, 0.80, ang=lerp(-7, -2, x), neon=neon, shadow=0.8)
        if t > 1.75:  # grille exits up
            pass
        return f, 0
    # ---- S2 2.0-4.0: side BG, headlight piece top, neon side car bottom
    if t < 4.0:
        lt = t - 2.0
        f = cover(side_full, lerp(1.0, 1.1, lt / 2) * punch(t, 2.0), 0.47, 0.6)
        f = warm(f, 0.4)
        # grille leaving to the top-left
        if lt < 0.35:
            x = e_inout(prog(lt, 0, 0.35))
            P_grille.draw(f, lerp(360, 200, x), lerp(205, -500, x), 0.8, ang=-2 - 10 * x, shadow=.8)
        x = e_back(prog(lt, 0.18, 0.6), 1.3)
        P_head.draw(f, lerp(980, 400, x), lerp(-300, 230, x), 0.78, ang=lerp(14, 4, x), shadow=0.9,
                    neon=0.0)
        y2 = e_out(prog(lt, 0.25, 0.75))
        neon = 1.0 - e_inout(prog(lt, 1.1, 1.7))
        P_side.draw(f, 330, lerp(1700, 1170, y2), 1.25, ang=lerp(-6, -2, y2), neon=neon, shadow=.9)
        return f, 0
    # ---- S3 4.0-6.0: wide BG closer, headlight piece rotates, bumper/plate neon -> real
    if t < 6.0:
        lt = t - 4.0
        f = wide_bg(t, lerp(1.25, 1.35, lt / 2) * punch(t, 4.0), fy=.62)
        x = e_inout(prog(lt, 0.0, 0.5))
        P_head.draw(f, lerp(400, 330, x), lerp(230, 250, x), lerp(0.78, 0.9, x), ang=lerp(4, -8, x), shadow=.9)
        y2 = e_back(prog(lt, 0.15, 0.6), 1.2)
        neon = 1.0 - e_inout(prog(lt, 0.9, 1.5))
        P_bumper.draw(f, 360, lerp(1650, 1080, y2), 0.78, ang=lerp(5, 0, y2), neon=neon, shadow=.9)
        # exit: everything slides away fast before the cut
        return f, 0
    # ---- S4 6.0-7.3: side profile tracking shot, then diagonal wipe by a body piece
    if t < 7.3:
        lt = t - 6.0
        f = cover(side_full, lerp(1.55, 1.3, e_out(lt / 1.3)) * punch(t, 6.0, .08), lerp(0.62, 0.40, lt / 1.3), 0.62)
        f = warm(f, 0.4)
        f = flare(f, 420, 520, 0.6)
        x = e_inout(prog(lt, 0.85, 1.3))
        if x > 0:
            # next scene revealed behind a sweeping silver body panel
            nxt = cover(head_full, 1.12, 0.55, 0.35)
            edge = lerp(W * 1.6, -W * 0.9, x)
            mask = np.clip(((xv + (yv - H / 2) * 0.55) - edge) / 3, 0, 1)[..., None]
            f = f * mask + nxt * (1 - mask)
            P_grille.draw(f, edge + 260, H / 2, 2.4, ang=-28, shadow=1.0)
        return f, 0
    # ---- S5 7.3-8.6: headlight close-up push in, zoom through the headlight lens
    if t < 8.6:
        lt = t - 7.3
        hx, hy = 0.53, 0.28
        z = lerp(1.12, 1.45, e_inout(prog(lt, 0, 1.3)))
        f = cover(head_full, z, 0.55, 0.35)
        x = e_inout(prog(lt, 0.8, 1.3))
        if x > 0:
            # headlight centre in screen coords (approx.)
            ih, iw = head_full.shape[:2]
            s = max(W / iw, H / ih) * z
            cx = clamp(0.55 * iw, W / (2 * s), iw - W / (2 * s)); cy = clamp(0.35 * ih, H / (2 * s), ih - H / (2 * s))
            sx = W / 2 + (hx * iw - cx) * s; sy = H / 2 + (hy * ih - cy) * s
            nxt = cover(side_full, 3.0, 0.25, 0.70)
            r = lerp(40, 1700, x ** 2)
            mk = shape_mask_circle(sx, sy, r, 3)
            ring = shape_mask_circle(sx, sy, r + 10, 3) - mk
            f = f * (1 - mk) + nxt * mk + ring * np.array([0.6, 0.85, 1.0]) * 0.6
        return f, 0
    # ---- S6 8.6-10.0: wheel close-up, zoom through the wheel into the wide shot
    if t < 10.0:
        lt = t - 8.6
        z = lerp(3.0, 3.25, lt / 1.4)
        f = cover(side_full, z, 0.25, 0.70)
        f = warm(f, 0.5)
        f = flare(f, 520, 300, 0.9)
        x = e_inout(prog(lt, 0.75, 1.4))
        if x > 0:
            ih, iw = side_full.shape[:2]
            s = max(W / iw, H / ih) * z
            cx = clamp(0.25 * iw, W / (2 * s), iw - W / (2 * s)); cy = clamp(0.70 * ih, H / (2 * s), ih - H / (2 * s))
            wx, wy = 0.25 * iw, 0.685 * ih          # front wheel centre
            sx = W / 2 + (wx - cx) * s; sy = H / 2 + (wy - cy) * s
            r0 = 0.105 * ih * s * 0.62
            r = lerp(r0, 1700, x ** 2.2)
            inner = wide_bg(t, lerp(2.2, 1.15, e_out(x)), fy=.62)
            mk = shape_mask_circle(sx, sy, r, 2.5)
            f = f * (1 - mk) + inner * mk
        return f, 0
    # ---- S7 10.0-12.0: collage - wide top, side car slides in bottom, neon badge blue -> gold
    if t < 12.0:
        lt = t - 10.0
        f = wide_bg(t, lerp(1.15, 1.22, lt / 2), fy=.5)
        y2 = e_back(prog(lt, 0.1, 0.55), 1.1)
        P_side.draw(f, lerp(1300, 470, y2), 1110, 1.3, ang=-3, shadow=1.0)
        bx = e_back(prog(lt, 0.55, 0.95), 1.6)
        if bx > 0:
            col_mix = e_inout(prog(lt, 1.0, 1.4))
            col = tuple(BLUE[i] * (1 - col_mix) + GOLD[i] * col_mix for i in range(2))
            P_badge.draw(f, 165, 980, 0.95 * bx, ang=lerp(-90, 0, bx), neon=1.0, dark=0.45, color=col)
        return f, 0
    # ---- S8 12.0-13.4: grille close-up with light sweep
    if t < 13.4:
        lt = t - 12.0
        f = cover(grille_full, lerp(1.08, 1.22, lt / 1.4) * punch(t, 12.0, .07), 0.52, 0.5)
        sweep = lerp(-500, W + 500, e_inout(prog(lt, 0.2, 1.2)))
        band = np.exp(-(((xv - yv * 0.45) - sweep) ** 2) / (2 * 60 ** 2))[..., None]
        f += band * np.array([0.25, 0.45, 0.6]) * 0.9
        return f, 0
    # ---- S9 13.4-15.0: side by side, then little car on the bonnet
    if t < 15.0:
        lt = t - 13.4
        if lt < 0.8:
            f = cover(side_full, 1.35 * punch(t, 13.4), 0.40, 0.62)
            f = warm(f, 0.4)
            x = e_back(prog(lt, 0.05, 0.5), 1.1)
            P_front.draw(f, lerp(1200, 520, x), 760, 0.62, ang=lerp(8, 0, x), shadow=1.0)
            return f, 0
        lt2 = lt - 0.8
        f = cover(grille_full, lerp(1.0, 1.06, lt2 / .8) * punch(t, 14.2), 0.5, 0.42)
        x = e_back(prog(lt2, 0.05, 0.45), 1.7)
        P_side.draw(f, 215, 160, 0.36 * max(x, 0.01), ang=-4, shadow=1.0)
        return f, 0
    # ---- S10 15.0-17.2: stacked cars on the empty plain
    if t < 17.2:
        lt = t - 15.0
        f = cover(plate_p, lerp(1.0, 1.08, lt / 2.2) * punch(t, 15.0), 0.5, 0.6)
        lift = lerp(0, -330, e_inout(prog(lt, 1.0, 1.6)))
        x1 = e_back(prog(lt, 0.0, 0.4), 1.1)
        P_side.draw(f, 360, lerp(-300, 470, x1) + lift, 0.62, ang=0, shadow=1.0)
        x2 = e_back(prog(lt, 0.35, 0.8), 1.1)
        P_front.draw(f, 360, lerp(1700, 820, x2) + lift, 0.5, shadow=1.0)
        x3 = e_back(prog(lt, 1.05, 1.5), 1.1)
        if x3 > 0:
            P_side.draw(f, lerp(-500, 380, x3), 1180, 0.62, shadow=1.0)
            P_head.draw(f, lerp(1300, 560, e_out(prog(lt, 1.45, 1.9))), 1050, 0.55, ang=6, shadow=1.0)
        return f, 0
    # ---- S11 17.2-end: final wide, fade to grey
    lt = t - 17.2
    f = wide_bg(t, lerp(1.25, 1.05, e_out(prog(lt, 0, 0.9))) * punch(t, 17.2), fy=.6)
    return f, e_inout(prog(lt, 0.35, 0.9)) * 0.85

def main():
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "17",
           "-pix_fmt", "yuv420p", OUT]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    only = None
    for i in range(NF):
        t = i / FPS
        f, grey = scene(t)
        f = grade(f.astype(np.float32), t, grey)
        p.stdin.write((f * 255).astype(np.uint8).tobytes())
        if i % 60 == 0: print(f"frame {i}/{NF}", flush=True)
    p.stdin.close(); p.wait()

if __name__ == "__main__":
    main()
