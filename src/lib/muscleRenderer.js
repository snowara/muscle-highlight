import { MUSCLE_REGIONS } from "../data/muscles";
import { EXERCISE_DB } from "../data/exercises";
import { getMusclePositions, getBodyScale, getSkeletonConnections, MUSCLE_SHAPES } from "./muscleMap";

function hexAlpha(a) {
  const val = Math.round(Math.max(0, Math.min(1, a)) * 255);
  return val.toString(16).padStart(2, "0");
}

function drawShapedGlow(ctx, point, color, radius, alpha, shape) {
  const { angle = 0, aspect = 1.0 } = shape || {};

  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(angle);
  ctx.scale(1, 1 / Math.max(aspect, 0.3));

  // outer glow (wide spread)
  const outerR = radius * 2.4;
  const g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, outerR);
  g1.addColorStop(0, color + hexAlpha(alpha * 0.95));
  g1.addColorStop(0.25, color + hexAlpha(alpha * 0.7));
  g1.addColorStop(0.5, color + hexAlpha(alpha * 0.35));
  g1.addColorStop(0.75, color + hexAlpha(alpha * 0.1));
  g1.addColorStop(1, color + "00");
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.fillStyle = g1;
  ctx.fill();

  // mid layer (concentrated color)
  const midR = radius * 1.2;
  const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, midR);
  g2.addColorStop(0, color + hexAlpha(alpha * 0.85));
  g2.addColorStop(0.5, color + hexAlpha(alpha * 0.4));
  g2.addColorStop(1, color + "00");
  ctx.beginPath();
  ctx.arc(0, 0, midR, 0, Math.PI * 2);
  ctx.fillStyle = g2;
  ctx.fill();

  // bright core (white hot center)
  const coreR = radius * 0.4;
  const g3 = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
  g3.addColorStop(0, "#FFFFFF" + hexAlpha(alpha * 0.5));
  g3.addColorStop(0.4, color + hexAlpha(alpha * 0.7));
  g3.addColorStop(1, color + "00");
  ctx.beginPath();
  ctx.arc(0, 0, coreR, 0, Math.PI * 2);
  ctx.fillStyle = g3;
  ctx.fill();

  ctx.restore();
}

function drawMuscleLabel(ctx, points, label, color, canvasW) {
  if (!points || points.length === 0) return;

  // find centroid of all points
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;

  const fontSize = Math.max(10, Math.min(14, canvasW * 0.022));

  ctx.save();
  ctx.font = `bold ${fontSize}px 'Pretendard', -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // text background pill
  const text = label.toUpperCase();
  const metrics = ctx.measureText(text);
  const pw = metrics.width + 12;
  const ph = fontSize + 6;
  const px = cx - pw / 2;
  const py = cy - fontSize * 1.8 - ph / 2;

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, ph / 2);
  ctx.fill();

  // colored dot
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(px + 8, py + ph / 2, 3, 0, Math.PI * 2);
  ctx.fill();

  // text
  ctx.fillStyle = "#fff";
  ctx.fillText(text, cx + 4, py + ph / 2);

  ctx.restore();
}

export function renderMuscleOverlay(
  ctx,
  landmarks,
  exerciseKey,
  canvasW,
  canvasH,
  { glowIntensity = 0.7, showSkeleton = false, showLabels = true, time = 0 }
) {
  const exercise = EXERCISE_DB[exerciseKey];
  if (!exercise || !landmarks) return;

  const positions = getMusclePositions(landmarks, canvasW, canvasH);
  const bodyScale = getBodyScale(landmarks, canvasW);
  const pulse = 0.85 + Math.sin(time * 2) * 0.15;

  ctx.save();
  ctx.globalCompositeOperation = "screen";

  // primary muscles
  exercise.primary.forEach((muscleKey) => {
    const region = MUSCLE_REGIONS[muscleKey];
    const points = positions[muscleKey];
    const shape = MUSCLE_SHAPES[muscleKey];
    if (!region || !points) return;
    const radius = 28 * bodyScale * (shape?.scale || 1);
    const alpha = 0.5 * glowIntensity * pulse;
    points.forEach((pt) => drawShapedGlow(ctx, pt, region.color, radius, alpha, shape));
  });

  // secondary muscles
  exercise.secondary.forEach((muscleKey) => {
    const region = MUSCLE_REGIONS[muscleKey];
    const points = positions[muscleKey];
    const shape = MUSCLE_SHAPES[muscleKey];
    if (!region || !points) return;
    const radius = 20 * bodyScale * (shape?.scale || 1);
    const alpha = 0.25 * glowIntensity * pulse;
    points.forEach((pt) => drawShapedGlow(ctx, pt, region.color, radius, alpha, shape));
  });

  ctx.restore();

  // muscle name labels
  if (showLabels) {
    const drawnLabels = new Set();
    exercise.primary.forEach((muscleKey) => {
      if (drawnLabels.has(muscleKey)) return;
      drawnLabels.add(muscleKey);
      const region = MUSCLE_REGIONS[muscleKey];
      const points = positions[muscleKey];
      if (!region || !points) return;
      drawMuscleLabel(ctx, points, region.label, region.color, canvasW);
    });
  }

  // skeleton overlay
  if (showSkeleton) {
    const connections = getSkeletonConnections(landmarks, canvasW, canvasH);
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    connections.forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });

    const indices = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.setLineDash([]);
    indices.forEach((i) => {
      const x = landmarks[i].x * canvasW;
      const y = landmarks[i].y * canvasH;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
}
