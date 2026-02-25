// ============================================================
// landmarks.js — 스켈레톤 연결선 + 랜드마크 렌더링 정의
//
// MediaPipe BlazePose 33개 랜드마크의 연결 관계, 신체 부위별
// 그룹핑, 드로잉 스타일을 정의한다. Canvas 렌더러가 이 파일만
// import하면 스켈레톤 오버레이를 그릴 수 있다.
//
// 사용:
//   import {
//     LM, SKELETON, BODY_SEGMENTS, LANDMARK_NAMES,
//     DRAW_CONFIG, getSegmentForConnection,
//   } from './landmarks';
// ============================================================

// ────────────────────────────────────────────
// 1. 랜드마크 인덱스 (poses.js와 동일, 정식 소스)
// ────────────────────────────────────────────
export const LM = {
  NOSE:             0,
  LEFT_EYE_INNER:   1,
  LEFT_EYE:         2,
  LEFT_EYE_OUTER:   3,
  RIGHT_EYE_INNER:  4,
  RIGHT_EYE:        5,
  RIGHT_EYE_OUTER:  6,
  LEFT_EAR:         7,
  RIGHT_EAR:        8,
  MOUTH_LEFT:       9,
  MOUTH_RIGHT:      10,
  LEFT_SHOULDER:    11,
  RIGHT_SHOULDER:   12,
  LEFT_ELBOW:       13,
  RIGHT_ELBOW:      14,
  LEFT_WRIST:       15,
  RIGHT_WRIST:      16,
  LEFT_PINKY:       17,
  RIGHT_PINKY:      18,
  LEFT_INDEX:       19,
  RIGHT_INDEX:      20,
  LEFT_THUMB:       21,
  RIGHT_THUMB:      22,
  LEFT_HIP:         23,
  RIGHT_HIP:        24,
  LEFT_KNEE:        25,
  RIGHT_KNEE:       26,
  LEFT_ANKLE:       27,
  RIGHT_ANKLE:      28,
  LEFT_HEEL:        29,
  RIGHT_HEEL:       30,
  LEFT_FOOT_INDEX:  31,
  RIGHT_FOOT_INDEX: 32,
};

// ────────────────────────────────────────────
// 2. 랜드마크 한글 이름 (디버그 / UI 표시용)
// ────────────────────────────────────────────
export const LANDMARK_NAMES = {
  [LM.NOSE]:             "코",
  [LM.LEFT_EYE_INNER]:   "왼눈 안쪽",
  [LM.LEFT_EYE]:         "왼눈",
  [LM.LEFT_EYE_OUTER]:   "왼눈 바깥",
  [LM.RIGHT_EYE_INNER]:  "오른눈 안쪽",
  [LM.RIGHT_EYE]:        "오른눈",
  [LM.RIGHT_EYE_OUTER]:  "오른눈 바깥",
  [LM.LEFT_EAR]:         "왼귀",
  [LM.RIGHT_EAR]:        "오른귀",
  [LM.MOUTH_LEFT]:       "입 왼쪽",
  [LM.MOUTH_RIGHT]:      "입 오른쪽",
  [LM.LEFT_SHOULDER]:    "왼어깨",
  [LM.RIGHT_SHOULDER]:   "오른어깨",
  [LM.LEFT_ELBOW]:       "왼팔꿈치",
  [LM.RIGHT_ELBOW]:      "오른팔꿈치",
  [LM.LEFT_WRIST]:       "왼손목",
  [LM.RIGHT_WRIST]:      "오른손목",
  [LM.LEFT_PINKY]:       "왼새끼",
  [LM.RIGHT_PINKY]:      "오른새끼",
  [LM.LEFT_INDEX]:       "왼검지",
  [LM.RIGHT_INDEX]:      "오른검지",
  [LM.LEFT_THUMB]:       "왼엄지",
  [LM.RIGHT_THUMB]:      "오른엄지",
  [LM.LEFT_HIP]:         "왼엉덩이",
  [LM.RIGHT_HIP]:        "오른엉덩이",
  [LM.LEFT_KNEE]:        "왼무릎",
  [LM.RIGHT_KNEE]:       "오른무릎",
  [LM.LEFT_ANKLE]:       "왼발목",
  [LM.RIGHT_ANKLE]:      "오른발목",
  [LM.LEFT_HEEL]:        "왼발뒤꿈치",
  [LM.RIGHT_HEEL]:       "오른발뒤꿈치",
  [LM.LEFT_FOOT_INDEX]:  "왼발끝",
  [LM.RIGHT_FOOT_INDEX]: "오른발끝",
};

