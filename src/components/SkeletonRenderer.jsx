// ============================================================
// SkeletonRenderer.jsx — 스켈레톤 + 관절각도 + 글로우 렌더링
//
// Canvas 2D 전용 오버레이 컴포넌트.
// landmarks.js 연결선 정의 + poses.js 자세 판정을 소비하여
// 실시간 스켈레톤, 관절 각도 호(arc), 세그먼트 글로우를 그린다.
//
// 사용법 (단독):
//   <SkeletonRenderer
//     landmarks={landmarks}
//     exerciseKey="squat"
//     poseResult={poseResult}
//     width={640} height={480}
//   />
//
// 사용법 (외부 캔버스에 직접 draw):
//   import { drawSkeleton } from './SkeletonRenderer';
//   drawSkeleton(ctx, landmarks, w, h, options);
// ============================================================

import { useRef, useEffect, useCallback, memo } from "react";
import {
  LM,
  SKELETON,
  SEGMENT,
  SEGMENT_STYLE,
  SEGMENT_MUSCLES,
  DRAW_CONFIG,
  JOINT_LANDMARKS,
  LANDMARK_NAMES,
  checkVisibility,
  isConnectionVisible,
  getActiveSegments,
} from "../data/landmarks";
import {
  JOINTS,
  calcAngle,
  getJointAngle,
  detectPhase,
  scorePhaseAngles,
  detectErrors,
  evaluatePose,
  POSE_CRITERIA,
} from "../data/poses";
import { EXERCISE_DB } from "../data/exercises";

// ────────────────────────────────────────────
// 유틸리티
// ────────────────────────────────────────────

function hexToRgba(hex, alpha = 1) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function lerpHex(hexA, hexB, t) {
  const a = hexA.replace("#", "");
  const b = hexB.replace("#", "");
  const mix = (i) => {
    const va = parseInt(a.slice(i, i + 2), 16);
    const vb = parseInt(b.slice(i, i + 2), 16);
    return Math.round(va + (vb - va) * t).toString(16).padStart(2, "0");
  };
  return `#${mix(0)}${mix(2)}${mix(4)}`;
}

// ────────────────────────────────────────────
// 트랜지션 상태 (색상 전환 보간)
// ────────────────────────────────────────────
const _transitions = {};
const TRANSITION_SPEED = 5; // 1/초

function getTransition(key, isWrong, dt) {
  if (!_transitions[key]) {
    _transitions[key] = isWrong ? 1 : 0;
  }
  const target = isWrong ? 1 : 0;
  const step = dt * TRANSITION_SPEED;
  if (_transitions[key] < target) {
    _transitions[key] = Math.min(target, _transitions[key] + step);
  } else {
    _transitions[key] = Math.max(target, _transitions[key] - step);
  }
  return _transitions[key];
}

export function resetSkeletonTransitions() {
  Object.keys(_transitions).forEach((k) => delete _transitions[k]);
}

// ────────────────────────────────────────────
// 세그먼트별 활성 근육 강도 계산
// ────────────────────────────────────────────
function getSegmentActivation(segmentId, exerciseKey) {
  const exercise = EXERCISE_DB[exerciseKey];
  if (!exercise) return 0;

  const muscles = SEGMENT_MUSCLES[segmentId];
  if (!muscles || muscles.length === 0) return 0;

  const primary = exercise.primary || {};
  const secondary = exercise.secondary || {};
  const all = { ...secondary, ...primary };

  let max = 0;
  for (const m of muscles) {
    if (all[m] > max) max = all[m];
  }
  return max / 100; // 0~1
}

// ────────────────────────────────────────────
// 세그먼트에 잘못된 자세 근육이 포함됐는지 체크
// ────────────────────────────────────────────
function isSegmentWrong(segmentId, wrongMuscles) {
  if (!wrongMuscles || wrongMuscles.length === 0) return false;
  const muscles = SEGMENT_MUSCLES[segmentId];
  return muscles?.some((m) => wrongMuscles.includes(m)) ?? false;
}

// ============================================================
// drawSkeleton — 외부 캔버스에 직접 스켈레톤을 그리는 함수
// ============================================================

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} landmarks — MediaPipe 결과 [0..32]
 * @param {number} w — 캔버스 너비
 * @param {number} h — 캔버스 높이
 * @param {Object} options
 */
