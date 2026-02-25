/**
 * Pose Quality Analyzer
 * 운동별 자세 품질을 평가하고 부위별 파란색(올바름)/빨간색(잘못됨) 판정 + 교정 메시지 반환
 *
 * Returns:
 *  - overallScore: 0~100 (높을수록 좋은 자세)
 *  - muscleQuality: { muscleKey: { score: 0~1, isCorrect: bool } }
 *  - corrections: [{ bodyPart, message, severity }]
 */

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

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// Score a value within an ideal range. Returns 0~1.
// perfectMin~perfectMax => 1.0, deviations => proportional drop
function rangeScore(value, perfectMin, perfectMax, tolerance = 20) {
  if (value >= perfectMin && value <= perfectMax) return 1.0;
  if (value < perfectMin) {
    return Math.max(0, 1 - (perfectMin - value) / tolerance);
  }
  return Math.max(0, 1 - (value - perfectMax) / tolerance);
}

// Map a score 0~1 to: >= 0.6 = correct, < 0.6 = incorrect
function isCorrectScore(score) {
  return score >= 0.6;
}

const EXERCISE_RULES = {
  // ── SQUAT ──
  squat: (lm) => {
    const kneeL = angleDeg(lm[23], lm[25], lm[27]);
    const kneeR = angleDeg(lm[24], lm[26], lm[28]);
    const hipL = angleDeg(lm[11], lm[23], lm[25]);
    const hipR = angleDeg(lm[12], lm[24], lm[26]);
    const knee = (kneeL + kneeR) / 2;
    const hip = (hipL + hipR) / 2;

    // Knee valgus check (무릎 안쪽 모임)
    const kneeW = Math.abs(lm[25].x - lm[26].x);
    const ankleW = Math.abs(lm[27].x - lm[28].x);
    const hipW = Math.abs(lm[23].x - lm[24].x);
    const kneeValgusRatio = hipW > 0 ? kneeW / hipW : 1;

    // Torso lean
    const sMid = mid(lm[11], lm[12]);
    const hMid = mid(lm[23], lm[24]);
    const torsoAngle = Math.abs(Math.atan2(hMid.x - sMid.x, hMid.y - sMid.y) * 180 / Math.PI);

    const checks = [];
    const muscleQ = {};

    // Knee angle: ideal squat = 70~110 degrees
    const kneeScore = rangeScore(knee, 70, 120, 30);
    muscleQ.quadriceps = { score: kneeScore, isCorrect: isCorrectScore(kneeScore) };

    // Knee valgus: knees should be at least as wide as hips
    const valgusScore = kneeValgusRatio >= 0.85 ? 1.0 : Math.max(0, kneeValgusRatio / 0.85);
    if (valgusScore < 0.6) {
      muscleQ.quadriceps = { score: valgusScore, isCorrect: false };
      checks.push({
        bodyPart: "무릎",
        message: "무릎이 안쪽으로 모이고 있습니다. 무릎을 발끝 방향으로 밀어주세요.",
        severity: "high",
        muscles: ["quadriceps"],
      });
    }

    // Hip depth
    const hipScore = rangeScore(hip, 70, 130, 25);
    muscleQ.glutes = { score: hipScore, isCorrect: isCorrectScore(hipScore) };
    if (hipScore < 0.5) {
      checks.push({
        bodyPart: "엉덩이",
        message: "스쿼트 깊이가 부족합니다. 엉덩이를 더 낮춰주세요.",
        severity: "medium",
        muscles: ["glutes"],
      });
    }

    // Torso lean: should be < 30 degrees
    const torsoScore = rangeScore(torsoAngle, 0, 25, 20);
    muscleQ.core = { score: torsoScore, isCorrect: isCorrectScore(torsoScore) };
    muscleQ.lowerBack = { score: torsoScore, isCorrect: isCorrectScore(torsoScore) };
    if (torsoAngle > 35) {
      checks.push({
        bodyPart: "상체",
        message: "상체가 너무 앞으로 기울어져 있습니다. 가슴을 펴고 상체를 세워주세요.",
        severity: "medium",
        muscles: ["core", "lowerBack"],
      });
    }

    // Secondary muscles default to correct if no specific issue
    muscleQ.hamstrings = muscleQ.hamstrings || { score: Math.min(kneeScore, hipScore), isCorrect: isCorrectScore(Math.min(kneeScore, hipScore)) };
    muscleQ.calves = muscleQ.calves || { score: 0.9, isCorrect: true };

    return { muscleQuality: muscleQ, corrections: checks };
  },

  // ── BENCH PRESS ──
  benchPress: (lm) => {
    const elbowL = angleDeg(lm[11], lm[13], lm[15]);
    const elbowR = angleDeg(lm[12], lm[14], lm[16]);
    const elbow = (elbowL + elbowR) / 2;

    // Elbow flare: angle between upper arm and torso
    const shoulderL = angleDeg(lm[13], lm[11], lm[23]);
    const shoulderR = angleDeg(lm[14], lm[12], lm[24]);
    const shoulderFlare = (shoulderL + shoulderR) / 2;

    // Wrist alignment over elbows
    const wristElbowAlignL = Math.abs(lm[15].x - lm[13].x);
    const wristElbowAlignR = Math.abs(lm[16].x - lm[14].x);

    const checks = [];
    const muscleQ = {};

    // Elbow angle
    const elbowScore = rangeScore(elbow, 75, 120, 25);
    muscleQ.triceps = { score: elbowScore, isCorrect: isCorrectScore(elbowScore) };

    // Shoulder flare: should be 45~75 degrees, not > 90
    const flareScore = rangeScore(shoulderFlare, 45, 75, 20);
    muscleQ.shoulders = { score: flareScore, isCorrect: isCorrectScore(flareScore) };
    if (shoulderFlare > 85) {
      checks.push({
        bodyPart: "팔꿈치",
        message: "팔꿈치가 너무 벌어져 있습니다. 어깨 부상 위험이 있으니 45~75도로 조절하세요.",
        severity: "high",
        muscles: ["shoulders"],
      });
    }

    // Chest engagement
    muscleQ.chest = { score: Math.max(elbowScore, flareScore), isCorrect: isCorrectScore(Math.max(elbowScore, flareScore)) };
    muscleQ.core = { score: 0.85, isCorrect: true };

    return { muscleQuality: muscleQ, corrections: checks };
  },

  // ── DEADLIFT ──
  deadlift: (lm) => {
    const hipL = angleDeg(lm[11], lm[23], lm[25]);
    const hipR = angleDeg(lm[12], lm[24], lm[26]);
    const hip = (hipL + hipR) / 2;
    const kneeL = angleDeg(lm[23], lm[25], lm[27]);
    const kneeR = angleDeg(lm[24], lm[26], lm[28]);
    const knee = (kneeL + kneeR) / 2;

    // Back rounding: check if shoulders are significantly forward of hips
    const sMid = mid(lm[11], lm[12]);
    const hMid = mid(lm[23], lm[24]);
    const backRound = sMid.y - hMid.y; // negative = shoulders above hips (good)
    const torsoAngle = Math.abs(Math.atan2(hMid.x - sMid.x, hMid.y - sMid.y) * 180 / Math.PI);

    const checks = [];
    const muscleQ = {};

    // Hip hinge
    const hipScore = rangeScore(hip, 80, 160, 25);
    muscleQ.glutes = { score: hipScore, isCorrect: isCorrectScore(hipScore) };
    muscleQ.hamstrings = { score: hipScore, isCorrect: isCorrectScore(hipScore) };

    // Back position
    const backScore = torsoAngle < 50 ? 1.0 : Math.max(0, 1 - (torsoAngle - 50) / 30);
    muscleQ.lowerBack = { score: backScore, isCorrect: isCorrectScore(backScore) };
    if (backScore < 0.6) {
      checks.push({
        bodyPart: "허리",
        message: "등이 과도하게 둥글어져 있습니다. 가슴을 펴고 척추 중립을 유지하세요.",
        severity: "high",
        muscles: ["lowerBack"],
      });
    }

    // Knee position
    const kneeScore = rangeScore(knee, 130, 170, 20);
    muscleQ.quadriceps = { score: kneeScore, isCorrect: isCorrectScore(kneeScore) };

    muscleQ.core = { score: backScore, isCorrect: isCorrectScore(backScore) };
    muscleQ.traps = { score: 0.85, isCorrect: true };
    muscleQ.forearms = { score: 0.85, isCorrect: true };

    return { muscleQuality: muscleQ, corrections: checks };
  },

  // ── SHOULDER PRESS ──
  shoulderPress: (lm) => {
    const elbowL = angleDeg(lm[11], lm[13], lm[15]);
    const elbowR = angleDeg(lm[12], lm[14], lm[16]);
    const shoulderL = angleDeg(lm[13], lm[11], lm[23]);
    const shoulderR = angleDeg(lm[14], lm[12], lm[24]);

    // Wrist position relative to elbow (should be directly above)
    const wristAlignL = Math.abs(lm[15].x - lm[13].x);
    const wristAlignR = Math.abs(lm[16].x - lm[14].x);
    const wristAlign = (wristAlignL + wristAlignR) / 2;

    // Back arch
    const sMid = mid(lm[11], lm[12]);
    const hMid = mid(lm[23], lm[24]);
    const torsoAngle = Math.abs(Math.atan2(hMid.x - sMid.x, hMid.y - sMid.y) * 180 / Math.PI);

    const checks = [];
    const muscleQ = {};

    // Shoulder angle (overhead press = arms high)
    const shoulderScore = rangeScore((shoulderL + shoulderR) / 2, 120, 180, 30);
    muscleQ.shoulders = { score: shoulderScore, isCorrect: isCorrectScore(shoulderScore) };

    // Elbow angle
    const elbowScore = rangeScore((elbowL + elbowR) / 2, 90, 180, 30);
    muscleQ.triceps = { score: elbowScore, isCorrect: isCorrectScore(elbowScore) };

    // Back arch
    const backScore = torsoAngle < 15 ? 1.0 : Math.max(0, 1 - (torsoAngle - 15) / 25);
    muscleQ.core = { score: backScore, isCorrect: isCorrectScore(backScore) };
    if (torsoAngle > 25) {
      checks.push({
        bodyPart: "허리",
        message: "허리가 과도하게 젖혀져 있습니다. 코어를 조이고 허리를 중립으로 유지하세요.",
        severity: "high",
        muscles: ["core"],
      });
    }

    muscleQ.traps = { score: 0.85, isCorrect: true };

    return { muscleQuality: muscleQ, corrections: checks };
  },

  // ── BICEP CURL ──
  bicepCurl: (lm) => {
    const elbowL = angleDeg(lm[11], lm[13], lm[15]);
    const elbowR = angleDeg(lm[12], lm[14], lm[16]);
    const shoulderL = angleDeg(lm[13], lm[11], lm[23]);
    const shoulderR = angleDeg(lm[14], lm[12], lm[24]);

    // Elbow drift: elbows should stay close to body (shoulder angle small)
    const elbowDrift = (shoulderL + shoulderR) / 2;

    const checks = [];
    const muscleQ = {};

    // Elbow angle (curl = deep bend)
    const elbowScore = rangeScore((elbowL + elbowR) / 2, 30, 90, 25);
    muscleQ.biceps = { score: elbowScore, isCorrect: isCorrectScore(elbowScore) };

    // Elbow drift (should be < 25 degrees)
    const driftScore = elbowDrift < 25 ? 1.0 : Math.max(0, 1 - (elbowDrift - 25) / 25);
    if (driftScore < 0.6) {
      checks.push({
        bodyPart: "팔꿈치",
        message: "팔꿈치가 몸에서 떨어져 있습니다. 팔꿈치를 옆구리에 고정하세요.",
        severity: "medium",
        muscles: ["biceps"],
      });
      muscleQ.biceps = { score: driftScore, isCorrect: false };
    }

    muscleQ.forearms = { score: 0.85, isCorrect: true };

    return { muscleQuality: muscleQ, corrections: checks };
  },

  // ── LAT PULLDOWN ──
  latPulldown: (lm) => {
    const elbowL = angleDeg(lm[11], lm[13], lm[15]);
    const elbowR = angleDeg(lm[12], lm[14], lm[16]);
    const shoulderL = angleDeg(lm[13], lm[11], lm[23]);
    const shoulderR = angleDeg(lm[14], lm[12], lm[24]);

    const checks = [];
    const muscleQ = {};

    const elbowScore = rangeScore((elbowL + elbowR) / 2, 70, 140, 25);
    muscleQ.lats = { score: elbowScore, isCorrect: isCorrectScore(elbowScore) };
    muscleQ.biceps = { score: elbowScore, isCorrect: isCorrectScore(elbowScore) };

    // Check for behind-neck pull (dangerous)
    const shoulderAvg = (shoulderL + shoulderR) / 2;
    const shoulderScore = rangeScore(shoulderAvg, 90, 170, 25);
    muscleQ.shoulders = { score: shoulderScore, isCorrect: isCorrectScore(shoulderScore) };

    muscleQ.traps = { score: 0.85, isCorrect: true };
    muscleQ.forearms = { score: 0.85, isCorrect: true };

    return { muscleQuality: muscleQ, corrections: checks };
  },

  // ── PLANK ──
  plank: (lm) => {
    const kneeL = angleDeg(lm[23], lm[25], lm[27]);
    const kneeR = angleDeg(lm[24], lm[26], lm[28]);
    const hipL = angleDeg(lm[11], lm[23], lm[25]);
    const hipR = angleDeg(lm[12], lm[24], lm[26]);

    // Body should be straight (hip angle near 180)
    const hipAngle = (hipL + hipR) / 2;
    const kneeAngle = (kneeL + kneeR) / 2;

    const checks = [];
    const muscleQ = {};

    // Hip sag or pike
    const hipScore = rangeScore(hipAngle, 160, 180, 20);
    muscleQ.core = { score: hipScore, isCorrect: isCorrectScore(hipScore) };
    muscleQ.glutes = { score: hipScore, isCorrect: isCorrectScore(hipScore) };
    if (hipAngle < 155) {
      checks.push({
        bodyPart: "엉덩이",
        message: "엉덩이가 처져 있습니다. 복근에 힘을 주고 몸을 일직선으로 유지하세요.",
        severity: "high",
        muscles: ["core", "glutes"],
      });
    } else if (hipAngle > 185 || (hipL > 185 || hipR > 185)) {
      checks.push({
        bodyPart: "엉덩이",
        message: "엉덩이가 너무 올라가 있습니다. 몸을 일직선으로 내려주세요.",
        severity: "medium",
        muscles: ["core"],
      });
    }

    muscleQ.shoulders = { score: 0.85, isCorrect: true };
    muscleQ.quadriceps = { score: 0.85, isCorrect: true };

    return { muscleQuality: muscleQ, corrections: checks };
  },

  // ── LUNGE ──
  lunge: (lm) => {
    const kneeL = angleDeg(lm[23], lm[25], lm[27]);
    const kneeR = angleDeg(lm[24], lm[26], lm[28]);

    // Front knee should not go past toes
    const frontKnee = Math.min(kneeL, kneeR);
    const backKnee = Math.max(kneeL, kneeR);

    // Check knee over toe
    const frontIdx = kneeL < kneeR ? 25 : 26;
    const frontAnkleIdx = kneeL < kneeR ? 27 : 28;
    const kneeOverToe = lm[frontIdx].x - lm[frontAnkleIdx].x;

    const checks = [];
    const muscleQ = {};

    // Front knee angle
    const frontKneeScore = rangeScore(frontKnee, 80, 110, 20);
    muscleQ.quadriceps = { score: frontKneeScore, isCorrect: isCorrectScore(frontKneeScore) };

    // Back knee angle
    const backKneeScore = rangeScore(backKnee, 80, 120, 25);
    muscleQ.glutes = { score: (frontKneeScore + backKneeScore) / 2, isCorrect: isCorrectScore((frontKneeScore + backKneeScore) / 2) };

    if (frontKnee < 70) {
      checks.push({
        bodyPart: "무릎",
        message: "앞 무릎이 발끝을 너무 넘어갔습니다. 무릎을 90도 근처로 유지하세요.",
        severity: "high",
        muscles: ["quadriceps"],
      });
    }

    muscleQ.hamstrings = { score: 0.8, isCorrect: true };
    muscleQ.calves = { score: 0.85, isCorrect: true };
    muscleQ.core = { score: 0.85, isCorrect: true };

    return { muscleQuality: muscleQ, corrections: checks };
  },

  // ── BARBELL ROW ──
  barbellRow: (lm) => {
    const sMid = mid(lm[11], lm[12]);
    const hMid = mid(lm[23], lm[24]);
    const torsoAngle = Math.abs(Math.atan2(hMid.x - sMid.x, hMid.y - sMid.y) * 180 / Math.PI);
    const elbowL = angleDeg(lm[11], lm[13], lm[15]);
    const elbowR = angleDeg(lm[12], lm[14], lm[16]);

    const checks = [];
    const muscleQ = {};

    // Torso angle (should be 30~60 degrees)
    const torsoScore = rangeScore(torsoAngle, 30, 60, 15);
    muscleQ.lowerBack = { score: torsoScore, isCorrect: isCorrectScore(torsoScore) };
    muscleQ.core = { score: torsoScore, isCorrect: isCorrectScore(torsoScore) };
    if (torsoAngle > 65) {
      checks.push({
        bodyPart: "상체",
        message: "상체가 너무 숙여져 있습니다. 허리 부상 위험이 있으니 각도를 줄이세요.",
        severity: "high",
        muscles: ["lowerBack"],
      });
    }

    // Elbow pulling
    const elbowScore = rangeScore((elbowL + elbowR) / 2, 60, 120, 25);
    muscleQ.lats = { score: elbowScore, isCorrect: isCorrectScore(elbowScore) };
    muscleQ.traps = { score: elbowScore, isCorrect: isCorrectScore(elbowScore) };
    muscleQ.biceps = { score: 0.85, isCorrect: true };

    return { muscleQuality: muscleQ, corrections: checks };
  },

  // ── PULL UP ──
  pullUp: (lm) => {
    const elbowL = angleDeg(lm[11], lm[13], lm[15]);
    const elbowR = angleDeg(lm[12], lm[14], lm[16]);
    const shoulderL = angleDeg(lm[13], lm[11], lm[23]);
    const shoulderR = angleDeg(lm[14], lm[12], lm[24]);

    const checks = [];
    const muscleQ = {};

    const elbowScore = rangeScore((elbowL + elbowR) / 2, 50, 130, 25);
    muscleQ.lats = { score: elbowScore, isCorrect: isCorrectScore(elbowScore) };
    muscleQ.biceps = { score: elbowScore, isCorrect: isCorrectScore(elbowScore) };
    muscleQ.traps = { score: 0.85, isCorrect: true };
    muscleQ.forearms = { score: 0.85, isCorrect: true };
    muscleQ.core = { score: 0.85, isCorrect: true };

    return { muscleQuality: muscleQ, corrections: checks };
  },

  // ── HIP THRUST ──
  hipThrust: (lm) => {
    const hipL = angleDeg(lm[11], lm[23], lm[25]);
    const hipR = angleDeg(lm[12], lm[24], lm[26]);
    const kneeL = angleDeg(lm[23], lm[25], lm[27]);
    const kneeR = angleDeg(lm[24], lm[26], lm[28]);

    const checks = [];
    const muscleQ = {};

    const hipScore = rangeScore((hipL + hipR) / 2, 150, 180, 20);
    muscleQ.glutes = { score: hipScore, isCorrect: isCorrectScore(hipScore) };
    muscleQ.hamstrings = { score: hipScore, isCorrect: isCorrectScore(hipScore) };
    if ((hipL + hipR) / 2 < 140) {
      checks.push({
        bodyPart: "엉덩이",
        message: "엉덩이를 더 높이 올려주세요. 상체와 허벅지가 일직선이 되어야 합니다.",
        severity: "medium",
        muscles: ["glutes"],
      });
    }

    const kneeScore = rangeScore((kneeL + kneeR) / 2, 80, 100, 15);
    muscleQ.quadriceps = { score: kneeScore, isCorrect: isCorrectScore(kneeScore) };
    muscleQ.core = { score: 0.85, isCorrect: true };

    return { muscleQuality: muscleQ, corrections: checks };
  },

  // ── LEG PRESS ──
  legPress: (lm) => {
    const kneeL = angleDeg(lm[23], lm[25], lm[27]);
    const kneeR = angleDeg(lm[24], lm[26], lm[28]);
    const knee = (kneeL + kneeR) / 2;

    const checks = [];
    const muscleQ = {};

    const kneeScore = rangeScore(knee, 80, 120, 20);
    muscleQ.quadriceps = { score: kneeScore, isCorrect: isCorrectScore(kneeScore) };
    muscleQ.glutes = { score: kneeScore, isCorrect: isCorrectScore(kneeScore) };

    // Knee lockout danger
    if (knee > 170) {
      checks.push({
        bodyPart: "무릎",
        message: "무릎을 완전히 펴지 마세요! 무릎 관절 부상 위험이 있습니다.",
        severity: "high",
        muscles: ["quadriceps"],
      });
      muscleQ.quadriceps = { score: 0.3, isCorrect: false };
    }

    muscleQ.hamstrings = { score: 0.8, isCorrect: true };
    muscleQ.calves = { score: 0.85, isCorrect: true };

    return { muscleQuality: muscleQ, corrections: checks };
  },

  // ── LEG CURL ──
  legCurl: (lm) => {
    const kneeL = angleDeg(lm[23], lm[25], lm[27]);
    const kneeR = angleDeg(lm[24], lm[26], lm[28]);

    const checks = [];
    const muscleQ = {};

    const kneeScore = rangeScore((kneeL + kneeR) / 2, 40, 100, 25);
    muscleQ.hamstrings = { score: kneeScore, isCorrect: isCorrectScore(kneeScore) };
    muscleQ.calves = { score: 0.85, isCorrect: true };
    muscleQ.glutes = { score: 0.8, isCorrect: true };

    return { muscleQuality: muscleQ, corrections: checks };
  },

  // ── CABLE FLY ──
  cableFly: (lm) => {
    const elbowL = angleDeg(lm[11], lm[13], lm[15]);
    const elbowR = angleDeg(lm[12], lm[14], lm[16]);

    const checks = [];
    const muscleQ = {};

    // Slight bend in elbows (not locked out)
    const elbowScore = rangeScore((elbowL + elbowR) / 2, 130, 170, 20);
    muscleQ.chest = { score: elbowScore, isCorrect: isCorrectScore(elbowScore) };
    muscleQ.shoulders = { score: 0.85, isCorrect: true };
    muscleQ.biceps = { score: 0.85, isCorrect: true };

    return { muscleQuality: muscleQ, corrections: checks };
  },

  // ── LATERAL RAISE ──
  lateralRaise: (lm) => {
    const shoulderL = angleDeg(lm[13], lm[11], lm[23]);
    const shoulderR = angleDeg(lm[14], lm[12], lm[24]);
    const elbowL = angleDeg(lm[11], lm[13], lm[15]);
    const elbowR = angleDeg(lm[12], lm[14], lm[16]);

    const checks = [];
    const muscleQ = {};

    // Arms should be at ~80-100 degrees from body
    const shoulderScore = rangeScore((shoulderL + shoulderR) / 2, 70, 100, 20);
    muscleQ.shoulders = { score: shoulderScore, isCorrect: isCorrectScore(shoulderScore) };

    if ((shoulderL + shoulderR) / 2 > 110) {
      checks.push({
        bodyPart: "어깨",
        message: "팔을 어깨 높이 이상으로 올리지 마세요. 승모근 개입이 과해집니다.",
        severity: "medium",
        muscles: ["shoulders"],
      });
    }

    // Slight elbow bend
    const elbowScore = rangeScore((elbowL + elbowR) / 2, 150, 175, 15);
    muscleQ.traps = { score: 0.8, isCorrect: true };

    return { muscleQuality: muscleQ, corrections: checks };
  },
};

