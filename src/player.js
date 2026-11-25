// v0.2 player: shot list → frames. Each shot = set + camera size/move + actors with walks/actions
// + optional chart + transition. Tweens run on a paused GSAP timeline that is seeked per frame.
import { gsap } from '../node_modules/gsap/gsap-core.js';
import rough from '../node_modules/roughjs/bundled/rough.esm.js';
import { PAL, BOIL, resetParts, paper, ink, shape, handText, ellipse } from './ink.js';
import { MORTIMER, GRISTLE, TALLY, POSE, drawCast } from './cast.js';
import { makePerson } from './people.js';
import { ACTIONS, walkPose, idlePose, mergePoses } from './actions.js';
import { titleText } from './brand.js';
import { SETS } from './sets.js';

let TL, W, H, FPS; const BGCACHE = {}, LASTFRAME = {};
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const ease = t => { t = Math.min(Math.max(t, 0), 1); return t * t * (3 - 2 * t); };
const RIGS = { mortimer: MORTIMER, gristle: GRISTLE, tally: TALLY };
const rigFor = who => RIGS[who] || makePerson(Number(String(who).split(':')[1] || 1));
const HEAD_H = { mortimer: 480, gristle: 320, tally: 110 };          // height of the face above the feet (world px at scale 1)

// ---------- camera ----------
const SIZES = { wide: 1, medium: 1.65, close: 2.6 };
function baseCamera(sh) {
  const cam = sh.camera || {}; const z = SIZES[cam.size || 'wide'];
  let c = [W / 2, H / 2];
  if (Array.isArray(cam.on)) c = cam.on;
  else if (cam.on) { const a = sh.actors.find(x => x.id === cam.on); const s = a.scale || 1;
    const hh = (HEAD_H[a.who] || 440) * s; c = [a.at[0], a.at[1] - (cam.size === 'close' ? hh * 0.92 : hh * 0.6)]; }
  // keep the frame inside a generous stage
  return { z, cx: c[0], cy: c[1] };
}
const applyCam = (ctx, cam) => ctx.setTransform(cam.z, 0, 0, cam.z, W / 2 - cam.cx * cam.z, H / 2 - cam.cy * cam.z);

function background(sh, boil) {
  const key = `${sh.index}:${boil}`; if (BGCACHE[key]) return BGCACHE[key];
  const set = SETS[sh.set]; const cam = baseCamera(sh); BOIL.seed = boil + 1; resetParts();
  const back = cv(W, H), b = back.getContext('2d'); paper(b, W, H, { base: set.paper, vignette: 0.7, seed: 11 });
  applyCam(b, cam); set.draw(b);
  let front = null; if (set.front) { front = cv(W, H); const f = front.getContext('2d'); applyCam(f, cam); resetParts(); set.front(f); }
  return (BGCACHE[key] = { back, front });
}

// ---------- timeline (positions) ----------
function buildTimeline() {
  const tl = gsap.timeline({ paused: true });
  for (const sh of TL.shots) for (const a of sh.actors) {
    a.pos = { x: a.at[0] }; a.dist = 0;
    if (a.to != null) {
      const [t0, dur] = a.walk || [0, sh.end - sh.start - 0.5];
      tl.to(a.pos, { x: a.to, duration: dur, ease: 'power1.inOut' }, sh.start + t0);
      a.walkWin = [sh.start + t0, sh.start + t0 + dur];
    }
  }
  return tl;
}
let GTL = null;

// ---------- chart insert ----------
function chart(ctx, spec, k) {
  const rc = rough.canvas(ctx.canvas);
  handText(ctx, spec.title, 960, 210, { size: 54 });
  if (spec.subtitle) handText(ctx, spec.subtitle, 960, 268, { size: 30, weight: 'normal' });
  const bars = spec.bars, n = bars.length, x0 = 420, x1 = 1500, base = 790, maxH = 420;
  const max = Math.max(...bars.map(b => b[1])) * 1.1, bw = (x1 - x0) / n * 0.55;
  bars.forEach(([label, v, col], i) => {
    const kk = ease((k - i * 0.25) / 0.9), bx = x0 + (i + 0.5) * (x1 - x0) / n - bw / 2, bh = maxH * v / max * kk;
    const hi = spec.highlight === i;
    if (bh > 2) rc.rectangle(bx, base - bh, bw, bh, { fill: col || (hi ? PAL.red : '#6b7f8c'), fillStyle: 'hachure', hachureGap: 9, fillWeight: 2.4,
      stroke: PAL.ink, strokeWidth: 4, roughness: 1.8, seed: 7 + i + BOIL.seed * 13 });
    handText(ctx, `${(v * kk).toFixed(spec.decimals || 0)}${spec.unit || ''}`, bx + bw / 2, base - bh - 34, { size: 46, color: hi ? PAL.red : PAL.ink });
    handText(ctx, label, bx + bw / 2, base + 40, { size: 32 });
  });
  ink(ctx, [[x0 - 40, base], [x1 + 40, base + 4]], { size: 5 });
  if (spec.source) handText(ctx, 'Source: ' + spec.source, 960, 880, { size: 22, weight: 'normal', color: '#5a4a3a' });
}

