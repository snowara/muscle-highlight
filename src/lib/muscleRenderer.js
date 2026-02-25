import { MUSCLE_REGIONS } from "../data/muscles";
import { EXERCISE_DB } from "../data/exercises";
import { getMusclePositions, getBodyScale, getSkeletonConnections, MUSCLE_SHAPES } from "./muscleMap";
import { analyzePose, getMuscleDisplayColor, getMuscleQuality, CORRECT_COLOR, INCORRECT_COLOR } from "./poseAnalyzer";

function hexAlpha(a) {
  const val = Math.round(Math.max(0, Math.min(1, a)) * 255);
  return val.toString(16).padStart(2, "0");
}

function drawShapedGlow(ctx, point, color, radius, alpha, shape, { isDanger = false, time = 0 } = {}) {
  const { angle = 0, aspect = 1.0 } = shape || {};

  // For red/danger muscles: fast pulsation and 20% larger radius
  let effectiveRadius = radius;
  let effectiveAlpha = alpha;
  if (isDanger) {
    effectiveAlpha = alpha * (0.6 + Math.sin(time * 6) * 0.4);
    effectiveRadius = radius * 1.2;
  }

  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(angle);
  ctx.scale(1, 1 / Math.max(aspect, 0.3));

  // outer glow (wide spread)
  const outerR = effectiveRadius * 2.4;
  const g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, outerR);
  g1.addColorStop(0, color + hexAlpha(effectiveAlpha * 0.95));
  g1.addColorStop(0.25, color + hexAlpha(effectiveAlpha * 0.7));
  g1.addColorStop(0.5, color + hexAlpha(effectiveAlpha * 0.35));
  g1.addColorStop(0.75, color + hexAlpha(effectiveAlpha * 0.1));
  g1.addColorStop(1, color + "00");
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.fillStyle = g1;
  ctx.fill();

  // mid layer (concentrated color)
  const midR = effectiveRadius * 1.2;
  const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, midR);
  g2.addColorStop(0, color + hexAlpha(effectiveAlpha * 0.85));
  g2.addColorStop(0.5, color + hexAlpha(effectiveAlpha * 0.4));
  g2.addColorStop(1, color + "00");
  ctx.beginPath();
  ctx.arc(0, 0, midR, 0, Math.PI * 2);
  ctx.fillStyle = g2;
  ctx.fill();

  // bright core (white hot center) — enhanced neon brightness for correct-form muscles
  const coreR = effectiveRadius * 0.4;
  const g3 = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
  const coreBrightness = isDanger ? 0.5 : 0.9; // Enhanced: 0.7 → 0.9 for blue neon
  g3.addColorStop(0, "#FFFFFF" + hexAlpha(effectiveAlpha * coreBrightness));
  g3.addColorStop(0.4, color + hexAlpha(effectiveAlpha * 0.7));
  g3.addColorStop(1, color + "00");
  ctx.beginPath();
  ctx.arc(0, 0, coreR, 0, Math.PI * 2);
  ctx.fillStyle = g3;
  ctx.fill();

  // Cool-white outer halo for correct-form (blue) muscles — subtle neon bloom
  if (!isDanger) {
    const haloR = effectiveRadius * 3;
    const g4 = ctx.createRadialGradient(0, 0, outerR * 0.8, 0, 0, haloR);
    g4.addColorStop(0, "#CCDDFF" + hexAlpha(effectiveAlpha * 0.08));
    g4.addColorStop(0.5, "#AACCFF" + hexAlpha(effectiveAlpha * 0.04));
    g4.addColorStop(1, "#AACCFF" + "00");
    ctx.beginPath();
    ctx.arc(0, 0, haloR, 0, Math.PI * 2);
    ctx.fillStyle = g4;
    ctx.fill();
  }

  // 4th "danger ring" for red muscles — thin ring outline at 3x radius
  if (isDanger) {
    const dangerRingR = effectiveRadius * 3;
    const ringPulse = 0.5 + Math.sin(time * 6 + 1.5) * 0.5; // slightly offset from main pulse
    ctx.beginPath();
    ctx.arc(0, 0, dangerRingR, 0, Math.PI * 2);
    ctx.strokeStyle = color + hexAlpha(effectiveAlpha * 0.35 * ringPulse);
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

// Anatomical render order (deep → superficial). Later = on top visually.
const RENDER_ORDER = [
  "lowerBack", "core", "hamstrings", "quadriceps", "calves", "glutes",
  "lats", "forearms", "biceps", "triceps", "chest", "shoulders", "traps",
];

function drawMuscleLabel(ctx, points, label, color, canvasW, placedLabels, scoreText) {
  if (!points || points.length === 0) return;

  let cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  let cy = points.reduce((s, p) => s + p.y, 0) / points.length;

  const fontSize = Math.max(10, Math.min(14, canvasW * 0.022));

  ctx.save();
  ctx.font = `bold ${fontSize}px 'Pretendard', -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const text = label.toUpperCase();
  const fullText = scoreText ? `${text} ${scoreText}` : text;
  const metrics = ctx.measureText(fullText);
  const pw = metrics.width + 16;
  const ph = fontSize + 8;

  let lx = cx - pw / 2;
  let ly = cy - fontSize * 1.8 - ph / 2;

  // Anti-overlap
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
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.beginPath();
  ctx.roundRect(lx, ly, pw, ph, ph / 2);
  ctx.fill();

  // colored dot
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(lx + 9, ly + ph / 2, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // label text
  const labelTextX = lx + 18;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.fillText(text, labelTextX, ly + ph / 2);

  // score badge next to label text
  if (scoreText) {
    const labelMetrics = ctx.measureText(text);
    const badgeX = labelTextX + labelMetrics.width + 6;
    const badgeW = ctx.measureText(scoreText).width + 8;
    const badgeH = fontSize - 2;
    const badgeY = ly + (ph - badgeH) / 2;

    // Determine badge color: parse score number, red if < 60, blue otherwise
    const scoreNum = parseInt(scoreText, 10);
    const badgeBg = isNaN(scoreNum) || scoreNum < 60 ? "rgba(255,59,92,0.8)" : "rgba(0,170,255,0.8)";

    ctx.fillStyle = badgeBg;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = `bold ${fontSize - 2}px 'Pretendard', -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(scoreText, badgeX + badgeW / 2, ly + ph / 2);
  }

  ctx.restore();
}

