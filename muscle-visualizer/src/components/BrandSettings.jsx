const COLOR_PRESETS = ["#3B82F6", "#00E5FF", "#7C4DFF", "#00E676", "#FF6B35", "#FFD700"];

export default function BrandSettings({ brand, setBrand }) {
  const update = (key, value) => setBrand((prev) => ({ ...prev, [key]: value }));

  return (
    <div>
      <h3 style={{
        color: "#fff", fontSize: 12, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
      }}>
        브랜딩
      </h3>

      <div style={{ marginBottom: 10 }}>
        <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, display: "block", marginBottom: 4 }}>
          헬스장 이름
        </label>
        <input
          type="text"
          value={brand.gymName}
          onChange={(e) => update("gymName", e.target.value)}
          maxLength={20}
          style={{
            width: "100%", padding: "7px 10px", borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: 12,
            outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, display: "block", marginBottom: 4 }}>
          태그라인
        </label>
        <input
          type="text"
          value={brand.tagline}
          onChange={(e) => update("tagline", e.target.value)}
          maxLength={30}
          style={{
            width: "100%", padding: "7px 10px", borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: 12,
            outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      <div>
        <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, display: "block", marginBottom: 6 }}>
          브랜드 컬러
        </label>
        <div style={{ display: "flex", gap: 7 }}>
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => update("brandColor", color)}
              style={{
                width: 26, height: 26, borderRadius: "50%", border: "none", cursor: "pointer",
                background: color,
                outline: brand.brandColor === color ? "2px solid #fff" : "2px solid transparent",
                outlineOffset: 2, transition: "outline 0.15s ease",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
