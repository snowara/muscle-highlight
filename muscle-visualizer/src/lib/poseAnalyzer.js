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

// ── 유틸리티 ──
function angleDeg(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.sqrt(ab.x ** 2 + ab.y ** 2) * Math.sqrt(cb.x ** 2 + cb.y ** 2);
  if (mag === 0) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

function mid(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// ── 교정 사항의 bodyPart → 근육 매핑 ──
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
  if (!lm || lm.length < 29) return null;

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

  // Knee valgus check (x-axis)
  const kneeValgusL = lm[25].x < Math.min(lm[23].x, lm[27].x) - 0.015;
  const kneeValgusR = lm[26].x > Math.max(lm[24].x, lm[28].x) + 0.015;

  // Wrist positions
  const wristMid = mid(lm[15], lm[16]);
  const wristAboveShoulder = wristMid.y < sMid.y - 0.03;

  return {
    kneeL, kneeR, knee: (kneeL + kneeR) / 2,
    hipL, hipR, hip: (hipL + hipR) / 2,
    elbowL, elbowR, elbow: (elbowL + elbowR) / 2,
    shoulderL, shoulderR, shoulder: (shoulderL + shoulderR) / 2,
    torsoFromVertical,
    kneeValgusL, kneeValgusR,
    wristAboveShoulder,
    isUpright: torsoFromVertical < 30,
    isLeaning: torsoFromVertical >= 30 && torsoFromVertical < 55,
    isHorizontal: torsoFromVertical >= 55,
  };
}

// ── 운동별 자세 검사 ──
// 각 검사는 correction 인덱스와 점수 감점을 반환
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
    if (a.torsoFromVertical < 20) issues.push(0); // back rounding (hard to detect, approximate)
    if (a.elbow < 140) issues.push(1); // bar drifting
    if (a.hip > 170 && a.torsoFromVertical < 10) issues.push(2); // hyperextension at lockout
    if (a.torsoFromVertical > 50 && a.knee > 150) issues.push(3); // hips rising too fast
    return issues;
  },
  benchPress: (a) => {
    const issues = [];
    if (a.shoulder > 100) issues.push(0); // elbow flaring
    if (a.wristAboveShoulder) issues.push(1); // bar too high
    // scapula retraction - hard to detect from 2D
    return issues;
  },
  shoulderPress: (a) => {
    const issues = [];
    if (a.torsoFromVertical > 25 && a.isUpright) issues.push(0); // excessive arch
    if (a.shoulder < 80) issues.push(1); // elbows drifting forward
    if (a.shoulder > 150) issues.push(2); // shrugging
    return issues;
  },
  bicepCurl: (a) => {
    const issues = [];
    if (a.torsoFromVertical > 15) issues.push(0); // swinging
    if (a.shoulder > 40) issues.push(1); // elbow drifting
    return issues;
  },
  latPulldown: (a) => {
    const issues = [];
    if (a.torsoFromVertical > 30) issues.push(0); // leaning back too much
    if (a.shoulder < 60) issues.push(1); // pulling with arms
    return issues;
  },
  lunge: (a) => {
    const issues = [];
    if (a.kneeValgusL || a.kneeValgusR) issues.push(0);
    if (a.torsoFromVertical > 25) issues.push(1);
    if (Math.abs(a.kneeL - a.kneeR) < 15) issues.push(2); // stride too short
    return issues;
  },
  plank: (a) => {
    const issues = [];
    if (a.hip < 150 && a.isHorizontal) issues.push(0); // hips piking
    if (a.hip > 190) issues.push(1); // hips sagging (approximate)
    return issues;
  },
  legPress: (a) => {
    const issues = [];
    if (a.knee > 170) issues.push(0); // locking knees
    return issues;
  },
  cableFly: (a) => {
    const issues = [];
    if (a.elbow < 100) issues.push(0); // bending elbows too much
    if (a.torsoFromVertical > 25) issues.push(1); // leaning forward
    return issues;
  },
  lateralRaise: (a) => {
    const issues = [];
    if (a.torsoFromVertical > 15) issues.push(0); // swinging
    if (a.shoulder > 130) issues.push(1); // shrugging
    return issues;
  },
  legCurl: (a) => {
    const issues = [];
    if (a.hip < 160 && a.isHorizontal) issues.push(0); // hips lifting
    if (a.knee > 120) issues.push(1); // partial range
    return issues;
  },
  pullUp: (a) => {
    const issues = [];
    if (a.torsoFromVertical > 20) issues.push(0); // kipping
    return issues;
  },
  hipThrust: (a) => {
    const issues = [];
    if (a.torsoFromVertical < 20 && a.hip > 170) issues.push(0); // hyperextending
    return issues;
  },
};

// ── 범용 분석 (운동별 전용 체크가 없는 경우) ──
function genericCheck(a, exercise) {
  const issues = [];
  // 기본적인 자세 체크
  if (exercise.corrections && exercise.corrections.length > 0) {
    // 첫 번째 교정 사항은 가장 흔한 문제 → 범용적으로 몸통 흔들림 체크
    if (a.torsoFromVertical > 30 && a.isUpright) issues.push(0);
  }
  return issues;
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
  if (!exercise || !landmarks) {
    return {
      score: 85,
      level: "good",
      activeCorrections: [],
      goodPoints: [],
      muscleStatus: {},
    };
  }

  const angles = computeAngles(landmarks);
  if (!angles) {
    return {
      score: 85,
      level: "good",
      activeCorrections: [],
      goodPoints: [],
      muscleStatus: {},
    };
  }

  // 운동별 전용 체크 또는 범용 체크 실행
  const checker = EXERCISE_CHECKS[exerciseKey] || ((a) => genericCheck(a, exercise));
  const issueIndices = checker(angles);

  // 교정 사항 추출
  const corrections = exercise.corrections || [];
  const activeCorrections = issueIndices
    .filter((i) => i < corrections.length)
    .map((i) => ({
      ...corrections[i],
      index: i,
    }));

  // 점수 계산: 기본 100점에서 문제당 감점
  const totalChecks = corrections.length || 1;
  const deductionPerIssue = Math.min(25, Math.floor(80 / totalChecks));
  const score = Math.max(10, Math.min(100, 100 - activeCorrections.length * deductionPerIssue));

  // 레벨 판정
  let level;
  if (score >= 80) level = "good";
  else if (score >= 60) level = "warning";
  else level = "bad";

  // 근육별 상태 계산
  // 문제 있는 bodyPart에 연결된 근육은 "bad" (빨간색)
  // 나머지 active 근육은 "good" (파란색)
  const badMuscles = new Set();
  activeCorrections.forEach((c) => {
    const muscles = getMusclesForBodyPart(c.bodyPart);
    muscles.forEach((m) => badMuscles.add(m));
  });

  const muscleStatus = {};
  const allMuscles = [
    ...Object.keys(exercise.primary || {}),
    ...Object.keys(exercise.secondary || {}),
  ];
  allMuscles.forEach((m) => {
    muscleStatus[m] = badMuscles.has(m) ? "bad" : "good";
  });

  // 올바른 포인트 (문제가 아닌 교정 사항들)
  const goodPoints = corrections
    .filter((_, i) => !issueIndices.includes(i))
    .map((c) => c.issue);

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
