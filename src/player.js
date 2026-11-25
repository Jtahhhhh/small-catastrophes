// v0.3 player: shot list → frames.
// Layers per shot: paper → far (parallax 0.35) → back (1.0) → actors (1.0) → front (1.15) → overlays.
// Camera: size wide/medium/close on a point or actor; move push / pull / pan-left / pan-right / follow / static.
// Tweens (walks) live on a paused GSAP timeline that is seeked per frame, so rendering is deterministic.
import { gsap } from '../node_modules/gsap/gsap-core.js';
import rough from '../node_modules/roughjs/bundled/rough.esm.js';
import { PAL, BOIL, resetParts, paper, ink, shape, handText, ellipse, rng } from './ink.js';
import { MORTIMER, GRISTLE, TALLY, POSE, drawCast } from './cast.js';
import { makePerson } from './people.js';
import { ACTIONS, walkPose, idlePose, mergePoses } from './actions.js';
import { titleText } from './brand.js';
import { SETS } from './sets.js';

let TL, W, H, FPS, GTL, US = null; const CACHE = {}, LASTFRAME = {};
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const ease = t => { t = Math.min(Math.max(t, 0), 1); return t * t * (3 - 2 * t); };
const RIGS = { mortimer: MORTIMER, gristle: GRISTLE, tally: TALLY };
const rigFor = who => RIGS[who] || makePerson(Number(String(who).split(':')[1] || 1));
const HEAD_H = { mortimer: 480, gristle: 320, tally: 110 };
const PAR = { far: 0.35, back: 1, front: 1.15 };
const PAN = 110;                       // px of camera travel for pan-left / pan-right

// ---------- size rule ----------
function actorScale(sh, a) { const set = SETS[sh.set]; if (a.perch || !set.depth) return a.scale || 1; return set.depth(a.at[1]) * (a.size || 1); }

// ---------- camera ----------
const SIZES = { wide: 1, medium: 1.65, close: 2.6 };
function baseCamera(sh) {
  const cam = sh.camera || {}; const z = SIZES[cam.size || 'wide']; let c = [W / 2, H / 2];
  if (Array.isArray(cam.on)) c = cam.on;
  else if (cam.on) { const a = sh.actors.find(x => x.id === cam.on); const s = actorScale(sh, a);
    const hh = (HEAD_H[a.who] || 440) * s; c = [a.at[0], a.at[1] - (cam.size === 'close' ? hh * 0.92 : hh * 0.7)]; }
  return { z, cx: c[0], cy: c[1] };
}
function margin(sh) {
  const cam = sh.camera || {};
  if (cam.move === 'follow') { const a = sh.actors.find(x => x.id === cam.on); return Math.ceil(Math.abs((a.to ?? a.at[0]) - a.at[0]) * baseCamera(sh).z * PAR.front) + 200; }
  return 200;
}
function camOffset(sh, t) {     // screen-space horizontal offset of the "1.0" layer at time t
  const cam = sh.camera || {}, k = ease((t - sh.start) / (sh.end - sh.start));
  if (cam.move === 'pan-left') return PAN * (1 - 2 * k);
  if (cam.move === 'pan-right') return -PAN * (1 - 2 * k);
  if (cam.move === 'follow') { const a = sh.actors.find(x => x.id === cam.on); return -(a.pos.x - a.at[0]) * baseCamera(sh).z; }
  return 0;
}
const camMatrix = (cam, M) => [cam.z, 0, 0, cam.z, W / 2 - cam.cx * cam.z + M, H / 2 - cam.cy * cam.z];

function layers(sh, boil) {
  const key = `${sh.index}:${boil}`; if (CACHE[key]) return CACHE[key];
  const set = SETS[sh.set], cam = baseCamera(sh), M = margin(sh), m = camMatrix(cam, M);
  const make = fn => { if (!fn) return null; const c = cv(W + 2 * M, H), x = c.getContext('2d'); x.setTransform(...m); BOIL.seed = boil + 1; resetParts(); fn.call(set, x); return c; };
  const base = cv(W, H); paper(base.getContext('2d'), W, H, { base: set.paper, vignette: 0.7, seed: 11 });
  return (CACHE[key] = { M, base, far: make(set.far), back: make(set.draw), front: make(set.front) });
}

