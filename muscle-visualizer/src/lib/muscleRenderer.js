import { MUSCLE_REGIONS } from "../data/muscles";
import { EXERCISE_DB } from "../data/exercises";
import { getMusclePositions, getBodyScale, getSkeletonConnections, MUSCLE_SHAPES } from "./muscleMap";

// 색상 상수
const GOOD_COLOR = "#E84040"; // 빨간/코랄 - 올바른 자세 (근육 활성화)
const BAD_COLOR = "#FFB020";  // 앰버/노란 - 잘못된 자세 (경고)

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

  // Layer 1: 넓은 확산 (레퍼런스처럼 넓게 퍼지는 영역)
  const outerR = radius * 2.8;
  const g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, outerR);
  g1.addColorStop(0, color + hexAlpha(alpha * 1.0));
  g1.addColorStop(0.3, color + hexAlpha(alpha * 0.85));
  g1.addColorStop(0.55, color + hexAlpha(alpha * 0.5));
  g1.addColorStop(0.8, color + hexAlpha(alpha * 0.15));
  g1.addColorStop(1, color + "00");
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.fillStyle = g1;
  ctx.fill();

  // Layer 2: 중간 코어 (근육 위에 칠해진 느낌)
  const midR = radius * 1.5;
  const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, midR);
  g2.addColorStop(0, color + hexAlpha(alpha * 0.95));
  g2.addColorStop(0.4, color + hexAlpha(alpha * 0.65));
  g2.addColorStop(0.8, color + hexAlpha(alpha * 0.2));
  g2.addColorStop(1, color + "00");
  ctx.beginPath();
  ctx.arc(0, 0, midR, 0, Math.PI * 2);
  ctx.fillStyle = g2;
  ctx.fill();

  // Layer 3: 하이라이트 (중심부 밝은 강조)
  const coreR = radius * 0.5;
  const g3 = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
  g3.addColorStop(0, "#FFFFFF" + hexAlpha(alpha * 0.3));
  g3.addColorStop(0.3, color + hexAlpha(alpha * 0.8));
  g3.addColorStop(1, color + "00");
  ctx.beginPath();
  ctx.arc(0, 0, coreR, 0, Math.PI * 2);
  ctx.fillStyle = g3;
  ctx.fill();

  ctx.restore();
}

const RENDER_ORDER = [
  "lowerBack", "core", "hamstrings", "quadriceps", "calves", "glutes",
  "lats", "forearms", "biceps", "triceps", "chest", "shoulders", "traps",
];

function drawMuscleLabel(ctx, points, label, color, status, canvasW, placedLabels) {
  if (!points || points.length === 0) return;

  let cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  let cy = points.reduce((s, p) => s + p.y, 0) / points.length;

  const fontSize = Math.max(10, Math.min(14, canvasW * 0.022));

  ctx.save();
  ctx.font = `bold ${fontSize}px 'Pretendard', -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const statusIcon = status === "bad" ? "✕" : "✓";
  const text = `${statusIcon} ${label}`;
  const metrics = ctx.measureText(text);
  const pw = metrics.width + 14;
  const ph = fontSize + 8;

  let lx = cx - pw / 2;
  let ly = cy - fontSize * 1.8 - ph / 2;

  if (placedLabels) {
    const offsets = [
      [0, 0], [0, -(ph + 4)], [0, (ph + 4)],
      [pw * 0.6, 0], [-(pw * 0.6), 0],
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
  const bgColor = status === "bad" ? "rgba(255,176,32,0.2)" : "rgba(232,64,64,0.2)";
  const borderColor = status === "bad" ? "rgba(255,176,32,0.5)" : "rgba(232,64,64,0.5)";
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.beginPath();
  ctx.roundRect(lx, ly, pw, ph, ph / 2);
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // status icon
  ctx.fillStyle = color;
  ctx.font = `bold ${fontSize - 1}px 'Pretendard', sans-serif`;
  ctx.fillText(text, lx + pw / 2, ly + ph / 2);

  ctx.restore();
}

/**
 * 근육 오버레이 렌더링 (빨간/코랄=활성화, 앰버=잘못된 자세)
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} landmarks
 * @param {string} exerciseKey
 * @param {number} canvasW
 * @param {number} canvasH
 * @param {Object} options - { glowIntensity, showSkeleton, showLabels, time, muscleStatus }
 */
export function renderMuscleOverlay(
  ctx, landmarks, exerciseKey, canvasW, canvasH,
  { glowIntensity = 0.7, showSkeleton = false, showLabels = true, time = 0, muscleStatus = {} }
) {
  const exercise = EXERCISE_DB[exerciseKey];
  if (!exercise || !landmarks) return;

  const positions = getMusclePositions(landmarks, canvasW, canvasH);
  const bodyScale = getBodyScale(landmarks, canvasW);
  const pulse = 0.92 + Math.sin(time * 1.5) * 0.08;

  ctx.save();
  ctx.globalCompositeOperation = "screen";

  // Collect all active muscles
  const activeMuscles = new Map();
  Object.keys(exercise.primary || {}).forEach((k) => activeMuscles.set(k, "primary"));
  Object.keys(exercise.secondary || {}).forEach((k) => {
    if (!activeMuscles.has(k)) activeMuscles.set(k, "secondary");
  });

  // Render in anatomical depth order
  RENDER_ORDER.forEach((muscleKey) => {
    const level = activeMuscles.get(muscleKey);
    if (!level) return;
    const points = positions[muscleKey];
    const shape = MUSCLE_SHAPES[muscleKey];
    if (!points) return;

    const isPrimary = level === "primary";
    const status = muscleStatus[muscleKey] || "good";
    const color = status === "bad" ? BAD_COLOR : GOOD_COLOR;

    const radius = (isPrimary ? 35 : 25) * bodyScale * (shape?.scale || 1);
    const alpha = (isPrimary ? 0.75 : 0.4) * glowIntensity * pulse;
    points.forEach((pt) => drawShapedGlow(ctx, pt, color, radius, alpha, shape));
  });

  ctx.restore();

  // Labels
  if (showLabels) {
    const placedLabels = [];
    RENDER_ORDER.forEach((muscleKey) => {
      if (!activeMuscles.has(muscleKey)) return;
      if (!Object.keys(exercise.primary || {}).includes(muscleKey)) return;
      const region = MUSCLE_REGIONS[muscleKey];
      const points = positions[muscleKey];
      if (!region || !points) return;

      const status = muscleStatus[muscleKey] || "good";
      const color = status === "bad" ? BAD_COLOR : GOOD_COLOR;
      drawMuscleLabel(ctx, points, region.label, color, status, canvasW, placedLabels);
    });
  }

  // Skeleton
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

/**
 * 영상 프레임용 경량 렌더링 (라벨/스켈레톤 생략, 성능 우선)
 */
export function renderMuscleOverlayLite(ctx, landmarks, exerciseKey, canvasW, canvasH, options = {}) {
  renderMuscleOverlay(ctx, landmarks, exerciseKey, canvasW, canvasH, {
    ...options,
    showLabels: false,
    showSkeleton: false,
  });
}
