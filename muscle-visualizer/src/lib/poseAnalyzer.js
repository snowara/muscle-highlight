/**
 * poseAnalyzer.js — AI 자세 분석 엔진
 *
 * 포즈 랜드마크와 운동 종류를 받아서:
 * 1. 자세 점수 (0~100)
 * 2. 활성화된 교정 사항 (corrections 배열 인덱스)
 * 3. 근육별 상태 (good=파란색, bad=빨간색)
 * 를 반환한다.
 */

import { EXERCISE_DB } from "../data/exercises";
import { angleDeg, mid } from "./poseUtils";

// ── 상수 ──
const MIN_LANDMARKS = 29;
const BASE_SCORE = 100;
const MIN_SCORE = 10;
const MAX_DEDUCTION_PER_ISSUE = 25;
const DEDUCTION_BASE = 80;
const DEFAULT_SCORE = 85;

// 레벨 임계값
const GOOD_THRESHOLD = 80;
const WARNING_THRESHOLD = 60;

// 자세 분석 임계값
const UPRIGHT_MAX = 30;
const LEANING_MAX = 55;
const VALGUS_THRESHOLD = 0.015;
const WRIST_ABOVE_THRESHOLD = 0.03;
const GENERIC_TORSO_THRESHOLD = 30;

// ── 교정 사항의 bodyPart -> 근육 매핑 ──
const BODY_PART_MUSCLES = {
  "무릎": ["quadriceps", "hamstrings"],
  "앞 무릎": ["quadriceps"],
  "상체 / 몸통": ["core", "lowerBack"],
  "몸통": ["core", "lowerBack"],
  "몸통 / 허리": ["core", "lowerBack"],
  "몸통 / 요추": ["core", "lowerBack"],
  "고관절 / 대퇴부": ["glutes", "quadriceps"],
  "고관절": ["glutes", "hamstrings"],
  "고관절 / 스탠스": ["glutes", "quadriceps"],
  "고관절 / 엉덩이": ["glutes"],
  "요추 / 골반": ["lowerBack", "glutes"],
  "요추": ["lowerBack"],
  "골반": ["glutes", "lowerBack"],
  "골반 / 허리": ["glutes", "lowerBack"],
  "골반 / 하체": ["glutes", "quadriceps"],
  "팔꿈치": ["biceps", "triceps"],
  "팔꿈치 / 어깨": ["shoulders", "triceps"],
  "손목": ["forearms"],
  "손목 / 바 궤도": ["forearms"],
  "손목 / 팔": ["forearms"],
  "손목 / 어깨": ["forearms", "shoulders"],
  "견갑골 / 등 상부": ["traps", "lats"],
  "견갑골 / 어깨": ["traps", "shoulders"],
  "견갑골": ["traps"],
  "흉추 / 요추": ["lowerBack", "core"],
  "팔 / 상체": ["biceps", "forearms"],
  "팔 / 이두근": ["biceps"],
  "팔 / 등": ["lats", "biceps"],
  "팔 / 어깨": ["shoulders", "triceps"],
  "팔 / 고관절": ["biceps", "glutes"],
  "어깨": ["shoulders"],
  "어깨 / 견갑골": ["shoulders", "traps"],
  "어깨 / 회전근개": ["shoulders"],
  "승모근": ["traps"],
  "승모근 / 어깨": ["traps", "shoulders"],
  "경추 / 목": ["traps"],
  "경추": ["traps"],
  "하체": ["quadriceps", "hamstrings", "glutes"],
  "하체 / 코어": ["quadriceps", "core"],
  "몸통 / 하체": ["core", "quadriceps"],
  "전완": ["forearms"],
  "전완근 / 악력": ["forearms"],
  "무릎 / 고관절": ["quadriceps", "glutes"],
  "발목": ["calves"],
  "발 / 무릎": ["quadriceps", "calves"],
  "뒷다리": ["hamstrings"],
  "햄스트링": ["hamstrings"],
  "벤치 / 어깨": ["shoulders"],
};

function getMusclesForBodyPart(bodyPart) {
  return BODY_PART_MUSCLES[bodyPart] || [];
}

