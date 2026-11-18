# Mixes the ElevenLabs voiceover with synthesized SFX (from out/sfx_cues.json) and a soft music bed.
import sys, json, subprocess, wave, numpy as np
D = sys.argv[1]
SR = 48000
rng = np.random.default_rng(7)

raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{D}/assets/voiceover.mp3', '-ac', '2', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True).stdout
vo = np.frombuffer(raw, np.int16).astype(np.float32).reshape(-1, 2) / 32768
cues = json.load(open(f'{D}/out/sfx_cues.json'))
DUR = 106.6
N = int(DUR * SR)
t_ = lambda d: np.arange(int(d * SR)) / SR

def lp(x, a):  # one-pole lowpass
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s += a * (x[i] - s); y[i] = s
    return y

def bp_noise(d, f0, f1, q=0.15):
    n = rng.normal(0, 1, int(d * SR)); t = t_(d)
    f = f0 + (f1 - f0) * (t / d)
    # cheap sweep: modulate lowpass coefficient over time in blocks
    out = np.zeros_like(n); s = 0.0; s2 = 0.0
    a = 1 - np.exp(-2 * np.pi * f / SR)
    for i in range(len(n)):
        s += a[i] * (n[i] - s); s2 += a[i] * (s - s2)
        out[i] = s - s2 * (1 - q)
    return out

def env(d, a=.01, r=None):
    t = t_(d); e = np.minimum(1, t / a)
    return e * (np.exp(-t / r) if r else np.sin(np.pi * t / d) ** 1.5)

def norm(x, g): return x / (np.max(np.abs(x)) + 1e-9) * g

S = {}
d = .5; S['whoosh'] = norm(bp_noise(d, 300, 2600) * np.sin(np.pi * t_(d) / d) ** 2, .5)
d = .28; S['swish'] = norm(bp_noise(d, 1500, 5000) * np.sin(np.pi * t_(d) / d) ** 2, .35)
d = .12; t = t_(d); f = 900 * np.exp(-t * 18) + 380; S['pop'] = norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 32), .45)
d = .05; t = t_(d); S['click'] = norm(rng.normal(0, 1, len(t)) * np.exp(-t * 300) * .6 + np.sin(2 * np.pi * 2200 * t) * np.exp(-t * 120), .4)
d = .04; t = t_(d); S['key'] = norm(lp(rng.normal(0, 1, len(t)), .35) * np.exp(-t * 180), .16)
d = .06; t = t_(d); S['tick'] = norm(np.sin(2 * np.pi * 1700 * t) * np.exp(-t * 90), .3)
d = 1.6; t = t_(d); S['ding'] = norm(sum(a * np.sin(2 * np.pi * 1318.5 * m * t) * np.exp(-t * k) for a, m, k in [(1, 1, 3), (.5, 2.0, 5), (.25, 3.0, 8), (.3, 1.5, 4)]) * np.minimum(1, t / .003), .32)
d = 1.4; t = t_(d); sp = np.zeros(len(t))
for i, f in enumerate([2093, 2637, 3136, 3951, 4186]):
    o = int(i * .06 * SR); tt = t[:len(t) - o]; sp[o:] += np.sin(2 * np.pi * f * tt) * np.exp(-tt * 6) * (1 - i * .12)
S['sparkle'] = norm(sp, .22)
d = .35; t = t_(d); f = 110 * np.exp(-t * 8) + 45
S['thud'] = norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11) + lp(rng.normal(0, 1, len(t)), .08) * np.exp(-t * 25) * .5, .7)
d = .3; t = t_(d); S['buzz'] = norm(np.tanh(3 * np.sin(2 * np.pi * 140 * t)) * env(d, .01) * .7, .2)
d = .25; t = t_(d); S['coin'] = norm(np.where(t < .07, np.sin(2 * np.pi * 1976 * t), np.sin(2 * np.pi * 2637 * t)) * np.exp(-t * 14), .18)
d = 2.1; t = t_(d); rz = bp_noise(d, 200, 6000) * (t / d) ** 2 + np.sin(2 * np.pi * np.cumsum(220 + 660 * (t / d) ** 2) / SR) * (t / d) ** 2 * .4
S['riser'] = norm(rz * np.minimum(1, (d - t) / .05), .35)
d = .5; t = t_(d); S['riser2'] = norm(bp_noise(d, 400, 7000) * (t / d) ** 2 * np.minimum(1, (d - t) / .03), .35)

sfx = np.zeros(N)
for c in cues:
    s = S.get(c['n']); i = int(c['t'] * SR)
    if s is None or i >= N: continue
    e = min(N, i + len(s)); sfx[i:e] += s[:e - i] * c['g']

# music bed: warm pad + soft plucks, Dmaj7 - Bm7 - Gmaj7 - A6 at 96 bpm
BPM = 96; beat = 60 / BPM; bar = beat * 4
chords = [[62, 66, 69, 73], [59, 62, 66, 69], [55, 59, 62, 66], [57, 61, 64, 66]]
mf = lambda m: 440 * 2 ** ((m - 69) / 12)
T = np.arange(N) / SR
pad = np.zeros(N); pl = np.zeros(N)
nb = int(DUR / bar) + 1
for b in range(nb):
    ch = chords[b % 4]; s0 = int(b * bar * SR); L = int(bar * SR * 1.25)
    tt = np.arange(L) / SR; e = np.minimum(1, tt / .8) * np.minimum(1, np.maximum(0, (bar * 1.25 - tt) / .6))
    seg = sum(np.sin(2 * np.pi * mf(m - 12) * tt * (1 + dt)) for m in ch for dt in (-.002, .002)) * e
    seg += np.sin(2 * np.pi * mf(ch[0] - 24) * tt) * e * 1.2
    e2 = min(N, s0 + L); pad[s0:e2] += seg[:e2 - s0]
    for k in range(8):  # 8th-note arpeggio pluck
        s1 = s0 + int(k * beat / 2 * SR); m = ch[[0, 1, 2, 3, 2, 1, 3, 2][k]] + 12
        L2 = int(.6 * SR); t2 = np.arange(L2) / SR
        note = (np.sin(2 * np.pi * mf(m) * t2) + .3 * np.sin(4 * np.pi * mf(m) * t2)) * np.exp(-t2 * 7) * np.minimum(1, t2 / .004)
        e3 = min(N, s1 + L2)
        if s1 < N: pl[s1:e3] += note[:e3 - s1] * (.8 if k % 2 == 0 else .55)
pad = lp(pad, .06); pad /= np.max(np.abs(pad)); pl /= np.max(np.abs(pl))
music = pad * .55 + pl * .45
# duck under voice
vm = np.abs(vo).mean(1); vmN = np.zeros(N); vmN[:min(N, len(vm))] = vm[:N]
blk = 2400; venv = np.repeat([vmN[i:i + blk].mean() for i in range(0, N, blk)], blk)[:N]
venv = np.convolve(venv, np.ones(9600) / 9600, 'same')
duck = 1 - .45 * np.clip(venv / .05, 0, 1)
mg = .085 * duck * np.minimum(1, T / 1.5) * np.clip((DUR - T) / 2.5, 0, 1)
music *= mg

out = np.zeros((N, 2))
out[:min(N, len(vo))] += vo[:N] * 1.0
out[:, 0] += sfx * .55 + music; out[:, 1] += sfx * .55 + music
pk = np.max(np.abs(out))
if pk > .97: out *= .97 / pk
w = wave.open(f'{D}/out/final_audio.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((out * 32767).astype(np.int16).tobytes()); w.close()
print('audio ok', len(cues), 'cues, peak', round(float(pk), 3))
