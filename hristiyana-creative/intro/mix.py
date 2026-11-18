# Synthesizes the music bed + sound effects and mixes them under the voice-over.
# Usage: python3 mix.py  -> out/soundtrack.wav   (needs out/sfx.json from `node render.js sfx`)
import json, numpy as np, soundfile as sf, subprocess
from scipy.signal import butter, sosfilt
SR = 44100; DUR = 87.0; N = int(SR * DUR)
rng = np.random.default_rng(7)
t_ = lambda d: np.arange(int(d * SR)) / SR
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def env(n, a, d): t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
noise = lambda d: rng.standard_normal(int(d * SR))
def sweep_noise(d, f0, f1, q=0.6):
    x = noise(d); out = np.zeros_like(x); seg = int(SR * .01)
    for i in range(0, len(x), seg):
        f = f0 * (f1 / f0) ** (i / len(x)); lo, hi = max(40, f * (1 - q / 2)), min(SR / 2 - 100, f * (1 + q / 2))
        out[i:i + seg] = bp(x[max(0, i - 2000):i + seg], lo, hi)[-len(x[i:i + seg]):]
    return out
def tone(f, d, partials=((1, 1),), dec=.3, a=.002):
    t = t_(d); y = sum(g * np.sin(2 * np.pi * f * m * t) for m, g in partials); return y * env(len(t), a, dec)
def A(*xs):
    n = max(len(x) for x in xs); o = np.zeros(n)
    for x in xs: o[:len(x)] += x
    return o
def norm(x, p=1.0): return x / (np.max(np.abs(x)) + 1e-9) * p
S = {}
S['key'] = lambda: A(norm(hp(noise(.03), 2500) * env(int(.03 * SR), .0005, .006), .5), norm(tone(1800, .03, dec=.004), .15))
S['enter'] = lambda: A(norm(lp(noise(.12), 900) * env(int(.12 * SR), .001, .025), .8), tone(140, .12, dec=.03) * .5)
S['whoosh'] = lambda: norm(sweep_noise(.6, 300, 4000) * np.sin(np.linspace(0, np.pi, int(.6 * SR))) ** 2, .7)
S['whoosh2'] = lambda: norm(sweep_noise(.4, 2500, 500) * np.sin(np.linspace(0, np.pi, int(.4 * SR))) ** 2, .5)
S['swoosh'] = lambda: norm(sweep_noise(.35, 600, 3000) * np.sin(np.linspace(0, np.pi, int(.35 * SR))) ** 1.5, .5)
S['swipe'] = lambda: norm(sweep_noise(.18, 3000, 7000) * np.sin(np.linspace(0, np.pi, int(.18 * SR))), .4)
def pop():
    t = t_(.12); f = 900 * np.exp(-t * 25) + 260; return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), .001, .04) * .6
S['pop'] = pop
def thud(f0=120, d=.5, g=1):
    t = t_(d); f = f0 * (1 + 2 * np.exp(-t * 30)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), .001, d / 4) * g
S['stamp'] = lambda: A(thud(110, .35, .8), norm(lp(noise(.15), 2500) * env(int(.15 * SR), .001, .03), .45))
S['hit'] = lambda: A(thud(70, .7, 1), norm(sweep_noise(.4, 5000, 400) * env(int(.4 * SR), .001, .12), .35))
S['thud'] = lambda: A(thud(55, 1.0, 1.1), norm(lp(noise(.3), 400) * env(int(.3 * SR), .001, .08), .4))
def ding(f=1320, d=1.2, g=.4): return tone(f, d, ((1, 1), (2.76, .35), (5.4, .12)), dec=d / 3) * g
S['ding'] = lambda: A(ding(1568), ding(2093, 1.0, .2))
def magic():
    out = np.zeros(int(1.3 * SR))
    for i, f in enumerate([784, 988, 1175, 1568, 1976, 2349]):
        s = int(i * .06 * SR); y = ding(f, 1.0, .18); out[s:s + len(y)] += y[:len(out) - s]
    sh = hp(noise(1.3), 6000) * np.exp(-t_(1.3) * 3) * .06
    return out + sh
