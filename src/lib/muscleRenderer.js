// ============================================================
// muscleRenderer.js — Dual-Color Muscle Glow Rendering System
//
// muscleMap.js의 MuscleDescriptor를 소비하여 캔버스에 렌더링.
// Blue (correct) / Red (wrong) / Dim (neutral) 3단계 시각화.
// 3-Layer glow: Outer Diffuse → Core Gradient → Inner Highlight
//
// getMusclePositions 반환 형식 (MuscleDescriptor):
//   { id, label, x, y, radiusX, radiusY, rotation,
//     intensity, type, poseStatus, color, points, iconPosition }
// ============================================================

import { MUSCLE_REGIONS } from "../data/muscles";
import { getMusclePositions, getSkeletonConnections, MUSCLE_SHAPES } from "./muscleMap";

// ── Dual Color Palette (screen blend에 최적화된 렌더링 전용 색상) ──
const MUSCLE_DUAL_COLORS = {
  chest:      { correct: "#2979FF", wrong: "#FF1744" },
  shoulders:  { correct: "#448AFF", wrong: "#FF5252" },
  biceps:     { correct: "#2196F3", wrong: "#FF5722" },
  triceps:    { correct: "#42A5F5", wrong: "#FF6E40" },
  forearms:   { correct: "#29B6F6", wrong: "#FF8A65" },
  lats:       { correct: "#0288D1", wrong: "#E53935" },
  traps:      { correct: "#0277BD", wrong: "#D50000" },
  core:       { correct: "#00B0FF", wrong: "#FF1744" },
  lowerBack:  { correct: "#0091EA", wrong: "#D32F2F" },
  glutes:     { correct: "#039BE5", wrong: "#C62828" },
  quadriceps: { correct: "#0288D1", wrong: "#FF1744" },
  hamstrings: { correct: "#0277BD", wrong: "#E53935" },
  calves:     { correct: "#01579B", wrong: "#B71C1C" },
};

// Highlight (Layer 3) inner point colors
const HIGHLIGHT = {
  correct: "#80D8FF",
  wrong:   "#FF8A80",
};

// Render order: deep → superficial (뒤에 그려지는 것이 위에 보임)
const RENDER_ORDER = [
  "lowerBack", "core", "hamstrings", "quadriceps", "calves", "glutes",
  "lats", "forearms", "biceps", "triceps", "chest", "shoulders", "traps",
];

// 관절 → 근육 매핑 (스켈레톤 색상 결정용)
const JOINT_MUSCLE_MAP = {
  11: ["shoulders", "chest"],      12: ["shoulders", "chest"],
  13: ["biceps", "triceps"],       14: ["biceps", "triceps"],
  15: ["forearms"],                16: ["forearms"],
  23: ["glutes", "core", "lowerBack"], 24: ["glutes", "core", "lowerBack"],
  25: ["quadriceps", "hamstrings"],    26: ["quadriceps", "hamstrings"],
  27: ["calves"],                  28: ["calves"],
};

// 기본 교정 방향 (라디안)
const DEFAULT_CORRECTION_ANGLES = {
  lowerBack:  -Math.PI / 2,
  core:        Math.PI,
  quadriceps: -Math.PI / 6,
  hamstrings:  Math.PI / 2,
  glutes:     -Math.PI / 2,
  shoulders:  -Math.PI / 4,
  chest:       0,
  calves:     -Math.PI / 2,
  biceps:     -Math.PI / 3,
  triceps:     Math.PI / 3,
  forearms:    0,
  lats:       -Math.PI / 4,
  traps:      -Math.PI / 2,
};

// ── Transition State (영상 모드 0.2초 보간) ──
const _transitionState = {};
const TRANSITION_SPEED = 1 / 0.2;

// ── Utility ──

function hexAlpha(a) {
  return Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16).padStart(2, "0");
}

