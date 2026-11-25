// Hand-drawn gothic toolkit: wobbly ink outlines (perfect-freehand), hatching (rough.js), paper.
import { getStroke } from '../node_modules/perfect-freehand/dist/esm/index.mjs';
import rough from '../node_modules/roughjs/bundled/rough.esm.js';

export const PAL = {
  paper: '#cfbf9c', paperDark: '#a8946d', ink: '#221c16', skin: '#e4d5b7', slate: '#5a6166',
  coat: '#4d5357', red: '#8a3a2c', moss: '#5f6a44', mustard: '#b08532', cream: '#e8dcc0',
  brown: '#6b4a2f', wood: '#7a5a3a', crow: '#2c2723', bill: '#8ea07a', night: '#2a2622',
};

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// global "boil" seed: change per drawn frame to make lines shimmer
export const BOIL = { seed: 1 };
let partCounter = 0;
export function resetParts() { partCounter = 0; }
function R() { partCounter++; return rng(BOIL.seed * 7919 + partCounter * 104729); }

export function ellipse(cx, cy, rx, ry, n = 22, wob = 0.06, seed = 3) {
  const r = rng(seed); const pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const k = 1 + (r() - 0.5) * wob * 2;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  return pts;
}

function jitter(pts, amt) { const r = R(); return pts.map(([x, y]) => [x + (r() - 0.5) * amt, y + (r() - 0.5) * amt]); }

function catmull(pts, closed, seg = 6) {
  const out = []; const n = pts.length; const get = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let s = 0; s < seg; s++) { const t = s / seg, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3))); }
  }
  if (!closed) out.push(pts[n - 1]); else out.push(out[0]);
  return out;
}

function fillPath(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); }

// Variable-width ink line along pts
export function ink(ctx, pts, { size = 6, closed = false, color = PAL.ink, smooth = true, jit = 2.2, thin = 0.55 } = {}) {
  let p = jitter(pts, jit);
  if (smooth && p.length > 2) p = catmull(p, closed);
  const r = R();
  const input = p.map(([x, y], i) => [x, y, 0.35 + 0.65 * Math.abs(Math.sin(i * 0.37 + r() * 6))]);
  const stroke = getStroke(input, { size, thinning: thin, smoothing: 0.5, streamline: 0.3, simulatePressure: false,
    start: { taper: closed ? 0 : size * 2 }, end: { taper: closed ? 0 : size * 3 } });
  ctx.fillStyle = color; fillPath(ctx, stroke);
}

// Filled shape: flat colour + optional hatching + ink outline
function densify(pts, step = 22) {
  const out = []; const n = pts.length;
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.max(1, Math.round(d / step)); for (let j = 0; j < k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]); }
  return out;
}
export function shape(ctx, pts, { fill = PAL.slate, hatch = 0, hatchAngle = -41, outline = 6, smooth = false, jit = 2.5, inkColor = PAL.ink, gap = 9 } = {}) {
  let p = smooth ? catmull(jitter(pts, jit), true, 4) : jitter(densify(pts), jit * 0.8);
  ctx.fillStyle = fill; fillPath(ctx, p);
  if (hatch > 0) {
    const rc = rough.canvas(ctx.canvas);
    ctx.save(); ctx.beginPath(); p.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.clip();
    rc.polygon(p, { stroke: 'none', fill: `rgba(34,28,22,${hatch})`, fillStyle: 'hachure', hachureAngle: hatchAngle,
      hachureGap: gap, fillWeight: 1.6, roughness: 1.6, seed: Math.floor(R()() * 1e6) + 1 });
    ctx.restore();
  }
  if (outline) { const q = smooth ? p.filter((_, i) => i % 2 === 0) : p; ink(ctx, [...q, q[0], q[1]], { size: outline, closed: true, color: inkColor, smooth: !smooth, jit: 0 }); }
}

export function dot(ctx, x, y, r, color = PAL.ink) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

export function handText(ctx, text, x, y, { size = 48, color = PAL.ink, font = 'DejaVu Serif', weight = 'bold', spread = 0.9 } = {}) {
  const r = R(); ctx.save(); ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.font = `${weight} ${size}px "${font}"`;
  const w = ctx.measureText(text).width * spread; let cx = x - w / 2;
  for (const ch of text) { const cw = ctx.measureText(ch).width * spread;
    ctx.save(); ctx.translate(cx + cw / 2, y + (r() - 0.5) * size * 0.12); ctx.rotate((r() - 0.5) * 0.14);
    ctx.fillText(ch, 0, 0); ctx.restore(); cx += cw; }
  ctx.restore();
}

export function paper(ctx, W, H, { base = PAL.paper, seed = 11, vignette = 0.55 } = {}) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  const r = rng(seed);
  for (let i = 0; i < 90; i++) { // soft stains
    const x = r() * W, y = r() * H, rad = 60 + r() * 260; const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(120,95,60,${0.03 + r() * 0.05})`); g.addColorStop(1, 'rgba(120,95,60,0)');
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  const img = ctx.getImageData(0, 0, W, H); const d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 22; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 260; i++) { ctx.strokeStyle = `rgba(80,60,35,${0.04 + r() * 0.06})`; ctx.lineWidth = 1;
    const x = r() * W, y = r() * H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 8); ctx.stroke(); }
  if (vignette) { const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(30,20,10,0)'); g.addColorStop(1, `rgba(30,20,10,${vignette})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
}