// ────────────────────────────────────────────
// 3. 신체 부위(Segment) 정의
//    각 세그먼트는 렌더링 시 동일한 색상/두께로 그려진다.
//    muscles.js의 근육 ID와 연결되어 활성 근육에 따라
//    색상을 동적으로 변경할 수 있다.
// ────────────────────────────────────────────
export const SEGMENT = {
  FACE:       "face",
  TORSO:      "torso",
  LEFT_ARM:   "leftArm",
  RIGHT_ARM:  "rightArm",
  LEFT_HAND:  "leftHand",
  RIGHT_HAND: "rightHand",
  LEFT_LEG:   "leftLeg",
  RIGHT_LEG:  "rightLeg",
  LEFT_FOOT:  "leftFoot",
  RIGHT_FOOT: "rightFoot",
};

// ────────────────────────────────────────────
// 4. 스켈레톤 연결선 (SKELETON)
//    각 항목: [시작 랜드마크, 끝 랜드마크, 세그먼트]
//    MediaPipe 공식 연결 + 체간 보강선 포함.
// ────────────────────────────────────────────
export const SKELETON = [
  // ── 얼굴 ──
  [LM.NOSE,            LM.LEFT_EYE_INNER,   SEGMENT.FACE],
  [LM.LEFT_EYE_INNER,  LM.LEFT_EYE,         SEGMENT.FACE],
  [LM.LEFT_EYE,        LM.LEFT_EYE_OUTER,   SEGMENT.FACE],
  [LM.LEFT_EYE_OUTER,  LM.LEFT_EAR,         SEGMENT.FACE],
  [LM.NOSE,            LM.RIGHT_EYE_INNER,  SEGMENT.FACE],
  [LM.RIGHT_EYE_INNER, LM.RIGHT_EYE,        SEGMENT.FACE],
  [LM.RIGHT_EYE,       LM.RIGHT_EYE_OUTER,  SEGMENT.FACE],
  [LM.RIGHT_EYE_OUTER, LM.RIGHT_EAR,        SEGMENT.FACE],
  [LM.MOUTH_LEFT,      LM.MOUTH_RIGHT,      SEGMENT.FACE],

  // ── 체간 (torso) ──
  [LM.LEFT_SHOULDER,   LM.RIGHT_SHOULDER,   SEGMENT.TORSO],
  [LM.LEFT_HIP,        LM.RIGHT_HIP,        SEGMENT.TORSO],
  [LM.LEFT_SHOULDER,   LM.LEFT_HIP,         SEGMENT.TORSO],
  [LM.RIGHT_SHOULDER,  LM.RIGHT_HIP,        SEGMENT.TORSO],

  // ── 왼팔 ──
  [LM.LEFT_SHOULDER,   LM.LEFT_ELBOW,       SEGMENT.LEFT_ARM],
  [LM.LEFT_ELBOW,      LM.LEFT_WRIST,       SEGMENT.LEFT_ARM],

  // ── 오른팔 ──
  [LM.RIGHT_SHOULDER,  LM.RIGHT_ELBOW,      SEGMENT.RIGHT_ARM],
  [LM.RIGHT_ELBOW,     LM.RIGHT_WRIST,      SEGMENT.RIGHT_ARM],

  // ── 왼손 ──
  [LM.LEFT_WRIST,      LM.LEFT_PINKY,       SEGMENT.LEFT_HAND],
  [LM.LEFT_WRIST,      LM.LEFT_INDEX,       SEGMENT.LEFT_HAND],
  [LM.LEFT_WRIST,      LM.LEFT_THUMB,       SEGMENT.LEFT_HAND],
  [LM.LEFT_PINKY,      LM.LEFT_INDEX,       SEGMENT.LEFT_HAND],

  // ── 오른손 ──
  [LM.RIGHT_WRIST,     LM.RIGHT_PINKY,      SEGMENT.RIGHT_HAND],
  [LM.RIGHT_WRIST,     LM.RIGHT_INDEX,      SEGMENT.RIGHT_HAND],
  [LM.RIGHT_WRIST,     LM.RIGHT_THUMB,      SEGMENT.RIGHT_HAND],
  [LM.RIGHT_PINKY,     LM.RIGHT_INDEX,      SEGMENT.RIGHT_HAND],

  // ── 왼다리 ──
  [LM.LEFT_HIP,        LM.LEFT_KNEE,        SEGMENT.LEFT_LEG],
  [LM.LEFT_KNEE,       LM.LEFT_ANKLE,       SEGMENT.LEFT_LEG],

  // ── 오른다리 ──
  [LM.RIGHT_HIP,       LM.RIGHT_KNEE,       SEGMENT.RIGHT_LEG],
  [LM.RIGHT_KNEE,      LM.RIGHT_ANKLE,      SEGMENT.RIGHT_LEG],

  // ── 왼발 ──
  [LM.LEFT_ANKLE,      LM.LEFT_HEEL,        SEGMENT.LEFT_FOOT],
  [LM.LEFT_HEEL,       LM.LEFT_FOOT_INDEX,  SEGMENT.LEFT_FOOT],
  [LM.LEFT_ANKLE,      LM.LEFT_FOOT_INDEX,  SEGMENT.LEFT_FOOT],

  // ── 오른발 ──
  [LM.RIGHT_ANKLE,     LM.RIGHT_HEEL,       SEGMENT.RIGHT_FOOT],
  [LM.RIGHT_HEEL,      LM.RIGHT_FOOT_INDEX, SEGMENT.RIGHT_FOOT],
  [LM.RIGHT_ANKLE,     LM.RIGHT_FOOT_INDEX, SEGMENT.RIGHT_FOOT],
];

