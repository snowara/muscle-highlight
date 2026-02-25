import { EXERCISE_DB } from "../data/exercises";
import { MUSCLE_REGIONS } from "../data/muscles";

export default function MuscleInfo({ exerciseKey, analysis }) {
  const exercise = EXERCISE_DB[exerciseKey];
  if (!exercise) return null;

  const muscleStatus = analysis?.muscleStatus || {};

  return (
    <div>
      <h3 style={{
        color: "#fff", fontSize: 12, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
      }}>
        근육 분석
      </h3>

      {/* Legend */}
      <div style={{
        display: "flex", gap: 16, marginBottom: 10, padding: "6px 0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3B82F6", boxShadow: "0 0 6px #3B82F6" }} />
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>올바른 근육</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444", boxShadow: "0 0 6px #EF4444" }} />
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>잘못된 근육</span>
        </div>
      </div>

      {/* Primary muscles */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>주동근</span>
        {Object.entries(exercise.primary || {}).map(([key, activation]) => {
          const m = MUSCLE_REGIONS[key];
          if (!m) return null;
          const status = muscleStatus[key] || "good";
          const color = status === "bad" ? "#EF4444" : "#3B82F6";
          return (
            <div key={key} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px", borderRadius: 8,
              background: `${color}11`,
              border: `1px solid ${color}30`,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%", background: color,
                boxShadow: `0 0 6px ${color}`,
              }} />
              <span style={{ color: "#fff", fontSize: 12, fontWeight: 500, flex: 1 }}>
                {m.label}
                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginLeft: 6 }}>
                  {m.simpleLabel}
                </span>
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                background: `${color}22`, color: color,
              }}>
                {activation}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Secondary muscles */}
      {Object.keys(exercise.secondary || {}).length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>보조근</span>
          {Object.entries(exercise.secondary || {}).map(([key, activation]) => {
            const m = MUSCLE_REGIONS[key];
            if (!m) return null;
            const status = muscleStatus[key] || "good";
            const color = status === "bad" ? "#EF4444" : "#3B82F6";
            return (
              <div key={key} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 10px", borderRadius: 8,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: color, opacity: 0.7,
                }} />
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, flex: 1 }}>
                  {m.label}
                </span>
                <span style={{
                  fontSize: 9, color: "rgba(255,255,255,0.3)",
                }}>
                  {activation}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
