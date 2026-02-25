// ============================================================
// poses.js — 18종 운동별 올바른 자세 판정 기준
//
// MediaPipe BlazePose 33개 랜드마크 기반.
// 각 운동의 페이즈(top/bottom/hold)별 관절 각도 허용 범위,
// 정렬 검사, 오류 감지 조건을 정의한다.
//
// 다른 모듈에서 사용:
//   import { POSE_CRITERIA, LM, JOINTS, calcAngle } from './poses';
// ============================================================

// ────────────────────────────────────────────
// 1. MediaPipe BlazePose 랜드마크 인덱스
// ────────────────────────────────────────────
export const LM = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

// ────────────────────────────────────────────
// 2. 주요 관절 각도 정의 (랜드마크 3점 triplet)
//    calcAngle(a, b, c) → b를 꼭짓점으로 한 각도(°)
// ────────────────────────────────────────────
export const JOINTS = {
  // ── 왼쪽 ──
  leftKnee:     [LM.LEFT_HIP,      LM.LEFT_KNEE,     LM.LEFT_ANKLE],
  leftHip:      [LM.LEFT_SHOULDER,  LM.LEFT_HIP,      LM.LEFT_KNEE],
  leftElbow:    [LM.LEFT_SHOULDER,  LM.LEFT_ELBOW,    LM.LEFT_WRIST],
  leftShoulder: [LM.LEFT_HIP,      LM.LEFT_SHOULDER,  LM.LEFT_ELBOW],
  leftAnkle:    [LM.LEFT_KNEE,     LM.LEFT_ANKLE,    LM.LEFT_FOOT_INDEX],

  // ── 오른쪽 ──
  rightKnee:     [LM.RIGHT_HIP,      LM.RIGHT_KNEE,     LM.RIGHT_ANKLE],
  rightHip:      [LM.RIGHT_SHOULDER,  LM.RIGHT_HIP,      LM.RIGHT_KNEE],
  rightElbow:    [LM.RIGHT_SHOULDER,  LM.RIGHT_ELBOW,    LM.RIGHT_WRIST],
  rightShoulder: [LM.RIGHT_HIP,      LM.RIGHT_SHOULDER,  LM.RIGHT_ELBOW],
  rightAnkle:    [LM.RIGHT_KNEE,     LM.RIGHT_ANKLE,    LM.RIGHT_FOOT_INDEX],

  // ── 체간(torso) ──
  torsoLeft:  [LM.LEFT_SHOULDER,  LM.LEFT_HIP,  LM.LEFT_KNEE],
  torsoRight: [LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_KNEE],
  spine:      [LM.LEFT_SHOULDER,  LM.LEFT_HIP,  LM.LEFT_ANKLE],   // 전신 직선성
  neck:       [LM.LEFT_EAR,       LM.LEFT_SHOULDER, LM.LEFT_HIP],  // 목 정렬
};

// ────────────────────────────────────────────
// 3. 각도 계산 유틸리티
// ────────────────────────────────────────────

/**
 * 세 점(a, b, c)에서 b를 꼭짓점으로 한 각도(°) 반환
 * @param {{x:number, y:number}} a
 * @param {{x:number, y:number}} b  — 꼭짓점
 * @param {{x:number, y:number}} c
 * @returns {number} 0~180
 */
export function calcAngle(a, b, c) {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) -
    Math.atan2(a.y - b.y, a.x - b.x);
  let deg = Math.abs((radians * 180) / Math.PI);
  if (deg > 180) deg = 360 - deg;
  return deg;
}

/**
 * 랜드마크 배열에서 특정 관절 각도 계산
 * @param {Array} landmarks — MediaPipe 결과 landmarks[0..32]
 * @param {string} jointName — JOINTS 키
 * @returns {number} 각도(°)
 */
export function getJointAngle(landmarks, jointName) {
  const [ai, bi, ci] = JOINTS[jointName];
  return calcAngle(landmarks[ai], landmarks[bi], landmarks[ci]);
}

/**
 * 두 점 사이의 수직 정렬 편차 비율
 * (좌우 어깨 너비 대비 x 오프셋)
 * @param {Array} landmarks
 * @param {number} idx1
 * @param {number} idx2
 * @returns {number} 0~1 (0이면 완벽 수직)
 */
export function verticalAlignment(landmarks, idx1, idx2) {
  const shoulderWidth = Math.abs(
    landmarks[LM.LEFT_SHOULDER].x - landmarks[LM.RIGHT_SHOULDER].x
  );
  if (shoulderWidth < 0.001) return 0;
  return Math.abs(landmarks[idx1].x - landmarks[idx2].x) / shoulderWidth;
}

/**
 * 두 점 사이의 수평 정렬 편차 비율
 * @param {Array} landmarks
 * @param {number} idx1
 * @param {number} idx2
 * @returns {number}
 */
export function horizontalAlignment(landmarks, idx1, idx2) {
  const torsoHeight = Math.abs(
    landmarks[LM.LEFT_SHOULDER].y - landmarks[LM.LEFT_HIP].y
  );
  if (torsoHeight < 0.001) return 0;
  return Math.abs(landmarks[idx1].y - landmarks[idx2].y) / torsoHeight;
}

// ────────────────────────────────────────────
// 4. 판정 임계값 상수
// ────────────────────────────────────────────
export const THRESHOLDS = {
  ANGLE_TOLERANCE: 10,     // 각도 판정 여유(°) — 이 범위 안이면 "양호"
  ALIGNMENT_OK: 0.15,      // 정렬 편차 0.15 이하면 OK
  ALIGNMENT_WARN: 0.25,    // 0.25 초과면 에러
  VISIBILITY_MIN: 0.5,     // 랜드마크 visibility 최소값
  SCORE_PASS: 70,          // 100점 만점 중 70점 이상이면 "올바른 자세"
};

// ────────────────────────────────────────────
// 5. 18종 운동별 자세 판정 기준
// ────────────────────────────────────────────
//
// 구조 설명:
//   phases      : 운동 페이즈별 관절 각도 허용 범위
//     - angles  : { joint, min, max, side } 배열
//     - alignments : 정렬 검사 배열
//   phaseDetect : 현재 페이즈를 판별하는 각도 조건
//   errors      : 오류 감지 규칙 (exercises.js corrections와 1:1 매핑)
//     - id      : 오류 식별자 (corrections[i].issue 축약)
//     - check   : 'angle' | 'alignment' | 'velocity' | 'ratio'
//     - condition: 구체적 조건 객체
//     - severity : 'warning' | 'error'
//   viewPreference : 최적 촬영 방향 ('side' | 'front' | 'any')
// ────────────────────────────────────────────

