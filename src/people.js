// Generic townsfolk built from the same cut-out part names as Mortimer, so every action works on them.
import { PAL, shape, ink, dot, ellipse, rng } from './ink.js';

const COATS = ['#5b4a3c', '#3f5560', '#6b3b34', '#56603f', '#4a4458', '#7a6a4a', '#30383f'];
const HAIRS = ['flat', 'bun', 'cap', 'bald', 'tuft', 'scarf'];
const CACHE = {};

export function makePerson(seed) {
  if (CACHE[seed]) return CACHE[seed];
  const r = rng(seed * 7 + 3);
  const coat = COATS[Math.floor(r() * COATS.length)], hair = HAIRS[Math.floor(r() * HAIRS.length)];
  const wide = 38 + r() * 22, hip = wide + 6 + r() * 16, headR = 36 + r() * 8, tall = r() * 40;
  const shoulderY = -330 - tall, hemY = -140, headY = shoulderY - 62;
  const s = seed * 13;
  const parts = [
    { name: 'leg_back', pivot: [8, hemY], draw: c => {
        shape(c, [[2, hemY - 5], [16, hemY - 5], [15, -8], [7, -8]], { fill: PAL.night, outline: 4 });
        shape(c, ellipse(15, -6, 19, 8, 12, 0.1, s + 1), { fill: PAL.ink, outline: 3 }); } },
    { name: 'leg_front', pivot: [-12, hemY], draw: c => {
        shape(c, [[-18, hemY - 5], [-4, hemY - 5], [-8, -8], [-16, -8]], { fill: PAL.night, outline: 4 });
        shape(c, ellipse(-18, -6, 19, 8, 12, 0.1, s + 2), { fill: PAL.ink, outline: 3 }); } },
    { name: 'arm_back', pivot: [wide - 6, shoulderY + 6], draw: c => {
        shape(c, [[wide - 14, shoulderY], [wide + 4, shoulderY + 4], [wide + 12, shoulderY + 140], [wide - 2, shoulderY + 146]], { fill: coat, hatch: 0.3, outline: 5 });
        shape(c, ellipse(wide + 6, shoulderY + 154, 10, 12, 10, 0.15, s + 3), { fill: PAL.skin, outline: 3 }); } },
    { name: 'body', pivot: [0, shoulderY + 80], draw: c => {
        shape(c, [[-wide, shoulderY], [wide, shoulderY], [hip, hemY], [-hip, hemY]], { fill: coat, hatch: 0.25, hatchAngle: -48, outline: 6 });
        ink(c, [[0, shoulderY + 6], [2, hemY - 4]], { size: 3 }); } },
    { name: 'head', pivot: [0, shoulderY - 4], draw: c => {
        shape(c, [[-7, shoulderY - 16], [7, shoulderY - 16], [7, shoulderY + 2], [-7, shoulderY + 2]], { fill: PAL.skin, outline: 3 });
        shape(c, ellipse(0, headY, headR, headR * 1.15, 20, 0.08, s + 4), { fill: PAL.skin, outline: 6 });
        if (hair === 'flat') shape(c, [[-headR, headY - 8], [-headR * 0.6, headY - headR * 1.1], [headR * 0.6, headY - headR * 1.12], [headR, headY - 6], [headR * 0.7, headY - headR * 0.6], [-headR * 0.7, headY - headR * 0.6]], { fill: PAL.brown, outline: 4, hatch: 0.4 });
        if (hair === 'bun') { shape(c, ellipse(0, headY - headR * 1.2, 20, 16, 12, 0.1, s + 5), { fill: PAL.ink, outline: 4 }); shape(c, [[-headR, headY - 10], [0, headY - headR * 1.12], [headR, headY - 10], [0, headY - headR * 0.7]], { fill: PAL.ink, outline: 4 }); }
        if (hair === 'cap') { shape(c, [[-headR * 0.95, headY - headR * 0.5], [-headR * 0.7, headY - headR * 1.12], [headR * 0.7, headY - headR * 1.12], [headR * 0.95, headY - headR * 0.5]], { fill: PAL.red, outline: 4, hatch: 0.2 }); shape(c, [[headR * 0.5, headY - headR * 0.55], [headR * 1.6, headY - headR * 0.45], [headR * 0.6, headY - headR * 0.35]], { fill: PAL.red, outline: 4 }); }
        if (hair === 'tuft') { ink(c, [[-4, headY - headR * 1.1], [-10, headY - headR * 1.5]], { size: 4 }); ink(c, [[4, headY - headR * 1.1], [12, headY - headR * 1.45]], { size: 4 }); }
        if (hair === 'scarf') shape(c, [[-headR * 1.05, headY + 4], [-headR * 0.8, headY - headR * 1.1], [headR * 0.8, headY - headR * 1.1], [headR * 1.05, headY + 4], [headR * 0.7, headY - headR * 0.5], [-headR * 0.7, headY - headR * 0.5]], { fill: PAL.moss, outline: 4, hatch: 0.2 });
        dot(c, -13, headY - 2, 4.5); dot(c, 13, headY - 2, 4.5);
        ink(c, [[-22, headY - 16], [-6, headY - 12]], { size: 3.5 }); ink(c, [[6, headY - 12], [22, headY - 16]], { size: 3.5 });
        ink(c, [[-9, headY + 24], [0, headY + 22], [9, headY + 25]], { size: 3 }); } },
    { name: 'arm_front', pivot: [-wide + 6, shoulderY + 6], draw: c => {
        shape(c, [[-wide - 4, shoulderY + 4], [-wide + 14, shoulderY], [-wide + 2, shoulderY + 146], [-wide - 12, shoulderY + 140]], { fill: coat, hatch: 0.3, outline: 5 });
        shape(c, ellipse(-wide - 6, shoulderY + 154, 10, 12, 10, 0.15, s + 6), { fill: PAL.skin, outline: 3 }); } },
  ];
  CACHE[seed] = parts; return parts;
}