function parseHex(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function lerpColor(hexA, hexB, t) {
  const a = parseHex(hexA);
  const b = parseHex(hexB);
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return "#" + [r, g, bl].map(v => v.toString(16).padStart(2, "0")).join("");
}

function lerpValue(a, b, t) {
  return a + (b - a) * t;
}

function getTransitionT(muscleKey, targetIsWrong, time) {
  if (!_transitionState[muscleKey]) {
    _transitionState[muscleKey] = {
      value: targetIsWrong ? 1 : 0,
      target: targetIsWrong ? 1 : 0,
      lastTime: time,
    };
  }
  const st = _transitionState[muscleKey];
  const dt = Math.max(0, Math.min(time - st.lastTime, 0.1));
  st.lastTime = time;
  st.target = targetIsWrong ? 1 : 0;

  const step = dt * TRANSITION_SPEED;
  if (st.value < st.target) {
    st.value = Math.min(st.target, st.value + step);
  } else if (st.value > st.target) {
    st.value = Math.max(st.target, st.value - step);
  }
  return st.value;
}

// ── Layer Rendering ──

function drawDualGlow(ctx, point, muscleKey, radius, baseAlpha, shape, isWrong, time) {
  const colors = MUSCLE_DUAL_COLORS[muscleKey] || { correct: "#2196F3", wrong: "#FF1744" };
  const { angle = 0, aspect = 1.0 } = shape || {};

  const wt = getTransitionT(muscleKey, isWrong, time);
  const mainColor = lerpColor(colors.correct, colors.wrong, wt);
  const hlColor = lerpColor(HIGHLIGHT.correct, HIGHLIGHT.wrong, wt);

  const correctPulse = Math.sin(time * 2) * 0.1 + 0.9;
  const wrongPulse = Math.sin(time * 4) * 0.25 + 0.75;
  const pulse = lerpValue(correctPulse, wrongPulse, wt);

  const alpha = baseAlpha * pulse;
  const outerOpacity = lerpValue(0.15, 0.20, wt);

  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(angle);
  ctx.scale(1, 1 / Math.max(aspect, 0.3));

  // Layer 1: Outer Diffuse
  const outerR = radius * 2.5;
  const g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, outerR);
  g1.addColorStop(0,    mainColor + hexAlpha(alpha * outerOpacity * 4));
  g1.addColorStop(0.25, mainColor + hexAlpha(alpha * outerOpacity * 2.5));
  g1.addColorStop(0.5,  mainColor + hexAlpha(alpha * outerOpacity * 1.2));
  g1.addColorStop(0.75, mainColor + hexAlpha(alpha * outerOpacity * 0.4));
  g1.addColorStop(1,    mainColor + "00");
  ctx.globalCompositeOperation = "screen";
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.fillStyle = g1;
  ctx.fill();

  // Layer 2: Core
  const coreR = radius * 1.2;
  const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
  g2.addColorStop(0,   mainColor + hexAlpha(alpha * 0.90));
  g2.addColorStop(0.3, mainColor + hexAlpha(alpha * 0.55));
  g2.addColorStop(0.6, mainColor + hexAlpha(alpha * 0.20));
  g2.addColorStop(1,   mainColor + "00");
  ctx.beginPath();
  ctx.arc(0, 0, coreR, 0, Math.PI * 2);
  ctx.fillStyle = g2;
  ctx.fill();

  // Layer 3: Highlight
  const hlR = radius * 0.35;
  const g3 = ctx.createRadialGradient(0, 0, 0, 0, 0, hlR);
  g3.addColorStop(0,   "#FFFFFF" + hexAlpha(alpha * 0.55));
  g3.addColorStop(0.3, hlColor + hexAlpha(alpha * 0.70));
  g3.addColorStop(0.7, mainColor + hexAlpha(alpha * 0.30));
  g3.addColorStop(1,   mainColor + "00");
  ctx.beginPath();
  ctx.arc(0, 0, hlR, 0, Math.PI * 2);
  ctx.fillStyle = g3;
  ctx.fill();

  ctx.restore();
}

// ── Warning Icon (경고 아이콘: iconPosition에 직접 렌더링) ──