// ---------- crowds → people ----------
function expandCrowds(sh) {
  const out = [];
  for (const a of sh.actors) {
    if (!a.crowd) { out.push(a); continue; }
    const c = a.crowd, r = rng(c.seed || 1), [x0, y0, x1, y1] = c.area;
    for (let n = 0; n < c.n; n++) {
      const y = y0 + r() * (y1 - y0), x = x0 + r() * (x1 - x0), who = `person:${(c.seed || 1) * 100 + n}`;
      const p = { id: `${a.id || 'crowd'}${n}`, who, at: [x, y], size: 0.9 + r() * 0.2, crowd: true };
      if (c.walk) { const dir = c.walk === 'left' ? -1 : c.walk === 'right' ? 1 : (r() < 0.5 ? -1 : 1); const speed = (c.speed || 140) * (0.8 + r() * 0.5);
        const dur = sh.end - sh.start; p.to = x + dir * speed * dur; p.walk = [0, dur]; }
      if (c.queue) p.at = [x0 + n * (x1 - x0) / Math.max(1, c.n - 1) + (r() - 0.5) * 30, y0 + (r() - 0.5) * (y1 - y0)];
      if (c.fidget) p.actions = [{ do: r() < 0.5 ? 'shrug' : 'nod', at: r() * Math.max(0.5, sh.end - sh.start - 2), dur: 1.4 }];
      out.push(p);
    }
  }
  sh.actors = out;
}

// ---------- timeline ----------
function buildTimeline() {
  const tl = gsap.timeline({ paused: true });
  for (const sh of TL.shots) for (const a of sh.actors) {
    a.pos = { x: a.at[0] };
    if (a.to != null) { const [t0, dur] = a.walk || [0, sh.end - sh.start - 0.5];
      tl.to(a.pos, { x: a.to, duration: dur, ease: a.crowd ? 'none' : 'power1.inOut' }, sh.start + t0); a.walkWin = [sh.start + t0, sh.start + t0 + dur]; }
  }
  return tl;
}

// ---------- inserts ----------
function chart(ctx, spec, k, box) {
  const rc = rough.canvas(ctx.canvas);
  handText(ctx, spec.title, box.cx, box.top + 60, { size: 52 });
  if (spec.subtitle) handText(ctx, spec.subtitle, box.cx, box.top + 116, { size: 30, weight: 'normal' });
  const bars = spec.bars, n = bars.length, x0 = box.x0, x1 = box.x1, base = box.base, maxH = 420;
  const max = Math.max(...bars.map(b => b[1])) * 1.1, bw = (x1 - x0) / n * 0.55;
  bars.forEach(([label, v, col], i) => {
    const kk = ease((k - i * 0.25) / 0.9), bx = x0 + (i + 0.5) * (x1 - x0) / n - bw / 2, bh = maxH * v / max * kk, hi = spec.highlight === i;
    if (bh > 2) rc.rectangle(bx, base - bh, bw, bh, { fill: col || (hi ? PAL.red : '#6b7f8c'), fillStyle: 'hachure', hachureGap: 9, fillWeight: 2.4, stroke: PAL.ink, strokeWidth: 4, roughness: 1.8, seed: 7 + i + BOIL.seed * 13 });
    handText(ctx, `${(v * kk).toFixed(spec.decimals || 0)}${spec.unit || ''}`, bx + bw / 2, base - bh - 34, { size: 46, color: hi ? PAL.red : PAL.ink });
    handText(ctx, label, bx + bw / 2, base + 40, { size: 32 });
  });
  ink(ctx, [[x0 - 40, base], [x1 + 40, base + 4]], { size: 5 });
  if (spec.source) handText(ctx, 'Source: ' + spec.source, box.cx, box.source, { size: 22, weight: 'normal', color: '#5a4a3a' });
}

