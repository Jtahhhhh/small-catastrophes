"""Music bed + sound effects + final mix, all synthesised here (no third-party audio, no licence questions).

usage: python3 scripts/audio.py episodes/<name>/script.json      → build/<name>/mix.wav
render.mjs uses mix.wav instead of narration.wav when it exists; `node scripts/render.mjs <ep> --remux` swaps
the sound on a finished video without rendering a frame.

Music: a slow music-box waltz in D minor (3/4) over a bowed drone and soft pizzicato bass, tiled to the episode and
ducked under the narration. SFX are placed from timeline events: transitions (tear / ink / iris), stamps, cards,
chart bars, headlines, the intro sting.
"""
import json, sys, pathlib
import numpy as np, soundfile as sf
from scipy.signal import resample_poly, butter, sosfilt

SR = 48000
ROOT = pathlib.Path(__file__).resolve().parent.parent
rng = np.random.default_rng(7)
midi = lambda m: 440.0 * 2 ** ((m - 69) / 12)


def env(n, a=0.005, d=1.0):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)


def bell(f, dur, amp=1.0):          # music-box tine: inharmonic partials, quick decay
    n = int(dur * SR); t = np.arange(n) / SR
    y = sum(w * np.sin(2 * np.pi * f * p * t) * np.exp(-t / (dd * dur)) for p, w, dd in [(1, 1, 0.5), (2.76, 0.35, 0.18), (5.4, 0.12, 0.08), (2, 0.2, 0.3)])
    return amp * y * np.minimum(1, t / 0.002)


def pluck(f, dur, amp=1.0):         # Karplus–Strong string
    n = int(dur * SR); p = max(2, int(SR / f)); buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(n): out[i] = buf[i % p]; buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * 0.996
    return amp * out


def drone(f, dur, amp=1.0):         # soft bowed tone: detuned saws, low-passed, slow swell
    n = int(dur * SR); t = np.arange(n) / SR
    y = sum(((t * f * d) % 1 * 2 - 1) for d in (1, 1.003, 0.997)) / 3
    y = sosfilt(butter(2, 700, 'low', fs=SR, output='sos'), y)
    sw = np.minimum(1, t / 1.2) * np.minimum(1, (dur - t) / 1.2)
    return amp * y * sw * (0.8 + 0.2 * np.sin(2 * np.pi * 0.25 * t))


