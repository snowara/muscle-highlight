/**
 * retrainWithCorrections.mjs — 합성 + 사용자 보정 데이터 결합 재학습
 *
 * 사용법:
 *   node retrainWithCorrections.mjs [corrections.json]
 *
 * corrections.json: 브라우저 AdminPanel에서 "ML 재학습 데이터 내보내기"로 다운로드한 파일.
 * 형식: [{ features: [20 numbers], label: "exerciseKey", timestamp: number }, ...]
 *
 * 재학습 전략:
 *  - 합성 데이터(기존 train.json) + 사용자 보정 데이터 결합
 *  - 사용자 데이터는 실제 MediaPipe 출력이므로 가중치 5배 (oversample)
 *  - 새 모델을 public/model/exercise-classifier/에 저장
 */

import fs from "fs";
import path from "path";
import util from "util";
import { fileURLToPath } from "url";
import { CLASS_NAMES, FEATURE_NAMES } from "./exerciseProfiles.mjs";

// Polyfill for Node.js 22+
if (!util.isNullOrUndefined) {
  util.isNullOrUndefined = (v) => v === null || v === undefined;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const MODEL_DIR = path.join(__dirname, "..", "public", "model", "exercise-classifier");

const CORRECTION_OVERSAMPLE = 5;
const TRAIN_RATIO = 0.8;

// ── Lazy TF.js import ──
let tf;
async function loadTF() {
  if (!tf) {
    tf = await import("@tensorflow/tfjs-node");
  }
  return tf;
}

// ── Data Loading ──

function loadSyntheticData(filename) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return { features: [], labels: [] };
  }
  const raw = JSON.parse(fs.readFileSync(filepath, "utf-8"));
  return {
    features: raw.map((s) => s.features),
    labels: raw.map((s) => s.label),
  };
}

function loadCorrections(filepath) {
  if (!fs.existsSync(filepath)) {
    throw new Error(`보정 데이터 파일 없음: ${filepath}`);
  }

  const raw = JSON.parse(fs.readFileSync(filepath, "utf-8"));
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("보정 데이터가 비어있습니다");
  }

  const valid = raw.filter(
    (e) => e.features && e.features.length === FEATURE_NAMES.length && e.label
  );

  if (valid.length === 0) {
    throw new Error("유효한 보정 데이터가 없습니다 (20-feature 벡터 필요)");
  }

  const classIndex = {};
  CLASS_NAMES.forEach((name, i) => {
    classIndex[name] = i;
  });

  const features = [];
  const labels = [];
  let skipped = 0;

  for (const entry of valid) {
    const labelIdx = classIndex[entry.label];
    if (labelIdx === undefined) {
      skipped++;
      continue;
    }
    features.push(entry.features);
    labels.push(labelIdx);
  }

  if (skipped > 0) {
    console.log(`  [INFO] 알 수 없는 운동 라벨 ${skipped}건 건너뜀`);
  }

  return { features, labels };
}

// ── Normalization ──

function computeNormParams(features) {
  const numFeatures = features[0].length;
  const means = new Array(numFeatures).fill(0);
  const stds = new Array(numFeatures).fill(0);

  for (const row of features) {
    for (let i = 0; i < numFeatures; i++) {
      means[i] += row[i];
    }
  }
  for (let i = 0; i < numFeatures; i++) {
    means[i] /= features.length;
  }

  for (const row of features) {
    for (let i = 0; i < numFeatures; i++) {
      stds[i] += (row[i] - means[i]) ** 2;
    }
  }
  for (let i = 0; i < numFeatures; i++) {
    stds[i] = Math.sqrt(stds[i] / features.length) || 1e-8;
  }

  return { means, stds };
}

function normalizeFeatures(features, normParams) {
  return features.map((row) =>
    row.map((val, i) => (val - normParams.means[i]) / normParams.stds[i])
  );
}

// ── Model Architecture ──

function createModel(tf, numFeatures, numClasses) {
  const model = tf.sequential();

  model.add(tf.layers.dense({
    inputShape: [numFeatures],
    units: 128,
    activation: "relu",
    kernelInitializer: "heNormal",
  }));
  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.dropout({ rate: 0.3 }));

  model.add(tf.layers.dense({
    units: 96,
    activation: "relu",
    kernelInitializer: "heNormal",
  }));
  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.dropout({ rate: 0.25 }));

  model.add(tf.layers.dense({
    units: 64,
    activation: "relu",
    kernelInitializer: "heNormal",
  }));
  model.add(tf.layers.dropout({ rate: 0.2 }));

  model.add(tf.layers.dense({
    units: numClasses,
    activation: "softmax",
  }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: "sparseCategoricalCrossentropy",
    metrics: ["accuracy"],
  });

  return model;
}

// ── Shuffle ──

function shuffle(features, labels) {
  const indices = features.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return {
    features: indices.map((i) => features[i]),
    labels: indices.map((i) => labels[i]),
  };
}

// ── Main ──

