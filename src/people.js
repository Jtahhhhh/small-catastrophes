// Generic townsfolk built from the same cut-out part names as Mortimer, so every action works on them.
// Proportions follow docs/STYLE.md "Body spec": legs 0.28·H, coat 0.40·H, neck 0.06·H, head 0.26·H.
import { PAL, shape, ink, dot, ellipse, rng } from './ink.js';
import { POSE, drawMouth } from './cast.js';

const COATS = ['#5b4a3c', '#3f5560', '#6b3b34', '#56603f', '#4a4458', '#7a6a4a', '#30383f'];
const HAIR_COLS = [PAL.brown, PAL.ink, '#3a2a1e', '#8a6a3a', '#6b6258'];
const HAIRS = ['flat', 'bun', 'cap', 'bald', 'tuft', 'scarf'];
const CACHE = {};
// Age reads at a glance: old = grey hair, lines, glasses, a stoop and a cane; young = hoodie, bright colours, phone in hand.
const AGE = {
  old:   { coats: ['#5b4a3c', '#6b5a48', '#4a4458', '#56603f', '#7a6a4a'], hairs: ['bald', 'flat', 'bun', 'flat'], hairCols: ['#d9d3c5', '#b9b3a6', '#e6e1d6'], ht: [480, 525] },
  adult: { coats: COATS, hairs: HAIRS, hairCols: HAIR_COLS, ht: [495, 560] },
  young: { coats: ['#c08a2e', '#3f7a78', '#a8442f', '#5a6fa0', '#6b8a3a'], hairs: ['capback', 'tuft', 'flat', 'bun'], hairCols: [PAL.ink, '#3a2a1e', PAL.brown], ht: [505, 560] },
};
// Skin tones, light → deep, muted to sit on aged paper. Each locale draws from its own mix.
export const SKINS = ['#f0dcc0', '#e2c39c', '#c99a6e', '#a8754c', '#86593a', '#63402a'];
const LOCALE_SKINS = { us: [0, 1, 1, 2, 3, 4, 5], in: [2, 3, 3, 4, 4], ng: [4, 5, 5, 4], se: [0, 0, 1, 1, 2, 4], any: [0, 1, 2, 3, 4, 5] };
export const BODY = { legs: 0.28, coat: 0.40, neck: 0.06, head: 0.26 };   // shares of standing height (to top of head)