const MAPPTS = {};
function mapInsert(ctx, spec, k, box) {   // outlines draw in over 1.6 s, then dots pop in with a counter
  const { polys } = US; const kx = Math.cos(38 * Math.PI / 180);
  const lon0 = -125, lon1 = -66.5, lat0 = 24.3, lat1 = 49.5;
  const sc = Math.min((box.x1 - box.x0) / ((lon1 - lon0) * kx), (box.y1 - box.y0) / (lat1 - lat0));
  const ox = box.cx - (lon1 - lon0) * kx * sc / 2, oy = (box.y0 + box.y1) / 2 - (lat1 - lat0) * sc / 2;
  const P = ([lon, lat]) => [ox + (lon - lon0) * kx * sc, oy + (lat1 - lat) * sc];
  handText(ctx, spec.title, box.cx, box.top + 50, { size: 50 });
  const shown = Math.floor(polys.length * ease(k / 1.6));
  polys.slice(0, shown).forEach((poly, n) => shape(ctx, poly.map(P), { fill: n % 2 ? '#d9cba8' : '#d2c39d', outline: 3, jit: 1.2 }));
  if (spec.dots) {
    const key = JSON.stringify(spec.dots);
    if (!MAPPTS[key]) { const r = rng(spec.dots.seed || 4), pts = []; let tries = 0;
      while (pts.length < spec.dots.n && tries < spec.dots.n * 60) { tries++; const ll = [lon0 + r() * (lon1 - lon0), lat0 + r() * (lat1 - lat0)];
        if (polys.some(pl => inside(ll, pl))) pts.push(ll); } MAPPTS[key] = pts; }
    const dk = ease((k - 1.6) / 2.4), nShow = Math.floor(MAPPTS[key].length * dk);
    MAPPTS[key].slice(0, nShow).forEach((ll, n) => { const [x, y] = P(ll); shape(ctx, ellipse(x, y, 7, 7, 8, 0.2, 600 + (n % 50)), { fill: spec.dots.color || PAL.red, outline: 2 }); });
    if (spec.dots.counter) handText(ctx, `${Math.round(spec.dots.counter * dk).toLocaleString('en-US')} ${spec.dots.label || ''}`, box.cx, box.y1 + 12, { size: 44, color: PAL.red });
  }
  if (spec.source) handText(ctx, 'Source: ' + spec.source, box.cx, box.source, { size: 22, weight: 'normal', color: '#5a4a3a' });
}
function inside([x, y], poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j];
  if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }

function card(ctx, x, y, w, h, big, small, k) {
  if (k <= 0) return; ctx.save(); ctx.translate(x + w / 2, y + h / 2);
  const s = 0.6 + 0.4 * ease(k / 0.6); ctx.scale(s, s); ctx.rotate(-0.04); ctx.globalAlpha = Math.min(1, k * 3);
  shape(ctx, [[-w / 2, -h / 2], [w / 2, -h / 2 + 6], [w / 2 - 4, h / 2], [-w / 2 + 4, h / 2 - 4]], { fill: PAL.cream, outline: 6, jit: 3 });
  handText(ctx, big, 0, -h * 0.12, { size: h * 0.42, color: PAL.red });
  if (small) handText(ctx, small, 0, h * 0.28, { size: Math.min(h * 0.13, w * 0.85 / (small.length * 0.5)), color: PAL.ink, weight: 'normal' });
  ctx.restore();
}

// ---------- actors ----------
function drawActors(ctx, sh, t, i, which) {
  const amp = TL.amps[Math.min(i, TL.amps.length - 1)] || 0, V = TL.visemes || [], vis = V[Math.min(i, V.length - 1)] ?? 1;
  const speaker = sh.vo ? null : (sh.speaker || (sh.actors.some(a => a.id === 'mortimer') ? 'mortimer' : null));
  for (const a of which) {
    const x = a.pos.x, walking = a.walkWin && t >= a.walkWin[0] && t <= a.walkWin[1];
    const wAmt = walking ? (a.crowd ? 1 : Math.min(1, (t - a.walkWin[0]) / 0.25, (a.walkWin[1] - t) / 0.25)) : 0;
    const dirLeft = a.to != null ? a.to < a.at[0] : a.face === 'left';
    const acts = (a.actions || []).map(ac => { const at = sh.start + ac.at, d = ac.dur || 1.2; return t >= at && t <= at + d && ACTIONS[ac.do] ? ACTIONS[ac.do](t - at, d) : null; });
    const pose = mergePoses(idlePose(t, a.at[0] * 0.01), wAmt > 0 ? walkPose(Math.abs(x - a.at[0]) / 38, wAmt) : null, ...acts);
    if (a.id === speaker) { POSE.mouth = amp; POSE.viseme = vis; pose.rot.head = (pose.rot.head || 0) + amp * 0.05; }
    POSE.blink = ((t + a.at[0] * 0.003) % 3.4) < 0.12 ? 1 : 0;
    POSE.look = wAmt > 0 ? 1 : (a.look ?? Math.sin(t * 0.7 + a.at[0]) * 0.5);     // walking: eyes forward along the path
    const s = actorScale(sh, a), flip = a.flip ?? (dirLeft && a.who !== 'tally');
    const lean = wAmt * 0.06 * (flip ? -1 : 1);
    if (a.who !== 'tally') shape(ctx, ellipse(x, a.at[1], 95 * s, 18 * s, 14, 0.1, 300), { fill: 'rgba(34,28,22,0.22)', outline: 0 });
    drawCast(ctx, rigFor(a.who), x, a.at[1] + pose.dy * s, s, { rot: pose.rot, flip, lean });
    POSE.mouth = 0; POSE.viseme = 0; POSE.blink = 0; POSE.look = 0;
  }
}