export function drawSkeleton(ctx, landmarks, w, h, options = {}) {
  const {
    exerciseKey = null,
    isCorrectForm = true,
    wrongMuscles = [],
    showAngles = true,
    showFace = false,
    glowIntensity = 0.7,
    time = 0,
    dt = 0.016,
    anglesToShow = null, // null = 자동, 배열 = 특정 관절만
  } = options;

  if (!landmarks || landmarks.length < 33) return;

  // 좌표 변환 헬퍼
  const px = (i) => landmarks[i].x * w;
  const py = (i) => landmarks[i].y * h;
  const pt = (i) => ({ x: px(i), y: py(i) });

  // 활성 세그먼트
  const activeSegments = exerciseKey
    ? new Set(
        Object.keys(SEGMENT_MUSCLES).filter(
          (seg) => getSegmentActivation(seg, exerciseKey) > 0
        )
      )
    : new Set();

  // 펄스 효과
  const correctPulse = Math.sin(time * 2.5) * 0.08 + 1.0;
  const wrongPulse = Math.sin(time * 4.5) * 0.15 + 1.0;

  ctx.save();

  // ━━━ 1단계: 연결선 (뒤에서부터 → 글로우 → 실선) ━━━

  for (const [fromIdx, toIdx, segment] of SKELETON) {
    if (segment === SEGMENT.FACE && !showFace) continue;
    if (!isConnectionVisible(landmarks, fromIdx, toIdx)) continue;

    const style = SEGMENT_STYLE[segment];
    const isActive = activeSegments.has(segment);
    const segWrong = isSegmentWrong(segment, wrongMuscles);
    const activation = exerciseKey
      ? getSegmentActivation(segment, exerciseKey)
      : 0;

    // 색상 결정
    let color = style.color;
    let lineWidth = style.lineWidth;

    if (isActive && activation > 0) {
      const t = getTransition(`seg_${segment}`, segWrong, dt);
      color = lerpHex(
        DRAW_CONFIG.line.correctColor,
        DRAW_CONFIG.line.incorrectColor,
        t
      );
      lineWidth = DRAW_CONFIG.line.activeWidth * (0.7 + activation * 0.3);
    }

    const fromPt = pt(fromIdx);
    const toPt = pt(toIdx);

    // 글로우 레이어 (활성 세그먼트만)
    if (isActive && activation > 0.2) {
      const pulse = segWrong ? wrongPulse : correctPulse;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.strokeStyle = hexToRgba(color, activation * glowIntensity * 0.4 * pulse);
      ctx.lineWidth = lineWidth * 3;
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = DRAW_CONFIG.line.glowBlur * activation;
      ctx.beginPath();
      ctx.moveTo(fromPt.x, fromPt.y);
      ctx.lineTo(toPt.x, toPt.y);
      ctx.stroke();
      ctx.restore();
    }

    // 실선 레이어
    ctx.strokeStyle = hexToRgba(
      color,
      isActive ? DRAW_CONFIG.line.opacity : 0.4
    );
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(fromPt.x, fromPt.y);
    ctx.lineTo(toPt.x, toPt.y);
    ctx.stroke();
  }

  // ━━━ 2단계: 랜드마크 점 ━━━

  const drawnDots = new Set();

  for (const [fromIdx, toIdx, segment] of SKELETON) {
    if (segment === SEGMENT.FACE && !showFace) continue;

    for (const idx of [fromIdx, toIdx]) {
      if (drawnDots.has(idx)) continue;
      drawnDots.add(idx);

      const vis = checkVisibility(landmarks[idx]);
      if (vis === "hidden") continue;

      const { x, y } = pt(idx);
      const isJoint = JOINT_LANDMARKS.includes(idx);
      const style = SEGMENT_STYLE[segment];
      const isActive = activeSegments.has(segment);
      const segWrong = isSegmentWrong(segment, wrongMuscles);

      // 반경 결정
      let radius = isJoint ? DRAW_CONFIG.dot.jointRadius : style.dotRadius;
      if (isActive && isJoint) radius = DRAW_CONFIG.dot.activeRadius;

      // 색상 결정
      let dotColor = style.color;
      if (isActive) {
        const t = getTransition(`dot_${idx}`, segWrong, dt);
        dotColor = lerpHex(
          DRAW_CONFIG.dot.correctColor,
          DRAW_CONFIG.dot.incorrectColor,
          t
        );
      }

      const alpha = vis === "dim" ? 0.45 : DRAW_CONFIG.dot.opacity;

      // 활성 관절 배경 글로우
      if (isActive && isJoint) {
        const pulse = segWrong ? wrongPulse : correctPulse;
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.beginPath();
        ctx.arc(x, y, radius * 2.2 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(dotColor, 0.15 * glowIntensity);
        ctx.fill();
        ctx.restore();
      }

      // 점 외곽선
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(dotColor, alpha);
      ctx.fill();

      if (isJoint) {
        ctx.strokeStyle = hexToRgba(
          DRAW_CONFIG.dot.strokeColor,
          alpha * 0.6
        );
        ctx.lineWidth = DRAW_CONFIG.dot.strokeWidth;
        ctx.stroke();
      }
    }
  }

  // ━━━ 3단계: 관절 각도 호(arc) ━━━

  if (showAngles && exerciseKey) {
    const criteria = POSE_CRITERIA[exerciseKey];
    if (criteria) {
      const phase = detectPhase(exerciseKey, landmarks);
      const phaseData = criteria.phases[phase];
      const angleChecks = phaseData?.angles || [];

      // 표시할 관절 결정
      const jointsToShow = anglesToShow
        ? anglesToShow
        : angleChecks.map((a) => a.joint);

      const drawnAngles = new Set();

      for (const jointName of jointsToShow) {
        if (drawnAngles.has(jointName)) continue;
        drawnAngles.add(jointName);

        const triplet = JOINTS[jointName];
        if (!triplet) continue;

        const [ai, bi, ci] = triplet;
        if (
          checkVisibility(landmarks[ai]) === "hidden" ||
          checkVisibility(landmarks[bi]) === "hidden" ||
          checkVisibility(landmarks[ci]) === "hidden"
        )
          continue;

        const angle = calcAngle(
          { x: px(ai), y: py(ai) },
          { x: px(bi), y: py(bi) },
          { x: px(ci), y: py(ci) }
        );

        // 해당 각도의 허용 범위 찾기
        const check = angleChecks.find((a) => a.joint === jointName);
        const inRange = check
          ? angle >= check.min && angle <= check.max
          : true;

        const arcColor = inRange
          ? DRAW_CONFIG.angleArc.correctColor
          : DRAW_CONFIG.angleArc.incorrectColor;

        const bx = px(bi);
        const by = py(bi);

        // 호 그리기
        const startAngle = Math.atan2(py(ai) - by, px(ai) - bx);
        const endAngle = Math.atan2(py(ci) - by, px(ci) - bx);

        ctx.save();
        ctx.strokeStyle = arcColor;
        ctx.lineWidth = DRAW_CONFIG.angleArc.lineWidth;
        ctx.beginPath();
        ctx.arc(
          bx,
          by,
          DRAW_CONFIG.angleArc.radius,
          startAngle,
          endAngle,
          angleSweepDirection(startAngle, endAngle)
        );
        ctx.stroke();

        // 각도 텍스트
        const midAngle = (startAngle + endAngle) / 2;
        const textDist = DRAW_CONFIG.angleArc.radius + 16;
        const tx = bx + Math.cos(midAngle) * textDist;
        const ty = by + Math.sin(midAngle) * textDist;

        const text = `${Math.round(angle)}°`;
        const fontSize = DRAW_CONFIG.angleArc.textSize;
        ctx.font = `bold ${fontSize}px 'Pretendard', -apple-system, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // 텍스트 배경
        const metrics = ctx.measureText(text);
        const pad = DRAW_CONFIG.angleArc.textPadding;
        const tw = metrics.width + pad * 2;
        const th = fontSize + pad * 2;

        ctx.fillStyle = DRAW_CONFIG.angleArc.textBg;
        ctx.beginPath();
        ctx.roundRect(tx - tw / 2, ty - th / 2, tw, th, 4);
        ctx.fill();

        // 범위 이탈 시 배경 강조
        if (!inRange) {
          ctx.fillStyle = hexToRgba("#FF4757", 0.25);
          ctx.beginPath();
          ctx.roundRect(tx - tw / 2, ty - th / 2, tw, th, 4);
          ctx.fill();
        }

        // 텍스트
        ctx.fillStyle = inRange ? "#FFFFFF" : "#FF6B6B";
        ctx.fillText(text, tx, ty);

        ctx.restore();
      }
    }
  }

  ctx.restore();
}

/**
 * arc 방향 결정 (짧은 쪽으로 그리기)
 */
function angleSweepDirection(start, end) {
  let diff = end - start;
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff < 0;
}

// ============================================================
// SkeletonRenderer 컴포넌트
// ============================================================

function SkeletonRenderer({
  landmarks,
  exerciseKey = null,
  poseResult = null,
  width = 640,
  height = 480,
  glowIntensity = 0.7,
  showAngles = true,
  showFace = false,
  anglesToShow = null,
  className = "",
  style: containerStyle = {},
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const lastTimeRef = useRef(0);

  const draw = useCallback(
    (timestamp) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      const t = timestamp / 1000;
      const dt = lastTimeRef.current ? t - lastTimeRef.current : 0.016;
      lastTimeRef.current = t;

      ctx.clearRect(0, 0, width, height);

      if (landmarks) {
        const wrongMuscles = poseResult?.wrongMuscles || [];
        const isCorrect = poseResult?.status === "correct";

        drawSkeleton(ctx, landmarks, width, height, {
          exerciseKey,
          isCorrectForm: isCorrect,
          wrongMuscles,
          showAngles,
          showFace,
          glowIntensity,
          time: t,
          dt,
          anglesToShow,
        });
      }

      animRef.current = requestAnimationFrame(draw);
    },
    [
      landmarks,
      exerciseKey,
      poseResult,
      width,
      height,
      glowIntensity,
      showAngles,
      showFace,
      anglesToShow,
    ]
  );

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  // 운동 변경 시 트랜지션 리셋
  useEffect(() => {
    resetSkeletonTransitions();
  }, [exerciseKey]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`skeleton-canvas ${className}`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        ...containerStyle,
      }}
    />
  );
}

export default memo(SkeletonRenderer);
