"""Score, sound design and mix for WHAT IF THE INTERNET DISAPPEARED FOREVER?
Everything except the narration is synthesised here (numpy/scipy), so the whole track is reproducible.
usage: python3 mix.py <narration.mp3> <events.json> <out.wav>
"""
import sys, json, subprocess
import numpy as np
from scipy import signal
import soundfile as sf

SR = 44100
DUR = 77.5
N = int(SR * DUR)
rng = np.random.default_rng(1117)
narr_path, ev_path, out_path = sys.argv[1:4]
EV = json.load(open(ev_path))['ev']

def tt(n): return np.arange(n) / SR
def buf(): return np.zeros((N, 2), np.float32)
def place(dst, x, t0, gain=1.0, pan=0.0):
    """add mono/stereo x at t0 seconds; pan -1..1 (equal power)"""
    i0 = int(round(t0 * SR));
    if i0 >= N: return
    if x.ndim == 1:
        a = (pan + 1) * np.pi / 4; x = np.stack([x * np.cos(a), x * np.sin(a)], 1)
    j0 = max(0, -i0); i0 = max(0, i0); n = min(len(x) - j0, N - i0)
    if n > 0: dst[i0:i0 + n] += x[j0:j0 + n] * gain
def lp(x, f, order=2): b, a = signal.butter(order, min(f / (SR / 2), .99), 'low'); return signal.lfilter(b, a, x, axis=0)
def hp(x, f, order=2): b, a = signal.butter(order, f / (SR / 2), 'high'); return signal.lfilter(b, a, x, axis=0)
def bp(x, f0, f1, order=2): b, a = signal.butter(order, [f0 / (SR / 2), min(f1 / (SR / 2), .99)], 'band'); return signal.lfilter(b, a, x, axis=0)
def adsr(n, a, r, sus=1.0):
    e = np.full(n, sus, np.float32); na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, sus, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def noise(n): return rng.standard_normal(n).astype(np.float32)
def reverb(x, secs=2.8, wet=.35, damp=4000, pre=.02):
    n = int(secs * SR); t = tt(n)
    ir = np.stack([noise(n), noise(n)], 1) * np.exp(-t * 6.9 / secs)[:, None]
    ir = lp(ir, damp); ir[:int(pre * SR)] = 0; ir /= np.sqrt((ir ** 2).sum(0, keepdims=True)) * 1.0
    y = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in range(2)], 1)
    return x * (1 - wet) + y * wet * 1.6

# ———————————————————————— instruments ————————————————————————
def saw(f, n, detune=0.0):
    ph = np.cumsum(np.full(n, f * (1 + detune) / SR)); return (2 * (ph % 1) - 1).astype(np.float32)
def pad(notes, t0, t1, gain=.08, cutoff=1400, a=1.6, r=2.0, out=None, bright=None):
    n = int((t1 - t0 + r) * SR); x = np.zeros(n, np.float32)
    for m in notes:
        f = mtof(m)
        for d in (-.006, 0, .0055): x += saw(f, n, d) * .33
    x = lp(x, cutoff, 2)
    if bright is not None: x = x * (1 - bright) + lp(x, cutoff * 2.4, 2) * bright
    e = adsr(n, a, r); x = x * e / max(1, len(notes))
    L = x * 1.0; R_ = np.roll(x, int(.011 * SR))
    place(out, np.stack([L, R_], 1), t0, gain)
def piano(m, t0, vel=.5, dur=3.5, out=None, pan=0.0):
    f = mtof(m); n = int(dur * SR); t = tt(n); x = np.zeros(n, np.float32)
    for k, (amp, dec) in enumerate([(1, 1.6), (.45, 2.4), (.25, 3.2), (.12, 4.5), (.06, 6)]):
        fk = f * (k + 1) * (1 + .0004 * (k + 1) ** 2)
        x += amp * np.sin(2 * np.pi * fk * t) * np.exp(-t * dec * (1 + m / 90))
    x *= np.minimum(1, t / .004) * vel; x[-int(.05 * SR):] *= np.linspace(1, 0, int(.05 * SR))
    place(out, x, t0, .18, pan)
