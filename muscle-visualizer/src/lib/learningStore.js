/**
 * Learning Store — localStorage 기반 운동 감지 학습 시스템
 *
 * 사용자가 AI 감지 결과를 수정할 때마다 포즈 특징(관절 각도)과
 * 올바른 운동을 저장. 이후 분류 시 유사한 포즈에 대해 보정 점수를 부여.
 */

import { angleDeg, mid } from "./poseUtils";
import { extractClassifierFeatures, FEATURE_ORDER } from "./exerciseClassifier";

const STORAGE_KEY = "muscle-highlight-learning";
const MAX_ENTRIES = 500;

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

  // ML 재학습용 full 20-feature 벡터도 저장
  let fullFeatures = null;
  try {
    const clf = extractClassifierFeatures(landmarks);
    fullFeatures = FEATURE_ORDER.map((k) => {
      const v = clf[k];
      return typeof v === "boolean" ? (v ? 1 : 0) : Math.round(v * 100) / 100;
    });
  } catch {
    // extractClassifierFeatures 실패 시 null 유지
  }

  const entries = loadEntries();
  entries.push({
    features,
    fullFeatures,
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

/**
 * 최근 학습 이력 반환 (최신순)
 */
export function getLearningHistory(limit = 50) {
  const entries = loadEntries();
  return entries.slice(-limit).reverse().map(e => ({
    correct: e.correct,
    aiGuess: e.aiGuess,
    timestamp: e.timestamp,
    features: e.features,
  }));
}

/**
 * 상세 통계: 운동별 AI 정확도, 총 수정 횟수, 가장 많이 수정된 운동
 */
export function getDetailedStats() {
  const entries = loadEntries();
  const stats = {};

  for (const e of entries) {
    if (!stats[e.correct]) {
      stats[e.correct] = { corrections: 0, fromExercises: {} };
    }
    stats[e.correct].corrections++;
    const from = e.aiGuess || "unknown";
    stats[e.correct].fromExercises[from] = (stats[e.correct].fromExercises[from] || 0) + 1;
  }

  // 가장 많이 수정된 운동 순으로 정렬
  const sorted = Object.entries(stats)
    .sort((a, b) => b[1].corrections - a[1].corrections)
    .map(([key, data]) => ({ exerciseKey: key, ...data }));

  return {
    totalCorrections: entries.length,
    byExercise: sorted,
    oldestEntry: entries.length > 0 ? entries[0].timestamp : null,
    newestEntry: entries.length > 0 ? entries[entries.length - 1].timestamp : null,
  };
}

/**
 * 학습 데이터 raw export (JSON)
 */
export function exportLearningData() {
  return loadEntries();
}

/**
 * 학습 데이터 import
 */
export function importLearningData(data) {
  if (Array.isArray(data)) {
    saveEntries(data);
  }
}

/**
 * ML 재학습용 데이터 export.
 * fullFeatures가 있는 항목만 반환 (20-feature 벡터 + 라벨).
 */
export function exportForTraining() {
  const entries = loadEntries();
  return entries
    .filter((e) => e.fullFeatures && e.fullFeatures.length === 20)
    .map((e) => ({
      features: e.fullFeatures,
      label: e.correct,
      timestamp: e.timestamp,
    }));
}