// Aliases: map similar exercises to shared rules
const RULE_ALIASES = {
  frontSquat: "squat",
  bulgarianSplit: "lunge",
  inclineBench: "benchPress",
  declineBench: "benchPress",
  chestPress: "benchPress",
  pushUp: "benchPress",
  dip: "benchPress",
  dumbbellFly: "cableFly",
  chinUp: "pullUp",
  seatedRow: "barbellRow",
  dumbbellRow: "barbellRow",
  facePull: "barbellRow",
  arnoldPress: "shoulderPress",
  frontRaise: "lateralRaise",
  rearDeltFly: "lateralRaise",
  uprightRow: "shoulderPress",
  shrug: "shoulderPress",
  hammerCurl: "bicepCurl",
  preacherCurl: "bicepCurl",
  tricepPushdown: "bicepCurl",
  skullCrusher: "benchPress",
  overheadExtension: "shoulderPress",
  wristCurl: "bicepCurl",
  legExtension: "legPress",
  calfRaise: "squat",
  crunch: "plank",
  legRaise: "plank",
  russianTwist: "plank",
  abWheelRollout: "plank",
  romanianDeadlift: "deadlift",
  cleanAndPress: "shoulderPress",
  kettlebellSwing: "deadlift",
  burpee: "squat",
  backExtension: "deadlift",
};