S['magic'] = magic
S['burst'] = lambda: A(S['hit']() * .7, magic() * .8)
S['paper'] = lambda: norm(bp(noise(.3), 1500, 6000) * env(int(.3 * SR), .02, .08), .3)
def printer():
    d = 1.4; t = t_(d); y = np.sin(2 * np.pi * 95 * t) * .25 + np.sign(np.sin(2 * np.pi * 190 * t)) * .05
    y = lp(y, 900) * np.minimum(1, t / .05) * np.minimum(1, (d - t) / .1)
    for k in range(10):
        s = int((.05 + k * .135) * SR); c = lp(noise(.03), 3000) * env(int(.03 * SR), .001, .006) * .5; y[s:s + len(c)] += c
    return y
S['printer'] = printer
def neon():
    t = t_(.5); return (np.sign(np.sin(2 * np.pi * 120 * t)) * .08 * (rng.random(len(t)) > .3) + hp(noise(.5), 3000) * .03) * env(len(t), .005, .2)
S['neon'] = neon
def glitch():
    out = np.zeros(int(.4 * SR)); p = 0
    while p < len(out) - 2000:
        l = int(rng.uniform(.01, .04) * SR); seg = np.round(noise(l / SR) * 3) / 3 * .3
        seg = seg * (np.sign(np.sin(2 * np.pi * rng.uniform(80, 900) * np.arange(l) / SR)) * .5 + .5)
        out[p:p + l] = seg[:len(out) - p]; p += l + int(rng.uniform(0, .02) * SR)
    return lp(out, 6000)
S['glitch'] = glitch
S['zoom'] = lambda: norm(sweep_noise(.4, 400, 3000) * np.linspace(0, 1, int(.4 * SR)) ** 2, .45)
def error():
    t = t_(.22); y = np.sign(np.sin(2 * np.pi * 330 * t)) * (t < .1) + np.sign(np.sin(2 * np.pi * 247 * t)) * (t >= .11)
    return lp(y, 2500) * .12 * env(len(t), .002, .3)
S['error'] = error
S['snap'] = lambda: A(norm(hp(noise(.06), 1800) * env(int(.06 * SR), .0005, .01), .8), magic() * .5)
S['tick'] = lambda: A(tone(2200, .08, dec=.02) * .25, norm(hp(noise(.02), 4000) * env(int(.02 * SR), .0005, .004), .2))
S['click'] = lambda: A(tone(1500, .05, dec=.008) * .4, norm(hp(noise(.03), 2000) * env(int(.03 * SR), .0005, .005), .4))
def notif():
    a = ding(1319, .6, .3); b = ding(1760, .8, .3); out = np.zeros(int(.95 * SR)); out[:len(a)] += a; s = int(.11 * SR); out[s:s + len(b)] += b; return out
S['notif'] = notif
def coins():
    out = np.zeros(int(.9 * SR))
    for i in range(7):
        s = int(rng.uniform(0, .45) * SR); y = tone(rng.uniform(2600, 4200), .3, ((1, 1), (1.5, .4)), dec=.06) * .15; out[s:s + len(y)] += y
    return out
S['coins'] = coins
S['brush'] = lambda: norm(bp(noise(.9), 800, 5000) * np.sin(np.linspace(0, np.pi, int(.9 * SR))), .25)

# ---------- music ----------
bpm = 100; beat = 60 / bpm; bar = beat * 4
mus = np.zeros(N); bass = np.zeros(N); drums = np.zeros(N)
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
prog = [[50, 57, 60, 64, 65], [46, 53, 57, 62, 65], [41, 53, 57, 60, 64], [48, 55, 59, 62, 67]]  # Dm9  Bbmaj7  Fmaj7  Cmaj7/G-ish
def pad(notes, d):
    t = t_(d); y = np.zeros(len(t))
    for m in notes[1:]:
        for dt in (-.08, .08):
            f = hz(m + 12 * 0) * 2 ** (dt / 12); y += 2 * ((t * f) % 1) - 1
    y = lp(y, 1400, 2); a = np.minimum(1, t / .6) * np.minimum(1, (d - t) / .6); return y * a * .05
