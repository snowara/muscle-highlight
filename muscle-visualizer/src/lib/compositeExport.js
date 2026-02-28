import { EXERCISE_DB } from "../data/exercises";
import { MUSCLE_REGIONS } from "../data/muscles";
import { renderMuscleOverlay } from "./muscleRenderer";
import { getScoreColor } from "./poseAnalyzer";

const BRAND_BAR_HEIGHT = 60;

function drawBrandBar(ctx, w, y, exercise, brand, analysis) {
  const { gymName, tagline, brandColor } = brand;
  const ex = EXERCISE_DB[exercise];

  ctx.fillStyle = "#0a0a1a";
  ctx.fillRect(0, y, w, BRAND_BAR_HEIGHT);

  const accentColor = analysis?.level ? getScoreColor(analysis.level).bg : brandColor;
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, y, w, 2);

  ctx.fillStyle = brandColor;
  ctx.font = "bold 16px 'Pretendard', -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(gymName, 14, y + 26);

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "11px 'Pretendard', -apple-system, sans-serif";
  ctx.fillText(`${ex.icon} ${ex.name}`, 14, y + 44);

  // Score badge on the right
  if (analysis) {
    const scoreColor = getScoreColor(analysis.level);
    ctx.textAlign = "right";
    ctx.fillStyle = scoreColor.bg;
    ctx.font = "bold 18px 'Pretendard', -apple-system, sans-serif";
    ctx.fillText(`${analysis.score}점`, w - 14, y + 28);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "10px 'Pretendard', -apple-system, sans-serif";
    ctx.fillText(scoreColor.label, w - 14, y + 44);
  } else {
    const primaryLabels = Object.keys(ex.primary || {}).map((k) => MUSCLE_REGIONS[k]?.label).filter(Boolean).join(" · ");
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "11px 'Pretendard', -apple-system, sans-serif";
    ctx.fillText(primaryLabels, w - 14, y + 26);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "10px 'Pretendard', -apple-system, sans-serif";
    ctx.fillText(tagline, w - 14, y + 44);
  }
  ctx.textAlign = "left";
}

export function createCompositeCanvas(sourceCanvas, image, landmarks, exerciseKey, options, brand, analysis) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const compositeCanvas = document.createElement("canvas");
  compositeCanvas.width = w;
  compositeCanvas.height = h + BRAND_BAR_HEIGHT;
  const ctx = compositeCanvas.getContext("2d");

  ctx.drawImage(image, 0, 0, w, h);
  renderMuscleOverlay(ctx, landmarks, exerciseKey, w, h, { ...options, time: 0 });
  drawBrandBar(ctx, w, h, exerciseKey, brand, analysis);

  return compositeCanvas;
}

export function downloadImage(compositeCanvas, gymName, exerciseName) {
  const safeName = gymName.replace(/[^a-zA-Z0-9가-힣]/g, "_");
  const safeExercise = exerciseName.replace(/[^a-zA-Z0-9가-힣]/g, "_");
  const filename = `${safeName}_${safeExercise}_muscle.png`;
  const link = document.createElement("a");
  link.download = filename;
  link.href = compositeCanvas.toDataURL("image/png");
  link.click();
}

export async function copyToClipboard(compositeCanvas) {
  try {
    const blob = await new Promise((resolve) =>
      compositeCanvas.toBlob(resolve, "image/png")
    );
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * 영상 worst frame 합성 캔버스 생성
 *
 * @param {Object} worstFrame - { canvas, landmarks, timestamp, score }
 * @param {string} exerciseKey
 * @param {Object} options
 * @param {Object} brand
 * @param {Object} analysis - poseAnalyzer 결과
 * @returns {HTMLCanvasElement}
 */
export function createWorstFrameComposite(worstFrame, exerciseKey, options, brand, analysis) {
  const { canvas: frameCanvas, landmarks } = worstFrame;
  return createCompositeCanvas(frameCanvas, frameCanvas, landmarks, exerciseKey, options, brand, analysis);
}

/**
 * 영상 Blob 다운로드
 */
export function downloadVideo(blob, gymName, exerciseName) {
  const safeName = gymName.replace(/[^a-zA-Z0-9가-힣]/g, "_");
  const safeExercise = exerciseName.replace(/[^a-zA-Z0-9가-힣]/g, "_");
  const ext = blob.type.includes("mp4") ? "mp4" : "webm";
  const filename = `${safeName}_${safeExercise}_muscle.${ext}`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
