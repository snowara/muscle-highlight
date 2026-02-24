const COLOR_PRESETS = ["#00E5FF", "#FF3B5C", "#7C4DFF", "#00E676", "#FF6B35", "#FFD700"];

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
        <div style={{ display: "flex", gap: 8 }}>
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => update("brandColor", color)}
              style={{
                width: 28, height: 28, borderRadius: "50%", border: "none", cursor: "pointer",
                background: color,
                outline: brand.brandColor === color ? "2px solid #fff" : "2px solid transparent",
                outlineOffset: 2,
                transition: "outline 0.15s ease",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
