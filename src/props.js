// Props for the v0.4 sets and insert shots. Same ink/shape vocabulary as cast.js; every prop is drawn
// around its base point (x, y) at scale s so sets can place it on their floor line.
import { PAL, ink, shape, ellipse, dot, handText } from './ink.js';

const fit = (text, w, max) => Math.min(max, w / (Math.max(1, text.length) * 0.74));
const at = (c, x, y, s, fn) => { c.save(); c.translate(x, y); c.scale(s, s); fn(); c.restore(); };

// ---------- sky (behind everything outdoors) ----------
export function sky(c, kind = 'night', horizon = 600) {
  const g = c.createLinearGradient(0, -300, 0, horizon);
  const K = { night: ['rgba(40,32,30,0.6)', 'rgba(40,32,30,0)'], dusk: ['rgba(150,80,50,0.45)', 'rgba(220,170,100,0.05)'], day: ['rgba(140,160,160,0.25)', 'rgba(240,225,190,0)'] }[kind];
  g.addColorStop(0, K[0]); g.addColorStop(1, K[1]); c.fillStyle = g; c.fillRect(-1200, -600, 4400, horizon + 600);
  if (kind === 'night') shape(c, ellipse(1650, 120, 46, 46, 20, 0.05, 901), { fill: '#efe2b8', outline: 4 });
  if (kind === 'day') shape(c, ellipse(1650, 120, 60, 60, 22, 0.05, 902), { fill: '#f2d488', outline: 4 });
  if (kind === 'dusk') shape(c, ellipse(1500, 430, 90, 90, 24, 0.05, 903), { fill: '#e0a060', outline: 4 });
}

export function rooftops(c, kind = 'night', y0 = 600, seed = 5) {
  let x = -800, k = seed; const lit = kind !== 'day';
  while (x < 2800) { k = (k * 9301 + 49297) % 233280; const w = 120 + k % 140, h = 140 + (k >> 3) % 220;
    shape(c, [[x, y0], [x + w, y0], [x + w, y0 - h], [x + w * 0.5, y0 - h - 40], [x, y0 - h]], { fill: 'rgba(110,96,76,0.45)', outline: 3, inkColor: 'rgba(34,28,22,0.45)', hatch: 0.12, gap: 14 });
    if (lit) for (let wy = y0 - h + 30; wy < y0 - 40; wy += 50) for (let wx = x + 18; wx < x + w - 30; wx += 44) if ((wx * 7 + wy) % 7 < 2) shape(c, [[wx, wy], [wx + 16, wy], [wx + 16, wy + 20], [wx, wy + 20]], { fill: 'rgba(217,184,102,0.55)', outline: 0, jit: 1 });
    x += w + 10; }
}

// ---------- outdoor ----------
export const meter = (c, x, y, s = 1, text = 'COINS') => at(c, x, y, s, () => {
  shape(c, [[-8, 0], [8, 0], [8, -200], [-8, -200]], { fill: PAL.slate, outline: 5 });
  shape(c, ellipse(0, -250, 42, 56, 18, 0.06, 811), { fill: '#7d868a', outline: 6, hatch: 0.25 });
  shape(c, ellipse(0, -258, 26, 22, 14, 0.06, 812), { fill: '#e8dcc0', outline: 4 });
  handText(c, text, 0, -258, { size: fit(text, 44, 16), color: PAL.red });
  shape(c, [[-4, -222], [4, -222], [4, -208], [-4, -208]], { fill: PAL.ink, outline: 2 });
});

export const shelter = (c, x, y, s = 1, text = 'BUS') => at(c, x, y, s, () => {
  for (const px of [-260, 260]) shape(c, [[px - 8, 0], [px + 8, 0], [px + 8, -380], [px - 8, -380]], { fill: PAL.night, outline: 5 });
  shape(c, [[-300, -380], [300, -392], [306, -420], [-302, -410]], { fill: PAL.night, outline: 6 });
  shape(c, [[-250, -360], [250, -368], [248, -120], [-248, -116]], { fill: 'rgba(200,210,205,0.22)', outline: 4, hatch: 0.1, gap: 30 });
  shape(c, [[-200, -110], [200, -114], [200, -96], [-200, -92]], { fill: PAL.wood, outline: 4 });   // bench
  shape(c, [[330, 0], [346, 0], [346, -440], [330, -440]], { fill: PAL.night, outline: 5 });
  shape(c, ellipse(338, -470, 50, 50, 18, 0.05, 813), { fill: PAL.cream, outline: 6 });
  handText(c, text, 338, -470, { size: fit(text, 80, 34), color: PAL.red });
});