def pluck(m, t0, vel=.5, out=None, pan=0.0, dec=6):
    f = mtof(m); n = int(.9 * SR); t = tt(n)
    x = (np.sin(2 * np.pi * f * t) + .35 * np.sin(4 * np.pi * f * t) + .12 * np.sin(6 * np.pi * f * t)) * np.exp(-t * dec)
    x *= np.minimum(1, t / .002) * vel; place(out, x, t0, .12, pan)
def strings(notes, t0, t1, gain=.06, out=None, a=2.5, r=2.5, cutoff=2600):
    n = int((t1 - t0 + r) * SR); t = tt(n); x = np.zeros(n, np.float32)
    for m in notes:
        f = mtof(m)
        for d, vr in ((-.004, 5.1), (0, 5.6), (.0045, 6.1)):
            vib = 1 + .0035 * np.sin(2 * np.pi * vr * t)
            ph = np.cumsum(f * (1 + d) * vib / SR); x += (2 * (ph % 1) - 1) * .33
    x = lp(hp(x, 180), cutoff, 2) * adsr(n, a, r) / max(1, len(notes))
    place(out, np.stack([x, np.roll(x, int(.017 * SR))], 1), t0, gain)
def sub(m, t0, t1, gain=.12, out=None, a=1.5, r=2):
    n = int((t1 - t0 + r) * SR); t = tt(n); x = np.sin(2 * np.pi * mtof(m) * t) * adsr(n, a, r); place(out, x, t0, gain)

# ———————————————————————— sound effects ————————————————————————
def ping(f=1320, f2=1760):
    n = int(.42 * SR); t = tt(n); x = np.sin(2 * np.pi * f * t) * np.exp(-t * 14)
    t2 = np.clip(t - .07, 0, None); x += .8 * np.sin(2 * np.pi * f2 * t2) * np.exp(-t2 * 12) * (t > .07)
    return x * np.minimum(1, t / .003)
def errbonk():
    n = int(.35 * SR); t = tt(n); f = 330 * np.exp(-t * 2.2); x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .5 + np.sin(2 * np.pi * np.cumsum(f) / SR) * .5
    return lp(x * np.exp(-t * 9) * np.minimum(1, t / .003), 2200)
def denied():
    out = np.zeros(int(.5 * SR));
    for k, f in enumerate((392, 311)):
        n = int(.16 * SR); t = tt(n); x = np.sign(np.sin(2 * np.pi * f * t)) * np.exp(-t * 8) * .6
        out[int(k * .19 * SR):int(k * .19 * SR) + n] += lp(x, 2500)
    return out
def horn(f=380, dur=.6):
    n = int(dur * SR); t = tt(n); x = sum(np.sign(np.sin(2 * np.pi * f * h * t)) / h for h in (1, 1.26))
    return bp(x * adsr(n, .02, .08), 250, 2600) * .5
def whoosh(dur=1.2, f0=200, f1=4000, rev=False):
    n = int(dur * SR); t = tt(n); x = noise(n); y = np.zeros(n)
    steps = 24
    for k in range(steps):
        a, b_ = k * n // steps, (k + 1) * n // steps; u = k / steps
        fc = f0 * (f1 / f0) ** (u if not rev else 1 - u)
        y[a:b_] = bp(x, max(60, fc * .7), min(18000, fc * 1.4))[a:b_]
    e = np.sin(np.pi * t / dur) ** 2
    return y * e
def thump(f=55, dur=1.6):
    n = int(dur * SR); t = tt(n); ff = f * (1 + 1.5 * np.exp(-t * 18)); x = np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t * 3)
    return x + lp(noise(n), 300) * np.exp(-t * 14) * .5
def tick(f=2600):
    n = int(.05 * SR); t = tt(n); return (np.sin(2 * np.pi * f * t) * .6 + noise(n) * .4) * np.exp(-t * 120)
