/**
 * videoProcessor.js — 영상 처리 파이프라인
 *
 * 새 poseDetector의 영상 모드를 활용한 2가지 처리 방식:
 *
 * 1. 실시간 분석 (라이브 오버레이): startVideoDetection으로 재생하면서 실시간 감지
 * 2. 오프라인 렌더링 (내보내기용): 프레임 단위 seek → 감지 → 오버레이 → MediaRecorder
 *
 * 오프라인 렌더링은 seek 기반으로 정확하지만 느림.
 * 실시간 분석은 rAF 기반으로 빠르지만 녹화 품질은 오프라인이 좋음.
 */

import { detectPose, loadVideoFile, releaseVideo, PoseDetectorError, ERROR_CODES } from "./poseDetector";
import { renderMuscleOverlay, renderMuscleOverlayLite } from "./muscleRenderer";
import { classifyExercise } from "./exerciseClassifier";
import { analyzePose } from "./poseAnalyzer";

const MAX_RENDER_SIZE = 720;

/**
 * 오프라인 영상 렌더링 (내보내기용)
 *
 * seek 기반 프레임 추출 → 포즈 감지 → 근육 오버레이 → MediaRecorder 녹화
 *
 * @param {File} videoFile
 * @param {string} exerciseKey - "auto" 또는 특정 운동 키
 * @param {Object} overlayOptions - renderMuscleOverlay 옵션
 * @param {function} onProgress - (percent: number)
 * @param {function} onExerciseDetected - (result) 자동 인식된 운동
 * @returns {Promise<Blob>} 렌더링된 영상 Blob
 */
export async function renderVideoOffline(
  videoFile,
  exerciseKey,
  overlayOptions = {},
  onProgress,
  onExerciseDetected
) {
  const video = await loadVideoFile(videoFile);

  return new Promise((resolve, reject) => {
    const tryProcess = async () => {
      try {
        const blob = await _processFrames(video, exerciseKey, overlayOptions, onProgress, onExerciseDetected);
        releaseVideo(video);
        resolve(blob);
      } catch (e) {
        releaseVideo(video);
        reject(e);
      }
    };

    if (video.readyState >= 2) {
      tryProcess();
    } else {
      video.onloadeddata = () => tryProcess();
      video.onerror = () => {
        releaseVideo(video);
        reject(new PoseDetectorError("영상 로드 실패", ERROR_CODES.VIDEO_LOAD_FAILED));
      };
    }
  });
}

async function _processFrames(video, exerciseKey, overlayOptions, onProgress, onExerciseDetected) {
  // 해상도 제한
  let w = video.videoWidth;
  let h = video.videoHeight;
  if (Math.max(w, h) > MAX_RENDER_SIZE) {
    const scale = MAX_RENDER_SIZE / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  // MediaRecorder 설정
  const stream = canvas.captureStream(30);
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : MediaRecorder.isTypeSupported("video/webm")
      ? "video/webm"
      : "";

  if (!mimeType) {
    throw new PoseDetectorError(
      "이 브라우저에서는 영상 녹화를 지원하지 않습니다. Chrome 또는 Firefox를 사용하세요.",
      ERROR_CODES.CODEC_UNSUPPORTED
    );
  }

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 4_000_000,
  });
  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingDone = new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };
    recorder.onerror = (e) => reject(e);
  });

  // 프레임 처리
  const duration = video.duration;
  const fps = 24;
  const totalFrames = Math.floor(duration * fps);
  const frameInterval = 1 / fps;
  const analyzeEveryN = 3;

  recorder.start();

  let landmarks = null;
  let currentExercise = exerciseKey === "auto" ? "squat" : exerciseKey;
  let exerciseAutoDetected = false;
  let muscleStatus = {};

  for (let i = 0; i < totalFrames; i++) {
    const time = i * frameInterval;

    await _seekTo(video, time);
    ctx.drawImage(video, 0, 0, w, h);

    if (i % analyzeEveryN === 0) {
      try {
        const result = await detectPose(canvas);
        landmarks = result.landmarks;

        if (exerciseKey === "auto" && !result.isFallback && !exerciseAutoDetected && i < 30) {
          const detected = classifyExercise(landmarks);
          if (detected.confidence > 30) {
            currentExercise = detected.key;
            exerciseAutoDetected = true;
            onExerciseDetected?.(detected);
          }
        }

        // 자세 분석으로 근육별 상태 업데이트
        if (!result.isFallback) {
          const analysis = analyzePose(landmarks, currentExercise);
          muscleStatus = analysis.muscleStatus;
        }
      } catch {
        // 이전 랜드마크 유지
      }
    }

    if (landmarks) {
      renderMuscleOverlayLite(ctx, landmarks, currentExercise, w, h, {
        ...overlayOptions,
        time,
        muscleStatus,
      });
    }

    await new Promise((r) => setTimeout(r, 1000 / fps));
    onProgress?.(Math.round(((i + 1) / totalFrames) * 100));
  }

  recorder.stop();
  return recordingDone;
}

function _seekTo(video, time) {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.01) {
      resolve();
      return;
    }
    video.currentTime = time;
    video.onseeked = () => resolve();
  });
}

/**
 * 영상에서 특정 시간의 프레임을 Canvas로 캡처
 */
export async function captureFrame(videoElement, timeSeconds) {
  await _seekTo(videoElement, timeSeconds);

  const canvas = document.createElement("canvas");
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(videoElement, 0, 0);

  return canvas;
}

/**
 * 영상 썸네일 생성 (첫 프레임)
 */
export async function generateThumbnail(videoFile, maxSize = 320) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const url = URL.createObjectURL(videoFile);
    video.src = url;

    video.onloadeddata = () => {
      let w = video.videoWidth;
      let h = video.videoHeight;
      if (Math.max(w, h) > maxSize) {
        const scale = maxSize / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, w, h);

      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("썸네일 생성 실패"));
    };
  });
}

/**
 * 영상 메타데이터 가져오기
 */
export async function getVideoMetadata(videoFile) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    const url = URL.createObjectURL(videoFile);
    video.src = url;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        fps: 30,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("영상 메타데이터 로드 실패"));
    };
  });
}
