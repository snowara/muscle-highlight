let poseLandmarker = null;
let initPromise = null;

function generateFallbackLandmarks() {
  const lm = new Array(33).fill(null).map(() => ({ x: 0, y: 0, z: 0, visibility: 0 }));
  lm[0]  = { x: 0.50, y: 0.12, z: 0, visibility: 1 }; // nose
  lm[11] = { x: 0.38, y: 0.28, z: 0, visibility: 1 }; // left shoulder
  lm[12] = { x: 0.62, y: 0.28, z: 0, visibility: 1 }; // right shoulder
  lm[13] = { x: 0.32, y: 0.42, z: 0, visibility: 1 }; // left elbow
  lm[14] = { x: 0.68, y: 0.42, z: 0, visibility: 1 }; // right elbow
  lm[15] = { x: 0.28, y: 0.55, z: 0, visibility: 1 }; // left wrist
  lm[16] = { x: 0.72, y: 0.55, z: 0, visibility: 1 }; // right wrist
  lm[23] = { x: 0.42, y: 0.52, z: 0, visibility: 1 }; // left hip
  lm[24] = { x: 0.58, y: 0.52, z: 0, visibility: 1 }; // right hip
  lm[25] = { x: 0.40, y: 0.72, z: 0, visibility: 1 }; // left knee
  lm[26] = { x: 0.60, y: 0.72, z: 0, visibility: 1 }; // right knee
  lm[27] = { x: 0.40, y: 0.92, z: 0, visibility: 1 }; // left ankle
  lm[28] = { x: 0.60, y: 0.92, z: 0, visibility: 1 }; // right ankle
  return lm;
}

export async function initPoseDetector(onStatusChange) {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      onStatusChange?.("loading");
      const { PoseLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        numPoses: 1,
      });

      onStatusChange?.("ready");
      return true;
    } catch (e) {
      console.warn("MediaPipe GPU failed, trying CPU...", e);
      try {
        const { PoseLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "CPU",
          },
          runningMode: "IMAGE",
          numPoses: 1,
        });
        onStatusChange?.("ready");
        return true;
      } catch (e2) {
        console.warn("MediaPipe init failed entirely, using fallback", e2);
        onStatusChange?.("fallback");
        return false;
      }
    }
  })();

  return initPromise;
}

export async function detectPose(imageElement) {
  if (!poseLandmarker) {
    return { landmarks: generateFallbackLandmarks(), isFallback: true };
  }

  try {
    const result = poseLandmarker.detect(imageElement);
    if (result.landmarks && result.landmarks.length > 0) {
      return { landmarks: result.landmarks[0], isFallback: false };
    }
    return { landmarks: generateFallbackLandmarks(), isFallback: true };
  } catch (e) {
    console.warn("Pose detection failed, using fallback", e);
    return { landmarks: generateFallbackLandmarks(), isFallback: true };
  }
}

export function getFallbackLandmarks() {
  return generateFallbackLandmarks();
}
