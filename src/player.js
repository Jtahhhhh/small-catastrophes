// Frame player: turns a timeline (from scripts/tts.py) into frames. Lines boil at 12 fps.
import { PAL, BOIL, resetParts, shape, handText } from './ink.js';
import { MORTIMER, TALLY, POSE, drawCast } from './cast.js';
import { titleText } from './brand.js';
import { SETS, renderSet } from './sets.js';

let TL = null, W = 1920, H = 1080, FPS = 24; const SETCACHE = {};
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const ease = t => { t = Math.min(Math.max(t, 0), 1); return t * t * (3 - 2 * t); };

function card(ctx, x, y, w, h, big, small, k) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x + w / 2, y + h / 2);
  const s = 0.6 + 0.4 * ease(k / 0.6); ctx.scale(s, s); ctx.rotate(-0.04); ctx.globalAlpha = Math.min(1, k * 3);
  shape(ctx, [[-w / 2, -h / 2], [w / 2, -h / 2 + 6], [w / 2 - 4, h / 2], [-w / 2 + 4, h / 2 - 4]], { fill: PAL.cream, outline: 6, jit: 3 });
  handText(ctx, big, 0, -h * 0.12, { size: h * 0.42, color: PAL.red });
  if (small) handText(ctx, small, 0, h * 0.28, { size: Math.min(h * 0.13, w * 0.85 / (small.length * 0.5)), color: PAL.ink, weight: 'normal' });
  ctx.restore();
}

function chunks(t) { const out = []; let cur = ''; for (const w of t.split(' ')) { if (cur && (cur.length + w.length > 30 || /[.?!,]$/.test(cur))) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) out.push(cur); return out; }
function captionFor(line, t) {   // spread a line's chunks over its own spoken time
  const cs = chunks(line.text), wt = cs.map(c => c.length + (/[.?!]$/.test(c) ? 6 : 0)); const tot = wt.reduce((a, b) => a + b, 0);
  let acc = 0; for (let i = 0; i < cs.length; i++) { acc += wt[i]; if (t <= line.start + (line.end - line.start) * acc / tot) return cs[i]; }
  return cs[cs.length - 1];
}

window.setup = (timeline) => { TL = timeline; [W, H] = TL.size; FPS = TL.fps; return Math.round(TL.duration * FPS); };

window.frame = (i) => {
  const t = i / FPS, boil = Math.floor(i / 2) % 3;
  const sc = TL.scenes.find(s => t >= s.start && t < s.end) || TL.scenes[TL.scenes.length - 1];
  const set = SETS[sc.set]; SETCACHE[sc.set] ||= renderSet(sc.set, W, H);
  const lt = t - sc.start;
  const scene = cv(W, H), ctx = scene.getContext('2d');
  ctx.drawImage(SETCACHE[sc.set][boil], 0, 0);
  BOIL.seed = 10 + boil; resetParts();
  const line = sc.lines.find(l => t >= l.start && t < l.end + 0.35);
  const a = TL.amps[Math.min(i, TL.amps.length - 1)] || 0;
  // hero
  const [hx, hy, hs] = set.anchors.hero;
  const gl = sc.lines.find(l => l.gesture === 'raise');
  const gest = gl ? ease((t - gl.start) / 0.5) * (1 - ease((t - gl.end) / 0.5)) : 0;
  POSE.mouth = a; POSE.blink = (t % 3.2) < 0.12 ? 1 : 0; POSE.look = Math.sin(t * 0.7) * 0.6;
  drawCast(ctx, MORTIMER, hx, hy, hs, { rot: { head: Math.sin(t * 1.9) * 0.04 + a * 0.05, arm_front: -0.9 * gest, arm_back: Math.sin(t * 1.3) * 0.05 } });
  POSE.mouth = 0; POSE.blink = 0; POSE.look = 0;
  // crow
  const [cx, cy, cs] = set.anchors.crow; const peck = Math.max(0, Math.sin(t * 2.4)) ** 6;
  drawCast(ctx, TALLY, cx, cy + Math.sin(t * 5) * 2, cs, { rot: { head: 0.35 * peck } });
  // cards: each shows from its line's start until the next card starts (or scene end)
  const cards = sc.lines.filter(l => l.card);
  cards.forEach((l, k) => {
    const until = k + 1 < cards.length ? cards[k + 1].start : sc.end; if (t > until + 0.3) return;
    const fade = t > until ? Math.max(0, 1 - (t - until) * 3) : 1;
    const [px, py] = set.anchors.card; card(ctx, px, py, 500, 280, l.card.big, l.card.small, (t - l.start) * fade);
  });
  if (sc.stamp) { shape(ctx, [[60, 50], [430, 40], [436, 150], [66, 160]], { fill: PAL.cream, outline: 7, jit: 4 }); handText(ctx, sc.stamp, 248, 100, { size: 72, color: PAL.red }); }
  // camera push toward the hero
  const out = cv(W, H), o = out.getContext('2d'); const z = 1 + (sc.camera?.push ?? 0.06) * ease(lt / (sc.end - sc.start));
  o.translate(hx, hy - 285); o.scale(z, z); o.translate(-hx, -(hy - 285)); o.drawImage(scene, 0, 0); o.setTransform(1, 0, 0, 1, 0, 0);
  if (line) { const c = captionFor(line, t); titleText(o, c.toUpperCase(), W / 2, H - 70, 54, { seed: 21 + c.length }); }
  return out.toDataURL('image/jpeg', 0.92);
};
window.ready = true;
