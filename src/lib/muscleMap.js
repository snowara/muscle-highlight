// ============================================================
// muscleMap.js — Pose-Aware Muscle Position & Status Calculator
//
// poseAnalyzer의 자세 판정 결과(poseResult)를 받아서
// 각 근육의 캔버스 좌표, 크기, 색상, poseStatus를 동적으로 계산.
//
// poseStatus 3단계:
//   "correct" — 올바른 자세 (파란 계열 글로우)
//   "wrong"   — 잘못된 자세 (빨간 계열 글로우 + 경고 아이콘)
//   "neutral" — 안정근 / 판정 없음 (약한 글로우)
//
// 반환 형식: { muscleId: MuscleDescriptor, ... }
//   MuscleDescriptor = {
//     id, label, x, y, radiusX, radiusY, rotation,
//     intensity, type, poseStatus, color, points,
//     iconPosition  // wrong일 때만 { x, y }
//   }
// ============================================================

import { MUSCLE_REGIONS } from '../data/muscles';
import { EXERCISE_DB } from '../data/exercises';

// ── Shape Metadata (angle/aspect/scale per muscle) ──

export const MUSCLE_SHAPES = {
  chest:      { angle: 0,                aspect: 1.8,  scale: 1.3  },
  shoulders:  { angle: 0,                aspect: 1.2,  scale: 1.0  },
  biceps:     { angle: Math.PI * 0.15,   aspect: 0.6,  scale: 0.9  },
  triceps:    { angle: Math.PI * 0.15,   aspect: 0.6,  scale: 0.85 },
  forearms:   { angle: Math.PI * 0.1,    aspect: 0.5,  scale: 0.8  },
  lats:       { angle: 0,                aspect: 0.7,  scale: 1.1  },
  traps:      { angle: 0,                aspect: 1.6,  scale: 0.85 },
  core:       { angle: 0,                aspect: 0.7,  scale: 1.2  },
  lowerBack:  { angle: 0,                aspect: 1.2,  scale: 1.0  },
  glutes:     { angle: 0,                aspect: 1.3,  scale: 1.1  },
  quadriceps: { angle: 0,                aspect: 0.6,  scale: 1.3  },
  hamstrings: { angle: 0,                aspect: 0.55, scale: 1.2  },
  calves:     { angle: 0,                aspect: 0.5,  scale: 1.0  },
};

// ── Role-based defaults ──

const BASE_RADIUS = {
  primary:    28,
  secondary:  20,
  stabilizer: 14,
};

const DEFAULT_INTENSITY = {
  primary:    0.85,
  secondary:  0.50,
  stabilizer: 0.20,
};

// ── Helpers ──

function extractMuscleKeys(muscleField) {
  if (!muscleField) return [];
  if (Array.isArray(muscleField)) return muscleField;
  return Object.keys(muscleField);
}

function getActivation(muscleField, muscleId) {
  if (!muscleField) return null;
  if (Array.isArray(muscleField)) return null;
  const val = muscleField[muscleId];
  return typeof val === 'number' ? val : null;
}

// ============================================================
// getMusclePositions — 핵심 함수
// ============================================================
//
// @param {Array}       landmarks   MediaPipe 33-point (normalized 0~1)
// @param {number}      canvasW     캔버스 너비 (px)
// @param {number}      canvasH     캔버스 높이 (px)
// @param {string|null} exerciseId  운동 ID (EXERCISE_DB 키)
// @param {Object|null} poseResult  poseAnalyzer.analyzePose() 반환값
//   - wrongMuscles: string[]  잘못 사용된 근육 ID 배열
//   - score: number           전체 자세 점수 (0~100)
//   - corrections: Array      교정 메시지 (optional)
//
// @returns {Object} muscleId → MuscleDescriptor 맵
// ============================================================

