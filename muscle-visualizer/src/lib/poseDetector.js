/**
 * poseDetector.js -- MediaPipe PoseLandmarker 기반 사진/영상 포즈 감지
 *
 * - 사진: runningMode IMAGE, 최대 800px 리사이즈, EXIF 보정, 33개 랜드마크
 * - 영상: runningMode VIDEO, rAF 루프, 최대 15fps 감지, worst-frame 캡처
 * - 운동 자동 인식: motionTracker.js로 분리 (re-export)
 * - Fallback: WASM 실패 시 표준 인체비율 랜드마크
 * - 에러: GPU->CPU fallback, 사람 미감지, 타임아웃, 코덱 미지원, 60초 제한
 */

import { extractAngles } from "./poseUtils";
import { MotionTracker, createMotionTracker } from "./motionTracker";

// re-export for backward compatibility
export { createMotionTracker };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// State
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let poseLandmarker = null;
let initPromise = null;
let currentRunningMode = null;
let mediapipeModule = null;

// Video processing state
let videoRafId = null;
let isVideoProcessing = false;

// WeakMap for video objectURL tracking (instead of expando property)
const videoUrls = new WeakMap();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const MAX_IMAGE_SIZE = 800;
const MAX_VIDEO_DETECTION_FPS = 15;
const MAX_VIDEO_DURATION = 60;
const INIT_TIMEOUT_MS = 30000;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Error types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export class PoseDetectorError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "PoseDetectorError";
    this.code = code;
  }
}

