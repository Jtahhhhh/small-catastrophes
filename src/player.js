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
import { SETS, V, applyVariant } from './sets.js';
import { HERO } from './props.js';

let TL, W, H, FPS, GTL, US = null, WORLD = null; const SUBS = []; const CACHE = {}, LASTFRAME = {};
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const ease = t => { t = Math.min(Math.max(t, 0), 1); return t * t * (3 - 2 * t); };
const RIGS = { mortimer: MORTIMER, gristle: GRISTLE, tally: TALLY };
const rigFor = (who, locale) => RIGS[who] || makePerson(Number(String(who).split(':')[1] || 1), locale || V.locale);
const HEAD_H = { mortimer: 480, gristle: 320, tally: 110 };
// Rig normalisation so every adult follows the same body spec (heights to top of head, at scale 1):
// Mortimer 552 (tall), townsfolk 510–600, Mrs. Gristle 370 in her rig → ×1.2 ≈ 445 (short and stout).
const RIG_SIZE = { gristle: 1.2 };
const PAR = { far: 0.35, back: 1, front: 1.15 };
const PAN = 110;                       // px of camera travel for pan-left / pan-right

// ---------- size rule ----------
function actorScale(sh, a) { const set = SETS[sh.set]; if (a.perch || !set.depth) return a.scale || 1; return set.depth(a.at[1]) * (a.size || 1) * (RIG_SIZE[a.who] || 1); }

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
  applyVariant(sh); const set = SETS[sh.set], cam = baseCamera(sh), M = margin(sh), m = camMatrix(cam, M);
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
      const p = { id: `${a.id || 'crowd'}${n}`, who, at: [x, y], crowd: true };
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
  for (const sh of [...TL.shots, ...SUBS]) for (const a of sh.actors) {
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
    drawCast(ctx, rigFor(a.who, a.locale), x, a.at[1] + pose.dy * s, s, { rot: pose.rot, flip, lean });
    POSE.mouth = 0; POSE.viseme = 0; POSE.blink = 0; POSE.look = 0;
  }
}

// ---------- one shot ----------
function renderShot(sh, t, i) {
  const boil = Math.floor(i / 2) % 3, lt = t - sh.start, dur = sh.end - sh.start;
  if (sh.panels) return renderPanels(sh, t, i);
  const L = layers(sh, boil), cam = baseCamera(sh), off = camOffset(sh, t); applyVariant(sh);
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
  if (sh.map) (sh.map.region === 'world' ? worldInsert : mapInsert)(ctx, sh.map, lt, SETS[sh.set].mapBox);
  if (sh.insert) { const h = HERO[sh.insert.prop]; ctx.save(); ctx.translate(960, 470); ctx.rotate(sh.insert.tilt ?? -0.03); ctx.scale(sh.insert.scale || 1.3, sh.insert.scale || 1.3);
    if (h) h(ctx, V, sh.insert.text || []); ctx.restore(); }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const mv = (sh.camera || {}).move || 'push', k = ease(lt / dur); let z = 1;
  if (mv === 'push') z = 1 + 0.08 * k; if (mv === 'pull') z = 1.08 - 0.08 * k;
  const out = cv(W, H), o = out.getContext('2d');
  o.translate(W / 2, H / 2); o.scale(z, z); o.translate(-W / 2, -H / 2); o.drawImage(scene, 0, 0); o.setTransform(1, 0, 0, 1, 0, 0);
  BOIL.seed = 20 + boil; resetParts();
  if (!sh.chart && !sh.map) { const ls = sh.lines.filter(l => l.card); ls.forEach((l, n) => { const until = n + 1 < ls.length ? ls[n + 1].start : sh.end; if (t <= until) card(o, 1330, 90, 500, 280, l.card.big, l.card.small, t - l.start); }); }
  if (sh.headline) headline(o, sh.headline, lt);
  if (sh.stamp) { o.save(); o.font = 'bold 72px "DejaVu Serif"'; const sw = o.measureText(sh.stamp).width * 0.9 + 80; o.restore();
    shape(o, [[60, 50], [60 + sw, 40], [66 + sw, 150], [66, 160]], { fill: PAL.cream, outline: 7, jit: 4 }); handText(o, sh.stamp, 63 + sw / 2, 100, { size: 72, color: PAL.red }); }
  return out;
}

