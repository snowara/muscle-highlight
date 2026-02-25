import { useState } from "react";
import { EXERCISE_DB, CATEGORIES } from "../data/exercises";

export default function ExerciseSelector({ selected, onSelect, autoDetected }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");

  const exercise = EXERCISE_DB[selected];
  const catEntries = Object.entries(CATEGORIES);
  const filtered = activeCategory === "all"
    ? Object.entries(EXERCISE_DB)
    : Object.entries(EXERCISE_DB).filter(([, ex]) => ex.category === activeCategory);

  return (
    <div>
      <h3 style={{
        color: "#fff", fontSize: 12, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
      }}>
        운동 종류
      </h3>

      {/* Auto detection badge */}
      {autoDetected && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 10px", borderRadius: 8, marginBottom: 8,
          background: "rgba(59,130,246,0.08)",
          border: "1px solid rgba(59,130,246,0.2)",
        }}>
          <span style={{ fontSize: 11 }}>🤖</span>
          <span style={{ color: "#3B82F6", fontSize: 11, fontWeight: 600 }}>AI 감지</span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginLeft: "auto" }}>
            {autoDetected.confidence}%
          </span>
        </div>
      )}

      {/* Current selection dropdown trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%", padding: "10px 14px", borderRadius: 10,
          border: "1px solid rgba(59,130,246,0.3)",
          background: "rgba(59,130,246,0.08)",
          color: "#fff", fontSize: 13, fontWeight: 600,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
          justifyContent: "space-between",
        }}
      >
        <span>
          {exercise?.icon} {exercise?.name || "운동 선택"}
        </span>
        <span style={{
          fontSize: 10, transition: "transform 0.2s",
          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
        }}>
          ▼
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          marginTop: 8, borderRadius: 12, overflow: "hidden",
          background: "rgba(15,15,30,0.98)",
          border: "1px solid rgba(255,255,255,0.08)",
          maxHeight: 320, overflowY: "auto",
        }}>
          {/* Category tabs */}
          <div style={{
            display: "flex", gap: 2, padding: "8px 8px 0",
            overflowX: "auto", flexWrap: "nowrap",
          }}>
            <CatBtn label="전체" active={activeCategory === "all"} onClick={() => setActiveCategory("all")} />
            {catEntries.map(([key, cat]) => (
              <CatBtn
                key={key}
                label={cat.icon + " " + cat.label}
                active={activeCategory === key}
                onClick={() => setActiveCategory(key)}
              />
            ))}
          </div>

          {/* Exercise list */}
          <div style={{ padding: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {filtered.map(([key, ex]) => {
              const isActive = key === selected;
              return (
                <button
                  key={key}
                  onClick={() => { onSelect(key); setIsOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "7px 8px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: isActive ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.02)",
                    outline: isActive ? "1.5px solid #3B82F6" : "none",
                    transition: "all 0.1s ease",
                  }}
                >
                  <span style={{ fontSize: 12 }}>{ex.icon}</span>
                  <span style={{
                    color: isActive ? "#3B82F6" : "rgba(255,255,255,0.7)",
                    fontSize: 11, fontWeight: isActive ? 600 : 400,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    textAlign: "left",
                  }}>
                    {ex.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CatBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
        background: active ? "rgba(59,130,246,0.15)" : "transparent",
        color: active ? "#3B82F6" : "rgba(255,255,255,0.4)",
        fontSize: 10, fontWeight: active ? 700 : 400, whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}
