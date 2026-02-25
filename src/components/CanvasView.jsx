import { useRef, useEffect } from "react";
import { renderMuscleOverlay } from "../lib/muscleRenderer";
import { EXERCISE_DB } from "../data/exercises";
import { MUSCLE_REGIONS } from "../data/muscles";
import { getMuscleDisplayColor, getMuscleQuality, CORRECT_COLOR, INCORRECT_COLOR } from "../lib/poseAnalyzer";

export default function CanvasView({
  image, landmarks, exerciseKey, canvasSize,
  glowIntensity, showSkeleton, showLabels = true,
  canvasRef: externalRef,
  poseQuality = null,
}) {
  const internalRef = useRef(null);
  const canvasRef = externalRef || internalRef;
  const animRef = useRef(null);

  const exercise = EXERCISE_DB[exerciseKey];
  const allMuscles = [...Object.keys(exercise?.primary || {}), ...Object.keys(exercise?.secondary || {})];
  const muscleQualityMap = poseQuality ? getMuscleQuality(poseQuality) : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext("2d");
    let startTime = performance.now();

    function draw() {
      const time = (performance.now() - startTime) / 1000;
      ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);
      ctx.drawImage(image, 0, 0, canvasSize.w, canvasSize.h);

      if (landmarks) {
        renderMuscleOverlay(ctx, landmarks, exerciseKey, canvasSize.w, canvasSize.h, {
          glowIntensity,
          showSkeleton,
          showLabels,
          time,
          poseQuality,
        });
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [image, landmarks, exerciseKey, canvasSize, glowIntensity, showSkeleton, showLabels, poseQuality]);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        style={{
          width: "100%", maxWidth: canvasSize.w, height: "auto",
          borderRadius: 16, display: "block",
        }}
      />

      {/* exercise badge - top left */}
      {exercise && (
        <div style={{
          position: "absolute", top: 12, left: 12,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)",
          borderRadius: 10, padding: "8px 14px",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 18 }}>{exercise.icon}</span>
          <div>
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>{exercise.name}</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, marginTop: 2 }}>
              {Object.keys(exercise.primary).map(k => MUSCLE_REGIONS[k]?.label).filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>
      )}

      {/* muscle legend - bottom with quality colors */}
      {allMuscles.length > 0 && (
        <div style={{
          position: "absolute", bottom: 12, left: 12, right: 12,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)",
          borderRadius: 10, padding: "8px 14px",
          display: "flex", flexWrap: "wrap", gap: "6px 14px",
          justifyContent: "center",
        }}>
          {allMuscles.map((key) => {
            const m = MUSCLE_REGIONS[key];
            if (!m) return null;
            const isPrimary = (key in exercise.primary);
            const mq = muscleQualityMap?.[key];
            const color = mq ? getMuscleDisplayColor(mq.score) : (poseQuality?.status !== 'bad' ? CORRECT_COLOR : m.color);
            const qualityLabel = mq ? (mq.isCorrect ? "OK" : "FIX") : "";
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{
                  width: isPrimary ? 8 : 6, height: isPrimary ? 8 : 6,
                  borderRadius: "50%", background: color,
                  boxShadow: isPrimary ? `0 0 8px ${color}` : "none",
                }} />
                <span style={{
                  color: isPrimary ? "#fff" : "rgba(255,255,255,0.45)",
                  fontSize: 11, fontWeight: isPrimary ? 600 : 400,
                }}>
                  {m.label}
                </span>
                {isPrimary && qualityLabel && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                    background: color + "33", color: color,
                  }}>
                    {qualityLabel}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
