/**
 * evaluateModel.mjs — 모델 평가 + 혼동 행렬
 *
 * 학습된 모델의 Top-1, Top-3 정확도 및 클래스별 성능 분석.
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

let tf;
async function loadTF() {
  if (!tf) {
    tf = await import("@tensorflow/tfjs-node");
  }
  return tf;
}

function loadData(filename) {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), "utf-8"));
  return {
    features: raw.map((s) => s.features),
    labels: raw.map((s) => s.label),
  };
}

function normalizeFeatures(features, normParams) {
  return features.map((row) =>
    row.map((val, i) => (val - normParams.means[i]) / normParams.stds[i])
  );
}

function argmax(arr) {
  let best = 0;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > arr[best]) best = i;
  }
  return best;
}

function topK(arr, k) {
  const indexed = arr.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => b.v - a.v);
  return indexed.slice(0, k).map((x) => x.i);
}

async function evaluate() {
  const tf = await loadTF();

  console.log("=== 모델 평가 시작 ===\n");

  // Load model & meta
  const model = await tf.loadLayersModel(`file://${path.join(MODEL_DIR, "model.json")}`);
  const meta = JSON.parse(fs.readFileSync(path.join(MODEL_DIR, "model-meta.json"), "utf-8"));

  // Load validation data
  const val = loadData("val.json");
  const valNorm = normalizeFeatures(val.features, meta.normParams);

  console.log(`  검증 데이터: ${val.features.length} samples`);
  console.log(`  클래스 수: ${meta.numClasses}\n`);

  // Predict
  const xVal = tf.tensor2d(valNorm);
  const predictions = model.predict(xVal);
  const probsArray = await predictions.array();

  // Metrics
  let top1Correct = 0;
  let top3Correct = 0;
  const classStats = {};

  for (let i = 0; i < meta.numClasses; i++) {
    classStats[i] = { tp: 0, fp: 0, fn: 0, total: 0 };
  }

  for (let i = 0; i < val.labels.length; i++) {
    const trueLabel = val.labels[i];
    const probs = probsArray[i];
    const predLabel = argmax(probs);
    const top3Labels = topK(probs, 3);

    classStats[trueLabel].total++;

    if (predLabel === trueLabel) {
      top1Correct++;
      classStats[trueLabel].tp++;
    } else {
      classStats[predLabel].fp++;
      classStats[trueLabel].fn++;
    }

    if (top3Labels.includes(trueLabel)) {
      top3Correct++;
    }
  }

  const top1Acc = (top1Correct / val.labels.length * 100).toFixed(1);
  const top3Acc = (top3Correct / val.labels.length * 100).toFixed(1);

  console.log("  ──────────────────────────────────");
  console.log(`  Top-1 정확도: ${top1Acc}%`);
  console.log(`  Top-3 정확도: ${top3Acc}%`);
  console.log("  ──────────────────────────────────\n");

  // Per-class metrics
  console.log("  클래스별 성능:");
  console.log("  " + "─".repeat(55));
  console.log(
    `  ${"운동".padEnd(22)} ${"Prec".padStart(6)} ${"Recall".padStart(7)} ${"F1".padStart(6)} ${"N".padStart(5)}`
  );
  console.log("  " + "─".repeat(55));

  const worstClasses = [];

  for (let i = 0; i < meta.numClasses; i++) {
    const s = classStats[i];
    const precision = s.tp + s.fp > 0 ? s.tp / (s.tp + s.fp) : 0;
    const recall = s.total > 0 ? s.tp / s.total : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const name = meta.classNames[i];

    console.log(
      `  ${name.padEnd(22)} ${(precision * 100).toFixed(1).padStart(5)}% ` +
      `${(recall * 100).toFixed(1).padStart(6)}% ${(f1 * 100).toFixed(1).padStart(5)}% ${String(s.total).padStart(5)}`
    );

    if (f1 < 0.7) {
      worstClasses.push({ name, f1, recall, precision });
    }
  }

  console.log("  " + "─".repeat(55));

  // Worst classes
  if (worstClasses.length > 0) {
    console.log("\n  ⚠ 성능 미달 클래스 (F1 < 70%):");
    for (const c of worstClasses.sort((a, b) => a.f1 - b.f1)) {
      console.log(
        `    - ${c.name}: F1=${(c.f1 * 100).toFixed(1)}% ` +
        `(Prec=${(c.precision * 100).toFixed(1)}%, Recall=${(c.recall * 100).toFixed(1)}%)`
      );
    }
  }

  // Confusion matrix (top-5 worst pairs)
  console.log("\n  혼동 행렬 (상위 오분류 쌍):");
  const confusions = [];
  for (let i = 0; i < val.labels.length; i++) {
    const trueLabel = val.labels[i];
    const predLabel = argmax(probsArray[i]);
    if (trueLabel !== predLabel) {
      const key = `${meta.classNames[trueLabel]} → ${meta.classNames[predLabel]}`;
      const existing = confusions.find((c) => c.key === key);
      if (existing) {
        existing.count++;
      } else {
        confusions.push({ key, count: 1 });
      }
    }
  }

  confusions.sort((a, b) => b.count - a.count);
  for (const c of confusions.slice(0, 10)) {
    console.log(`    ${c.key}: ${c.count}건`);
  }

  // Summary
  console.log(`\n=== 평가 완료 ===`);
  console.log(`  Top-1: ${top1Acc}% ${Number(top1Acc) >= 85 ? "✓ PASS" : "✗ FAIL (목표 85%)"}`);
  console.log(`  Top-3: ${top3Acc}% ${Number(top3Acc) >= 95 ? "✓ PASS" : "✗ FAIL (목표 95%)"}`);

  // Model size
  const modelFiles = fs.readdirSync(MODEL_DIR);
  let totalSize = 0;
  for (const f of modelFiles) {
    totalSize += fs.statSync(path.join(MODEL_DIR, f)).size;
  }
  console.log(`  모델 크기: ${(totalSize / 1024).toFixed(0)} KB`);

  xVal.dispose();
  predictions.dispose();
}

evaluate().catch((err) => {
  console.error("평가 실패:", err);
  process.exit(1);
});
