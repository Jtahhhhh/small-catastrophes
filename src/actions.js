// Procedural actions on cut-out rigs: each returns part rotations + vertical offset for a moment in time.
const ease = t => { t = Math.min(Math.max(t, 0), 1); return t * t * (3 - 2 * t); };
const env = (t, dur, inT = 0.25, outT = 0.3) => ease(t / inT) * (1 - ease((t - dur + outT) / outT));

export const ACTIONS = {
  // one-shot actions: (lt = seconds since action start, dur) → {rot, dy}
  startle: (lt, dur) => { const hop = lt < 0.4 ? Math.sin(Math.PI * lt / 0.4) : 0; const e = env(lt, dur, 0.12, 0.4);
    return { dy: -46 * hop, rot: { arm_front: 1.0 * e, arm_back: -1.0 * e, arms: -0.15 * e, head: -0.12 * e } }; },
  'point-left': (lt, dur) => { const e = env(lt, dur, 0.3, 0.35); return { rot: { arm_front: 1.45 * e, head: 0.08 * e } }; },
  'point-right': (lt, dur) => { const e = env(lt, dur, 0.3, 0.35); return { rot: { arm_back: -1.45 * e, head: -0.08 * e } }; },
  shrug: (lt, dur) => { const e = env(lt, dur, 0.25, 0.35); return { dy: -6 * e, rot: { arm_front: 0.55 * e, arm_back: -0.55 * e, arms: 0.12 * e, head: 0.14 * e } }; },
  raise: (lt, dur) => { const e = env(lt, dur, 0.4, 0.4); return { rot: { arm_front: -0.9 * e } }; },
  nod: (lt, dur) => ({ rot: { head: 0.1 * Math.sin(lt * 9) * env(lt, dur, 0.1, 0.1) } }),
  peck: (lt, dur) => ({ rot: { head: 0.5 * Math.max(0, Math.sin(lt * 7)) ** 4 } }),
};

export function walkPose(phase, amount) {   // phase in radians, amount 0..1 (blend in/out)
  const s = Math.sin(phase) * amount;
  return { dy: -Math.abs(Math.sin(phase)) * 9 * amount,
           rot: { leg_front: 0.5 * s, leg_back: -0.5 * s, arm_front: -0.35 * s, arm_back: 0.35 * s, legs: 0.08 * s, head: 0.03 * s } };
}

export function idlePose(t, seed = 0) {
  return { dy: Math.sin(t * 1.6 + seed) * 1.5, rot: { head: Math.sin(t * 1.1 + seed) * 0.03, arm_back: Math.sin(t * 1.3 + seed) * 0.04, arm_front: Math.sin(t * 1.2 + seed * 2) * -0.03 } };
}

export function mergePoses(...ps) {
  const out = { dy: 0, rot: {} };
  for (const p of ps) { if (!p) continue; out.dy += p.dy || 0; for (const [k, v] of Object.entries(p.rot || {})) out.rot[k] = (out.rot[k] || 0) + v; }
  return out;
}