// Draw correction guide overlay on canvas
function drawCorrectionGuide(ctx, corrections, canvasW, canvasH) {
  if (!corrections || corrections.length === 0) return;

  const boxW = Math.min(canvasW - 24, 300);
  const lineH = 20;
  const padding = 12;
  const boxH = padding * 2 + corrections.length * lineH + 8;
  const boxX = canvasW - boxW - 12;
  const boxY = 12;

  ctx.save();

  // Background
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 10);
  ctx.fill();

  // Header
  ctx.fillStyle = INCORRECT_COLOR;
  ctx.font = "bold 12px 'Pretendard', -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("⚠ 자세 교정 필요", boxX + padding, boxY + padding + 4);

  // Corrections — with warning triangle icons
  ctx.font = "11px 'Pretendard', -apple-system, sans-serif";
  corrections.forEach((c, i) => {
    const y = boxY + padding + 20 + i * lineH;
    const severityColor = (c.severity === "high" || c.score < 40) ? INCORRECT_COLOR : "#FF8C42";

    // Draw warning triangle icon instead of colored dot
    const triX = boxX + padding + 6;
    const triY = y + 2;
    const triSize = 6;
    ctx.beginPath();
    ctx.moveTo(triX, triY - triSize);
    ctx.lineTo(triX + triSize, triY + triSize * 0.6);
    ctx.lineTo(triX - triSize, triY + triSize * 0.6);
    ctx.closePath();
    ctx.fillStyle = severityColor;
    ctx.fill();
    // Exclamation mark inside the triangle
    ctx.fillStyle = "#000";
    ctx.font = "bold 7px 'Pretendard', -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!", triX, triY);

    // Reset font/alignment for message text
    ctx.font = "11px 'Pretendard', -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    // Truncate if too long
    const maxChars = Math.floor((boxW - padding * 2 - 20) / 7);
    const msg = c.message.length > maxChars ? c.message.slice(0, maxChars) + "\u2026" : c.message;
    ctx.fillText(msg, boxX + padding + 18, y + 4);
  });

  ctx.restore();
}

/**
 * Main render function — now with pose quality color system.
 * Blue = correct form, Red = incorrect form, per muscle.
 */
