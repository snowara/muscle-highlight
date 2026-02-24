/**
 * Classify exercise from MediaPipe pose landmarks.
 * Analyzes joint angles + body position to determine the most likely exercise.
 *
 * Coordinate system: x,y are 0~1 normalized. y=0 is TOP, y=1 is BOTTOM.
 * So "wrist above shoulder" means wrist.y < shoulder.y.
 *
 * Supports learning: applies boosts from user corrections stored in localStorage.
 */

import { getLearnedBoosts } from "./learningStore";

function angleDeg(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.sqrt(ab.x ** 2 + ab.y ** 2) * Math.sqrt(cb.x ** 2 + cb.y ** 2);
  if (mag === 0) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function mid(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function avg(...vals) {
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

export function classifyExercise(landmarks) {
  if (!landmarks || landmarks.length < 29) return { key: "squat", confidence: 0 };

  const lm = landmarks;
  const nose = lm[0];
  const ls = lm[11], rs = lm[12]; // shoulders
  const le = lm[13], re = lm[14]; // elbows
  const lw = lm[15], rw = lm[16]; // wrists
  const lh = lm[23], rh = lm[24]; // hips
  const lk = lm[25], rk = lm[26]; // knees
  const la = lm[27], ra = lm[28]; // ankles

  // ── Joint Angles ──
  const kneeL = angleDeg(lh, lk, la);
  const kneeR = angleDeg(rh, rk, ra);
  const knee = avg(kneeL, kneeR);

  const hipL = angleDeg(ls, lh, lk);
  const hipR = angleDeg(rs, rh, rk);
  const hip = avg(hipL, hipR);

  const elbowL = angleDeg(ls, le, lw);
  const elbowR = angleDeg(rs, re, rw);
  const elbow = avg(elbowL, elbowR);

  const shoulderL = angleDeg(le, ls, lh);
  const shoulderR = angleDeg(re, rs, rh);
  const shoulder = avg(shoulderL, shoulderR);

  // ── Body Orientation ──
  const sMid = mid(ls, rs);
  const hMid = mid(lh, rh);
  // Torso vector angle from horizontal (0=horizontal, 90=vertical)
  const torsoDx = hMid.x - sMid.x;
  const torsoDy = hMid.y - sMid.y; // positive = hips below shoulders (normal standing)
  const torsoFromVertical = Math.abs(Math.atan2(torsoDx, torsoDy) * 180 / Math.PI);
  // torsoFromVertical: 0 = perfectly upright, 90 = horizontal

  const isUpright = torsoFromVertical < 35;
  const isLeaning = torsoFromVertical >= 35 && torsoFromVertical < 60;
  const isHorizontal = torsoFromVertical >= 60;

  // ── Wrist/Hand Position ──
  const wristMid = mid(lw, rw);
  const wristAboveShoulder = wristMid.y < sMid.y - 0.03;
  const wristAtShoulder = Math.abs(wristMid.y - sMid.y) < 0.08;
  const wristAtChest = wristMid.y > sMid.y && wristMid.y < hMid.y;
  const wristBelowHip = wristMid.y > hMid.y;

  // ── Arm Spread (wrist distance / shoulder distance) ──
  const shoulderW = dist(ls, rs);
  const wristW = dist(lw, rw);
  const armSpread = shoulderW > 0 ? wristW / shoulderW : 1;

  // ── Knee Asymmetry ──
  const kneeAsym = Math.abs(kneeL - kneeR);

  // ── Scoring ──
  // Each exercise gets a score. Higher = more likely.
  // Use strong indicators to clearly differentiate.

  const s = {};

  // ─── PLANK: horizontal body, straight arms & legs ───
  s.plank = 0;
  if (isHorizontal) s.plank += 45;
  if (knee > 150) s.plank += 20;
  if (elbow > 140) s.plank += 20;
  if (hip > 150) s.plank += 15;

  // ─── BENCH PRESS: horizontal/leaning, arms at chest, elbow bent ───
  s.benchPress = 0;
  if (isHorizontal) s.benchPress += 30;
  if (isLeaning) s.benchPress += 15;
  if (elbow > 60 && elbow < 150) s.benchPress += 25;
  if (shoulder > 40 && shoulder < 120) s.benchPress += 20;
  if (armSpread > 1.5) s.benchPress += 10;

  // ─── LEG CURL: horizontal, knee deeply bent, hip straight ───
  s.legCurl = 0;
  if (isHorizontal) s.legCurl += 25;
  if (knee < 100) s.legCurl += 35;
  if (hip > 140) s.legCurl += 20;

  // ─── SQUAT: upright, deep knee + hip flexion, wrists NOT overhead ───
  s.squat = 0;
  if (isUpright) s.squat += 15;
  if (knee < 140) s.squat += 20;
  if (knee < 110) s.squat += 20;
  if (hip < 140) s.squat += 15;
  if (hip < 110) s.squat += 10;
  if (!wristAboveShoulder) s.squat += 10;

  // ─── DEADLIFT: leaning torso, hips hinged, knees slightly bent ───
  s.deadlift = 0;
  if (isLeaning) s.deadlift += 30;
  if (hip < 130) s.deadlift += 25;
  if (knee > 110 && knee < 165) s.deadlift += 20;
  if (wristBelowHip) s.deadlift += 15;

  // ─── SHOULDER PRESS: upright, wrists ABOVE shoulders ───
  s.shoulderPress = 0;
  if (isUpright) s.shoulderPress += 15;
  if (wristAboveShoulder) s.shoulderPress += 40;
  if (shoulder > 120) s.shoulderPress += 25;
  if (elbow > 90) s.shoulderPress += 10;

  // ─── BICEP CURL: upright, elbows tight, wrists near shoulder height ───
  s.bicepCurl = 0;
  if (isUpright) s.bicepCurl += 10;
  if (elbow < 80) s.bicepCurl += 35;
  if (shoulder < 35) s.bicepCurl += 25;
  if (wristAtChest) s.bicepCurl += 15;

  // ─── LAT PULLDOWN: arms wide above, pulling down ───
  s.latPulldown = 0;
  if (wristAboveShoulder) s.latPulldown += 15;
  if (armSpread > 2.0) s.latPulldown += 25;
  if (shoulder > 100) s.latPulldown += 20;
  if (elbow < 130 && elbow > 60) s.latPulldown += 15;
  if (knee > 140) s.latPulldown += 5; // usually seated

  // ─── LUNGE: upright, big knee asymmetry ───
  s.lunge = 0;
  if (isUpright) s.lunge += 10;
  if (kneeAsym > 30) s.lunge += 40;
  if (kneeAsym > 50) s.lunge += 15;
  if (knee < 150) s.lunge += 10;

  // ─── LEG PRESS: reclined, knees bent, pushing ───
  s.legPress = 0;
  if (isLeaning || isHorizontal) s.legPress += 15;
  if (knee < 120) s.legPress += 25;
  if (hip < 100) s.legPress += 25;
  if (shoulder < 40) s.legPress += 10; // arms at side

  // ─── CABLE FLY: upright, arms wide at chest level ───
  s.cableFly = 0;
  if (isUpright) s.cableFly += 10;
  if (armSpread > 1.8) s.cableFly += 25;
  if (wristAtShoulder || wristAtChest) s.cableFly += 25;
  if (elbow > 110) s.cableFly += 15;
  if (shoulder > 50 && shoulder < 120) s.cableFly += 10;

  // ─── LATERAL RAISE: upright, arms spread at shoulder height ───
  s.lateralRaise = 0;
  if (isUpright) s.lateralRaise += 10;
  if (armSpread > 2.0) s.lateralRaise += 25;
  if (wristAtShoulder) s.lateralRaise += 30;
  if (elbow > 140) s.lateralRaise += 15; // arms fairly straight
  if (shoulder > 70 && shoulder < 110) s.lateralRaise += 10;

  // ── Apply learned boosts from user corrections ──
  const boosts = getLearnedBoosts(landmarks);
  for (const [key, boost] of Object.entries(boosts)) {
    if (s[key] !== undefined) {
      s[key] = Math.max(0, s[key] + boost);
    }
  }

  // ── Find best ──
  let bestKey = "squat";
  let bestScore = 0;
  for (const [key, score] of Object.entries(s)) {
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  const sorted = Object.entries(s).sort((a, b) => b[1] - a[1]);
  const top3 = sorted.slice(0, 3).map(([k, v]) => ({ key: k, score: v }));
  const hasBoost = Object.keys(boosts).length > 0;

  const confidence = Math.min(100, Math.round(bestScore * 1.1));

  return { key: bestKey, confidence, top3, learned: hasBoost };
}