function drawWarningIcon(ctx, iconPos, radius, time) {
  const size = radius * 0.4;
  const cx = iconPos.x;
  const cy = iconPos.y;

  const iconPulse = Math.sin(time * 5) * 0.08 + 1.0;
  const drawSize = size * iconPulse;

  ctx.save();

  ctx.shadowColor = "rgba(255, 23, 68, 0.7)";
  ctx.shadowBlur = drawSize * 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, drawSize, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "#FF1744";
  ctx.lineWidth = drawSize * 0.15;
  ctx.beginPath();
  ctx.arc(cx, cy, drawSize, 0, Math.PI * 2);
  ctx.stroke();

  const fontSize = drawSize * 1.4;
  ctx.font = `900 ${fontSize}px -apple-system, 'SF Pro Display', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FF1744";
  ctx.fillText("!", cx, cy + drawSize * 0.05);

  ctx.restore();
}

// ── Correction Arrow ──

function drawCorrectionArrow(ctx, origin, angle, length, time) {
  const headLen = length * 0.32;

  const breathe = Math.sin(time * 3) * 0.06 + 1.0;
  const bToX = origin.x + Math.cos(angle) * length * breathe;
  const bToY = origin.y + Math.sin(angle) * length * breathe;

  ctx.save();

  ctx.shadowColor = "rgba(255, 255, 255, 0.6)";
  ctx.shadowBlur = 8;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash([6, 3]);

  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(bToX, bToY);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(
    bToX - headLen * Math.cos(angle - Math.PI / 5),
    bToY - headLen * Math.sin(angle - Math.PI / 5),
  );
  ctx.lineTo(bToX, bToY);
  ctx.lineTo(
    bToX - headLen * Math.cos(angle + Math.PI / 5),
    bToY - headLen * Math.sin(angle + Math.PI / 5),
  );
  ctx.stroke();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ── Muscle Label (descriptor 기반) ──

function drawMuscleLabel(ctx, desc, canvasW, placedLabels) {
  const points = desc.points;
  if (!points || points.length === 0) return;

  const muscleKey = desc.id;
  const isWrong = desc.poseStatus === "wrong";
  const colors = MUSCLE_DUAL_COLORS[muscleKey] || { correct: "#2196F3", wrong: "#FF1744" };
  const statusColor = isWrong ? colors.wrong : colors.correct;
  const prefix = isWrong ? "\u2717 " : "\u2713 ";

  const fontSize = Math.max(10, Math.min(14, canvasW * 0.022));

  ctx.save();
  ctx.font = `bold ${fontSize}px 'Pretendard', -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const text = prefix + desc.label;
  const tw = ctx.measureText(text).width;
  const pw = tw + 20;
  const ph = fontSize + 10;

  let lx = desc.x - pw / 2;
  let ly = desc.y - fontSize * 2 - ph / 2;

  // 겹침 방지
  if (placedLabels) {
    const offsets = [
      [0, 0], [0, -(ph + 4)], [0, (ph + 4)],
      [pw * 0.6, 0], [-(pw * 0.6), 0],
      [pw * 0.5, -(ph + 2)], [-(pw * 0.5), -(ph + 2)],
      [pw * 0.5, (ph + 2)], [-(pw * 0.5), (ph + 2)],
    ];
    for (const [ox, oy] of offsets) {
      const tx = lx + ox;
      const ty = ly + oy;
      const overlap = placedLabels.some(r =>
        tx < r.x + r.w + 4 && tx + pw + 4 > r.x &&
        ty < r.y + r.h + 4 && ty + ph + 4 > r.y
      );
      if (!overlap) {
        lx = tx;
        ly = ty;
        break;
      }
    }
    placedLabels.push({ x: lx, y: ly, w: pw, h: ph });
  }

  const bgColor = isWrong ? "rgba(255,23,68,0.22)" : "rgba(33,150,243,0.18)";
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(lx, ly, pw, ph, ph / 2);
  ctx.fill();

  ctx.strokeStyle = statusColor + "77";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(lx, ly, pw, ph, ph / 2);
  ctx.stroke();

  ctx.fillStyle = statusColor;
  ctx.beginPath();
  ctx.arc(lx + 11, ly + ph / 2, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = statusColor + "44";
  ctx.beginPath();
  ctx.arc(lx + 11, ly + ph / 2, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(text, lx + pw / 2 + 4, ly + ph / 2);

  ctx.restore();
}

// ── Skeleton Overlay (descriptor 기반 색상 결정) ──

function drawSkeleton(ctx, landmarks, canvasW, canvasH, muscleDescriptors) {
  const connections = getSkeletonConnections(landmarks, canvasW, canvasH);
  const p = (i) => ({ x: landmarks[i].x * canvasW, y: landmarks[i].y * canvasH });

  function isMuscleWrong(m) {
    return muscleDescriptors[m]?.poseStatus === "wrong";
  }

  const connIndices = [
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
    [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
    [24, 26], [26, 28],
  ];

  ctx.save();
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.lineCap = "round";

  connIndices.forEach(([ai, bi], idx) => {
    const aMuscles = JOINT_MUSCLE_MAP[ai] || [];
    const bMuscles = JOINT_MUSCLE_MAP[bi] || [];
    const allMuscles = [...aMuscles, ...bMuscles];
    const hasWrong = allMuscles.some(m => isMuscleWrong(m));

    ctx.strokeStyle = hasWrong
      ? "rgba(255, 23, 68, 0.55)"
      : "rgba(33, 150, 243, 0.50)";

    const [a, b] = connections[idx];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  });

  ctx.setLineDash([]);
  const jointIndices = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

  jointIndices.forEach((i) => {
    const { x, y } = p(i);
    const relatedMuscles = JOINT_MUSCLE_MAP[i] || [];
    const isJointWrong = relatedMuscles.some(m => isMuscleWrong(m));

    if (isJointWrong) {
      ctx.fillStyle = "rgba(255, 23, 68, 0.25)";
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 23, 68, 0.90)";
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(33, 150, 243, 0.70)";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  ctx.restore();
}

// ============================================================
// renderMuscleOverlay — Main Export
// ============================================================
//
// 사용법:
//   renderMuscleOverlay(ctx, landmarks, exerciseKey, w, h, {
//     glowIntensity: 0.7,
//     showSkeleton: false,
//     showLabels: true,
//     time: 0,
//     poseResult: {                   // poseAnalyzer.analyzePose() 반환값
//       wrongMuscles: ['lowerBack'],
//       score: 72,
//     },
//     muscleStates: { ... },          // 수동 오버라이드 (선택)
//   });
//
// poseResult → muscleMap이 poseStatus/color 결정
// muscleStates → 수동 오버라이드 (poseResult보다 우선)
// ============================================================

export function renderMuscleOverlay(
  ctx,
  landmarks,
  exerciseKey,
  canvasW,
  canvasH,
  {
    glowIntensity = 0.7,
    showSkeleton = false,
    showLabels = true,
    time = 0,
    poseResult = null,
    muscleStates = null,
  } = {}
) {
  if (!landmarks) return;

  // ── MuscleDescriptor 맵 취득 ──
  const muscles = getMusclePositions(landmarks, canvasW, canvasH, exerciseKey, poseResult);

  // ── muscleStates 수동 오버라이드 (레거시 호환 + 디버그용) ──
  if (muscleStates) {
    for (const [id, state] of Object.entries(muscleStates)) {
      if (!muscles[id]) continue;
      if (state.status) {
        muscles[id].poseStatus = state.status;
        const m = MUSCLE_REGIONS[id];
        if (m) {
          muscles[id].color = state.status === "wrong"
            ? m.wrongColor
            : m.correctColor;
        }
        if (state.status === "wrong" && !muscles[id].iconPosition) {
          muscles[id].iconPosition = {
            x: muscles[id].x + muscles[id].radiusX * 0.85,
            y: muscles[id].y - muscles[id].radiusY * 0.85,
          };
        } else if (state.status !== "wrong") {
          muscles[id].iconPosition = null;
        }
      }
    }
  }

  // ━━━ 1. Dark Overlay ━━━
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.restore();

  // ━━━ 2. 3-Layer Glow Rendering ━━━
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  RENDER_ORDER.forEach(muscleKey => {
    const desc = muscles[muscleKey];
    if (!desc) return;

    const isWrong = desc.poseStatus === "wrong";
    const shape = MUSCLE_SHAPES[muscleKey];
    const baseAlpha = desc.intensity * glowIntensity;

    desc.points.forEach(pt => {
      drawDualGlow(ctx, pt, muscleKey, desc.radiusX, baseAlpha, shape, isWrong, time);
    });
  });

  ctx.restore();

  // ━━━ 3. Warning Icons (wrong + primary 근육) ━━━
  RENDER_ORDER.forEach(muscleKey => {
    const desc = muscles[muscleKey];
    if (!desc || desc.poseStatus !== "wrong" || desc.type !== "primary") return;
    if (!desc.iconPosition) return;

    drawWarningIcon(ctx, desc.iconPosition, desc.radiusX, time);
  });

  // ━━━ 4. Correction Arrows (wrong + primary 근육) ━━━
  RENDER_ORDER.forEach(muscleKey => {
    const desc = muscles[muscleKey];
    if (!desc || desc.poseStatus !== "wrong" || desc.type !== "primary") return;

    let corrAngle = DEFAULT_CORRECTION_ANGLES[muscleKey] ?? -Math.PI / 4;
    if (muscleStates?.[muscleKey]?.correctionAngle != null) {
      corrAngle = muscleStates[muscleKey].correctionAngle;
    }

    drawCorrectionArrow(ctx, { x: desc.x, y: desc.y }, corrAngle, desc.radiusX * 1.5, time);
  });

  // ━━━ 5. Labels (primary 근육만) ━━━
  if (showLabels) {
    const drawn = new Set();
    const placed = [];

    RENDER_ORDER.forEach(muscleKey => {
      const desc = muscles[muscleKey];
      if (!desc || desc.type !== "primary") return;
      if (drawn.has(muscleKey)) return;
      drawn.add(muscleKey);

      drawMuscleLabel(ctx, desc, canvasW, placed);
    });
  }

  // ━━━ 6. Skeleton ━━━
  if (showSkeleton) {
    drawSkeleton(ctx, landmarks, canvasW, canvasH, muscles);
  }
}

// 전환 상태 초기화 (운동/이미지 변경 시 호출)
export function resetTransitions() {
  Object.keys(_transitionState).forEach(k => delete _transitionState[k]);
}
