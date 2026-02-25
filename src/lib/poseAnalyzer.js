/**
 * T0.7 자세 분석 전문가 — poseAnalyzer.js
 * 운동별 관절 각도 기준 + 판별 알고리즘
 * 80점 이상: 올바른 자세 (파란색)
 * 60~79점: 주의 (주황색)
 * 60점 미만: 잘못된 자세 (빨간색)
 * wrongMuscles 배열 반환
 */

// ── 각도 계산 유틸 ────────────────────────────────────────

export function calculateAngle(a, b, c) {
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

// ── 관절 → 근육 매핑 (실패한 관절 → 잘못된 근육) ────────

const JOINT_MUSCLE_MAP = {
  knee:            ["quadriceps", "hamstrings"],
  frontKnee:       ["quadriceps"],
  hip:             ["glutes", "hamstrings", "core"],
  elbow:           ["biceps", "triceps"],
  shoulder:        ["shoulders"],
  torsoAngle:      ["core", "lowerBack"],
  kneeSymmetry:    ["quadriceps", "hamstrings"],
  elbowSymmetry:   ["biceps", "triceps"],
  kneeOverToe:     ["quadriceps", "calves"],
  wristAlign:      ["forearms"],
  lockout:         ["quadriceps"],
  ankle:           ["calves"],
  elbowAsymmetry:  ["biceps", "triceps"],
};

// ── 운동별 자세 평가 기준 ─────────────────────────────────

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
  cableFly: [
    { joint: "elbow", idealRange: [130, 170], weight: 0.3, label: "팔꿈치 각도" },
    { joint: "shoulder", idealRange: [60, 110], weight: 0.3, label: "어깨 벌림" },
    { joint: "elbowSymmetry", idealRange: [0, 8], weight: 0.2, label: "좌우 대칭" },
    { joint: "torsoAngle", idealRange: [0, 20], weight: 0.2, label: "상체 수직" },
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
  barbellRow: [
    { joint: "elbow", idealRange: [70, 110], weight: 0.25, label: "팔꿈치 각도" },
    { joint: "hip", idealRange: [80, 120], weight: 0.25, label: "힙 힌지" },
    { joint: "torsoAngle", idealRange: [30, 60], weight: 0.25, label: "상체 기울기" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.25, label: "좌우 대칭" },
  ],

  // ── 어깨 ──
  shoulderPress: [
    { joint: "elbow", idealRange: [140, 180], weight: 0.3, label: "팔꿈치 신전" },
    { joint: "shoulder", idealRange: [150, 180], weight: 0.3, label: "오버헤드 정렬" },
    { joint: "torsoAngle", idealRange: [0, 10], weight: 0.2, label: "상체 수직" },
    { joint: "elbowSymmetry", idealRange: [0, 8], weight: 0.2, label: "좌우 대칭" },
  ],
  lateralRaise: [
    { joint: "shoulder", idealRange: [70, 100], weight: 0.35, label: "어깨 벌림" },
    { joint: "elbow", idealRange: [150, 180], weight: 0.25, label: "팔 신전" },
    { joint: "torsoAngle", idealRange: [0, 10], weight: 0.2, label: "상체 수직" },
    { joint: "elbowSymmetry", idealRange: [0, 8], weight: 0.2, label: "좌우 대칭" },
  ],

  // ── 팔 ──
  bicepCurl: [
    { joint: "elbow", idealRange: [30, 60], weight: 0.35, label: "팔꿈치 굴곡" },
    { joint: "shoulder", idealRange: [0, 20], weight: 0.25, label: "팔꿈치 고정" },
    { joint: "torsoAngle", idealRange: [0, 10], weight: 0.2, label: "상체 수직" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.2, label: "좌우 대칭" },
  ],
  tricepPushdown: [
    { joint: "elbow", idealRange: [150, 180], weight: 0.4, label: "팔꿈치 신전" },
    { joint: "shoulder", idealRange: [0, 20], weight: 0.25, label: "팔꿈치 고정" },
    { joint: "torsoAngle", idealRange: [0, 15], weight: 0.2, label: "상체 수직" },
    { joint: "elbowSymmetry", idealRange: [0, 10], weight: 0.15, label: "좌우 대칭" },
  ],

  // ── 코어 ──
  plank: [
    { joint: "hip", idealRange: [160, 180], weight: 0.35, label: "몸통 일직선" },
    { joint: "shoulder", idealRange: [80, 100], weight: 0.25, label: "어깨 정렬" },
    { joint: "knee", idealRange: [160, 180], weight: 0.2, label: "무릎 신전" },
    { joint: "torsoAngle", idealRange: [60, 90], weight: 0.2, label: "수평 유지" },
  ],

  // ── 전신 ──
  deadlift: [
    { joint: "hip", idealRange: [80, 130], weight: 0.25, label: "힙 힌지" },
    { joint: "knee", idealRange: [130, 170], weight: 0.2, label: "무릎 각도" },
    { joint: "torsoAngle", idealRange: [30, 55], weight: 0.25, label: "상체 기울기" },
    { joint: "elbow", idealRange: [160, 180], weight: 0.15, label: "팔 신전" },
    { joint: "kneeSymmetry", idealRange: [0, 8], weight: 0.15, label: "좌우 대칭" },
  ],
};

// ── 랜드마크에서 관절 값 추출 ─────────────────────────────

export function extractJointValues(landmarks) {
  if (!landmarks || landmarks.length < 29) return null;

  const lm = landmarks;
  const ls = lm[11], rs = lm[12];
  const le = lm[13], re = lm[14];
  const lw = lm[15], rw = lm[16];
  const lh = lm[23], rh = lm[24];
  const lk = lm[25], rk = lm[26];
  const la = lm[27], ra = lm[28];

  const kneeL = calculateAngle(lh, lk, la);
  const kneeR = calculateAngle(rh, rk, ra);
  const hipL = calculateAngle(ls, lh, lk);
  const hipR = calculateAngle(rs, rh, rk);
  const elbowL = calculateAngle(ls, le, lw);
  const elbowR = calculateAngle(rs, re, rw);
  const shoulderL = calculateAngle(le, ls, lh);
  const shoulderR = calculateAngle(re, rs, rh);

  const sMid = mid(ls, rs);
  const hMid = mid(lh, rh);
  const torsoDx = hMid.x - sMid.x;
  const torsoDy = hMid.y - sMid.y;
  const torsoAngle = Math.abs(Math.atan2(torsoDx, torsoDy) * 180 / Math.PI);

  const kneeOverToeL = Math.max(0, (lk.x - la.x) / Math.abs(lh.x - la.x || 0.01));
  const kneeOverToeR = Math.max(0, (ra.x - rk.x) / Math.abs(rh.x - ra.x || 0.01));
  const kneeOverToe = avg(Math.min(1, kneeOverToeL), Math.min(1, kneeOverToeR));

  const lockout = avg(kneeL, kneeR) > 175 ? 0 : 1;

  const ankleL = calculateAngle(lk, la, { x: la.x, y: la.y + 0.1 });
  const ankleR = calculateAngle(rk, ra, { x: ra.x, y: ra.y + 0.1 });

  return {
    knee: avg(kneeL, kneeR),
    frontKnee: Math.min(kneeL, kneeR),
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

// ── 메인 분석 함수 ────────────────────────────────────────

/**
 * analyzePose — 운동별 자세 분석
 * @param {Array} landmarks - MediaPipe 랜드마크 (33개)
 * @param {string} exerciseKey - EXERCISE_DB 키
 * @param {object} exercise - EXERCISE_DB[exerciseKey] (primary/secondary 참조)
 * @returns {{
 *   score: number,
 *   status: 'correct'|'caution'|'wrong',
 *   wrongMuscles: string[],
 *   corrections: string[],
 *   feedback: string,
 *   details: Array<{label:string, score:number, pass:boolean}>,
 *   muscleStates: object
 * }}
 */
export function analyzePose(landmarks, exerciseKey, exercise) {
  const joints = extractJointValues(landmarks);
  if (!joints) {
    return {
      score: 50,
      status: "caution",
      wrongMuscles: [],
      corrections: ["포즈 감지 불충분"],
      feedback: "몸 전체가 보이도록 다시 촬영해보세요.",
      details: [],
      muscleStates: {},
    };
  }

  const criteria = POSE_CRITERIA[exerciseKey];
  if (!criteria) {
    return scoreGenericPose(joints, exercise);
  }

  let totalScore = 0;
  let totalWeight = 0;
  const corrections = [];
  const details = [];
  const wrongMuscleSet = new Set();

  for (const c of criteria) {
    const value = joints[c.joint];
    if (value === undefined || value === null) continue;

    const [min, max] = c.idealRange;
    let itemScore;

    if (value >= min && value <= max) {
      itemScore = 100;
    } else {
      const deviation = value < min ? min - value : value - max;
      const range = max - min || 1;
      itemScore = Math.max(0, 100 - (deviation / (range * 0.5)) * 100);
    }

    totalScore += itemScore * c.weight;
    totalWeight += c.weight;

    const pass = itemScore >= 70;
    details.push({ label: c.label, score: Math.round(itemScore), pass });

    if (!pass) {
      corrections.push(c.label);
      // 관절 실패 → 관련 근육을 wrongMuscles에 추가
      const relatedMuscles = JOINT_MUSCLE_MAP[c.joint] || [];
      relatedMuscles.forEach((m) => wrongMuscleSet.add(m));
    }
  }

  const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;
  const score = Math.max(0, Math.min(100, finalScore));

  // 운동의 primary/secondary 근육과 교차 → 실제 관련 근육만
  const exerciseMuscles = new Set();
  if (exercise) {
    const primary = typeof exercise.primary === "object" && !Array.isArray(exercise.primary)
      ? Object.keys(exercise.primary)
      : (exercise.primary || []);
    const secondary = typeof exercise.secondary === "object" && !Array.isArray(exercise.secondary)
      ? Object.keys(exercise.secondary)
      : (exercise.secondary || []);
    [...primary, ...secondary].forEach((m) => exerciseMuscles.add(m));
  }

  const wrongMuscles = [...wrongMuscleSet].filter(
    (m) => exerciseMuscles.size === 0 || exerciseMuscles.has(m)
  );

  // status 결정
  let status = "correct";
  if (score < 60) status = "wrong";
  else if (score < 80) status = "caution";

  // feedback 메시지
  let feedback = "";
  if (score >= 90) feedback = "완벽한 자세입니다! 이대로 유지하세요.";
  else if (score >= 80) feedback = "좋은 자세입니다. 세부 조정으로 더 완벽해질 수 있어요.";
  else if (score >= 60) feedback = "자세 교정이 필요합니다. 아래 포인트를 확인하세요.";
  else feedback = "자세를 크게 수정해야 합니다. 트레이너에게 확인받으세요.";

  // muscleStates 생성 (렌더러용)
  const muscleStates = {};
  if (exercise) {
    const allMuscleKeys = exerciseMuscles.size > 0
      ? [...exerciseMuscles]
      : [...wrongMuscleSet];
    allMuscleKeys.forEach((m) => {
      muscleStates[m] = {
        status: wrongMuscles.includes(m) ? "wrong" : "correct",
      };
    });
  }

  return { score, status, wrongMuscles, corrections, feedback, details, muscleStates };
}

// ── 기준 없는 운동 기본 분석 ──────────────────────────────

function scoreGenericPose(joints, exercise) {
  let score = 70;
  const corrections = [];
  const details = [];
  const wrongMuscles = [];

  if (joints.kneeSymmetry > 15) {
    score -= 10;
    corrections.push("좌우 대칭");
    details.push({ label: "좌우 대칭", score: 50, pass: false });
  } else {
    details.push({ label: "좌우 대칭", score: 90, pass: true });
  }

  if (joints.torsoAngle > 45) {
    score -= 5;
    corrections.push("상체 안정");
    details.push({ label: "상체 안정", score: 60, pass: false });
  } else {
    details.push({ label: "상체 안정", score: 85, pass: true });
  }

  score = Math.max(0, Math.min(100, score));
  const status = score >= 80 ? "correct" : score >= 60 ? "caution" : "wrong";

  return {
    score,
    status,
    wrongMuscles,
    corrections,
    feedback: status === "correct" ? "기본 자세가 안정적입니다." : "자세 안정성을 확인해보세요.",
    details,
    muscleStates: {},
  };
}

// ── 점수 컬러 유틸 ────────────────────────────────────────

export function getScoreColor(score) {
  if (score >= 80) return "#0088FF";
  if (score >= 60) return "#FF8C00";
  return "#FF2D2D";
}

export function getStatusLabel(status) {
  if (status === "correct") return "올바른 자세";
  if (status === "caution") return "주의";
  return "교정 필요";
}
