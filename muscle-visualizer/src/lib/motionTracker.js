/**
 * motionTracker.js -- 연속 프레임 관절각도 변화로 운동 패턴 추정
 *
 * poseDetector.js에서 분리. MotionTracker 클래스를 제공하며
 * 영상 실시간 감지 시 프레임별 관절각도 히스토리를 분석하여
 * 현재 수행 중인 운동을 추정한다.
 */

import { extractAngles } from "./poseUtils";

// ── 상수 ──
const MAX_HISTORY = 90;         // ~6초 at 15fps
const MIN_FRAMES = 15;          // 최소 분석 프레임 수
const MIN_BEST_SCORE = 40;      // 최소 인식 점수
const CONFIDENCE_MULTIPLIER = 1.1;
const MAX_CONFIDENCE = 100;
const TOP_N = 3;

// ── 모션 임계값 ──
const UPRIGHT_MAX = 35;
const LEANING_MIN = 35;
const LEANING_MAX = 60;

const KNEE_MOTION_THRESHOLD = 20;
const ELBOW_MOTION_THRESHOLD = 20;
const HIP_MOTION_THRESHOLD = 15;
const SHOULDER_MOTION_THRESHOLD = 15;

// ── 유틸 ──
function range(arr) {
  return Math.max(...arr) - Math.min(...arr);
}