export function getMusclePositions(landmarks, canvasW, canvasH, exerciseId = null, poseResult = null) {
  // ── 좌표 변환 유틸 ──
  const p    = (i) => ({ x: landmarks[i].x * canvasW, y: landmarks[i].y * canvasH });
  const mid  = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

  // ── 주요 관절 좌표 ──
  const ls = p(11), rs = p(12);   // 어깨
  const le = p(13), re = p(14);   // 팔꿈치
  const lw = p(15), rw = p(16);   // 손목
  const lh = p(23), rh = p(24);   // 엉덩이
  const lk = p(25), rk = p(26);   // 무릎
  const la = p(27), ra = p(28);   // 발목
  const nose = p(0);

  // ── 기준 계산 ──
  const shoulderMid   = mid(ls, rs);
  const hipMid        = mid(lh, rh);
  const shoulderWidth = Math.abs(rs.x - ls.x);
  const bodyScale     = Math.max(shoulderWidth / 120, 0.6);

  // ── 운동 데이터 ──
  const exercise       = exerciseId ? EXERCISE_DB[exerciseId] : null;
  const primaryKeys    = exercise ? extractMuscleKeys(exercise.primary) : [];
  const secondaryKeys  = exercise ? extractMuscleKeys(exercise.secondary) : [];
  const primarySet     = new Set(primaryKeys);
  const secondarySet   = new Set(secondaryKeys);

  // ── poseResult 파싱 ──
  const wrongSet = new Set(poseResult?.wrongMuscles || []);

  // ── 역할 판별 ──
  function getRole(muscleId) {
    if (primarySet.has(muscleId)) return 'primary';
    if (secondarySet.has(muscleId)) return 'secondary';
    return 'stabilizer';
  }

  // ── poseStatus 결정 ──
  function getPoseStatus(muscleId) {
    if (!poseResult) return 'neutral';
    if (wrongSet.has(muscleId)) return 'wrong';
    const role = getRole(muscleId);
    if (role === 'primary' || role === 'secondary') return 'correct';
    return 'neutral';
  }

  // ── 색상 결정 ──
  function getColor(muscleId, status) {
    const muscle = MUSCLE_REGIONS[muscleId];
    if (!muscle) return '#FFFFFF';
    if (status === 'wrong') return muscle.wrongColor;
    return muscle.correctColor;
  }

  // ── intensity 결정 (activation 값 우선, 없으면 역할 기본값) ──
  function getIntensity(muscleId, role) {
    if (!exercise) return DEFAULT_INTENSITY.stabilizer;
    const field = role === 'primary' ? exercise.primary : exercise.secondary;
    const activation = getActivation(field, muscleId);
    if (activation !== null) return activation / 100;
    return DEFAULT_INTENSITY[role] || DEFAULT_INTENSITY.stabilizer;
  }

  // ============================================================
  // 근육별 글로우 포인트 좌표 (좌우 대칭, 랜드마크 기반)
  // ============================================================

  const rawPositions = {
    // ── 가슴: 어깨중간 ~ 힙중간 상단 ──
    chest: [
      lerp(shoulderMid, hipMid, 0.08),
      { x: shoulderMid.x - shoulderWidth * 0.15, y: lerp(shoulderMid, hipMid, 0.14).y },
      { x: shoulderMid.x + shoulderWidth * 0.15, y: lerp(shoulderMid, hipMid, 0.14).y },
    ],

    // ── 어깨: 어깨 관절 바깥쪽 ──
    shoulders: [
      { x: ls.x - shoulderWidth * 0.10, y: ls.y },
      { x: ls.x - shoulderWidth * 0.04, y: ls.y + shoulderWidth * 0.08 },
      { x: rs.x + shoulderWidth * 0.10, y: rs.y },
      { x: rs.x + shoulderWidth * 0.04, y: rs.y + shoulderWidth * 0.08 },
    ],

    // ── 이두: 어깨→팔꿈치 40~60% ──
    biceps: [
      lerp(ls, le, 0.4),
      lerp(ls, le, 0.6),
      lerp(rs, re, 0.4),
      lerp(rs, re, 0.6),
    ],

    // ── 삼두: 어깨→팔꿈치 45~65% (뒤쪽) ──
    triceps: [
      lerp(ls, le, 0.45),
      lerp(ls, le, 0.65),
      lerp(rs, re, 0.45),
      lerp(rs, re, 0.65),
    ],

    // ── 전완: 팔꿈치→손목 30~60% ──
    forearms: [
      lerp(le, lw, 0.3),
      lerp(le, lw, 0.6),
      lerp(re, rw, 0.3),
      lerp(re, rw, 0.6),
    ],

    // ── 광배: 몸통 옆쪽 (겨드랑이 아래) ──
    lats: [
      { x: ls.x + shoulderWidth * 0.12, y: lerp(ls, lh, 0.35).y },
      { x: ls.x + shoulderWidth * 0.12, y: lerp(ls, lh, 0.58).y },
      { x: rs.x - shoulderWidth * 0.12, y: lerp(rs, rh, 0.35).y },
      { x: rs.x - shoulderWidth * 0.12, y: lerp(rs, rh, 0.58).y },
    ],

    // ── 승모: 어깨중간→코 방향 (목~등 위쪽) ──
    traps: [
      lerp(shoulderMid, nose, 0.2),
      lerp(shoulderMid, nose, 0.4),
      { x: ls.x + shoulderWidth * 0.08, y: lerp(shoulderMid, nose, 0.15).y },
      { x: rs.x - shoulderWidth * 0.08, y: lerp(shoulderMid, nose, 0.15).y },
    ],

    // ── 복근: 어깨중간→힙중간 42~68% ──
    core: [
      lerp(shoulderMid, hipMid, 0.42),
      lerp(shoulderMid, hipMid, 0.55),
      lerp(shoulderMid, hipMid, 0.68),
    ],

    // ── 허리: 어깨중간→힙중간 65~82% ──
    lowerBack: [
      lerp(shoulderMid, hipMid, 0.65),
      lerp(shoulderMid, hipMid, 0.82),
    ],

    // ── 둔근: 힙→무릎 5~14% ──
    glutes: [
      { x: lh.x, y: lerp(lh, lk, 0.05).y },
      { x: lh.x, y: lerp(lh, lk, 0.14).y },
      { x: rh.x, y: lerp(rh, rk, 0.05).y },
      { x: rh.x, y: lerp(rh, rk, 0.14).y },
    ],

    // ── 대퇴사두: 힙→무릎 25~58% ──
    quadriceps: [
      lerp(lh, lk, 0.25),
      lerp(lh, lk, 0.42),
      lerp(lh, lk, 0.58),
      lerp(rh, rk, 0.25),
      lerp(rh, rk, 0.42),
      lerp(rh, rk, 0.58),
    ],

    // ── 햄스트링: 힙→무릎 30~50% (뒤쪽 오프셋) ──
    hamstrings: [
      { x: lerp(lh, lk, 0.3).x + 4, y: lerp(lh, lk, 0.3).y },
      { x: lerp(lh, lk, 0.5).x + 4, y: lerp(lh, lk, 0.5).y },
      { x: lerp(rh, rk, 0.3).x - 4, y: lerp(rh, rk, 0.3).y },
      { x: lerp(rh, rk, 0.5).x - 4, y: lerp(rh, rk, 0.5).y },
    ],

    // ── 종아리: 무릎→발목 30~55% ──
    calves: [
      lerp(lk, la, 0.3),
      lerp(lk, la, 0.55),
      lerp(rk, ra, 0.3),
      lerp(rk, ra, 0.55),
    ],
  };

  // ============================================================
  // MuscleDescriptor 조립
  // ============================================================

  const result = {};

  for (const muscleId of Object.keys(rawPositions)) {
    const points     = rawPositions[muscleId];
    const muscle     = MUSCLE_REGIONS[muscleId];
    const shape      = MUSCLE_SHAPES[muscleId];
    const role       = getRole(muscleId);
    const poseStatus = getPoseStatus(muscleId);
    const color      = getColor(muscleId, poseStatus);
    const intensity  = getIntensity(muscleId, role);

    // 중심점 (centroid)
    const cx = points.reduce((s, pt) => s + pt.x, 0) / points.length;
    const cy = points.reduce((s, pt) => s + pt.y, 0) / points.length;

    // 반지름 (역할별 기본 크기 * bodyScale * shape.scale)
    const baseR  = (BASE_RADIUS[role] || 14) * bodyScale * (shape?.scale || 1);
    const aspect = shape?.aspect || 1.0;
    const radiusX  = baseR;
    const radiusY  = baseR / Math.max(aspect, 0.3);
    const rotation = shape?.angle || 0;

    const descriptor = {
      id:        muscleId,
      label:     muscle?.label || muscleId,
      x:         cx,
      y:         cy,
      radiusX,
      radiusY,
      rotation,
      intensity,
      type:       role,        // 'primary' | 'secondary' | 'stabilizer'
      poseStatus,              // 'correct' | 'wrong' | 'neutral'
      color,                   // hex (파란/빨간 계열)
      points,                  // 개별 글로우 포인트 배열
      iconPosition: null,      // wrong일 때만 설정
    };

    // wrong 근육: 경고 아이콘 위치 (중심점 우상단)
    if (poseStatus === 'wrong') {
      descriptor.iconPosition = {
        x: cx + radiusX * 0.85,
        y: cy - radiusY * 0.85,
      };
    }

    result[muscleId] = descriptor;
  }

  return result;
}

// ============================================================
// getBodyScale — 어깨 너비 기반 스케일 팩터
// ============================================================

export function getBodyScale(landmarks, canvasW) {
  const lsX = landmarks[11].x * canvasW;
  const rsX = landmarks[12].x * canvasW;
  const shoulderWidth = Math.abs(rsX - lsX);
  return Math.max(shoulderWidth / 120, 0.6);
}

// ============================================================
// getSkeletonConnections — 관절 연결선 좌표
// ============================================================

export function getSkeletonConnections(landmarks, canvasW, canvasH) {
  const p = (i) => ({ x: landmarks[i].x * canvasW, y: landmarks[i].y * canvasH });
  const connections = [
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
    [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
    [24, 26], [26, 28],
  ];
  return connections.map(([a, b]) => [p(a), p(b)]);
}