export const POSE_CRITERIA = {

  // ================================================================
  // 1. 스쿼트 (Squat)
  // ================================================================
  squat: {
    viewPreference: "side",
    phases: {
      top: {
        label: "직립 (탑)",
        angles: [
          { joint: "leftKnee",  min: 160, max: 180, side: "left" },
          { joint: "rightKnee", min: 160, max: 180, side: "right" },
          { joint: "leftHip",   min: 160, max: 180, side: "left" },
          { joint: "rightHip",  min: 160, max: 180, side: "right" },
        ],
        alignments: [
          { type: "vertical", p1: LM.LEFT_SHOULDER, p2: LM.LEFT_ANKLE, maxDeviation: 0.20 },
        ],
      },
      bottom: {
        label: "스쿼트 바닥",
        angles: [
          { joint: "leftKnee",  min: 70,  max: 110, side: "left" },
          { joint: "rightKnee", min: 70,  max: 110, side: "right" },
          { joint: "leftHip",   min: 55,  max: 100, side: "left" },
          { joint: "rightHip",  min: 55,  max: 100, side: "right" },
        ],
        alignments: [
          // 무릎이 발끝 안쪽~위에 위치
          { type: "vertical", p1: LM.LEFT_KNEE, p2: LM.LEFT_ANKLE, maxDeviation: 0.25 },
        ],
      },
    },
    phaseDetect: {
      bottom: { joint: "leftKnee", below: 115 },
      top:    { joint: "leftKnee", above: 155 },
    },
    errors: [
      {
        id: "knee_valgus",
        label: "무릎 내측 붕괴",
        check: "alignment",
        condition: {
          // 양 무릎 사이 거리 < 양 발목 사이 거리의 70%
          type: "kneeVsAnkleWidth",
          ratio: 0.70,
        },
        severity: "error",
        correctionIndex: 0,
      },
      {
        id: "forward_lean",
        label: "과도한 전방 경사",
        check: "angle",
        condition: {
          // 체간각(어깨-엉덩이-수직) 이 45° 미만이면 너무 숙임
          joint: "torsoLeft",
          max: 45,
        },
        severity: "warning",
        correctionIndex: 1,
      },
      {
        id: "insufficient_depth",
        label: "깊이 부족",
        check: "angle",
        condition: {
          // 바닥 페이즈에서 무릎 각도가 115° 이상이면 덜 앉은 것
          joint: "leftKnee",
          min: 115,
          phase: "bottom",
        },
        severity: "warning",
        correctionIndex: 2,
      },
      {
        id: "butt_wink",
        label: "허리 굴곡 (버트윙크)",
        check: "angle",
        condition: {
          // 바닥 페이즈에서 hip 각도가 55° 미만이면 골반 후방회전
          joint: "leftHip",
          max: 55,
          phase: "bottom",
        },
        severity: "error",
        correctionIndex: 3,
      },
    ],
  },

  // ================================================================
  // 2. 데드리프트 (Deadlift)
  // ================================================================
  deadlift: {
    viewPreference: "side",
    phases: {
      top: {
        label: "락아웃",
        angles: [
          { joint: "leftHip",  min: 165, max: 185, side: "left" },
          { joint: "leftKnee", min: 165, max: 180, side: "left" },
        ],
        alignments: [
          { type: "vertical", p1: LM.LEFT_SHOULDER, p2: LM.LEFT_HIP, maxDeviation: 0.12 },
        ],
      },
      bottom: {
        label: "바닥 (시작)",
        angles: [
          { joint: "leftHip",  min: 55,  max: 95,  side: "left" },
          { joint: "leftKnee", min: 100, max: 145, side: "left" },
        ],
        alignments: [
          // 어깨가 바(손목) 바로 위 또는 약간 앞
          { type: "vertical", p1: LM.LEFT_SHOULDER, p2: LM.LEFT_WRIST, maxDeviation: 0.20 },
        ],
      },
    },
    phaseDetect: {
      bottom: { joint: "leftHip", below: 100 },
      top:    { joint: "leftHip", above: 160 },
    },
    errors: [
      {
        id: "rounded_back",
        label: "등 굴곡",
        check: "alignment",
        condition: {
          // 어깨가 엉덩이보다 과도하게 앞(x) → 등이 둥글어짐
          type: "shoulderForwardOfHip",
          maxRatio: 0.35,
        },
        severity: "error",
        correctionIndex: 0,
      },
      {
        id: "bar_drift",
        label: "바 이탈",
        check: "alignment",
        condition: {
          type: "vertical",
          p1: LM.LEFT_WRIST,
          p2: LM.LEFT_ANKLE,
          maxDeviation: 0.30,
        },
        severity: "warning",
        correctionIndex: 1,
      },
      {
        id: "hyperextension",
        label: "요추 과신전",
        check: "angle",
        condition: {
          joint: "leftHip",
          min: 185,
          phase: "top",
        },
        severity: "warning",
        correctionIndex: 2,
      },
      {
        id: "hips_rising_fast",
        label: "엉덩이 급상승",
        check: "velocity",
        condition: {
          // 엉덩이 y속도가 어깨 y속도의 1.5배 이상이면 엉덩이가 먼저 오름
          type: "hipVsShoulderRise",
          ratio: 1.5,
        },
        severity: "error",
        correctionIndex: 3,
      },
    ],
  },

  // ================================================================
  // 3. 벤치프레스 (Bench Press)
  // ================================================================
  benchPress: {
    viewPreference: "side",
    phases: {
      top: {
        label: "락아웃",
        angles: [
          { joint: "leftElbow",  min: 155, max: 178, side: "left" },
          { joint: "rightElbow", min: 155, max: 178, side: "right" },
        ],
        alignments: [
          // 손목이 어깨 위 수직선상
          { type: "vertical", p1: LM.LEFT_WRIST, p2: LM.LEFT_SHOULDER, maxDeviation: 0.20 },
        ],
      },
      bottom: {
        label: "가슴 터치",
        angles: [
          { joint: "leftElbow",  min: 70, max: 105, side: "left" },
          { joint: "rightElbow", min: 70, max: 105, side: "right" },
        ],
        alignments: [],
      },
    },
    phaseDetect: {
      bottom: { joint: "leftElbow", below: 110 },
      top:    { joint: "leftElbow", above: 150 },
    },
    errors: [
      {
        id: "elbow_flare",
        label: "팔꿈치 과도 외전",
        check: "angle",
        condition: {
          // 상완-몸통 각도(어깨 관절) 75° 초과 → 팔꿈치 벌어짐
          joint: "leftShoulder",
          min: 75,
        },
        severity: "warning",
        correctionIndex: 0,
      },
      {
        id: "bar_too_high",
        label: "바 위치 이탈",
        check: "alignment",
        condition: {
          // 손목 y가 어깨 y보다 상단(목 쪽)으로 가면 바 위치 높음
          type: "wristAboveShoulder",
          p1: LM.LEFT_WRIST,
          p2: LM.LEFT_SHOULDER,
        },
        severity: "warning",
        correctionIndex: 1,
      },
      {
        id: "scapula_not_retracted",
        label: "견갑골 미고정",
        check: "alignment",
        condition: {
          // 양 어깨 사이 거리가 너무 넓으면 견갑골 후인 안 됨
          type: "shoulderWidth",
          maxRatio: 1.15,  // 기본 너비 대비 115% 초과
        },
        severity: "warning",
        correctionIndex: 2,
      },
      {
        id: "hips_off_bench",
        label: "엉덩이 들림",
        check: "alignment",
        condition: {
          // 엉덩이 y가 어깨 y보다 위로 올라감 (누운 상태에서)
          type: "hipAboveShoulder",
          p1: LM.LEFT_HIP,
          p2: LM.LEFT_SHOULDER,
        },
        severity: "error",
        correctionIndex: 3,
      },
    ],
  },

  // ================================================================
  // 4. 숄더프레스 (Shoulder Press)
  // ================================================================
  shoulderPress: {
    viewPreference: "front",
    phases: {
      top: {
        label: "오버헤드 락아웃",
        angles: [
          { joint: "leftElbow",    min: 160, max: 180, side: "left" },
          { joint: "rightElbow",   min: 160, max: 180, side: "right" },
          { joint: "leftShoulder", min: 160, max: 180, side: "left" },
        ],
        alignments: [
          // 손목이 어깨 바로 위
          { type: "vertical", p1: LM.LEFT_WRIST, p2: LM.LEFT_SHOULDER, maxDeviation: 0.15 },
        ],
      },
      bottom: {
        label: "시작 자세",
        angles: [
          { joint: "leftElbow",  min: 75, max: 105, side: "left" },
          { joint: "rightElbow", min: 75, max: 105, side: "right" },
        ],
        alignments: [],
      },
    },
    phaseDetect: {
      bottom: { joint: "leftElbow", below: 110 },
      top:    { joint: "leftElbow", above: 155 },
    },
    errors: [
      {
        id: "excessive_arch",
        label: "허리 과신전",
        check: "angle",
        condition: {
          // 체간 각도(어깨-엉덩이-무릎)가 190° 이상 → 허리 젖혀짐
          joint: "torsoLeft",
          min: 190,
        },
        severity: "error",
        correctionIndex: 0,
      },
      {
        id: "elbows_forward",
        label: "팔꿈치 전방 이동",
        check: "alignment",
        condition: {
          type: "vertical",
          p1: LM.LEFT_ELBOW,
          p2: LM.LEFT_SHOULDER,
          maxDeviation: 0.30,
        },
        severity: "warning",
        correctionIndex: 1,
      },
      {
        id: "shrugging",
        label: "승모근 과사용",
        check: "alignment",
        condition: {
          // 어깨 y가 귀 y에 근접 → 으쓱
          type: "shoulderNearEar",
          p1: LM.LEFT_SHOULDER,
          p2: LM.LEFT_EAR,
          maxDistance: 0.08, // 어깨너비 대비
        },
        severity: "warning",
        correctionIndex: 2,
      },
    ],
  },

  // ================================================================
  // 5. 바이셉 컬 (Bicep Curl)
  // ================================================================
  bicepCurl: {
    viewPreference: "side",
    phases: {
      top: {
        label: "완전 수축",
        angles: [
          { joint: "leftElbow",  min: 25, max: 55, side: "left" },
          { joint: "rightElbow", min: 25, max: 55, side: "right" },
        ],
        alignments: [],
      },
      bottom: {
        label: "이완",
        angles: [
          { joint: "leftElbow",  min: 145, max: 175, side: "left" },
          { joint: "rightElbow", min: 145, max: 175, side: "right" },
        ],
        alignments: [
          // 팔꿈치가 옆구리(엉덩이) 옆에 고정
          { type: "vertical", p1: LM.LEFT_ELBOW, p2: LM.LEFT_HIP, maxDeviation: 0.12 },
        ],
      },
    },
    phaseDetect: {
      top:    { joint: "leftElbow", below: 60 },
      bottom: { joint: "leftElbow", above: 140 },
    },
    errors: [
      {
        id: "swinging",
        label: "반동 사용",
        check: "velocity",
        condition: {
          // 몸통 x축 이동속도가 임계치 초과
          type: "torsoSway",
          maxVelocity: 0.03,  // 프레임당 정규화 좌표
        },
        severity: "error",
        correctionIndex: 0,
      },
      {
        id: "elbow_drift",
        label: "팔꿈치 이탈",
        check: "alignment",
        condition: {
          type: "vertical",
          p1: LM.LEFT_ELBOW,
          p2: LM.LEFT_HIP,
          maxDeviation: 0.20,
        },
        severity: "warning",
        correctionIndex: 1,
      },
      {
        id: "wrist_curl",
        label: "손목 꺾임",
        check: "angle",
        condition: {
          // 전완-손목 정렬 → 팔꿈치-손목-손가락 각도가 160° 미만이면 꺾임
          type: "custom",
          landmarks: [LM.LEFT_ELBOW, LM.LEFT_WRIST, LM.LEFT_INDEX],
          max: 160,
        },
        severity: "warning",
        correctionIndex: 2,
      },
    ],
  },

  // ================================================================
  // 6. 랫풀다운 (Lat Pulldown)
  // ================================================================
  latPulldown: {
    viewPreference: "front",
    phases: {
      top: {
        label: "팔 완전 이완",
        angles: [
          { joint: "leftElbow",    min: 155, max: 180, side: "left" },
          { joint: "leftShoulder", min: 155, max: 180, side: "left" },
        ],
        alignments: [],
      },
      bottom: {
        label: "쇄골 당김",
        angles: [
          { joint: "leftElbow",    min: 65,  max: 105, side: "left" },
          { joint: "leftShoulder", min: 30,  max: 70,  side: "left" },
        ],
        alignments: [],
      },
    },
    phaseDetect: {
      top:    { joint: "leftElbow", above: 150 },
      bottom: { joint: "leftElbow", below: 110 },
    },
    errors: [
      {
        id: "excessive_lean",
        label: "과도한 후방 경사",
        check: "angle",
        condition: {
          // 체간 기울기가 30° 이하 → 너무 뒤로 젖힘
          joint: "torsoLeft",
          max: 150,
        },
        severity: "warning",
        correctionIndex: 0,
      },
      {
        id: "arm_pull",
        label: "팔로만 당김",
        check: "alignment",
        condition: {
          // 견갑골 후인 없이 팔꿈치가 앞에 남아있으면
          type: "elbowBehindShoulder",
          p1: LM.LEFT_ELBOW,
          p2: LM.LEFT_SHOULDER,
          required: true,  // 당김 완료 시 팔꿈치가 어깨 뒤에 있어야
        },
        severity: "warning",
        correctionIndex: 1,
      },
      {
        id: "behind_neck",
        label: "바를 목 뒤로 당김",
        check: "alignment",
        condition: {
          // 손목 y가 귀 뒤(x)로 가면 목 뒤 당김
          type: "wristBehindEar",
          p1: LM.LEFT_WRIST,
          p2: LM.LEFT_EAR,
        },
        severity: "error",
        correctionIndex: 2,
      },
    ],
  },

  // ================================================================
  // 7. 런지 (Lunge)
  // ================================================================
  lunge: {
    viewPreference: "side",
    phases: {
      top: {
        label: "직립",
        angles: [
          { joint: "leftKnee", min: 160, max: 180, side: "left" },
          { joint: "leftHip",  min: 160, max: 180, side: "left" },
        ],
        alignments: [],
      },
      bottom: {
        label: "런지 바닥",
        angles: [
          // 앞 다리
          { joint: "leftKnee", min: 80, max: 105, side: "left" },
          { joint: "leftHip",  min: 80, max: 120, side: "left" },
        ],
        alignments: [
          // 앞 무릎이 발끝 뒤에 위치 (무릎 x ≤ 발끝 x)
          { type: "vertical", p1: LM.LEFT_KNEE, p2: LM.LEFT_ANKLE, maxDeviation: 0.20 },
          // 몸통 수직 정렬
          { type: "vertical", p1: LM.LEFT_SHOULDER, p2: LM.LEFT_HIP, maxDeviation: 0.18 },
        ],
      },
    },
    phaseDetect: {
      bottom: { joint: "leftKnee", below: 110 },
      top:    { joint: "leftKnee", above: 155 },
    },
    errors: [
      {
        id: "knee_valgus",
        label: "무릎 내측 붕괴",
        check: "alignment",
        condition: {
          type: "kneeInsideAnkle",
          side: "front",
        },
        severity: "error",
        correctionIndex: 0,
      },
      {
        id: "forward_lean",
        label: "상체 앞쏠림",
        check: "alignment",
        condition: {
          type: "vertical",
          p1: LM.LEFT_SHOULDER,
          p2: LM.LEFT_HIP,
          maxDeviation: 0.25,
        },
        severity: "warning",
        correctionIndex: 1,
      },
      {
        id: "stride_short",
        label: "보폭 부족",
        check: "angle",
        condition: {
          // 바닥 페이즈에서 무릎 각도 > 115° → 보폭이 좁음
          joint: "leftKnee",
          min: 115,
          phase: "bottom",
        },
        severity: "warning",
        correctionIndex: 2,
      },
    ],
  },

  // ================================================================
  // 8. 플랭크 (Plank)
  // ================================================================
  plank: {
    viewPreference: "side",
    phases: {
      hold: {
        label: "플랭크 유지",
        angles: [
          // 어깨-엉덩이-발목 일직선 (170~190°)
          { joint: "spine", min: 165, max: 195, side: "left" },
          // 어깨 각도 (팔꿈치 지지 → 어깨 바로 위)
          { joint: "leftShoulder", min: 75, max: 105, side: "left" },
        ],
        alignments: [
          // 어깨-엉덩이-발목 수직 편차 최소
          { type: "linear", p1: LM.LEFT_SHOULDER, p2: LM.LEFT_HIP, p3: LM.LEFT_ANKLE, maxDeviation: 0.10 },
        ],
      },
    },
    phaseDetect: {
      hold: { joint: "spine", min: 150, max: 200 },
    },
    errors: [
      {
        id: "hips_pike",
        label: "엉덩이 올라감",
        check: "angle",
        condition: {
          // spine 각도 < 160° → 엉덩이 솟음
          joint: "spine",
          max: 160,
        },
        severity: "warning",
        correctionIndex: 0,
      },
      {
        id: "hips_sag",
        label: "허리 처짐",
        check: "angle",
        condition: {
          // spine 각도 > 195° → 허리 꺾임
          joint: "spine",
          min: 195,
        },
        severity: "error",
        correctionIndex: 1,
      },
      {
        id: "neck_extension",
        label: "목 과신전",
        check: "angle",
        condition: {
          // 귀-어깨-엉덩이 각도 < 150° → 고개 들음
          joint: "neck",
          max: 150,
        },
        severity: "warning",
        correctionIndex: 2,
      },
    ],
  },

  // ================================================================
  // 9. 레그프레스 (Leg Press)
  // ================================================================
  legPress: {
    viewPreference: "side",
    phases: {
      top: {
        label: "다리 이완 (밀기 완료)",
        angles: [
          { joint: "leftKnee", min: 155, max: 175, side: "left" },
        ],
        alignments: [],
      },
      bottom: {
        label: "깊은 굴곡",
        angles: [
          { joint: "leftKnee", min: 75, max: 105, side: "left" },
        ],
        alignments: [],
      },
    },
    phaseDetect: {
      bottom: { joint: "leftKnee", below: 110 },
      top:    { joint: "leftKnee", above: 150 },
    },
    errors: [
      {
        id: "knee_lock",
        label: "무릎 잠금",
        check: "angle",
        condition: {
          joint: "leftKnee",
          min: 178,
          phase: "top",
        },
        severity: "error",
        correctionIndex: 0,
      },
      {
        id: "butt_off_seat",
        label: "엉덩이 들림",
        check: "alignment",
        condition: {
          type: "hipLiftFromSeat",
          // 엉덩이 y가 기준선(시트) 대비 이동
          maxShift: 0.08,
        },
        severity: "error",
        correctionIndex: 1,
      },
      {
        id: "knee_valgus",
        label: "무릎 내측 붕괴",
        check: "alignment",
        condition: {
          type: "kneeVsAnkleWidth",
          ratio: 0.70,
        },
        severity: "error",
        correctionIndex: 2,
      },
    ],
  },

  // ================================================================
  // 10. 케이블 플라이 (Cable Fly)
  // ================================================================
  cableFly: {
    viewPreference: "front",
    phases: {
      open: {
        label: "팔 벌림 (스트레치)",
        angles: [
          { joint: "leftElbow",    min: 140, max: 170, side: "left" },
          { joint: "leftShoulder", min: 130, max: 175, side: "left" },
        ],
        alignments: [],
      },
      closed: {
        label: "팔 모음 (수축)",
        angles: [
          { joint: "leftShoulder", min: 10, max: 45, side: "left" },
        ],
        alignments: [],
      },
    },
    phaseDetect: {
      open:   { joint: "leftShoulder", above: 125 },
      closed: { joint: "leftShoulder", below: 50 },
    },
    errors: [
      {
        id: "elbow_bend",
        label: "팔꿈치 과굴곡",
        check: "angle",
        condition: {
          joint: "leftElbow",
          max: 130,
        },
        severity: "warning",
        correctionIndex: 0,
      },
      {
        id: "forward_lean",
        label: "상체 과도한 전경",
        check: "angle",
        condition: {
          joint: "torsoLeft",
          max: 150,
        },
        severity: "warning",
        correctionIndex: 1,
      },
      {
        id: "shoulder_roll",
        label: "어깨 전방 회전",
        check: "alignment",
        condition: {
          type: "shoulderForwardOfHip",
          maxRatio: 0.20,
        },
        severity: "warning",
        correctionIndex: 2,
      },
    ],
  },

  // ================================================================
  // 11. 사이드 레터럴 레이즈 (Lateral Raise)
  // ================================================================
  lateralRaise: {
    viewPreference: "front",
    phases: {
      bottom: {
        label: "팔 내린 자세",
        angles: [
          { joint: "leftShoulder", min: 0, max: 20, side: "left" },
        ],
        alignments: [],
      },
      top: {
        label: "어깨 높이",
        angles: [
          // 상완-몸통 각도 80~100° (어깨 높이)
          { joint: "leftShoulder", min: 75, max: 100, side: "left" },
          // 팔꿈치 살짝 굽힘 유지
          { joint: "leftElbow",    min: 145, max: 175, side: "left" },
        ],
        alignments: [
          // 손목 y ≈ 어깨 y (어깨 높이까지만)
          { type: "horizontal", p1: LM.LEFT_WRIST, p2: LM.LEFT_SHOULDER, maxDeviation: 0.10 },
        ],
      },
    },
    phaseDetect: {
      bottom: { joint: "leftShoulder", below: 25 },
      top:    { joint: "leftShoulder", above: 70 },
    },
    errors: [
      {
        id: "swinging",
        label: "반동 사용",
        check: "velocity",
        condition: {
          type: "torsoSway",
          maxVelocity: 0.025,
        },
        severity: "error",
        correctionIndex: 0,
      },
      {
        id: "shrugging",
        label: "승모근 개입",
        check: "alignment",
        condition: {
          type: "shoulderNearEar",
          p1: LM.LEFT_SHOULDER,
          p2: LM.LEFT_EAR,
          maxDistance: 0.08,
        },
        severity: "warning",
        correctionIndex: 1,
      },
      {
        id: "elbow_drop",
        label: "팔꿈치 아래 처짐",
        check: "alignment",
        condition: {
          // 팔꿈치 y가 손목 y보다 아래 → 팔꿈치가 처짐
          type: "elbowBelowWrist",
          p1: LM.LEFT_ELBOW,
          p2: LM.LEFT_WRIST,
        },
        severity: "warning",
        correctionIndex: 2,
      },
    ],
  },

  // ================================================================
  // 12. 레그 컬 (Leg Curl)
  // ================================================================
  legCurl: {
    viewPreference: "side",
    phases: {
      extended: {
        label: "다리 이완",
        angles: [
          { joint: "leftKnee", min: 155, max: 180, side: "left" },
        ],
        alignments: [],
      },
      curled: {
        label: "완전 수축",
        angles: [
          { joint: "leftKnee", min: 35, max: 75, side: "left" },
        ],
        alignments: [],
      },
    },
    phaseDetect: {
      extended: { joint: "leftKnee", above: 150 },
      curled:   { joint: "leftKnee", below: 80 },
    },
    errors: [
      {
        id: "hips_lift",
        label: "골반 들림",
        check: "alignment",
        condition: {
          type: "hipLiftFromSeat",
          maxShift: 0.06,
        },
        severity: "error",
        correctionIndex: 0,
      },
      {
        id: "partial_range",
        label: "가동범위 부족",
        check: "angle",
        condition: {
          joint: "leftKnee",
          min: 80,
          phase: "curled",
        },
        severity: "warning",
        correctionIndex: 1,
      },
      {
        id: "fast_eccentric",
        label: "빠른 네거티브",
        check: "velocity",
        condition: {
          type: "kneeExtensionSpeed",
          maxVelocity: 0.05,
        },
        severity: "warning",
        correctionIndex: 2,
      },
    ],
  },

  // ================================================================
  // 13. 풀업 (Pull Up)
  // ================================================================
  pullUp: {
    viewPreference: "front",
    phases: {
      bottom: {
        label: "데드행 (매달림)",
        angles: [
          { joint: "leftElbow",    min: 155, max: 180, side: "left" },
          { joint: "leftShoulder", min: 160, max: 180, side: "left" },
        ],
        alignments: [],
      },
      top: {
        label: "턱 위 바",
        angles: [
          { joint: "leftElbow",    min: 55, max: 95,  side: "left" },
          { joint: "leftShoulder", min: 20, max: 60,  side: "left" },
        ],
        alignments: [
          // 턱(코) y가 손목 y보다 위
          { type: "chinAboveBar", p1: LM.NOSE, p2: LM.LEFT_WRIST },
        ],
      },
    },
    phaseDetect: {
      bottom: { joint: "leftElbow", above: 150 },
      top:    { joint: "leftElbow", below: 100 },
    },
    errors: [
      {
        id: "kipping",
        label: "키핑/반동",
        check: "velocity",
        condition: {
          type: "hipSway",
          maxVelocity: 0.04,
        },
        severity: "error",
        correctionIndex: 0,
      },
      {
        id: "chin_barely",
        label: "턱만 걸치기",
        check: "alignment",
        condition: {
          // 코 y가 손목 y와 거의 같거나 아래 → 충분히 안 올라감
          type: "chinBarelyOverBar",
          p1: LM.NOSE,
          p2: LM.LEFT_WRIST,
          minMargin: 0.03,
        },
        severity: "warning",
        correctionIndex: 1,
      },
      {
        id: "shrugging_bottom",
        label: "어깨 올림",
        check: "alignment",
        condition: {
          type: "shoulderNearEar",
          p1: LM.LEFT_SHOULDER,
          p2: LM.LEFT_EAR,
          maxDistance: 0.06,
          phase: "bottom",
        },
        severity: "warning",
        correctionIndex: 2,
      },
    ],
  },

  // ================================================================
  // 14. 딥스 (Dip)
  // ================================================================
  dip: {
    viewPreference: "side",
    phases: {
      top: {
        label: "지지 (락아웃)",
        angles: [
          { joint: "leftElbow", min: 155, max: 178, side: "left" },
        ],
        alignments: [
          { type: "vertical", p1: LM.LEFT_SHOULDER, p2: LM.LEFT_WRIST, maxDeviation: 0.15 },
        ],
      },
      bottom: {
        label: "깊은 굴곡",
        angles: [
          { joint: "leftElbow", min: 75, max: 105, side: "left" },
        ],
        alignments: [],
      },
    },
    phaseDetect: {
      top:    { joint: "leftElbow", above: 150 },
      bottom: { joint: "leftElbow", below: 110 },
    },
    errors: [
      {
        id: "not_deep",
        label: "깊이 부족",
        check: "angle",
        condition: {
          joint: "leftElbow",
          min: 110,
          phase: "bottom",
        },
        severity: "warning",
        correctionIndex: 0,
      },
      {
        id: "shoulder_roll",
        label: "어깨 전방 돌출",
        check: "alignment",
        condition: {
          type: "shoulderForwardOfHip",
          maxRatio: 0.30,
        },
        severity: "error",
        correctionIndex: 1,
      },
      {
        id: "legs_swing",
        label: "다리 흔들림",
        check: "velocity",
        condition: {
          type: "ankleSway",
          p1: LM.LEFT_ANKLE,
          maxVelocity: 0.04,
        },
        severity: "warning",
        correctionIndex: 2,
      },
    ],
  },

  // ================================================================
  // 15. 힙 쓰러스트 (Hip Thrust)
  // ================================================================
  hipThrust: {
    viewPreference: "side",
    phases: {
      bottom: {
        label: "시작 자세",
        angles: [
          { joint: "leftHip", min: 55, max: 85, side: "left" },
        ],
        alignments: [],
      },
      top: {
        label: "둔근 수축 (락아웃)",
        angles: [
          // 어깨-엉덩이-무릎 일직선 (170~185°)
          { joint: "leftHip", min: 170, max: 185, side: "left" },
          // 무릎 90° 유지
          { joint: "leftKnee", min: 80, max: 100, side: "left" },
        ],
        alignments: [
          // 어깨-엉덩이-무릎 수평 정렬
          { type: "linear", p1: LM.LEFT_SHOULDER, p2: LM.LEFT_HIP, p3: LM.LEFT_KNEE, maxDeviation: 0.10 },
        ],
      },
    },
    phaseDetect: {
      bottom: { joint: "leftHip", below: 90 },
      top:    { joint: "leftHip", above: 165 },
    },
    errors: [
      {
        id: "hyperextension",
        label: "요추 과신전",
        check: "angle",
        condition: {
          joint: "leftHip",
          min: 190,
          phase: "top",
        },
        severity: "error",
        correctionIndex: 0,
      },
      {
        id: "foot_position",
        label: "발 위치 부적절",
        check: "angle",
        condition: {
          // 탑에서 정강이 수직 = 무릎 90° → 80~100° 벗어나면 발 위치 문제
          joint: "leftKnee",
          min: 100,
          max: 80,
          phase: "top",
        },
        severity: "warning",
        correctionIndex: 1,
      },
      {
        id: "uneven_hips",
        label: "불균형 골반",
        check: "alignment",
        condition: {
          type: "horizontal",
          p1: LM.LEFT_HIP,
          p2: LM.RIGHT_HIP,
          maxDeviation: 0.08,
        },
        severity: "warning",
        correctionIndex: 2,
      },
    ],
  },

  // ================================================================
  // 16. 루마니안 데드리프트 (Romanian Deadlift)
  // ================================================================
  romanianDeadlift: {
    viewPreference: "side",
    phases: {
      top: {
        label: "직립",
        angles: [
          { joint: "leftHip",  min: 165, max: 180, side: "left" },
          { joint: "leftKnee", min: 155, max: 175, side: "left" },
        ],
        alignments: [],
      },
      bottom: {
        label: "힌지 (스트레치)",
        angles: [
          // 엉덩이 힌지 — hip 각도 60~95°
          { joint: "leftHip",  min: 55,  max: 95,  side: "left" },
          // 무릎 살짝 굽힘 유지 — 150~170°
          { joint: "leftKnee", min: 145, max: 172, side: "left" },
        ],
        alignments: [
          // 바(손목)가 정강이~무릎 앞에 밀착
          { type: "vertical", p1: LM.LEFT_WRIST, p2: LM.LEFT_KNEE, maxDeviation: 0.15 },
        ],
      },
    },
    phaseDetect: {
      bottom: { joint: "leftHip", below: 100 },
      top:    { joint: "leftHip", above: 160 },
    },
    errors: [
      {
        id: "too_much_knee_bend",
        label: "무릎 과굴곡",
        check: "angle",
        condition: {
          joint: "leftKnee",
          max: 140,
          phase: "bottom",
        },
        severity: "warning",
        correctionIndex: 0,
      },
      {
        id: "rounded_back",
        label: "등 굴곡",
        check: "alignment",
        condition: {
          type: "shoulderForwardOfHip",
          maxRatio: 0.35,
        },
        severity: "error",
        correctionIndex: 1,
      },
      {
        id: "bar_away",
        label: "바 이탈",
        check: "alignment",
        condition: {
          type: "vertical",
          p1: LM.LEFT_WRIST,
          p2: LM.LEFT_KNEE,
          maxDeviation: 0.25,
        },
        severity: "warning",
        correctionIndex: 2,
      },
    ],
  },

  // ================================================================
  // 17. 인클라인 벤치프레스 (Incline Bench)
  // ================================================================
  inclineBench: {
    viewPreference: "side",
    phases: {
      top: {
        label: "락아웃",
        angles: [
          { joint: "leftElbow",  min: 155, max: 178, side: "left" },
          { joint: "rightElbow", min: 155, max: 178, side: "right" },
        ],
        alignments: [
          { type: "vertical", p1: LM.LEFT_WRIST, p2: LM.LEFT_SHOULDER, maxDeviation: 0.20 },
        ],
      },
      bottom: {
        label: "가슴 상부 터치",
        angles: [
          { joint: "leftElbow",  min: 65, max: 105, side: "left" },
          { joint: "rightElbow", min: 65, max: 105, side: "right" },
        ],
        alignments: [],
      },
    },
    phaseDetect: {
      bottom: { joint: "leftElbow", below: 110 },
      top:    { joint: "leftElbow", above: 150 },
    },
    errors: [
      {
        id: "bench_too_steep",
        label: "벤치 각도 과도",
        check: "angle",
        condition: {
          // 체간 각도가 45° 이하(너무 세움) → 어깨 운동화
          // 인클라인 적정 = 약 60~75°(체간-수직 기준 25~35°)
          joint: "torsoLeft",
          max: 135,  // 체간이 너무 세워짐
        },
        severity: "warning",
        correctionIndex: 0,
      },
      {
        id: "bar_path_drift",
        label: "바 경로 이탈",
        check: "alignment",
        condition: {
          type: "wristAboveShoulder",
          p1: LM.LEFT_WRIST,
          p2: LM.LEFT_SHOULDER,
        },
        severity: "warning",
        correctionIndex: 1,
      },
      {
        id: "hips_lifting",
        label: "엉덩이 들림",
        check: "alignment",
        condition: {
          type: "hipAboveShoulder",
          p1: LM.LEFT_HIP,
          p2: LM.LEFT_SHOULDER,
        },
        severity: "error",
        correctionIndex: 2,
      },
    ],
  },

  // ================================================================
  // 18. 페이스 풀 (Face Pull)
  // ================================================================
  facePull: {
    viewPreference: "front",
    phases: {
      start: {
        label: "팔 이완",
        angles: [
          { joint: "leftElbow",    min: 150, max: 180, side: "left" },
          { joint: "leftShoulder", min: 20,  max: 50,  side: "left" },
        ],
        alignments: [],
      },
      pulled: {
        label: "이마 높이 당김 + 외회전",
        angles: [
          { joint: "leftElbow",    min: 75,  max: 110, side: "left" },
          { joint: "leftShoulder", min: 70,  max: 110, side: "left" },
        ],
        alignments: [
          // 손목 y ≈ 코/이마 y (얼굴 높이 당김)
          { type: "horizontal", p1: LM.LEFT_WRIST, p2: LM.NOSE, maxDeviation: 0.12 },
        ],
      },
    },
    phaseDetect: {
      start:  { joint: "leftElbow", above: 145 },
      pulled: { joint: "leftElbow", below: 115 },
    },
    errors: [
      {
        id: "pulling_low",
        label: "당기는 높이 부족",
        check: "alignment",
        condition: {
          // 손목이 어깨 아래에 위치 → 너무 낮게 당김
          type: "wristBelowShoulder",
          p1: LM.LEFT_WRIST,
          p2: LM.LEFT_SHOULDER,
          phase: "pulled",
        },
        severity: "warning",
        correctionIndex: 0,
      },
      {
        id: "no_external_rotation",
        label: "외회전 부족",
        check: "angle",
        condition: {
          // 당김 완료 시 손목이 귀 옆까지 안 감 → 외회전 미흡
          type: "custom",
          landmarks: [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST],
          min: 90,   // 외회전 시 전완이 수직 이상 올라가야
          phase: "pulled",
        },
        severity: "warning",
        correctionIndex: 1,
      },
      {
        id: "leaning_back",
        label: "몸통 뒤로 젖힘",
        check: "angle",
        condition: {
          joint: "torsoLeft",
          max: 155,
        },
        severity: "warning",
        correctionIndex: 2,
      },
    ],
  },
};