// ────────────────────────────────────────────
// 5. 세그먼트 → 근육 매핑
//    해당 세그먼트가 커버하는 근육 ID (muscles.js 키)
//    글로우 렌더링 시 활성 근육에 따라 연결선 색상을 변경한다.
// ────────────────────────────────────────────
export const SEGMENT_MUSCLES = {
  [SEGMENT.FACE]:       [],
  [SEGMENT.TORSO]:      ["chest", "core", "lats", "traps", "lowerBack"],
  [SEGMENT.LEFT_ARM]:   ["shoulders", "biceps", "triceps"],
  [SEGMENT.RIGHT_ARM]:  ["shoulders", "biceps", "triceps"],
  [SEGMENT.LEFT_HAND]:  ["forearms"],
  [SEGMENT.RIGHT_HAND]: ["forearms"],
  [SEGMENT.LEFT_LEG]:   ["quadriceps", "hamstrings", "glutes"],
  [SEGMENT.RIGHT_LEG]:  ["quadriceps", "hamstrings", "glutes"],
  [SEGMENT.LEFT_FOOT]:  ["calves"],
  [SEGMENT.RIGHT_FOOT]: ["calves"],
};

// ────────────────────────────────────────────
// 6. 세그먼트 기본 스타일
//    isCorrectForm에 따라 동적으로 덮어쓴다.
// ────────────────────────────────────────────
export const SEGMENT_STYLE = {
  [SEGMENT.FACE]:       { lineWidth: 1,   color: "#AAAAAA", dotRadius: 2   },
  [SEGMENT.TORSO]:      { lineWidth: 3,   color: "#FFFFFF", dotRadius: 5   },
  [SEGMENT.LEFT_ARM]:   { lineWidth: 2.5, color: "#FFFFFF", dotRadius: 4.5 },
  [SEGMENT.RIGHT_ARM]:  { lineWidth: 2.5, color: "#FFFFFF", dotRadius: 4.5 },
  [SEGMENT.LEFT_HAND]:  { lineWidth: 1.5, color: "#CCCCCC", dotRadius: 3   },
  [SEGMENT.RIGHT_HAND]: { lineWidth: 1.5, color: "#CCCCCC", dotRadius: 3   },
  [SEGMENT.LEFT_LEG]:   { lineWidth: 3,   color: "#FFFFFF", dotRadius: 5   },
  [SEGMENT.RIGHT_LEG]:  { lineWidth: 3,   color: "#FFFFFF", dotRadius: 5   },
  [SEGMENT.LEFT_FOOT]:  { lineWidth: 1.5, color: "#CCCCCC", dotRadius: 3   },
  [SEGMENT.RIGHT_FOOT]: { lineWidth: 1.5, color: "#CCCCCC", dotRadius: 3   },
};

