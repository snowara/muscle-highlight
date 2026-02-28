/**
 * generateData.mjs — 합성 학습 데이터 생성기
 *
 * exerciseProfiles.mjs의 프로필에서 운동별 1,000개 합성 포즈 생성.
 * 구성: 70% 클린 + 20% 노이즈(std 1.5x) + 10% 전이(경계 샘플)
 *
 * 출력: scripts/data/train.json, scripts/data/val.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CLASS_NAMES, FEATURE_NAMES, PROFILES } from "./exerciseProfiles.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "data");

const SAMPLES_PER_CLASS = 1500;
const TRAIN_RATIO = 0.8;

// ── Random Generators ──

function randomGaussian(mean, std) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

function sampleContinuous(param, noiseMultiplier = 1.0) {
  const std = param.std * noiseMultiplier;
  const raw = randomGaussian(param.mean, std);
  return Math.max(param.min, Math.min(param.max, raw));
}

function sampleBoolean(param) {
  return Math.random() < param.prob ? 1 : 0;
}

// ── Consistency Enforcement ──
// 불리언 특징을 연속 특징에서 재계산하여 일관성 유지

function enforceConsistency(features) {
  const TORSO_UPRIGHT_MAX = 35;
  const TORSO_LEANING_MAX = 60;

  const torso = features[4]; // torsoFromVertical

  // isUpright / isLeaning / isHorizontal → torso 각도에서 결정
  features[11] = torso < TORSO_UPRIGHT_MAX ? 1 : 0;
  features[12] = torso >= TORSO_UPRIGHT_MAX && torso < TORSO_LEANING_MAX ? 1 : 0;
  features[13] = torso >= TORSO_LEANING_MAX ? 1 : 0;

  // wrist positions — wristHeightNorm 기반 결정
  const whn = features[7]; // wristHeightNorm (0=shoulder, 1=hip)
  features[14] = whn < -0.03 ? 1 : 0;   // wristAboveShoulder
  features[15] = Math.abs(whn) < 0.15 ? 1 : 0;  // wristAtShoulder
  features[16] = whn > 0 && whn < 1.0 ? 1 : 0;  // wristAtChest
  features[17] = whn >= 1.0 ? 1 : 0;     // wristBelowHip

  // elbowsPinned — shoulder < 30 && armElevation < 25
  const shoulder = features[3];
  const armElevation = features[5];
  features[18] = (shoulder < 30 && armElevation < 25) ? 1 : 0;

  // wristAboveElbow — indirect from wristHeightNorm and elbow angle
  // Approximate: if whn < 0.5 and elbow < 120, likely wrist above elbow
  const elbow = features[2];
  features[19] = (whn < 0.5 && elbow < 120) ? 1 : 0;

  return features;
}

// ── Sample Generation ──

function generateSample(profile, noiseMultiplier = 1.0) {
  const features = new Array(20);

  // Continuous features (indices 0-10)
  const continuousKeys = [
    "knee", "hip", "elbow", "shoulder", "torsoFromVertical",
    "armElevation", "armSpread", "wristHeightNorm", "stanceWidth",
    "kneeAsym", "elbowAsym",
  ];

  for (let i = 0; i < continuousKeys.length; i++) {
    features[i] = sampleContinuous(profile[continuousKeys[i]], noiseMultiplier);
  }

  // Boolean features (indices 11-19) — initially from profile, then enforce
  const boolKeys = [
    "isUpright", "isLeaning", "isHorizontal",
    "wristAboveShoulder", "wristAtShoulder", "wristAtChest",
    "wristBelowHip", "elbowsPinned", "wristAboveElbow",
  ];

  for (let i = 0; i < boolKeys.length; i++) {
    features[11 + i] = sampleBoolean(profile[boolKeys[i]]);
  }

  // Enforce consistency: boolean features determined by continuous values
  enforceConsistency(features);

  return features;
}

// ── Transition Samples (경계 샘플) ──
// 두 유사 운동의 프로필을 50:50 보간

const SIMILAR_PAIRS = [
  ["squat", "frontSquat"],
  ["deadlift", "romanianDeadlift"],
  ["bicepCurl", "hammerCurl"],
  ["pullUp", "chinUp"],
  ["lunge", "bulgarianSplit"],
  ["plank", "pushUp"],
  ["barbellRow", "dumbbellRow"],
  ["lateralRaise", "frontRaise"],
  ["shoulderPress", "overheadExtension"],
  ["latPulldown", "pullUp"],
  ["benchPress", "pushUp"],
  ["crunch", "backExtension"],
  ["tricepPushdown", "bicepCurl"],
  ["seatedRow", "barbellRow"],
  ["cableFly", "lateralRaise"],
  ["legPress", "legExtension"],
];

function getTransitionPartner(exerciseKey) {
  for (const [a, b] of SIMILAR_PAIRS) {
    if (a === exerciseKey) return b;
    if (b === exerciseKey) return a;
  }
  return null;
}

function generateTransitionSample(profile1, profile2) {
  const mix = 0.3 + Math.random() * 0.4; // 30-70% mix
  const features = new Array(20);

  const continuousKeys = [
    "knee", "hip", "elbow", "shoulder", "torsoFromVertical",
    "armElevation", "armSpread", "wristHeightNorm", "stanceWidth",
    "kneeAsym", "elbowAsym",
  ];

  for (let i = 0; i < continuousKeys.length; i++) {
    const p1 = profile1[continuousKeys[i]];
    const p2 = profile2[continuousKeys[i]];
    const mean = p1.mean * mix + p2.mean * (1 - mix);
    const std = Math.max(p1.std, p2.std) * 1.2;
    const min = Math.min(p1.min, p2.min);
    const max = Math.max(p1.max, p2.max);
    features[i] = sampleContinuous({ mean, std, min, max });
  }

  const boolKeys = [
    "isUpright", "isLeaning", "isHorizontal",
    "wristAboveShoulder", "wristAtShoulder", "wristAtChest",
    "wristBelowHip", "elbowsPinned", "wristAboveElbow",
  ];

  for (let i = 0; i < boolKeys.length; i++) {
    const p1 = profile1[boolKeys[i]];
    const p2 = profile2[boolKeys[i]];
    const prob = p1.prob * mix + p2.prob * (1 - mix);
    features[11 + i] = Math.random() < prob ? 1 : 0;
  }

  enforceConsistency(features);
  return features;
}

// ── Main Pipeline ──

function generate() {
  console.log("=== 합성 데이터 생성 시작 ===\n");

  const allSamples = [];
  const classCounts = {};

  for (const exerciseKey of CLASS_NAMES) {
    const profile = PROFILES[exerciseKey];
    if (!profile) {
      console.warn(`  [SKIP] ${exerciseKey} — 프로필 없음`);
      continue;
    }

    const cleanCount = Math.round(SAMPLES_PER_CLASS * 0.7);
    const noisyCount = Math.round(SAMPLES_PER_CLASS * 0.2);
    const transCount = SAMPLES_PER_CLASS - cleanCount - noisyCount;

    const label = CLASS_NAMES.indexOf(exerciseKey);

    // 70% clean
    for (let i = 0; i < cleanCount; i++) {
      allSamples.push({ features: generateSample(profile, 1.0), label });
    }

    // 20% noisy (std * 1.5)
    for (let i = 0; i < noisyCount; i++) {
      allSamples.push({ features: generateSample(profile, 1.5), label });
    }

    // 10% transition
    const partnerKey = getTransitionPartner(exerciseKey);
    const partnerProfile = partnerKey ? PROFILES[partnerKey] : null;
    for (let i = 0; i < transCount; i++) {
      if (partnerProfile) {
        allSamples.push({
          features: generateTransitionSample(profile, partnerProfile),
          label,
        });
      } else {
        // No partner — use extra noisy
        allSamples.push({ features: generateSample(profile, 1.8), label });
      }
    }

    classCounts[exerciseKey] = SAMPLES_PER_CLASS;
    process.stdout.write(`  [OK] ${exerciseKey}: ${SAMPLES_PER_CLASS} samples\n`);
  }

  // Shuffle
  for (let i = allSamples.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allSamples[i], allSamples[j]] = [allSamples[j], allSamples[i]];
  }

  // Split train/val
  const splitIdx = Math.round(allSamples.length * TRAIN_RATIO);
  const trainData = allSamples.slice(0, splitIdx);
  const valData = allSamples.slice(splitIdx);

  // Save
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const trainPath = path.join(OUT_DIR, "train.json");
  const valPath = path.join(OUT_DIR, "val.json");
  const metaPath = path.join(OUT_DIR, "meta.json");

  fs.writeFileSync(trainPath, JSON.stringify(trainData));
  fs.writeFileSync(valPath, JSON.stringify(valData));
  fs.writeFileSync(metaPath, JSON.stringify({
    classNames: CLASS_NAMES,
    featureNames: FEATURE_NAMES,
    numClasses: CLASS_NAMES.length,
    numFeatures: FEATURE_NAMES.length,
    trainSize: trainData.length,
    valSize: valData.length,
    samplesPerClass: SAMPLES_PER_CLASS,
    generatedAt: new Date().toISOString(),
  }, null, 2));

  console.log(`\n=== 생성 완료 ===`);
  console.log(`  총: ${allSamples.length} samples (${CLASS_NAMES.length} classes)`);
  console.log(`  학습: ${trainData.length} | 검증: ${valData.length}`);
  console.log(`  저장: ${OUT_DIR}/`);

  // Validate class distribution
  const trainDistribution = {};
  for (const s of trainData) {
    trainDistribution[s.label] = (trainDistribution[s.label] || 0) + 1;
  }
  const minCount = Math.min(...Object.values(trainDistribution));
  const maxCount = Math.max(...Object.values(trainDistribution));
  console.log(`  클래스 분포: min=${minCount}, max=${maxCount} (균형: ${(minCount / maxCount * 100).toFixed(1)}%)`);
}

generate();
