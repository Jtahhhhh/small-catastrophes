// Original cast + props. Each character = list of parts {name, pivot, draw(ctx)} in local coords
// (origin at feet, y up = negative). Parts are separate so they can be rigged as paper cut-outs.
import { PAL, ellipse, ink, shape, dot, handText } from './ink.js';

const P = (pts) => pts.map(([x, y]) => [x, y]);
export const POSE = { mouth: 0, viseme: 0, blink: 0, look: 0, crack: false };

// Mouth shapes driven by the narration: 0 closed, 1 open (A), 2 round (O/U), 3 wide (E/S)
export function drawMouth(c, x, y, k = 1) {
  const a = POSE.mouth, v = POSE.viseme;
  if (a <= 0.15 || v === 0) { ink(c, [[x - 12 * k, y], [x, y + 3 * k], [x + 14 * k, y - 2 * k]], { size: 3.5 * k }); return; }
  const dark = '#3a1f1a';
  if (v === 2) shape(c, ellipse(x, y, (6 + a * 3) * k, (8 + a * 7) * k, 12, 0.1, 49), { fill: dark, outline: 3 * k });
  else if (v === 3) { shape(c, ellipse(x, y, (14 + a * 4) * k, (3 + a * 4) * k, 12, 0.08, 48), { fill: dark, outline: 3 * k });
    ink(c, [[x - 10 * k, y - 1 * k], [x + 10 * k, y - 1 * k]], { size: 2 * k, color: '#f1ead8' }); }
  else shape(c, ellipse(x, y, (9 + a * 4) * k, (3 + a * 11) * k, 12, 0.1, 47), { fill: dark, outline: 3 * k });
}

