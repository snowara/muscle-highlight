import { EXERCISE_DB } from "../data/exercises";
import { MUSCLE_REGIONS } from "../data/muscles";
import { renderMuscleOverlay } from "./muscleRenderer";

const BRAND_BAR_HEIGHT = 60;

function drawBrandBar(ctx, w, y, exercise, brand) {
  const { gymName, tagline, brandColor } = brand;
  const ex = EXERCISE_DB[exercise];

  // background
  ctx.fillStyle = "#0a0a1a";
  ctx.fillRect(0, y, w, BRAND_BAR_HEIGHT);

  // accent line
  ctx.fillStyle = brandColor;
  ctx.fillRect(0, y, w, 2);

  // left: gym name
  ctx.fillStyle = brandColor;
  ctx.font = "bold 16px 'Pretendard', -apple-system, sans-serif";
  ctx.fillText(gymName, 14, y + 26);

  // left: exercise
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "11px 'Pretendard', -apple-system, sans-serif";
  ctx.fillText(`${ex.icon} ${ex.name}`, 14, y + 44);

  // right: primary muscles
  const primaryLabels = ex.primary.map((k) => MUSCLE_REGIONS[k]?.label).filter(Boolean).join(" · ");
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "11px 'Pretendard', -apple-system, sans-serif";
  const rightX = w - 14;
  ctx.textAlign = "right";
  ctx.fillText(primaryLabels, rightX, y + 26);

  // right: tagline
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "10px 'Pretendard', -apple-system, sans-serif";
  ctx.fillText(tagline, rightX, y + 44);
  ctx.textAlign = "left";
}

export function createCompositeCanvas(sourceCanvas, image, landmarks, exerciseKey, options, brand) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const compositeCanvas = document.createElement("canvas");
  compositeCanvas.width = w;
  compositeCanvas.height = h + BRAND_BAR_HEIGHT;
  const ctx = compositeCanvas.getContext("2d");

  // draw original image
  ctx.drawImage(image, 0, 0, w, h);

  // draw muscle overlay
  renderMuscleOverlay(ctx, landmarks, exerciseKey, w, h, { ...options, time: 0 });

  // draw brand bar
  drawBrandBar(ctx, w, h, exerciseKey, brand);

  return compositeCanvas;
}

export async function downloadImage(compositeCanvas, gymName, exerciseName) {
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
