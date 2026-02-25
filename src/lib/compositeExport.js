/**
 * compositeExport.js — Canvas 합성 + SNS 공유 최적화 모듈
 *
 * PNG 다운로드: 사진+글로우 합성 → 하단 80px 브랜딩바(헬스장명, 운동명, 자세점수, 주동근, 교정포인트)
 * 영상: worst frame 캡처 / 3-frame 요약 이미지
 * 클립보드 복사: Safari fallback 포함
 * 브랜딩: localStorage 저장, 6컬러 프리셋
 *
 * 출력 최소 1080px. 인스타 최적화.
 */

import { EXERCISE_DB } from "../data/exercises";
import { MUSCLE_REGIONS } from "../data/muscles";
import { renderMuscleOverlay } from "./muscleRenderer";

// ─── 상수 ───────────────────────────────────────────────
const MIN_OUTPUT_WIDTH = 1080;
const BRAND_BAR_HEIGHT = 80;
const FONT_FAMILY = "'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif";
const STORAGE_KEY = "muscle-highlight-brand";

export const COLOR_PRESETS = [
  "#00E5FF", // 시안
  "#FF3B5C", // 레드
  "#7C4DFF", // 퍼플
  "#00E676", // 그린
  "#FF6B35", // 오렌지
  "#FFD700", // 골드
];

const DEFAULT_BRAND = {
  gymName: "MY GYM",
  tagline: "Perfect Your Form",
  brandColor: "#00E5FF",
};

// ─── 자세 점수 시스템 ─────────────────────────────────────

/**
 * 관절 각도 계산 (degree)
 */