// ---------------- MORTIMER PENNY: gaunt bookkeeper, narrator ----------------
export const MORTIMER = [
  { name: 'leg_back', pivot: [10, -165], draw: c => {
      shape(c, P([[4, -170], [18, -170], [16, -8], [8, -8]]), { fill: PAL.night, outline: 4, hatch: 0 });
      shape(c, ellipse(18, -6, 22, 9, 14, 0.1, 21), { fill: PAL.ink, outline: 3 }); } },
  { name: 'leg_front', pivot: [-14, -165], draw: c => {
      shape(c, P([[-22, -170], [-8, -170], [-12, -8], [-20, -8]]), { fill: PAL.night, outline: 4 });
      shape(c, ellipse(-24, -6, 22, 9, 14, 0.1, 22), { fill: PAL.ink, outline: 3 }); } },
  { name: 'arm_back', pivot: [48, -372], draw: c => {
      shape(c, P([[40, -378], [62, -372], [86, -236], [68, -228]]), { fill: '#41474b', hatch: 0.35, outline: 5 });
      shape(c, P([[66, -226], [118, -232], [126, -146], [72, -140]]), { fill: PAL.brown, outline: 5, hatch: 0.15 }); // ledger, hanging at his side
      ink(c, P([[76, -214], [114, -218]]), { size: 2.5 }); ink(c, P([[78, -198], [116, -202]]), { size: 2.5 });
      handText(c, '$', 99, -170, { size: 24, color: PAL.mustard });
      shape(c, ellipse(80, -228, 13, 11, 12, 0.15, 31), { fill: PAL.skin, outline: 3 });                         // fist on the top edge
      ink(c, P([[72, -226], [88, -232], [94, -222]]), { size: 3 });                                                  // thumb over the cover
    } },
  { name: 'coat', pivot: [0, -300], draw: c => {
      shape(c, P([[-52, -384], [-20, -398], [22, -398], [54, -382], [66, -250], [82, -150], [40, -158], [-6, -150], [-50, -160], [-80, -148], [-64, -260]]),
        { fill: PAL.coat, hatch: 0.28, hatchAngle: -50, outline: 7 });
      ink(c, P([[-2, -395], [4, -300], [-2, -158]]), { size: 4 });                  // front seam
      [[6, -350], [8, -300], [6, -250]].forEach(([x, y]) => dot(c, x + 10, y, 4.5));    // buttons
      ink(c, P([[-40, -250], [-12, -246]]), { size: 3 });                                // pocket
    } },
  { name: 'scarf', pivot: [0, -395], draw: c => {
      shape(c, P([[-34, -404], [36, -404], [32, -384], [-30, -382]]), { fill: PAL.red, outline: 5, hatch: 0.2 });
      shape(c, P([[18, -392], [34, -390], [44, -300], [24, -296]]), { fill: PAL.red, outline: 5, hatch: 0.25, hatchAngle: 30 });
      ink(c, P([[26, -298], [24, -282]]), { size: 2.5 }); ink(c, P([[36, -299], [40, -284]]), { size: 2.5 });
    } },
  { name: 'head', pivot: [0, -410], draw: c => {
      shape(c, P([[-8, -412], [8, -412], [8, -398], [-8, -398]]), { fill: PAL.skin, outline: 3, smooth: false });
      shape(c, ellipse(0, -478, 58, 74, 24, 0.07, 41), { fill: PAL.skin, outline: 7 });
      shape(c, ellipse(-26, -470, 22, 18, 14, 0.1, 42), { fill: 'rgba(90,70,60,0.35)', outline: 0, hatch: 0.25, gap: 5 });
      shape(c, ellipse(26, -470, 22, 18, 14, 0.1, 43), { fill: 'rgba(90,70,60,0.35)', outline: 0, hatch: 0.25, gap: 5 });
      for (const sx of [-1, 1]) {                                                        // spectacles
        shape(c, ellipse(sx * 27, -482, 24, 24, 18, 0.05, 44 + sx), { fill: '#f1ead8', outline: 6 });
        if (POSE.blink > 0.5) ink(c, P([[sx * 27 - 14, -482], [sx * 27 + 14, -481]]), { size: 4 });
        else dot(c, sx * 27 + 4 + POSE.look * 8, -480, 5.5);
      }
      ink(c, P([[-4, -484], [4, -484]]), { size: 4 });
      drawMouth(c, 1, -428);                                                              // mouth (visemes)
      ink(c, P([[-6, -548], [-14, -572], [-4, -590]]), { size: 4 });                      // hair tuft
      ink(c, P([[4, -550], [10, -578], [24, -586]]), { size: 4 });
      ink(c, P([[-2, -551], [0, -580]]), { size: 3.5 });
    } },
  { name: 'arm_front', pivot: [-46, -372], draw: c => {
      shape(c, P([[-56, -376], [-34, -380], [-24, -262], [-42, -256]]), { fill: '#41474b', hatch: 0.3, outline: 5 });
      shape(c, ellipse(-32, -246, 12, 14, 12, 0.15, 51), { fill: PAL.skin, outline: 3 });                        // open hand
      ink(c, P([[-22, -252], [-14, -244]]), { size: 3 });                                                            // thumb
    } },
];

// ---------------- MRS. GRISTLE: stout shopkeeper ----------------
export const GRISTLE = [
  { name: 'legs', pivot: [0, -60], draw: c => {
      shape(c, P([[-30, -70], [-14, -70], [-16, -6], [-30, -6]]), { fill: PAL.night, outline: 4 });
      shape(c, P([[12, -70], [28, -70], [30, -6], [16, -6]]), { fill: PAL.night, outline: 4 });
      shape(c, ellipse(-28, -5, 20, 8, 12, 0.1, 61), { fill: PAL.ink, outline: 3 });
      shape(c, ellipse(26, -5, 20, 8, 12, 0.1, 62), { fill: PAL.ink, outline: 3 }); } },
  { name: 'body', pivot: [0, -160], draw: c => {
      shape(c, ellipse(0, -160, 96, 110, 26, 0.06, 63), { fill: PAL.mustard, hatch: 0.22, hatchAngle: -35, outline: 7 });
      shape(c, P([[-52, -200], [52, -200], [62, -70], [-60, -72]]), { fill: PAL.cream, outline: 5, hatch: 0.1 });   // apron
      ink(c, P([[-30, -120], [28, -118]]), { size: 3 });
    } },
  { name: 'arm_l', pivot: [-70, -226], draw: c => {
      shape(c, P([[-86, -232], [-58, -236], [-66, -150], [-92, -146]]), { fill: '#9a7029', hatch: 0.3, outline: 6 });
      shape(c, ellipse(-80, -136, 16, 14, 12, 0.15, 64), { fill: PAL.skin, outline: 3 }); } },
  { name: 'arm_r', pivot: [70, -226], draw: c => {
      shape(c, P([[58, -236], [86, -232], [94, -146], [66, -150]]), { fill: '#9a7029', hatch: 0.3, outline: 6 });
      shape(c, ellipse(80, -136, 16, 14, 12, 0.15, 65), { fill: PAL.skin, outline: 3 }); } },
  { name: 'head', pivot: [0, -262], draw: c => {
      shape(c, ellipse(0, -318, 56, 52, 22, 0.08, 66), { fill: PAL.skin, outline: 7 });
      shape(c, ellipse(0, -384, 30, 24, 14, 0.12, 67), { fill: PAL.brown, outline: 5, hatch: 0.4 });          // bun
      shape(c, P([[-56, -340], [-20, -372], [24, -372], [56, -340], [40, -352], [-40, -352]]), { fill: PAL.brown, outline: 5, hatch: 0.4 });
      dot(c, -20 + POSE.look * 5, -322, 5); dot(c, 22 + POSE.look * 5, -322, 5);
      ink(c, P([[-34, -338], [-8, -332]]), { size: 6 }); ink(c, P([[8, -332], [34, -340]]), { size: 6 });     // stern brows
      ink(c, P([[0, -318], [-6, -300], [4, -300]]), { size: 3 });
      ink(c, P([[-14, -286], [0, -290], [14, -284]]), { size: 3.5 });
    } },
];