// ── 전체 관절 각도 계산 ──
function computeAngles(lm) {
  if (!lm || lm.length < MIN_LANDMARKS) return null;

  const kneeL = angleDeg(lm[23], lm[25], lm[27]);
  const kneeR = angleDeg(lm[24], lm[26], lm[28]);
  const hipL = angleDeg(lm[11], lm[23], lm[25]);
  const hipR = angleDeg(lm[12], lm[24], lm[26]);
  const elbowL = angleDeg(lm[11], lm[13], lm[15]);
  const elbowR = angleDeg(lm[12], lm[14], lm[16]);
  const shoulderL = angleDeg(lm[13], lm[11], lm[23]);
  const shoulderR = angleDeg(lm[14], lm[12], lm[24]);

  const sMid = mid(lm[11], lm[12]);
  const hMid = mid(lm[23], lm[24]);
  const dx = hMid.x - sMid.x;
  const dy = hMid.y - sMid.y;
  const torsoFromVertical = Math.abs(Math.atan2(dx, dy) * 180 / Math.PI);

  const kneeValgusL = lm[25].x < Math.min(lm[23].x, lm[27].x) - VALGUS_THRESHOLD;
  const kneeValgusR = lm[26].x > Math.max(lm[24].x, lm[28].x) + VALGUS_THRESHOLD;

  const wristMid = mid(lm[15], lm[16]);
  const wristAboveShoulder = wristMid.y < sMid.y - WRIST_ABOVE_THRESHOLD;

  return {
    kneeL, kneeR, knee: (kneeL + kneeR) / 2,
    hipL, hipR, hip: (hipL + hipR) / 2,
    elbowL, elbowR, elbow: (elbowL + elbowR) / 2,
    shoulderL, shoulderR, shoulder: (shoulderL + shoulderR) / 2,
    torsoFromVertical,
    kneeValgusL, kneeValgusR,
    wristAboveShoulder,
    isUpright: torsoFromVertical < UPRIGHT_MAX,
    isLeaning: torsoFromVertical >= UPRIGHT_MAX && torsoFromVertical < LEANING_MAX,
    isHorizontal: torsoFromVertical >= LEANING_MAX,
  };
}

// ── 운동별 자세 검사 ──
const EXERCISE_CHECKS = {
  squat: (a) => {
    const issues = [];
    if (a.kneeValgusL || a.kneeValgusR) issues.push(0);
    if (a.torsoFromVertical > 40) issues.push(1);
    if (a.knee > 135) issues.push(2);
    if (a.hip < 55 && a.knee < 100) issues.push(3);
    return issues;
  },
  deadlift: (a) => {
    const issues = [];
    if (a.torsoFromVertical < 20) issues.push(0);
    if (a.elbow < 140) issues.push(1);
    if (a.hip > 170 && a.torsoFromVertical < 10) issues.push(2);
    if (a.torsoFromVertical > 50 && a.knee > 150) issues.push(3);
    return issues;
  },
  benchPress: (a) => {
    const issues = [];
    if (a.shoulder > 100) issues.push(0);
    if (a.wristAboveShoulder) issues.push(1);
    return issues;
  },
  shoulderPress: (a) => {
    const issues = [];
    if (a.torsoFromVertical > 25 && a.isUpright) issues.push(0);
    if (a.shoulder < 80) issues.push(1);
    if (a.shoulder > 150) issues.push(2);
    return issues;
  },
  bicepCurl: (a) => {
    const issues = [];
    if (a.torsoFromVertical > 15) issues.push(0);
    if (a.shoulder > 40) issues.push(1);
    return issues;
  },
  latPulldown: (a) => {
    const issues = [];
    if (a.torsoFromVertical > 30) issues.push(0);
    if (a.shoulder < 60) issues.push(1);
    return issues;
  },
  lunge: (a) => {
    const issues = [];
    if (a.kneeValgusL || a.kneeValgusR) issues.push(0);
    if (a.torsoFromVertical > 25) issues.push(1);
    if (Math.abs(a.kneeL - a.kneeR) < 15) issues.push(2);
    return issues;
  },
  plank: (a) => {
    const issues = [];
    if (a.hip < 150 && a.isHorizontal) issues.push(0);
    if (a.hip > 190) issues.push(1);
    return issues;
  },
  legPress: (a) => {
    const issues = [];
    if (a.knee > 170) issues.push(0);
    return issues;
  },
  cableFly: (a) => {
    const issues = [];
    if (a.elbow < 100) issues.push(0);
    if (a.torsoFromVertical > 25) issues.push(1);
    return issues;
  },
  lateralRaise: (a) => {
    const issues = [];
    if (a.torsoFromVertical > 15) issues.push(0);
    if (a.shoulder > 130) issues.push(1);
    return issues;
  },
  legCurl: (a) => {
    const issues = [];
    if (a.hip < 160 && a.isHorizontal) issues.push(0);
    if (a.knee > 120) issues.push(1);
    return issues;
  },
  pullUp: (a) => {
    const issues = [];
    if (a.torsoFromVertical > 20) issues.push(0);
    return issues;
  },
  hipThrust: (a) => {
    const issues = [];
    if (a.torsoFromVertical < 20 && a.hip > 170) issues.push(0);
    return issues;
  },
};

