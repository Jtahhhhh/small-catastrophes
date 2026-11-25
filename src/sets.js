// Background sets. Each set draws everything that does not move; it is rendered 3 times
// (one per line-boil variant) and reused for every frame of the scene.
import { PAL, BOIL, resetParts, paper, ink, shape, ellipse } from './ink.js';
import { GRISTLE, drawCast, storefront, lamp, atm, bill, cart } from './cast.js';

const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

function groundAndSky(ctx, W, H, horizon = 600) {
  paper(ctx, W, H, { base: '#b7a682', vignette: 0.75, seed: 11 });
  const g = ctx.createLinearGradient(0, 0, 0, horizon); g.addColorStop(0, 'rgba(40,32,30,0.55)'); g.addColorStop(1, 'rgba(40,32,30,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, horizon);
  shape(ctx, [[-40, horizon], [W + 40, horizon - 20], [W + 40, H + 40], [-40, H + 40]], { fill: '#8f7b58', outline: 6, jit: 6 });
  for (let k = 0; k < 9; k++) { const yy = horizon + 10 + Math.pow(k / 8, 1.7) * (H - horizon); ink(ctx, [[-20, yy], [W * 0.5, yy - 6], [W + 20, yy + 4]], { size: 2.5 + k * 0.4, color: 'rgba(34,28,22,0.45)' }); }
}

// Anchor points characters can stand at, per set (x, groundY, scale)
export const SETS = {
  street: {
    anchors: { hero: [800, 985, 1.15], crow: [1560, 300, 0.95], card: [930, 140] },
    draw(ctx, W, H) {
      groundAndSky(ctx, W, H);
      storefront(ctx, 430, 650, 1.05); atm(ctx, 1080, 660, 0.9); lamp(ctx, 1500, 690, 1.25);
      drawCast(ctx, GRISTLE, 470, 655, 0.7); cart(ctx, 1290, 900, 1.0);
      bill(ctx, 1000, 975, 0.9, 0.3); bill(ctx, 1700, 1010, 0.8, -0.4);
      shape(ctx, ellipse(800, 985, 110, 22, 16, 0.1, 300), { fill: 'rgba(34,28,22,0.25)', outline: 0, hatch: 0.4, gap: 6 });
    },
  },
};

export function renderSet(name, W, H) {
  const set = SETS[name]; if (!set) throw new Error('unknown set ' + name);
  return [1, 2, 3].map(seed => { BOIL.seed = seed; resetParts(); const c = cv(W, H); set.draw(c.getContext('2d'), W, H); return c; });
}
