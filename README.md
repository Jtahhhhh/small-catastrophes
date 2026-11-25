# Small Catastrophes

Video pipeline for the **Small Catastrophes** channel: "what happens, hour by hour, when everyday things break."
A script in JSON goes in; a hand-drawn gothic explainer video comes out.

![style sheet](assets/style/style_sheet_v1.jpg)

## How it works

1. `episodes/<name>/script.json` — scenes, lines of narration, data cards and their sources.
2. `scripts/tts.py` — reads every line with the Kokoro voice **bm_george** (one call per line, so each line has an exact start and end time) and writes `build/<name>/narration.wav` + `timeline.json`.
3. `scripts/render.mjs` — opens `src/player.html` in headless Chrome, draws every frame and pipes them to ffmpeg → `build/<name>/video.mp4`.

Drawing is all code: wobbly ink lines (perfect-freehand), hatching (Rough.js), aged paper, characters as paper cut-outs with pivots. Lines "boil" at 12 fps.

## Setup

Needs Node 18+, Python 3.10+, ffmpeg and Google Chrome.

```bash
./scripts/setup.sh                       # npm + pip deps, downloads the Kokoro model (~120 MB)
```

## Make a video

```bash
python3 scripts/tts.py episodes/demo-day1/script.json
node scripts/render.mjs episodes/demo-day1 --frames 40,250   # stills to review first
node scripts/render.mjs episodes/demo-day1                   # full video
```

Render speed on 2 CPU cores: ~1.6 s of render per 1 s of video (19 s demo in 31 s).

## Shot list format (v0.2)

`episodes/v02-test/script.json` is the reference. Each shot:

| Key | Values |
|---|---|
| `set` | `street`, `supermarket`, `desk` (chart inserts) |
| `camera` | `size`: wide / medium / close; `on`: actor id or `[x, y]`; `move`: push / pull / pan-left / pan-right / static |
| `actors` | `who`: mortimer / gristle / tally / `person:<n>` (generated townsfolk); `at`, optional `to` + `walk: [start, dur]`; `actions: [{do, at, dur}]` with startle, point-left, point-right, shrug, raise, nod, peck; `layer: "behind"` puts them behind the set's front layer (e.g. behind the counter) |
| `transition` | `ink`, `iris`, `tear` (or a plain cut) ; `fadeIn` / `fadeOut` |
| `chart` | `{title, subtitle, bars: [[label, value]], unit, decimals, highlight, source}` — bars draw themselves in |
| `vo` | `true` = narrator off-screen (nobody's mouth moves) |
| `stamp` | time stamp card, e.g. `HOUR 8` |

The old `scenes` format (v0.1) still works.

## Script format (v0.1)

```json
{
  "voice": "bm_george", "speed": 0.95, "fps": 24, "size": [1920, 1080],
  "scenes": [{
    "set": "street", "stamp": "DAY 1", "camera": { "push": 0.07 },
    "lines": [
      { "text": "Only sixteen percent of Americans prefer to pay in cash.",
        "card": { "big": "16%", "small": "prefer to pay in cash" },
        "source": "Federal Reserve, Diary of Consumer Payment Choice (2026)" }
    ]
  }]
}
```

- `card` shows from its line until the next card. `gesture: "raise"` makes Mortimer lift his ledger during that line.
- Every number on screen needs a `source`.

## Layout

| Path | What |
|---|---|
| `src/ink.js` | drawing toolkit: ink lines, hatching, paper, hand lettering |
| `src/cast.js` | Mortimer Penny, Mrs. Gristle, Tally the crow, props (parts + pivots) |
| `src/sets.js` | backgrounds and where characters stand in them |
| `src/player.js` | turns a timeline into frames |
| `src/brand.js` | logo, banner, Facebook cover, title lettering |
| `assets/` | approved brand files and style sheet |
| `docs/STYLE.md` | locked style rules |

## Licenses

Code deps: perfect-freehand, Rough.js, puppeteer-core (MIT). Voice model: Kokoro-82M (Apache-2.0). Font: DejaVu Serif (temporary — replace with a commercially licensed hand-lettered font).
Characters and style are original; inspired by gothic hand-drawn games but no Klei/Don't Starve assets, names or characters are used.