// ── 범용 분석 (운동별 전용 체크가 없는 경우) ──
function genericCheck(a, exercise) {
  const issues = [];
  if (exercise.corrections && exercise.corrections.length > 0) {
    if (a.torsoFromVertical > GENERIC_TORSO_THRESHOLD && a.isUpright) issues.push(0);
  }
  return issues;
}

// ── 하위 로직 함수들 ──

function createDefaultResult() {
  return {
    score: DEFAULT_SCORE,
    level: "good",
    activeCorrections: [],
    goodPoints: [],
    muscleStatus: {},
  };
}

/**
 * 점수 계산: 기본 100점에서 문제당 감점
 */
function calculateScore(activeCount, totalChecks) {
  const checks = totalChecks || 1;
  const deduction = Math.min(MAX_DEDUCTION_PER_ISSUE, Math.floor(DEDUCTION_BASE / checks));
  return Math.max(MIN_SCORE, Math.min(BASE_SCORE, BASE_SCORE - activeCount * deduction));
}

/**
 * 점수를 레벨 문자열로 변환
 */
function scoreToLevel(score) {
  if (score >= GOOD_THRESHOLD) return "good";
  if (score >= WARNING_THRESHOLD) return "warning";
  return "bad";
}

/**
 * 근육별 상태 계산: 문제 있는 bodyPart 근육은 "bad", 나머지는 "good"
 */
function determineMuscleStatus(exercise, activeCorrections) {
  const badMuscles = new Set();
  activeCorrections.forEach((c) => {
    const muscles = getMusclesForBodyPart(c.bodyPart);
    muscles.forEach((m) => badMuscles.add(m));
  });

  const allMuscles = [
    ...Object.keys(exercise.primary || {}),
    ...Object.keys(exercise.secondary || {}),
  ];

  const muscleStatus = {};
  allMuscles.forEach((m) => {
    muscleStatus[m] = badMuscles.has(m) ? "bad" : "good";
  });
  return muscleStatus;
}

/**
 * 올바른 포인트 추출 (문제가 아닌 교정 사항들)
 */
function extractGoodPoints(corrections, issueIndices) {
  return corrections
    .filter((_, i) => !issueIndices.includes(i))
    .map((c) => c.issue);
}

/**
 * 자세를 분석하고 점수와 교정 사항을 반환
 *
 * @param {Array} landmarks - 33개 포즈 랜드마크
 * @param {string} exerciseKey - 운동 키
 * @returns {{ score, level, activeCorrections, goodPoints, muscleStatus }}
 */
export function analyzePose(landmarks, exerciseKey) {
  const exercise = EXERCISE_DB[exerciseKey];
  if (!exercise || !landmarks) return createDefaultResult();

  const angles = computeAngles(landmarks);
  if (!angles) return createDefaultResult();

  const checker = EXERCISE_CHECKS[exerciseKey] || ((a) => genericCheck(a, exercise));
  const issueIndices = checker(angles);

  const corrections = exercise.corrections || [];
  const activeCorrections = issueIndices
    .filter((i) => i < corrections.length)
    .map((i) => ({ ...corrections[i], index: i }));

  const score = calculateScore(activeCorrections.length, corrections.length);
  const level = scoreToLevel(score);
  const muscleStatus = determineMuscleStatus(exercise, activeCorrections);
  const goodPoints = extractGoodPoints(corrections, issueIndices);

  return {
    score,
    level,
    activeCorrections,
    goodPoints,
    muscleStatus,
    goodFormMessage: activeCorrections.length === 0 ? exercise.goodFormMessage : null,
    angles,
  };
}

/**
 * 스코어 레벨에 따른 색상 반환
 */
export function getScoreColor(level) {
  if (level === "good") return { bg: "#E84040", text: "#fff", label: "올바른 자세" };
  if (level === "warning") return { bg: "#FFB020", text: "#fff", label: "교정 필요" };
  return { bg: "#FF6B35", text: "#fff", label: "자세 교정 필요" };
}

export { computeAngles };
