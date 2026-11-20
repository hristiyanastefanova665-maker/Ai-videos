"""Final edit from the raw AI clips (raw/*.mp4), cut on the bars found by OpenMontage's
music-to-video analyzer (build/audiomap.json). Effects follow the reference reel:
cut-out pieces over a moving wide shot, gold neon outlines fading to the real car,
diagonal body-panel wipe, zoom-through headlight / wheel, neon badge, car-on-bonnet,
stacked cars, grey fade.
usage: render_clips.py [out.mp4]"""
import sys, json, subprocess, os
import numpy as np, cv2
sys.argv = sys.argv[:1] + ["18.04"] + sys.argv[1:2]  # render.py reads DUR/OUT from argv
import render as R
from render import (W, H, FPS, prog, e_out, e_inout, e_back, lerp, cover, Piece, GOLD, BLUE,
                    shape_mask_circle, flare, grade, warm, xv, yv, punch)

OUT = sys.argv[2] if len(sys.argv) > 2 else "build/edit.mp4"
am = json.load(open("build/audiomap.json"))
DUR = am["audio"]["duration_sec"] if "audio" in am else 18.04
D = am["grid"]["downbeats_sec"][:] ; D[0] = 0.0
D.append(DUR)

class Clip:
    def __init__(self, name, fps=16):
        w, h = map(int, subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries",
                   "stream=width,height", "-of", "csv=p=0", f"raw/{name}.mp4"]).decode().strip().split(","))
        raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", f"raw/{name}.mp4", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"])
        self.f = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)
        mp = f"build/masks/{name}.npy"
        self.m = np.load(mp) if os.path.exists(mp) else None
        self.n, self.fps = len(self.f), fps

    def _idx(self, t):
        x = min(max(t * self.fps, 0), self.n - 1.001)
        i = int(x); return i, x - i

    def frame(self, t):
        i, a = self._idx(t)
        return (self.f[i] * (1 - a) + self.f[i + 1] * a).astype(np.float32) / 255

    def rgba(self, t, shape=None, use_mask=True):
        i, a = self._idx(t)
        if use_mask:
            m = (self.m[i] * (1 - a) + self.m[i + 1] * a).astype(np.float32) / 255
            if shape is not None: m = m * shape
        else:
            m = shape.copy()
        return np.dstack([self.frame(t), m])

    @property
    def dur(self): return (self.n - 1) / self.fps

C = {n: Clip(n) for n in ["01_wide_approach", "02_grille_orbit", "03_headlight", "04_side_drive",
                          "05_wheel_roll", "06_orbit_rear", "07_wide_orbit"]}
wide, grille, head, side, wheel, rear, orbit = (C[k] for k in ["01_wide_approach", "02_grille_orbit", "03_headlight",
                                                              "04_side_drive", "05_wheel_roll", "06_orbit_rear", "07_wide_orbit"])
ch, cw = wide.f.shape[1:3]

def arc_shape(frac=0.55):
    """Soft mask keeping the top part of a frame with a curved (bumper-like) bottom edge."""
    y, x = np.mgrid[0:ch, 0:cw].astype(np.float32)
    d = ((x - cw / 2) / (cw * 0.95)) ** 2 + ((y + ch * 0.15) / (ch * (frac + 0.15))) ** 2
    return np.clip((1 - d) * 40, 0, 1)
ARC = arc_shape(0.55)

def piece(clip, t, shape=None, neon=True):
    # close-ups (grille, headlight) fill the frame, so their piece is the curved ARC shape itself
    return Piece(clip.rgba(t, shape, use_mask=clip not in (grille, head)), neon=neon)

def vbg(clip, t, zoom=1.0, fx=.5, fy=.5, w=0.25):
    return warm(cover(clip.frame(t), zoom, fx, fy), w)

def sharpen(f):
    return f + 0.6 * (f - cv2.GaussianBlur(f, (0, 0), 1.4))

