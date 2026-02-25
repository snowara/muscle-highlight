const COLOR_PRESETS = [
  "#00E5FF", "#FF3B5C", "#7C4DFF", "#00E676", "#FF6B35", "#FFD700",
];

export default function BrandSettings({ settings, onChange }) {
  return (
    <div className="brand-settings">
      <h3 className="panel-title">브랜딩 설정</h3>

      <div className="brand-row">
        <label className="control-label">헬스장 이름</label>
        <input
          type="text"
          className="brand-input"
          value={settings.gymName}
          onChange={(e) => onChange({ ...settings, gymName: e.target.value })}
          placeholder="MY GYM"
        />
      </div>

      <div className="brand-row">
        <label className="control-label">태그라인</label>
        <input
          type="text"
          className="brand-input"
          value={settings.tagline}
          onChange={(e) => onChange({ ...settings, tagline: e.target.value })}
          placeholder="Perfect Your Form"
        />
      </div>

      <div className="brand-row">
        <label className="control-label">브랜드 컬러</label>
        <div className="color-presets">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              className={`color-btn ${settings.brandColor === c ? "active" : ""}`}
              style={{ background: c }}
              onClick={() => onChange({ ...settings, brandColor: c })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
