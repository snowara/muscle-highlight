function Toggle({ label, value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 10px", borderRadius: 8, cursor: "pointer",
        background: value ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${value ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.06)"}`,
        transition: "all 0.15s ease",
      }}
    >
      <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{label}</span>
      <div style={{
        width: 34, height: 18, borderRadius: 9, position: "relative",
        background: value ? "#3B82F6" : "rgba(255,255,255,0.15)",
        transition: "background 0.2s ease",
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: "50%", background: "#fff",
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
  showCorrections, setShowCorrections,
}) {
  return (
    <div>
      <h3 style={{
        color: "#fff", fontSize: 12, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
      }}>
        설정
      </h3>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>글로우 강도</span>
          <span style={{ color: "#3B82F6", fontSize: 11, fontWeight: 600 }}>
            {Math.round(glowIntensity * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(glowIntensity * 100)}
          onChange={(e) => setGlowIntensity(Number(e.target.value) / 100)}
          style={{ width: "100%", accentColor: "#3B82F6" }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Toggle label="근육명 라벨" value={showLabels} onChange={setShowLabels} />
        <Toggle label="스켈레톤 표시" value={showSkeleton} onChange={setShowSkeleton} />
        <Toggle label="교정 가이드 표시" value={showCorrections} onChange={setShowCorrections} />
      </div>
    </div>
  );
}