def scene(t):
    k = max(i for i in range(len(D) - 1) if D[i] <= t)
    lt = t - D[k]; L = D[k + 1] - D[k]
    grey = 0.0
    if k == 0:   # wide approach + neon grille drops in from the top
        f = vbg(wide, lt * 0.9, 1.05 * punch(t, 0, .06), fy=.55)
        x = e_back(prog(lt, 0.10, 0.55), 1.2)
        neon = 1 - e_inout(prog(lt, 0.75, 1.3))
        piece(grille, 0.4 + lt * 0.6, ARC).draw(f, 360, lerp(-900, 350, x), 1.55, ang=lerp(-7, -2, x), neon=neon, shadow=.8)
    elif k == 1:  # wide continues, headlight piece top, neon side car bottom
        f = vbg(wide, 1.4 + lt * 0.9, 1.1 * punch(t, D[k]), fy=.55)
        if lt < .3:
            xo = e_inout(prog(lt, 0, .3))
            piece(grille, 1.3 + lt, ARC, False).draw(f, lerp(360, 220, xo), lerp(350, -700, xo), 1.55, ang=-2 - 10 * xo, shadow=.8)
        x = e_back(prog(lt, 0.15, 0.55), 1.3)
        piece(head, 0.3 + lt * 0.7, ARC).draw(f, lerp(1100, 370, x), lerp(-500, 340, x), 1.55, ang=lerp(14, 4, x), shadow=.9)
        y2 = e_out(prog(lt, 0.25, 0.7))
        neon = 1 - e_inout(prog(lt, 0.85, 1.35))
        piece(side, 0.2 + lt * 0.8).draw(f, 360, lerp(1900, 1140, y2), 1.55, ang=lerp(-6, -2, y2), neon=neon, shadow=.9)
    elif k == 2:  # orbit BG, headlight piece rotates, neon front car rises from the bottom
        f = vbg(orbit, 0.3 + lt * 0.9, 1.15 * punch(t, D[k]), fy=.55)
        x = e_inout(prog(lt, 0, .5))
        piece(head, 1.35 + lt * 0.7, ARC, False).draw(f, lerp(370, 330, x), lerp(340, 350, x), lerp(1.55, 1.65, x), ang=lerp(4, -8, x), shadow=.9)
        y2 = e_back(prog(lt, 0.12, 0.55), 1.2)
        neon = 1 - e_inout(prog(lt, 0.8, 1.3))
        piece(wide, 2.4 + lt * 0.5).draw(f, 360, lerp(1900, 1130, y2), 1.7, ang=lerp(5, 0, y2), neon=neon, shadow=.9)
    elif k == 3:  # side tracking shot, diagonal body-panel wipe into the rear orbit
        f = vbg(side, 0.2 + lt * 1.0, lerp(1.55, 1.35, e_out(lt / L)) * punch(t, D[k], .08), fy=.56)
        f = flare(f, 430, 470, 0.6)
        x = e_inout(prog(lt, L - .45, L))
        if x > 0:
            nxt = vbg(rear, 0.0, 1.05)
            edge = lerp(W * 1.6, -W * 0.9, x)
            mask = np.clip(((xv + (yv - H / 2) * 0.55) - edge) / 3, 0, 1)[..., None]
            f = f * mask + nxt * (1 - mask)
            R.P_grille.draw(f, edge + 260, H / 2, 2.4, ang=-28, shadow=1.0)
    elif k == 4:  # camera orbits to the rear
        f = vbg(rear, lt * 1.15, 1.05 * (1 + 0.04 * lt))
    elif k == 5:  # headlight push-in, zoom through the lens into the wheel
        z = lerp(1.0, 1.2, e_inout(prog(lt, 0, L)))
        f = vbg(head, 0.6 + lt * 1.0, z * punch(t, D[k], .07), fx=.5, fy=.45)
        x = e_inout(prog(lt, L - .55, L))
        if x > 0:
            nxt = vbg(wheel, 0.0, 1.0, w=.4)
            r = lerp(30, 1700, x ** 2)
            hx, hy = 345, 470
            mk = shape_mask_circle(hx, hy, r, 3)
            ring = shape_mask_circle(hx, hy, r + 10, 3) - mk
            f = f * (1 - mk) + nxt * mk + ring * np.array([0.6, 0.85, 1.0]) * 0.6
    elif k == 6:  # wheel rolls, zoom through the wheel into the wide shot
        wt = lt * 0.3
        f = vbg(wheel, wt, 1.0, w=.4)
        WX, WY = lerp(300, 255, wt / 0.45), 860
        f = flare(f, 520, 300, 0.8)
        x = e_inout(prog(lt, L - .6, L))
        if x > 0:
            inner = vbg(wide, 2.0, lerp(2.0, 1.1, e_out(x)), fy=.55)
            r = lerp(150, 1700, x ** 2.2)
            mk = shape_mask_circle(WX, WY, r, 2.5)
            f = f * (1 - mk) + inner * mk
    elif k == 7:  # collage: orbit top, side car slides in bottom, neon badge blue -> gold
        f = vbg(orbit, 0.2 + lt * 0.8, 1.1, fy=.42)
        y2 = e_back(prog(lt, 0.08, 0.5), 1.1)
        piece(side, 1.6 + lt * 0.8, None, False).draw(f, lerp(1300, 400, y2), 1080, 1.6, ang=-3, shadow=1.0)
        bx = e_back(prog(lt, 0.45, 0.85), 1.6)
        if bx > 0:
            cm = e_inout(prog(lt, 0.9, 1.3))
            col = tuple(BLUE[i] * (1 - cm) + GOLD[i] * cm for i in range(2))
            R.P_badge.draw(f, 165, 900, 0.95 * bx, ang=lerp(-90, 0, bx), neon=1.0, dark=0.45, color=col)
    elif k == 8:  # grille orbit with a light sweep
        f = vbg(grille, 1.2 + lt * 1.0, 1.05 * punch(t, D[k], .07))
        sweep = lerp(-500, W + 500, e_inout(prog(lt, 0.2, 1.2)))
        band = np.exp(-(((xv - yv * 0.45) - sweep) ** 2) / (2 * 60 ** 2))[..., None]
        f = f + band * np.array([0.25, 0.45, 0.6]) * 0.9
    elif k == 9:  # side by side, then the little car on the bonnet
        if lt < .75:
            f = vbg(side, 2.2 + lt, 1.15 * punch(t, D[k]), fy=.5)
            x = e_back(prog(lt, 0.03, 0.45), 1.1)
            piece(wide, 2.8 + lt * .5, None, False).draw(f, lerp(1250, 470, x), 760, 1.15, ang=lerp(8, 0, x), shadow=1.0)
        else:
            l2 = lt - .75
            f = vbg(grille, 2.3 + l2, 1.0 * punch(t, D[k] + .75), fy=.5)
            x = e_back(prog(l2, 0.03, 0.4), 1.7)
            R.P_side.draw(f, 230, 300, 0.36 * max(x, .01), ang=-4, shadow=1.0)
    elif k == 10:  # stacked cars on the empty plain
        f = cover(R.plate_p, lerp(1.0, 1.08, lt / L) * punch(t, D[k]), .5, .6)
        lift = lerp(0, -330, e_inout(prog(lt, .75, 1.2)))
        x1 = e_back(prog(lt, 0, .35), 1.1)
        piece(side, 1.0 + lt, None, False).draw(f, 360, lerp(-300, 470, x1) + lift, 1.2, shadow=1.0)
        x2 = e_back(prog(lt, .3, .7), 1.1)
        piece(wide, 1.0 + lt * .6, None, False).draw(f, 360, lerp(1900, 860, x2) + lift, 1.05, shadow=1.0)
        x3 = e_back(prog(lt, .8, 1.2), 1.1)
        if x3 > 0:
            piece(side, 2.0 + lt, None, False).draw(f, lerp(-500, 380, x3), 1180, 1.2, shadow=1.0)
    else:  # final wide, fade to grey
        f = vbg(wide, 3.5 - lt * 0.9, lerp(1.25, 1.05, e_out(prog(lt, 0, .9))) * punch(t, D[k]), fy=.55)
        grey = e_inout(prog(lt, 0.6, L)) * 0.85
    return sharpen(f), grey


def main():
    nf = int(round(DUR * FPS))
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", "build/bgm.mp3", "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "slow",
           "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for i in range(nf):
        t = i / FPS
        f, g = scene(t)
        p.stdin.write((grade(f.astype(np.float32), t, g) * 255).astype(np.uint8).tobytes())
        if i % 90 == 0: print(f"frame {i}/{nf}", flush=True)
    p.stdin.close(); p.wait()

if __name__ == "__main__":
    main()