// ────────────────────────────────────────────
// 6. 판정 유틸리티 함수
// ────────────────────────────────────────────

/**
 * 운동 ID 배열
 */
export const POSE_EXERCISE_IDS = Object.keys(POSE_CRITERIA);

/**
 * 특정 운동의 현재 페이즈를 판별
 * @param {string} exerciseId
 * @param {Array} landmarks
 * @returns {string|null} 페이즈 이름 또는 'transition'
 */
export function detectPhase(exerciseId, landmarks) {
  const criteria = POSE_CRITERIA[exerciseId];
  if (!criteria || !criteria.phaseDetect) return null;

  for (const [phaseName, condition] of Object.entries(criteria.phaseDetect)) {
    const angle = getJointAngle(landmarks, condition.joint);

    if (condition.below !== undefined && angle < condition.below) return phaseName;
    if (condition.above !== undefined && angle > condition.above) return phaseName;
    if (condition.min !== undefined && condition.max !== undefined) {
      if (angle >= condition.min && angle <= condition.max) return phaseName;
    }
  }

  return "transition";
}

/**
 * 특정 페이즈에서 각도 적합성 점수 계산 (0~100)
 * @param {string} exerciseId
 * @param {string} phaseName
 * @param {Array} landmarks
 * @returns {{ score: number, details: Array<{joint, angle, min, max, pass}> }}
 */
