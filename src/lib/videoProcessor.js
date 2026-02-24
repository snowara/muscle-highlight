import { detectPose } from "./poseDetector";
import { renderMuscleOverlay } from "./muscleRenderer";
import { classifyExercise } from "./exerciseClassifier";

/**
 * Process a video file: extract frames, apply muscle overlay, encode to output video.
 * Uses Canvas + MediaRecorder API for browser-native video encoding.
 */
export async function processVideo(
  videoFile,
  exerciseKey, // "auto" or specific key
  options,
  onProgress,
  onExerciseDetected
) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const url = URL.createObjectURL(videoFile);
    video.src = url;

    video.onloadedmetadata = async () => {
      // cap resolution for performance
      const maxSize = 720;
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

      // setup MediaRecorder
      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 4_000_000,
      });
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        URL.revokeObjectURL(url);
        const blob = new Blob(chunks, { type: mimeType });
        resolve(blob);
      };

      recorder.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };

      // seek-based frame extraction for accuracy
      const duration = video.duration;
      const fps = 24;
      const totalFrames = Math.floor(duration * fps);
      const frameInterval = 1 / fps;

      recorder.start();

      let landmarks = null;
      let currentExercise = exerciseKey === "auto" ? "squat" : exerciseKey;
      const analyzeEveryN = 3; // analyze pose every N frames for perf

      for (let i = 0; i < totalFrames; i++) {
        const time = i * frameInterval;

        // seek to frame
        await seekTo(video, time);

        // draw video frame
        ctx.drawImage(video, 0, 0, w, h);

        // detect pose periodically
        if (i % analyzeEveryN === 0) {
          try {
            const result = await detectPose(canvas);
            landmarks = result.landmarks;

            // auto-classify exercise from first valid detection
            if (exerciseKey === "auto" && !result.isFallback && i < 30) {
              const detected = classifyExercise(landmarks);
              if (detected.confidence > 30) {
                currentExercise = detected.key;
                onExerciseDetected?.(detected);
              }
            }
          } catch {
            // keep previous landmarks
          }
        }

        // render muscle overlay
        if (landmarks) {
          renderMuscleOverlay(ctx, landmarks, currentExercise, w, h, {
            ...options,
            time: time,
          });
        }

        // wait for frame to be captured
        await new Promise((r) => setTimeout(r, 1000 / fps));

        onProgress?.(Math.round(((i + 1) / totalFrames) * 100));
      }

      recorder.stop();
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("영상 로드 실패"));
    };
  });
}

function seekTo(video, time) {
  return new Promise((resolve) => {
    video.currentTime = time;
    video.onseeked = () => resolve();
  });
}

export function downloadVideo(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