function angleDeg(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.sqrt(ab.x ** 2 + ab.y ** 2) * Math.sqrt(cb.x ** 2 + cb.y ** 2);
  if (mag === 0) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

function avg(...vals) {
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function mid(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * 운동별 자세 평가 기준
 * idealRange: [min, max] — 이상적인 관절 각도 범위
 * weight: 점수 가중치 (0~1)
 * label: 교정 포인트 한글 라벨
 */
const POSE_CRITERIA = {
  // ── 하체 ──
  squat: [
    { joint: "knee", idealRange: [70, 110], weight: 0.25, label: "무릎 각도" },
    { joint: "hip", idealRange: [60, 100], weight: 0.25, label: "힙 힌지" },
    { joint: "torsoAngle", idealRange: [0, 30], weight: 0.2, label: "상체 기울기" },
    { joint: "kneeSymmetry", idealRange: [0, 10], weight: 0.15, label: "좌우 대칭" },
    { joint: "kneeOverToe", idealRange: [0, 1], weight: 0.15, label: "무릎 정렬" },
  ],
  frontSquat: [
    { joint: "knee", idealRange: [70, 110], weight: 0.25, label: "무릎 각도" },
    { joint: "hip", idealRange: [60, 100], weight: 0.2, label: "힙 힌지" },
    { joint: "torsoAngle", idealRange: [0, 20], weight: 0.25, label: "상체 수직" },
    { joint: "elbow", idealRange: [60, 110], weight: 0.15, label: "팔꿈치 높이" },
    { joint: "kneeSymmetry", idealRange: [0, 10], weight: 0.15, label: "좌우 대칭" },
  ],
  lunge: [
    { joint: "frontKnee", idealRange: [80, 100], weight: 0.3, label: "앞무릎 각도" },
    { joint: "hip", idealRange: [70, 120], weight: 0.2, label: "힙 각도" },
    { joint: "torsoAngle", idealRange: [0, 15], weight: 0.25, label: "상체 수직" },
    { joint: "kneeOverToe", idealRange: [0, 1], weight: 0.25, label: "무릎 정렬" },
  ],
  bulgarianSplit: [
    { joint: "frontKnee", idealRange: [80, 100], weight: 0.3, label: "앞무릎 각도" },
    { joint: "hip", idealRange: [70, 120], weight: 0.2, label: "힙 각도" },
    { joint: "torsoAngle", idealRange: [0, 15], weight: 0.25, label: "상체 수직" },
    { joint: "kneeOverToe", idealRange: [0, 1], weight: 0.25, label: "무릎 정렬" },
  ],
  legPress: [
    { joint: "knee", idealRange: [80, 110], weight: 0.35, label: "무릎 각도" },
    { joint: "hip", idealRange: [60, 100], weight: 0.3, label: "힙 각도" },
    { joint: "kneeSymmetry", idealRange: [0, 10], weight: 0.2, label: "좌우 대칭" },
    { joint: "lockout", idealRange: [0, 1], weight: 0.15, label: "완전 신전 방지" },
  ],
  legExtension: [
    { joint: "knee", idealRange: [150, 180], weight: 0.4, label: "무릎 신전" },
    { joint: "kneeSymmetry", idealRange: [0, 8], weight: 0.3, label: "좌우 대칭" },
    { joint: "hip", idealRange: [80, 110], weight: 0.3, label: "힙 고정" },
  ],
  legCurl: [
    { joint: "knee", idealRange: [30, 70], weight: 0.4, label: "무릎 굴곡" },
    { joint: "hip", idealRange: [160, 180], weight: 0.3, label: "힙 고정" },
    { joint: "kneeSymmetry", idealRange: [0, 8], weight: 0.3, label: "좌우 대칭" },
  ],
  hipThrust: [
    { joint: "hip", idealRange: [160, 180], weight: 0.35, label: "힙 익스텐션" },
    { joint: "knee", idealRange: [80, 100], weight: 0.25, label: "무릎 각도" },
    { joint: "torsoAngle", idealRange: [0, 20], weight: 0.2, label: "상체 각도" },
    { joint: "kneeSymmetry", idealRange: [0, 10], weight: 0.2, label: "좌우 대칭" },
  ],
  calfRaise: [
    { joint: "knee", idealRange: [160, 180], weight: 0.3, label: "무릎 신전" },
    { joint: "ankle", idealRange: [90, 130], weight: 0.4, label: "발목 신전" },
    { joint: "torsoAngle", idealRange: [0, 10], weight: 0.3, label: "상체 수직" },
  ],

  // ── 가슴 ──
  benchPress: [
    { joint: "elbow", idealRange: [80, 110], weight: 0.3, label: "팔꿈치 각도" },
    { joint: "shoulder", idealRange: [60, 90], weight: 0.25, label: "어깨 각도" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.2, label: "좌우 대칭" },
    { joint: "wristAlign", idealRange: [0, 1], weight: 0.25, label: "손목 정렬" },
  ],
  inclineBench: [
    { joint: "elbow", idealRange: [80, 110], weight: 0.3, label: "팔꿈치 각도" },
    { joint: "shoulder", idealRange: [70, 100], weight: 0.25, label: "어깨 각도" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.2, label: "좌우 대칭" },
    { joint: "wristAlign", idealRange: [0, 1], weight: 0.25, label: "손목 정렬" },
  ],
  declineBench: [
    { joint: "elbow", idealRange: [80, 110], weight: 0.3, label: "팔꿈치 각도" },
    { joint: "shoulder", idealRange: [50, 80], weight: 0.25, label: "어깨 각도" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.2, label: "좌우 대칭" },
    { joint: "wristAlign", idealRange: [0, 1], weight: 0.25, label: "손목 정렬" },
  ],
  dumbbellFly: [
    { joint: "elbow", idealRange: [130, 170], weight: 0.3, label: "팔꿈치 각도" },
    { joint: "shoulder", idealRange: [70, 120], weight: 0.3, label: "어깨 벌림" },
    { joint: "elbowSymmetry", idealRange: [0, 8], weight: 0.2, label: "좌우 대칭" },
    { joint: "torsoAngle", idealRange: [70, 90], weight: 0.2, label: "상체 각도" },
  ],
  cableFly: [
    { joint: "elbow", idealRange: [130, 170], weight: 0.3, label: "팔꿈치 각도" },
    { joint: "shoulder", idealRange: [60, 110], weight: 0.3, label: "어깨 벌림" },
    { joint: "elbowSymmetry", idealRange: [0, 8], weight: 0.2, label: "좌우 대칭" },
    { joint: "torsoAngle", idealRange: [0, 20], weight: 0.2, label: "상체 수직" },
  ],
  pushUp: [
    { joint: "elbow", idealRange: [80, 110], weight: 0.3, label: "팔꿈치 각도" },
    { joint: "hip", idealRange: [160, 180], weight: 0.25, label: "몸통 일직선" },
    { joint: "shoulder", idealRange: [40, 70], weight: 0.2, label: "어깨 각도" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.25, label: "좌우 대칭" },
  ],
  chestPress: [
    { joint: "elbow", idealRange: [80, 110], weight: 0.3, label: "팔꿈치 각도" },
    { joint: "shoulder", idealRange: [60, 90], weight: 0.25, label: "어깨 각도" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.2, label: "좌우 대칭" },
    { joint: "torsoAngle", idealRange: [0, 15], weight: 0.25, label: "등 밀착" },
  ],
  dip: [
    { joint: "elbow", idealRange: [70, 100], weight: 0.35, label: "팔꿈치 각도" },
    { joint: "shoulder", idealRange: [40, 80], weight: 0.25, label: "어깨 각도" },
    { joint: "torsoAngle", idealRange: [10, 35], weight: 0.2, label: "상체 기울기" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.2, label: "좌우 대칭" },
  ],

  // ── 등 ──
  latPulldown: [
    { joint: "elbow", idealRange: [70, 110], weight: 0.3, label: "팔꿈치 각도" },
    { joint: "shoulder", idealRange: [100, 150], weight: 0.25, label: "어깨 각도" },
    { joint: "torsoAngle", idealRange: [0, 20], weight: 0.2, label: "상체 기울기" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.25, label: "좌우 대칭" },
  ],
  pullUp: [
    { joint: "elbow", idealRange: [60, 100], weight: 0.3, label: "팔꿈치 각도" },
    { joint: "shoulder", idealRange: [110, 160], weight: 0.25, label: "어깨 각도" },
    { joint: "hip", idealRange: [160, 180], weight: 0.2, label: "몸통 일직선" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.25, label: "좌우 대칭" },
  ],
  chinUp: [
    { joint: "elbow", idealRange: [60, 100], weight: 0.3, label: "팔꿈치 각도" },
    { joint: "shoulder", idealRange: [100, 150], weight: 0.25, label: "어깨 각도" },
    { joint: "hip", idealRange: [160, 180], weight: 0.2, label: "몸통 일직선" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.25, label: "좌우 대칭" },
  ],
  seatedRow: [
    { joint: "elbow", idealRange: [70, 100], weight: 0.3, label: "팔꿈치 각도" },
    { joint: "shoulder", idealRange: [20, 60], weight: 0.25, label: "어깨 후인" },
    { joint: "torsoAngle", idealRange: [0, 15], weight: 0.25, label: "상체 수직" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.2, label: "좌우 대칭" },
  ],
  barbellRow: [
    { joint: "elbow", idealRange: [70, 110], weight: 0.25, label: "팔꿈치 각도" },
    { joint: "hip", idealRange: [80, 120], weight: 0.25, label: "힙 힌지" },
    { joint: "torsoAngle", idealRange: [30, 60], weight: 0.25, label: "상체 기울기" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.25, label: "좌우 대칭" },
  ],
  dumbbellRow: [
    { joint: "elbow", idealRange: [70, 100], weight: 0.3, label: "팔꿈치 각도" },
    { joint: "hip", idealRange: [80, 120], weight: 0.25, label: "힙 힌지" },
    { joint: "torsoAngle", idealRange: [30, 60], weight: 0.25, label: "상체 기울기" },
    { joint: "elbowAsymmetry", idealRange: [15, 60], weight: 0.2, label: "한팔 로우 구분" },
  ],
  facePull: [
    { joint: "elbow", idealRange: [80, 120], weight: 0.3, label: "팔꿈치 각도" },
    { joint: "shoulder", idealRange: [80, 130], weight: 0.3, label: "어깨 외회전" },
    { joint: "torsoAngle", idealRange: [0, 15], weight: 0.2, label: "상체 수직" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.2, label: "좌우 대칭" },
  ],
  backExtension: [
    { joint: "hip", idealRange: [140, 180], weight: 0.4, label: "힙 익스텐션" },
    { joint: "torsoAngle", idealRange: [0, 30], weight: 0.3, label: "상체 각도" },
    { joint: "knee", idealRange: [160, 180], weight: 0.3, label: "무릎 신전" },
  ],

  // ── 어깨 ──
  shoulderPress: [
    { joint: "elbow", idealRange: [140, 180], weight: 0.3, label: "팔꿈치 신전" },
    { joint: "shoulder", idealRange: [150, 180], weight: 0.3, label: "오버헤드 정렬" },
    { joint: "torsoAngle", idealRange: [0, 10], weight: 0.2, label: "상체 수직" },
    { joint: "elbowSymmetry", idealRange: [0, 8], weight: 0.2, label: "좌우 대칭" },
  ],
  arnoldPress: [
    { joint: "elbow", idealRange: [130, 180], weight: 0.3, label: "팔꿈치 신전" },
    { joint: "shoulder", idealRange: [140, 180], weight: 0.3, label: "오버헤드 정렬" },
    { joint: "torsoAngle", idealRange: [0, 10], weight: 0.2, label: "상체 수직" },
    { joint: "elbowSymmetry", idealRange: [0, 8], weight: 0.2, label: "좌우 대칭" },
  ],
  lateralRaise: [
    { joint: "shoulder", idealRange: [70, 100], weight: 0.35, label: "어깨 벌림" },
    { joint: "elbow", idealRange: [150, 180], weight: 0.25, label: "팔 신전" },
    { joint: "torsoAngle", idealRange: [0, 10], weight: 0.2, label: "상체 수직" },
    { joint: "elbowSymmetry", idealRange: [0, 8], weight: 0.2, label: "좌우 대칭" },
  ],
  frontRaise: [
    { joint: "shoulder", idealRange: [80, 100], weight: 0.35, label: "어깨 굴곡" },
    { joint: "elbow", idealRange: [150, 180], weight: 0.25, label: "팔 신전" },
    { joint: "torsoAngle", idealRange: [0, 10], weight: 0.2, label: "상체 수직" },
    { joint: "elbowSymmetry", idealRange: [0, 8], weight: 0.2, label: "좌우 대칭" },
  ],
  rearDeltFly: [
    { joint: "shoulder", idealRange: [60, 100], weight: 0.3, label: "어깨 벌림" },
    { joint: "elbow", idealRange: [140, 180], weight: 0.25, label: "팔 신전" },
    { joint: "torsoAngle", idealRange: [30, 60], weight: 0.25, label: "상체 기울기" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.2, label: "좌우 대칭" },
  ],
  uprightRow: [
    { joint: "elbow", idealRange: [60, 100], weight: 0.3, label: "팔꿈치 각도" },
    { joint: "shoulder", idealRange: [60, 100], weight: 0.3, label: "어깨 각도" },
    { joint: "torsoAngle", idealRange: [0, 10], weight: 0.2, label: "상체 수직" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.2, label: "좌우 대칭" },
  ],
  shrug: [
    { joint: "shoulder", idealRange: [10, 30], weight: 0.4, label: "어깨 거상" },
    { joint: "elbow", idealRange: [160, 180], weight: 0.25, label: "팔 신전" },
    { joint: "torsoAngle", idealRange: [0, 10], weight: 0.2, label: "상체 수직" },
    { joint: "elbowSymmetry", idealRange: [0, 8], weight: 0.15, label: "좌우 대칭" },
  ],

  // ── 팔 ──
  bicepCurl: [
    { joint: "elbow", idealRange: [30, 60], weight: 0.35, label: "팔꿈치 굴곡" },
    { joint: "shoulder", idealRange: [0, 20], weight: 0.25, label: "팔꿈치 고정" },
    { joint: "torsoAngle", idealRange: [0, 10], weight: 0.2, label: "상체 수직" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.2, label: "좌우 대칭" },
  ],
  hammerCurl: [
    { joint: "elbow", idealRange: [30, 60], weight: 0.35, label: "팔꿈치 굴곡" },
    { joint: "shoulder", idealRange: [0, 20], weight: 0.25, label: "팔꿈치 고정" },
    { joint: "torsoAngle", idealRange: [0, 10], weight: 0.2, label: "상체 수직" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.2, label: "좌우 대칭" },
  ],
  preacherCurl: [
    { joint: "elbow", idealRange: [30, 70], weight: 0.4, label: "팔꿈치 굴곡" },
    { joint: "shoulder", idealRange: [30, 60], weight: 0.3, label: "어깨 고정" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.3, label: "좌우 대칭" },
  ],
  tricepPushdown: [
    { joint: "elbow", idealRange: [150, 180], weight: 0.4, label: "팔꿈치 신전" },
    { joint: "shoulder", idealRange: [0, 20], weight: 0.25, label: "팔꿈치 고정" },
    { joint: "torsoAngle", idealRange: [0, 15], weight: 0.2, label: "상체 수직" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.15, label: "좌우 대칭" },
  ],
  skullCrusher: [
    { joint: "elbow", idealRange: [40, 80], weight: 0.4, label: "팔꿈치 굴곡" },
    { joint: "shoulder", idealRange: [80, 110], weight: 0.3, label: "어깨 각도" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.3, label: "좌우 대칭" },
  ],
  overheadExtension: [
    { joint: "elbow", idealRange: [40, 80], weight: 0.4, label: "팔꿈치 굴곡" },
    { joint: "shoulder", idealRange: [150, 180], weight: 0.3, label: "오버헤드 정렬" },
    { joint: "torsoAngle", idealRange: [0, 10], weight: 0.15, label: "상체 수직" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.15, label: "좌우 대칭" },
  ],
  wristCurl: [
    { joint: "elbow", idealRange: [80, 110], weight: 0.4, label: "팔꿈치 고정" },
    { joint: "torsoAngle", idealRange: [0, 30], weight: 0.3, label: "상체 안정" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.3, label: "좌우 대칭" },
  ],

  // ── 코어 ──
  plank: [
    { joint: "hip", idealRange: [160, 180], weight: 0.35, label: "몸통 일직선" },
    { joint: "shoulder", idealRange: [80, 100], weight: 0.25, label: "어깨 정렬" },
    { joint: "knee", idealRange: [160, 180], weight: 0.2, label: "무릎 신전" },
    { joint: "torsoAngle", idealRange: [60, 90], weight: 0.2, label: "수평 유지" },
  ],
  crunch: [
    { joint: "hip", idealRange: [60, 90], weight: 0.3, label: "힙 각도" },
    { joint: "knee", idealRange: [80, 100], weight: 0.3, label: "무릎 각도" },
    { joint: "torsoAngle", idealRange: [20, 50], weight: 0.4, label: "상체 말기" },
  ],
  legRaise: [
    { joint: "hip", idealRange: [60, 100], weight: 0.4, label: "힙 굴곡" },
    { joint: "knee", idealRange: [160, 180], weight: 0.3, label: "무릎 신전" },
    { joint: "torsoAngle", idealRange: [70, 90], weight: 0.3, label: "상체 고정" },
  ],
  russianTwist: [
    { joint: "hip", idealRange: [70, 100], weight: 0.3, label: "힙 각도" },
    { joint: "torsoAngle", idealRange: [30, 50], weight: 0.35, label: "상체 기울기" },
    { joint: "knee", idealRange: [80, 110], weight: 0.35, label: "무릎 각도" },
  ],
  abWheelRollout: [
    { joint: "shoulder", idealRange: [140, 180], weight: 0.3, label: "어깨 신전" },
    { joint: "hip", idealRange: [150, 180], weight: 0.35, label: "몸통 일직선" },
    { joint: "knee", idealRange: [160, 180], weight: 0.2, label: "무릎 신전" },
    { joint: "elbow", idealRange: [160, 180], weight: 0.15, label: "팔 신전" },
  ],

  // ── 전신 ──
  deadlift: [
    { joint: "hip", idealRange: [80, 130], weight: 0.25, label: "힙 힌지" },
    { joint: "knee", idealRange: [130, 170], weight: 0.2, label: "무릎 각도" },
    { joint: "torsoAngle", idealRange: [30, 55], weight: 0.25, label: "상체 기울기" },
    { joint: "elbow", idealRange: [160, 180], weight: 0.15, label: "팔 신전" },
    { joint: "kneeSymmetry", idealRange: [0, 8], weight: 0.15, label: "좌우 대칭" },
  ],
  romanianDeadlift: [
    { joint: "hip", idealRange: [70, 110], weight: 0.3, label: "힙 힌지" },
    { joint: "knee", idealRange: [150, 175], weight: 0.2, label: "무릎 미세 굽힘" },
    { joint: "torsoAngle", idealRange: [35, 60], weight: 0.25, label: "상체 기울기" },
    { joint: "elbow", idealRange: [160, 180], weight: 0.1, label: "팔 신전" },
    { joint: "kneeSymmetry", idealRange: [0, 8], weight: 0.15, label: "좌우 대칭" },
  ],
  cleanAndPress: [
    { joint: "shoulder", idealRange: [140, 180], weight: 0.3, label: "오버헤드 정렬" },
    { joint: "elbow", idealRange: [150, 180], weight: 0.25, label: "팔꿈치 신전" },
    { joint: "torsoAngle", idealRange: [0, 15], weight: 0.25, label: "상체 수직" },
    { joint: "kneeSymmetry", idealRange: [0, 10], weight: 0.2, label: "좌우 대칭" },
  ],
  kettlebellSwing: [
    { joint: "hip", idealRange: [120, 180], weight: 0.3, label: "힙 익스텐션" },
    { joint: "knee", idealRange: [150, 175], weight: 0.2, label: "무릎 각도" },
    { joint: "shoulder", idealRange: [80, 160], weight: 0.25, label: "어깨 각도" },
    { joint: "torsoAngle", idealRange: [0, 25], weight: 0.25, label: "상체 수직" },
  ],
  burpee: [
    { joint: "hip", idealRange: [60, 180], weight: 0.25, label: "힙 가동범위" },
    { joint: "knee", idealRange: [60, 180], weight: 0.25, label: "무릎 가동범위" },
    { joint: "elbow", idealRange: [80, 180], weight: 0.25, label: "팔꿈치 각도" },
    { joint: "torsoAngle", idealRange: [0, 90], weight: 0.25, label: "전신 움직임" },
  ],
};

/**
 * 랜드마크에서 관절 값 추출
 */
function extractJointValues(landmarks) {
  if (!landmarks || landmarks.length < 29) return null;

  const lm = landmarks;
  const ls = lm[11], rs = lm[12]; // shoulders
  const le = lm[13], re = lm[14]; // elbows
  const lw = lm[15], rw = lm[16]; // wrists
  const lh = lm[23], rh = lm[24]; // hips
  const lk = lm[25], rk = lm[26]; // knees
  const la = lm[27], ra = lm[28]; // ankles

  const kneeL = angleDeg(lh, lk, la);
  const kneeR = angleDeg(rh, rk, ra);
  const hipL = angleDeg(ls, lh, lk);
  const hipR = angleDeg(rs, rh, rk);
  const elbowL = angleDeg(ls, le, lw);
  const elbowR = angleDeg(rs, re, rw);
  const shoulderL = angleDeg(le, ls, lh);
  const shoulderR = angleDeg(re, rs, rh);

  const sMid = mid(ls, rs);
  const hMid = mid(lh, rh);
  const torsoDx = hMid.x - sMid.x;
  const torsoDy = hMid.y - sMid.y;
  const torsoAngle = Math.abs(Math.atan2(torsoDx, torsoDy) * 180 / Math.PI);

  // 무릎이 발목보다 앞으로 나갔는지 (0=ok, >1=over)
  const kneeOverToeL = Math.max(0, (lk.x - la.x) / Math.abs(lh.x - la.x || 0.01));
  const kneeOverToeR = Math.max(0, (ra.x - rk.x) / Math.abs(rh.x - ra.x || 0.01));
  const kneeOverToe = avg(Math.min(1, kneeOverToeL), Math.min(1, kneeOverToeR));

  // lockout 체크 (무릎 완전 신전 = 위험)
  const lockout = avg(kneeL, kneeR) > 175 ? 0 : 1;

  // 발목 각도 (카프레이즈용)
  const ankleL = angleDeg(lk, la, { x: la.x, y: la.y + 0.1 });
  const ankleR = angleDeg(rk, ra, { x: ra.x, y: ra.y + 0.1 });

  return {
    knee: avg(kneeL, kneeR),
    frontKnee: Math.min(kneeL, kneeR), // 런지: 앞쪽 무릎
    hip: avg(hipL, hipR),
    elbow: avg(elbowL, elbowR),
    shoulder: avg(shoulderL, shoulderR),
    torsoAngle,
    kneeSymmetry: Math.abs(kneeL - kneeR),
    elbowSymmetry: Math.abs(elbowL - elbowR),
    elbowAsymmetry: Math.abs(elbowL - elbowR),
    kneeOverToe,
    lockout,
    wristAlign: Math.abs(lw.y - rw.y) < 0.05 ? 1 : Math.max(0, 1 - Math.abs(lw.y - rw.y) * 5),
    ankle: avg(ankleL, ankleR),
  };
}

/**
 * 자세 점수 계산 (0~100)
 * @returns {{ score: number, corrections: string[], details: Array<{label:string, score:number, pass:boolean}> }}
 */
export function scorePose(landmarks, exerciseKey) {
  const joints = extractJointValues(landmarks);
  if (!joints) return { score: 50, corrections: [], details: [] };

  const criteria = POSE_CRITERIA[exerciseKey];
  if (!criteria) {
    // 기준이 없는 운동은 기본 자세 체크
    return scoreGenericPose(joints);
  }

  let totalScore = 0;
  let totalWeight = 0;
  const corrections = [];
  const details = [];

  for (const c of criteria) {
    const value = joints[c.joint];
    if (value === undefined || value === null) continue;

    const [min, max] = c.idealRange;
    let itemScore;

    if (value >= min && value <= max) {
      // 이상 범위 내 — 100점
      itemScore = 100;
    } else {
      // 범위 이탈 정도에 따라 감점
      const deviation = value < min ? min - value : value - max;
      const range = max - min || 1;
      // 범위의 50% 이상 벗어나면 0점
      itemScore = Math.max(0, 100 - (deviation / (range * 0.5)) * 100);
    }

    totalScore += itemScore * c.weight;
    totalWeight += c.weight;

    const pass = itemScore >= 70;
    details.push({ label: c.label, score: Math.round(itemScore), pass });

    if (!pass) {
      corrections.push(c.label);
    }
  }

  const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;

  return {
    score: Math.max(0, Math.min(100, finalScore)),
    corrections,
    details,
  };
}

/**
 * 기준이 없는 운동의 기본 자세 점수
 */
function scoreGenericPose(joints) {
  let score = 70; // 기본 점수
  const corrections = [];
  const details = [];

  // 좌우 대칭 체크
  if (joints.kneeSymmetry > 15) {
    score -= 10;
    corrections.push("좌우 대칭");
    details.push({ label: "좌우 대칭", score: 50, pass: false });
  } else {
    details.push({ label: "좌우 대칭", score: 90, pass: true });
  }

  // 상체 안정성
  if (joints.torsoAngle > 45) {
    score -= 5;
    corrections.push("상체 안정");
    details.push({ label: "상체 안정", score: 60, pass: false });
  } else {
    details.push({ label: "상체 안정", score: 85, pass: true });
  }

  return { score: Math.max(0, Math.min(100, score)), corrections, details };
}

// ─── 점수 컬러 ────────────────────────────────────────────

/**
 * 점수에 따른 컬러 반환
 * 80+ : 파란색 (#0088FF)
 * 60~79 : 주황색 (#FF8C00)
 * 0~59 : 빨간색 (#FF2D2D)
 */
function getScoreColor(score) {
  if (score >= 80) return "#0088FF";
  if (score >= 60) return "#FF8C00";
  return "#FF2D2D";
}

/**
 * 점수 배경 그라데이션 컬러
 */
function getScoreBgColors(score) {
  if (score >= 80) return { inner: "#0088FF", outer: "#004499" };
  if (score >= 60) return { inner: "#FF8C00", outer: "#994400" };
  return { inner: "#FF2D2D", outer: "#991111" };
}

// ─── 브랜딩 설정 (localStorage) ───────────────────────────

export function loadBrandSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_BRAND, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_BRAND };
}

export function saveBrandSettings(brand) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(brand));
  } catch {
    // ignore
  }
}