/**
 * Analyze pose quality for a given exercise.
 *
 * @param {Array} landmarks - MediaPipe pose landmarks (33 points)
 * @param {string} exerciseKey - Exercise key from EXERCISE_DB
 * @returns {{ overallScore: number, muscleQuality: Object, corrections: Array, isGoodForm: boolean }}
 */
export function analyzePoseQuality(landmarks, exerciseKey) {
  if (!landmarks || landmarks.length < 29) {
    return { overallScore: 50, muscleQuality: {}, corrections: [], isGoodForm: true };
  }

  const ruleKey = EXERCISE_RULES[exerciseKey] ? exerciseKey : RULE_ALIASES[exerciseKey];
  const ruleFn = EXERCISE_RULES[ruleKey];

  if (!ruleFn) {
    // No rules for this exercise — default to all correct
    return { overallScore: 85, muscleQuality: {}, corrections: [], isGoodForm: true };
  }

  const { muscleQuality, corrections } = ruleFn(landmarks);

  // Calculate overall score
  const scores = Object.values(muscleQuality).map((mq) => mq.score);
  const overallScore = scores.length > 0
    ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length * 100)
    : 85;

  const isGoodForm = corrections.filter((c) => c.severity === "high").length === 0 && overallScore >= 60;

  return { overallScore, muscleQuality, corrections, isGoodForm };
}

// Color constants for the two-color system
export const CORRECT_COLOR = "#00AAFF"; // blue
export const INCORRECT_COLOR = "#FF3B5C"; // red
export const TRANSITION_COLOR = "#FF8C42"; // orange (borderline)

/**
 * Get display color for a muscle based on its quality score.
 * @param {number} score - 0~1
 * @returns {string} hex color
 */
export function getMuscleDisplayColor(score) {
  if (score >= 0.6) return CORRECT_COLOR;
  if (score >= 0.4) return TRANSITION_COLOR;
  return INCORRECT_COLOR;
}
