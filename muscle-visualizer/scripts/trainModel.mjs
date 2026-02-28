/**
 * trainModel.mjs — TF.js Node 학습 스크립트
 *
 * 합성 데이터로 MLP 모델 학습.
 * 출력: public/model/exercise-classifier/model.json + weights + model-meta.json
 */

import fs from "fs";
import path from "path";
import util from "util";
import { fileURLToPath } from "url";

// Polyfill for Node.js 22+ (removed util.isNullOrUndefined)
if (!util.isNullOrUndefined) {
  util.isNullOrUndefined = (v) => v === null || v === undefined;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const MODEL_DIR = path.join(__dirname, "..", "public", "model", "exercise-classifier");

// ── Lazy TF.js import ──
let tf;
async function loadTF() {
  if (!tf) {
    tf = await import("@tensorflow/tfjs-node");
  }
  return tf;
}

// ── Data Loading ──

function loadData(filename) {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), "utf-8"));
  const features = raw.map((s) => s.features);
  const labels = raw.map((s) => s.label);
  return { features, labels };
}

function loadMeta() {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, "meta.json"), "utf-8"));
}

// ── Normalization (StandardScaler) ──

function computeNormParams(features) {
  const numFeatures = features[0].length;
  const means = new Array(numFeatures).fill(0);
  const stds = new Array(numFeatures).fill(0);

  // Compute means
  for (const row of features) {
    for (let i = 0; i < numFeatures; i++) {
      means[i] += row[i];
    }
  }
  for (let i = 0; i < numFeatures; i++) {
    means[i] /= features.length;
  }

  // Compute std
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

// ── Training ──

async function train() {
  const tf = await loadTF();

  console.log("=== ML 모델 학습 시작 ===\n");

  // Load data
  const meta = loadMeta();
  const trainData = loadData("train.json");
  const valData = loadData("val.json");

  console.log(`  학습 데이터: ${trainData.features.length} samples`);
  console.log(`  검증 데이터: ${valData.features.length} samples`);
  console.log(`  특징 수: ${meta.numFeatures}`);
  console.log(`  클래스 수: ${meta.numClasses}\n`);

  // Normalize
  const normParams = computeNormParams(trainData.features);
  const trainNorm = normalizeFeatures(trainData.features, normParams);
  const valNorm = normalizeFeatures(valData.features, normParams);

  // Create tensors
  const xTrain = tf.tensor2d(trainNorm);
  const yTrain = tf.tensor1d(trainData.labels, "float32");
  const xVal = tf.tensor2d(valNorm);
  const yVal = tf.tensor1d(valData.labels, "float32");

  // Create model
  const model = createModel(tf, meta.numFeatures, meta.numClasses);
  model.summary();

  // Train with early stopping
  let bestValAcc = 0;
  let patience = 15;
  let patienceCount = 0;
  let bestEpoch = 0;

  const EPOCHS = 100;
  const BATCH_SIZE = 64;

  console.log("\n  학습 시작...\n");

  const history = await model.fit(xTrain, yTrain, {
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

  // Save model
  fs.mkdirSync(MODEL_DIR, { recursive: true });
  await model.save(`file://${MODEL_DIR}`);

  // Save meta with normParams
  const modelMeta = {
    classNames: meta.classNames,
    featureNames: meta.featureNames,
    numClasses: meta.numClasses,
    numFeatures: meta.numFeatures,
    normParams,
    trainedAt: new Date().toISOString(),
    bestEpoch,
    bestValAccuracy: (bestValAcc * 100).toFixed(1),
    trainSize: trainData.features.length,
    valSize: valData.features.length,
  };

  fs.writeFileSync(
    path.join(MODEL_DIR, "model-meta.json"),
    JSON.stringify(modelMeta, null, 2)
  );

  console.log(`\n=== 학습 완료 ===`);
  console.log(`  최고 검증 정확도: ${(bestValAcc * 100).toFixed(1)}% (epoch ${bestEpoch})`);
  console.log(`  모델 저장: ${MODEL_DIR}/`);

  // Cleanup
  xTrain.dispose();
  yTrain.dispose();
  xVal.dispose();
  yVal.dispose();
}

train().catch((err) => {
  console.error("학습 실패:", err);
  process.exit(1);
});