def music_loop():
    bpm, beats = 96, 3; beat = 60 / bpm; bar = beat * beats
    chords = [(62, [62, 65, 69]), (58, [58, 62, 65]), (55, [55, 58, 62]), (57, [57, 61, 64])]   # Dm Bb Gm A
    bars = 16; n = int(bars * bar * SR) + SR * 3; y = np.zeros(n)
    def add(sig, t, g=1.0):
        i = int(t * SR); y[i:i + len(sig)] += g * sig[:max(0, n - i)]
    mel_rng = np.random.default_rng(11)
    for b in range(bars):
        root, ch = chords[(b // 2) % 4]; t0 = b * bar
        if b % 2 == 0: add(drone(midi(root - 24), bar * 2 + 0.6), t0, 0.22)
        add(pluck(midi(root - 12), 1.2), t0, 0.35)                                   # bass on 1
        for k in (1, 2): add(pluck(midi(ch[k] - 12), 0.6), t0 + k * beat, 0.12)       # soft off-beats
        notes = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24]
        for k in range(beats):                                                        # melody: chord tones, mostly stepwise
            if mel_rng.random() < 0.85:
                m = notes[mel_rng.integers(0, 4)] if k == 0 else notes[mel_rng.integers(0, 3)] + (2 if mel_rng.random() < 0.2 else 0)
                add(bell(midi(m), 1.6), t0 + k * beat + (beat / 2 if mel_rng.random() < 0.15 else 0), 0.16)
    y = y[:int(bars * bar * SR)]
    return y / (np.abs(y).max() + 1e-9)


# ---------- sound effects ----------
def noise(dur): return rng.uniform(-1, 1, int(dur * SR))
def band(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def lowp(x, f): return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)

def sfx_tear(dur=0.65):
    x = band(noise(dur), 1200, 7000); t = np.arange(len(x)) / SR
    crackle = (rng.random(len(x)) < 0.02).astype(float); crackle = lowp(crackle, 3000) * 6
    return (x * (0.6 + crackle)) * np.minimum(1, t / 0.03) * np.minimum(1, (dur - t) / 0.2) * 0.5

def sfx_ink():
    t = np.arange(int(0.5 * SR)) / SR
    thud = np.sin(2 * np.pi * (90 - 50 * t) * t) * np.exp(-t / 0.09)
    wet = lowp(noise(0.5), 1800) * np.exp(-t / 0.12) * 0.5
    return (thud + wet) * 0.7

def sfx_whoosh(dur=0.5, up=True):
    x = noise(dur); t = np.arange(len(x)) / SR; out = np.zeros_like(x); seg = SR // 50
    for i in range(0, len(x), seg):           # moving band-pass sweep
        f = 300 + (2500 if up else 2500) * ((i / len(x)) if up else (1 - i / len(x)))
        out[i:i + seg] = band(x[max(0, i - seg):i + seg], f * 0.6, f * 1.4)[-len(x[i:i + seg]):]
    return out * np.sin(np.pi * t / dur) * 0.45

def sfx_stamp():
    t = np.arange(int(0.45 * SR)) / SR
    return (np.sin(2 * np.pi * 70 * t) * np.exp(-t / 0.08) + lowp(noise(0.45), 2500) * np.exp(-t / 0.02) * 0.8) * 0.9

def sfx_pop():
    t = np.arange(int(0.25 * SR)) / SR
    return np.sin(2 * np.pi * (520 + 400 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.05) * 0.35 + bell(midi(86), 0.25, 0.15)[:len(t)]

def sfx_tick():
    t = np.arange(int(0.08 * SR)) / SR
    return band(noise(0.08), 1500, 5000) * np.exp(-t / 0.012) * 0.5

def sfx_chime():
    out = np.zeros(int(2.2 * SR))
    for k, m in enumerate([74, 77, 81, 86]): s = bell(midi(m), 1.8, 0.3); i = int(k * 0.14 * SR); out[i:i + len(s)] += s[:len(out) - i]
    return out


def main(path):
    p = pathlib.Path(path); build = ROOT / 'build' / p.parent.name
    tl = json.loads((build / 'timeline.json').read_text())
    nar, sr = sf.read(build / 'narration.wav', dtype='float32')
    nar = resample_poly(nar, SR, sr).astype(np.float64); N = len(nar)

    # music: loop tiled with 2 s crossfades, a short rest under the intro sting, ducked under speech
    lp = ROOT / 'build' / 'music_loop_v1.wav'          # the loop is the slow part: synthesise once, reuse
    if lp.exists(): loop = sf.read(lp)[0]
    else: loop = music_loop(); sf.write(lp, loop.astype(np.float32), SR)
    L = len(loop); fade = 2 * SR; mus = np.zeros(N + L)
    pos = 0; w = np.ones(L); w[:fade] = np.linspace(0, 1, fade); w[-fade:] = np.linspace(1, 0, fade)
    while pos < N: mus[pos:pos + L] += loop * w; pos += L - fade
    mus = mus[:N]
    speech = np.abs(nar); k = int(0.25 * SR)
    envl = np.convolve(speech, np.ones(k) / k, 'same'); envl = np.clip(envl / (envl.max() * 0.25 + 1e-9), 0, 1)
    envl = np.convolve(envl, np.ones(SR // 2) / (SR // 2), 'same')          # slow release
    mus *= 0.16 * (1 - 0.55 * envl)

    fx = np.zeros(N + 3 * SR)
    def put(sig, t, g=1.0):
        i = int(max(0, t) * SR); fx[i:i + len(sig)] += g * sig[:len(fx) - i]
    events = []
    shots = tl['shots']
    for n, sh in enumerate(shots):
        s0 = sh['start']; tr = sh.get('transition')
        if tr == 'tear': put(sfx_tear(), s0); events.append('tear')
        if tr == 'ink': put(sfx_ink(), s0 - 0.3); events.append('ink')
        if tr == 'iris': put(sfx_whoosh(0.5, False), s0 - 0.45); events.append('iris')
        if sh.get('stamp'): put(sfx_stamp(), s0 + 0.15); events.append('stamp')
        if sh.get('headline'): put(sfx_whoosh(0.9, True), s0, 0.9); put(sfx_stamp(), s0 + 0.85, 0.6); events.append('headline')
        if sh.get('brand') == 'intro': put(sfx_whoosh(0.5, True), s0, 0.8); put(sfx_stamp(), s0 + 0.55, 0.8); put(sfx_chime(), s0 + 0.9, 0.8); events.append('intro')
        if sh.get('chart'):
            for i in range(len(sh['chart']['bars'])):
                for j in range(4): put(sfx_tick(), s0 + i * 0.25 + j * 0.2, 0.6)
            events.append('chart')
        if sh.get('panels') and sh.get('reveal'):
            for k, pn in enumerate(sh['panels']): put(sfx_pop(), s0 + pn.get('at', 0), 0.8)
        for ln in sh['lines']:
            if ln.get('card'): put(sfx_pop(), ln['start']); events.append('card')
        if sh.get('insert'): put(sfx_tick(), s0 + 0.05, 0.8)
    fx = fx[:N]

    mix = nar + mus + fx * 0.5
    mix /= max(1.0, np.abs(mix).max() / 0.98)
    sf.write(build / 'mix.wav', mix.astype(np.float32), SR)
    from collections import Counter
    print(f'{p.parent.name}: mix.wav {N / SR:.1f}s — sfx ' + ', '.join(f'{k}×{v}' for k, v in Counter(events).most_common()))


if __name__ == '__main__':
    main(sys.argv[1])