export const stall = (c, x, y, s = 1, col = PAL.red, seed = 1, goods = 'fruit') => at(c, x, y, s, () => {
  for (const px of [-170, 170]) shape(c, [[px - 7, 0], [px + 7, 0], [px + 7, -330], [px - 7, -330]], { fill: PAL.wood, outline: 4 });
  const stripes = 6; for (let n = 0; n < stripes; n++) { const x0 = -200 + n * 400 / stripes, x1 = x0 + 400 / stripes;
    shape(c, [[x0, -380], [x1, -380], [x1 + 6, -300], [x0 + 6, -300]], { fill: n % 2 ? PAL.cream : col, outline: 4, hatch: n % 2 ? 0 : 0.2 }); }
  shape(c, [[-190, -150], [190, -154], [196, -110], [-196, -106]], { fill: PAL.wood, outline: 5, hatch: 0.3 });
  shape(c, [[-180, -106], [180, -108], [176, 0], [-176, 0]], { fill: '#5e4a35', outline: 5, hatch: 0.3, hatchAngle: 80 });
  const cols = goods === 'fruit' ? ['#c8642e', '#d8a23a', '#7a8a3a', '#a8442f'] : ['#5e7a8c', '#7d5a8c', '#c89a3a', '#6b7b45'];
  let k = seed * 17; for (let gx = -160; gx < 160; gx += 30) for (let gy = 0; gy < 2; gy++) { k = (k * 9301 + 49297) % 233280;
    shape(c, ellipse(gx + gy * 14, -166 - gy * 22, 16, 14, 10, 0.15, 820 + (k % 40)), { fill: cols[k % cols.length], outline: 3 }); }
});

export const crate = (c, x, y, s = 1, seed = 1) => at(c, x, y, s, () => {
  shape(c, [[-70, 0], [70, -2], [66, -90], [-66, -88]], { fill: PAL.wood, outline: 5, hatch: 0.3, hatchAngle: 10 + seed * 13 });
  ink(c, [[-66, -44], [68, -46]], { size: 3 });
});

export const column = (c, x, y, s = 1, h = 520) => at(c, x, y, s, () => {
  shape(c, [[-46, 0], [46, 0], [40, -h], [-40, -h]], { fill: '#d9cfb6', outline: 6, hatch: 0.08, hatchAngle: 90, gap: 22 });
  shape(c, [[-62, -h], [62, -h], [62, -h - 30], [-62, -h - 30]], { fill: '#cbbf9f', outline: 5 });
  shape(c, [[-60, 0], [60, 0], [60, -26], [-60, -26]], { fill: '#cbbf9f', outline: 5 });
});

// ---------- indoor ----------
export const washer = (c, x, y, s = 1, seed = 1) => at(c, x, y, s, () => {
  shape(c, [[-90, 0], [90, -2], [88, -220], [-88, -218]], { fill: '#e6ddc8', outline: 6 });
  shape(c, [[-88, -218], [88, -220], [88, -190], [-88, -188]], { fill: '#c9bfa5', outline: 4 });
  shape(c, ellipse(0, -100, 58, 58, 20, 0.05, 830 + seed), { fill: '#6a7c84', outline: 7, hatch: 0.35, gap: 8 });
  shape(c, ellipse(0, -100, 40, 40, 16, 0.05, 840 + seed), { fill: 'rgba(200,220,220,0.35)', outline: 3 });
  shape(c, [[50, -212], [72, -212], [72, -196], [50, -196]], { fill: PAL.ink, outline: 2 });   // coin slot
});