pos = 0.0; ci = 0
while pos < DUR:
    ch = prog[ci % 4]; d = bar * 2; s = int(pos * SR)
    p = pad(ch, min(d + .6, DUR - pos + .01)); e = min(N, s + len(p)); mus[s:e] += p[:e - s]
    # sub bass whole notes
    for k in range(2):
        b = tone(hz(ch[0] - 12), bar, ((1, 1), (2, .25)), dec=1.6, a=.02) * .32; bs = int((pos + k * bar) * SR)
        if bs >= N: break
        be = min(N, bs + len(b)); bass[bs:be] += b[:be - bs]
    # pluck arpeggio in 8ths
    arp = [ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[4] + 12, ch[3] + 12, ch[2] + 12, ch[4] + 12, ch[1] + 24]
    for k in range(16):
        tt = pos + k * beat / 2
        if tt >= DUR: break
        n = arp[k % 8]; y = tone(hz(n), .5, ((1, 1), (2, .3), (3, .1)), dec=.16) * (.07 if k % 2 == 0 else .05)
        ys = int(tt * SR); ye = min(N, ys + len(y)); mus[ys:ye] += y[:ye - ys]
    pos += d; ci += 1
# drums from 1.55s
kick = thud(60, .35, .55); hat = norm(hp(noise(.05), 7000) * env(int(.05 * SR), .0005, .012), .12)
snare = A(norm(bp(noise(.2), 1200, 6000) * env(int(.2 * SR), .001, .05), .16), tone(220, .15, dec=.04) * .1)
tt = 1.55
k = 0
while tt < DUR - 2.5:
    for smp, cond in ((kick, k % 4 in (0,) or (k % 8 == 5)), (hat, True), (snare, k % 4 == 2)):
        if cond and not (30.45 < tt < 30.8):
            s = int(tt * SR); e = min(N, s + len(smp)); drums[s:e] += smp[:e - s]
    tt += beat / 2 * 1; k += 1
music = mus + lp(bass, 220) + drums * .9
# arrangement: soft intro, drop-out at the passion glitch, gentle outro
tt = np.arange(N) / SR
arr = np.interp(tt, [0, 1.5, 1.6, 30.4, 30.5, 32.7, 32.8, 84.5, 87.0], [.45, .45, 1, 1, .25, .35, 1, 1, 0])
music *= arr
# ---------- voice + ducking ----------
vo, sr = sf.read('assets/voiceover.mp3', always_2d=False)
if vo.ndim > 1: vo = vo.mean(1)
vo = norm(vo, .89); V = np.zeros(N); V[:min(N, len(vo))] = vo[:N]
ve = np.sqrt(np.maximum(lp(V ** 2, 6), 0)); ve = np.clip(ve / (ve.max() * .25), 0, 1)
duck = 1 - .45 * lp(ve, 3)
music = norm(music, .9) * .19 * duck
# ---------- sfx ----------
fxbus = np.zeros(N)
for t0, typ, vol in json.load(open('out/sfx.json')):
    if typ not in S or not typ: continue
    y = S[typ]() * vol; s = int(t0 * SR); e = min(N, s + len(y))
    if s < N: fxbus[s:e] += y[:e - s]
fxbus *= .36
mix = np.nan_to_num(V + music + fxbus)
mix = np.tanh(mix * 1.1) / 1.1
st = np.stack([mix, mix], 1)
# slight stereo width for music/fx
st[:, 0] += (music * .15 + fxbus * .05); st[:, 1] -= (music * .15 + fxbus * .05) * 0
sf.write('out/mix_raw.wav', st, SR)
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', 'out/mix_raw.wav', '-af', 'loudnorm=I=-14:TP=-1.0:LRA=11', '-ar', '48000', 'out/soundtrack.wav'], check=True)
r = lambda x: 20*np.log10(np.sqrt(np.mean(x**2))+1e-9)
print('ok  rms dB voice %.1f music %.1f fx %.1f' % (r(V), r(music), r(fxbus)))