def crackle(dur):
    n = int(dur * SR); x = noise(n) * (rng.random(n) < .004) * 3; x += np.repeat(noise(n // 220 + 1), 220)[:n] * .3 * (rng.random(n // 220 + 1).repeat(220)[:n] < .3)
    return hp(x, 900)
def rumble(dur):
    n = int(dur * SR); t = tt(n); x = lp(noise(n), 140, 4) * 3 + lp(noise(n), 900) * .4 * (rng.random(n) < .02)
    return x * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** .7
def rattle(dur=1.0):
    n = int(dur * SR); t = tt(n); x = bp(noise(n), 1200, 6000) * (.5 + .5 * np.sign(np.sin(2 * np.pi * 28 * t))) * np.exp(-t * 1.2)
    th = thump(90, .4); x[:len(th)] += th[:n] * .5
    return x
def bird(t0, out, pan=0.0, gain=.05):
    for k in range(rng.integers(2, 5)):
        n = int(.09 * SR); t = tt(n); f0 = rng.uniform(2800, 4200); f = f0 + rng.uniform(-1500, 1500) * t / .09
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / .09) ** 2
        place(out, x, t0 + k * rng.uniform(.1, .16), gain, pan)
def chime(m, t0, out, gain=.12):
    f = mtof(m); n = int(4 * SR); t = tt(n)
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for a, r, d in ((1, 1, 1.2), (.5, 2.76, 2.5), (.3, 5.4, 4), (.2, 8.9, 6)))
    place(out, x * np.minimum(1, t / .002), t0, gain)

# ———————————————————————— narration ————————————————————————
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', narr_path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
vo = np.frombuffer(raw, np.float32).copy()
vo = hp(vo, 70)
# gentle compression
env_ = np.sqrt(np.maximum(lp(vo ** 2, 12), 0) + 1e-9); gr = np.minimum(1, (np.maximum(env_, 1e-4) / .12) ** -.35); vo = vo * gr
vo = vo / (np.abs(vo).max() + 1e-9) * .85
VO = buf(); place(VO, vo, 0.0, 1.0)
vo_env = lp(np.abs(VO[:, 0]), 6); vo_env = vo_env / (vo_env.max() + 1e-9)

