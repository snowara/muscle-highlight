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
import { angleDeg, mid } from "./poseUtils";

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function avg(...vals) {
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

// ── 자세 임계값 상수 ──
const MIN_LANDMARKS = 29;
const TORSO_UPRIGHT_MAX = 35;
const TORSO_LEANING_MAX = 60;
const WRIST_ABOVE_THRESHOLD = 0.03;
const WRIST_AT_SHOULDER_THRESHOLD = 0.08;
const ANKLE_HIP_THRESHOLD = 0.15;
const CONFIDENCE_MULTIPLIER = 1.1;
const MAX_CONFIDENCE = 100;

/**
 * 랜드마크에서 분류에 필요한 포즈 특징을 추출한다.
 * classifyExercise 내부에서 사용하며 관절각도, 체위, 손목위치 등을 포함.
 */
function extractClassifierFeatures(landmarks) {
  const lm = landmarks;
  const ls = lm[11], rs = lm[12]; // shoulders
  const le = lm[13], re = lm[14]; // elbows
  const lw = lm[15], rw = lm[16]; // wrists
  const lh = lm[23], rh = lm[24]; // hips
  const lk = lm[25], rk = lm[26]; // knees
  const la = lm[27], ra = lm[28]; // ankles

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

  const sMid = mid(ls, rs);
  const hMid = mid(lh, rh);
  const torsoDx = hMid.x - sMid.x;
  const torsoDy = hMid.y - sMid.y;
  const torsoFromVertical = Math.abs(Math.atan2(torsoDx, torsoDy) * 180 / Math.PI);

  const isUpright = torsoFromVertical < TORSO_UPRIGHT_MAX;
  const isLeaning = torsoFromVertical >= TORSO_UPRIGHT_MAX && torsoFromVertical < TORSO_LEANING_MAX;
  const isHorizontal = torsoFromVertical >= TORSO_LEANING_MAX;

  const wristMid = mid(lw, rw);
  const wristAboveShoulder = wristMid.y < sMid.y - WRIST_ABOVE_THRESHOLD;
  const wristAtShoulder = Math.abs(wristMid.y - sMid.y) < WRIST_AT_SHOULDER_THRESHOLD;
  const wristAtChest = wristMid.y > sMid.y && wristMid.y < hMid.y;
  const wristBelowHip = wristMid.y > hMid.y;

  const shoulderW = dist(ls, rs);
  const wristW = dist(lw, rw);
  const armSpread = shoulderW > 0 ? wristW / shoulderW : 1;

  const kneeAsym = Math.abs(kneeL - kneeR);
  const elbowAsym = Math.abs(elbowL - elbowR);

  const ankleNearHip = Math.abs(avg(la.y, ra.y) - hMid.y) < ANKLE_HIP_THRESHOLD;
  const isStandingBentOver = (isHorizontal || isLeaning) && ankleNearHip;

  return {
    knee, kneeL, kneeR, kneeAsym,
    hip, elbow, elbowL, elbowR, elbowAsym,
    shoulder, torsoFromVertical,
    isUpright, isLeaning, isHorizontal,
    wristAboveShoulder, wristAtShoulder, wristAtChest, wristBelowHip,
    armSpread, isStandingBentOver,
  };
}

// ── 운동별 스코어링 규칙 (데이터 기반) ──

const EXERCISE_RULES = {
  plank: (f) => {
    let score = 0;
    if (f.isHorizontal && !f.isStandingBentOver) score += 45;
    if (f.knee > 150) score += 20;
    if (f.elbow > 140) score += 20;
    if (f.hip > 150) score += 15;
    if (f.isStandingBentOver) score -= 30;
    return score;
  },
  benchPress: (f) => {
    let score = 0;
    if (f.isHorizontal && !f.isStandingBentOver) score += 30;
    if (f.elbow > 60 && f.elbow < 150) score += 20;
    if (f.shoulder > 40 && f.shoulder < 120) score += 15;
    if (f.armSpread > 1.5) score += 10;
    if (f.knee > 100) score += 5;
    if (f.isStandingBentOver) score -= 40;
    if (f.elbow < 100 && f.isLeaning) score -= 15;
    return score;
  },
  legCurl: (f) => {
    let score = 0;
    if (f.isHorizontal) score += 25;
    if (f.knee < 100) score += 35;
    if (f.hip > 140) score += 20;
    return score;
  },
  squat: (f) => {
    let score = 0;
    if (f.isUpright) score += 20;
    if (f.knee < 140) score += 15;
    if (f.knee < 110) score += 20;
    if (f.hip < 140) score += 10;
    if (f.hip < 110) score += 10;
    if (!f.wristAboveShoulder && !f.wristBelowHip) score += 5;
    if (f.isLeaning) score -= 15;
    return score;
  },
  deadlift: (f) => {
    let score = 0;
    if (f.isLeaning || f.isHorizontal) score += 25;
    if (f.hip < 130) score += 20;
    if (f.knee > 120 && f.knee < 170) score += 15;
    if (f.wristBelowHip) score += 15;
    if (f.elbow > 150) score += 15;
    if (f.elbow < 120) score -= 15;
    return score;
  },
  barbellRow: (f) => {
    let score = 0;
    if (f.isLeaning || f.isHorizontal) score += 30;
    if (f.torsoFromVertical >= 30) score += 10;
    if (f.elbow < 130) score += 25;
    if (f.elbow < 100) score += 10;
    if (f.shoulder > 30 && f.shoulder < 90) score += 15;
    if (f.wristAtChest || f.wristBelowHip) score += 10;
    if (f.isStandingBentOver && f.elbow < 130) score += 10;
    if (f.elbow > 155) score -= 20;
    return score;
  },
  dumbbellRow: (f) => {
    let score = 0;
    if (f.isLeaning || f.isHorizontal) score += 25;
    if (f.torsoFromVertical >= 30) score += 10;
    if (f.elbow < 130) score += 20;
    if (f.elbowAsym > 15) score += 25;
    if (f.elbowAsym > 30) score += 10;
    if (f.shoulder > 30 && f.shoulder < 90) score += 10;
    if (f.wristAtChest || f.wristBelowHip) score += 5;
    if (f.isStandingBentOver && f.elbowAsym > 15) score += 10;
    if (f.elbow > 155) score -= 15;
    return score;
  },
  seatedRow: (f) => {
    let score = 0;
    if (f.isUpright || f.isLeaning) score += 10;
    if (f.elbow < 110) score += 20;
    if (f.shoulder > 20 && f.shoulder < 70) score += 15;
    if (f.knee > 130) score += 10;
    if (f.wristAtChest) score += 15;
    return score;
  },
  shoulderPress: (f) => {
    let score = 0;
    if (f.isUpright) score += 15;
    if (f.wristAboveShoulder) score += 40;
    if (f.shoulder > 120) score += 25;
    if (f.elbow > 90) score += 10;
    return score;
  },
  bicepCurl: (f) => {
    let score = 0;
    if (f.isUpright) score += 15;
    if (f.elbow < 80) score += 35;
    if (f.shoulder < 35) score += 25;
    if (f.wristAtChest) score += 15;
    if (f.isLeaning) score -= 10;
    return score;
  },
  latPulldown: (f) => {
    let score = 0;
    if (f.wristAboveShoulder) score += 15;
    if (f.armSpread > 2.0) score += 25;
    if (f.shoulder > 100) score += 20;
    if (f.elbow < 130 && f.elbow > 60) score += 15;
    if (f.knee > 140) score += 5;
    return score;
  },
  pullUp: (f) => {
    let score = 0;
    if (f.wristAboveShoulder) score += 25;
    if (f.armSpread > 1.5) score += 15;
    if (f.shoulder > 110) score += 20;
    if (f.elbow < 120) score += 15;
    return score;
  },
  lunge: (f) => {
    let score = 0;
    if (f.isUpright) score += 10;
    if (f.kneeAsym > 30) score += 40;
    if (f.kneeAsym > 50) score += 15;
    if (f.knee < 150) score += 10;
    return score;
  },
  legPress: (f) => {
    let score = 0;
    if (f.isHorizontal) score += 20;
    if (f.knee < 110) score += 25;
    if (f.hip < 90) score += 25;
    if (f.shoulder < 40) score += 10;
    if (f.isUpright) score -= 10;
    if (f.isLeaning && !f.isHorizontal) score -= 10;
    return score;
  },
  cableFly: (f) => {
    let score = 0;
    if (f.isUpright) score += 10;
    if (f.armSpread > 1.8) score += 25;
    if (f.wristAtShoulder || f.wristAtChest) score += 25;
    if (f.elbow > 110) score += 15;
    if (f.shoulder > 50 && f.shoulder < 120) score += 10;
    return score;
  },
  lateralRaise: (f) => {
    let score = 0;
    if (f.isUpright) score += 10;
    if (f.armSpread > 2.0) score += 25;
    if (f.wristAtShoulder) score += 30;
    if (f.elbow > 140) score += 15;
    if (f.shoulder > 70 && f.shoulder < 110) score += 10;
    return score;
  },
  hipThrust: (f) => {
    let score = 0;
    if (f.isHorizontal || f.isLeaning) score += 15;
    if (f.knee > 70 && f.knee < 120) score += 20;
    if (f.hip > 140) score += 25;
    if (f.shoulder < 50) score += 10;
    return score;
  },
};

/**
 * 모든 운동 규칙에 대해 점수를 계산하고 최고 점수를 선택한다.
 */
function selectBestExercise(scores, landmarks) {
  const boosts = getLearnedBoosts(landmarks);
  const boostedScores = { ...scores };

  for (const [key, boost] of Object.entries(boosts)) {
    if (boostedScores[key] !== undefined) {
      boostedScores[key] = Math.max(0, boostedScores[key] + boost);
    }
  }

  let bestKey = "squat";
  let bestScore = 0;
  for (const [key, score] of Object.entries(boostedScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  const sorted = Object.entries(boostedScores).sort((a, b) => b[1] - a[1]);
  const top3 = sorted.slice(0, 3).map(([k, v]) => ({ key: k, score: v }));
  const hasBoost = Object.keys(boosts).length > 0;
  const confidence = Math.min(MAX_CONFIDENCE, Math.round(bestScore * CONFIDENCE_MULTIPLIER));

  return { key: bestKey, confidence, top3, learned: hasBoost };
}

export function classifyExercise(landmarks) {
  if (!landmarks || landmarks.length < MIN_LANDMARKS) {
    return { key: "squat", confidence: 0 };
  }

  const features = extractClassifierFeatures(landmarks);

  const scores = {};
  for (const [key, scoreFn] of Object.entries(EXERCISE_RULES)) {
    scores[key] = scoreFn(features);
  }

  return selectBestExercise(scores, landmarks);
}

/**
 * 관절 각도 추출 (외부 디버그/표시용)
 * @param {Array} landmarks - 33개 정규화 랜드마크
 * @returns {Object|null} 각 관절의 각도값
 */
export function getJointAngles(landmarks) {
  if (!landmarks || landmarks.length < MIN_LANDMARKS) return null;

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