export function renderMuscleOverlay(
  ctx,
  landmarks,
  exerciseKey,
  canvasW,
  canvasH,
  { glowIntensity = 0.7, showSkeleton = false, showLabels = true, time = 0, poseQuality = null }
) {
  const exercise = EXERCISE_DB[exerciseKey];
  if (!exercise || !landmarks) return;

  // Analyze pose quality if not provided
  const quality = poseQuality || analyzePose(landmarks, exerciseKey);
  const muscleQualityMap = getMuscleQuality(quality);

  const positions = getMusclePositions(landmarks, canvasW, canvasH);
  const bodyScale = getBodyScale(landmarks, canvasW);
  const pulse = 0.85 + Math.sin(time * 2) * 0.15;

  ctx.save();
  ctx.globalCompositeOperation = "screen";

  // Collect all active muscles with their activation level and quality color
  const activeMuscles = new Map();
  Object.keys(exercise.primary).forEach((k) => activeMuscles.set(k, "primary"));
  Object.keys(exercise.secondary).forEach((k) => {
    if (!activeMuscles.has(k)) activeMuscles.set(k, "secondary");
  });

  // Render in anatomical depth order
  RENDER_ORDER.forEach((muscleKey) => {
    const level = activeMuscles.get(muscleKey);
    if (!level) return;
    const region = MUSCLE_REGIONS[muscleKey];
    const points = positions[muscleKey];
    const shape = MUSCLE_SHAPES[muscleKey];
    if (!region || !points) return;

    const isPrimary = level === "primary";

    // Determine color from pose quality
    let color;
    const mq = muscleQualityMap[muscleKey];
    if (mq) {
      color = getMuscleDisplayColor(mq.score);
    } else {
      // No specific quality data for this muscle — use default correct color
      color = quality.status !== 'bad' ? CORRECT_COLOR : region.color;
    }

    // Larger base radius for more visible, Instagram-worthy glows (28→38, 20→28)
    const radius = (isPrimary ? 38 : 28) * bodyScale * (shape?.scale || 1);
    const alpha = (isPrimary ? 0.5 : 0.25) * glowIntensity * pulse;
    // Determine if this muscle has incorrect form (score < 0.6)
    const isDanger = mq ? mq.score < 0.6 : false;
    points.forEach((pt) => drawShapedGlow(ctx, pt, color, radius, alpha, shape, { isDanger, time }));
  });

  ctx.restore();

  // Draw correction guide if there are issues
  const failedChecks = quality.checkpoints?.filter(cp => !cp.pass) || [];
  if (failedChecks.length > 0) {
    drawCorrectionGuide(ctx, failedChecks, canvasW, canvasH);
  }

  // Muscle name labels with quality-based colors
  if (showLabels) {
    const drawnLabels = new Set();
    const placedLabels = [];

    RENDER_ORDER.forEach((muscleKey) => {
      if (!exercise.primary.includes(muscleKey)) return;
      if (drawnLabels.has(muscleKey)) return;
      drawnLabels.add(muscleKey);
      const region = MUSCLE_REGIONS[muscleKey];
      const points = positions[muscleKey];
      if (!region || !points) return;

      const mq = muscleQualityMap[muscleKey];
      const labelColor = mq ? getMuscleDisplayColor(mq.score) : (quality.status !== 'bad' ? CORRECT_COLOR : region.color);
      // Pass score as text badge (e.g. "92" or "45")
      const scoreText = mq ? `${Math.round(mq.score * 100)}` : null;

      drawMuscleLabel(ctx, points, region.label, labelColor, canvasW, placedLabels, scoreText);
    });
  }

  // Draw pose score badge (top-left corner, below exercise badge)
  drawPoseScoreBadge(ctx, quality.score, quality.status !== 'bad', 12, 60);

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

  return quality;
}

function drawPoseScoreBadge(ctx, score, isGood, x, y) {
  ctx.save();

  const bgColor = isGood ? "rgba(0,170,255,0.15)" : "rgba(255,59,92,0.15)";
  const borderColor = isGood ? "rgba(0,170,255,0.4)" : "rgba(255,59,92,0.4)";
  const textColor = isGood ? CORRECT_COLOR : INCORRECT_COLOR;
  const label = isGood ? "Good Form" : "Needs Fix";

  const pw = 110;
  const ph = 32;

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(x, y, pw, ph, 8);
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Score number
  ctx.fillStyle = textColor;
  ctx.font = "bold 16px 'Pretendard', -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`${score}`, x + 10, y + ph / 2);

  // Label
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "10px 'Pretendard', -apple-system, sans-serif";
  ctx.fillText(label, x + 42, y + ph / 2);

  ctx.restore();
}
