"""Cut a vertical Short / Reel from an episode script: pick shots, add a hook, render 9:16.

usage: python3 scripts/make_short.py episodes/<ep>/script.json <name> "<hook>" 0,1,8,9 [--outro "line"]
→ episodes/<ep>-<name>/script.json (vertical: true). Then tts.py / audio.py / render.mjs as usual.
Lines are reused word for word, so the voice comes from the TTS cache.
"""
import json, sys, pathlib, copy

src, name, hook, picks = sys.argv[1], sys.argv[2], sys.argv[3], [int(x) for x in sys.argv[4].split(',')]
outro = sys.argv[sys.argv.index('--outro') + 1] if '--outro' in sys.argv else 'The full story is on Small Catastrophes.'
ep = json.loads(pathlib.Path(src).read_text()); shots = []
for k, n in enumerate(picks):
    sh = copy.deepcopy(ep['shots'][n])
    if sh.get('brand') or sh['set'] == 'endcard': continue
    for key in ('fadeIn', 'fadeOut'): sh.pop(key, None)
    if k == 0: sh.pop('transition', None)
    shots.append(sh)
shots[-1]['lines'] = shots[-1].get('lines', []) + [{'text': outro}]
total = 0
out = {k: v for k, v in ep.items() if k not in ('shots', 'plan')} | {'title': hook, 'hook': hook, 'vertical': True, 'source_episode': pathlib.Path(src).parent.name, 'source_shots': picks, 'shots': shots}
d = pathlib.Path(src).parent.parent / f'{pathlib.Path(src).parent.name}-{name}'; d.mkdir(exist_ok=True)
(d / 'script.json').write_text(json.dumps(out, indent=1, ensure_ascii=False))
print(d / 'script.json', len(shots), 'shots')
