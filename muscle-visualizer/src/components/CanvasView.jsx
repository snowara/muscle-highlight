import { useRef, useEffect } from "react";
import { renderMuscleOverlay } from "../lib/muscleRenderer";
import { EXERCISE_DB } from "../data/exercises";
import { MUSCLE_REGIONS } from "../data/muscles";
import { getScoreColor } from "../lib/poseAnalyzer";

export default function CanvasView({
  image, landmarks, exerciseKey, canvasSize,
  glowIntensity, showSkeleton, showLabels = true,
  canvasRef: externalRef, analysis,
}) {
  const internalRef = useRef(null);
  const canvasRef = externalRef || internalRef;
  const animRef = useRef(null);

  const exercise = EXERCISE_DB[exerciseKey];
  const muscleStatus = analysis?.muscleStatus || {};

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
          glowIntensity, showSkeleton, showLabels, time, muscleStatus,
        });
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [image, landmarks, exerciseKey, canvasSize, glowIntensity, showSkeleton, showLabels, muscleStatus]);

  const scoreColor = analysis ? getScoreColor(analysis.level) : null;

  return (
    <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        style={{
          width: "100%", maxWidth: canvasSize.w, height: "auto",
          borderRadius: 16, display: "block",
        }}
      />

      {/* 좌상단: 운동 아이콘 + 이름 + 자세 점수 배지 */}
      {exercise && (
        <div style={{
          position: "absolute", top: 12, left: 12,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)",
          borderRadius: 12, padding: "8px 14px",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>{exercise.icon}</span>
          <div>
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>
              {exercise.name}
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 2 }}>
              {Object.keys(exercise.primary || {}).map(k => MUSCLE_REGIONS[k]?.label).filter(Boolean).join(" · ")}
            </div>
          </div>
          {/* 점수 배지 */}
          {scoreColor && (
            <div style={{
              background: scoreColor.bg, borderRadius: 8,
              padding: "4px 10px", marginLeft: 4,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <span style={{ color: "#fff", fontSize: 15, fontWeight: 800 }}>
                {analysis.score}
              </span>
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 9, fontWeight: 600 }}>점</span>
            </div>
          )}
        </div>
      )}

      {/* 하단 근육 범례 */}
      {exercise && (
        <div style={{
          position: "absolute", bottom: 12, left: 12, right: 12,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)",
          borderRadius: 10, padding: "8px 14px",
          display: "flex", flexWrap: "wrap", gap: "5px 12px",
          justifyContent: "center",
        }}>
          {Object.keys(exercise.primary || {}).map((key) => {
            const m = MUSCLE_REGIONS[key];
            if (!m) return null;
            const status = muscleStatus[key] || "good";
            const color = status === "bad" ? "#EF4444" : "#3B82F6";
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: color, boxShadow: `0 0 6px ${color}`,
                }} />
                <span style={{ color: "#fff", fontSize: 10, fontWeight: 600 }}>
                  {m.label}
                </span>
              </div>
            );
          })}
          {Object.keys(exercise.secondary || {}).map((key) => {
            const m = MUSCLE_REGIONS[key];
            if (!m) return null;
            const status = muscleStatus[key] || "good";
            const color = status === "bad" ? "#EF4444" : "#3B82F6";
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: color, opacity: 0.7,
                }} />
                <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 10 }}>
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
