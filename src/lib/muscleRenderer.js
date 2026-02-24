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

// Anatomical render order (deep → superficial). Later = on top visually.
const RENDER_ORDER = [
  "lowerBack", "core", "hamstrings", "quadriceps", "calves", "glutes",
  "lats", "forearms", "biceps", "triceps", "chest", "shoulders", "traps",
];

function drawMuscleLabel(ctx, points, label, color, canvasW, placedLabels) {
  if (!points || points.length === 0) return;

  // find centroid of all points
  let cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  let cy = points.reduce((s, p) => s + p.y, 0) / points.length;

  const fontSize = Math.max(10, Math.min(14, canvasW * 0.022));

  ctx.save();
  ctx.font = `bold ${fontSize}px 'Pretendard', -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const text = label.toUpperCase();
  const metrics = ctx.measureText(text);
  const pw = metrics.width + 12;
  const ph = fontSize + 6;

  // Label position (above the centroid by default)
  let lx = cx - pw / 2;
  let ly = cy - fontSize * 1.8 - ph / 2;

  // Anti-overlap: check against already placed labels and offset if needed
  if (placedLabels) {
    const offsets = [
      [0, 0], [0, -(ph + 4)], [0, (ph + 4)],
      [pw * 0.6, 0], [-(pw * 0.6), 0],
      [pw * 0.5, -(ph + 2)], [-(pw * 0.5), -(ph + 2)],
      [pw * 0.5, (ph + 2)], [-(pw * 0.5), (ph + 2)],
    ];

    for (const [ox, oy] of offsets) {
      const testX = lx + ox;
      const testY = ly + oy;
      const hasOverlap = placedLabels.some((r) =>
        testX < r.x + r.w + 4 && testX + pw + 4 > r.x &&
        testY < r.y + r.h + 4 && testY + ph + 4 > r.y
      );
      if (!hasOverlap) {
        lx = testX;
        ly = testY;
        break;
      }
    }
    placedLabels.push({ x: lx, y: ly, w: pw, h: ph });
  }

  // pill background
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  ctx.roundRect(lx, ly, pw, ph, ph / 2);
  ctx.fill();

  // colored dot
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(lx + 8, ly + ph / 2, 3, 0, Math.PI * 2);
  ctx.fill();

  // text
  ctx.fillStyle = "#fff";
  ctx.fillText(text, lx + pw / 2 + 4, ly + ph / 2);

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

  // Collect all active muscles with their activation level
  const activeMuscles = new Map();
  exercise.primary.forEach((k) => activeMuscles.set(k, "primary"));
  exercise.secondary.forEach((k) => {
    if (!activeMuscles.has(k)) activeMuscles.set(k, "secondary");
  });

  // Render in anatomical depth order (deep muscles first, superficial last)
  RENDER_ORDER.forEach((muscleKey) => {
    const level = activeMuscles.get(muscleKey);
    if (!level) return;
    const region = MUSCLE_REGIONS[muscleKey];
    const points = positions[muscleKey];
    const shape = MUSCLE_SHAPES[muscleKey];
    if (!region || !points) return;

    const isPrimary = level === "primary";
    const radius = (isPrimary ? 28 : 20) * bodyScale * (shape?.scale || 1);
    const alpha = (isPrimary ? 0.5 : 0.25) * glowIntensity * pulse;
    points.forEach((pt) => drawShapedGlow(ctx, pt, region.color, radius, alpha, shape));
  });

  ctx.restore();

  // muscle name labels with anti-overlap
  if (showLabels) {
    const drawnLabels = new Set();
    const placedLabels = []; // bounding boxes for collision detection

    // Draw primary labels first (in render order for consistent placement)
    RENDER_ORDER.forEach((muscleKey) => {
      if (!exercise.primary.includes(muscleKey)) return;
      if (drawnLabels.has(muscleKey)) return;
      drawnLabels.add(muscleKey);
      const region = MUSCLE_REGIONS[muscleKey];
      const points = positions[muscleKey];
      if (!region || !points) return;
      drawMuscleLabel(ctx, points, region.label, region.color, canvasW, placedLabels);
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
