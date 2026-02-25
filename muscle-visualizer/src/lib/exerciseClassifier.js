/**
 * exerciseClassifier.js — 단일 프레임 포즈 기반 운동 분류
 *
 * 관절 각도 + 신체 방향 + 팔/다리 위치로 운동 추정.
 * learningStore의 사용자 보정 데이터가 있으면 점수에 반영.
 *
 * 좌표계: x,y = 0~1 정규화. y=0 상단, y=1 하단.
 * "손목이 어깨 위" = wrist.y < shoulder.y
 *
 * NOTE: EXERCISE_DB의 primary/secondary가 객체({muscle: activation})든
 *       배열([muscle])이든 이 파일에서는 참조하지 않음 — 순수 관절각도 기반 분류.
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

  // ── Elbow Asymmetry (one arm bent more = single-arm exercise) ──
  const elbowAsym = Math.abs(elbowL - elbowR);

  // ── Wrist below elbow (pulling motion indicator) ──
  const wristBelowElbow = (lw.y > le.y && rw.y > re.y);

  // ── Elbow behind shoulder (pulling/rowing motion) ──
  // When elbow.x is further from center than shoulder.x (arms pulled back)
  const elbowsBehind = (le.y > ls.y + 0.02) || (re.y > rs.y + 0.02);

  // ── 서서 숙인 자세 감지 (발목이 엉덩이 근처 = 서있는 상태) ──
  const ankleNearHip = Math.abs(avg(la.y, ra.y) - hMid.y) < 0.15;
  const isStandingBentOver = (isHorizontal || isLeaning) && ankleNearHip;

  // ─── PLANK: horizontal body, straight arms & legs, NOT standing bent-over ───
  s.plank = 0;
  if (isHorizontal && !isStandingBentOver) s.plank += 45;
  if (knee > 150) s.plank += 20;
  if (elbow > 140) s.plank += 20;
  if (hip > 150) s.plank += 15;
  if (isStandingBentOver) s.plank -= 30;

  // ─── BENCH PRESS: lying on bench (horizontal), arms pushing, NOT standing bent-over ───
  // 벤치프레스는 누워서 하는 운동. 서서 숙인 자세(로우)와 구분 필요.
  // 누운 자세: 발목이 엉덩이보다 아래(y 높음), 무릎 각도 큼
  // 서서 숙인 자세: 발목이 엉덩이 근처, 무릎 구부림
  s.benchPress = 0;
  if (isHorizontal && !isStandingBentOver) s.benchPress += 30;
  if (elbow > 60 && elbow < 150) s.benchPress += 20;
  if (shoulder > 40 && shoulder < 120) s.benchPress += 15;
  if (armSpread > 1.5) s.benchPress += 10;
  if (knee > 100) s.benchPress += 5;
  // 서서 숙인 자세면 벤치프레스가 아님 → 강하게 감점
  if (isStandingBentOver) s.benchPress -= 40;
  // 팔꿈치가 심하게 굽어있으면 로우일 가능성 → 감점
  if (elbow < 100 && isLeaning) s.benchPress -= 15;

  // ─── LEG CURL: horizontal, knee deeply bent, hip straight ───
  s.legCurl = 0;
  if (isHorizontal) s.legCurl += 25;
  if (knee < 100) s.legCurl += 35;
  if (hip > 140) s.legCurl += 20;

  // ─── SQUAT: upright, deep knee + hip flexion, wrists NOT overhead ───
  s.squat = 0;
  if (isUpright) s.squat += 20;
  if (knee < 140) s.squat += 15;
  if (knee < 110) s.squat += 20;
  if (hip < 140) s.squat += 10;
  if (hip < 110) s.squat += 10;
  if (!wristAboveShoulder && !wristBelowHip) s.squat += 5;
  // Penalize if torso is leaning forward (more likely deadlift/row)
  if (isLeaning) s.squat -= 15;

  // ─── DEADLIFT: leaning/horizontal torso, hips hinged, knees slightly bent, arms STRAIGHT down ───
  s.deadlift = 0;
  if (isLeaning || isHorizontal) s.deadlift += 25;
  if (hip < 130) s.deadlift += 20;
  if (knee > 120 && knee < 170) s.deadlift += 15;
  if (wristBelowHip) s.deadlift += 15;
  if (elbow > 150) s.deadlift += 15; // arms straight (not pulling)
  // Penalize if elbows are bent (more likely a row)
  if (elbow < 120) s.deadlift -= 15;

  // ─── BARBELL/DUMBBELL ROW: leaning/horizontal torso, elbows BENT, pulling motion ───
  s.barbellRow = 0;
  if (isLeaning || isHorizontal) s.barbellRow += 30;
  if (torsoFromVertical >= 30) s.barbellRow += 10;
  if (elbow < 130) s.barbellRow += 25; // elbows bent = pulling
  if (elbow < 100) s.barbellRow += 10;
  if (shoulder > 30 && shoulder < 90) s.barbellRow += 15; // arms pulled back
  if (wristAtChest || wristBelowHip) s.barbellRow += 10;
  // 서서 숙인 자세에서 팔꿈치 굽힘 → 로우 가능성 높음
  if (isStandingBentOver && elbow < 130) s.barbellRow += 10;
  // Penalize if arms straight (deadlift, not row)
  if (elbow > 155) s.barbellRow -= 20;

  // ─── DUMBBELL ROW: same as barbell row but with elbow asymmetry (single arm) ───
  s.dumbbellRow = 0;
  if (isLeaning || isHorizontal) s.dumbbellRow += 25;
  if (torsoFromVertical >= 30) s.dumbbellRow += 10;
  if (elbow < 130) s.dumbbellRow += 20;
  if (elbowAsym > 15) s.dumbbellRow += 25; // one arm pulling, other on bench (핵심 지표)
  if (elbowAsym > 30) s.dumbbellRow += 10; // 팔꿈치 비대칭 클수록 덤벨 로우 확률 증가
  if (shoulder > 30 && shoulder < 90) s.dumbbellRow += 10;
  if (wristAtChest || wristBelowHip) s.dumbbellRow += 5;
  // 서서 숙인 자세 + 비대칭 → 덤벨 로우 강화
  if (isStandingBentOver && elbowAsym > 15) s.dumbbellRow += 10;
  if (elbow > 155) s.dumbbellRow -= 15;

  // ─── SEATED ROW: upright/slight lean, elbows bent, pulling ───
  s.seatedRow = 0;
  if (isUpright || isLeaning) s.seatedRow += 10;
  if (elbow < 110) s.seatedRow += 20;
  if (shoulder > 20 && shoulder < 70) s.seatedRow += 15;
  if (knee > 130) s.seatedRow += 10; // legs extended (seated)
  if (wristAtChest) s.seatedRow += 15;

  // ─── SHOULDER PRESS: upright, wrists ABOVE shoulders ───
  s.shoulderPress = 0;
  if (isUpright) s.shoulderPress += 15;
  if (wristAboveShoulder) s.shoulderPress += 40;
  if (shoulder > 120) s.shoulderPress += 25;
  if (elbow > 90) s.shoulderPress += 10;

  // ─── BICEP CURL: upright, elbows tight, wrists near shoulder height ───
  s.bicepCurl = 0;
  if (isUpright) s.bicepCurl += 15;
  if (elbow < 80) s.bicepCurl += 35;
  if (shoulder < 35) s.bicepCurl += 25; // elbows close to body
  if (wristAtChest) s.bicepCurl += 15;
  // Penalize if leaning (more likely row)
  if (isLeaning) s.bicepCurl -= 10;

  // ─── LAT PULLDOWN: arms wide above, pulling down ───
  s.latPulldown = 0;
  if (wristAboveShoulder) s.latPulldown += 15;
  if (armSpread > 2.0) s.latPulldown += 25;
  if (shoulder > 100) s.latPulldown += 20;
  if (elbow < 130 && elbow > 60) s.latPulldown += 15;
  if (knee > 140) s.latPulldown += 5; // usually seated

  // ─── PULL UP: similar to lat pulldown but more vertical ───
  s.pullUp = 0;
  if (wristAboveShoulder) s.pullUp += 25;
  if (armSpread > 1.5) s.pullUp += 15;
  if (shoulder > 110) s.pullUp += 20;
  if (elbow < 120) s.pullUp += 15;

  // ─── LUNGE: upright, big knee asymmetry ───
  s.lunge = 0;
  if (isUpright) s.lunge += 10;
  if (kneeAsym > 30) s.lunge += 40;
  if (kneeAsym > 50) s.lunge += 15;
  if (knee < 150) s.lunge += 10;

  // ─── LEG PRESS: reclined, knees deeply bent, pushing ───
  s.legPress = 0;
  if (isHorizontal) s.legPress += 20;
  if (knee < 110) s.legPress += 25;
  if (hip < 90) s.legPress += 25;
  if (shoulder < 40) s.legPress += 10;
  // Penalize if standing/leaning (more likely squat/deadlift/row)
  if (isUpright) s.legPress -= 10;
  if (isLeaning && !isHorizontal) s.legPress -= 10;

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
  if (elbow > 140) s.lateralRaise += 15;
  if (shoulder > 70 && shoulder < 110) s.lateralRaise += 10;

  // ─── HIP THRUST: horizontal/leaning, knees bent, hips extended ───
  s.hipThrust = 0;
  if (isHorizontal || isLeaning) s.hipThrust += 15;
  if (knee > 70 && knee < 120) s.hipThrust += 20;
  if (hip > 140) s.hipThrust += 25;
  if (shoulder < 50) s.hipThrust += 10;

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

/**
 * 관절 각도 추출 (외부 디버그/표시용)
 * @param {Array} landmarks - 33개 정규화 랜드마크
 * @returns {Object|null} 각 관절의 각도값
 */
export function getJointAngles(landmarks) {
  if (!landmarks || landmarks.length < 29) return null;

  const lm = landmarks;
  return {
    kneeL:    angleDeg(lm[23], lm[25], lm[27]),
    kneeR:    angleDeg(lm[24], lm[26], lm[28]),
    hipL:     angleDeg(lm[11], lm[23], lm[25]),
    hipR:     angleDeg(lm[12], lm[24], lm[26]),
    elbowL:   angleDeg(lm[11], lm[13], lm[15]),
    elbowR:   angleDeg(lm[12], lm[14], lm[16]),
    shoulderL: angleDeg(lm[13], lm[11], lm[23]),
    shoulderR: angleDeg(lm[14], lm[12], lm[24]),
    torso: (() => {
      const sMid = mid(lm[11], lm[12]);
      const hMid = mid(lm[23], lm[24]);
      return Math.abs(Math.atan2(hMid.x - sMid.x, hMid.y - sMid.y) * 180 / Math.PI);
    })(),
  };
}