function average(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

// ── 운동별 스코어링 규칙 ──
// 각 규칙 함수는 (features) => score 형태

function scoreSquat(f) {
  let score = 0;
  if (f.isUpright) score += 25;
  if (f.hasKneeMotion && f.kneeRange > 30) score += 35;
  if (f.hasHipMotion) score += 20;
  if (!f.hasElbowMotion) score += 10;
  return score;
}

function scoreBenchPress(f) {
  let score = 0;
  if (f.isHorizontal) score += 30;
  if (f.hasElbowMotion && f.elbowRange > 25) score += 30;
  if (!f.hasKneeMotion) score += 15;
  return score;
}

function scoreBicepCurl(f) {
  let score = 0;
  if (f.isUpright) score += 20;
  if (f.hasElbowMotion && f.elbowRange > 30) score += 35;
  if (!f.hasKneeMotion) score += 10;
  if (!f.hasShoulderMotion || f.shoulderRange < 20) score += 15;
  if (f.avgShoulder < 40) score += 10;
  return score;
}

function scoreShoulderPress(f) {
  let score = 0;
  if (f.isUpright) score += 15;
  if (f.hasShoulderMotion && f.shoulderRange > 20) score += 30;
  if (f.hasElbowMotion) score += 20;
  if (f.avgShoulder > 100) score += 20;
  return score;
}

function scoreDeadlift(f) {
  let score = 0;
  if (f.isLeaning) score += 25;
  if (f.hasHipMotion && f.hipRange > 20) score += 30;
  if (f.kneeRange > 10 && f.kneeRange < 40) score += 15;
  if (!f.hasElbowMotion || f.elbowRange < 20) score += 15;
  return score;
}

function scoreLatPulldown(f) {
  let score = 0;
  if (f.isUpright) score += 10;
  if (f.hasShoulderMotion && f.shoulderRange > 25) score += 25;
  if (f.hasElbowMotion && f.elbowRange > 25) score += 25;
  if (f.avgShoulder > 80) score += 15;
  return score;
}

function scoreLunge(f) {
  let score = 0;
  if (f.isUpright) score += 15;
  if (f.hasKneeMotion) score += 15;
  if (f.avgKneeAsym > 20) score += 35;
  if (f.avgKneeAsym > 40) score += 15;
  return score;
}

function scorePlank(f) {
  let score = 0;
  if (f.isHorizontal) score += 40;
  if (!f.hasKneeMotion && !f.hasElbowMotion && !f.hasHipMotion) score += 30;
  if (f.avgKnee > 150) score += 15;
  return score;
}

function scoreBarbellRow(f) {
  let score = 0;
  if (f.isLeaning) score += 25;
  if (f.hasElbowMotion && f.elbowRange > 20) score += 30;
  if (!f.hasKneeMotion || f.kneeRange < 15) score += 10;
  return score;
}

function scoreLateralRaise(f) {
  let score = 0;
  if (f.isUpright) score += 15;
  if (f.hasShoulderMotion && f.shoulderRange > 25) score += 35;
  if (!f.hasKneeMotion) score += 10;
  if (!f.hasElbowMotion || f.elbowRange < 15) score += 15;
  return score;
}

function scoreHipThrust(f) {
  let score = 0;
  if (f.isHorizontal || f.isLeaning) score += 15;
  if (f.hasHipMotion && f.hipRange > 25) score += 30;
  if (f.kneeRange < 20) score += 15;
  return score;
}

const EXERCISE_SCORE_RULES = {
  squat: scoreSquat,
  benchPress: scoreBenchPress,
  bicepCurl: scoreBicepCurl,
  shoulderPress: scoreShoulderPress,
  deadlift: scoreDeadlift,
  latPulldown: scoreLatPulldown,
  lunge: scoreLunge,
  plank: scorePlank,
  barbellRow: scoreBarbellRow,
  lateralRaise: scoreLateralRaise,
  hipThrust: scoreHipThrust,
};

/**
 * 각도 히스토리에서 모션 특징 벡터를 추출한다.
 */
function extractMotionFeatures(history) {
  const kneeValues = history.map((h) => h.angles.knee);
  const elbowValues = history.map((h) => h.angles.elbow);
  const hipValues = history.map((h) => h.angles.hip);
  const shoulderValues = history.map((h) => h.angles.shoulder);
  const torsoValues = history.map((h) => h.angles.torso);

  const kneeRange = range(kneeValues);
  const elbowRange = range(elbowValues);
  const hipRange = range(hipValues);
  const shoulderRange = range(shoulderValues);

  const avgTorso = average(torsoValues);
  const avgShoulder = average(shoulderValues);
  const avgKnee = average(kneeValues);

  const kneeAsymHistory = history.map((h) => Math.abs(h.angles.kneeL - h.angles.kneeR));
  const avgKneeAsym = average(kneeAsymHistory);

  return {
    kneeRange,
    elbowRange,
    hipRange,
    shoulderRange,
    avgTorso,
    avgShoulder,
    avgKnee,
    avgKneeAsym,
    isUpright: avgTorso < UPRIGHT_MAX,
    isLeaning: avgTorso >= LEANING_MIN && avgTorso < LEANING_MAX,
    isHorizontal: avgTorso >= LEANING_MAX,
    hasKneeMotion: kneeRange > KNEE_MOTION_THRESHOLD,
    hasElbowMotion: elbowRange > ELBOW_MOTION_THRESHOLD,
    hasHipMotion: hipRange > HIP_MOTION_THRESHOLD,
    hasShoulderMotion: shoulderRange > SHOULDER_MOTION_THRESHOLD,
  };
}

/**
 * 특징 벡터에서 각 운동의 점수를 계산하고 최고 점수를 반환한다.
 */
function findBestExercise(features) {
  const scores = {};
  for (const [key, scoreFn] of Object.entries(EXERCISE_SCORE_RULES)) {
    scores[key] = scoreFn(features);
  }

  let bestKey = null;
  let bestScore = 0;
  for (const [key, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  if (bestScore < MIN_BEST_SCORE) return null;

  const confidence = Math.min(MAX_CONFIDENCE, Math.round(bestScore * CONFIDENCE_MULTIPLIER));
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top3 = sorted.slice(0, TOP_N).map(([k, v]) => ({ key: k, score: v }));

  return { key: bestKey, confidence, top3 };
}

/**
 * MotionTracker -- 연속 프레임의 관절각도 변화로 운동 패턴 추정
 */
export class MotionTracker {
  constructor() {
    this.angleHistory = [];
    this.maxHistory = MAX_HISTORY;
    this.detectedExercise = null;
    this.confidence = 0;
  }

  reset() {
    this.angleHistory = [];
    this.detectedExercise = null;
    this.confidence = 0;
  }

  addFrame(landmarks, timestamp) {
    const angles = extractAngles(landmarks);
    if (!angles) return null;

    this.angleHistory = [...this.angleHistory, { angles, timestamp }];
    if (this.angleHistory.length > this.maxHistory) {
      this.angleHistory = this.angleHistory.slice(1);
    }
    if (this.angleHistory.length < MIN_FRAMES) return null;

    return this._analyzePattern();
  }

  _analyzePattern() {
    const features = extractMotionFeatures(this.angleHistory);
    const result = findBestExercise(features);

    if (result) {
      this.detectedExercise = result.key;
      this.confidence = result.confidence;
    }

    return result;
  }
}

/**
 * MotionTracker 인스턴스 생성 (외부에서 독립적으로 사용)
 */
export function createMotionTracker() {
  return new MotionTracker();
}