# ———————————————————————— score ————————————————————————
MUS = buf()
# 0–5.3: bright "connected world" arpeggio (D major add9), cut by a tape stop
arp = [62, 66, 69, 73, 76, 73, 69, 66]
bpm16 = 60 / 104 / 4
k = 0; t_ = 0.0
while t_ < 5.3:
    pluck(arp[k % 8] + (12 if (k // 16) % 2 and k % 4 == 0 else 0), t_, .55 + .2 * (k % 4 == 0), MUS, pan=.35 * np.sin(k * .7))
    k += 1; t_ += bpm16 * 2
pad([50, 57, 62, 66, 69], 0.0, 5.3, .07, 2200, a=.6, r=.3, out=MUS)
sub(38, 0.2, 5.3, .10, MUS, a=1.0, r=.3)
# tape stop on the music bed between 5.25 and 5.75
i0, i1 = int(5.22 * SR), int(5.85 * SR)
seg_ = MUS[i0:i1].copy(); n = len(seg_); u = np.linspace(0, 1, n); pos = np.cumsum(1 - u) ; pos = pos / pos[-1] * n * .45
MUS[i0:i1] = np.stack([np.interp(pos, np.arange(n), seg_[:, c]) for c in range(2)], 1) * (1 - u[:, None]) ** 1.5
MUS[i1:] *= 0
# 6.3–17.8: tension — drone, cluster, heartbeat pulse
sub(26, 6.2, 17.8, .16, MUS, a=.4, r=1.5)
pad([38, 45, 50, 51, 57], 6.3, 11.0, .06, 700, a=1.2, r=1.2, out=MUS)
pad([38, 45, 50, 52, 53, 57], 11.0, 17.9, .065, 900, a=.8, r=1.6, out=MUS)
for k in range(int((17.6 - 6.4) / .72)):
    tk = 6.4 + k * .72; place(MUS, thump(46, .7) * (.55 + .45 * (tk > 11)), tk, .10); place(MUS, thump(46, .5) * .5, tk + .2, .07)
strings([62, 63], 13.0, 17.8, .035, MUS, a=3, r=1)
# 17.8–26.5: the first night — dark, sparse
pad([46, 53, 57, 62], 17.8, 22.0, .06, 1000, a=1.5, r=2.5, out=MUS)
pad([43, 50, 55, 58, 62], 21.6, 26.4, .06, 900, a=2, r=2, out=MUS)
sub(31, 17.8, 26.2, .10, MUS, a=2, r=2)
for tk, m in ((18.4, 74), (20.0, 70), (21.6, 69), (23.2, 67), (24.8, 65)): piano(m, tk, .35, 4, MUS, pan=-.2)
# 26.5–37.7: adapting — piano warms up (Dm Bb F C)
prog = [(26.6, [50, 57, 62, 65]), (29.4, [46, 53, 58, 62]), (32.2, [41, 53, 57, 60]), (35.0, [48, 55, 60, 64])]
for tk, ch in prog:
    pad(ch, tk, tk + 2.9, .05, 1500, a=1.2, r=1.6, out=MUS); sub(ch[0] - 12, tk, tk + 2.8, .08, MUS, a=.6, r=1)
    for j, m in enumerate([ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 12]): piano(m, tk + j * .7, .32, 3, MUS, pan=.25 * (j - 1.5) / 1.5)
# 37.7–45.5: one year — gentle, folk-like
prog = [(37.7, [41, 53, 57, 60]), (39.65, [48, 55, 60, 64]), (41.6, [50, 57, 62, 65]), (43.55, [46, 53, 58, 62])]
for tk, ch in prog:
    pad(ch, tk, tk + 2.0, .055, 1800, a=.8, r=1.4, out=MUS); sub(ch[0] - 12, tk, tk + 1.9, .08, MUS, a=.4, r=.8)
    for j in range(6): pluck(ch[(j % 3) + 1] + 12, tk + j * .325, .38, MUS, pan=.3 * np.sin(j), dec=4)
    piano(ch[3] + 24, tk, .25, 3, MUS)
# 45.5–57.7: generations pass — emotional strings, mysterious
prog = [(45.5, [50, 57, 62, 65]), (48.4, [46, 53, 58, 62]), (51.3, [43, 55, 58, 62]), (54.4, [45, 52, 57, 61])]
for tk, ch in prog:
    strings(ch, tk, tk + 3.2, .065, MUS, a=1.6, r=2); sub(ch[0] - 12, tk, tk + 3.1, .10, MUS, a=1, r=1.4)
    piano(ch[3] + 12, tk + .2, .3, 4, MUS); piano(ch[2] + 24, tk + 1.6, .22, 4, MUS)
strings([69, 74], 51.3, 57.6, .03, MUS, a=4, r=1.5, cutoff=3500)
# 57.7–66.4: ten thousand years — wide, majestic, then hush
prog = [(57.7, [46, 58, 62, 65, 70]), (59.9, [41, 57, 60, 65, 69]), (62.1, [48, 60, 64, 67, 72]), (64.3, [50, 57, 62, 65, 69])]
for tk, ch in prog:
    strings(ch, tk, tk + 2.3, .075, MUS, a=1.2, r=2.2, cutoff=3800); pad(ch, tk, tk + 2.3, .04, 2600, a=1.2, r=2.2, out=MUS)
    sub(ch[0] - 12, tk, tk + 2.2, .11, MUS, a=.8, r=1.4)
    for j in range(4): pluck(ch[(j % 4) + 1] + 12, tk + j * .55, .3, MUS, pan=.4 * np.sin(j * 1.3), dec=3)
# 66.4–73: the question — low piano, unresolved
piano(38, 66.45, .7, 6, MUS); piano(50, 66.45, .4, 6, MUS)
for tk, ms in ((67.0, [62, 65, 69]), (69.9, [62, 67, 69]), (71.5, [64, 67, 69])):
    for j, m in enumerate(ms): piano(m, tk + j * .18, .3, 4, MUS)
pad([45, 50, 55, 57], 69.8, 73.2, .035, 900, a=1.5, r=2.4, out=MUS)
# 73.35: logo — resolve to D
pad([50, 57, 62, 66], 73.3, 76.6, .04, 1600, a=.6, r=1.5, out=MUS)
MUS = reverb(MUS, 3.2, .38)
# duck the score under the narration
duck = 1 - .55 * np.clip(vo_env * 2.6, 0, 1)
MUS *= duck[:, None]

# ———————————————————————— sound design ————————————————————————
FX = buf(); AMB = buf()
# notification pings, synced to the icons
for e in EV:
    if e['type'] == 'ping' and e['t'] < 5.2:
        f = rng.choice([1175, 1319, 1480, 1568, 1760]); place(FX, ping(f, f * rng.choice([1.25, 1.333, 1.5])), e['t'], .07 if e.get('far') else .10, rng.uniform(-.7, .7))
    elif e['type'] == 'err' and e['kind'] == 'off': place(FX, errbonk(), e['t'], .10, rng.uniform(-.6, .6))
    elif e['type'] == 'err' and e['kind'] == 'msg': place(FX, errbonk() * .8, e['t'], .08, rng.uniform(-.6, .6))
    elif e['type'] == 'err' and e['kind'] == 'fixed': place(FX, denied(), e['t'], .12, .2)
    elif e['type'] == 'err' and e['kind'] == 'car': place(FX, ping(988, 784), e['t'], .08, rng.uniform(-.5, .5))
    elif e['type'] == 'stall': place(FX, thump(160, .25) * .4 + lp(noise(int(.25 * SR)), 1800) * np.exp(-tt(int(.25 * SR)) * 30) * .3, e['t'], .08, rng.uniform(-.5, .5))
    elif e['type'] == 'house' and e['t'] > 53: place(FX, thump(110, .5), e['t'], .05, rng.uniform(-.4, .4))
    elif e['type'] == 'crumble': place(FX, rumble(2.4) * min(1, e['h'] / 40), e['t'], .05, float(np.clip(e['x'] / 80, -.8, .8)))
# the disconnect
place(FX, crackle(.85), 5.25, .08); place(FX, thump(42, 2.4), 5.58, .55); place(FX, whoosh(.9, 6000, 150), 5.0, .12)
n = int(.5 * SR); t = tt(n); place(FX, np.sin(2 * np.pi * np.cumsum(1200 * np.exp(-t * 7)) / SR) * np.exp(-t * 4) * .5, 5.45, .10)   # power-down zap
# stage transitions: whoosh + low hit
for ts in (6.3, 11.0, 17.8, 26.5, 37.7, 45.5, 51.3, 57.7):
    place(FX, whoosh(1.3, 300, 5000), ts - .9, .10, 0); place(FX, thump(50, 1.4), ts, .14)
# counter ticks (seconds, hours, days)
for k in range(1, 10): place(FX, tick(2400), 6.4 + 3.2 * k / 10, .07)
for k in range(1, 24): place(FX, tick(2000), 18.1 + 7.1 * k / 23, .05)
for k in range(1, 7): place(FX, tick(1800), 26.7 + 2.3 * k / 6, .06)
# horns in the jam
for tk, f, d, p in ((11.9, 380, .5, -.4), (12.8, 330, .9, .5), (13.9, 415, .35, -.2), (14.25, 415, .35, -.2), (15.3, 300, 1.2, .6), (16.5, 360, .6, -.6), (17.1, 340, .4, .3)):
    place(FX, horn(f, d), tk, .07, p)
# shutters coming down
for tk in (19.8, 20.9, 21.45): place(FX, rattle(1.1), tk, .07, rng.uniform(-.4, .4))
# plane in a holding pattern
n = int(9 * SR); t = tt(n); pl = lp(noise(n), 500) * .6 + np.sin(2 * np.pi * (110 + 6 * np.sin(t * .4)) * t) * .2
place(AMB, pl * np.sin(np.pi * t / 9) ** .5 * (.6 + .4 * np.sin(t * .38)), 17.6, .05, .3)
# TV murmur in the night
n = int(8.4 * SR); t = tt(n); mm = bp(noise(n), 300, 2400) * (.5 + .5 * np.abs(np.sin(2 * np.pi * 3.3 * t + np.sin(t * 7))))
place(AMB, mm * adsr(n, 1, 1.5), 18.0, .03, -.2)
# radio: static, tuning, beeps with the rings
n = int(8 * SR); t = tt(n); st = hp(noise(n), 1500) * (.4 + .6 * (np.sin(t * 3.1) > .2)); place(FX, st * adsr(n, .3, 1.2), 29.4, .025, -.5)
sweep = np.sin(2 * np.pi * np.cumsum(900 + 700 * np.sin(tt(int(1.4 * SR)) * 4.2)) / SR) * .3; place(FX, sweep * adsr(len(sweep), .1, .3), 31.7, .05, -.5)
for k in range(9): place(FX, ping(880, 880) * .6, 29.4 + k * .95, .05, -.5)
# city bed: traffic for the first day, crowd murmur later
n = N; t = tt(n)
traffic = lp(noise(n), 400, 2) * .8 + bp(noise(n), 500, 3000) * .25
tr_env = np.interp(t, [0, 1, 5.2, 5.8, 6.3, 11, 13, 17.8, 19.5, 26.5, 37.7, 45.5], [0, 1, 1, .35, .5, .6, .35, .3, .15, .1, .06, 0])
place(AMB, np.stack([traffic * tr_env, np.roll(traffic, 999) * tr_env], 1), 0, .06)
for k in range(10):   # passing cars in the opening
    tk = .3 + k * .52; n2 = int(1.6 * SR); x = bp(noise(n2), 200, 1500) * np.sin(np.pi * tt(n2) / 1.6) ** 2; place(AMB, x, tk, .05, -.8 + 1.6 * (k % 5) / 4)
murm = bp(noise(N), 250, 1800) * (.6 + .4 * np.sin(t * 2.1) * np.sin(t * .73))
mu_env = np.interp(t, [0, 6.3, 7, 11, 17.8, 26.5, 27.5, 37.7, 38.6, 45.5, 46.5, 51.3, 52], [.3, .3, .9, .7, .3, .3, .8, .8, 1, 1, .4, .4, 0])
place(AMB, np.stack([murm * mu_env, np.roll(murm, 1500) * mu_env], 1), 0, .03)
# nature: wind, birds, forest
wind = lp(noise(N), 700, 2) * (.6 + .4 * np.sin(2 * np.pi * t / 7.3) * np.sin(2 * np.pi * t / 3.1))
wi_env = np.interp(t, [0, 37.7, 45.5, 51.3, 57.7, 66.2, 67.5, 77.5], [0, 0, .4, .8, 1, 1, .15, 0])
place(AMB, np.stack([wind * wi_env, np.roll(wind, 2500) * wi_env], 1), 0, .07)
for tk in np.arange(38.5, 66.0, .55):
    if rng.random() < (.25 if tk < 45.5 else .45 if tk < 57.7 else .7): bird(tk + rng.uniform(0, .4), AMB, rng.uniform(-.8, .8), .03 if tk < 45.5 else .04)
water = bp(noise(N), 800, 5000) * .3; place(AMB, np.stack([water, np.roll(water, 777)], 1) * np.interp(t, [0, 57.7, 59, 66.2, 67], [0, 0, .6, .6, 0])[:, None], 0, .03)
# the cut to black and the logo
place(FX, thump(36, 4.0), 66.3, .55); place(FX, whoosh(1.4, 6000, 200), 65.2, .08)
chime(74, 73.35, FX, .07); chime(81, 73.55, FX, .04)
FX = reverb(FX, 1.6, .22, 6000); AMB = reverb(AMB, 1.2, .15)

# ———————————————————————— mix ————————————————————————
mix = VO * 1.0 + MUS * .46 + FX * .55 + AMB * .5
fade = np.ones(N); nf = int(1.0 * SR); fade[-nf:] = np.linspace(1, 0, nf) ** 2; mix *= fade[:, None]
mix = hp(mix, 25)
peak = np.abs(mix).max(); mix = mix / peak * .89
sf.write(out_path, mix.astype(np.float32), SR, subtype='FLOAT')
print('wrote', out_path, f'{DUR}s', 'peak before norm', round(float(peak), 3))
if len(sys.argv) > 4:   # stems for checking the balance
    g = .89 / peak
    sf.write(sys.argv[4] + '_vo.wav', (VO * g * fade[:, None]).astype(np.float32), SR, subtype='FLOAT')
    sf.write(sys.argv[4] + '_bed.wav', ((MUS * .46 + FX * .55 + AMB * .5) * g * fade[:, None]).astype(np.float32), SR, subtype='FLOAT')
