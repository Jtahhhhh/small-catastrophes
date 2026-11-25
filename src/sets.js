// Sets = static world drawn in world coordinates (1920×1080 "stage"). The player draws the paper first,
// then applies the camera and calls draw() (behind actors) and front() (in front of actors).
import { PAL, ink, shape, ellipse, handText } from './ink.js';
import { storefront, lamp, atm, bill, cart } from './cast.js';
import { sky, rooftops, meter, shelter, stall, crate, column, washer, tellerWindow, vault, windowNight, jar, tableTop } from './props.js';

// Per-shot variant (locale, signs, sky). The player calls applyVariant(shot) before drawing a shot's layers,
// so one set can play a U.S. street at night, an Indian street at dusk or a Nigerian market by day.
export const LOCALES = {
  us: { cur: '$', sign: 'CARD ONLY', atm: 'NO CASH', sky: 'night', shopSign: 'CARD ONLY', bankSign: 'CASH LIMIT', laundrySign: 'QUARTERS ONLY', hallSign: 'CITY HALL', busSign: 'BUS' },
  in: { cur: '₹', sign: 'NO CHANGE', atm: 'NO CASH', sky: 'dusk', shopSign: 'NO CHANGE', bankSign: 'OUT OF CASH', hallSign: 'RESERVE BANK', busSign: 'BUS' },
  ng: { cur: '₦', sign: 'POS HERE', atm: 'OUT OF CASH', sky: 'day', shopSign: 'POS HERE', bankSign: 'MAX ₦10,000', hallSign: 'SUPREME COURT', busSign: 'BUS' },
  se: { cur: 'kr', sign: 'KORT', atm: 'KORT', sky: 'day', shopSign: 'CARD ONLY', bankSign: 'NO CASH HANDLED', hallSign: 'RIKSBANK', busSign: 'BUSS' },
};
export const V = { ...LOCALES.us, locale: 'us' };
export function applyVariant(sh) { const v = sh.variant || {}; const loc = v.locale || 'us';
  for (const k of Object.keys(V)) delete V[k]; Object.assign(V, LOCALES[loc] || LOCALES.us, { locale: loc }, v); }

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
    far(ctx) { sky(ctx, V.sky); rooftops(ctx, V.sky); },   // moves slower than the street when the camera pans (parallax)
    draw(ctx) {
      ground(ctx, 600, '#8f7b58', true);
      storefront(ctx, 430, 650, 1.05, V.sign); atm(ctx, 1080, 660, 0.9, V.atm); lamp(ctx, 1500, 690, 1.25);
      if (!V.noCart) cart(ctx, 1290, 900, 1.0);
      bill(ctx, 1000, 975, 0.9, 0.3, V.cur); bill(ctx, 1700, 1010, 0.8, -0.4, V.cur);
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
      handText(ctx, V.shopSign, 1572, 160, { size: Math.min(70, 400 / (V.shopSign.length * 0.62)), color: PAL.red });
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
  bank: {   // branch interior: teller windows on a long counter, vault behind, queue in front
    paper: '#bfb08c',
    depth: y => 1.05 * (y - 370) / (1000 - 370),
    anchors: { teller: [1180, 880], teller2: [1560, 880] },
    draw(ctx) {
      shape(ctx, [[-400, -400], [2320, -400], [2320, 620], [-400, 620]], { fill: '#cfc2a0', outline: 0, hatch: 0.06, hatchAngle: 90, gap: 60 });
      for (const x of [120, 560]) column(ctx, x, 620, 1.0, 560);
      vault(ctx, 330, 360, 0.75);
      shape(ctx, [[-400, 620], [2320, 610], [2320, 1500], [-400, 1500]], { fill: '#9c8a68', outline: 6 });
      for (let k = 0; k < 9; k++) { const x = -300 + k * 300; ink(ctx, [[x, 620], [x - 260 + k * 40, 1500]], { size: 2.5, color: 'rgba(34,28,22,0.3)' }); }
      for (let k = 0; k < 6; k++) { const yy = 640 + Math.pow(k / 5, 1.6) * 440; ink(ctx, [[-300, yy], [2300, yy - 4]], { size: 2 + k * 0.3, color: 'rgba(34,28,22,0.3)' }); }
      ink(ctx, [[1370, -200], [1370, 70]], { size: 3 }); ink(ctx, [[1730, -200], [1730, 70]], { size: 3 });
      shape(ctx, [[1330, 60], [1770, 52], [1776, 150], [1336, 158]], { fill: PAL.cream, outline: 7 });
      handText(ctx, V.bankSign, 1553, 105, { size: Math.min(60, 400 / (V.bankSign.length * 0.62)), color: PAL.red });
    },
    front(ctx) {
      shape(ctx, [[900, 745], [1960, 737], [1970, 910], [890, 915]], { fill: PAL.wood, outline: 7, hatch: 0.3, hatchAngle: 80 });
      shape(ctx, [[880, 722], [1980, 714], [1982, 752], [878, 760]], { fill: '#3b2a1b', outline: 5 });
      tellerWindow(ctx, 1180, 722, 1.0, ''); tellerWindow(ctx, 1560, 718, 1.0, '');
    },
  },
  home: {   // kitchen at night: window, shelf with the savings jar, table
    paper: '#a89874',
    depth: y => 1.05 * (y - 370) / (1000 - 370),
    anchors: { jar: [1000, 410], table: [1450, 820] },
    draw(ctx) {
      shape(ctx, [[-400, -400], [2320, -400], [2320, 640], [-400, 640]], { fill: '#b9a57e', outline: 0, hatch: 0.1, hatchAngle: 60, gap: 34 });
      windowNight(ctx, 180, 150, 380, 320, V.sky === 'day' ? 'day' : 'night');
      shape(ctx, [[640, 420], [1120, 414], [1122, 440], [642, 446]], { fill: PAL.wood, outline: 5 });     // shelf
      jar(ctx, 1000, 420, 1.1, V.cur, !V.jarEmpty); jar(ctx, 760, 420, 0.7, '', false);
      ink(ctx, [[960, -200], [960, 80]], { size: 3 });
      shape(ctx, [[900, 80], [1020, 80], [1050, 140], [870, 140]], { fill: '#f0c96a', outline: 5 });            // hanging lamp
      shape(ctx, [[-400, 640], [2320, 630], [2320, 1500], [-400, 1500]], { fill: '#7d6648', outline: 6, hatch: 0.12, hatchAngle: 2, gap: 40 });
      shape(ctx, [[1150, 640], [1760, 632], [1780, 680], [1130, 690]], { fill: PAL.wood, outline: 6, hatch: 0.2 });   // table top
      for (const x of [1170, 1730]) shape(ctx, [[x - 10, 688], [x + 10, 686], [x + 10, 830], [x - 10, 832]], { fill: PAL.brown, outline: 4 });
      shape(ctx, ellipse(1300, 630, 46, 14, 14, 0.1, 931), { fill: '#e8dcc0', outline: 4 });                    // plate
    },
  },
  busstop: {   // outdoor: shelter, parking meter, road
    paper: '#bdae8a',
    depth: y => 1.15 * (y - 521) / (985 - 521),
    anchors: { meter: [430, 520], shelter: [1350, 700] },
    far(ctx) { sky(ctx, V.sky); rooftops(ctx, V.sky, 600, 9); },
    draw(ctx) {
      ground(ctx, 600, '#8a7a5c', true);
      shape(ctx, [[-1200, 690], [3100, 680], [3100, 720], [-1200, 730]], { fill: '#6d6150', outline: 5 });     // curb
      shelter(ctx, 1350, 700, 1.0, V.busSign);
      meter(ctx, 430, 780, 1.1, 'COINS'); meter(ctx, 200, 790, 1.1, 'COINS');
      bill(ctx, 760, 990, 0.8, 0.5, V.cur);
    },
  },
  laundromat: {
    paper: '#c7b993',
    depth: y => 1.05 * (y - 370) / (1000 - 370),
    anchors: {},
    draw(ctx) {
      shape(ctx, [[-400, -400], [2320, -400], [2320, 650], [-400, 650]], { fill: '#d8ccaa', outline: 0, hatch: 0.08, hatchAngle: 0, gap: 50 });
      for (let n = 0; n < 9; n++) washer(ctx, -100 + n * 240, 650, 1.05, n);
      shape(ctx, [[-400, 650], [2320, 640], [2320, 1500], [-400, 1500]], { fill: '#a49674', outline: 6 });
      for (let x = -300; x < 2300; x += 120) ink(ctx, [[x, 650], [x - 400 + x * 0.2, 1500]], { size: 2, color: 'rgba(34,28,22,0.22)' });
      const t = V.laundrySign || 'QUARTERS ONLY';
      ink(ctx, [[700, -200], [700, 110]], { size: 3 }); ink(ctx, [[1220, -200], [1220, 110]], { size: 3 });
      shape(ctx, [[660, 100], [1260, 92], [1266, 200], [666, 208]], { fill: PAL.cream, outline: 7 });
      handText(ctx, t, 963, 150, { size: Math.min(64, 540 / (t.length * 0.62)), color: PAL.red });
    },
  },
  market: {   // open-air market: striped stalls across the back, crates in front
    paper: '#c4b28a',
    depth: y => 1.15 * (y - 521) / (985 - 521),
    anchors: {},
    far(ctx) { sky(ctx, V.sky); rooftops(ctx, V.sky, 600, 13); },
    draw(ctx) {
      ground(ctx, 610, '#9a8258', true);
      const cols = [PAL.red, PAL.mustard, PAL.moss, '#3f5560', PAL.red];
      [-150, 300, 750, 1200, 1650, 2100].forEach((x, n) => stall(ctx, x, 700, 0.95, cols[n % cols.length], n + 1, n % 2 ? 'goods' : 'fruit'));
      bill(ctx, 980, 1000, 0.8, -0.3, V.cur);
    },
    front(ctx) { crate(ctx, 120, 1100, 1.3, 1); crate(ctx, 1840, 1110, 1.4, 2); },
  },
  hall: {   // civic building: steps, columns, banner (city hall, central bank, supreme court)
    paper: '#c2b48f',
    depth: y => 1.15 * (y - 521) / (985 - 521),
    anchors: {},
    far(ctx) { sky(ctx, V.sky); },
    draw(ctx) {
      shape(ctx, [[260, 120], [1660, 110], [1660, 620], [260, 630]], { fill: '#d6cbb0', outline: 7, hatch: 0.06, hatchAngle: 90, gap: 40 });
      shape(ctx, [[220, 130], [960, -60], [1700, 120]], { fill: '#cfc3a5', outline: 8, smooth: false });
      for (let x = 360; x <= 1560; x += 200) column(ctx, x, 620, 0.9, 470);
      shape(ctx, [[560, 90], [1360, 82], [1366, 150], [566, 158]], { fill: PAL.cream, outline: 6 });
      handText(ctx, V.hallSign, 963, 120, { size: Math.min(56, 760 / (V.hallSign.length * 0.62)), color: PAL.ink });
      for (let k = 0; k < 4; k++) shape(ctx, [[160 - k * 40, 620 + k * 26], [1760 + k * 40, 616 + k * 26], [1760 + k * 40, 646 + k * 26], [160 - k * 40, 650 + k * 26]], { fill: '#cbbf9f', outline: 4 });
      ground(ctx, 724, '#8f7b58', true);
    },
  },
  table: {   // insert shots: a tabletop seen from above, hero prop drawn by the player
    paper: '#5a4330',
    depth: () => 1,
    anchors: {},
    draw(ctx) { tableTop(ctx, -300, -200, 2220, 1280); },
  },

  endcard: {   // YouTube end screen: two 16:9 boxes for "watch next" elements, room for Mortimer below
    paper: '#b7a682',
    depth: () => 0.8,
    anchors: {},
    draw(ctx) {
      shape(ctx, [[-400, -400], [2320, -400], [2320, 1500], [-400, 1500]], { fill: 'rgba(40,32,28,0.35)', outline: 0 });
      for (const x0 of [150, 1050]) { shape(ctx, [[x0 - 14, 226], [x0 + 734, 220], [x0 + 738, 664], [x0 - 10, 670]], { fill: '#2a211b', outline: 8 });
        for (let k = 0; k < 4; k++) ink(ctx, [[x0 + 40 + k * 170, 446], [x0 + 110 + k * 170, 446]], { size: 4, color: 'rgba(230,220,190,0.25)' }); }
      ground(ctx, 1000, '#8f7b58', true);
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
