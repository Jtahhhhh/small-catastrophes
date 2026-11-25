import { PAL, BOIL, resetParts, paper, ink, shape, handText, ellipse, rng } from './ink.js';
import { MORTIMER, GRISTLE, TALLY, drawCast, storefront, lamp, atm, bill } from './cast.js';

function canvas(W, H) { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }

// Hand-lettered title: thick ink outline + cream fill, each letter slightly rotated/bounced
export function titleText(ctx, text, cx, cy, size, { fill = PAL.cream, font = 'DejaVu Serif', seed = 5, track = 0.02 } = {}) {
  const r = rng(seed); ctx.save(); ctx.font = `bold ${size}px "${font}"`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  const widths = [...text].map(ch => ctx.measureText(ch).width + size * track);
  let x = cx - widths.reduce((a, b) => a + b, 0) / 2;
  [...text].forEach((ch, i) => {
    const w = widths[i]; ctx.save(); ctx.translate(x + w / 2, cy + (r() - 0.5) * size * 0.1); ctx.rotate((r() - 0.5) * 0.12);
    ctx.lineJoin = 'round'; ctx.strokeStyle = PAL.ink; ctx.lineWidth = size * 0.16; ctx.strokeText(ch, size * 0.03, size * 0.05); // drop
    ctx.lineWidth = size * 0.11; ctx.strokeText(ch, 0, 0); ctx.fillStyle = fill; ctx.fillText(ch, 0, 0); ctx.restore(); x += w;
  });
  ctx.restore();
  const tot = widths.reduce((a, b) => a + b, 0);
  return { left: cx - tot / 2, right: cx + tot / 2, top: cy - size * 0.38 };
}

function crackedLens(ctx) {               // in Mortimer's local coords: left lens centre (-27,-482), r=24
  ink(ctx, [[-44, -496], [-33, -486], [-38, -474], [-26, -470], [-20, -458]], { size: 3, smooth: false, jit: 0.6 });
  ink(ctx, [[-33, -486], [-22, -492], [-12, -498]], { size: 2.5, smooth: false, jit: 0.6 });
  ink(ctx, [[-38, -474], [-48, -470]], { size: 2.2, smooth: false, jit: 0.6 });
}

export function logoCanvas(S = 800) {
  BOIL.seed = 3; resetParts();
  const c = canvas(S, S), ctx = c.getContext('2d');
  ctx.save(); ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 6, 0, 7); ctx.clip();
  paper(ctx, S, S, { base: '#d6c7a3', vignette: 0.45, seed: 9 });
  // hatched dusk band behind the head
  shape(ctx, ellipse(S / 2, S * 0.62, S * 0.46, S * 0.3, 24, 0.05, 501), { fill: '#b9a57d', outline: 0, hatch: 0.18, gap: 10 });
  ctx.save(); ctx.translate(S / 2, S * 0.53); ctx.scale(S / 262, S / 262); ctx.translate(0, 470);
  MORTIMER.find(p => p.name === 'scarf').draw(ctx);
  MORTIMER.find(p => p.name === 'head').draw(ctx);
  crackedLens(ctx);
  ctx.restore();
  ctx.restore();
  ink(ctx, ellipse(S / 2, S / 2, S / 2 - 16, S / 2 - 16, 48, 0.012, 502).concat([[S - 16, S / 2]]), { size: 18, jit: 1, thin: 0.2 });
  return c;
}
window.drawLogo = (S = 800) => logoCanvas(S).toDataURL('image/png');

function scene(ctx, W, H, safe, { heroScale = 0.62, crowScale = 0.75 } = {}) {
  const [sx, sy, sw, sh] = safe; const ground = sy + sh * 0.93;
  paper(ctx, W, H, { base: '#bba985', vignette: 0.7, seed: 13 });
  const g = ctx.createLinearGradient(0, 0, 0, ground); g.addColorStop(0, 'rgba(38,30,28,0.6)'); g.addColorStop(1, 'rgba(38,30,28,0.05)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, ground);
  shape(ctx, [[-40, ground], [W + 40, ground - 8], [W + 40, H + 40], [-40, H + 40]], { fill: '#8f7b58', outline: 6, jit: 5 });
  for (let k = 0; k < 7; k++) { const yy = ground + 14 + Math.pow(k / 6, 1.6) * (H - ground); ink(ctx, [[-20, yy], [W / 2, yy - 6], [W + 20, yy + 4]], { size: 2.5 + k * 0.4, color: 'rgba(34,28,22,0.4)' }); }
  return ground;
}

function bannerCore(W, H, safe, opts = {}) {
  BOIL.seed = 2; resetParts();
  const c = canvas(W, H), ctx = c.getContext('2d');
  const [sx, sy, sw, sh] = safe; const ground = scene(ctx, W, H, safe);
  // set dressing (mostly outside the safe area so it can crop away on phones)
  const sideW = (W - sw) / 2; const u = Math.min(sh, sw / 3.65);
  if (sideW > 200) {
    storefront(ctx, sx - sideW * 0.55, ground + 6, u / 460 * 1.05, 'CARD ONLY');
    atm(ctx, sx - sideW * 0.12, ground + 4, u / 300);
    lamp(ctx, sx + sw + sideW * 0.4, ground + 6, u / 330);
    drawCast(ctx, GRISTLE, sx - sideW * 0.85, ground + 8, u / 520);
  }
  const tcx = sx + sw * 0.5 + u * 0.18;
  titleText(ctx, 'SMALL', tcx, sy + sh * 0.5 - u * 0.33, u * 0.2, { seed: 3 });
  const t = titleText(ctx, 'CATASTROPHES', tcx, sy + sh * 0.5 - u * 0.04, u * 0.27, { seed: 7 });
  handText(ctx, opts.tagline || 'What happens, hour by hour, when everyday things break.', tcx, sy + sh * 0.5 + u * 0.26, { size: u * 0.072, color: PAL.cream, weight: 'normal' });
  drawCast(ctx, MORTIMER, t.left - u * 0.2, ground, u / 620);
  drawCast(ctx, TALLY, t.right - u * 0.14, t.top + u * 0.02, u / 420);          // crow perched on the final S
  bill(ctx, t.right - u * 0.05, ground - u * 0.06, u / 330, 0.25); bill(ctx, t.right - u * 0.3, ground - u * 0.03, u / 360, -0.3);
  if (opts.guides) { ctx.strokeStyle = 'rgba(255,0,0,0.8)'; ctx.lineWidth = 4; ctx.setLineDash([20, 12]); ctx.strokeRect(sx, sy, sw, sh); }
  return c.toDataURL('image/png');
}

window.drawBanner = (guides = false) => bannerCore(2560, 1440, [507, 508, 1546, 423], { guides });
window.drawFbCover = (guides = false) => bannerCore(1640, 624, [300, 100, 1040, 420], { guides });
