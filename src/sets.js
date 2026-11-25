// Sets = static world drawn in world coordinates (1920×1080 "stage"). The player draws the paper first,
// then applies the camera and calls draw() (behind actors) and front() (in front of actors).
import { PAL, ink, shape, ellipse, handText } from './ink.js';
import { storefront, lamp, atm, bill, cart } from './cast.js';

function ground(ctx, horizon = 600, color = '#8f7b58') {
  const W = 1920, H = 1080;
  const g = ctx.createLinearGradient(0, -200, 0, horizon); g.addColorStop(0, 'rgba(40,32,30,0.55)'); g.addColorStop(1, 'rgba(40,32,30,0)');
  ctx.fillStyle = g; ctx.fillRect(-400, -400, W + 800, horizon + 400);
  shape(ctx, [[-400, horizon], [W + 400, horizon - 20], [W + 400, H + 400], [-400, H + 400]], { fill: color, outline: 6, jit: 6 });
  for (let k = 0; k < 9; k++) { const yy = horizon + 10 + Math.pow(k / 8, 1.7) * (H - horizon); ink(ctx, [[-300, yy], [W * 0.5, yy - 6], [W + 300, yy + 4]], { size: 2.5 + k * 0.4, color: 'rgba(34,28,22,0.45)' }); }
}

function shelf(ctx, x, y, w, h, seed) {
  shape(ctx, [[x, y], [x + w, y], [x + w, y - h], [x, y - h]], { fill: '#5e5148', outline: 6, hatch: 0.2 });
  const cols = ['#a8442f', '#c89a3a', '#5e7a8c', '#6b7b45', '#d8cdb0', '#7d5a8c'];
  for (let row = 0; row < 4; row++) {
    const yy = y - 14 - row * (h / 4); ink(ctx, [[x + 6, yy + 4], [x + w - 6, yy + 4]], { size: 4 });
    let xx = x + 12, k = seed * 31 + row * 7;
    while (xx < x + w - 34) { k = (k * 9301 + 49297) % 233280; const bw = 22 + (k % 22), bh = 36 + (k % 30);
      const empty = row === 1 && xx > x + w * 0.45;            // half-empty shelf: people are stocking up
      if (!empty) shape(ctx, [[xx, yy], [xx + bw, yy], [xx + bw, yy - bh], [xx, yy - bh]], { fill: cols[k % cols.length], outline: 3, jit: 1.2 });
      xx += bw + 6; }
  }
}

export const SETS = {
  street: {
    paper: '#b7a682',
    anchors: { atm: [1080, 560], lamp: [1560, 300] },
    draw(ctx) {
      ground(ctx);
      storefront(ctx, 430, 650, 1.05); atm(ctx, 1080, 660, 0.9); lamp(ctx, 1500, 690, 1.25);
      cart(ctx, 1290, 900, 1.0);
      bill(ctx, 1000, 975, 0.9, 0.3); bill(ctx, 1700, 1010, 0.8, -0.4);
    },
  },
  supermarket: {
    paper: '#c4b48e',
    anchors: { counter: [1560, 760], terminal: [1470, 700] },
    draw(ctx) {
      shape(ctx, [[-400, -400], [2320, -400], [2320, 620], [-400, 620]], { fill: '#d2c39d', outline: 0, hatch: 0.08, hatchAngle: 90, gap: 40 });
      for (let x = -300; x < 2300; x += 160) ink(ctx, [[x, 620], [x + 2, -300]], { size: 2, color: 'rgba(34,28,22,0.18)' });
      shape(ctx, [[-400, 620], [2320, 610], [2320, 1500], [-400, 1500]], { fill: '#a99470', outline: 6 });
      for (let k = 0; k < 8; k++) { const yy = 640 + Math.pow(k / 7, 1.6) * 460; ink(ctx, [[-300, yy], [2300, yy - 4]], { size: 2 + k * 0.3, color: 'rgba(34,28,22,0.35)' }); }
      shelf(ctx, 60, 640, 300, 420, 1); shelf(ctx, 400, 640, 300, 420, 2); shelf(ctx, 740, 640, 300, 420, 3);
      // hanging sign
      ink(ctx, [[1380, -200], [1380, 120]], { size: 3 }); ink(ctx, [[1760, -200], [1760, 120]], { size: 3 });
      shape(ctx, [[1340, 110], [1800, 100], [1806, 210], [1346, 220]], { fill: PAL.cream, outline: 7 });
      handText(ctx, 'CARD ONLY', 1572, 160, { size: 70, color: PAL.red });
      // light strips
      for (const x of [200, 700, 1200]) shape(ctx, [[x, -60], [x + 260, -60], [x + 260, -44], [x, -44]], { fill: '#f3e9c8', outline: 3 });
    },
    front(ctx) {   // checkout counter in front of the shopkeeper
      shape(ctx, [[1290, 690], [1830, 680], [1840, 900], [1280, 905]], { fill: PAL.wood, outline: 7, hatch: 0.3, hatchAngle: 80 });
      shape(ctx, [[1270, 670], [1850, 662], [1852, 700], [1268, 708]], { fill: '#3b2a1b', outline: 5 });
      shape(ctx, [[1440, 610], [1500, 608], [1504, 672], [1438, 674]], { fill: '#3d4246', outline: 4 });                // card terminal
      shape(ctx, [[1450, 618], [1492, 617], [1492, 640], [1450, 641]], { fill: '#6fd08f', outline: 2 });
      shape(ctx, [[1660, 560], [1790, 556], [1796, 666], [1656, 668]], { fill: PAL.brown, outline: 5, hatch: 0.2 });   // register
      handText(ctx, 'EMPTY', 1726, 640, { size: 24, color: PAL.cream });
    },
  },
  desk: {   // chart inserts: a sheet of paper on a dark desk
    paper: '#3a2e25',
    anchors: {},
    draw(ctx) {
      for (let y = 0; y < 1080; y += 70) ink(ctx, [[-50, y], [1970, y + 8]], { size: 2.5, color: 'rgba(20,14,10,0.5)' });
      shape(ctx, [[230, 110], [1690, 90], [1710, 990], [220, 1000]], { fill: '#e6dabd', outline: 7, jit: 4 });
      shape(ctx, [[250, 990], [1700, 975], [1706, 1000], [240, 1012]], { fill: 'rgba(0,0,0,0.25)', outline: 0 });
    },
  },
};