// ────────────────────────────────────────────
// 7. 드로잉 설정 (Canvas 렌더러용)
// ────────────────────────────────────────────
export const DRAW_CONFIG = {
  // 연결선
  line: {
    defaultColor: "#FFFFFF",
    correctColor: "#4A9EFF",   // 올바른 자세 — 파란 계열
    incorrectColor: "#FF4757", // 잘못된 자세 — 빨간 계열
    defaultWidth: 2.5,
    activeWidth: 3.5,          // 활성 근육 부위 연결선
    opacity: 0.85,
    glowBlur: 8,               // 글로우 효과 blur 반경(px)
  },

  // 랜드마크 점
  dot: {
    defaultRadius: 4,
    activeRadius: 6,           // 관절 각도 표시 시 큰 점
    jointRadius: 8,            // 주요 관절 (무릎, 팔꿈치 등)
    defaultColor: "#FFFFFF",
    correctColor: "#4A9EFF",
    incorrectColor: "#FF4757",
    strokeColor: "#000000",
    strokeWidth: 1.5,
    opacity: 0.9,
  },

  // 관절 각도 표시
  angleArc: {
    radius: 25,               // 호(arc) 반경(px)
    lineWidth: 2,
    correctColor: "rgba(74, 158, 255, 0.7)",
    incorrectColor: "rgba(255, 71, 87, 0.7)",
    textSize: 12,
    textColor: "#FFFFFF",
    textBg: "rgba(0, 0, 0, 0.6)",
    textPadding: 4,
  },

  // 전체 오버레이
  overlay: {
    bgAlpha: 0.0,              // 배경 어둡게 (0=투명, 1=불투명)
    fadeInDuration: 200,        // 글로우 페이드인(ms)
    fadeOutDuration: 400,       // 글로우 페이드아웃(ms)
  },

  // visibility 임계값
  visibility: {
    min: 0.5,                  // 이 이하면 해당 랜드마크/연결선 숨김
    dim: 0.65,                 // 이 이하면 반투명 처리
  },
};

// ────────────────────────────────────────────
// 8. 주요 관절 포인트 (큰 점으로 표시할 랜드마크)
// ────────────────────────────────────────────
export const JOINT_LANDMARKS = [
  LM.LEFT_SHOULDER,
  LM.RIGHT_SHOULDER,
  LM.LEFT_ELBOW,
  LM.RIGHT_ELBOW,
  LM.LEFT_WRIST,
  LM.RIGHT_WRIST,
  LM.LEFT_HIP,
  LM.RIGHT_HIP,
  LM.LEFT_KNEE,
  LM.RIGHT_KNEE,
  LM.LEFT_ANKLE,
  LM.RIGHT_ANKLE,
];

