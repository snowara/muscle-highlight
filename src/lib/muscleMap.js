// Shape metadata: angle (radians), aspect ratio (width/height), scale multiplier
export const MUSCLE_SHAPES = {
  chest:      { angle: 0,        aspect: 1.8, scale: 1.3 },
  shoulders:  { angle: 0,        aspect: 1.2, scale: 1.0 },
  biceps:     { angle: Math.PI * 0.15, aspect: 0.6, scale: 0.9 },
  triceps:    { angle: Math.PI * 0.15, aspect: 0.6, scale: 0.85 },
  forearms:   { angle: Math.PI * 0.1,  aspect: 0.5, scale: 0.8 },
  lats:       { angle: 0,        aspect: 0.7, scale: 1.1 },
  traps:      { angle: 0,        aspect: 1.6, scale: 0.85 },
  core:       { angle: 0,        aspect: 0.7, scale: 1.2 },
  lowerBack:  { angle: 0,        aspect: 1.2, scale: 1.0 },
  glutes:     { angle: 0,        aspect: 1.3, scale: 1.1 },
  quadriceps: { angle: 0,        aspect: 0.6, scale: 1.3 },
  hamstrings: { angle: 0,        aspect: 0.55, scale: 1.2 },
  calves:     { angle: 0,        aspect: 0.5, scale: 1.0 },
};

export function getMusclePositions(landmarks, canvasW, canvasH) {
  const p = (i) => ({ x: landmarks[i].x * canvasW, y: landmarks[i].y * canvasH });
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

  const ls = p(11), rs = p(12);
  const le = p(13), re = p(14);
  const lw = p(15), rw = p(16);
  const lh = p(23), rh = p(24);
  const lk = p(25), rk = p(26);
  const la = p(27), ra = p(28);
  const shoulderMid = mid(ls, rs);
  const hipMid = mid(lh, rh);
  const shoulderWidth = Math.abs(rs.x - ls.x);

  return {
    chest: [
      lerp(shoulderMid, hipMid, 0.08),
      { x: shoulderMid.x - shoulderWidth * 0.15, y: lerp(shoulderMid, hipMid, 0.14).y },
      { x: shoulderMid.x + shoulderWidth * 0.15, y: lerp(shoulderMid, hipMid, 0.14).y },
    ],
    shoulders: [
      { x: ls.x - shoulderWidth * 0.1, y: ls.y },
      { x: ls.x - shoulderWidth * 0.04, y: ls.y + shoulderWidth * 0.08 },
      { x: rs.x + shoulderWidth * 0.1, y: rs.y },
      { x: rs.x + shoulderWidth * 0.04, y: rs.y + shoulderWidth * 0.08 },
    ],
    biceps: [
      lerp(ls, le, 0.4),
      lerp(ls, le, 0.6),
      lerp(rs, re, 0.4),
      lerp(rs, re, 0.6),
    ],
    triceps: [
      lerp(ls, le, 0.45),
      lerp(ls, le, 0.65),
      lerp(rs, re, 0.45),
      lerp(rs, re, 0.65),
    ],
    forearms: [
      lerp(le, lw, 0.3),
      lerp(le, lw, 0.6),
      lerp(re, rw, 0.3),
      lerp(re, rw, 0.6),
    ],
    lats: [
      { x: ls.x + shoulderWidth * 0.06, y: lerp(ls, lh, 0.3).y },
      { x: ls.x + shoulderWidth * 0.06, y: lerp(ls, lh, 0.55).y },
      { x: rs.x - shoulderWidth * 0.06, y: lerp(rs, rh, 0.3).y },
      { x: rs.x - shoulderWidth * 0.06, y: lerp(rs, rh, 0.55).y },
    ],
    traps: [
      lerp(shoulderMid, ls, 0.35),
      lerp(shoulderMid, ls, 0.55),
      lerp(shoulderMid, rs, 0.35),
      lerp(shoulderMid, rs, 0.55),
    ],
    core: [
      lerp(shoulderMid, hipMid, 0.42),
      lerp(shoulderMid, hipMid, 0.55),
      lerp(shoulderMid, hipMid, 0.68),
    ],
    lowerBack: [
      lerp(shoulderMid, hipMid, 0.6),
      lerp(shoulderMid, hipMid, 0.78),
    ],
    glutes: [
      { x: lh.x, y: lerp(lh, lk, 0.05).y },
      { x: lh.x, y: lerp(lh, lk, 0.14).y },
      { x: rh.x, y: lerp(rh, rk, 0.05).y },
      { x: rh.x, y: lerp(rh, rk, 0.14).y },
    ],
    quadriceps: [
      lerp(lh, lk, 0.25),
      lerp(lh, lk, 0.42),
      lerp(lh, lk, 0.58),
      lerp(rh, rk, 0.25),
      lerp(rh, rk, 0.42),
      lerp(rh, rk, 0.58),
    ],
    hamstrings: [
      { x: lerp(lh, lk, 0.3).x + 4, y: lerp(lh, lk, 0.3).y },
      { x: lerp(lh, lk, 0.5).x + 4, y: lerp(lh, lk, 0.5).y },
      { x: lerp(rh, rk, 0.3).x - 4, y: lerp(rh, rk, 0.3).y },
      { x: lerp(rh, rk, 0.5).x - 4, y: lerp(rh, rk, 0.5).y },
    ],
    calves: [
      lerp(lk, la, 0.3),
      lerp(lk, la, 0.55),
      lerp(rk, ra, 0.3),
      lerp(rk, ra, 0.55),
    ],
  };
}

export function getBodyScale(landmarks, canvasW) {
  const lsX = landmarks[11].x * canvasW;
  const rsX = landmarks[12].x * canvasW;
  const shoulderWidth = Math.abs(rsX - lsX);
  return Math.max(shoulderWidth / 120, 0.6);
}

export function getSkeletonConnections(landmarks, canvasW, canvasH) {
  const p = (i) => ({ x: landmarks[i].x * canvasW, y: landmarks[i].y * canvasH });
  const connections = [
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
    [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
    [24, 26], [26, 28],
  ];
  return connections.map(([a, b]) => [p(a), p(b)]);
}