// ─── 브랜딩 바 렌더링 ─────────────────────────────────────

/**
 * 80px 브랜딩 바
 * 왼쪽: 헬스장명 + 운동 한글명
 * 중앙: 자세 점수 (컬러 원)
 * 오른쪽: 주동근 목록 + 교정 포인트 수
 */
function drawBrandBar(ctx, w, y, exerciseKey, brand, poseResult) {
  const ex = EXERCISE_DB[exerciseKey];
  if (!ex) return;

  const { gymName, brandColor } = brand;
  const { score, corrections } = poseResult;
  const barH = BRAND_BAR_HEIGHT;

  // ── 배경: 진한 다크 ──
  const bgGrad = ctx.createLinearGradient(0, y, 0, y + barH);
  bgGrad.addColorStop(0, "#0c0c1e");
  bgGrad.addColorStop(1, "#060612");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, y, w, barH);

  // ── 상단 악센트 라인 ──
  const accentGrad = ctx.createLinearGradient(0, y, w, y);
  accentGrad.addColorStop(0, brandColor + "00");
  accentGrad.addColorStop(0.2, brandColor);
  accentGrad.addColorStop(0.8, brandColor);
  accentGrad.addColorStop(1, brandColor + "00");
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, y, w, 2);

  const pad = Math.round(w * 0.018);
  const centerX = w / 2;

  // ══════════════════════════════════════════════════════════
  // 중앙: 자세 점수 원
  // ══════════════════════════════════════════════════════════
  const circleR = Math.round(barH * 0.32);
  const circleCY = y + barH / 2;
  const scoreColor = getScoreColor(score);
  const scoreBg = getScoreBgColors(score);

  // 외곽 글로우
  const glowR = circleR + 8;
  const glow = ctx.createRadialGradient(centerX, circleCY, circleR * 0.5, centerX, circleCY, glowR);
  glow.addColorStop(0, scoreColor + "40");
  glow.addColorStop(0.7, scoreColor + "15");
  glow.addColorStop(1, scoreColor + "00");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(centerX, circleCY, glowR, 0, Math.PI * 2);
  ctx.fill();

  // 원 배경
  const circGrad = ctx.createRadialGradient(centerX, circleCY - 4, 0, centerX, circleCY, circleR);
  circGrad.addColorStop(0, scoreBg.inner);
  circGrad.addColorStop(1, scoreBg.outer);
  ctx.fillStyle = circGrad;
  ctx.beginPath();
  ctx.arc(centerX, circleCY, circleR, 0, Math.PI * 2);
  ctx.fill();

  // 원 테두리
  ctx.strokeStyle = scoreColor + "88";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, circleCY, circleR, 0, Math.PI * 2);
  ctx.stroke();

  // 점수 숫자
  const scoreFontSize = Math.round(circleR * 1.15);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${scoreFontSize}px ${FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${score}`, centerX, circleCY - 1);

  // "FORM" 라벨 (원 아래 작은 텍스트)
  const formFontSize = Math.max(8, Math.round(circleR * 0.38));
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `600 ${formFontSize}px ${FONT_FAMILY}`;
  ctx.fillText("FORM", centerX, y + barH - formFontSize * 0.7);

  // ══════════════════════════════════════════════════════════
  // 왼쪽: 헬스장명 + 운동명
  // ══════════════════════════════════════════════════════════
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // 헬스장명
  const gymFontSize = Math.round(Math.min(18, w * 0.017));
  ctx.fillStyle = brandColor;
  ctx.font = `bold ${gymFontSize}px ${FONT_FAMILY}`;
  ctx.fillText(gymName, pad, y + barH * 0.38);

  // 운동 한글명 + 아이콘
  const exFontSize = Math.round(Math.min(13, w * 0.012));
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `500 ${exFontSize}px ${FONT_FAMILY}`;
  ctx.fillText(`${ex.icon} ${ex.name}`, pad, y + barH * 0.65);

  // ══════════════════════════════════════════════════════════
  // 오른쪽: 주동근 목록 + 교정 포인트
  // ══════════════════════════════════════════════════════════
  ctx.textAlign = "right";
  const rightX = w - pad;

  // 주동근 목록
  const primaryLabels = Object.keys(ex.primary)
    .map((k) => MUSCLE_REGIONS[k]?.label)
    .filter(Boolean)
    .join(" · ");
  const muscleFontSize = Math.round(Math.min(12, w * 0.011));
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `500 ${muscleFontSize}px ${FONT_FAMILY}`;
  ctx.fillText(primaryLabels, rightX, y + barH * 0.38);

  // 교정 포인트 수
  const corrCount = corrections.length;
  if (corrCount > 0) {
    const corrFontSize = Math.round(Math.min(11, w * 0.01));
    ctx.fillStyle = score >= 80 ? "#0088FF99" : score >= 60 ? "#FF8C0099" : "#FF2D2D99";
    ctx.font = `600 ${corrFontSize}px ${FONT_FAMILY}`;
    ctx.fillText(`교정 ${corrCount}개`, rightX, y + barH * 0.6);

    // 교정 목록 (간략)
    const shortList = corrections.slice(0, 3).join(", ");
    const listFontSize = Math.round(Math.min(9, w * 0.008));
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = `400 ${listFontSize}px ${FONT_FAMILY}`;
    ctx.fillText(shortList, rightX, y + barH * 0.78);
  } else {
    const corrFontSize = Math.round(Math.min(11, w * 0.01));
    ctx.fillStyle = "#0088FF99";
    ctx.font = `600 ${corrFontSize}px ${FONT_FAMILY}`;
    ctx.fillText("PERFECT FORM", rightX, y + barH * 0.6);
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

// ─── Canvas 합성 ──────────────────────────────────────────

/**
 * 사진 + 글로우 오버레이 + 브랜딩 바 합성
 * 출력: 최소 1080px 너비
 */
export function createCompositeCanvas(sourceCanvas, image, landmarks, exerciseKey, options, brand) {
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;

  // 최소 1080px 보장
  const scale = srcW < MIN_OUTPUT_WIDTH ? MIN_OUTPUT_WIDTH / srcW : 1;
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);

  const compositeCanvas = document.createElement("canvas");
  compositeCanvas.width = w;
  compositeCanvas.height = h + BRAND_BAR_HEIGHT;
  const ctx = compositeCanvas.getContext("2d");

  // 안티앨리어싱 품질
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 사진 렌더링
  ctx.drawImage(image, 0, 0, w, h);

  // 글로우 오버레이
  if (landmarks) {
    renderMuscleOverlay(ctx, landmarks, exerciseKey, w, h, { ...options, time: 0 });
  }

  // 자세 점수 계산
  const poseResult = scorePose(landmarks, exerciseKey);

  // 브랜딩 바
  drawBrandBar(ctx, w, h, exerciseKey, brand, poseResult);

  return { canvas: compositeCanvas, poseResult };
}

// ─── 영상 프레임 캡처 유틸 ─────────────────────────────────

/**
 * video 엘리먼트에서 특정 시간의 프레임을 Canvas에 캡처
 */
function captureFrameAt(video, time) {
  return new Promise((resolve) => {
    video.currentTime = time;
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);
      resolve(canvas);
    };
  });
}

/**
 * 영상에서 worst frame(최저 점수) 캡처 → 합성 PNG
 *
 * @param {File} videoFile
 * @param {string} exerciseKey
 * @param {object} options - { glowIntensity, showSkeleton, showLabels }
 * @param {object} brand
 * @param {Function} detectPoseFn - detectPose 함수
 * @param {Function} onProgress - (percent) => void
 * @returns {Promise<{ canvas: HTMLCanvasElement, poseResult: object, timestamp: number }>}
 */
export async function captureWorstFrame(videoFile, exerciseKey, options, brand, detectPoseFn, onProgress) {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  const url = URL.createObjectURL(videoFile);
  video.src = url;

  return new Promise((resolve, reject) => {
    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration;
        const sampleCount = Math.min(20, Math.max(8, Math.floor(duration * 2)));
        const interval = duration / (sampleCount + 1);

        let worstScore = 101;
        let worstTime = 0;
        let worstLandmarks = null;

        for (let i = 1; i <= sampleCount; i++) {
          const time = interval * i;
          await captureFrameAt(video, time);

          // 포즈 감지
          const tmpCanvas = document.createElement("canvas");
          tmpCanvas.width = video.videoWidth;
          tmpCanvas.height = video.videoHeight;
          const tmpCtx = tmpCanvas.getContext("2d");
          tmpCtx.drawImage(video, 0, 0);

          const result = await detectPoseFn(tmpCanvas);
          if (!result.isFallback) {
            const poseResult = scorePose(result.landmarks, exerciseKey);
            if (poseResult.score < worstScore) {
              worstScore = poseResult.score;
              worstTime = time;
              worstLandmarks = result.landmarks;
            }
          }

          onProgress?.(Math.round((i / sampleCount) * 100));
        }

        // worst frame을 고해상도로 재캡처
        await captureFrameAt(video, worstTime);

        const srcW = video.videoWidth;
        const srcH = video.videoHeight;
        const scale = srcW < MIN_OUTPUT_WIDTH ? MIN_OUTPUT_WIDTH / srcW : 1;
        const w = Math.round(srcW * scale);
        const h = Math.round(srcH * scale);

        const outCanvas = document.createElement("canvas");
        outCanvas.width = w;
        outCanvas.height = h + BRAND_BAR_HEIGHT;
        const ctx = outCanvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(video, 0, 0, w, h);

        if (worstLandmarks) {
          renderMuscleOverlay(ctx, worstLandmarks, exerciseKey, w, h, { ...options, time: 0 });
        }

        const poseResult = worstLandmarks
          ? scorePose(worstLandmarks, exerciseKey)
          : { score: 50, corrections: [], details: [] };

        drawBrandBar(ctx, w, h, exerciseKey, brand, poseResult);

        URL.revokeObjectURL(url);
        resolve({ canvas: outCanvas, poseResult, timestamp: worstTime });
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("영상 로드 실패"));
    };
  });
}

/**
 * 영상 요약 이미지: 주요 프레임 3장 가로 배치 + 각각 자세 점수
 * 상단에 타이틀 바, 하단에 종합 브랜딩 바
 *
 * @param {File} videoFile
 * @param {string} exerciseKey
 * @param {object} options
 * @param {object} brand
 * @param {Function} detectPoseFn
 * @param {Function} onProgress
 * @returns {Promise<{ canvas: HTMLCanvasElement, frames: Array }>}
 */
export async function createVideoSummary(videoFile, exerciseKey, options, brand, detectPoseFn, onProgress) {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  const url = URL.createObjectURL(videoFile);
  video.src = url;

  return new Promise((resolve, reject) => {
    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration;
        // 3개 시점: 25%, 50%, 75%
        const timestamps = [duration * 0.25, duration * 0.5, duration * 0.75];

        const frameData = [];

        for (let i = 0; i < 3; i++) {
          await captureFrameAt(video, timestamps[i]);

          const tmpCanvas = document.createElement("canvas");
          tmpCanvas.width = video.videoWidth;
          tmpCanvas.height = video.videoHeight;
          const tmpCtx = tmpCanvas.getContext("2d");
          tmpCtx.drawImage(video, 0, 0);

          const result = await detectPoseFn(tmpCanvas);
          const landmarks = result.isFallback ? null : result.landmarks;
          const poseResult = landmarks
            ? scorePose(landmarks, exerciseKey)
            : { score: 50, corrections: [], details: [] };

          frameData.push({
            canvas: tmpCanvas,
            landmarks,
            poseResult,
            timestamp: timestamps[i],
          });

          onProgress?.(Math.round(((i + 1) / 3) * 80));
        }

        // ── 합성 이미지 생성 ──
        const srcW = video.videoWidth;
        const srcH = video.videoHeight;

        // 프레임 3장 가로 배치
        const frameW = Math.max(360, Math.round(MIN_OUTPUT_WIDTH / 3));
        const frameScale = frameW / srcW;
        const frameH = Math.round(srcH * frameScale);
        const gap = 4; // 프레임 간 간격
        const titleBarH = 48;
        const scoreOverlayH = 40; // 각 프레임 하단 점수 오버레이

        const totalW = frameW * 3 + gap * 2;
        const totalH = titleBarH + frameH + BRAND_BAR_HEIGHT;

        const outCanvas = document.createElement("canvas");
        outCanvas.width = totalW;
        outCanvas.height = totalH;
        const ctx = outCanvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // 배경
        ctx.fillStyle = "#060612";
        ctx.fillRect(0, 0, totalW, totalH);

        // ── 타이틀 바 ──
        const titleGrad = ctx.createLinearGradient(0, 0, 0, titleBarH);
        titleGrad.addColorStop(0, "#0c0c1e");
        titleGrad.addColorStop(1, "#0a0a18");
        ctx.fillStyle = titleGrad;
        ctx.fillRect(0, 0, totalW, titleBarH);

        // 타이틀 악센트 라인
        ctx.fillStyle = brand.brandColor;
        ctx.fillRect(0, titleBarH - 2, totalW, 2);

        const ex = EXERCISE_DB[exerciseKey];
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = brand.brandColor;
        ctx.font = `bold 16px ${FONT_FAMILY}`;
        ctx.fillText(`${brand.gymName}`, 16, titleBarH / 2);

        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = `500 14px ${FONT_FAMILY}`;
        const titleText = ex ? `${ex.icon} ${ex.name} — 자세 분석 요약` : "자세 분석 요약";
        ctx.fillText(titleText, 16 + ctx.measureText(brand.gymName).width + 16, titleBarH / 2);

        // ── 프레임 3장 렌더링 ──
        for (let i = 0; i < 3; i++) {
          const fd = frameData[i];
          const fx = i * (frameW + gap);
          const fy = titleBarH;

          // 프레임 이미지
          ctx.drawImage(fd.canvas, fx, fy, frameW, frameH);

          // 글로우 오버레이
          if (fd.landmarks) {
            ctx.save();
            ctx.translate(fx, fy);
            // 클리핑 영역 설정
            ctx.beginPath();
            ctx.rect(0, 0, frameW, frameH);
            ctx.clip();
            renderMuscleOverlay(ctx, fd.landmarks, exerciseKey, frameW, frameH, { ...options, time: 0 });
            ctx.restore();
          }

          // 하단 점수 오버레이
          const scoreY = fy + frameH - scoreOverlayH;
          const overlayGrad = ctx.createLinearGradient(fx, scoreY - 20, fx, fy + frameH);
          overlayGrad.addColorStop(0, "rgba(0,0,0,0)");
          overlayGrad.addColorStop(0.3, "rgba(0,0,0,0.6)");
          overlayGrad.addColorStop(1, "rgba(0,0,0,0.85)");
          ctx.fillStyle = overlayGrad;
          ctx.fillRect(fx, scoreY - 20, frameW, scoreOverlayH + 20);

          // 점수 원 (작은 버전)
          const miniR = 14;
          const miniCX = fx + frameW / 2;
          const miniCY = scoreY + scoreOverlayH / 2 - 2;
          const sc = fd.poseResult.score;
          const sColor = getScoreColor(sc);

          ctx.fillStyle = sColor;
          ctx.beginPath();
          ctx.arc(miniCX, miniCY, miniR, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#FFF";
          ctx.font = `bold 13px ${FONT_FAMILY}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`${sc}`, miniCX, miniCY);

          // 타임스탬프
          const mins = Math.floor(fd.timestamp / 60);
          const secs = Math.floor(fd.timestamp % 60);
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.font = `400 10px ${FONT_FAMILY}`;
          ctx.fillText(`${mins}:${String(secs).padStart(2, "0")}`, miniCX, miniCY + miniR + 8);

          // 프레임 번호 (왼쪽 상단)
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(fx + 6, fy + 6, 22, 18);
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.font = `bold 11px ${FONT_FAMILY}`;
          ctx.fillText(`#${i + 1}`, fx + 10, fy + 9);

          // 구분선 (프레임 간)
          if (i < 2) {
            ctx.fillStyle = "#0c0c1e";
            ctx.fillRect(fx + frameW, fy, gap, frameH);
          }
        }

        // ── 하단 종합 브랜딩 바 ──
        const avgScore = Math.round(
          frameData.reduce((s, f) => s + f.poseResult.score, 0) / 3
        );
        const allCorrections = [
          ...new Set(frameData.flatMap((f) => f.poseResult.corrections)),
        ];
        const summaryResult = {
          score: avgScore,
          corrections: allCorrections,
          details: [],
        };
        drawBrandBar(ctx, totalW, titleBarH + frameH, exerciseKey, brand, summaryResult);

        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";

        onProgress?.(100);
        URL.revokeObjectURL(url);
        resolve({ canvas: outCanvas, frames: frameData });
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("영상 로드 실패"));
    };
  });
}