// ---------- one shot at time t ----------
function card(ctx, x, y, w, h, big, small, k) {
  if (k <= 0) return; ctx.save(); ctx.translate(x + w / 2, y + h / 2);
  const s = 0.6 + 0.4 * ease(k / 0.6); ctx.scale(s, s); ctx.rotate(-0.04); ctx.globalAlpha = Math.min(1, k * 3);
  shape(ctx, [[-w / 2, -h / 2], [w / 2, -h / 2 + 6], [w / 2 - 4, h / 2], [-w / 2 + 4, h / 2 - 4]], { fill: PAL.cream, outline: 6, jit: 3 });
  handText(ctx, big, 0, -h * 0.12, { size: h * 0.42, color: PAL.red });
  if (small) handText(ctx, small, 0, h * 0.28, { size: Math.min(h * 0.13, w * 0.85 / (small.length * 0.5)), color: PAL.ink, weight: 'normal' });
  ctx.restore();
}

function renderShot(sh, t, i) {
  const boil = Math.floor(i / 2) % 3, lt = t - sh.start, dur = sh.end - sh.start;
  const bg = background(sh, boil), cam = baseCamera(sh);
  const scene = cv(W, H), ctx = scene.getContext('2d');
  ctx.drawImage(bg.back, 0, 0);
  BOIL.seed = 10 + boil; resetParts(); applyCam(ctx, cam);
  const amp = TL.amps[Math.min(i, TL.amps.length - 1)] || 0;
  const speaker = sh.vo ? null : (sh.speaker || (sh.actors.some(a => a.id === 'mortimer') ? 'mortimer' : null));
  const order = [...sh.actors].sort((a, b) => (a.layer === 'behind' ? -1 : 0) - (b.layer === 'behind' ? -1 : 0) || a.at[1] - b.at[1]);
  let frontDrawn = !bg.front;
  for (const a of order) {
    if (!frontDrawn && a.layer !== 'behind') { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bg.front, 0, 0); applyCam(ctx, cam); frontDrawn = true; }
    const x = a.pos.x, prevX = a.prevX ?? x; const walking = a.walkWin && t >= a.walkWin[0] && t <= a.walkWin[1];
    const wAmt = walking ? Math.min(1, (t - a.walkWin[0]) / 0.25, (a.walkWin[1] - t) / 0.25) : 0;
    const dirLeft = a.to != null ? a.to < a.at[0] : a.face === 'left';
    const phase = Math.abs(x - a.at[0]) / 38;
    const acts = (a.actions || []).map(ac => { const at = sh.start + ac.at, d = ac.dur || 1.2;
      return t >= at && t <= at + d && ACTIONS[ac.do] ? ACTIONS[ac.do](t - at, d) : null; });
    const pose = mergePoses(idlePose(t, a.at[0] * 0.01), wAmt > 0 ? walkPose(phase, wAmt) : null, ...acts);
    if (a.id === speaker) { POSE.mouth = amp; pose.rot.head = (pose.rot.head || 0) + amp * 0.05; }
    POSE.blink = ((t + a.at[0] * 0.003) % 3.4) < 0.12 ? 1 : 0;
    const s = a.scale || 1;
    if (a.who !== 'tally') shape(ctx, ellipse(x, a.at[1], 95 * s, 18 * s, 14, 0.1, 300), { fill: 'rgba(34,28,22,0.22)', outline: 0 });
    drawCast(ctx, rigFor(a.who), x, a.at[1] + pose.dy * s, s, { rot: pose.rot, flip: a.flip ?? (dirLeft && a.who !== 'tally') });
    POSE.mouth = 0; POSE.blink = 0;
  }
  if (!frontDrawn) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bg.front, 0, 0); applyCam(ctx, cam); }
  if (sh.chart) chart(ctx, sh.chart, lt);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // camera move inside the shot (applied to the composed frame)
  const mv = (sh.camera || {}).move || 'push'; const k = ease(lt / dur);
  const out = cv(W, H), o = out.getContext('2d');
  let z = 1, dx = 0;
  if (mv === 'push') z = 1 + 0.08 * k; if (mv === 'pull') z = 1.08 - 0.08 * k;
  if (mv === 'pan-left') { z = 1.07; dx = 60 - 120 * k; } if (mv === 'pan-right') { z = 1.07; dx = -60 + 120 * k; }
  o.translate(W / 2 + dx, H / 2); o.scale(z, z); o.translate(-W / 2, -H / 2); o.drawImage(scene, 0, 0); o.setTransform(1, 0, 0, 1, 0, 0);
  // overlays in screen space
  BOIL.seed = 20 + boil; resetParts();
  if (!sh.chart) { const lines = sh.lines.filter(l => l.card); lines.forEach((l, n) => { const until = n + 1 < lines.length ? lines[n + 1].start : sh.end; if (t <= until) card(o, 1330, 90, 500, 280, l.card.big, l.card.small, t - l.start); }); }
  if (sh.stamp) { shape(o, [[60, 50], [430, 40], [436, 150], [66, 160]], { fill: PAL.cream, outline: 7, jit: 4 }); handText(o, sh.stamp, 248, 100, { size: 72, color: PAL.red }); }
  for (const a of sh.actors) a.prevX = a.pos.x;
  return out;
}

