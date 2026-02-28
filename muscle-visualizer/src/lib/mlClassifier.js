/**
 * mlClassifier.js — TF.js 브라우저 추론 모듈
 *
 * 학습된 MLP 모델을 lazy-load하여 운동 분류.
 * <5ms 추론, ~100KB 모델.
 */

import { FEATURE_ORDER } from "./exerciseClassifier";

const MODEL_BASE = import.meta.env.BASE_URL + "model/exercise-classifier";

let tf = null;
let model = null;
let meta = null;
let loadPromise = null;
let loadFailed = false;

/**
 * TF.js + 모델을 비동기 로드.
 * 앱 시작 시 호출. 로딩 중에는 rules fallback 사용.
 */
export function loadMLModel() {
  if (loadPromise) return loadPromise;
  if (loadFailed) return Promise.resolve(false);

  loadPromise = (async () => {
    try {
      tf = await import("@tensorflow/tfjs");
      model = await tf.loadLayersModel(MODEL_BASE + "/model.json");
      const resp = await fetch(MODEL_BASE + "/model-meta.json");
      meta = await resp.json();
      return true;
    } catch {
      loadFailed = true;
      return false;
    }
  })();

  return loadPromise;
}

/**
 * 모델이 로드되었는지 확인.
 */
export function isModelReady() {
  return model !== null && meta !== null;
}

/**
 * 특징 벡터로 운동 예측.
 *
 * @param {Object} features - extractClassifierFeatures() 반환값
 * @returns {{ key: string, confidence: number, top3: Array, source: string } | null}
 */
export function predictExercise(features) {
  if (!model || !meta || !tf) return null;

  // Build input vector
  const input = FEATURE_ORDER.map((key) => {
    const val = features[key];
    return typeof val === "boolean" ? (val ? 1 : 0) : (val || 0);
  });

  // Normalize
  const normalized = input.map((val, i) =>
    (val - meta.normParams.means[i]) / meta.normParams.stds[i]
  );

  // Predict (synchronous-style with dataSync)
  const inputTensor = tf.tensor2d([normalized]);
  const outputTensor = model.predict(inputTensor);
  const probs = outputTensor.dataSync();
  inputTensor.dispose();
  outputTensor.dispose();

  // Find best & top3
  let bestIdx = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[bestIdx]) bestIdx = i;
  }

  const indexed = Array.from(probs).map((p, i) => ({ idx: i, prob: p }));
  indexed.sort((a, b) => b.prob - a.prob);
  const top3 = indexed.slice(0, 3).map((x) => ({
    key: meta.classNames[x.idx],
    score: Math.round(x.prob * 100),
  }));

  const confidence = Math.round(probs[bestIdx] * 100);

  return {
    key: meta.classNames[bestIdx],
    confidence,
    top3,
    source: "ml",
  };
}