export function scorePhaseAngles(exerciseId, phaseName, landmarks) {
  const criteria = POSE_CRITERIA[exerciseId];
  if (!criteria || !criteria.phases[phaseName]) {
    return { score: 100, details: [] };
  }

  const phase = criteria.phases[phaseName];
  const details = [];
  let totalScore = 0;
  let count = 0;

  for (const check of phase.angles) {
    const angle = getJointAngle(landmarks, check.joint);
    const mid = (check.min + check.max) / 2;
    const range = (check.max - check.min) / 2;
    const deviation = Math.abs(angle - mid);
    const pass = angle >= check.min && angle <= check.max;

    // 범위 안 = 100점, 범위 밖 = 거리에 비례해 감점
    let itemScore;
    if (pass) {
      itemScore = 100;
    } else {
      const overshoot = deviation - range;
      itemScore = Math.max(0, 100 - overshoot * 3);
    }

    details.push({
      joint: check.joint,
      side: check.side,
      angle: Math.round(angle * 10) / 10,
      min: check.min,
      max: check.max,
      pass,
      score: Math.round(itemScore),
    });

    totalScore += itemScore;
    count++;
  }

  return {
    score: count > 0 ? Math.round(totalScore / count) : 100,
    details,
  };
}

/**
 * 오류 감지 — 활성화된 에러 목록 반환
 * @param {string} exerciseId
 * @param {Array} landmarks
 * @param {Array|null} prevLandmarks — 이전 프레임 (velocity 체크용)
 * @returns {Array<{id, label, severity, correctionIndex}>}
 */
