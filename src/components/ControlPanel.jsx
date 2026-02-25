export default function ControlPanel({
  glowIntensity,
  showSkeleton,
  onGlowChange,
  onSkeletonToggle,
}) {
  return (
    <div className="control-panel">
      <h3 className="panel-title">효과 설정</h3>

      <div className="control-row">
        <label className="control-label">글로우 강도</label>
        <input
          type="range"
          className="control-slider"
          min={0}
          max={1}
          step={0.05}
          value={glowIntensity}
          onChange={(e) => onGlowChange(Number(e.target.value))}
        />
        <span className="control-value">{Math.round(glowIntensity * 100)}%</span>
      </div>

      <div className="control-row">
        <label className="control-label">스켈레톤 표시</label>
        <button
          className={`toggle-btn ${showSkeleton ? "active" : ""}`}
          onClick={() => onSkeletonToggle(!showSkeleton)}
        >
          {showSkeleton ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  );
}
