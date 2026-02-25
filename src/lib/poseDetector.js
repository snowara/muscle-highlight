/**
 * T2 AI 엔지니어 — MediaPipe PoseLandmarker 래퍼
 * 사진: IMAGE 모드, 영상: VIDEO 모드 (최대 15fps)
 * GPU 우선 → CPU fallback
 * 완전 실패 시 표준 인체 비율 fallback 랜드마크
 */

const VISION_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let poseLandmarker = null;
let currentMode = null;
let isInitializing = false;
let initPromise = null;

// ── 초기화 ────────────────────────────────────────────────

export async function initPoseDetector() {
  if (poseLandmarker) return true;
  if (isInitializing) return initPromise;

  isInitializing = true;
  initPromise = _doInit();

  try {
    await initPromise;
    return true;
  } catch (err) {
    console.warn("MediaPipe 초기화 실패:", err);
    return false;
  } finally {
    isInitializing = false;
  }
}

async function _doInit() {
  const { PoseLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");

  const vision = await FilesetResolver.forVisionTasks(VISION_CDN);

  // GPU 시도
  try {
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: "GPU",
      },
      runningMode: "IMAGE",
      numPoses: 1,
    });
    currentMode = "IMAGE";
    console.log("[PoseDetector] GPU 모드 초기화 성공");
    return;
  } catch (gpuErr) {
    console.warn("[PoseDetector] GPU 실패, CPU fallback:", gpuErr);
  }

  // CPU fallback
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: "CPU",
    },
    runningMode: "IMAGE",
    numPoses: 1,
  });
  currentMode = "IMAGE";
  console.log("[PoseDetector] CPU 모드 초기화 성공");
}

// ── 모드 전환 (뮤텍스로 보호) ─────────────────────────────

let modeSwitching = false;

async function setMode(mode) {
  if (!poseLandmarker || currentMode === mode) return;
  if (modeSwitching) return; // 이미 전환 중이면 스킵
  modeSwitching = true;
  try {
    await poseLandmarker.setOptions({ runningMode: mode });
    currentMode = mode;
    console.log(`[PoseDetector] 모드 전환: ${mode}`);
  } catch (err) {
    console.warn("[PoseDetector] 모드 전환 실패:", err);
  } finally {
    modeSwitching = false;
  }
}

// ── 사진 감지 (IMAGE 모드) ─────────────────────────────────

export async function detectImage(imageElement) {
  if (!poseLandmarker) {
    return { landmarks: generateFallbackLandmarks(), isFallback: true };
  }

  try {
    await setMode("IMAGE");
    if (currentMode !== "IMAGE") {
      return { landmarks: generateFallbackLandmarks(), isFallback: true };
    }
    const result = poseLandmarker.detect(imageElement);

    if (result.landmarks && result.landmarks.length > 0) {
      return { landmarks: result.landmarks[0], isFallback: false };
    }
  } catch (err) {
    console.warn("[PoseDetector] IMAGE 감지 실패:", err);
  }

  return { landmarks: generateFallbackLandmarks(), isFallback: true };
}

// ── 영상 프레임 감지 (VIDEO 모드, 15fps 제한) ──────────────

let lastVideoDetectTime = 0;
let lastVideoTimestamp = -1;
const MIN_FRAME_INTERVAL = 1000 / 15; // ~66ms

export async function detectVideoFrame(videoElement, timestamp) {
  if (!poseLandmarker) {
    return { landmarks: generateFallbackLandmarks(), isFallback: true };
  }

  // timestamp를 정수로 (MediaPipe 요구사항)
  const ts = Math.round(timestamp);

  // 15fps 스로틀링
  if (ts - lastVideoDetectTime < MIN_FRAME_INTERVAL) {
    return null; // 스킵
  }

  // 단조 증가 보장 (MediaPipe는 동일하거나 감소하는 timestamp 거부)
  if (ts <= lastVideoTimestamp) {
    return null;
  }

  // 비디오가 재생 중이고 프레임이 준비되었는지 확인
  if (videoElement.readyState < 2) {
    return null; // HAVE_CURRENT_DATA 미만이면 스킵
  }

  try {
    // 모드 전환이 진행 중이면 스킵
    if (modeSwitching) return null;

    await setMode("VIDEO");
    if (currentMode !== "VIDEO") return null;

    const result = poseLandmarker.detectForVideo(videoElement, ts);
    lastVideoDetectTime = ts;
    lastVideoTimestamp = ts;

    if (result.landmarks && result.landmarks.length > 0) {
      return { landmarks: result.landmarks[0], isFallback: false };
    }
  } catch (err) {
    console.warn("[PoseDetector] VIDEO 감지 실패:", err);
  }

  lastVideoDetectTime = ts;
  lastVideoTimestamp = ts;
  return { landmarks: generateFallbackLandmarks(), isFallback: true };
}