async function retrain() {
  const tf = await loadTF();

  const correctionFile = process.argv[2];
  if (!correctionFile) {
    console.log("사용법: node retrainWithCorrections.mjs <corrections.json>");
    console.log("");
    console.log("corrections.json은 앱의 관리자 패널 > 학습 현황 > 'ML 재학습 데이터 내보내기'로 다운로드합니다.");
    process.exit(1);
  }

  console.log("=== ML 모델 재학습 (합성 + 보정 데이터) ===\n");

  // 1. 합성 데이터 로드
  const syntheticTrain = loadSyntheticData("train.json");
  const syntheticVal = loadSyntheticData("val.json");
  console.log(`  합성 학습 데이터: ${syntheticTrain.features.length} samples`);
  console.log(`  합성 검증 데이터: ${syntheticVal.features.length} samples`);

  // 2. 사용자 보정 데이터 로드
  const correctionPath = path.resolve(correctionFile);
  const corrections = loadCorrections(correctionPath);
  console.log(`  보정 데이터: ${corrections.features.length} samples`);

  // 3. 보정 데이터 oversample (실제 데이터이므로 가중치 부여)
  const oversampledFeatures = [];
  const oversampledLabels = [];
  for (let rep = 0; rep < CORRECTION_OVERSAMPLE; rep++) {
    oversampledFeatures.push(...corrections.features);
    oversampledLabels.push(...corrections.labels);
  }
  console.log(`  보정 데이터 x${CORRECTION_OVERSAMPLE} = ${oversampledFeatures.length} samples`);

  // 4. 보정 데이터를 train/val 분할
  const corrSplitIdx = Math.round(oversampledFeatures.length * TRAIN_RATIO);
  const corrTrain = {
    features: oversampledFeatures.slice(0, corrSplitIdx),
    labels: oversampledLabels.slice(0, corrSplitIdx),
  };
  const corrVal = {
    features: oversampledFeatures.slice(corrSplitIdx),
    labels: oversampledLabels.slice(corrSplitIdx),
  };

  // 5. 결합
  const combinedTrainFeatures = [...syntheticTrain.features, ...corrTrain.features];
  const combinedTrainLabels = [...syntheticTrain.labels, ...corrTrain.labels];
  const combinedValFeatures = [...syntheticVal.features, ...corrVal.features];
  const combinedValLabels = [...syntheticVal.labels, ...corrVal.labels];

  console.log(`\n  결합 학습 데이터: ${combinedTrainFeatures.length} samples`);
  console.log(`  결합 검증 데이터: ${combinedValFeatures.length} samples`);

  // 6. 셔플
  const shuffledTrain = shuffle(combinedTrainFeatures, combinedTrainLabels);
  const shuffledVal = shuffle(combinedValFeatures, combinedValLabels);

  // 7. 정규화 (결합 데이터 기준)
  const normParams = computeNormParams(shuffledTrain.features);
  const trainNorm = normalizeFeatures(shuffledTrain.features, normParams);
  const valNorm = normalizeFeatures(shuffledVal.features, normParams);

  // 8. 텐서 생성
  const xTrain = tf.tensor2d(trainNorm);
  const yTrain = tf.tensor1d(shuffledTrain.labels, "float32");
  const xVal = tf.tensor2d(valNorm);
  const yVal = tf.tensor1d(shuffledVal.labels, "float32");

  // 9. 모델 생성 & 학습
  const model = createModel(tf, FEATURE_NAMES.length, CLASS_NAMES.length);
  model.summary();

  let bestValAcc = 0;
  const patience = 15;
  let patienceCount = 0;
  let bestEpoch = 0;
  const EPOCHS = 100;
  const BATCH_SIZE = 64;

  console.log("\n  학습 시작...\n");

  await model.fit(xTrain, yTrain, {
    epochs: EPOCHS,
    batchSize: BATCH_SIZE,
    validationData: [xVal, yVal],
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        const trainAcc = (logs.acc * 100).toFixed(1);
        const valAcc = (logs.val_acc * 100).toFixed(1);
        const trainLoss = logs.loss.toFixed(4);
        const valLoss = logs.val_loss.toFixed(4);

        if (epoch % 5 === 0 || epoch === EPOCHS - 1) {
          console.log(
            `  epoch ${String(epoch + 1).padStart(3)}/${EPOCHS}: ` +
            `loss=${trainLoss} acc=${trainAcc}% | ` +
            `val_loss=${valLoss} val_acc=${valAcc}%`
          );
        }

        if (logs.val_acc > bestValAcc) {
          bestValAcc = logs.val_acc;
          bestEpoch = epoch + 1;
          patienceCount = 0;
        } else {
          patienceCount++;
          if (patienceCount >= patience) {
            console.log(`\n  Early stopping at epoch ${epoch + 1} (best: epoch ${bestEpoch})`);
            model.stopTraining = true;
          }
        }
      },
    },
  });

  // 10. 모델 저장
  fs.mkdirSync(MODEL_DIR, { recursive: true });
  await model.save(`file://${MODEL_DIR}`);

  const modelMeta = {
    classNames: CLASS_NAMES,
    featureNames: FEATURE_NAMES,
    numClasses: CLASS_NAMES.length,
    numFeatures: FEATURE_NAMES.length,
    normParams,
    trainedAt: new Date().toISOString(),
    bestEpoch,
    bestValAccuracy: (bestValAcc * 100).toFixed(1),
    trainSize: combinedTrainFeatures.length,
    valSize: combinedValFeatures.length,
    correctionSamples: corrections.features.length,
    correctionOversample: CORRECTION_OVERSAMPLE,
    retrainedFrom: "synthetic + user corrections",
  };

  fs.writeFileSync(
    path.join(MODEL_DIR, "model-meta.json"),
    JSON.stringify(modelMeta, null, 2)
  );

  console.log(`\n=== 재학습 완료 ===`);
  console.log(`  최고 검증 정확도: ${(bestValAcc * 100).toFixed(1)}% (epoch ${bestEpoch})`);
  console.log(`  보정 데이터 반영: ${corrections.features.length}건 (x${CORRECTION_OVERSAMPLE})`);
  console.log(`  모델 저장: ${MODEL_DIR}/`);
  console.log(`\n  다음 단계: npm run build && 배포`);

  // Cleanup
  xTrain.dispose();
  yTrain.dispose();
  xVal.dispose();
  yVal.dispose();
}

retrain().catch((err) => {
  console.error("재학습 실패:", err);
  process.exit(1);
});
