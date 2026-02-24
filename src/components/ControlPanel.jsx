function Toggle({ label, value, onChange, brandColor }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 12px", borderRadius: 10, cursor: "pointer",
        background: value ? `${brandColor}15` : "rgba(255,255,255,0.03)",
        border: `1px solid ${value ? brandColor + "40" : "rgba(255,255,255,0.06)"}`,
        transition: "all 0.15s ease",
      }}
    >
      <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{label}</span>
      <div style={{
        width: 36, height: 20, borderRadius: 10, position: "relative",
        background: value ? brandColor : "rgba(255,255,255,0.15)",
        transition: "background 0.2s ease",
      }}>
        <div style={{
          width: 16, height: 16, borderRadius: "50%", background: "#fff",
          position: "absolute", top: 2,
          left: value ? 18 : 2,
          transition: "left 0.2s ease",
        }} />
      </div>
    </div>
  );
}

export default function ControlPanel({
  glowIntensity, setGlowIntensity,
  showSkeleton, setShowSkeleton,
  showLabels, setShowLabels,
  brandColor,
}) {
  return (
    <div>
      <h3 style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
        효과 설정
      </h3>

      {/* glow intensity */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>글로우 강도</span>
          <span style={{ color: brandColor, fontSize: 12, fontWeight: 600 }}>
            {Math.round(glowIntensity * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(glowIntensity * 100)}
          onChange={(e) => setGlowIntensity(Number(e.target.value) / 100)}
          style={{
            width: "100%", height: 4, appearance: "none", background: "rgba(255,255,255,0.1)",
            borderRadius: 2, outline: "none", cursor: "pointer",
            accentColor: brandColor,
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Toggle label="근육명 라벨" value={showLabels} onChange={setShowLabels} brandColor={brandColor} />
        <Toggle label="스켈레톤 표시" value={showSkeleton} onChange={setShowSkeleton} brandColor={brandColor} />
      </div>
    </div>
  );
}