// ────────────────────────────────────────────
// 9. 랜드마크 → 세그먼트 역방향 매핑
// ────────────────────────────────────────────
const _landmarkToSegment = {};
SKELETON.forEach(([from, to, segment]) => {
  _landmarkToSegment[from] = _landmarkToSegment[from] || segment;
  _landmarkToSegment[to] = _landmarkToSegment[to] || segment;
});
export const LANDMARK_SEGMENT = _landmarkToSegment;

// ────────────────────────────────────────────
// 10. 유틸리티 함수
// ────────────────────────────────────────────

/**
 * 연결선 [from, to]가 속하는 세그먼트 반환
 */
export function getSegmentForConnection(from, to) {
  const conn = SKELETON.find(
    ([a, b]) => (a === from && b === to) || (a === to && b === from)
  );
  return conn ? conn[2] : null;
}

/**
 * 특정 세그먼트의 모든 연결선 반환
 * @param {string} segmentId — SEGMENT 상수
 * @returns {Array<[number, number, string]>}
 */
export function getConnectionsBySegment(segmentId) {
  return SKELETON.filter(([, , seg]) => seg === segmentId);
}

/**
 * 특정 세그먼트에 속하는 고유 랜드마크 인덱스 반환
 * @param {string} segmentId
 * @returns {number[]}
 */
export function getLandmarksBySegment(segmentId) {
  const set = new Set();
  SKELETON.forEach(([from, to, seg]) => {
    if (seg === segmentId) {
      set.add(from);
      set.add(to);
    }
  });
  return [...set].sort((a, b) => a - b);
}

/**
 * 활성 근육 ID 배열로부터 하이라이트할 세그먼트 목록 반환
 * @param {string[]} activeMuscleIds — ex: ['chest', 'triceps']
 * @returns {string[]} 세그먼트 ID 배열
 */
export function getActiveSegments(activeMuscleIds) {
  const segments = new Set();
  for (const [seg, muscles] of Object.entries(SEGMENT_MUSCLES)) {
    if (muscles.some((m) => activeMuscleIds.includes(m))) {
      segments.add(seg);
    }
  }
  return [...segments];
}

/**
 * 세그먼트별로 활성 근육 중 가장 높은 활성화 강도의 색상 반환
 * @param {string} segmentId
 * @param {Object} activationMap — { muscleId: intensity(0~100) }
 * @param {boolean} isCorrectForm
 * @param {Object} muscleRegions — muscles.js의 MUSCLE_REGIONS
 * @returns {{ color: string, intensity: number } | null}
 */
export function getSegmentHighlightColor(
  segmentId,
  activationMap,
  isCorrectForm,
  muscleRegions
) {
  const muscles = SEGMENT_MUSCLES[segmentId];
  if (!muscles || muscles.length === 0) return null;

  let maxIntensity = 0;
  let dominantMuscle = null;

  for (const muscleId of muscles) {
    const intensity = activationMap[muscleId] || 0;
    if (intensity > maxIntensity) {
      maxIntensity = intensity;
      dominantMuscle = muscleId;
    }
  }

  if (!dominantMuscle || maxIntensity === 0) return null;

  // 올바른/잘못된 자세에 따라 기본 색상 결정
  const baseColor = isCorrectForm
    ? DRAW_CONFIG.line.correctColor
    : DRAW_CONFIG.line.incorrectColor;

  return {
    color: baseColor,
    intensity: maxIntensity,
    muscleId: dominantMuscle,
  };
}

/**
 * 두 랜드마크 사이의 유클리드 거리 (정규화 좌표 기준)
 * @param {{x:number, y:number}} a
 * @param {{x:number, y:number}} b
 * @returns {number}
 */
export function landmarkDistance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * 랜드마크 visibility 체크
 * @param {object} landmark — { x, y, z, visibility }
 * @returns {'visible'|'dim'|'hidden'}
 */
export function checkVisibility(landmark) {
  if (!landmark || landmark.visibility === undefined) return "hidden";
  if (landmark.visibility >= DRAW_CONFIG.visibility.dim) return "visible";
  if (landmark.visibility >= DRAW_CONFIG.visibility.min) return "dim";
  return "hidden";
}

