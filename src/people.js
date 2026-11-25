// Generic townsfolk built from the same cut-out part names as Mortimer, so every action works on them.
// Proportions follow docs/STYLE.md "Body spec": legs 0.28·H, coat 0.40·H, neck 0.06·H, head 0.26·H.
import { PAL, shape, ink, dot, ellipse, rng } from './ink.js';
import { POSE, drawMouth } from './cast.js';

const COATS = ['#5b4a3c', '#3f5560', '#6b3b34', '#56603f', '#4a4458', '#7a6a4a', '#30383f'];
const HAIRS = ['flat', 'bun', 'cap', 'bald', 'tuft', 'scarf'];
const CACHE = {};
export const BODY = { legs: 0.28, coat: 0.40, neck: 0.06, head: 0.26 };   // shares of standing height (to top of head)

export function makePerson(seed) {
  if (CACHE[seed]) return CACHE[seed];
  const r = rng(seed * 7 + 3);
  const coat = COATS[Math.floor(r() * COATS.length)], hair = HAIRS[Math.floor(r() * HAIRS.length)];
  const Ht = 495 + r() * 65;                                     // adults 495–560 (Mortimer ≈ 552: tall, gaunt)
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
        shape(c, ellipse(wide + 8, shoulderY + armL + 14, 11, 13, 10, 0.15, s + 3), { fill: PAL.skin, outline: 3 }); } },
    { name: 'body', pivot: [0, shoulderY + 80], draw: c => {
        shape(c, [[-wide, shoulderY], [wide, shoulderY], [hip, hemY], [-hip, hemY]], { fill: coat, hatch: 0.25, hatchAngle: -48, outline: 6 });
        ink(c, [[0, shoulderY + 6], [2, hemY - 4]], { size: 3 }); } },
    { name: 'head', pivot: [0, shoulderY - 4], draw: c => {
        shape(c, [[-8, shoulderY - Ht * BODY.neck - 4], [8, shoulderY - Ht * BODY.neck - 4], [8, shoulderY + 2], [-8, shoulderY + 2]], { fill: PAL.skin, outline: 3 });
        shape(c, ellipse(0, headY, headR * 0.88, headR * 1.15, 20, 0.08, s + 4), { fill: PAL.skin, outline: 6 });
        const R = headR;
        if (hair === 'flat') shape(c, [[-R, headY - 8], [-R * 0.6, headY - R * 1.1], [R * 0.6, headY - R * 1.12], [R, headY - 6], [R * 0.7, headY - R * 0.6], [-R * 0.7, headY - R * 0.6]], { fill: PAL.brown, outline: 4, hatch: 0.4 });
        if (hair === 'bun') { shape(c, ellipse(0, headY - R * 1.2, R * 0.5, R * 0.4, 12, 0.1, s + 5), { fill: PAL.ink, outline: 4 }); shape(c, [[-R, headY - 10], [0, headY - R * 1.12], [R, headY - 10], [0, headY - R * 0.7]], { fill: PAL.ink, outline: 4 }); }
        if (hair === 'cap') { shape(c, [[-R * 0.95, headY - R * 0.5], [-R * 0.7, headY - R * 1.12], [R * 0.7, headY - R * 1.12], [R * 0.95, headY - R * 0.5]], { fill: PAL.red, outline: 4, hatch: 0.2 }); shape(c, [[R * 0.5, headY - R * 0.55], [R * 1.6, headY - R * 0.45], [R * 0.6, headY - R * 0.35]], { fill: PAL.red, outline: 4 }); }
        if (hair === 'tuft') { ink(c, [[-4, headY - R * 1.1], [-10, headY - R * 1.5]], { size: 4 }); ink(c, [[4, headY - R * 1.1], [12, headY - R * 1.45]], { size: 4 }); }
        if (hair === 'scarf') shape(c, [[-R * 1.05, headY + 4], [-R * 0.8, headY - R * 1.1], [R * 0.8, headY - R * 1.1], [R * 1.05, headY + 4], [R * 0.7, headY - R * 0.5], [-R * 0.7, headY - R * 0.5]], { fill: PAL.moss, outline: 4, hatch: 0.2 });
        dot(c, -R * 0.33 + POSE.look * 6 * k, headY - 2 * k, 5.5 * k); dot(c, R * 0.33 + POSE.look * 6 * k, headY - 2 * k, 5.5 * k);
        ink(c, [[-R * 0.55, headY - R * 0.4], [-R * 0.15, headY - R * 0.3]], { size: 4 * k }); ink(c, [[R * 0.15, headY - R * 0.3], [R * 0.55, headY - R * 0.4]], { size: 4 * k });
        drawMouth(c, 0, headY + R * 0.6, k); } },
    { name: 'arm_front', pivot: [-wide + 6, shoulderY + 6], draw: c => {
        shape(c, [[-wide - 6, shoulderY + 4], [-wide + 14, shoulderY], [-wide + 2, shoulderY + armL + 6], [-wide - 16, shoulderY + armL]], { fill: coat, hatch: 0.3, outline: 5 });
        shape(c, ellipse(-wide - 8, shoulderY + armL + 14, 11, 13, 10, 0.15, s + 6), { fill: PAL.skin, outline: 3 }); } },
  ];
  CACHE[seed] = parts; return parts;
}