export function makePerson(seed, locale = 'us', age = 'adult') {
  const A = AGE[age] || AGE.adult, ck = `${seed}:${locale}:${age}`; if (CACHE[ck]) return CACHE[ck];
  const r = rng(seed * 7 + 3), mix = LOCALE_SKINS[locale] || LOCALE_SKINS.any;
  const skin = SKINS[mix[Math.floor(rng(seed * 11 + 5)() * mix.length)]], deep = SKINS.indexOf(skin) >= 4;
  const coat = A.coats[Math.floor(r() * A.coats.length)], hair = A.hairs[Math.floor(r() * A.hairs.length)];
  const hairCol = A.hairCols[Math.floor(r() * A.hairCols.length)], glasses = age === 'old' && r() < 0.6;
  const Ht = A.ht[0] + r() * (A.ht[1] - A.ht[0]);                // adults 495–560 (Mortimer ≈ 552: tall, gaunt)
  const stoop = age === 'old' ? Ht * 0.035 : 0;                  // head and shoulders forward
  const headR = Ht * BODY.head / 2.3, k = headR / 60;            // head height = 2.3·headR
  const hemY = -Ht * BODY.legs, shoulderY = -Ht * (BODY.legs + BODY.coat), headY = -Ht + headR * 1.15;
  const wide = Ht * (0.075 + r() * 0.03), hip = wide + Ht * (0.01 + r() * 0.03), armL = Ht * 0.39, leg = 7 * Ht / 550;
  const s = seed * 13;
  const parts = [
    { name: 'leg_back', pivot: [8, hemY], draw: c => {
        shape(c, [[8 - leg, hemY - 5], [8 + leg, hemY - 5], [8 + leg * 0.9, -8], [8 - leg * 0.9, -8]], { fill: PAL.night, outline: 4 });
        shape(c, ellipse(15, -6, 20, 8, 12, 0.1, s + 1), { fill: PAL.ink, outline: 3 }); } },
    { name: 'leg_front', pivot: [-12, hemY], draw: c => {
        shape(c, [[-12 - leg, hemY - 5], [-12 + leg, hemY - 5], [-12 + leg * 0.9, -8], [-12 - leg * 0.9, -8]], { fill: PAL.night, outline: 4 });
        shape(c, ellipse(-19, -6, 20, 8, 12, 0.1, s + 2), { fill: PAL.ink, outline: 3 }); } },
    { name: 'arm_back', pivot: [wide - 6, shoulderY + 6], draw: c => {
        shape(c, [[wide - 14, shoulderY], [wide + 6, shoulderY + 4], [wide + 16, shoulderY + armL], [wide - 2, shoulderY + armL + 6]], { fill: coat, hatch: 0.3, outline: 5 });
        shape(c, ellipse(wide + 8, shoulderY + armL + 14, 11, 13, 10, 0.15, s + 3), { fill: skin, outline: 3 }); } },
    { name: 'body', pivot: [0, shoulderY + 80], draw: c => {
        shape(c, [[-wide, shoulderY], [wide, shoulderY], [hip, hemY], [-hip, hemY]], { fill: coat, hatch: 0.25, hatchAngle: -48, outline: 6 });
        ink(c, [[0, shoulderY + 6], [2, hemY - 4]], { size: 3 }); } },
    { name: 'head', pivot: [0, shoulderY - 4], draw: c => {
        c.save(); c.translate(stoop, stoop * 0.6);
        if (age === 'young') shape(c, [[-wide * 0.9, shoulderY + 6], [-headR * 0.7, shoulderY - Ht * BODY.neck - 6], [headR * 0.7, shoulderY - Ht * BODY.neck - 6], [wide * 0.9, shoulderY + 6]], { fill: coat, outline: 5, hatch: 0.25 });
        shape(c, [[-8, shoulderY - Ht * BODY.neck - 4], [8, shoulderY - Ht * BODY.neck - 4], [8, shoulderY + 2], [-8, shoulderY + 2]], { fill: skin, outline: 3 });
        shape(c, ellipse(0, headY, headR * 0.88, headR * 1.15, 20, 0.08, s + 4), { fill: skin, outline: 6 });
        const R = headR;
        if (hair === 'flat') shape(c, [[-R, headY - 8], [-R * 0.6, headY - R * 1.1], [R * 0.6, headY - R * 1.12], [R, headY - 6], [R * 0.7, headY - R * 0.6], [-R * 0.7, headY - R * 0.6]], { fill: hairCol, outline: 4, hatch: 0.4 });
        if (hair === 'bun') { shape(c, ellipse(0, headY - R * 1.2, R * 0.5, R * 0.4, 12, 0.1, s + 5), { fill: PAL.ink, outline: 4 }); shape(c, [[-R, headY - 10], [0, headY - R * 1.12], [R, headY - 10], [0, headY - R * 0.7]], { fill: PAL.ink, outline: 4 }); }
        if (hair === 'cap') { shape(c, [[-R * 0.95, headY - R * 0.5], [-R * 0.7, headY - R * 1.12], [R * 0.7, headY - R * 1.12], [R * 0.95, headY - R * 0.5]], { fill: PAL.red, outline: 4, hatch: 0.2 }); shape(c, [[R * 0.5, headY - R * 0.55], [R * 1.6, headY - R * 0.45], [R * 0.6, headY - R * 0.35]], { fill: PAL.red, outline: 4 }); }
        if (hair === 'bald' && age === 'old') for (const sx of [-1, 1]) shape(c, [[sx * R * 0.92, headY - R * 0.1], [sx * R * 0.8, headY - R * 0.62], [sx * R * 0.55, headY - R * 0.5], [sx * R * 0.7, headY + R * 0.05]], { fill: hairCol, outline: 3 });
        if (hair === 'capback') { shape(c, [[-R * 0.95, headY - R * 0.5], [-R * 0.7, headY - R * 1.12], [R * 0.7, headY - R * 1.12], [R * 0.95, headY - R * 0.5]], { fill: PAL.mustard, outline: 4, hatch: 0.2 }); shape(c, [[-R * 0.5, headY - R * 0.6], [-R * 1.4, headY - R * 0.7], [-R * 0.6, headY - R * 0.42]], { fill: PAL.mustard, outline: 4 }); }
        if (hair === 'tuft') { ink(c, [[-4, headY - R * 1.1], [-10, headY - R * 1.5]], { size: 4 }); ink(c, [[4, headY - R * 1.1], [12, headY - R * 1.45]], { size: 4 }); }
        if (hair === 'scarf') shape(c, [[-R * 1.05, headY + 4], [-R * 0.8, headY - R * 1.1], [R * 0.8, headY - R * 1.1], [R * 1.05, headY + 4], [R * 0.7, headY - R * 0.5], [-R * 0.7, headY - R * 0.5]], { fill: PAL.moss, outline: 4, hatch: 0.2 });
        for (const ex of [-R * 0.33, R * 0.33]) {   // eye whites keep the eyes readable on every skin tone
          shape(c, ellipse(ex, headY - 2 * k, 9 * k, 8 * k, 10, 0.1, s + 7), { fill: '#efe6d2', outline: deep ? 2 : 0 });
          dot(c, ex + POSE.look * 4 * k, headY - 2 * k, 4.5 * k); }
        ink(c, [[-R * 0.55, headY - R * 0.4], [-R * 0.15, headY - R * 0.3]], { size: 4 * k }); ink(c, [[R * 0.15, headY - R * 0.3], [R * 0.55, headY - R * 0.4]], { size: 4 * k });
        if (age === 'old') {   // forehead lines, cheek lines, optional round glasses
          ink(c, [[-R * 0.45, headY - R * 0.62], [R * 0.45, headY - R * 0.64]], { size: 2.5 * k }); ink(c, [[-R * 0.35, headY - R * 0.75], [R * 0.35, headY - R * 0.77]], { size: 2.5 * k });
          ink(c, [[-R * 0.62, headY + R * 0.25], [-R * 0.5, headY + R * 0.55]], { size: 2.5 * k }); ink(c, [[R * 0.62, headY + R * 0.25], [R * 0.5, headY + R * 0.55]], { size: 2.5 * k });
          if (glasses) { for (const ex of [-R * 0.33, R * 0.33]) shape(c, ellipse(ex, headY - 2 * k, 15 * k, 14 * k, 14, 0.05, s + 8), { fill: 'rgba(0,0,0,0)', outline: 3 }); ink(c, [[-R * 0.12, headY - 3 * k], [R * 0.12, headY - 3 * k]], { size: 3 }); } }
        drawMouth(c, 0, headY + R * 0.6, k); c.restore(); } },
    { name: 'arm_front', pivot: [-wide + 6, shoulderY + 6], draw: c => {
        shape(c, [[-wide - 6, shoulderY + 4], [-wide + 14, shoulderY], [-wide + 2, shoulderY + armL + 6], [-wide - 16, shoulderY + armL]], { fill: coat, hatch: 0.3, outline: 5 });
        if (age === 'old') { ink(c, [[-wide - 8, shoulderY + armL + 8], [-wide - 20, -4]], { size: 7, color: PAL.brown }); ink(c, [[-wide - 8, shoulderY + armL + 8], [-wide + 8, shoulderY + armL + 2]], { size: 7, color: PAL.brown }); }
        shape(c, ellipse(-wide - 8, shoulderY + armL + 14, 11, 13, 10, 0.15, s + 6), { fill: skin, outline: 3 });
        if (age === 'young') {   // phone held up in front of the hand, screen lit
          const px = -wide - 34, py = shoulderY + armL - 30;
          shape(c, [[px, py], [px + 30, py - 2], [px + 32, py + 50], [px + 2, py + 52]], { fill: PAL.night, outline: 4 });
          shape(c, [[px + 5, py + 6], [px + 26, py + 4], [px + 27, py + 40], [px + 6, py + 42]], { fill: '#a9c58a', outline: 0 });
          shape(c, ellipse(-wide - 14, shoulderY + armL + 18, 10, 9, 10, 0.15, s + 9), { fill: skin, outline: 3 }); } } },
  ];
  CACHE[ck] = parts; return parts;
}
