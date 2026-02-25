import { COLOR_PRESETS } from "../lib/compositeExport";

const PRESET_LABELS = ["시안", "레드", "퍼플", "그린", "오렌지", "골드"];

export default function BrandSettings({ brand, setBrand }) {
  const update = (key, value) => setBrand((prev) => ({ ...prev, [key]: value }));

  return (
    <div>
      <h3 style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
        브랜딩
      </h3>

      {/* gym name */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, display: "block", marginBottom: 4 }}>헬스장 이름</label>
        <input
          type="text"
          value={brand.gymName}
          onChange={(e) => update("gymName", e.target.value)}
          maxLength={20}
          style={{
            width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 13,
            outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      {/* tagline */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, display: "block", marginBottom: 4 }}>태그라인</label>
        <input
          type="text"
          value={brand.tagline}
          onChange={(e) => update("tagline", e.target.value)}
          maxLength={30}
          style={{
            width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 13,
            outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      {/* color presets */}
      <div>
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, display: "block", marginBottom: 6 }}>브랜드 컬러</label>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8,
        }}>
          {COLOR_PRESETS.map((color, i) => {
            const isSelected = brand.brandColor === color;
            return (
              <button
                key={color}
                onClick={() => update("brandColor", color)}
                title={PRESET_LABELS[i]}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  padding: 4, border: "none", cursor: "pointer",
                  background: "transparent",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: color,
                  outline: isSelected ? "2.5px solid #fff" : "2px solid transparent",
                  outlineOffset: 2,
                  boxShadow: isSelected ? `0 0 12px ${color}66` : "none",
                  transition: "all 0.15s ease",
                  transform: isSelected ? "scale(1.1)" : "scale(1)",
                }} />
                <span style={{
                  fontSize: 8, fontWeight: isSelected ? 700 : 400,
                  color: isSelected ? color : "rgba(255,255,255,0.35)",
                  transition: "color 0.15s ease",
                }}>
                  {PRESET_LABELS[i]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
