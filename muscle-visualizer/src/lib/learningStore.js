/**
 * Learning Store — localStorage 기반 운동 감지 학습 시스템
 *
 * 사용자가 AI 감지 결과를 수정할 때마다 포즈 특징(관절 각도)과
 * 올바른 운동을 저장. 이후 분류 시 유사한 포즈에 대해 보정 점수를 부여.
 */

const STORAGE_KEY = "muscle-highlight-learning";
const MAX_ENTRIES = 500;

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

// Extract a compact feature vector from landmarks (7 angles + 2 ratios)
export function extractFeatures(landmarks) {
  if (!landmarks || landmarks.length < 29) return null;
  const lm = landmarks;

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
  const torsoAngle = Math.abs(Math.atan2(dx, dy) * 180 / Math.PI);

  return [
    Math.round((kneeL + kneeR) / 2),
    Math.round((hipL + hipR) / 2),
    Math.round((elbowL + elbowR) / 2),
    Math.round((shoulderL + shoulderR) / 2),
    Math.round(torsoAngle),
  ];
}

function featureDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  try {
    // Keep only recent entries
    const trimmed = entries.slice(-MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage full or unavailable
  }
}

/**
 * Record a user correction.
 * Called when user manually selects a different exercise than what AI detected.
 */
export function recordCorrection(landmarks, correctExercise, aiDetected) {
  const features = extractFeatures(landmarks);
  if (!features) return;

  const entries = loadEntries();
  entries.push({
    features,
    correct: correctExercise,
    aiGuess: aiDetected,
    timestamp: Date.now(),
  });

  saveEntries(entries);
}

/**
 * Get learned score adjustments for a given pose.
 * Returns { exerciseKey: bonusScore } map.
 */
export function getLearnedBoosts(landmarks) {
  const features = extractFeatures(landmarks);
  if (!features) return {};

  const entries = loadEntries();
  if (entries.length === 0) return {};

  const boosts = {};
  const THRESHOLD = 25; // angle distance threshold for "similar pose"

  for (const entry of entries) {
    const d = featureDistance(features, entry.features);
    if (d < THRESHOLD) {
      // Similar pose found — boost the corrected exercise
      const weight = Math.max(0, 1 - d / THRESHOLD); // 0~1, closer = stronger
      const bonus = Math.round(weight * 30);
      boosts[entry.correct] = (boosts[entry.correct] || 0) + bonus;

      // Penalize the wrong AI guess
      if (entry.aiGuess && entry.aiGuess !== entry.correct) {
        boosts[entry.aiGuess] = (boosts[entry.aiGuess] || 0) - Math.round(bonus * 0.5);
      }
    }
  }

  return boosts;
}

/**
 * Get learning stats.
 */
export function getLearningStats() {
  const entries = loadEntries();
  return {
    totalCorrections: entries.length,
    exerciseCounts: entries.reduce((acc, e) => {
      acc[e.correct] = (acc[e.correct] || 0) + 1;
      return acc;
    }, {}),
  };
}

/**
 * Clear all learned data.
 */
export function clearLearningData() {
  localStorage.removeItem(STORAGE_KEY);
}
