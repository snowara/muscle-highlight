import { useRef, useEffect } from "react";
import { renderMuscleOverlay } from "../lib/muscleRenderer";
import { EXERCISE_DB } from "../data/exercises";
import { MUSCLE_REGIONS } from "../data/muscles";
import BodyDiagram from "./BodyDiagram";

export default function CanvasView({
  image, landmarks, exerciseKey, canvasSize,
  glowIntensity, showSkeleton, showLabels = true,
  canvasRef: externalRef,
}) {
  const internalRef = useRef(null);
  const canvasRef = externalRef || internalRef;
  const animRef = useRef(null);

  const exercise = EXERCISE_DB[exerciseKey];
  const allMuscles = [...(exercise?.primary || []), ...(exercise?.secondary || [])];

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
        });
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [image, landmarks, exerciseKey, canvasSize, glowIntensity, showSkeleton, showLabels]);

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

      {/* body diagram - top right */}
      {exercise && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)",
          borderRadius: 12, padding: "8px 6px",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>
          <BodyDiagram exerciseKey={exerciseKey} size={48} />
        </div>
      )}

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
              {exercise.primary.map(k => MUSCLE_REGIONS[k]?.label).filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>
      )}

      {/* muscle legend - bottom */}
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
            const isPrimary = exercise.primary.includes(key);
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{
                  width: isPrimary ? 8 : 6, height: isPrimary ? 8 : 6,
                  borderRadius: "50%", background: m.color,
                  boxShadow: isPrimary ? `0 0 8px ${m.color}` : "none",
                }} />
                <span style={{
                  color: isPrimary ? "#fff" : "rgba(255,255,255,0.45)",
                  fontSize: 11, fontWeight: isPrimary ? 600 : 400,
                }}>
                  {m.label}
                </span>
                {isPrimary && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                    background: m.color + "33", color: m.color,
                  }}>
                    HIGH
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
