import { useState, useEffect, useMemo } from "react";
import { EXERCISE_DB } from "../data/exercises";
import { MUSCLE_REGIONS } from "../data/muscles";
import { renderFrontBodySVG, renderBackBodySVG } from "../lib/bodyDiagram";

const BACK_MUSCLES = new Set(["lats", "traps", "lowerBack", "glutes", "hamstrings"]);
const FRONT_MUSCLES = new Set(["chest", "quadriceps", "biceps", "core"]);

function bestView(exercise) {
  if (!exercise) return "front";
  const primaryKeys = Object.keys(exercise.primary || {});
  const backCount = primaryKeys.filter((k) => BACK_MUSCLES.has(k)).length;
  const frontCount = primaryKeys.filter((k) => FRONT_MUSCLES.has(k)).length;
  return backCount > frontCount ? "back" : "front";
}

export default function AnatomicalDiagram({ exerciseKey, analysis, view: viewProp, style }) {
  const exercise = EXERCISE_DB[exerciseKey];
  const [view, setView] = useState(viewProp || "front");

  // Auto-select best view when exercise changes
  useEffect(() => {
    if (exercise) {
      setView(bestView(exercise));
    }
  }, [exerciseKey]);

  // Build activeMuscles from exercise data + analysis status
  const activeMuscles = useMemo(() => {
    if (!exercise) return {};
    const muscleStatus = analysis?.muscleStatus || {};
    const result = {};

    for (const key of Object.keys(exercise.primary || {})) {
      result[key] = { level: "primary", status: muscleStatus[key] || "good" };
    }
    for (const key of Object.keys(exercise.secondary || {})) {
      result[key] = { level: "secondary", status: muscleStatus[key] || "good" };
    }
    return result;
  }, [exerciseKey, analysis]);

  // Render SVG string
  const svgHTML = useMemo(() => {
    const render = view === "back" ? renderBackBodySVG : renderFrontBodySVG;
    return render(activeMuscles);
  }, [activeMuscles, view]);

  if (!exercise) return null;

  // Collect muscles for legend
  const primaryMuscles = Object.keys(exercise.primary || {})
    .map((k) => MUSCLE_REGIONS[k])
    .filter(Boolean);
  const secondaryMuscles = Object.keys(exercise.secondary || {})
    .map((k) => MUSCLE_REGIONS[k])
    .filter(Boolean);

  return (
    <div style={{ background: "#0a0a1a", borderRadius: 12, padding: 16, ...style }}>
      {/* Header: exercise name + icon */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{exercise.icon}</span>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
            {exercise.name}
          </span>
        </div>

        {/* Front / Back toggle */}
        <div style={{ display: "flex", gap: 4 }}>
          <ToggleBtn label="앞면" active={view === "front"} onClick={() => setView("front")} />
          <ToggleBtn label="뒷면" active={view === "back"} onClick={() => setView("back")} />
        </div>
      </div>

      {/* SVG diagram */}
      <div
        style={{ width: "100%", lineHeight: 0 }}
        dangerouslySetInnerHTML={{ __html: svgHTML }}
      />

      {/* Muscle legend */}
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Primary legend */}
        {primaryMuscles.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 600, marginRight: 2 }}>
              주동근
            </span>
            {primaryMuscles.map((m) => (
              <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#EF4444", boxShadow: "0 0 4px #EF4444",
                }} />
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>
                  {m.simpleLabel}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Secondary legend */}
        {secondaryMuscles.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 600, marginRight: 2 }}>
              보조근
            </span>
            {secondaryMuscles.map((m) => (
              <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#FBBF24", boxShadow: "0 0 4px #FBBF24",
                }} />
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
                  {m.simpleLabel}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px", borderRadius: 12, border: "none", cursor: "pointer",
        background: active ? "rgba(59,130,246,0.12)" : "transparent",
        color: active ? "#3B82F6" : "rgba(255,255,255,0.4)",
        fontSize: 10, fontWeight: active ? 700 : 400,
        outline: active ? "1.5px solid #3B82F6" : "1px solid rgba(255,255,255,0.1)",
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}
