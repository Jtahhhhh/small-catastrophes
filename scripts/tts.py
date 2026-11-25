"""Narration: one Kokoro call per script line, so every line has an exact start/end time.
Writes build/<episode>/narration.wav and build/<episode>/timeline.json for the renderer.

usage: python3 scripts/tts.py episodes/demo-day1/script.json
"""
import json, sys, pathlib
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

ROOT = pathlib.Path(__file__).resolve().parent.parent
LEAD, GAP, TAIL = 0.4, 0.35, 1.2          # seconds: before first line, between lines, after the last shot

def main(script_path):
    script = json.loads(pathlib.Path(script_path).read_text())
    ep = pathlib.Path(script_path).parent.name
    out = ROOT / 'build' / ep; out.mkdir(parents=True, exist_ok=True)
    fps = script.get('fps', 24)
    kok = Kokoro(str(ROOT / 'models/kokoro-v1.0.int8.onnx'), str(ROOT / 'models/voices-v1.0.bin'))
    voice, speed = script.get('voice', 'bm_george'), script.get('speed', 0.95)
    lang = 'en-gb' if voice.startswith('b') else 'en-us'
    sr, pieces, t, scenes = 24000, [], 0.0, []
    shots = script.get('shots') or script['scenes']
    for n, sc in enumerate(shots):
        s_start = t; lines = []
        lead = sc.get('lead', LEAD if n == 0 else 0.15)
        pieces.append(np.zeros(int(lead * sr))); t += lead
        for ln in sc['lines']:
            audio, sr = kok.create(ln['text'], voice=voice, speed=speed, lang=lang)
            d = len(audio) / sr
            lines.append({**ln, 'start': round(t, 3), 'end': round(t + d, 3)})
            pieces += [audio, np.zeros(int(GAP * sr))]; t += d + GAP
        hold = sc.get('hold', TAIL if n == len(shots) - 1 else 0.25)
        pieces.append(np.zeros(int(hold * sr))); t += hold
        scenes.append({k: v for k, v in sc.items() if k != 'lines'} | {'lines': lines, 'start': round(s_start, 3), 'end': round(t, 3)})
    wav = np.concatenate(pieces).astype(np.float32)
    sf.write(out / 'narration.wav', wav, sr)
    hop = sr // fps
    amps = np.array([np.sqrt(np.mean(wav[i:i + hop] ** 2)) for i in range(0, len(wav), hop)])
    amps = np.clip(amps / (amps.max() + 1e-9) * 1.6, 0, 1); amps[amps < 0.12] = 0
    tl = {'title': script.get('title', ep), 'fps': fps, 'size': script.get('size', [1920, 1080]),
          'duration': round(t, 3), 'shots': scenes, 'amps': [round(float(a), 3) for a in amps]}
    (out / 'timeline.json').write_text(json.dumps(tl))
    print(f'{ep}: {t:.1f}s narration, {sum(len(s["lines"]) for s in scenes)} lines, {len(scenes)} shots')

if __name__ == '__main__':
    main(sys.argv[1])
