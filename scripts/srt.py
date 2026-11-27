"""SRT subtitles from a built timeline: one cue per narration line, wrapped to two lines of ~42 characters.
usage: python3 scripts/srt.py build/<ep>/timeline.json out.srt"""
import json, sys, textwrap

def ts(s):
    ms = int(round(s * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); sec, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{sec:02},{ms:03}"

t = json.load(open(sys.argv[1]))
cues = []
for sh in t['shots']:
    for ln in sh.get('lines', []):
        if ln.get('text') and 'start' in ln:
            cues.append((ln['start'], ln['end'] + 0.35, '\n'.join(textwrap.wrap(ln['text'], 42))))
with open(sys.argv[2], 'w') as f:
    for i, (a, b, txt) in enumerate(cues, 1):
        if i < len(cues): b = min(b, cues[i][0] - 0.05)
        f.write(f"{i}\n{ts(a)} --> {ts(b)}\n{txt}\n\n")
print(f"{len(cues)} cues → {sys.argv[2]}")
