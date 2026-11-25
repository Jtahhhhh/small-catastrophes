"""Script lint: catches the "street → board → shop → repeat" problem before any voice or render time is spent.

usage: python3 scripts/lint.py episodes/<name>/script.json
Durations come from build/<name>/timeline.json when it exists, otherwise from a words-per-second estimate.
Exit code 1 if any ERROR.
"""
import json, sys, pathlib, re, collections

WPS, GAP = 2.45, 0.35                     # bm_george at speed 0.95 ≈ 2.45 words/s
MAX_SAME_RUN = 2                          # same location at most 2 shots in a row
MAX_SAME_SECONDS = 30                     # …and at most 30 s in a row
MAX_BOARD_SHARE = 0.25                    # charts / maps / board shots ≤ 25 % of runtime
MAX_SHOT = 12.5                           # seconds, warning
MIN_LOCATIONS = 6
NUMBERY = re.compile(r"\b(percent|million|billion|thousand|hundred|half|one in|two out of|three out of|\d)", re.I)


def kind(sh):
    if sh.get('panels'): return 'panels'
    if sh.get('insert'): return 'insert'
    if sh.get('chart') or sh.get('map') or sh['set'] == 'desk': return 'board'
    return sh['set']


def place(sh):    # location identity: set + locale (an Indian street is not the same place as the U.S. street)
    if sh.get('panels'): return 'panels'
    return f"{sh['set']}/{(sh.get('variant') or {}).get('locale', 'us')}"


def main(path):
    p = pathlib.Path(path); script = json.loads(p.read_text()); shots = script['shots']
    tl = pathlib.Path(__file__).resolve().parent.parent / 'build' / p.parent.name / 'timeline.json'
    if tl.exists() and len(json.loads(tl.read_text())['shots']) == len(shots):
        durs = [s['end'] - s['start'] for s in json.loads(tl.read_text())['shots']]; src = 'timeline'
    else:
        durs = [sum(len(l['text'].split()) / WPS + GAP for l in s['lines']) + 0.4 for s in shots]; src = 'estimate'
    total = sum(durs); errs, warns = [], []

    if not script.get('plan'): warns.append('no "plan": write the location plan (segment → location) before the lines')
    run, run_s = 1, durs[0]
    for n in range(1, len(shots)):
        if place(shots[n]) == place(shots[n - 1]) and kind(shots[n]) != 'board': run += 1; run_s += durs[n]
        else: run, run_s = 1, durs[n]
        if run > MAX_SAME_RUN: errs.append(f'shot {n}: {place(shots[n])} {run} shots in a row')
        if run_s > MAX_SAME_SECONDS: errs.append(f'shot {n}: {place(shots[n])} for {run_s:.0f}s in a row')
    board = sum(d for s, d in zip(shots, durs) if kind(s) == 'board')
    if board / total > MAX_BOARD_SHARE: errs.append(f'board/chart shots are {board / total:.0%} of runtime (max {MAX_BOARD_SHARE:.0%})')
    for n, (s, d) in enumerate(zip(shots, durs)):
        if d > MAX_SHOT: warns.append(f'shot {n}: {d:.1f}s long ({s["set"]}) — split it or add a move')
        has_src = s.get('source') or (s.get('chart') or {}).get('source') or (s.get('map') or {}).get('source') or (s.get('headline') or {}).get('source')
        for l in s['lines']:
            if NUMBERY.search(l['text']) and not (l.get('source') or has_src): warns.append(f'shot {n}: number without source: "{l["text"][:60]}"')
    places = collections.Counter(place(s) for s in shots if kind(s) not in ('board', 'insert', 'panels'))
    if len(places) < MIN_LOCATIONS: errs.append(f'only {len(places)} locations (min {MIN_LOCATIONS})')

    share = collections.Counter()
    for s, d in zip(shots, durs): share[kind(s)] += d
    print(f'{p.parent.name}: {len(shots)} shots, {total / 60:.1f} min ({src}), {len(places)} locations')
    print('  time by kind: ' + ', '.join(f'{k} {v / total:.0%}' for k, v in share.most_common()))
    for e in errs: print('  ERROR', e)
    for w in warns: print('  warn ', w)
    return 1 if errs else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1]))