// ---------- headline: a newspaper spins in, as in old films ----------
function headline(o, h, lt) {
  const k = ease(lt / 0.9); if (k <= 0) return;
  o.save(); o.fillStyle = `rgba(20,14,10,${0.55 * k})`; o.fillRect(0, 0, W, H);
  o.translate(W / 2, H / 2 - 20); o.rotate((1 - k) * Math.PI * 4 - 0.04); o.scale(0.15 + 0.85 * k, 0.15 + 0.85 * k);
  shape(o, [[-640, -400], [640, -414], [652, 400], [-628, 412]], { fill: '#e9e0c6', outline: 8, jit: 3 });
  handText(o, h.paper || 'THE DAILY LEDGER', 0, -330, { size: 58, font: 'DejaVu Serif' });
  ink(o, [[-590, -285], [590, -290]], { size: 5 }); ink(o, [[-590, -270], [590, -275]], { size: 2 });
  if (h.date) handText(o, h.date, 0, -250, { size: 28, weight: 'normal' });
  const words = h.text.split(' '), rows = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > 18) { rows.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } rows.push(cur);
  rows.forEach((r, n) => handText(o, r, 0, -140 + n * 105 + (3 - rows.length) * 50, { size: 96, color: PAL.ink }));
  if (h.sub) handText(o, h.sub, 0, 250, { size: 38, weight: 'normal' });
  for (let yy = 310; yy < 380; yy += 22) ink(o, [[-560, yy], [560, yy - 2]], { size: 2, color: 'rgba(34,28,22,0.35)' });
  if (h.source) handText(o, h.source, 0, 375, { size: 22, weight: 'normal', color: '#5a4a3a' });
  o.restore();
}

// ---------- panels: 2 or 3 sub-shots side by side (split screen / comic strip) ----------
function renderPanels(sh, t, i) {
  const n = sh.panels.length, gap = 26, top = 40, bottom = 40, pw = (W - gap * (n + 1)) / n, ph = H - top - bottom;
  const out = cv(W, H), o = out.getContext('2d'); paper(o, W, H, { base: '#2a211b', vignette: 0.5, seed: 12 });
  const lt = t - sh.start, dur = sh.end - sh.start;
  sh.panels.forEach((p, k) => {
    const appear = sh.reveal ? (p.at ?? k * dur / n * 0.8) : 0; if (lt < appear) return;
    const img = renderShot(p, t, i), cw = Math.min(W, H * pw / ph), cx = W / 2 - cw / 2, x = gap + k * (pw + gap);
    o.save(); o.globalAlpha = Math.min(1, (lt - appear) / 0.3 + (sh.reveal ? 0 : 1)); o.drawImage(img, cx, 0, cw, H, x, top, pw, ph); o.restore();
    BOIL.seed = 50 + (Math.floor(i / 2) % 3); resetParts();
    shape(o, [[x, top], [x + pw, top - 2], [x + pw + 2, top + ph], [x - 2, top + ph + 2]], { fill: 'rgba(0,0,0,0)', outline: 9, jit: 2 });
    if (p.label) { o.save(); o.font = 'bold 44px "DejaVu Serif"'; const lw = o.measureText(p.label).width * 0.9 + 50; o.restore();
      shape(o, [[x + 20, top + 20], [x + 20 + lw, top + 16], [x + 24 + lw, top + 86], [x + 24, top + 90]], { fill: PAL.cream, outline: 6, jit: 3 });
      handText(o, p.label, x + 22 + lw / 2, top + 54, { size: 44, color: PAL.red }); }
  });
  return out;
}