// ---------------- TALLY: the crow ----------------
export const TALLY = [
  { name: 'legs', pivot: [0, -20], draw: c => { ink(c, P([[-8, -30], [-10, 0], [-20, 2]]), { size: 3 }); ink(c, P([[8, -30], [10, 0], [20, 2]]), { size: 3 }); } },
  { name: 'body', pivot: [0, -60], draw: c => {
      shape(c, P([[-50, -70], [-10, -100], [36, -90], [50, -50], [20, -26], [-30, -30], [-80, -40]]), { fill: PAL.crow, hatch: 0.5, outline: 6, gap: 6 });
      shape(c, P([[-20, -80], [24, -78], [10, -46], [-30, -48]]), { fill: '#3a342f', hatch: 0.35, hatchAngle: 20, outline: 4, gap: 6 }); } },
  { name: 'head', pivot: [36, -96], draw: c => {
      shape(c, ellipse(46, -112, 26, 24, 16, 0.08, 71), { fill: PAL.crow, outline: 6, hatch: 0.4, gap: 6 });
      shape(c, P([[66, -118], [100, -108], [66, -102]]), { fill: PAL.mustard, outline: 4, smooth: false });
      shape(c, ellipse(104, -106, 12, 12, 12, 0.08, 72), { fill: '#c9a24a', outline: 3 });                    // coin in beak
      shape(c, ellipse(50, -118, 7, 7, 10, 0.1, 73), { fill: '#f1ead8', outline: 2.5 }); dot(c, 51, -118, 3);
    } },
];

export function drawCast(ctx, parts, x, y, s = 1, { explode = 0, pivots = false, rot = {}, flip = false, lean = 0 } = {}) {
  ctx.save(); ctx.translate(x, y); if (lean) ctx.rotate(lean); ctx.scale(flip ? -s : s, s);
  parts.forEach((p, i) => {
    ctx.save();
    const a = rot[p.name]; if (a) { ctx.translate(p.pivot[0], p.pivot[1]); ctx.rotate(a); ctx.translate(-p.pivot[0], -p.pivot[1]); }
    if (explode) { const ang = (i / parts.length) * Math.PI * 2; ctx.translate(Math.cos(ang) * explode, Math.sin(ang) * explode * 0.6); }
    p.draw(ctx);
    if (pivots) { ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(p.pivot[0], p.pivot[1], 6, 0, 7); ctx.fill(); }
    ctx.restore();
  });
  ctx.restore();
}