// ── VIDEO 모드 타임스탬프 리셋 (새 영상 로드 시) ──────────
export function resetVideoTimestamp() {
  lastVideoDetectTime = 0;
  lastVideoTimestamp = -1;
}

// ── Canvas에서 감지 (compositeExport용) ────────────────────

export async function detectCanvas(canvasElement) {
  if (!poseLandmarker) {
    return { landmarks: generateFallbackLandmarks(), isFallback: true };
  }

  try {
    await setMode("IMAGE");
    const result = poseLandmarker.detect(canvasElement);

    if (result.landmarks && result.landmarks.length > 0) {
      return { landmarks: result.landmarks[0], isFallback: false };
    }
  } catch (err) {
    console.warn("[PoseDetector] Canvas 감지 실패:", err);
  }

  return { landmarks: generateFallbackLandmarks(), isFallback: true };
}

// ── Fallback 랜드마크 (표준 인체 비율) ─────────────────────

export function generateFallbackLandmarks() {
  // 표준 인체 비율 (캔버스 0~1 정규화 좌표)
  // 직립 자세 기준
  return [
    { x: 0.50, y: 0.12, z: 0 },    // 0  nose
    { x: 0.48, y: 0.10, z: 0 },    // 1  left_eye_inner
    { x: 0.47, y: 0.10, z: 0 },    // 2  left_eye
    { x: 0.46, y: 0.10, z: 0 },    // 3  left_eye_outer
    { x: 0.52, y: 0.10, z: 0 },    // 4  right_eye_inner
    { x: 0.53, y: 0.10, z: 0 },    // 5  right_eye
    { x: 0.54, y: 0.10, z: 0 },    // 6  right_eye_outer
    { x: 0.44, y: 0.11, z: 0 },    // 7  left_ear
    { x: 0.56, y: 0.11, z: 0 },    // 8  right_ear
    { x: 0.48, y: 0.13, z: 0 },    // 9  mouth_left
    { x: 0.52, y: 0.13, z: 0 },    // 10 mouth_right
    { x: 0.38, y: 0.22, z: 0 },    // 11 left_shoulder
    { x: 0.62, y: 0.22, z: 0 },    // 12 right_shoulder
    { x: 0.32, y: 0.35, z: 0 },    // 13 left_elbow
    { x: 0.68, y: 0.35, z: 0 },    // 14 right_elbow
    { x: 0.30, y: 0.48, z: 0 },    // 15 left_wrist
    { x: 0.70, y: 0.48, z: 0 },    // 16 right_wrist
    { x: 0.28, y: 0.50, z: 0 },    // 17 left_pinky
    { x: 0.72, y: 0.50, z: 0 },    // 18 right_pinky
    { x: 0.29, y: 0.49, z: 0 },    // 19 left_index
    { x: 0.71, y: 0.49, z: 0 },    // 20 right_index
    { x: 0.31, y: 0.48, z: 0 },    // 21 left_thumb
    { x: 0.69, y: 0.48, z: 0 },    // 22 right_thumb
    { x: 0.42, y: 0.48, z: 0 },    // 23 left_hip
    { x: 0.58, y: 0.48, z: 0 },    // 24 right_hip
    { x: 0.42, y: 0.65, z: 0 },    // 25 left_knee
    { x: 0.58, y: 0.65, z: 0 },    // 26 right_knee
    { x: 0.42, y: 0.82, z: 0 },    // 27 left_ankle
    { x: 0.58, y: 0.82, z: 0 },    // 28 right_ankle
    { x: 0.41, y: 0.85, z: 0 },    // 29 left_heel
    { x: 0.59, y: 0.85, z: 0 },    // 30 right_heel
    { x: 0.43, y: 0.86, z: 0 },    // 31 left_foot_index
    { x: 0.57, y: 0.86, z: 0 },    // 32 right_foot_index
  ];
}

// ── 상태 조회 ─────────────────────────────────────────────

export function isDetectorReady() {
  return poseLandmarker !== null;
}

export function getCurrentMode() {
  return currentMode;
}
