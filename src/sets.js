// Sets = static world drawn in world coordinates (1920×1080 "stage"). The player draws the paper first,
// then applies the camera and calls draw() (behind actors) and front() (in front of actors).
import { PAL, ink, shape, ellipse, handText } from './ink.js';
import { storefront, lamp, atm, bill, cart } from './cast.js';

function ground(ctx, horizon = 600, color = '#8f7b58', noSky = false) {
  const W = 1920, H = 1080;
  if (!noSky) { const g = ctx.createLinearGradient(0, -200, 0, horizon); g.addColorStop(0, 'rgba(40,32,30,0.55)'); g.addColorStop(1, 'rgba(40,32,30,0)');
    ctx.fillStyle = g; ctx.fillRect(-400, -400, W + 800, horizon + 400); }
  shape(ctx, [[-1200, horizon], [W + 1200, horizon - 20], [W + 1200, H + 400], [-1200, H + 400]], { fill: color, outline: 6, jit: 6 });
  for (let k = 0; k < 9; k++) { const yy = horizon + 10 + Math.pow(k / 8, 1.7) * (H - horizon); ink(ctx, [[-1100, yy], [W * 0.5, yy - 6], [W + 1100, yy + 4]], { size: 2.5 + k * 0.4, color: 'rgba(34,28,22,0.45)' }); }
}

function shelf(ctx, x, y, w, h, seed) {
  const sc = h / 420;
  shape(ctx, [[x, y], [x + w, y], [x + w, y - h], [x, y - h]], { fill: '#5e5148', outline: 6, hatch: 0.2 });
  const cols = ['#a8442f', '#c89a3a', '#5e7a8c', '#6b7b45', '#d8cdb0', '#7d5a8c'];
  for (let row = 0; row < 4; row++) {
    const yy = y - 14 - row * (h / 4); ink(ctx, [[x + 6, yy + 4], [x + w - 6, yy + 4]], { size: 4 });
    let xx = x + 12, k = seed * 31 + row * 7;
    while (xx < x + w - 34) { k = (k * 9301 + 49297) % 233280; const bw = (22 + (k % 22)) * Math.max(sc, 0.75), bh = (36 + (k % 30)) * sc;
      const empty = row === 1 && xx > x + w * 0.45;            // half-empty shelf: people are stocking up
      if (!empty) shape(ctx, [[xx, yy], [xx + bw, yy], [xx + bw, yy - bh], [xx, yy - bh]], { fill: cols[k % cols.length], outline: 3, jit: 1.2 });
      xx += bw + 6; }
  }
}