// ---------------- PROPS ----------------
export function atm(c, x, y, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  shape(c, P([[-70, 0], [72, -4], [66, -260], [-64, -252]]), { fill: PAL.slate, hatch: 0.3, outline: 7 });
  shape(c, P([[-46, -220], [44, -224], [42, -160], [-44, -156]]), { fill: '#2f3d2f', outline: 5 });
  handText(c, 'NO CASH', 0, -190, { size: 22, color: '#a9c58a' });
  for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) shape(c, ellipse(-24 + k * 24, -128 + r * 22, 8, 7, 8, 0.2, 80 + r * 3 + k), { fill: PAL.cream, outline: 2.5 });
  shape(c, P([[-40, -50], [40, -52], [40, -40], [-40, -38]]), { fill: PAL.ink, outline: 3 });
  c.restore();
}
export function register(c, x, y, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  shape(c, P([[-90, 0], [92, 0], [80, -90], [-80, -92]]), { fill: PAL.wood, hatch: 0.3, outline: 7 });
  shape(c, P([[-60, -92], [64, -94], [50, -170], [-48, -168]]), { fill: PAL.brown, hatch: 0.2, outline: 6 });
  for (let k = 0; k < 4; k++) shape(c, ellipse(-30 + k * 20, -132, 7, 6, 8, 0.2, 90 + k), { fill: PAL.cream, outline: 2.5 });
  shape(c, P([[-80, -10], [84, -10], [96, 30], [-92, 32]]), { fill: '#3b2a1b', outline: 6, hatch: 0.5, gap: 6 });   // open, empty drawer
  handText(c, 'EMPTY', 0, 12, { size: 20, color: PAL.cream });
  c.restore();
}
export function bill(c, x, y, s = 1, rot = -0.15) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  shape(c, P([[-60, -26], [-10, -30], [58, -24], [62, 26], [10, 30], [-58, 24]]), { fill: PAL.bill, outline: 5, hatch: 0.15 });
  shape(c, ellipse(0, 0, 16, 18, 12, 0.08, 101), { fill: '#b7c49f', outline: 3 }); handText(c, '$', 0, 1, { size: 24 });
  c.restore();
}
export function storefront(c, x, y, s = 1, sign = 'CARD ONLY') {
  c.save(); c.translate(x, y); c.scale(s, s);
  shape(c, P([[-160, 0], [150, 0], [140, -380], [10, -440], [-150, -370]]), { fill: PAL.wood, hatch: 0.25, hatchAngle: 80, outline: 8 });
  for (let k = -120; k <= 120; k += 40) ink(c, P([[k, -10], [k + 4, -360]]), { size: 2.5, color: 'rgba(34,28,22,0.6)' });
  shape(c, P([[-120, -300], [-10, -304], [-12, -170], [-118, -168]]), { fill: '#e7b85c', outline: 6 });   // lit window
  ink(c, P([[-66, -302], [-64, -170]]), { size: 4 }); ink(c, P([[-120, -236], [-10, -238]]), { size: 4 });
  shape(c, P([[30, 0], [110, 0], [106, -200], [34, -196]]), { fill: '#3b2a1b', outline: 6, hatch: 0.3 });   // door
  dot(c, 92, -98, 5, PAL.mustard);
  shape(c, P([[-130, -330], [120, -342], [122, -398], [-126, -386]]), { fill: PAL.cream, outline: 6 });
  handText(c, sign, -2, -364, { size: 40, color: PAL.red });
  c.restore();
}
export function lamp(c, x, y, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  shape(c, P([[-8, 0], [8, 0], [14, -300], [2, -300]]), { fill: PAL.night, outline: 5 });
  ink(c, P([[8, -300], [30, -330], [60, -324]]), { size: 6 });
  shape(c, P([[44, -320], [76, -320], [80, -270], [40, -270]]), { fill: '#f0c96a', outline: 6 });
  shape(c, P([[38, -330], [82, -330], [60, -350]]), { fill: PAL.night, outline: 5, smooth: false });
  c.restore();
}
export function cart(c, x, y, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  shape(c, P([[-90, -150], [100, -160], [80, -60], [-70, -56]]), { fill: 'rgba(120,120,115,0.25)', outline: 6, hatch: 0.6, hatchAngle: 45, gap: 12 });
  ink(c, P([[-90, -150], [-120, -190]]), { size: 6 }); ink(c, P([[-70, -56], [-60, -20], [70, -24], [80, -60]]), { size: 5 });
  shape(c, ellipse(-50, -12, 13, 13, 10, 0.1, 111), { fill: PAL.ink, outline: 3 }); shape(c, ellipse(60, -14, 13, 13, 10, 0.1, 112), { fill: PAL.ink, outline: 3 });
  c.restore();
}
