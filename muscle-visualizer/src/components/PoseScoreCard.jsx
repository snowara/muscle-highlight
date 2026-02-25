import { getScoreColor } from "../lib/poseAnalyzer";

export default function PoseScoreCard({ analysis }) {
  if (!analysis) return null;

  const { score, level } = analysis;
  const color = getScoreColor(level);

  return (
    <div style={{
      background: `linear-gradient(135deg, ${color.bg}22, ${color.bg}11)`,
      border: `1.5px solid ${color.bg}44`,
      borderRadius: 16, padding: "20px 24px",
      position: "relative", overflow: "hidden",
    }}>
      {/* Background glow */}
      <div style={{
        position: "absolute", top: -20, right: -20,
        width: 100, height: 100, borderRadius: "50%",
        background: `radial-gradient(circle, ${color.bg}20, transparent)`,
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
        {/* Score circle */}
        <div style={{
          width: 68, height: 68, borderRadius: "50%",
          background: color.bg, display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column",
          boxShadow: `0 4px 20px ${color.bg}44`,
        }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
            {score}
          </span>
          <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>점</span>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
            {color.label}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
            {level === "good" && (analysis.goodFormMessage || "자세가 올바릅니다!")}
            {level === "warning" && `${analysis.activeCorrections.length}개 부위 교정이 필요합니다`}
            {level === "bad" && `${analysis.activeCorrections.length}개 부위에서 문제가 발견되었습니다`}
          </div>
        </div>
      </div>
    </div>
  );
}
