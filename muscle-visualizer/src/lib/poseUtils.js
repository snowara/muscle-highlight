/**
 * poseUtils.js -- 포즈 관련 공통 유틸리티
 *
 * angleDeg, mid, extractAngles 등 여러 파일에서 공유하는
 * 관절 각도 계산 함수를 한곳에 모아 DRY 원칙 준수.
 */

const MIN_LANDMARKS = 29;

/**
 * 세 점(a, b, c)으로 이루는 관절 각도를 도(degree)로 반환.
 * b가 꼭짓점. 0~180 범위.
 */
export function angleDeg(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.sqrt(ab.x ** 2 + ab.y ** 2) * Math.sqrt(cb.x ** 2 + cb.y ** 2);
  if (mag === 0) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

/**
 * 두 점의 중점 반환.
 */
export function mid(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * 랜드마크에서 주요 관절 각도를 추출.
 * MotionTracker 등에서 사용.
 *
 * @param {Array} landmarks - 33개 정규화 랜드마크
 * @returns {Object|null} 각 관절의 각도값 또는 null
 */
export function extractAngles(landmarks) {
  if (!landmarks || landmarks.length < MIN_LANDMARKS) return null;
  const lm = landmarks;

  const kneeL = angleDeg(lm[23], lm[25], lm[27]);
  const kneeR = angleDeg(lm[24], lm[26], lm[28]);
  const elbowL = angleDeg(lm[11], lm[13], lm[15]);
  const elbowR = angleDeg(lm[12], lm[14], lm[16]);
  const hipL = angleDeg(lm[11], lm[23], lm[25]);
  const hipR = angleDeg(lm[12], lm[24], lm[26]);
  const shoulderL = angleDeg(lm[13], lm[11], lm[23]);
  const shoulderR = angleDeg(lm[14], lm[12], lm[24]);

  const sMid = mid(lm[11], lm[12]);
  const hMid = mid(lm[23], lm[24]);
  const torsoAngle = Math.abs(Math.atan2(hMid.x - sMid.x, hMid.y - sMid.y) * 180 / Math.PI);

  return {
    knee: (kneeL + kneeR) / 2,
    elbow: (elbowL + elbowR) / 2,
    hip: (hipL + hipR) / 2,
    shoulder: (shoulderL + shoulderR) / 2,
    torso: torsoAngle,
    kneeL, kneeR, elbowL, elbowR,
  };
}