export const ERROR_CODES = {
  WASM_LOAD_FAILED: "WASM_LOAD_FAILED",
  MODEL_LOAD_FAILED: "MODEL_LOAD_FAILED",
  NO_PERSON_DETECTED: "NO_PERSON_DETECTED",
  INIT_TIMEOUT: "INIT_TIMEOUT",
  CODEC_UNSUPPORTED: "CODEC_UNSUPPORTED",
  VIDEO_TOO_LONG: "VIDEO_TOO_LONG",
  VIDEO_LOAD_FAILED: "VIDEO_LOAD_FAILED",
  GPU_FAILED: "GPU_FAILED",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Fallback landmarks (표준 인체비율 기반 33개 랜드마크)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function generateFallbackLandmarks() {
  const lm = new Array(33).fill(null).map(() => ({ x: 0, y: 0, z: 0, visibility: 0 }));

  // Head
  lm[0]  = { x: 0.50, y: 0.10, z: 0, visibility: 1.0 }; // nose
  lm[1]  = { x: 0.49, y: 0.08, z: 0, visibility: 0.9 }; // left eye inner
  lm[2]  = { x: 0.48, y: 0.08, z: 0, visibility: 0.9 }; // left eye
  lm[3]  = { x: 0.47, y: 0.08, z: 0, visibility: 0.9 }; // left eye outer
  lm[4]  = { x: 0.51, y: 0.08, z: 0, visibility: 0.9 }; // right eye inner
  lm[5]  = { x: 0.52, y: 0.08, z: 0, visibility: 0.9 }; // right eye
  lm[6]  = { x: 0.53, y: 0.08, z: 0, visibility: 0.9 }; // right eye outer
  lm[7]  = { x: 0.46, y: 0.09, z: 0, visibility: 0.8 }; // left ear
  lm[8]  = { x: 0.54, y: 0.09, z: 0, visibility: 0.8 }; // right ear
  lm[9]  = { x: 0.49, y: 0.12, z: 0, visibility: 0.9 }; // mouth left
  lm[10] = { x: 0.51, y: 0.12, z: 0, visibility: 0.9 }; // mouth right

  // Upper body
  lm[11] = { x: 0.38, y: 0.26, z: 0, visibility: 1.0 }; // left shoulder
  lm[12] = { x: 0.62, y: 0.26, z: 0, visibility: 1.0 }; // right shoulder
  lm[13] = { x: 0.32, y: 0.40, z: 0, visibility: 1.0 }; // left elbow
  lm[14] = { x: 0.68, y: 0.40, z: 0, visibility: 1.0 }; // right elbow
  lm[15] = { x: 0.28, y: 0.53, z: 0, visibility: 1.0 }; // left wrist
  lm[16] = { x: 0.72, y: 0.53, z: 0, visibility: 1.0 }; // right wrist

  // Hands
  lm[17] = { x: 0.26, y: 0.55, z: 0, visibility: 0.8 }; // left pinky
  lm[18] = { x: 0.74, y: 0.55, z: 0, visibility: 0.8 }; // right pinky
  lm[19] = { x: 0.27, y: 0.56, z: 0, visibility: 0.8 }; // left index
  lm[20] = { x: 0.73, y: 0.56, z: 0, visibility: 0.8 }; // right index
  lm[21] = { x: 0.25, y: 0.55, z: 0, visibility: 0.8 }; // left thumb
  lm[22] = { x: 0.75, y: 0.55, z: 0, visibility: 0.8 }; // right thumb

  // Lower body
  lm[23] = { x: 0.42, y: 0.52, z: 0, visibility: 1.0 }; // left hip
  lm[24] = { x: 0.58, y: 0.52, z: 0, visibility: 1.0 }; // right hip
  lm[25] = { x: 0.40, y: 0.72, z: 0, visibility: 1.0 }; // left knee
  lm[26] = { x: 0.60, y: 0.72, z: 0, visibility: 1.0 }; // right knee
  lm[27] = { x: 0.40, y: 0.92, z: 0, visibility: 1.0 }; // left ankle
  lm[28] = { x: 0.60, y: 0.92, z: 0, visibility: 1.0 }; // right ankle

  // Feet
  lm[29] = { x: 0.39, y: 0.95, z: 0, visibility: 0.8 }; // left heel
  lm[30] = { x: 0.61, y: 0.95, z: 0, visibility: 0.8 }; // right heel
  lm[31] = { x: 0.38, y: 0.97, z: 0, visibility: 0.8 }; // left foot index
  lm[32] = { x: 0.62, y: 0.97, z: 0, visibility: 0.8 }; // right foot index

  return lm;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXIF 방향 보정 + 리사이즈
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function readExifOrientation(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const view = new DataView(e.target.result);
      if (view.getUint16(0, false) !== 0xFFD8) { resolve(1); return; }

      let offset = 2;
      while (offset < view.byteLength - 2) {
        const marker = view.getUint16(offset, false);
        offset += 2;
        if (marker === 0xFFE1) {
          const length = view.getUint16(offset, false);
          offset += 2;
          const exifHeader = view.getUint32(offset, false);
          if (exifHeader !== 0x45786966) { resolve(1); return; }
          offset += 6;

          const tiffOffset = offset;
          const littleEndian = view.getUint16(tiffOffset, false) === 0x4949;
          offset = tiffOffset + view.getUint32(tiffOffset + 4, littleEndian);
          const tags = view.getUint16(offset, littleEndian);
          offset += 2;

          for (let i = 0; i < tags; i++) {
            const tag = view.getUint16(offset + i * 12, littleEndian);
            if (tag === 0x0112) {
              resolve(view.getUint16(offset + i * 12 + 8, littleEndian));
              return;
            }
          }
          resolve(1);
          return;
        } else if ((marker & 0xFF00) === 0xFF00) {
          offset += view.getUint16(offset, false);
        } else {
          break;
        }
      }
      resolve(1);
    };
    reader.onerror = () => resolve(1);
    reader.readAsArrayBuffer(file.slice(0, 65536));
  });
}

/**
 * 이미지 파일 → 리사이즈 + EXIF 보정된 Canvas 반환
 */
