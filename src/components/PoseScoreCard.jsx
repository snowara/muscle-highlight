import { getScoreColor } from "../lib/poseAnalyzer";

export default function PoseScoreCard({ poseResult }) {
  if (!poseResult) return null;

  const { score, status, feedback, details } = poseResult;
  const color = getScoreColor(score);

  return (
    <div className="score-card">
      <div className="score-circle" style={{ borderColor: color }}>
        <span className="score-number" style={{ color }}>{score}</span>
        <span className="score-label">FORM</span>
      </div>

      <div className="score-info">
        <span className={`status-badge status-${status}`}>
          {status === "correct" ? "✓ 올바른 자세" : status === "caution" ? "⚠ 주의" : "✗ 교정 필요"}
        </span>
        <p className="score-feedback">{feedback}</p>
      </div>

      {details.length > 0 && (
        <div className="score-details">
          {details.map((d, i) => (
            <div key={i} className={`detail-row ${d.pass ? "pass" : "fail"}`}>
              <span className="detail-icon">{d.pass ? "✓" : "✗"}</span>
              <span className="detail-label">{d.label}</span>
              <span className="detail-score">{d.score}점</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