export const tellerWindow = (c, x, y, s = 1, text = '') => at(c, x, y, s, () => {
  shape(c, [[-130, 0], [130, 0], [130, -260], [-130, -260]], { fill: 'rgba(200,210,205,0.18)', outline: 6 });
  for (let bx = -110; bx <= 110; bx += 32) ink(c, [[bx, -258], [bx + 2, -4]], { size: 5, color: PAL.night });
  if (text) { shape(c, [[-120, -300], [120, -306], [122, -258], [-118, -254]], { fill: PAL.cream, outline: 5 });
    handText(c, text, 0, -280, { size: fit(text, 220, 30), color: PAL.red }); }
});

export const vault = (c, x, y, s = 1) => at(c, x, y, s, () => {
  shape(c, ellipse(0, 0, 210, 210, 30, 0.03, 850), { fill: '#7d868a', outline: 9, hatch: 0.2 });
  shape(c, ellipse(0, 0, 160, 160, 26, 0.03, 851), { fill: '#8f989b', outline: 6 });
  for (let n = 0; n < 6; n++) { const a = n * Math.PI / 3; ink(c, [[0, 0], [Math.cos(a) * 80, Math.sin(a) * 80]], { size: 9 });
    shape(c, ellipse(Math.cos(a) * 84, Math.sin(a) * 84, 13, 13, 10, 0.1, 852 + n), { fill: PAL.ink, outline: 2 }); }
  shape(c, ellipse(0, 0, 26, 26, 12, 0.05, 860), { fill: PAL.slate, outline: 5 });
});

export const windowNight = (c, x, y, w = 360, h = 300, kind = 'night') => {
  shape(c, [[x, y], [x + w, y - 4], [x + w + 4, y + h], [x + 2, y + h + 4]], { fill: kind === 'night' ? '#2c3440' : '#d8e0d4', outline: 8 });
  if (kind === 'night') shape(c, ellipse(x + w * 0.72, y + h * 0.3, 30, 30, 14, 0.05, 870), { fill: '#efe2b8', outline: 3 });
  ink(c, [[x + w / 2, y], [x + w / 2 + 2, y + h]], { size: 6 }); ink(c, [[x, y + h / 2], [x + w, y + h / 2 - 2]], { size: 6 });
};

export const jar = (c, x, y, s = 1, cur = '$', full = true) => at(c, x, y, s, () => {
  shape(c, [[-46, 0], [46, 0], [52, -120], [40, -140], [-40, -140], [-52, -120]], { fill: 'rgba(200,215,210,0.35)', outline: 5 });
  shape(c, [[-44, -140], [44, -140], [44, -162], [-44, -162]], { fill: PAL.mustard, outline: 4 });
  if (full) for (let n = 0; n < 5; n++) shape(c, [[-38, -12 - n * 20], [38, -16 - n * 20], [36, -30 - n * 20], [-36, -26 - n * 20]], { fill: PAL.bill, outline: 3 });
  handText(c, cur, 0, -70, { size: 34, color: PAL.ink });
});

export const tableTop = (c, x0, y0, x1, y1) => {
  shape(c, [[x0, y0], [x1, y0 - 6], [x1 + 6, y1], [x0 - 4, y1 + 4]], { fill: PAL.wood, outline: 7, hatch: 0.18, hatchAngle: 4, gap: 22 });
  for (let yy = y0 + 70; yy < y1; yy += 90) ink(c, [[x0 + 10, yy], [x1 - 10, yy - 3]], { size: 2.5, color: 'rgba(34,28,22,0.4)' });
};