// ─── 다운로드 ─────────────────────────────────────────────

/**
 * PNG 다운로드
 * 파일명: 헬스장명_운동명_자세점수_muscle.png
 */
export function downloadImage(compositeCanvas, gymName, exerciseName, score) {
  const safeName = gymName.replace(/[^a-zA-Z0-9가-힣]/g, "_").replace(/_+/g, "_");
  const safeExercise = exerciseName.replace(/[^a-zA-Z0-9가-힣]/g, "_").replace(/_+/g, "_");
  const scoreStr = score !== undefined && score !== null ? `_${score}` : "";
  const filename = `${safeName}_${safeExercise}${scoreStr}_muscle.png`;

  // 고품질 PNG
  const dataUrl = compositeCanvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── 클립보드 복사 (Safari fallback) ──────────────────────

/**
 * 클립보드에 PNG 복사
 * Safari: ClipboardItem + Promise 패턴 사용
 * 실패 시 false 반환 (호출측에서 다운로드 fallback 처리)
 */
export async function copyToClipboard(compositeCanvas) {
  try {
    // Safari requires ClipboardItem constructed with a Promise-returning function
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      // Safari-compatible: ClipboardItem accepts Promise<Blob>
      const item = new ClipboardItem({
        "image/png": new Promise((resolve) => {
          compositeCanvas.toBlob((blob) => {
            resolve(blob);
          }, "image/png");
        }),
      });
      await navigator.clipboard.write([item]);
      return true;
    }

    // Fallback: standard approach (Chrome/Firefox)
    const blob = await new Promise((resolve) =>
      compositeCanvas.toBlob(resolve, "image/png")
    );
    if (!blob) return false;

    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    return true;
  } catch (err) {
    console.warn("Clipboard copy failed:", err);

    // 최후 폴백: data URL을 텍스트로 복사 시도
    try {
      const dataUrl = compositeCanvas.toDataURL("image/png");
      await navigator.clipboard.writeText(dataUrl);
      return "text"; // 텍스트로 복사됨을 표시
    } catch {
      return false;
    }
  }
}