export async function prepareImage(file) {
  const orientation = await readExifOrientation(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let sw = img.naturalWidth;
      let sh = img.naturalHeight;

      if (Math.max(sw, sh) > MAX_IMAGE_SIZE) {
        const scale = MAX_IMAGE_SIZE / Math.max(sw, sh);
        sw = Math.round(sw * scale);
        sh = Math.round(sh * scale);
      }

      const needsSwap = orientation >= 5 && orientation <= 8;
      const canvas = document.createElement("canvas");
      canvas.width = needsSwap ? sh : sw;
      canvas.height = needsSwap ? sw : sh;
      const ctx = canvas.getContext("2d");

      switch (orientation) {
        case 2: ctx.transform(-1, 0, 0, 1, sw, 0); break;
        case 3: ctx.transform(-1, 0, 0, -1, sw, sh); break;
        case 4: ctx.transform(1, 0, 0, -1, 0, sh); break;
        case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
        case 6: ctx.transform(0, 1, -1, 0, sh, 0); break;
        case 7: ctx.transform(0, -1, -1, 0, sh, sw); break;
        case 8: ctx.transform(0, -1, 1, 0, 0, sw); break;
        default: break;
      }

      ctx.drawImage(img, 0, 0, sw, sh);
      resolve({ canvas, width: canvas.width, height: canvas.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new PoseDetectorError("이미지 로드 실패", ERROR_CODES.MODEL_LOAD_FAILED));
    };

    img.src = url;
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 초기화 (GPU 우선 → CPU fallback)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * @param {function} onStatusChange - "loading" | "ready" | "gpu_fallback" | "fallback"
 * @param {"IMAGE"|"VIDEO"} mode - 초기 runningMode
 * @returns {Promise<boolean>} true=정상, false=fallback
 */
export async function initPoseDetector(onStatusChange, mode = "IMAGE") {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), INIT_TIMEOUT_MS);

    try {
      onStatusChange?.("loading");

      mediapipeModule = await Promise.race([
        import("@mediapipe/tasks-vision"),
        new Promise((_, reject) => {
          timeoutController.signal.addEventListener("abort", () =>
            reject(new PoseDetectorError("초기화 타임아웃 (30초)", ERROR_CODES.INIT_TIMEOUT))
          );
        }),
      ]);

      const { PoseLandmarker, FilesetResolver } = mediapipeModule;

      let vision;
      try {
        vision = await FilesetResolver.forVisionTasks(WASM_CDN);
      } catch (e) {
        throw new PoseDetectorError(
          `WASM 로드 실패. 인터넷 연결을 확인하세요.\n${e.message}`,
          ERROR_CODES.WASM_LOAD_FAILED
        );
      }

      // GPU 시도
      try {
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: mode,
          numPoses: 1,
        });
        currentRunningMode = mode;
        onStatusChange?.("ready");
        clearTimeout(timer);
        return true;
      } catch (gpuError) {
        console.warn("[PoseDetector] GPU 실패, CPU fallback 시도...", gpuError);
        onStatusChange?.("gpu_fallback");
      }

      // CPU fallback
      try {
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
          runningMode: mode,
          numPoses: 1,
        });
        currentRunningMode = mode;
        onStatusChange?.("ready");
        clearTimeout(timer);
        return true;
      } catch (cpuError) {
        throw new PoseDetectorError(`모델 로드 실패: ${cpuError.message}`, ERROR_CODES.MODEL_LOAD_FAILED);
      }
    } catch (e) {
      clearTimeout(timer);
      console.error("[PoseDetector] 초기화 실패, fallback 모드", e);
      onStatusChange?.("fallback");
      poseLandmarker = null;
      currentRunningMode = null;
      return false;
    }
  })();

  return initPromise;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// runningMode 전환
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function ensureMode(mode) {
  if (!poseLandmarker) return false;
  if (currentRunningMode === mode) return true;
  try {
    await poseLandmarker.setOptions({ runningMode: mode });
    currentRunningMode = mode;
    return true;
  } catch (e) {
    console.error(`[PoseDetector] runningMode 전환 실패 (${mode})`, e);
    return false;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 사진 모드: 포즈 감지
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * @param {HTMLImageElement|HTMLCanvasElement} imageElement
 * @returns {{ landmarks, isFallback, worldLandmarks }}
 */
export async function detectPose(imageElement) {
  if (!poseLandmarker) {
    return { landmarks: generateFallbackLandmarks(), isFallback: true, worldLandmarks: null };
  }

  await ensureMode("IMAGE");

  try {
    const result = poseLandmarker.detect(imageElement);
    if (result.landmarks && result.landmarks.length > 0) {
      return {
        landmarks: result.landmarks[0],
        isFallback: false,
        worldLandmarks: result.worldLandmarks?.[0] || null,
      };
    }
    return { landmarks: generateFallbackLandmarks(), isFallback: true, worldLandmarks: null };
  } catch (e) {
    console.warn("[PoseDetector] 사진 감지 실패, fallback 사용", e);
    return { landmarks: generateFallbackLandmarks(), isFallback: true, worldLandmarks: null };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 영상 모드: detectForVideo
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * @param {HTMLVideoElement} videoElement
 * @param {number} timestampMs
 * @returns {{ landmarks, isFallback, worldLandmarks }}
 */
export async function detectPoseVideo(videoElement, timestampMs) {
  if (!poseLandmarker) {
    return { landmarks: generateFallbackLandmarks(), isFallback: true, worldLandmarks: null };
  }

  await ensureMode("VIDEO");

  try {
    const result = poseLandmarker.detectForVideo(videoElement, timestampMs);
    if (result.landmarks && result.landmarks.length > 0) {
      return {
        landmarks: result.landmarks[0],
        isFallback: false,
        worldLandmarks: result.worldLandmarks?.[0] || null,
      };
    }
    return { landmarks: null, isFallback: true, worldLandmarks: null };
  } catch (e) {
    console.warn("[PoseDetector] 영상 프레임 감지 실패", e);
    return { landmarks: null, isFallback: true, worldLandmarks: null };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 운동 자동 인식 -> motionTracker.js로 분리됨
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 영상 실시간 감지 (rAF 루프)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 영상 실시간 프레임 감지 시작
 *
 * @param {HTMLVideoElement} videoElement - 재생 중인 video
 * @param {Object} callbacks
 *   onFrame({ landmarks, isFallback, timestamp, frameIndex })
 *   onExerciseDetected({ key, confidence, top3 })
 *   onWorstFrame({ canvas, landmarks, timestamp, score })
 *   onProgress(percent)
 *   onComplete()
 *   onError(PoseDetectorError)
 * @returns {{ stop, motionTracker }}
 */
export async function startVideoDetection(videoElement, callbacks = {}) {
  const { onFrame, onExerciseDetected, onWorstFrame, onProgress, onComplete, onError } = callbacks;

  if (!videoElement || !(videoElement instanceof HTMLVideoElement)) {
    onError?.(new PoseDetectorError("유효한 video 엘리먼트가 필요합니다", ERROR_CODES.VIDEO_LOAD_FAILED));
    return { stop: () => {}, motionTracker: null };
  }

  if (videoElement.duration > MAX_VIDEO_DURATION) {
    onError?.(new PoseDetectorError(
      `영상이 너무 깁니다 (${Math.round(videoElement.duration)}초). 최대 ${MAX_VIDEO_DURATION}초까지 지원합니다.`,
      ERROR_CODES.VIDEO_TOO_LONG
    ));
    return { stop: () => {}, motionTracker: null };
  }

  if (!poseLandmarker) {
    console.warn("[PoseDetector] 영상 fallback: 첫 프레임만 분석");
    const fallbackLandmarks = generateFallbackLandmarks();
    onFrame?.({ landmarks: fallbackLandmarks, isFallback: true, timestamp: 0, frameIndex: 0 });
    onProgress?.(100);
    onComplete?.();
    return { stop: () => {}, motionTracker: null };
  }

  const switched = await ensureMode("VIDEO");
  if (!switched) {
    onError?.(new PoseDetectorError("VIDEO 모드 전환 실패", ERROR_CODES.MODEL_LOAD_FAILED));
    return { stop: () => {}, motionTracker: null };
  }

  const motionTracker = new MotionTracker();
  isVideoProcessing = true;
  let frameIndex = 0;
  let lastDetectionTime = 0;
  let exerciseDetected = false;

  // Worst frame tracking
  let worstScore = Infinity;
  let worstFrameData = null;

  function calcPoseScore(landmarks) {
    if (!landmarks) return 0;
    const visibleCount = landmarks.filter((lm) => lm.visibility > 0.5).length;
    const avgVisibility = landmarks.reduce((s, lm) => s + lm.visibility, 0) / landmarks.length;

    const angles = extractAngles(landmarks);
    let angleScore = 100;
    if (angles) {
      if (angles.knee < 60) angleScore -= 20;
      if (angles.elbow < 30) angleScore -= 15;
      if (angles.torso > 80) angleScore -= 10;
    }

    return visibleCount * 3 + avgVisibility * 30 + angleScore;
  }

  function processFrame(now) {
    if (!isVideoProcessing) return;
    if (videoElement.paused || videoElement.ended) {
      finishProcessing();
      return;
    }

    frameIndex++;
    const elapsed = now - lastDetectionTime;
    const minInterval = 1000 / MAX_VIDEO_DETECTION_FPS;

    if (elapsed >= minInterval) {
      lastDetectionTime = now;

      const timestampMs = Math.round(videoElement.currentTime * 1000);

      try {
        const result = poseLandmarker.detectForVideo(videoElement, timestampMs);

        if (result.landmarks && result.landmarks.length > 0) {
          const landmarks = result.landmarks[0];

          onFrame?.({
            landmarks,
            worldLandmarks: result.worldLandmarks?.[0] || null,
            isFallback: false,
            timestamp: videoElement.currentTime,
            frameIndex,
          });

          const motionResult = motionTracker.addFrame(landmarks, timestampMs);
          if (motionResult && !exerciseDetected) {
            exerciseDetected = true;
            onExerciseDetected?.(motionResult);
          }

          const score = calcPoseScore(landmarks);
          if (score < worstScore && score > 0) {
            worstScore = score;
            const snapCanvas = document.createElement("canvas");
            snapCanvas.width = videoElement.videoWidth;
            snapCanvas.height = videoElement.videoHeight;
            snapCanvas.getContext("2d").drawImage(videoElement, 0, 0);
            worstFrameData = { canvas: snapCanvas, landmarks, timestamp: videoElement.currentTime, score };
          }
        }
      } catch (err) {
        console.warn("[PoseDetector] 프레임 스킵:", err);
      }

      if (videoElement.duration > 0) {
        onProgress?.(Math.round((videoElement.currentTime / videoElement.duration) * 100));
      }
    }

    videoRafId = requestAnimationFrame(processFrame);
  }

  function finishProcessing() {
    isVideoProcessing = false;
    if (videoRafId) { cancelAnimationFrame(videoRafId); videoRafId = null; }
    if (worstFrameData) onWorstFrame?.(worstFrameData);
    onProgress?.(100);
    onComplete?.();
  }

  videoRafId = requestAnimationFrame(processFrame);

  const onEnded = () => finishProcessing();
  videoElement.addEventListener("ended", onEnded, { once: true });

  return {
    stop: () => {
      videoElement.removeEventListener("ended", onEnded);
      finishProcessing();
    },
    motionTracker,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 영상 파일 유효성 검사 + 로드
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * @param {File} videoFile
 * @returns {Promise<HTMLVideoElement>}
 */
export function loadVideoFile(videoFile) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";

    const url = URL.createObjectURL(videoFile);
    let loadTimeout;

    loadTimeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new PoseDetectorError("영상 로드 타임아웃 (15초)", ERROR_CODES.VIDEO_LOAD_FAILED));
    }, 15000);

    video.onloadedmetadata = () => {
      clearTimeout(loadTimeout);

      if (video.duration > MAX_VIDEO_DURATION) {
        URL.revokeObjectURL(url);
        reject(new PoseDetectorError(
          `영상이 너무 깁니다 (${Math.round(video.duration)}초). 최대 ${MAX_VIDEO_DURATION}초까지 지원합니다.`,
          ERROR_CODES.VIDEO_TOO_LONG
        ));
        return;
      }

      videoUrls.set(video, url);
      resolve(video);
    };

    video.onerror = () => {
      clearTimeout(loadTimeout);
      URL.revokeObjectURL(url);
      const mediaError = video.error;
      let message = "영상 로드 실패";
      let code = ERROR_CODES.VIDEO_LOAD_FAILED;

      if (mediaError) {
        switch (mediaError.code) {
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            message = "지원하지 않는 영상 코덱입니다. H.264/VP8/VP9 코덱의 MP4 또는 WebM을 사용하세요.";
            code = ERROR_CODES.CODEC_UNSUPPORTED;
            break;
          case MediaError.MEDIA_ERR_DECODE:
            message = "영상 디코딩 실패. 파일이 손상되었을 수 있습니다.";
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            message = "영상 로드 중 네트워크 오류가 발생했습니다.";
            break;
        }
      }

      reject(new PoseDetectorError(message, code));
    };

    video.src = url;
  });
}

/**
 * 영상 리소스 해제
 */
export function releaseVideo(videoElement) {
  if (!videoElement) return;
  stopVideoDetection();
  const storedUrl = videoUrls.get(videoElement);
  if (storedUrl) {
    URL.revokeObjectURL(storedUrl);
    videoUrls.delete(videoElement);
  }
  videoElement.src = "";
  videoElement.load();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 영상 감지 중지
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function stopVideoDetection() {
  isVideoProcessing = false;
  if (videoRafId) {
    cancelAnimationFrame(videoRafId);
    videoRafId = null;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 유틸리티
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function getFallbackLandmarks() {
  return generateFallbackLandmarks();
}

export function isInitialized() {
  return poseLandmarker !== null;
}

export function getCurrentMode() {
  return currentRunningMode;
}

/**
 * 완전 리셋 (테스트/재초기화용)
 */
export function resetDetector() {
  stopVideoDetection();
  if (poseLandmarker) {
    try { poseLandmarker.close(); } catch { /* ignore */ }
  }
  poseLandmarker = null;
  currentRunningMode = null;
  initPromise = null;
  mediapipeModule = null;
}

