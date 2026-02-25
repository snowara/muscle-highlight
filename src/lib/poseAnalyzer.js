/**
 * poseAnalyzer.js — 자세 판별 엔진 (Pose Form Analysis Engine)
 *
 * MediaPipe BlazePose 33 landmark 데이터를 분석하여
 * 운동별 자세 정확도를 평가하고 교정 피드백을 제공한다.
 *
 * 좌표계: x,y 0~1 정규화. y=0 상단, y=1 하단.
 *
 * 핵심 export:
 *   analyzePose(landmarks, exerciseId) → FormResult
 *   analyzeVideoFrames(frames, exerciseId) → VideoResult
 *   angleDeg(a, b, c) → number
 */

import { EXERCISE_DB } from '../data/exercises';

// ════════════════════════════════════════════════════════════════
// 1. 유틸리티 함수
// ════════════════════════════════════════════════════════════════

/** 세 점 a-b-c에서 꼭짓점 b의 사이각(degree) */
export function angleDeg(a, b, c) {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const mag = Math.sqrt(ba.x ** 2 + ba.y ** 2) * Math.sqrt(bc.x ** 2 + bc.y ** 2);
  if (mag === 0) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function mid(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** 값이 [idealMin, idealMax] 범위 안이면 100, 벗어나면 tolerance에 비례해 감점 */
function scoreInRange(value, idealMin, idealMax, tolerance) {
  if (value >= idealMin && value <= idealMax) return 100;
  const dev = value < idealMin ? idealMin - value : value - idealMax;
  return Math.max(0, Math.round(100 - (dev / tolerance) * 100));
}

/** 값이 threshold 이하면 100, 초과 시 tolerance 비례 감점 */
function scoreBelow(value, threshold, tolerance) {
  if (value <= threshold) return 100;
  return Math.max(0, Math.round(100 - ((value - threshold) / tolerance) * 100));
}

/** 값이 threshold 이상이면 100, 미만 시 tolerance 비례 감점 */
function scoreAbove(value, threshold, tolerance) {
  if (value >= threshold) return 100;
  return Math.max(0, Math.round(100 - ((threshold - value) / tolerance) * 100));
}

// ════════════════════════════════════════════════════════════════
// 2. 랜드마크 추출 & 파생 각도 계산
// ════════════════════════════════════════════════════════════════

function extractKeyPoints(lm) {
  if (!lm || lm.length < 29) return null;
  const ls = lm[11], rs = lm[12];
  const le = lm[13], re = lm[14];
  const lw = lm[15], rw = lm[16];
  const lh = lm[23], rh = lm[24];
  const lk = lm[25], rk = lm[26];
  const la = lm[27], ra = lm[28];
  return {
    nose: lm[0],
    leftShoulder: ls, rightShoulder: rs, shoulderMid: mid(ls, rs),
    leftElbow: le, rightElbow: re,
    leftWrist: lw, rightWrist: rw, wristMid: mid(lw, rw),
    leftHip: lh, rightHip: rh, hipMid: mid(lh, rh),
    leftKnee: lk, rightKnee: rk, kneeMid: mid(lk, rk),
    leftAnkle: la, rightAnkle: ra, ankleMid: mid(la, ra),
  };
}

function computeAngles(kp) {
  const kneeL = angleDeg(kp.leftHip, kp.leftKnee, kp.leftAnkle);
  const kneeR = angleDeg(kp.rightHip, kp.rightKnee, kp.rightAnkle);
  const hipL = angleDeg(kp.leftShoulder, kp.leftHip, kp.leftKnee);
  const hipR = angleDeg(kp.rightShoulder, kp.rightHip, kp.rightKnee);
  const elbowL = angleDeg(kp.leftShoulder, kp.leftElbow, kp.leftWrist);
  const elbowR = angleDeg(kp.rightShoulder, kp.rightElbow, kp.rightWrist);
  const shoulderL = angleDeg(kp.leftElbow, kp.leftShoulder, kp.leftHip);
  const shoulderR = angleDeg(kp.rightElbow, kp.rightShoulder, kp.rightHip);

  const dx = kp.hipMid.x - kp.shoulderMid.x;
  const dy = kp.hipMid.y - kp.shoulderMid.y;
  const torsoFromVertical = Math.abs(Math.atan2(dx, dy) * 180 / Math.PI);

  const kneeGap = Math.abs(kp.leftKnee.x - kp.rightKnee.x);
  const ankleGap = Math.abs(kp.leftAnkle.x - kp.rightAnkle.x);
  const shoulderWidth = dist(kp.leftShoulder, kp.rightShoulder);
  const wristSpread = shoulderWidth > 0.001
    ? dist(kp.leftWrist, kp.rightWrist) / shoulderWidth : 1;

  return {
    kneeL, kneeR, kneeAvg: (kneeL + kneeR) / 2,
    hipL, hipR, hipAvg: (hipL + hipR) / 2,
    elbowL, elbowR, elbowAvg: (elbowL + elbowR) / 2,
    shoulderL, shoulderR, shoulderAvg: (shoulderL + shoulderR) / 2,
    torsoFromVertical,
    kneeGap, ankleGap, shoulderWidth, wristSpread,
  };
}

// ════════════════════════════════════════════════════════════════
// 3. 운동별 자세 판별 기준 (Form Criteria)
//    각 checkpoint: { id, label, weight, muscles[], evaluate(kp,a) → {score,message} }
//    weight 합계 = 100 per exercise
// ════════════════════════════════════════════════════════════════

const FORM_CRITERIA = {

  // ─── SQUAT ───
  squat: { checkpoints: [
    { id: 'kneeAngle', label: '무릎 각도 (깊이)', weight: 30,
      muscles: ['quadriceps', 'glutes'],
      evaluate: (_kp, a) => {
        const s = scoreInRange(a.kneeAvg, 70, 130, 40);
        return { score: s, message: s >= 70
          ? '적절한 스쿼트 깊이입니다.'
          : a.kneeAvg > 130
            ? `무릎 각도 ${Math.round(a.kneeAvg)}°— 깊이 부족. 엉덩이를 더 낮춰주세요.`
            : `무릎 각도 ${Math.round(a.kneeAvg)}°— 과도하게 깊습니다. 무릎 부담 주의.` };
      } },
    { id: 'kneeValgus', label: '무릎 정렬 (내반)', weight: 25,
      muscles: ['quadriceps'],
      evaluate: (_kp, a) => {
        if (a.ankleGap < 0.01) return { score: 80, message: '정면 기준 발목 간격 미확인.' };
        const ratio = a.kneeGap / a.ankleGap;
        const s = scoreAbove(ratio, 0.85, 0.35);
        return { score: s, message: s >= 70
          ? '무릎이 발끝 방향으로 잘 정렬되어 있습니다.'
          : '무릎이 안쪽으로 모이고 있습니다(Valgus). 무릎을 발끝 방향으로 밀어주세요.' };
      } },
    { id: 'torsoLean', label: '상체 기울기', weight: 25,
      muscles: ['lowerBack', 'core'],
      evaluate: (_kp, a) => {
        const s = scoreBelow(a.torsoFromVertical, 45, 25);
        return { score: s, message: s >= 70
          ? '상체 각도가 적절합니다.'
          : `상체가 ${Math.round(a.torsoFromVertical)}° 전경. 가슴을 펴고 상체를 세워주세요.` };
      } },
    { id: 'spineNeutral', label: '허리 정렬', weight: 20,
      muscles: ['lowerBack'],
      evaluate: (_kp, a) => {
        const s = scoreAbove(a.hipAvg, 70, 40);
        return { score: s, message: s >= 70
          ? '허리가 중립 위치를 유지하고 있습니다.'
          : '허리가 과도하게 굽었습니다(Butt Wink). 코어에 힘을 주세요.' };
      } },
  ]},

  // ─── FRONT SQUAT ───
  frontSquat: { checkpoints: [
    { id: 'kneeAngle', label: '무릎 각도', weight: 25,
      muscles: ['quadriceps', 'core'],
      evaluate: (_kp, a) => {
        const s = scoreInRange(a.kneeAvg, 70, 130, 40);
        return { score: s, message: s >= 70 ? '적절한 깊이입니다.' : '더 깊게 앉아주세요.' };
      } },
    { id: 'torsoUpright', label: '상체 직립', weight: 30,
      muscles: ['core', 'lowerBack'],
      evaluate: (_kp, a) => {
        const s = scoreBelow(a.torsoFromVertical, 30, 20);
        return { score: s, message: s >= 70
          ? '상체가 충분히 세워져 있습니다.'
          : '프론트 스쿼트는 상체를 더 세워야 합니다. 팔꿈치를 높이 들어주세요.' };
      } },
    { id: 'elbowUp', label: '팔꿈치 높이', weight: 25,
      muscles: ['shoulders'],
      evaluate: (kp) => {
        const elbowAvgY = (kp.leftElbow.y + kp.rightElbow.y) / 2;
        const diff = elbowAvgY - kp.shoulderMid.y;
        const s = scoreBelow(diff, 0.03, 0.08);
        return { score: s, message: s >= 70
          ? '팔꿈치가 적절히 올라가 있습니다.'
          : '팔꿈치를 더 높이 올려주세요. 바가 흘러내립니다.' };
      } },
    { id: 'kneeValgus', label: '무릎 정렬', weight: 20,
      muscles: ['quadriceps'],
      evaluate: (_kp, a) => {
        if (a.ankleGap < 0.01) return { score: 80, message: '정면 기준 미확인.' };
        const s = scoreAbove(a.kneeGap / a.ankleGap, 0.85, 0.35);
        return { score: s, message: s >= 70 ? '무릎 정렬 양호.' : '무릎이 안쪽으로 모입니다.' };
      } },
  ]},

  // ─── DEADLIFT ───
  deadlift: { checkpoints: [
    { id: 'backAlignment', label: '등 정렬 (둥근 등)', weight: 30,
      muscles: ['lowerBack', 'hamstrings'],
      evaluate: (kp) => {
        const fwd = Math.abs(kp.shoulderMid.x - kp.hipMid.x);
        const tLen = dist(kp.shoulderMid, kp.hipMid);
        const ratio = tLen > 0.01 ? fwd / tLen : 0;
        const s = scoreBelow(ratio, 0.5, 0.3);
        return { score: s, message: s >= 70
          ? '등이 중립을 유지하고 있습니다.'
          : '등이 둥글게 말리고 있습니다. 가슴을 펴고 견갑골을 모아주세요.' };
      } },
    { id: 'barPath', label: '바 경로 (몸 밀착)', weight: 20,
      muscles: ['lats', 'lowerBack'],
      evaluate: (kp) => {
        const s = scoreBelow(Math.abs(kp.wristMid.x - kp.shoulderMid.x), 0.08, 0.12);
        return { score: s, message: s >= 70
          ? '바가 몸에 밀착되어 있습니다.'
          : '바가 몸에서 떨어져 있습니다. 광배근에 힘을 주고 바를 몸 쪽으로 당기세요.' };
      } },
    { id: 'hipHinge', label: '고관절 힌지', weight: 30,
      muscles: ['glutes', 'hamstrings'],
      evaluate: (_kp, a) => {
        const s = a.hipAvg < a.kneeAvg ? 100 : scoreAbove(a.kneeAvg - a.hipAvg, 0, 30);
        return { score: s, message: s >= 70
          ? '고관절 힌지가 적절합니다.'
          : '무릎이 먼저 펴지고 있습니다. 엉덩이를 뒤로 밀며 고관절 위주로 움직이세요.' };
      } },
    { id: 'headNeutral', label: '머리 위치 (중립)', weight: 20,
      muscles: ['traps', 'lowerBack'],
      evaluate: (kp) => {
        const s = scoreBelow(Math.abs(kp.nose.x - kp.shoulderMid.x), 0.1, 0.1);
        return { score: s, message: s >= 70
          ? '머리가 중립 위치입니다.'
          : '고개를 과도하게 들거나 숙이지 마세요. 시선은 2~3m 전방 바닥.' };
      } },
  ]},

  // ─── ROMANIAN DEADLIFT ───
  romanianDeadlift: { checkpoints: [
    { id: 'backNeutral', label: '등 중립', weight: 35,
      muscles: ['lowerBack', 'hamstrings'],
      evaluate: (kp) => {
        const fwd = Math.abs(kp.shoulderMid.x - kp.hipMid.x);
        const tLen = dist(kp.shoulderMid, kp.hipMid);
        const s = scoreBelow(tLen > 0.01 ? fwd / tLen : 0, 0.5, 0.3);
        return { score: s, message: s >= 70 ? '등이 중립입니다.' : '등이 둥글어지고 있습니다. 가슴을 펴주세요.' };
      } },
    { id: 'kneeBend', label: '무릎 굽힘 (미세)', weight: 30,
      muscles: ['hamstrings'],
      evaluate: (_kp, a) => {
        const s = scoreInRange(a.kneeAvg, 150, 175, 20);
        return { score: s, message: s >= 70
          ? '무릎 굽힘이 적절합니다.'
          : a.kneeAvg < 150 ? '무릎이 너무 굽혀져 있습니다. RDL은 무릎을 살짝만 굽히세요.'
            : '무릎을 살짝 굽혀 잠금을 풀어주세요.' };
      } },
    { id: 'hipHinge', label: '고관절 힌지 깊이', weight: 35,
      muscles: ['glutes', 'hamstrings'],
      evaluate: (_kp, a) => {
        const s = scoreInRange(a.hipAvg, 60, 130, 30);
        return { score: s, message: s >= 70
          ? '고관절 힌지가 적절합니다.'
          : '엉덩이를 더 뒤로 밀어 햄스트링 스트레칭을 느껴주세요.' };
      } },
  ]},

  // ─── BENCH PRESS ───
  benchPress: { checkpoints: [
    { id: 'elbowFlare', label: '팔꿈치 각도 (벌어짐)', weight: 30,
      muscles: ['shoulders', 'chest'],
      evaluate: (_kp, a) => {
        const s = scoreInRange(a.shoulderAvg, 45, 70, 20);
        return { score: s, message: s >= 70
          ? '팔꿈치 각도가 적절합니다 (45-70°).'
          : a.shoulderAvg > 70
            ? `팔꿈치가 ${Math.round(a.shoulderAvg)}°로 과도하게 벌어져 있습니다. 어깨 부상 위험.`
            : `팔꿈치가 ${Math.round(a.shoulderAvg)}°로 너무 붙어 있습니다.` };
      } },
    { id: 'wristPosition', label: '손목 위치', weight: 25,
      muscles: ['chest', 'shoulders'],
      evaluate: (kp) => {
        const s = kp.wristMid.y > kp.shoulderMid.y ? 100 : 40;
        return { score: s, message: s >= 70
          ? '바가 가슴 하단 위에 적절히 위치합니다.'
          : '바가 얼굴/목 위에 있습니다. 가슴 하단(유두선) 위로 내려주세요.' };
      } },
    { id: 'symmetry', label: '좌우 대칭', weight: 20,
      muscles: ['chest'],
      evaluate: (_kp, a) => {
        const diff = Math.abs(a.elbowL - a.elbowR);
        const s = scoreBelow(diff, 15, 25);
        return { score: s, message: s >= 70
          ? '양팔이 대칭적으로 움직이고 있습니다.'
          : `좌우 팔꿈치 각도 차이 ${Math.round(diff)}°. 한쪽이 먼저 올라가고 있습니다.` };
      } },
    { id: 'shoulderStability', label: '견갑골 안정성', weight: 25,
      muscles: ['shoulders', 'traps'],
      evaluate: (kp) => {
        const s = scoreBelow(Math.abs(kp.leftShoulder.y - kp.rightShoulder.y), 0.03, 0.05);
        return { score: s, message: s >= 70
          ? '어깨가 안정적으로 고정되어 있습니다.'
          : '어깨 높이가 불균형합니다. 견갑골을 모으고 가슴을 펴주세요.' };
      } },
  ]},

  // ─── SHOULDER PRESS ───
  shoulderPress: { checkpoints: [
    { id: 'elbowPosition', label: '팔꿈치 위치', weight: 30,
      muscles: ['shoulders'],
      evaluate: (kp) => {
        const maxBack = Math.max(
          Math.abs(kp.leftElbow.x - kp.leftShoulder.x),
          Math.abs(kp.rightElbow.x - kp.rightShoulder.x)
        );
        const s = scoreBelow(maxBack, 0.06, 0.08);
        return { score: s, message: s >= 70
          ? '팔꿈치 위치가 적절합니다.'
          : '팔꿈치가 어깨 뒤로 빠지고 있습니다. 팔꿈치를 앞으로 유지하세요.' };
      } },
    { id: 'torsoLean', label: '몸통 기울기 (과신전)', weight: 30,
      muscles: ['lowerBack', 'core'],
      evaluate: (_kp, a) => {
        const s = scoreBelow(a.torsoFromVertical, 15, 20);
        return { score: s, message: s >= 70
          ? '몸통이 직립 상태입니다.'
          : `몸이 ${Math.round(a.torsoFromVertical)}° 젖혀져 있습니다. 허리 과신전 주의. 코어에 힘을 주세요.` };
      } },
    { id: 'lockout', label: '팔 완전 신전', weight: 20,
      muscles: ['shoulders', 'triceps'],
      evaluate: (kp, a) => {
        if (kp.wristMid.y >= kp.shoulderMid.y) return { score: 60, message: '프레스 상단이 아닙니다 (참고용).' };
        const s = scoreAbove(a.elbowAvg, 160, 30);
        return { score: s, message: s >= 70
          ? '완전히 락아웃 되었습니다.'
          : '팔을 끝까지 펴주세요. 머리 위로 완전히 밀어 올리세요.' };
      } },
    { id: 'headPosition', label: '머리 위치', weight: 20,
      muscles: ['traps'],
      evaluate: (kp) => {
        const s = scoreBelow(Math.abs(kp.nose.y - kp.shoulderMid.y), 0.12, 0.1);
        return { score: s, message: s >= 70
          ? '머리 위치가 자연스럽습니다.'
          : '머리가 과도하게 앞으로 나와 있습니다. 턱을 살짝 당기세요.' };
      } },
  ]},

  // ─── PLANK ───
  plank: { checkpoints: [
    { id: 'bodyLine', label: '신체 정렬 (일직선)', weight: 40,
      muscles: ['core', 'glutes'],
      evaluate: (kp) => {
        const lineY = (kp.shoulderMid.y + kp.ankleMid.y) / 2;
        const dev = Math.abs(kp.hipMid.y - lineY);
        const bodyLen = Math.abs(kp.ankleMid.y - kp.shoulderMid.y) || 0.1;
        const s = scoreBelow(dev / bodyLen, 0.1, 0.2);
        return { score: s, message: s >= 70
          ? '머리부터 발끝까지 일직선을 유지하고 있습니다.'
          : '몸이 일직선이 아닙니다. 코어에 힘을 주고 몸을 일직선으로 만드세요.' };
      } },
    { id: 'hipSag', label: '엉덩이 처짐', weight: 30,
      muscles: ['core', 'lowerBack'],
      evaluate: (kp) => {
        const lineY = (kp.shoulderMid.y + kp.ankleMid.y) / 2;
        const bodyLen = Math.abs(kp.ankleMid.y - kp.shoulderMid.y) || 0.1;
        const sagRatio = (kp.hipMid.y - lineY) / bodyLen;
        const s = scoreBelow(sagRatio, 0.05, 0.15);
        return { score: s, message: s >= 70
          ? '엉덩이 높이가 적절합니다.'
          : '엉덩이가 아래로 처지고 있습니다. 복근에 힘을 주고 엉덩이를 올려주세요.' };
      } },
    { id: 'hipPike', label: '엉덩이 치솟음', weight: 30,
      muscles: ['core', 'shoulders'],
      evaluate: (kp) => {
        const lineY = (kp.shoulderMid.y + kp.ankleMid.y) / 2;
        const bodyLen = Math.abs(kp.ankleMid.y - kp.shoulderMid.y) || 0.1;
        const pikeRatio = (lineY - kp.hipMid.y) / bodyLen;
        const s = scoreBelow(pikeRatio, 0.05, 0.15);
        return { score: s, message: s >= 70
          ? '엉덩이가 과도하게 올라가지 않았습니다.'
          : '엉덩이가 너무 올라가 있습니다(파이크). 몸을 일직선으로 낮춰주세요.' };
      } },
  ]},

  // ─── PULL UP ───
  pullUp: { checkpoints: [
    { id: 'shoulderDepress', label: '어깨 내림 (견갑 하강)', weight: 35,
      muscles: ['lats', 'traps'],
      evaluate: (kp) => {
        const diff = kp.shoulderMid.y - kp.nose.y;
        const s = scoreAbove(diff, 0.08, 0.1);
        return { score: s, message: s >= 70
          ? '어깨가 적절히 내려가 있습니다 (견갑 하강).'
          : '어깨가 귀 쪽으로 올라가 있습니다. 견갑골을 아래로 당기세요.' };
      } },
    { id: 'elbowDirection', label: '팔꿈치 방향', weight: 30,
      muscles: ['lats', 'biceps'],
      evaluate: (kp) => {
        const leDown = kp.leftElbow.y > kp.leftWrist.y;
        const reDown = kp.rightElbow.y > kp.rightWrist.y;
        const s = (leDown && reDown) ? 100 : (leDown || reDown) ? 60 : 30;
        return { score: s, message: s >= 70
          ? '팔꿈치가 아래를 향하고 있습니다.'
          : '팔꿈치가 바깥으로 벌어지고 있습니다. 팔꿈치를 아래로 당기세요.' };
      } },
    { id: 'bodyControl', label: '몸 흔들림 제어', weight: 35,
      muscles: ['core'],
      evaluate: (kp) => {
        const s = scoreBelow(Math.abs(kp.hipMid.x - kp.shoulderMid.x), 0.05, 0.1);
        return { score: s, message: s >= 70
          ? '몸이 안정적으로 고정되어 있습니다.'
          : '몸이 흔들리고 있습니다(Kipping). 코어에 힘을 주고 반동 없이 당기세요.' };
      } },
  ]},

  // ─── LUNGE ───
  lunge: { checkpoints: [
    { id: 'frontKnee', label: '앞쪽 무릎 각도', weight: 30,
      muscles: ['quadriceps', 'glutes'],
      evaluate: (_kp, a) => {
        const fk = Math.min(a.kneeL, a.kneeR);
        const s = scoreInRange(fk, 80, 110, 25);
        return { score: s, message: s >= 70
          ? '앞 무릎 각도가 적절합니다 (약 90°).'
          : fk > 110 ? '앞 무릎이 충분히 굽혀지지 않았습니다.'
            : '앞 무릎이 과도하게 굽혀져 있습니다. 무릎 부담 주의.' };
      } },
    { id: 'kneeOverToe', label: '무릎-발목 정렬', weight: 25,
      muscles: ['quadriceps'],
      evaluate: (kp, a) => {
        const leftFront = a.kneeL < a.kneeR;
        const fK = leftFront ? kp.leftKnee : kp.rightKnee;
        const fA = leftFront ? kp.leftAnkle : kp.rightAnkle;
        const s = scoreBelow(Math.abs(fK.x - fA.x), 0.05, 0.1);
        return { score: s, message: s >= 70
          ? '무릎이 발목 위에 잘 정렬되어 있습니다.'
          : '무릎이 발끝을 넘어가고 있습니다. 보폭을 더 넓히세요.' };
      } },
    { id: 'torsoUpright', label: '상체 직립', weight: 25,
      muscles: ['core', 'lowerBack'],
      evaluate: (_kp, a) => {
        const s = scoreBelow(a.torsoFromVertical, 20, 25);
        return { score: s, message: s >= 70
          ? '상체가 세워져 있습니다.'
          : '상체가 앞으로 기울고 있습니다. 가슴을 펴고 세워주세요.' };
      } },
    { id: 'rearKnee', label: '뒷 무릎 위치', weight: 20,
      muscles: ['quadriceps', 'hamstrings'],
      evaluate: (_kp, a) => {
        const rk = Math.max(a.kneeL, a.kneeR);
        const s = scoreInRange(rk, 100, 160, 30);
        return { score: s, message: s >= 70
          ? '뒷다리 위치가 적절합니다.'
          : '뒷 무릎을 더 내려주세요. 바닥에 거의 닿을 정도로.' };
      } },
  ]},

  // ─── BARBELL ROW ───
  barbellRow: { checkpoints: [
    { id: 'torsoAngle', label: '몸통 각도', weight: 35,
      muscles: ['lowerBack', 'core'],
      evaluate: (_kp, a) => {
        const s = scoreInRange(a.torsoFromVertical, 30, 60, 20);
        return { score: s, message: s >= 70
          ? '몸통 각도가 적절합니다 (30-60°).'
          : a.torsoFromVertical < 30 ? '몸이 너무 세워져 있습니다. 더 숙여주세요.'
            : '몸이 너무 숙여져 있습니다. 살짝 세워주세요.' };
      } },
    { id: 'backNeutral', label: '등 중립', weight: 35,
      muscles: ['lowerBack', 'lats'],
      evaluate: (_kp, a) => {
        const s = scoreAbove(a.hipAvg, 80, 40);
        return { score: s, message: s >= 70
          ? '등이 중립 위치를 유지하고 있습니다.'
          : '등이 둥글어지고 있습니다. 가슴을 펴고 허리를 세워주세요.' };
      } },
    { id: 'elbowPath', label: '팔꿈치 경로', weight: 30,
      muscles: ['lats', 'traps'],
      evaluate: (_kp, a) => {
        const s = scoreBelow(a.elbowAvg, 120, 40);
        return { score: s, message: s >= 70
          ? '팔꿈치가 적절히 당겨지고 있습니다.'
          : '더 강하게 당기세요. 팔꿈치를 엉덩이 쪽으로 끌어당기세요.' };
      } },
  ]},

  // ─── HIP THRUST ───
  hipThrust: { checkpoints: [
    { id: 'hipExtension', label: '고관절 완전 신전', weight: 40,
      muscles: ['glutes', 'hamstrings'],
      evaluate: (_kp, a) => {
        const s = scoreAbove(a.hipAvg, 160, 40);
        return { score: s, message: s >= 70
          ? '엉덩이가 충분히 들어올려져 있습니다.'
          : '엉덩이를 더 높이 올리세요. 고관절이 완전히 펴져야 합니다.' };
      } },
    { id: 'kneeAngle', label: '무릎 각도', weight: 30,
      muscles: ['quadriceps', 'hamstrings'],
      evaluate: (_kp, a) => {
        const s = scoreInRange(a.kneeAvg, 80, 110, 25);
        return { score: s, message: s >= 70
          ? '무릎 각도가 적절합니다 (~90°).'
          : '무릎 각도를 90° 근처로 맞춰주세요. 발 위치를 조정하세요.' };
      } },
    { id: 'spineNeutral', label: '허리 과신전 방지', weight: 30,
      muscles: ['lowerBack', 'core'],
      evaluate: (kp) => {
        const s = kp.hipMid.y < (kp.shoulderMid.y + kp.kneeMid.y) / 2 ? 100 : 60;
        return { score: s, message: s >= 70
          ? '허리가 중립 위치입니다.'
          : '허리가 과도하게 젖혀지고 있습니다. 갈비뼈를 닫고 코어에 힘을 주세요.' };
      } },
  ]},

  // ─── PUSH UP ───
  pushUp: { checkpoints: [
    { id: 'bodyLine', label: '신체 일직선', weight: 35,
      muscles: ['core', 'glutes'],
      evaluate: (kp) => {
        const lineY = (kp.shoulderMid.y + kp.ankleMid.y) / 2;
        const dev = Math.abs(kp.hipMid.y - lineY);
        const bodyLen = Math.abs(kp.ankleMid.y - kp.shoulderMid.y) || 0.1;
        const s = scoreBelow(dev / bodyLen, 0.1, 0.2);
        return { score: s, message: s >= 70
          ? '머리부터 발끝까지 일직선입니다.'
          : '엉덩이가 올라가거나 처져 있습니다. 플랭크 자세를 유지하세요.' };
      } },
    { id: 'elbowAngle', label: '팔꿈치 각도', weight: 35,
      muscles: ['chest', 'triceps'],
      evaluate: (_kp, a) => {
        const s = scoreInRange(a.elbowAvg, 70, 160, 30);
        return { score: s, message: s >= 70
          ? '팔꿈치 각도가 적절합니다.'
          : a.elbowAvg < 70 ? '너무 깊게 내려갔습니다. 어깨 부담에 주의하세요.'
            : '더 깊게 내려가세요. 가슴이 바닥에 가까워야 합니다.' };
      } },
    { id: 'elbowFlare', label: '팔꿈치 벌어짐', weight: 30,
      muscles: ['shoulders', 'chest'],
      evaluate: (_kp, a) => {
        const s = scoreInRange(a.shoulderAvg, 30, 60, 20);
        return { score: s, message: s >= 70
          ? '팔꿈치가 몸에 적절한 각도입니다.'
          : '팔꿈치가 과도하게 벌어져 있습니다. 몸통에서 45° 각도를 유지하세요.' };
      } },
  ]},

  // ─── LAT PULLDOWN ───
  latPulldown: { checkpoints: [
    { id: 'bodyLean', label: '몸 기울기', weight: 30,
      muscles: ['core', 'lowerBack'],
      evaluate: (_kp, a) => {
        const s = scoreBelow(a.torsoFromVertical, 25, 20);
        return { score: s, message: s >= 70
          ? '몸이 적절히 세워져 있습니다.'
          : '몸이 너무 뒤로 젖혀져 있습니다. 약간의 기울기만 유지하세요.' };
      } },
    { id: 'elbowDrive', label: '팔꿈치 하강', weight: 35,
      muscles: ['lats', 'biceps'],
      evaluate: (kp, a) => {
        const pulling = a.elbowAvg < 130;
        const elbowDown = kp.leftElbow.y > kp.leftShoulder.y || kp.rightElbow.y > kp.rightShoulder.y;
        const s = (pulling && elbowDown) ? 100 : pulling ? 70 : 40;
        return { score: s, message: s >= 70
          ? '팔꿈치가 아래로 잘 당겨지고 있습니다.'
          : '팔꿈치를 옆구리 쪽으로 당기세요. 등으로 당기는 느낌을 유지하세요.' };
      } },
    { id: 'shoulderDepress', label: '어깨 내림', weight: 35,
      muscles: ['traps', 'lats'],
      evaluate: (kp) => {
        const s = scoreAbove(kp.shoulderMid.y - kp.nose.y, 0.06, 0.08);
        return { score: s, message: s >= 70
          ? '어깨가 적절히 내려가 있습니다.'
          : '어깨가 귀 쪽으로 올라가 있습니다. 견갑골을 아래로 눌러주세요.' };
      } },
  ]},

  // ─── BICEP CURL ───
  bicepCurl: { checkpoints: [
    { id: 'elbowStability', label: '팔꿈치 고정', weight: 40,
      muscles: ['biceps'],
      evaluate: (_kp, a) => {
        const s = scoreBelow(a.shoulderAvg, 30, 25);
        return { score: s, message: s >= 70
          ? '팔꿈치가 옆구리에 잘 고정되어 있습니다.'
          : `팔꿈치가 몸에서 떨어지고 있습니다(${Math.round(a.shoulderAvg)}°). 팔꿈치를 옆구리에 고정하세요.` };
      } },
    { id: 'bodySwing', label: '몸 반동', weight: 30,
      muscles: ['core', 'lowerBack'],
      evaluate: (_kp, a) => {
        const s = scoreBelow(a.torsoFromVertical, 10, 15);
        return { score: s, message: s >= 70
          ? '반동 없이 깨끗하게 컬링하고 있습니다.'
          : '몸을 흔들어 반동을 사용하고 있습니다. 상체를 고정하고 팔만 움직이세요.' };
      } },
    { id: 'rom', label: '가동 범위', weight: 30,
      muscles: ['biceps', 'forearms'],
      evaluate: (_kp, a) => {
        const s = scoreInRange(a.elbowAvg, 40, 160, 20);
        return { score: s, message: s >= 70
          ? '충분한 가동 범위로 운동하고 있습니다.'
          : '가동 범위를 더 넓히세요. 완전히 펴고 완전히 구부리세요.' };
      } },
  ]},

  // ─── LATERAL RAISE ───
  lateralRaise: { checkpoints: [
    { id: 'armHeight', label: '팔 높이', weight: 35,
      muscles: ['shoulders'],
      evaluate: (kp) => {
        const atShoulder = Math.abs(kp.wristMid.y - kp.shoulderMid.y) < 0.06;
        const above = kp.wristMid.y < kp.shoulderMid.y;
        const s = atShoulder ? 100 : above ? 80 : 40;
        return { score: s, message: s >= 70
          ? '팔이 어깨 높이까지 올라가 있습니다.'
          : '팔을 어깨 높이까지 올려주세요. 너무 높이 올리지는 마세요.' };
      } },
    { id: 'elbowBend', label: '팔꿈치 미세 굽힘', weight: 30,
      muscles: ['shoulders'],
      evaluate: (_kp, a) => {
        const s = scoreInRange(a.elbowAvg, 150, 175, 20);
        return { score: s, message: s >= 70
          ? '팔꿈치 굽힘이 적절합니다.'
          : a.elbowAvg < 150 ? '팔꿈치가 너무 굽혀져 있습니다. 살짝만 굽히세요.'
            : '팔꿈치를 살짝 굽혀주세요. 완전히 펴면 관절에 부담됩니다.' };
      } },
    { id: 'bodyLean', label: '몸 흔들림', weight: 35,
      muscles: ['core'],
      evaluate: (_kp, a) => {
        const s = scoreBelow(a.torsoFromVertical, 10, 15);
        return { score: s, message: s >= 70
          ? '몸이 안정적입니다.'
          : '몸을 흔들지 마세요. 무게를 줄이고 반동 없이 천천히 올리세요.' };
      } },
  ]},

  // ─── KETTLEBELL SWING ───
  kettlebellSwing: { checkpoints: [
    { id: 'hipHinge', label: '고관절 힌지', weight: 40,
      muscles: ['glutes', 'hamstrings'],
      evaluate: (_kp, a) => {
        const s = a.hipAvg < a.kneeAvg ? 100 : 60;
        return { score: s, message: s >= 70
          ? '고관절 주도 움직임이 적절합니다.'
          : '무릎으로 스쿼트하듯 움직이지 마세요. 엉덩이를 뒤로 밀어 힌지하세요.' };
      } },
    { id: 'armRelaxed', label: '팔 이완 (진자)', weight: 30,
      muscles: ['shoulders'],
      evaluate: (_kp, a) => {
        const s = scoreAbove(a.elbowAvg, 150, 30);
        return { score: s, message: s >= 70
          ? '팔이 자연스럽게 이완되어 있습니다.'
          : '팔로 들어올리지 마세요. 팔은 힘을 빼고 엉덩이 힘으로 스윙하세요.' };
      } },
    { id: 'backNeutral', label: '등 중립', weight: 30,
      muscles: ['lowerBack', 'core'],
      evaluate: (_kp, a) => {
        const s = scoreAbove(a.hipAvg, 70, 40);
        return { score: s, message: s >= 70
          ? '등이 중립을 유지하고 있습니다.'
          : '등이 둥글어지고 있습니다. 가슴을 펴고 코어에 힘을 주세요.' };
      } },
  ]},

  // ─── DIP ───
  dip: { checkpoints: [
    { id: 'elbowAngle', label: '팔꿈치 각도', weight: 35,
      muscles: ['chest', 'triceps'],
      evaluate: (_kp, a) => {
        const s = scoreInRange(a.elbowAvg, 70, 160, 25);
        return { score: s, message: s >= 70
          ? '적절한 깊이로 내려가고 있습니다.'
          : a.elbowAvg < 70
            ? '너무 깊게 내려가고 있습니다. 어깨 부상 위험. 90°까지만 내려가세요.'
            : '더 깊게 내려가세요. 팔꿈치가 최소 90°는 되어야 합니다.' };
      } },
    { id: 'shoulderPosition', label: '어깨 위치', weight: 35,
      muscles: ['shoulders'],
      evaluate: (kp) => {
        const s = scoreBelow(Math.abs(kp.shoulderMid.x - kp.wristMid.x), 0.08, 0.1);
        return { score: s, message: s >= 70
          ? '어깨 위치가 안정적입니다.'
          : '어깨가 너무 앞으로 나와 있습니다. 몸을 약간 세우고 가슴을 펴세요.' };
      } },
    { id: 'bodyControl', label: '몸통 제어', weight: 30,
      muscles: ['core'],
      evaluate: (kp) => {
        const s = scoreBelow(Math.abs(kp.hipMid.x - kp.shoulderMid.x), 0.05, 0.1);
        return { score: s, message: s >= 70
          ? '몸이 안정적입니다.'
          : '몸이 흔들리고 있습니다. 코어에 힘을 주고 제어된 동작으로 수행하세요.' };
      } },
  ]},

  // ─── LEG PRESS ───
  legPress: { checkpoints: [
    { id: 'kneeAngle', label: '무릎 각도 (깊이)', weight: 35,
      muscles: ['quadriceps', 'glutes'],
      evaluate: (_kp, a) => {
        const s = scoreInRange(a.kneeAvg, 70, 140, 30);
        return { score: s, message: s >= 70
          ? '적절한 깊이로 내려가고 있습니다.'
          : a.kneeAvg > 140 ? '더 깊게 내려가세요.'
            : '너무 깊게 내려가고 있습니다. 무릎 부담에 주의하세요.' };
      } },
    { id: 'kneeValgus', label: '무릎 정렬', weight: 35,
      muscles: ['quadriceps'],
      evaluate: (_kp, a) => {
        if (a.ankleGap < 0.01) return { score: 80, message: '정면 기준 미확인.' };
        const s = scoreAbove(a.kneeGap / a.ankleGap, 0.85, 0.35);
        return { score: s, message: s >= 70
          ? '무릎 정렬이 양호합니다.'
          : '무릎이 안쪽으로 모이고 있습니다. 발끝 방향으로 밀어주세요.' };
      } },
    { id: 'hipContact', label: '엉덩이 밀착', weight: 30,
      muscles: ['lowerBack', 'glutes'],
      evaluate: (_kp, a) => {
        const s = scoreAbove(a.hipAvg, 60, 30);
        return { score: s, message: s >= 70
          ? '엉덩이가 시트에 밀착되어 있습니다.'
          : '엉덩이가 시트에서 뜨고 있습니다. 허리 부상 위험. 가동 범위를 줄이세요.' };
      } },
  ]},

  // ─── BACK EXTENSION ───
  backExtension: { checkpoints: [
    { id: 'hipHinge', label: '고관절 힌지', weight: 40,
      muscles: ['lowerBack', 'glutes'],
      evaluate: (_kp, a) => {
        const s = scoreInRange(a.hipAvg, 80, 170, 30);
        return { score: s, message: s >= 70 ? '고관절 힌지가 적절합니다.' : '가동 범위를 조절하세요.' };
      } },
    { id: 'spineControl', label: '척추 신전 제어', weight: 30,
      muscles: ['lowerBack'],
      evaluate: (_kp, a) => {
        const s = scoreBelow(a.hipAvg, 180, 15);
        return { score: s, message: s >= 70
          ? '척추 신전이 제어되고 있습니다.'
          : '허리를 과도하게 젖히지 마세요. 몸통 일직선까지만 올라오세요.' };
      } },
    { id: 'tempo', label: '동작 제어', weight: 30,
      muscles: ['hamstrings', 'glutes'],
      evaluate: (_kp, a) => {
        const s = scoreAbove(a.hipAvg, 70, 40);
        return { score: s, message: s >= 70 ? '동작이 제어되고 있습니다.' : '천천히 제어하며 올라오세요.' };
      } },
  ]},

  // ─── CRUNCH ───
  crunch: { checkpoints: [
    { id: 'spinalFlexion', label: '척추 굴곡', weight: 50,
      muscles: ['core'],
      evaluate: (_kp, a) => {
        const s = scoreBelow(a.torsoFromVertical, 70, 25);
        return { score: s, message: s >= 70
          ? '적절한 크런치 범위입니다.'
          : '상체를 너무 많이 올리지 마세요. 견갑골만 떨어지면 됩니다.' };
      } },
    { id: 'neckNeutral', label: '목 중립', weight: 50,
      muscles: ['core'],
      evaluate: (kp) => {
        const s = scoreBelow(Math.abs(kp.nose.x - kp.shoulderMid.x), 0.08, 0.1);
        return { score: s, message: s >= 70
          ? '목이 자연스러운 위치입니다.'
          : '목을 잡아당기지 마세요. 턱과 가슴 사이 주먹 하나 거리를 유지하세요.' };
      } },
  ]},

  // ─── LEG RAISE ───
  legRaise: { checkpoints: [
    { id: 'legStraight', label: '다리 펴기', weight: 50,
      muscles: ['core', 'quadriceps'],
      evaluate: (_kp, a) => {
        const s = scoreAbove(a.kneeAvg, 150, 30);
        return { score: s, message: s >= 70
          ? '다리가 곧게 펴져 있습니다.'
          : '무릎이 굽혀져 있습니다. 다리를 곧게 펴고 들어올리세요.' };
      } },
    { id: 'controlledMotion', label: '동작 제어', weight: 50,
      muscles: ['core'],
      evaluate: (kp) => {
        const s = kp.hipMid.y > 0.6 ? 100 : 50;
        return { score: s, message: s >= 70
          ? '허리가 바닥에 밀착되어 있습니다.'
          : '허리가 뜨고 있습니다. 복근에 힘을 주고 허리를 바닥에 눌러주세요.' };
      } },
  ]},

  // ─── RUSSIAN TWIST ───
  russianTwist: { checkpoints: [
    { id: 'torsoRotation', label: '몸통 회전', weight: 50,
      muscles: ['core'],
      evaluate: (kp) => {
        const rotation = Math.abs(kp.leftShoulder.x - kp.rightShoulder.x);
        const s = rotation < 0.05 ? 60 : 100;
        return { score: s, message: s >= 70
          ? '충분한 회전 범위입니다.'
          : '몸통을 더 많이 회전시키세요. 양쪽으로 충분히 비틀어주세요.' };
      } },
    { id: 'seatStability', label: '앉은 자세 안정', weight: 50,
      muscles: ['core'],
      evaluate: (_kp, a) => {
        const s = scoreInRange(a.torsoFromVertical, 20, 50, 20);
        return { score: s, message: s >= 70
          ? '앉은 자세가 안정적입니다.'
          : '상체를 45° 정도 뒤로 기울이고 유지하세요.' };
      } },
  ]},

  // ─── AB WHEEL ROLLOUT ───
  abWheelRollout: { checkpoints: [
    { id: 'bodyExtension', label: '신체 신전', weight: 50,
      muscles: ['core', 'lats'],
      evaluate: (_kp, a) => {
        const s = scoreAbove(a.shoulderAvg, 120, 40);
        return { score: s, message: s >= 70
          ? '충분히 뻗어 나가고 있습니다.'
          : '더 멀리 뻗어 나가세요. 가동 범위를 점진적으로 늘리세요.' };
      } },
    { id: 'spineNeutral', label: '허리 과신전 방지', weight: 50,
      muscles: ['lowerBack', 'core'],
      evaluate: (_kp, a) => {
        const s = scoreAbove(a.hipAvg, 140, 40);
        return { score: s, message: s >= 70
          ? '허리가 중립 위치입니다.'
          : '허리가 과도하게 처지고 있습니다. 복근에 힘을 주고 허리를 보호하세요.' };
      } },
  ]},

  // ─── FACE PULL ───
  facePull: { checkpoints: [
    { id: 'elbowHeight', label: '팔꿈치 높이', weight: 50,
      muscles: ['traps', 'shoulders'],
      evaluate: (kp) => {
        const elbowY = (kp.leftElbow.y + kp.rightElbow.y) / 2;
        const s = Math.abs(elbowY - kp.shoulderMid.y) < 0.05 ? 100 : 50;
        return { score: s, message: s >= 70
          ? '팔꿈치가 어깨 높이에 있습니다.'
          : '팔꿈치를 어깨 높이로 올려주세요.' };
      } },
    { id: 'externalRotation', label: '외회전', weight: 50,
      muscles: ['shoulders', 'traps'],
      evaluate: (kp) => {
        const elbowY = (kp.leftElbow.y + kp.rightElbow.y) / 2;
        const s = kp.wristMid.y < elbowY ? 100 : 50;
        return { score: s, message: s >= 70
          ? '외회전이 적절합니다.'
          : '마무리 동작에서 손을 팔꿈치 위로 올려 외회전 하세요.' };
      } },
  ]},

  // ─── OVERHEAD EXTENSION ───
  overheadExtension: { checkpoints: [
    { id: 'elbowPosition', label: '팔꿈치 위치', weight: 50,
      muscles: ['triceps'],
      evaluate: (kp) => {
        const elbowX = (kp.leftElbow.x + kp.rightElbow.x) / 2;
        const s = Math.abs(elbowX - kp.nose.x) < 0.08 ? 100 : 50;
        return { score: s, message: s >= 70
          ? '팔꿈치가 머리 옆에 잘 고정되어 있습니다.'
          : '팔꿈치가 벌어지고 있습니다. 머리 옆에 고정하세요.' };
      } },
    { id: 'fullExtension', label: '완전 신전', weight: 50,
      muscles: ['triceps'],
      evaluate: (_kp, a) => {
        const s = scoreInRange(a.elbowAvg, 40, 170, 20);
        return { score: s, message: s >= 70 ? '가동 범위가 적절합니다.' : '팔을 끝까지 펴주세요.' };
      } },
  ]},

  // ─── TRICEP PUSHDOWN ───
  tricepPushdown: { checkpoints: [
    { id: 'elbowStability', label: '팔꿈치 고정', weight: 50,
      muscles: ['triceps'],
      evaluate: (_kp, a) => {
        const s = scoreBelow(a.shoulderAvg, 25, 20);
        return { score: s, message: s >= 70
          ? '팔꿈치가 옆구리에 잘 고정되어 있습니다.'
          : '팔꿈치가 움직이고 있습니다. 옆구리에 고정하세요.' };
      } },
    { id: 'fullPush', label: '완전 푸시다운', weight: 50,
      muscles: ['triceps'],
      evaluate: (_kp, a) => {
        const s = scoreInRange(a.elbowAvg, 30, 160, 20);
        return { score: s, message: s >= 70 ? '가동 범위가 적절합니다.' : '끝까지 밀어 내려주세요.' };
      } },
  ]},

  // ─── UPRIGHT ROW ───
  uprightRow: { checkpoints: [
    { id: 'elbowHeight', label: '팔꿈치 높이', weight: 50,
      muscles: ['shoulders', 'traps'],
      evaluate: (kp) => {
        const above = kp.leftElbow.y < kp.leftWrist.y && kp.rightElbow.y < kp.rightWrist.y;
        const s = above ? 100 : 40;
        return { score: s, message: s >= 70
          ? '팔꿈치가 손목 위에 있습니다.'
          : '팔꿈치를 손목보다 높이 올려주세요. 팔꿈치가 리드하는 동작입니다.' };
      } },
    { id: 'barClose', label: '바 밀착', weight: 50,
      muscles: ['traps'],
      evaluate: (kp) => {
        const s = Math.abs(kp.wristMid.x - kp.shoulderMid.x) < 0.08 ? 100 : 50;
        return { score: s, message: s >= 70
          ? '바가 몸에 밀착되어 있습니다.'
          : '바를 몸에 붙여서 당기세요.' };
      } },
  ]},

  // ─── SHRUG ───
  shrug: { checkpoints: [
    { id: 'shoulderElevation', label: '어깨 올림', weight: 50,
      muscles: ['traps'],
      evaluate: (kp) => {
        const s = scoreBelow(kp.shoulderMid.y - kp.nose.y, 0.1, 0.08);
        return { score: s, message: s >= 70
          ? '어깨가 충분히 올라가 있습니다.'
          : '어깨를 귀 쪽으로 더 높이 으쓱하세요.' };
      } },
    { id: 'armStraight', label: '팔 직선', weight: 50,
      muscles: ['traps', 'forearms'],
      evaluate: (_kp, a) => {
        const s = scoreAbove(a.elbowAvg, 160, 25);
        return { score: s, message: s >= 70
          ? '팔이 곧게 펴져 있습니다.'
          : '팔꿈치를 굽히지 마세요. 팔을 곧게 펴고 어깨만 올리세요.' };
      } },
  ]},

  // ─── LEG EXTENSION ───
  legExtension: { checkpoints: [
    { id: 'kneeExtension', label: '무릎 신전', weight: 50,
      muscles: ['quadriceps'],
      evaluate: (_kp, a) => {
        const s = scoreInRange(a.kneeAvg, 60, 170, 20);
        return { score: s, message: s >= 70
          ? '무릎 가동 범위가 적절합니다.'
          : '무릎을 끝까지 펴주세요. 완전 신전 후 천천히 돌아오세요.' };
      } },
    { id: 'bodyStable', label: '상체 안정', weight: 50,
      muscles: ['core'],
      evaluate: (_kp, a) => {
        const s = scoreBelow(a.torsoFromVertical, 15, 15);
        return { score: s, message: s >= 70
          ? '상체가 안정적입니다.'
          : '반동을 사용하지 마세요. 등을 시트에 밀착하세요.' };
      } },
  ]},

  // ─── LEG CURL ───
  legCurl: { checkpoints: [
    { id: 'kneeFlex', label: '무릎 굴곡', weight: 50,
      muscles: ['hamstrings'],
      evaluate: (_kp, a) => {
        const s = scoreInRange(a.kneeAvg, 40, 160, 20);
        return { score: s, message: s >= 70
          ? '무릎 굴곡 범위가 적절합니다.'
          : '무릎을 끝까지 구부리세요. 엉덩이를 들지 말고 햄스트링에 집중하세요.' };
      } },
    { id: 'hipStable', label: '엉덩이 고정', weight: 50,
      muscles: ['glutes', 'lowerBack'],
      evaluate: (kp) => {
        const s = kp.hipMid.y > 0.4 ? 100 : 50;
        return { score: s, message: s >= 70
          ? '엉덩이가 패드에 잘 밀착되어 있습니다.'
          : '엉덩이가 들리고 있습니다. 패드에 엉덩이를 누르세요.' };
      } },
  ]},

  // ─── CALF RAISE ───
  calfRaise: { checkpoints: [
    { id: 'ankleExtension', label: '발목 신전', weight: 50,
      muscles: ['calves'],
      evaluate: (kp) => {
        const ankleToKnee = Math.abs(kp.ankleMid.y - kp.kneeMid.y);
        const hipToKnee = Math.abs(kp.hipMid.y - kp.kneeMid.y);
        const s = hipToKnee > 0.01 && ankleToKnee / hipToKnee < 1.2 ? 100 : 60;
        return { score: s, message: s >= 70
          ? '충분히 올라가고 있습니다.'
          : '발뒤꿈치를 최대한 높이 들어올리세요.' };
      } },
    { id: 'bodyUpright', label: '몸 직립', weight: 50,
      muscles: ['core'],
      evaluate: (_kp, a) => {
        const s = scoreBelow(a.torsoFromVertical, 10, 15);
        return { score: s, message: s >= 70 ? '몸이 곧게 세워져 있습니다.' : '몸을 세우고 수행하세요.' };
      } },
  ]},

  // ─── CLEAN AND PRESS ───
  cleanAndPress: { checkpoints: [
    { id: 'hipHinge', label: '클린 자세', weight: 35,
      muscles: ['glutes', 'quadriceps'],
      evaluate: (_kp, a) => {
        const s = scoreInRange(a.hipAvg, 70, 170, 30);
        return { score: s, message: s >= 70 ? '클린 자세가 적절합니다.' : '클린 시 엉덩이를 사용하세요.' };
      } },
    { id: 'lockout', label: '오버헤드 락아웃', weight: 35,
      muscles: ['shoulders', 'triceps'],
      evaluate: (kp, a) => {
        if (kp.wristMid.y >= kp.shoulderMid.y) return { score: 70, message: '프레스 상단이 아닌 프레임입니다.' };
        const s = scoreAbove(a.elbowAvg, 160, 30);
        return { score: s, message: s >= 70 ? '완전한 락아웃입니다.' : '팔을 끝까지 펴주세요.' };
      } },
    { id: 'barPath', label: '바 경로', weight: 30,
      muscles: ['core', 'lowerBack'],
      evaluate: (kp) => {
        const s = scoreBelow(Math.abs(kp.wristMid.x - kp.shoulderMid.x), 0.1, 0.1);
        return { score: s, message: s >= 70 ? '바가 몸 가까이 유지되고 있습니다.' : '바를 몸에 붙이세요.' };
      } },
  ]},

  // ─── BURPEE ───
  burpee: { checkpoints: [
    { id: 'plankPhase', label: '플랭크 자세', weight: 50,
      muscles: ['core', 'chest'],
      evaluate: (kp) => {
        const lineY = (kp.shoulderMid.y + kp.ankleMid.y) / 2;
        const bodyLen = Math.abs(kp.ankleMid.y - kp.shoulderMid.y) || 0.1;
        const s = scoreBelow(Math.abs(kp.hipMid.y - lineY) / bodyLen, 0.15, 0.2);
        return { score: s, message: s >= 70
          ? '플랭크 자세가 양호합니다.'
          : '바닥 자세에서 엉덩이를 올리거나 처지지 않게 하세요.' };
      } },
    { id: 'fullExtension', label: '점프 신전', weight: 50,
      muscles: ['quadriceps', 'glutes'],
      evaluate: (_kp, a) => {
        const s = (a.kneeAvg > 150 && a.hipAvg > 150) ? 100 : 60;
        return { score: s, message: s >= 70
          ? '완전히 펴진 점프입니다.'
          : '점프 시 몸을 완전히 펴주세요.' };
      } },
  ]},

  // ─── GENERIC FALLBACK ───
  _generic: { checkpoints: [
    { id: 'stability', label: '자세 안정성', weight: 50,
      muscles: ['core'],
      evaluate: (kp) => {
        const s = scoreBelow(Math.abs(kp.leftShoulder.y - kp.rightShoulder.y), 0.04, 0.06);
        return { score: s, message: s >= 70
          ? '자세가 안정적입니다.'
          : '몸의 좌우 균형을 맞춰주세요.' };
      } },
    { id: 'alignment', label: '신체 정렬', weight: 50,
      muscles: ['core', 'lowerBack'],
      evaluate: (_kp, a) => {
        const s = scoreBelow(a.torsoFromVertical, 50, 30);
        return { score: s, message: s >= 70
          ? '신체 정렬이 적절합니다.'
          : '자세를 바르게 교정해주세요.' };
      } },
  ]},
};

// ════════════════════════════════════════════════════════════════
// 4. 유사 운동 매핑 (Alias)
// ════════════════════════════════════════════════════════════════

const FORM_ALIASES = {
  inclineBench: 'benchPress',
  declineBench: 'benchPress',
  chestPress: 'benchPress',
  dumbbellFly: 'pushUp',
  cableFly: 'pushUp',
  chinUp: 'pullUp',
  dumbbellRow: 'barbellRow',
  seatedRow: 'barbellRow',
  arnoldPress: 'shoulderPress',
  frontRaise: 'lateralRaise',
  rearDeltFly: 'lateralRaise',
  hammerCurl: 'bicepCurl',
  preacherCurl: 'bicepCurl',
  skullCrusher: 'overheadExtension',
  wristCurl: '_generic',
  bulgarianSplit: 'lunge',
};

// ════════════════════════════════════════════════════════════════
// 5. 메인 분석 함수
// ════════════════════════════════════════════════════════════════

/**
 * 단일 프레임의 자세를 분석한다.
 *
 * @param {Array} landmarks - MediaPipe 33 landmark 배열 [{x,y,z,visibility}, ...]
 * @param {string} exerciseId - EXERCISE_DB 키 (예: 'squat', 'benchPress')
 * @returns {{
 *   score: number,           // 0~100 전체 자세 점수
 *   status: string,          // 'good' | 'warning' | 'bad' | 'error'
 *   color: string,           // 상태 색상
 *   checkpoints: Array,      // 각 체크포인트별 { id, label, pass, score, weight, message, muscles }
 *   wrongMuscles: string[],  // 잘못된 체크포인트 연관 근육 id (빨간색 렌더링용)
 *   activeMuscles: string[], // 해당 운동의 모든 근육 id (파란색 렌더링용)
 *   corrections: string[],   // 교정 메시지 목록
 *   supported: boolean,      // 해당 운동에 전용 폼체크 존재 여부
 * }}
 */
export function analyzePose(landmarks, exerciseId) {
  const kp = extractKeyPoints(landmarks);
  if (!kp) {
    return {
      score: 0, status: 'error', color: '#999999',
      checkpoints: [], wrongMuscles: [], activeMuscles: [],
      corrections: ['랜드마크 데이터가 부족합니다.'], supported: false,
    };
  }

  const angles = computeAngles(kp);

  // 폼 기준 조회
  let criteria = FORM_CRITERIA[exerciseId];
  let isAlias = false;
  if (!criteria && FORM_ALIASES[exerciseId]) {
    criteria = FORM_CRITERIA[FORM_ALIASES[exerciseId]];
    isAlias = true;
  }
  if (!criteria) criteria = FORM_CRITERIA._generic;

  // 운동 근육 정보
  const exercise = EXERCISE_DB[exerciseId];
  const activeMuscles = exercise
    ? [...new Set([...Object.keys(exercise.primary), ...Object.keys(exercise.secondary)])]
    : [];

  // 체크포인트 평가
  const checkpoints = [];
  const wrongMuscles = new Set();
  const corrections = [];
  let totalScore = 0;
  let totalWeight = 0;

  for (const cp of criteria.checkpoints) {
    const result = cp.evaluate(kp, angles);
    const pass = result.score >= 60;

    checkpoints.push({
      id: cp.id, label: cp.label, pass,
      score: result.score, weight: cp.weight,
      message: result.message, muscles: cp.muscles,
    });

    totalScore += result.score * cp.weight;
    totalWeight += cp.weight;

    if (!pass) {
      cp.muscles.forEach((m) => wrongMuscles.add(m));
      corrections.push(result.message);
    }
  }

  const score = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;

  let status, color;
  if (score >= 80) { status = 'good'; color = '#4CAF50'; }
  else if (score >= 60) { status = 'warning'; color = '#FF9800'; }
  else { status = 'bad'; color = '#F44336'; }

  return {
    score, status, color, checkpoints,
    wrongMuscles: [...wrongMuscles],
    activeMuscles,
    corrections,
    supported: criteria !== FORM_CRITERIA._generic,
  };
}

// 자세 점수에 따른 등급 (하위 호환)
export function getScoreGrade(score) {
  if (score >= 90) return { grade: 'A+', label: '완벽', color: '#00E5FF' };
  if (score >= 80) return { grade: 'A', label: '우수', color: '#00E5FF' };
  if (score >= 70) return { grade: 'B', label: '양호', color: '#00E676' };
  if (score >= 60) return { grade: 'C', label: '보통', color: '#FFD54F' };
  if (score >= 40) return { grade: 'D', label: '주의', color: '#FF6B35' };
  return { grade: 'F', label: '교정필요', color: '#FF3B5C' };
}

// ════════════════════════════════════════════════════════════════
// 6. 영상 프레임 분석
// ════════════════════════════════════════════════════════════════

/**
 * 영상의 전체 프레임을 분석하여 세트 단위 자세 평가를 반환한다.
 *
 * @param {Array<{landmarks: Array, timestamp?: number, frameIndex?: number}>} frames
 * @param {string} exerciseId
 * @returns {{
 *   overall: { score, status, color, wrongMuscles, corrections, totalFrames, analyzedFrames } | null,
 *   frames: Array,       // 프레임별 analyzePose 결과
 *   worstFrame: Object,  // 가장 점수 낮은 프레임 (교정 포인트 캡처용)
 * }}
 */
export function analyzeVideoFrames(frames, exerciseId) {
  if (!frames || frames.length === 0) {
    return { overall: null, frames: [], worstFrame: null };
  }

  const results = frames.map((frame, index) => ({
    ...analyzePose(frame.landmarks, exerciseId),
    frameIndex: frame.frameIndex ?? index,
    timestamp: frame.timestamp ?? 0,
  }));

  const valid = results.filter((r) => r.status !== 'error');
  if (valid.length === 0) {
    return { overall: null, frames: results, worstFrame: null };
  }

  const avgScore = Math.round(valid.reduce((s, r) => s + r.score, 0) / valid.length);
  const worstFrame = valid.reduce((w, r) => (r.score < w.score ? r : w));

  const allWrong = new Set();
  valid.forEach((r) => r.wrongMuscles.forEach((m) => allWrong.add(m)));

  const allCorrections = [...new Set(valid.flatMap((r) => r.corrections))];

  let status, color;
  if (avgScore >= 80) { status = 'good'; color = '#4CAF50'; }
  else if (avgScore >= 60) { status = 'warning'; color = '#FF9800'; }
  else { status = 'bad'; color = '#F44336'; }

  return {
    overall: {
      score: avgScore, status, color,
      wrongMuscles: [...allWrong],
      corrections: allCorrections,
      totalFrames: frames.length,
      analyzedFrames: valid.length,
    },
    frames: results,
    worstFrame,
  };
}

// ════════════════════════════════════════════════════════════════
// 7. 하위 호환 헬퍼 (컴포넌트 전환용)
// ════════════════════════════════════════════════════════════════

export const CORRECT_COLOR = "#00AAFF";
export const INCORRECT_COLOR = "#FF3B5C";

/**
 * 근육 품질 점수에 따른 표시 색상
 * @param {number} score - 0~1
 */
export function getMuscleDisplayColor(score) {
  if (score >= 0.6) return CORRECT_COLOR;
  if (score >= 0.4) return "#FF8C42";
  return INCORRECT_COLOR;
}

/**
 * analyzePose 결과 → 구 muscleQuality 형식 변환
 * @returns {{ [muscleKey]: { score: number(0~1), isCorrect: boolean } }}
 */
export function getMuscleQuality(poseResult) {
  if (!poseResult || !poseResult.checkpoints) return {};
  const mq = {};
  const wrongSet = new Set(poseResult.wrongMuscles || []);

  for (const muscle of poseResult.activeMuscles || []) {
    const relevant = poseResult.checkpoints.filter(cp => cp.muscles.includes(muscle));
    if (relevant.length > 0) {
      const avgScore = relevant.reduce((s, cp) => s + cp.score, 0) / relevant.length / 100;
      mq[muscle] = { score: avgScore, isCorrect: !wrongSet.has(muscle) };
    } else {
      mq[muscle] = { score: wrongSet.has(muscle) ? 0.4 : 0.85, isCorrect: !wrongSet.has(muscle) };
    }
  }
  return mq;
}