// ---------- world map: outlines draw in, highlighted countries pop in one by one with labels ----------
function worldInsert(ctx, spec, k, box) {
  const lon0 = -170, lon1 = 180, lat0 = -56, lat1 = 80;
  const sc = Math.min((box.x1 - box.x0) / (lon1 - lon0), (box.y1 - box.y0) / (lat1 - lat0));
  const ox = box.cx - (lon1 - lon0) * sc / 2, oy = (box.y0 + box.y1) / 2 - (lat1 - lat0) * sc / 2 + 20;
  const P = ([lon, lat]) => [ox + (Math.max(lon, lon0) - lon0) * sc, oy + (lat1 - lat) * sc];
  handText(ctx, spec.title, box.cx, box.top + 50, { size: 50 });
  const hi = spec.highlight || [], idx = hi.map(h => WORLD.names.indexOf(h.name));
  const shown = Math.floor(WORLD.polys.length * ease(k / 1.2));
  WORLD.polys.slice(0, shown).forEach((poly, n) => { const h = idx.indexOf(WORLD.owner[n]), at = h >= 0 ? (hi[h].at ?? 1.4 + h * 0.9) : 0;
    const on = h >= 0 && k >= at; shape(ctx, poly.map(P), { fill: on ? (hi[h].color || PAL.red) : (n % 2 ? '#d9cba8' : '#d2c39d'), outline: on ? 3 : 2, jit: 0.8, hatch: on ? 0.3 : 0 }); });
  hi.forEach((h, n) => { const at = h.at ?? 1.4 + n * 0.9; if (k < at || idx[n] < 0) return;
    const rings = WORLD.polys.filter((_, m) => WORLD.owner[m] === idx[n]).sort((a, b) => b.length - a.length)[0];
    const c = rings.reduce((a, p) => [a[0] + p[0] / rings.length, a[1] + p[1] / rings.length], [0, 0]), [x, y] = P(c);
    const [dx, dy] = h.offset || [0, -110], kk = ease((k - at) / 0.4);
    ink(ctx, [[x, y], [x + dx * kk, y + dy * kk]], { size: 4 });
    if (kk > 0.6) { ctx.save(); ctx.font = 'bold 40px "DejaVu Serif"'; const lw = ctx.measureText(h.label || h.name).width * 0.9 + 40; ctx.restore();
      shape(ctx, [[x + dx - lw / 2, y + dy - 34], [x + dx + lw / 2, y + dy - 38], [x + dx + lw / 2 + 4, y + dy + 30], [x + dx - lw / 2 + 2, y + dy + 34]], { fill: PAL.cream, outline: 5, jit: 2 });
      handText(ctx, h.label || h.name, x + dx, y + dy - 2, { size: 40, color: h.color || PAL.red }); } });
  if (spec.source) handText(ctx, 'Source: ' + spec.source, box.cx, box.source, { size: 22, weight: 'normal', color: '#5a4a3a' });
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
  TL = timeline; [W, H] = TL.size; FPS = TL.fps; US = mapData.us || mapData; WORLD = mapData.world || null;
  TL.shots.forEach((s, i) => { s.index = i; s.actors = s.actors || []; expandCrowds(s);
    (s.panels || []).forEach((p, k) => { Object.assign(p, { index: `${i}p${k}`, start: s.start, end: s.end, lines: [], actors: p.actors || [] }); expandCrowds(p); SUBS.push(p); }); });
  GTL = buildTimeline(); return Math.round(TL.duration * FPS);
};

window.frame = (i) => {
  const t = i / FPS; GTL.seek(t, false);
  let si = TL.shots.findIndex(s => t >= s.start && t < s.end); if (si < 0) si = TL.shots.length - 1;
  const sh = TL.shots[si], boil = Math.floor(i / 2) % 3, lt = t - sh.start;
  if (si !== frame.last) { frame.last = si; const keep = new Set([si - 1, si, si + 1]);     // free layer canvases of shots we left
    for (const k of Object.keys(CACHE)) { const n = parseInt(k); if (!keep.has(n)) delete CACHE[k]; }
    for (const k of Object.keys(LASTFRAME)) if (!keep.has(Number(k))) delete LASTFRAME[k]; }
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

// Caption chunks: break after punctuation, keep chunks ≤ 34 chars, never end a chunk on a small joining word.
const JOIN = new Set(['a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'for', 'and', 'or', 'but', 'with', 'from', 'by', 'is', 'are', 'was', 'that', 'their', 'your', 'its', 'her', 'his', 'my', 'every', 'no', 'just', 'it', 'they', 'you', 'we', 'i', 'as', 'so', 'than', 'who', 'what', 'about', 'into', 'over', 'had', 'has', 'have', 'be', 'were', 'all', 'more', 'most', 'some', 'only', 'one', 'two', 'this', 'these', 'those', 'can', 'would', 'will', "don't", "didn't", "can't", "isn't", 'not', 'very', 'how', 'when', 'where', 'there', 'then', 'if']);
function chunks(t) {
  const ws = t.split(' '), out = []; let cur = [];
  const len = a => a.join(' ').length;
  for (let n = 0; n < ws.length; n++) { const w = ws[n];
    if (cur.length && len([...cur, w]) > 34) {               // too long: move trailing joining words to the next chunk
      const carry = []; while (cur.length > 1 && JOIN.has(cur[cur.length - 1].toLowerCase().replace(/[^a-z']/g, ''))) carry.unshift(cur.pop());
      out.push(cur.join(' ')); cur = carry; }
    cur.push(w);
    if (/[.?!,;:]$/.test(w) && len(cur) >= 12 && n < ws.length - 1) { out.push(cur.join(' ')); cur = []; } }
  if (cur.length) { if (out.length && len(cur) < 10 && len([out[out.length - 1], ...cur]) <= 40) out[out.length - 1] += ' ' + cur.join(' '); else out.push(cur.join(' ')); }
  return out;
}
function captionFor(line, t) { const cs = chunks(line.text), wt = cs.map(c => c.length + (/[.?!]$/.test(c) ? 6 : 0)); const tot = wt.reduce((a, b) => a + b, 0);
  let acc = 0; for (let i = 0; i < cs.length; i++) { acc += wt[i]; if (t <= line.start + (line.end - line.start) * acc / tot) return cs[i]; } return cs[cs.length - 1]; }
window.ready = true;