// ---------- one shot ----------
function renderShot(sh, t, i) {
  const boil = Math.floor(i / 2) % 3, lt = t - sh.start, dur = sh.end - sh.start;
  const L = layers(sh, boil), cam = baseCamera(sh), off = camOffset(sh, t);
  const scene = cv(W, H), ctx = scene.getContext('2d');
  ctx.drawImage(L.base, 0, 0);
  if (L.far) ctx.drawImage(L.far, -L.M + off * PAR.far, 0);
  if (L.back) ctx.drawImage(L.back, -L.M + off * PAR.back, 0);
  BOIL.seed = 10 + boil; resetParts();
  const m = camMatrix(cam, 0), setCam = () => ctx.setTransform(m[0], 0, 0, m[3], m[4] + off, m[5]);
  setCam();
  const sorted = [...sh.actors].sort((a, b) => a.at[1] - b.at[1]);
  drawActors(ctx, sh, t, i, sorted.filter(a => a.layer === 'behind'));
  if (L.front) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(L.front, -L.M + off * PAR.front, 0); setCam(); }
  drawActors(ctx, sh, t, i, sorted.filter(a => a.layer !== 'behind'));
  if (sh.chart) chart(ctx, sh.chart, lt, SETS[sh.set].chartBox);
  if (sh.map) mapInsert(ctx, sh.map, lt, SETS[sh.set].mapBox);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const mv = (sh.camera || {}).move || 'push', k = ease(lt / dur); let z = 1;
  if (mv === 'push') z = 1 + 0.08 * k; if (mv === 'pull') z = 1.08 - 0.08 * k;
  const out = cv(W, H), o = out.getContext('2d');
  o.translate(W / 2, H / 2); o.scale(z, z); o.translate(-W / 2, -H / 2); o.drawImage(scene, 0, 0); o.setTransform(1, 0, 0, 1, 0, 0);
  BOIL.seed = 20 + boil; resetParts();
  if (!sh.chart && !sh.map) { const ls = sh.lines.filter(l => l.card); ls.forEach((l, n) => { const until = n + 1 < ls.length ? ls[n + 1].start : sh.end; if (t <= until) card(o, 1330, 90, 500, 280, l.card.big, l.card.small, t - l.start); }); }
  if (sh.stamp) { shape(o, [[60, 50], [430, 40], [436, 150], [66, 160]], { fill: PAL.cream, outline: 7, jit: 4 }); handText(o, sh.stamp, 248, 100, { size: 72, color: PAL.red }); }
  return out;
}

// ---------- transitions ----------
function inkBlob(o, k, boil) {
  if (k <= 0) return; BOIL.seed = 30 + boil; resetParts(); const r = k * 1250;
  shape(o, ellipse(W / 2, H / 2, r * 1.2, r, 26, 0.18, 400 + boil), { fill: PAL.ink, outline: 0, jit: 14 });
  for (let n = 0; n < 7; n++) { const a = n * 0.9 + boil, d = r * 1.15; shape(o, ellipse(W / 2 + Math.cos(a) * d, H / 2 + Math.sin(a) * d * 0.8, r * 0.18, r * 0.15, 12, 0.3, 410 + n), { fill: PAL.ink, outline: 0 }); }
}
function iris(o, k) { if (k <= 0) return; const r = (1 - k) * 1150;
  o.save(); o.fillStyle = PAL.ink; o.beginPath(); o.rect(0, 0, W, H); o.arc(W / 2, H / 2, Math.max(r, 0.1), 0, Math.PI * 2, true); o.fill(); o.restore(); }
