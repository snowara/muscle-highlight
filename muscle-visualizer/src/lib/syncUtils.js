/**
 * syncUtils.js — QR 코드 기반 기기 간 학습 데이터 동기화
 *
 * 학습 데이터를 압축 인코딩하여 QR 코드로 변환하고,
 * 다른 기기에서 스캔하여 가져올 수 있도록 한다.
 *
 * 인코딩: 학습 항목 → 컴팩트 바이너리(7bytes/항목) → base64url
 * QR 용량 제한(~2.5KB)을 고려하여 데이터를 최적화한다.
 */

import QRCode from "qrcode";

// QR 코드 안전 용량 (base64url 문자 수)
const QR_MAX_CHARS = 2300;
const SYNC_PREFIX = "MHL1:"; // Muscle Highlight Learning v1

/**
 * 운동 키를 짧은 인덱스로 매핑하여 용량 절약.
 * 디코딩 시 역매핑에 사용.
 */
const EXERCISE_SHORT_KEYS = [
  "squat", "deadlift", "benchPress", "shoulderPress", "bicepCurl",
  "latPulldown", "pullUp", "barbellRow", "dumbbellRow", "seatedRow",
  "lunge", "legPress", "cableFly", "lateralRaise", "hipThrust",
  "plank", "legCurl", "pushUp", "dip", "chinUp",
  "frontSquat", "romanianDeadlift", "hammerCurl", "calfRaise", "crunch",
  "frontRaise", "shrug", "uprightRow", "tricepPushdown", "overheadExtension",
  "bulgarianSplit", "legExtension", "backExtension",
];

function exerciseToIndex(key) {
  const idx = EXERCISE_SHORT_KEYS.indexOf(key);
  return idx >= 0 ? idx : -1;
}

function indexToExercise(idx) {
  return EXERCISE_SHORT_KEYS[idx] || null;
}

/**
 * 학습 데이터를 컴팩트 바이너리로 인코딩.
 * 각 항목: [correctIdx(1), aiGuessIdx(1), features(5 × 1byte)] = 7 bytes
 */
function encodeEntries(entries) {
  const valid = entries.filter((e) => {
    const ci = exerciseToIndex(e.correct);
    const ai = exerciseToIndex(e.aiGuess);
    return ci >= 0 && ai >= 0 && e.features && e.features.length === 5;
  });

  const buf = new Uint8Array(valid.length * 7);
  for (let i = 0; i < valid.length; i++) {
    const e = valid[i];
    const offset = i * 7;
    buf[offset] = exerciseToIndex(e.correct);
    buf[offset + 1] = exerciseToIndex(e.aiGuess);
    for (let j = 0; j < 5; j++) {
      buf[offset + 2 + j] = Math.min(255, Math.max(0, Math.round(e.features[j])));
    }
  }
  return buf;
}

/**
 * 컴팩트 바이너리를 학습 항목으로 디코딩.
 */
function decodeEntries(buf) {
  const count = Math.floor(buf.length / 7);
  const entries = [];
  for (let i = 0; i < count; i++) {
    const offset = i * 7;
    const correct = indexToExercise(buf[offset]);
    const aiGuess = indexToExercise(buf[offset + 1]);
    if (!correct || !aiGuess) continue;

    const features = [];
    for (let j = 0; j < 5; j++) {
      features.push(buf[offset + 2 + j]);
    }
    entries.push({ features, correct, aiGuess, timestamp: Date.now() });
  }
  return entries;
}

/**
 * Uint8Array → base64url 문자열
 */
function toBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * base64url 문자열 → Uint8Array
 */
function fromBase64Url(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * 학습 데이터를 QR 코드용 문자열로 인코딩.
 * @param {Array} entries - learningStore의 학습 항목 배열
 * @returns {{ encoded: string, totalEntries: number, includedEntries: number }}
 */
export function encodeLearningData(entries) {
  if (!entries || entries.length === 0) {
    return { encoded: null, totalEntries: 0, includedEntries: 0 };
  }

  // 최신 항목 우선, QR 용량에 맞게 자르기
  const maxEntries = Math.floor((QR_MAX_CHARS - SYNC_PREFIX.length) * 3 / (4 * 7));
  const recent = entries.slice(-maxEntries);
  const binary = encodeEntries(recent);
  const encoded = SYNC_PREFIX + toBase64Url(binary);

  return {
    encoded,
    totalEntries: entries.length,
    includedEntries: recent.length,
  };
}

/**
 * QR 코드 문자열을 학습 데이터로 디코딩.
 * @param {string} data - QR에서 읽은 문자열
 * @returns {Array|null} 학습 항목 배열 또는 null (유효하지 않은 데이터)
 */
export function decodeLearningData(data) {
  if (!data || !data.startsWith(SYNC_PREFIX)) return null;

  try {
    const payload = data.slice(SYNC_PREFIX.length);
    const binary = fromBase64Url(payload);
    return decodeEntries(binary);
  } catch {
    return null;
  }
}

/**
 * QR 코드 이미지를 Canvas에 렌더링.
 * @param {string} data - 인코딩된 문자열
 * @param {HTMLCanvasElement} canvas - 렌더링 대상 캔버스
 * @returns {Promise<boolean>}
 */
export async function renderQRCode(data, canvas) {
  try {
    await QRCode.toCanvas(canvas, data, {
      width: 280,
      margin: 2,
      color: { dark: "#1D1D1F", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * QR 스캔 결과인지 검증.
 */
export function isValidSyncData(data) {
  return typeof data === "string" && data.startsWith(SYNC_PREFIX);
}