// ---------- insert-shot hero props (drawn large, centred on the table) ----------
export const HERO = {
  wallet: (c, V) => {
    shape(c, [[-420, -40], [420, -60], [430, 300], [-410, 316]], { fill: PAL.brown, outline: 9, hatch: 0.25 });
    for (let n = 0; n < 4; n++) shape(c, [[-360 + n * 40, -170 + n * 12], [300 + n * 20, -190 + n * 10], [310 + n * 20, 30], [-350 + n * 40, 50]], { fill: PAL.bill, outline: 5, hatch: 0.12 });
    handText(c, V.cur, 0, -80, { size: 90, color: PAL.ink });
    shape(c, [[-410, 60], [430, 40], [430, 300], [-410, 316]], { fill: '#5a3e27', outline: 8, hatch: 0.3 });
    ink(c, [[-380, 90], [400, 72]], { size: 3, color: PAL.cream });
  },
  ledger: (c, V, text = []) => {
    shape(c, [[-560, -300], [0, -330], [10, 330], [-550, 340]], { fill: '#efe4c8', outline: 8 });
    shape(c, [[0, -330], [560, -300], [550, 340], [10, 330]], { fill: '#f2e8cf', outline: 8 });
    for (let yy = -240; yy < 300; yy += 60) { ink(c, [[-520, yy], [-30, yy - 6]], { size: 2, color: 'rgba(60,80,120,0.4)' }); ink(c, [[40, yy - 6], [520, yy]], { size: 2, color: 'rgba(60,80,120,0.4)' }); }
    text.forEach((t, n) => handText(c, t, n < 4 ? -280 : 280, -210 + (n % 4) * 120, { size: 44, weight: 'normal', color: n % 2 ? PAL.red : PAL.ink }));
  },
  phone: (c, V, text = []) => {
    shape(c, [[-230, -440], [230, -446], [236, 440], [-226, 446]], { fill: PAL.night, outline: 9 });
    shape(c, [[-196, -380], [196, -384], [200, 360], [-192, 364]], { fill: '#dfe6dc', outline: 5 });
    text.forEach((t, n) => handText(c, t, 2, -260 + n * 110, { size: fit(t, 360, n ? 46 : 60), color: n ? PAL.ink : PAL.red }));
  },
  atmScreen: (c, V, text = ['NO CASH']) => {
    shape(c, [[-640, -380], [640, -396], [650, 400], [-630, 410]], { fill: PAL.slate, outline: 10, hatch: 0.25 });
    shape(c, [[-500, -290], [500, -300], [494, 140], [-494, 148]], { fill: '#2f3d2f', outline: 8 });
    text.forEach((t, n) => handText(c, t, 0, -160 + n * 120, { size: fit(t, 900, n ? 60 : 96), color: '#a9c58a' }));
    shape(c, [[-300, 250], [300, 244], [300, 270], [-300, 276]], { fill: PAL.ink, outline: 4 });
  },
  tipjar: (c, V, text = ['TIPS']) => {
    shape(c, [[-220, 360], [220, 360], [250, -200], [190, -300], [-190, -300], [-250, -200]], { fill: 'rgba(200,215,210,0.35)', outline: 9 });
    shape(c, [[-120, -120], [130, -130], [126, 20], [-116, 30]], { fill: PAL.cream, outline: 6 });
    handText(c, text[0], 4, -50, { size: fit(text[0], 220, 70), color: PAL.red });
    shape(c, ellipse(-40, 320, 40, 14, 14, 0.1, 880), { fill: '#c9a24a', outline: 4 });
  },
  notes: (c, V, text = []) => {      // a fan of banknotes in the local currency
    for (let n = 0; n < 5; n++) { c.save(); c.rotate(-0.35 + n * 0.17); c.translate(0, -60);
      shape(c, [[-420, -170], [420, -186], [430, 170], [-410, 184]], { fill: PAL.bill, outline: 8, hatch: 0.12 });
      shape(c, ellipse(0, 0, 90, 100, 18, 0.06, 890 + n), { fill: '#b7c49f', outline: 5 });
      handText(c, V.cur, 0, 4, { size: 110 }); c.restore(); }
    if (text[0]) { shape(c, [[-500, 190], [500, 170], [510, 320], [-490, 336]], { fill: PAL.cream, outline: 7 }); handText(c, text[0], 4, 252, { size: fit(text[0], 900, 80), color: PAL.red }); }
  },
  scrip: (c, V, text = ['GOOD FOR ONE LOAF']) => {
    shape(c, [[-560, -260], [560, -280], [570, 260], [-550, 280]], { fill: '#e8dcb0', outline: 9, hatch: 0.06 });
    shape(c, [[-500, -210], [500, -226], [508, 210], [-494, 226]], { fill: 'rgba(0,0,0,0)', outline: 4 });
    handText(c, 'TOWN SCRIP', 0, -130, { size: 84, color: PAL.red });
    handText(c, text[0], 0, 10, { size: fit(text[0], 900, 64) });
    handText(c, '— signed, the Baker —', 0, 140, { size: 40, weight: 'normal' });
  },
};