function tearMask(k, seed) { const x = W * (1 - ease(k)); const pts = [[x, -10]]; let s = seed;
  for (let y = 0; y <= H + 40; y += 36) { s = (s * 9301 + 49297) % 233280; pts.push([x + (s / 233280 - 0.5) * 40, y]); }
  return pts.concat([[W + 10, H + 10], [W + 10, -10]]); }

window.setup = (timeline, mapData) => {
  TL = timeline; [W, H] = TL.size; FPS = TL.fps; US = mapData;
  TL.shots.forEach((s, i) => { s.index = i; s.actors = s.actors || []; expandCrowds(s); });
  GTL = buildTimeline(); return Math.round(TL.duration * FPS);
};

window.frame = (i) => {
  const t = i / FPS; GTL.seek(t, false);
  let si = TL.shots.findIndex(s => t >= s.start && t < s.end); if (si < 0) si = TL.shots.length - 1;
  const sh = TL.shots[si], boil = Math.floor(i / 2) % 3, lt = t - sh.start;
  let out = renderShot(sh, t, i);
  const prev = TL.shots[si - 1], next = TL.shots[si + 1];
  if (sh.transition === 'tear' && prev && lt < 0.7) {
    if (!LASTFRAME[prev.index]) { GTL.seek(prev.end - 0.001, false); LASTFRAME[prev.index] = renderShot(prev, prev.end - 0.001, Math.round(prev.end * FPS) - 1); GTL.seek(t, false); }
    const comp = cv(W, H), c = comp.getContext('2d'); c.drawImage(LASTFRAME[prev.index], 0, 0);
    const mk = tearMask(lt / 0.7, 777); c.save(); c.beginPath(); mk.forEach(([x, y], n) => n ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.clip(); c.drawImage(out, 0, 0); c.restore();
    BOIL.seed = 40 + boil; resetParts(); ink(c, mk.slice(0, -2), { size: 7, smooth: false, jit: 1 }); out = comp;
  }
  const o2 = out.getContext('2d');
  if (next?.transition === 'ink' && t > sh.end - 0.35) inkBlob(o2, (t - (sh.end - 0.35)) / 0.35, boil);
  if (sh.transition === 'ink' && lt < 0.4) inkBlob(o2, 1 - lt / 0.4, boil);
  if (next?.transition === 'iris' && t > sh.end - 0.45) iris(o2, (t - (sh.end - 0.45)) / 0.45);
  if (sh.transition === 'iris' && lt < 0.45) iris(o2, 1 - lt / 0.45);
  if (sh.fadeIn && lt < 0.6) { o2.fillStyle = `rgba(20,14,10,${1 - lt / 0.6})`; o2.fillRect(0, 0, W, H); }
  if (sh.fadeOut && t > sh.end - 0.8) { o2.fillStyle = `rgba(20,14,10,${(t - sh.end + 0.8) / 0.8})`; o2.fillRect(0, 0, W, H); }
  const line = sh.lines.find(l => t >= l.start && t < l.end + 0.3);
  if (line) { const c = captionFor(line, t); titleText(o2, c.toUpperCase(), W / 2, H - 70, 54, { seed: 21 + c.length }); }
  return out.toDataURL('image/jpeg', 0.92);
};

function chunks(t) { const out = []; let cur = ''; for (const w of t.split(' ')) { if (cur && (cur.length + w.length > 30 || /[.?!,]$/.test(cur))) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) out.push(cur); return out; }
function captionFor(line, t) { const cs = chunks(line.text), wt = cs.map(c => c.length + (/[.?!]$/.test(c) ? 6 : 0)); const tot = wt.reduce((a, b) => a + b, 0);
  let acc = 0; for (let i = 0; i < cs.length; i++) { acc += wt[i]; if (t <= line.start + (line.end - line.start) * acc / tot) return cs[i]; } return cs[cs.length - 1]; }
window.ready = true;