export const SETS = {
  // depth(y): scale of a standing character whose feet are at world y. Tuned so a person fits the shop door
  // at the back (y≈650) and Mortimer fills ~65% of frame height at the front (y≈985).
  street: {
    paper: '#b7a682',
    depth: y => 1.15 * (y - 521) / (985 - 521),
    anchors: { atm: [1080, 560], lamp: [1560, 300] },
    far(ctx) {   // distant rooftops: moves slower than the street when the camera pans (parallax)
      const g = ctx.createLinearGradient(0, -200, 0, 600); g.addColorStop(0, 'rgba(40,32,30,0.55)'); g.addColorStop(1, 'rgba(40,32,30,0)');
      ctx.fillStyle = g; ctx.fillRect(-900, -400, 3700, 1000);
      let x = -800, k = 5;
      while (x < 2800) { k = (k * 9301 + 49297) % 233280; const w = 120 + k % 140, h = 140 + (k >> 3) % 220;
        shape(ctx, [[x, 600], [x + w, 600], [x + w, 600 - h], [x + w * 0.5, 600 - h - 40], [x, 600 - h]], { fill: 'rgba(110,96,76,0.45)', outline: 3, inkColor: 'rgba(34,28,22,0.45)', hatch: 0.12, gap: 14 });
        for (let wy = 600 - h + 30; wy < 560; wy += 50) for (let wx = x + 18; wx < x + w - 30; wx += 44) if ((wx * 7 + wy) % 7 < 2) shape(ctx, [[wx, wy], [wx + 16, wy], [wx + 16, wy + 20], [wx, wy + 20]], { fill: 'rgba(217,184,102,0.55)', outline: 0, jit: 1 });
        x += w + 10; }
    },
    draw(ctx) {
      ground(ctx, 600, '#8f7b58', true);
      storefront(ctx, 430, 650, 1.05); atm(ctx, 1080, 660, 0.9); lamp(ctx, 1500, 690, 1.25);
      cart(ctx, 1290, 900, 1.0);
      bill(ctx, 1000, 975, 0.9, 0.3); bill(ctx, 1700, 1010, 0.8, -0.4);
    },
  },
  supermarket: {
    paper: '#c4b48e',
    depth: y => 1.05 * (y - 370) / (1000 - 370),      // shopkeeper behind the counter (feet y≈880) ≈ 0.85
    anchors: { counter: [1560, 760], terminal: [1510, 640], shopkeeper: [1690, 880] },
    draw(ctx) {
      shape(ctx, [[-400, -400], [2320, -400], [2320, 620], [-400, 620]], { fill: '#d2c39d', outline: 0, hatch: 0.08, hatchAngle: 90, gap: 40 });
      for (let x = -300; x < 2300; x += 160) ink(ctx, [[x, 620], [x + 2, -300]], { size: 2, color: 'rgba(34,28,22,0.18)' });
      shape(ctx, [[-400, 620], [2320, 610], [2320, 1500], [-400, 1500]], { fill: '#a99470', outline: 6 });
      for (let k = 0; k < 8; k++) { const yy = 640 + Math.pow(k / 7, 1.6) * 460; ink(ctx, [[-300, yy], [2300, yy - 4]], { size: 2 + k * 0.3, color: 'rgba(34,28,22,0.35)' }); }
      shelf(ctx, 60, 630, 300, 300, 1); shelf(ctx, 400, 630, 300, 300, 2); shelf(ctx, 740, 630, 300, 300, 3);
      // hanging sign
      ink(ctx, [[1380, -200], [1380, 120]], { size: 3 }); ink(ctx, [[1760, -200], [1760, 120]], { size: 3 });
      shape(ctx, [[1340, 110], [1800, 100], [1806, 210], [1346, 220]], { fill: PAL.cream, outline: 7 });
      handText(ctx, 'CARD ONLY', 1572, 160, { size: 70, color: PAL.red });
      // light strips
      for (const x of [200, 700, 1200]) shape(ctx, [[x, -60], [x + 260, -60], [x + 260, -44], [x, -44]], { fill: '#f3e9c8', outline: 3 });
    },
    front(ctx) {   // checkout counter in front of the shopkeeper
      shape(ctx, [[1290, 745], [1830, 737], [1840, 900], [1280, 905]], { fill: PAL.wood, outline: 7, hatch: 0.3, hatchAngle: 80 });
      shape(ctx, [[1270, 722], [1850, 714], [1852, 752], [1268, 760]], { fill: '#3b2a1b', outline: 5 });
      shape(ctx, [[1320, 612], [1450, 608], [1456, 718], [1316, 720]], { fill: PAL.brown, outline: 5, hatch: 0.2 });   // register (left end, never covers the shopkeeper)
      handText(ctx, 'EMPTY', 1386, 692, { size: 24, color: PAL.cream });
      shape(ctx, [[1480, 662], [1540, 660], [1544, 724], [1478, 726]], { fill: '#3d4246', outline: 4 });                // card terminal
      shape(ctx, [[1490, 670], [1532, 669], [1532, 692], [1490, 693]], { fill: '#6fd08f', outline: 2 });
    },
  },
  desk: {   // chart inserts: a big sheet pinned to a dark wall, presenter stands to the right
    paper: '#3a2e25',
    depth: y => 1.0 * (y - 300) / (1050 - 300),
    chartBox: { x0: 230, x1: 1330, cx: 780, top: 150, base: 790, source: 880 },
    mapBox: { x0: 170, x1: 1390, y0: 250, y1: 850, cx: 780, top: 150, source: 905 },
    anchors: {},
    draw(ctx) {
      for (let y = 0; y < 1080; y += 70) ink(ctx, [[-50, y], [1970, y + 8]], { size: 2.5, color: 'rgba(20,14,10,0.5)' });
      shape(ctx, [[-60, 1010], [1980, 1000], [1980, 1200], [-60, 1200]], { fill: '#2a211b', outline: 5 });      // floor strip
      shape(ctx, [[110, 80], [1450, 66], [1466, 960], [100, 972]], { fill: '#e6dabd', outline: 7, jit: 4 });
      for (const [x, y] of [[140, 100], [1420, 88]]) shape(ctx, ellipse(x, y, 12, 12, 10, 0.1, 500 + x), { fill: PAL.red, outline: 3 });   // pins
    },
  },
};
