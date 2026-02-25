// ============================================================
// src/data/index.js — 통합 export
//
// 사용:
//   import { MUSCLE_REGIONS, EXERCISE_DB, POSE_CRITERIA, SKELETON } from '../data';
//   import { evaluatePose, buildSkeletonRenderData } from '../data';
// ============================================================

// ── muscles.js ──
export { MUSCLE_REGIONS, getMuscleColor } from './muscles';

// ── exercises.js ──
export { CATEGORIES, EXERCISE_DB } from './exercises';

// ── poses.js ──
export {
  LM,
  JOINTS,
  calcAngle,
  getJointAngle,
  verticalAlignment,
  horizontalAlignment,
  THRESHOLDS,
  POSE_CRITERIA,
  POSE_EXERCISE_IDS,
  detectPhase,
  scorePhaseAngles,
  detectErrors,
  evaluatePose,
} from './poses';

// ── landmarks.js ──
export {
  LANDMARK_NAMES,
  SEGMENT,
  SKELETON,
  SEGMENT_MUSCLES,
  SEGMENT_STYLE,
  DRAW_CONFIG,
  JOINT_LANDMARKS,
  LANDMARK_SEGMENT,
  getSegmentForConnection,
  getConnectionsBySegment,
  getLandmarksBySegment,
  getActiveSegments,
  getSegmentHighlightColor,
  landmarkDistance,
  checkVisibility,
  isConnectionVisible,
  buildSkeletonRenderData,
} from './landmarks';
