import { useState } from "react";
import { EXERCISE_DB, CATEGORIES } from "../data/exercises";

export default function ExerciseGrid({ selected, onSelect, brandColor, showAutoOption = false }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const catEntries = Object.entries(CATEGORIES);

  const filtered = activeCategory === "all"
    ? Object.entries(EXERCISE_DB)
    : Object.entries(EXERCISE_DB).filter(([, ex]) => ex.category === activeCategory);

  return (
    <div>
      <h3 style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
        운동 선택
      </h3>

      {/* Auto detect button */}
      {showAutoOption && (
        <button
          onClick={() => onSelect("auto")}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer",
            marginBottom: 8,
            background: selected === "auto"
              ? "linear-gradient(135deg, rgba(0,229,255,0.15), rgba(124,77,255,0.15))"
              : "rgba(255,255,255,0.03)",
            outline: selected === "auto" ? "1.5px solid #00E5FF" : "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span style={{ fontSize: 16 }}>🤖</span>
          <span style={{
            color: selected === "auto" ? "#00E5FF" : "rgba(255,255,255,0.7)",
            fontSize: 12, fontWeight: selected === "auto" ? 700 : 400,
          }}>
            AI 자동 감지
          </span>
        </button>
      )}

      {/* Category tabs */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 10, overflowX: "auto",
        paddingBottom: 4,
      }}>
        <CatTab
          label="전체"
          active={activeCategory === "all"}
          onClick={() => setActiveCategory("all")}
          brandColor={brandColor}
        />
        {catEntries.map(([key, cat]) => (
          <CatTab
            key={key}
            label={cat.icon + " " + cat.label}
            active={activeCategory === key}
            onClick={() => setActiveCategory(key)}
            brandColor={brandColor}
          />
        ))}
      </div>

      {/* Exercise grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6,
        maxHeight: 240, overflowY: "auto",
        paddingRight: 4,
      }}>
        {filtered.map(([key, ex]) => {
          const isActive = key === selected;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "8px 8px", borderRadius: 8, border: "none", cursor: "pointer",
                background: isActive ? `${brandColor}22` : "rgba(255,255,255,0.03)",
                outline: isActive ? `1.5px solid ${brandColor}` : "1px solid rgba(255,255,255,0.06)",
                transition: "all 0.12s ease",
              }}
            >
              <span style={{ fontSize: 13 }}>{ex.icon}</span>
              <span style={{
                color: isActive ? brandColor : "rgba(255,255,255,0.7)",
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

      <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, marginTop: 6, textAlign: "right" }}>
        {filtered.length}종
      </div>
    </div>
  );
}

function CatTab({ label, active, onClick, brandColor }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
        background: active ? `${brandColor}20` : "transparent",
        color: active ? brandColor : "rgba(255,255,255,0.45)",
        fontSize: 10, fontWeight: active ? 700 : 400,
        whiteSpace: "nowrap",
        outline: active ? `1px solid ${brandColor}30` : "none",
      }}
    >
      {label}
    </button>
  );
}
