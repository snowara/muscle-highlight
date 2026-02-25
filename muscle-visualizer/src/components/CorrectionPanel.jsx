export default function CorrectionPanel({ analysis }) {
  if (!analysis) return null;

  const { activeCorrections, goodPoints } = analysis;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <h3 style={{
        color: "#fff", fontSize: 12, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: 1, marginBottom: 4,
      }}>
        자세 교정 가이드
      </h3>

      {/* 잘못된 부위 (빨간색) */}
      {activeCorrections.map((c, i) => (
        <div key={i} style={{
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 12, padding: "12px 14px",
          position: "relative",
        }}>
          {/* 말풍선 꼬리 */}
          <div style={{
            position: "absolute", left: 14, top: -6,
            width: 12, height: 12, background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRight: "none", borderBottom: "none",
            transform: "rotate(45deg)",
          }} />

          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: "rgba(239,68,68,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, marginTop: 1,
            }}>
              <span style={{ fontSize: 11, color: "#EF4444", fontWeight: 800 }}>!</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: "#EF4444",
                marginBottom: 2,
              }}>
                {c.bodyPart}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
                {c.issue}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                {c.message}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* 올바른 항목 (빨간 체크) */}
      {goodPoints.length > 0 && (
        <div style={{
          display: "flex", flexDirection: "column", gap: 4, marginTop: 4,
        }}>
          {goodPoints.map((point, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: 8,
              background: "rgba(232,64,64,0.06)",
              border: "1px solid rgba(232,64,64,0.15)",
            }}>
              <span style={{ color: "#E84040", fontSize: 13, fontWeight: 700 }}>✓</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{point}</span>
            </div>
          ))}
        </div>
      )}

      {activeCorrections.length === 0 && (
        <div style={{
          padding: "16px 14px", borderRadius: 12, textAlign: "center",
          background: "rgba(232,64,64,0.06)",
          border: "1px solid rgba(232,64,64,0.15)",
        }}>
          <span style={{ fontSize: 24, display: "block", marginBottom: 6 }}>👏</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#E84040" }}>
            모든 자세가 올바릅니다!
          </span>
        </div>
      )}
    </div>
  );
}