/**
 * 연결선의 두 랜드마크가 모두 보이는지 확인
 * @param {Array} landmarks
 * @param {number} fromIdx
 * @param {number} toIdx
 * @returns {boolean}
 */
export function isConnectionVisible(landmarks, fromIdx, toIdx) {
  return (
    checkVisibility(landmarks[fromIdx]) !== "hidden" &&
    checkVisibility(landmarks[toIdx]) !== "hidden"
  );
}

/**
 * 스켈레톤을 Canvas에 그리기 위한 렌더링 데이터 생성
 * (실제 ctx.drawXxx 호출은 렌더러 컴포넌트에서 수행)
 *
 * @param {Array} landmarks — MediaPipe 결과 [0..32]
 * @param {Object} options
 * @param {Object} [options.activationMap] — 근육별 활성화 강도
 * @param {boolean} [options.isCorrectForm] — 올바른 자세 여부
 * @param {string[]} [options.highlightJoints] — 강조할 관절명 배열
 * @param {boolean} [options.showFace] — 얼굴 연결선 표시 여부 (기본 false)
 * @returns {{ lines: Array, dots: Array }}
 */
export function buildSkeletonRenderData(landmarks, options = {}) {
  const {
    activationMap = {},
    isCorrectForm = true,
    highlightJoints = [],
    showFace = false,
  } = options;

  const activeSegments = getActiveSegments(Object.keys(activationMap));

  const lines = [];
  const dots = [];
  const processedDots = new Set();

  for (const [fromIdx, toIdx, segment] of SKELETON) {
    // 얼굴 숨김 옵션
    if (segment === SEGMENT.FACE && !showFace) continue;

    // visibility 체크
    if (!isConnectionVisible(landmarks, fromIdx, toIdx)) continue;

    const isActive = activeSegments.includes(segment);
    const style = SEGMENT_STYLE[segment];

    // 색상 결정
    let color = style.color;
    let lineWidth = style.lineWidth;
    let glow = false;

    if (isActive) {
      color = isCorrectForm
        ? DRAW_CONFIG.line.correctColor
        : DRAW_CONFIG.line.incorrectColor;
      lineWidth = DRAW_CONFIG.line.activeWidth;
      glow = true;
    }

    lines.push({
      from: { x: landmarks[fromIdx].x, y: landmarks[fromIdx].y },
      to:   { x: landmarks[toIdx].x,   y: landmarks[toIdx].y },
      color,
      lineWidth,
      glow,
      glowBlur: glow ? DRAW_CONFIG.line.glowBlur : 0,
      segment,
      opacity: DRAW_CONFIG.line.opacity,
    });

    // 점(dot) 수집 (중복 방지)
    for (const idx of [fromIdx, toIdx]) {
      if (processedDots.has(idx)) continue;
      processedDots.add(idx);

      const vis = checkVisibility(landmarks[idx]);
      if (vis === "hidden") continue;

      const isJoint = JOINT_LANDMARKS.includes(idx);
      const dotIsActive = isActive;

      let dotColor = style.color;
      let radius = isJoint ? DRAW_CONFIG.dot.jointRadius : style.dotRadius;

      if (dotIsActive) {
        dotColor = isCorrectForm
          ? DRAW_CONFIG.dot.correctColor
          : DRAW_CONFIG.dot.incorrectColor;
        radius = DRAW_CONFIG.dot.activeRadius;
      }

      dots.push({
        x: landmarks[idx].x,
        y: landmarks[idx].y,
        radius,
        color: dotColor,
        strokeColor: DRAW_CONFIG.dot.strokeColor,
        strokeWidth: DRAW_CONFIG.dot.strokeWidth,
        opacity: vis === "dim" ? 0.5 : DRAW_CONFIG.dot.opacity,
        landmarkIndex: idx,
        name: LANDMARK_NAMES[idx],
        isJoint,
        segment,
      });
    }
  }

  return { lines, dots };
}

export default SKELETON;
