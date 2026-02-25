import { useRef, useEffect, useCallback } from "react";
import { renderMuscleOverlay, resetTransitions } from "../lib/muscleRenderer";

export default function CanvasView({
  imageUrl,
  landmarks,
  exerciseKey,
  poseResult,
  glowIntensity,
  showSkeleton,
  canvasRef: externalRef,
}) {
  const internalRef = useRef(null);
  const overlayRef = useRef(null);
  const imageRef = useRef(null);
  const animRef = useRef(null);
  const canvasRef = externalRef || internalRef;

  const draw = useCallback(
    (time) => {
      const canvas = canvasRef.current;
      const overlay = overlayRef.current;
      if (!canvas || !overlay || !imageRef.current) return;

      const ctx = canvas.getContext("2d");
      const octx = overlay.getContext("2d");
      const img = imageRef.current;

      const w = img.naturalWidth;
      const h = img.naturalHeight;

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        overlay.width = w;
        overlay.height = h;
      }

      // 원본 이미지
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      // 글로우 오버레이
      octx.clearRect(0, 0, w, h);
      if (landmarks && exerciseKey) {
        renderMuscleOverlay(octx, landmarks, exerciseKey, w, h, {
          glowIntensity,
          showSkeleton,
          showLabels: true,
          time: time / 1000,
          poseResult: poseResult || null,
          muscleStates: poseResult?.muscleStates || null,
        });
      }

      // 합성
      ctx.drawImage(overlay, 0, 0);

      animRef.current = requestAnimationFrame(draw);
    },
    [landmarks, exerciseKey, poseResult, glowIntensity, showSkeleton, canvasRef]
  );

  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      resetTransitions();
      animRef.current = requestAnimationFrame(draw);
    };
    img.src = imageUrl;

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [imageUrl, draw]);

  // 운동 변경 시 전환 리셋
  useEffect(() => {
    resetTransitions();
  }, [exerciseKey]);

  return (
    <div className="canvas-container">
      <canvas ref={canvasRef} className="main-canvas" />
      <canvas ref={overlayRef} style={{ display: "none" }} />

      {exerciseKey && poseResult && (
        <div className={`canvas-badge badge-${poseResult.status}`}>
          <span className="badge-score">{poseResult.score}</span>
          <span className="badge-label">
            {poseResult.status === "correct" ? "✓ 올바른 자세" : poseResult.status === "caution" ? "⚠ 주의" : "✗ 교정 필요"}
          </span>
        </div>
      )}

      {landmarks && exerciseKey && (
        <div className="canvas-legend">
          <span className="legend-item legend-correct">● 올바른 자세</span>
          <span className="legend-item legend-wrong">● 잘못된 자세</span>
        </div>
      )}
    </div>
  );
}