// ---------- transitions ----------
function inkBlob(o, k, boil) {
  if (k <= 0) return; BOIL.seed = 30 + boil; resetParts();
  const r = k * 1250; shape(o, ellipse(W / 2, H / 2, r * 1.2, r, 26, 0.18, 400 + boil), { fill: PAL.ink, outline: 0, jit: 14 });
  for (let n = 0; n < 7; n++) { const a = n * 0.9 + boil, d = r * 1.15; shape(o, ellipse(W / 2 + Math.cos(a) * d, H / 2 + Math.sin(a) * d * 0.8, r * 0.18, r * 0.15, 12, 0.3, 410 + n), { fill: PAL.ink, outline: 0 }); }
}
function iris(o, k) {
  if (k <= 0) return; const r = (1 - k) * 1150;
  o.save(); o.fillStyle = PAL.ink; o.beginPath(); o.rect(0, 0, W, H); o.arc(W / 2, H / 2, Math.max(r, 0.1), 0, Math.PI * 2, true); o.fill(); o.restore();
}
function tearMask(k, seed) {   // jagged vertical edge moving right→left
  const x = W * (1 - ease(k)); const pts = [[x, -10]]; let s = seed;
  for (let y = 0; y <= H + 40; y += 36) { s = (s * 9301 + 49297) % 233280; pts.push([x + (s / 233280 - 0.5) * 40, y]); }
  return pts.concat([[W + 10, H + 10], [W + 10, -10]]);
}

window.setup = (timeline) => {
  TL = timeline; [W, H] = TL.size; FPS = TL.fps;
  TL.shots.forEach((s, i) => { s.index = i; s.actors = s.actors || []; });
  GTL = buildTimeline(); return Math.round(TL.duration * FPS);
};

window.frame = (i) => {
  const t = i / FPS; GTL.seek(t, false);
  const si = Math.max(0, TL.shots.findIndex(s => t >= s.start && t < s.end)); const sh = TL.shots[si === -1 ? TL.shots.length - 1 : si];
  const boil = Math.floor(i / 2) % 3, lt = t - sh.start;
  let out = renderShot(sh, t, i); const o = out.getContext('2d');
  const prev = TL.shots[si - 1], next = TL.shots[si + 1];
  if (sh.transition === 'tear' && prev && lt < 0.7) {
    const key = prev.index; LASTFRAME[key] ||= renderShot(prev, prev.end - 0.001, Math.round(prev.end * FPS) - 1);
    const comp = cv(W, H), c = comp.getContext('2d'); c.drawImage(LASTFRAME[key], 0, 0);
    const m = tearMask(lt / 0.7, 777); c.save(); c.beginPath(); m.forEach(([x, y], n) => n ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.clip(); c.drawImage(out, 0, 0); c.restore();
    BOIL.seed = 40 + boil; resetParts(); ink(c, m.slice(0, -2), { size: 7, smooth: false, jit: 1 }); out = comp;
  }
  const o2 = out.getContext('2d');
  if (next?.transition === 'ink' && t > sh.end - 0.35) inkBlob(o2, (t - (sh.end - 0.35)) / 0.35, boil);
  if (sh.transition === 'ink' && lt < 0.4) inkBlob(o2, 1 - lt / 0.4, boil);
  if (next?.transition === 'iris' && t > sh.end - 0.45) iris(o2, (t - (sh.end - 0.45)) / 0.45);
  if (sh.transition === 'iris' && lt < 0.45) iris(o2, 1 - lt / 0.45);
  if (sh.fadeIn && lt < 0.6) { o2.fillStyle = `rgba(20,14,10,${1 - lt / 0.6})`; o2.fillRect(0, 0, W, H); }
  if (sh.fadeOut && t > sh.end - 0.8) { o2.fillStyle = `rgba(20,14,10,${(t - sh.end + 0.8) / 0.8})`; o2.fillRect(0, 0, W, H); }
  // captions
  const line = sh.lines.find(l => t >= l.start && t < l.end + 0.3);
  if (line) { const c = captionFor(line, t); titleText(o2, c.toUpperCase(), W / 2, H - 70, 54, { seed: 21 + c.length }); }
  return out.toDataURL('image/jpeg', 0.92);
};

function chunks(t) { const out = []; let cur = ''; for (const w of t.split(' ')) { if (cur && (cur.length + w.length > 30 || /[.?!,]$/.test(cur))) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) out.push(cur); return out; }
function captionFor(line, t) { const cs = chunks(line.text), wt = cs.map(c => c.length + (/[.?!]$/.test(c) ? 6 : 0)); const tot = wt.reduce((a, b) => a + b, 0);
  let acc = 0; for (let i = 0; i < cs.length; i++) { acc += wt[i]; if (t <= line.start + (line.end - line.start) * acc / tot) return cs[i]; } return cs[cs.length - 1]; }
window.ready = true;