export function detectErrors(exerciseId, landmarks, prevLandmarks = null) {
  const criteria = POSE_CRITERIA[exerciseId];
  if (!criteria) return [];

  const currentPhase = detectPhase(exerciseId, landmarks);
  const detected = [];

  for (const error of criteria.errors) {
    let triggered = false;

    // 페이즈 제한 체크
    if (error.condition.phase && error.condition.phase !== currentPhase) {
      continue;
    }

    switch (error.check) {
      case "angle": {
        if (error.condition.joint) {
          const angle = getJointAngle(landmarks, error.condition.joint);
          if (error.condition.min !== undefined && angle > error.condition.min) triggered = true;
          if (error.condition.max !== undefined && angle < error.condition.max) triggered = true;
        }
        break;
      }
      case "alignment": {
        if (error.condition.type === "kneeVsAnkleWidth") {
          const kneeWidth = Math.abs(
            landmarks[LM.LEFT_KNEE].x - landmarks[LM.RIGHT_KNEE].x
          );
          const ankleWidth = Math.abs(
            landmarks[LM.LEFT_ANKLE].x - landmarks[LM.RIGHT_ANKLE].x
          );
          if (ankleWidth > 0.001 && kneeWidth / ankleWidth < error.condition.ratio) {
            triggered = true;
          }
        } else if (error.condition.type === "vertical" && error.condition.p1 !== undefined) {
          const dev = verticalAlignment(landmarks, error.condition.p1, error.condition.p2);
          if (dev > error.condition.maxDeviation) triggered = true;
        } else if (error.condition.type === "horizontal") {
          const dev = horizontalAlignment(landmarks, error.condition.p1, error.condition.p2);
          if (dev > error.condition.maxDeviation) triggered = true;
        } else if (error.condition.type === "shoulderForwardOfHip") {
          const shoulderX = (landmarks[LM.LEFT_SHOULDER].x + landmarks[LM.RIGHT_SHOULDER].x) / 2;
          const hipX = (landmarks[LM.LEFT_HIP].x + landmarks[LM.RIGHT_HIP].x) / 2;
          const shoulderWidth = Math.abs(
            landmarks[LM.LEFT_SHOULDER].x - landmarks[LM.RIGHT_SHOULDER].x
          );
          if (shoulderWidth > 0.001) {
            const ratio = Math.abs(shoulderX - hipX) / shoulderWidth;
            if (ratio > error.condition.maxRatio) triggered = true;
          }
        } else if (error.condition.type === "shoulderNearEar") {
          const dist = Math.abs(
            landmarks[error.condition.p1].y - landmarks[error.condition.p2].y
          );
          const shoulderWidth = Math.abs(
            landmarks[LM.LEFT_SHOULDER].x - landmarks[LM.RIGHT_SHOULDER].x
          );
          if (shoulderWidth > 0.001 && dist / shoulderWidth < error.condition.maxDistance) {
            triggered = true;
          }
        } else if (error.condition.type === "elbowBelowWrist") {
          // y 좌표: 아래로 갈수록 큰 값 (화면 좌표계)
          if (landmarks[error.condition.p1].y > landmarks[error.condition.p2].y) {
            triggered = true;
          }
        }
        break;
      }
      case "velocity": {
        if (prevLandmarks) {
          if (error.condition.type === "torsoSway") {
            const prevMidX = (prevLandmarks[LM.LEFT_SHOULDER].x + prevLandmarks[LM.RIGHT_SHOULDER].x) / 2;
            const currMidX = (landmarks[LM.LEFT_SHOULDER].x + landmarks[LM.RIGHT_SHOULDER].x) / 2;
            if (Math.abs(currMidX - prevMidX) > error.condition.maxVelocity) {
              triggered = true;
            }
          } else if (error.condition.type === "hipVsShoulderRise") {
            const hipRise = prevLandmarks[LM.LEFT_HIP].y - landmarks[LM.LEFT_HIP].y;
            const shoulderRise = prevLandmarks[LM.LEFT_SHOULDER].y - landmarks[LM.LEFT_SHOULDER].y;
            if (shoulderRise > 0.001 && hipRise / shoulderRise > error.condition.ratio) {
              triggered = true;
            }
          } else if (error.condition.type === "hipSway" || error.condition.type === "ankleSway") {
            const idx = error.condition.p1 || LM.LEFT_HIP;
            const dx = Math.abs(landmarks[idx].x - prevLandmarks[idx].x);
            if (dx > error.condition.maxVelocity) triggered = true;
          }
        }
        break;
      }
    }

    if (triggered) {
      detected.push({
        id: error.id,
        label: error.label,
        severity: error.severity,
        correctionIndex: error.correctionIndex,
      });
    }
  }

  return detected;
}

/**
 * 종합 자세 평가 (0~100점 + 올바른 자세 여부)
 * @param {string} exerciseId
 * @param {Array} landmarks
 * @param {Array|null} prevLandmarks
 * @returns {{
 *   score: number,
 *   isCorrectForm: boolean,
 *   phase: string,
 *   angleDetails: Array,
 *   errors: Array,
 * }}
 */
export function evaluatePose(exerciseId, landmarks, prevLandmarks = null) {
  const phase = detectPhase(exerciseId, landmarks);
  const { score: angleScore, details: angleDetails } = scorePhaseAngles(
    exerciseId,
    phase,
    landmarks
  );
  const errors = detectErrors(exerciseId, landmarks, prevLandmarks);

  // 에러 감점: warning -10, error -20
  let errorPenalty = 0;
  for (const err of errors) {
    errorPenalty += err.severity === "error" ? 20 : 10;
  }

  const finalScore = Math.max(0, Math.min(100, angleScore - errorPenalty));
  const isCorrectForm = finalScore >= THRESHOLDS.SCORE_PASS && errors.filter(e => e.severity === "error").length === 0;

  return {
    score: finalScore,
    isCorrectForm,
    phase,
    angleDetails,
    errors,
  };
}

export default POSE_CRITERIA;
