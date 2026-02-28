/**
 * AdminExerciseEditor.jsx -- 운동 편집기
 * AdminPanel에서 분리된 운동 상세 편집 폼 컴포넌트
 */

import { CATEGORIES } from "../data/exercises";
import { MUSCLE_REGIONS } from "../data/muscles";

const MUSCLE_KEYS = Object.keys(MUSCLE_REGIONS);

export default function AdminExerciseEditor({
  editingKey,
  editData,
  onFieldChange,
  onSave,
  onCancel,
  styles,
}) {
  if (!editData) return null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={styles.heading}>
          {editingKey === "__new__" ? "새 운동 추가" : `"${editData.name}" 수정`}
        </h2>
        <button style={styles.smallBtn} onClick={onCancel}>
          취소
        </button>
      </div>

      <div style={{ maxHeight: "calc(100vh - 240px)", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* 기본 정보 */}
        <BasicInfoSection editData={editData} onFieldChange={onFieldChange} styles={styles} />

        {/* 주동근 */}
        <MuscleSection
          title="주동근 (Primary)"
          muscleData={editData.primary}
          fieldName="primary"
          defaultValue={50}
          accentColor="#E84040"
          onFieldChange={onFieldChange}
        />

        {/* 보조근 */}
        <MuscleSection
          title="보조근 (Secondary)"
          muscleData={editData.secondary}
          fieldName="secondary"
          defaultValue={30}
          accentColor="#FFB020"
          onFieldChange={onFieldChange}
        />

        {/* 교정 메시지 */}
        <CorrectionsSection
          corrections={editData.corrections || []}
          onFieldChange={onFieldChange}
          styles={styles}
        />

        {/* 트레이너 팁 */}
        <Section title="트레이너 팁">
          <textarea style={{ ...styles.input, minHeight: 60, resize: "vertical" }}
            value={editData.trainerTip || ""} onChange={e => onFieldChange("trainerTip", e.target.value)}
            placeholder="회원에게 전달할 핵심 코칭 포인트"
          />
          <textarea style={{ ...styles.input, minHeight: 40, resize: "vertical", marginTop: 8 }}
            value={editData.goodFormMessage || ""} onChange={e => onFieldChange("goodFormMessage", e.target.value)}
            placeholder="올바른 자세 격려 메시지"
          />
        </Section>

        {/* 저장 버튼 */}
        <button style={{ ...styles.primaryBtn, width: "100%", padding: "14px", fontSize: 15 }}
          onClick={onSave}>
          저장하고 적용하기
        </button>
      </div>
    </div>
  );
}

// -- 기본 정보 섹션 --
function BasicInfoSection({ editData, onFieldChange, styles }) {
  return (
    <Section title="기본 정보">
      <Row label="운동명" styles={styles}>
        <input style={styles.input} value={editData.name} onChange={e => onFieldChange("name", e.target.value)} placeholder="스쿼트" />
      </Row>
      <Row label="한국어명" styles={styles}>
        <input style={styles.input} value={editData.koreanName || ""} onChange={e => onFieldChange("koreanName", e.target.value)} placeholder="백스쿼트" />
      </Row>
      <Row label="카테고리" styles={styles}>
        <select style={styles.select} value={editData.category} onChange={e => onFieldChange("category", e.target.value)}>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
      </Row>
      <Row label="장비" styles={styles}>
        <input style={styles.input} value={editData.equipment || ""} onChange={e => onFieldChange("equipment", e.target.value)} placeholder="바벨" />
      </Row>
      <Row label="난이도 (1~5)" styles={styles}>
        <input type="range" min={1} max={5} value={editData.difficulty || 2}
          onChange={e => onFieldChange("difficulty", +e.target.value)}
          style={{ flex: 1, accentColor: "#E84040" }}
        />
        <span style={{ color: "#E84040", fontWeight: 700, width: 24, textAlign: "center" }}>{editData.difficulty || 2}</span>
      </Row>
      <Row label="설명" styles={styles}>
        <input style={styles.input} value={editData.description || ""} onChange={e => onFieldChange("description", e.target.value)} />
      </Row>
    </Section>
  );
}

// -- 근육 매핑 섹션 --
function MuscleSection({ title, muscleData, fieldName, defaultValue, accentColor, onFieldChange }) {
  return (
    <Section title={title}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {MUSCLE_KEYS.map(mk => {
          const active = muscleData?.[mk] !== undefined;
          const val = muscleData?.[mk] || defaultValue;
          return (
            <div key={mk} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
              <input type="checkbox" checked={active}
                onChange={e => {
                  const updated = { ...muscleData };
                  if (e.target.checked) {
                    updated[mk] = defaultValue;
                  } else {
                    delete updated[mk];
                  }
                  onFieldChange(fieldName, updated);
                }}
              />
              <span style={{ fontSize: 11, color: "#fff", minWidth: 60 }}>{MUSCLE_REGIONS[mk].simpleLabel}</span>
              {active && (
                <>
                  <input type="range" min={10} max={100} value={val}
                    onChange={e => onFieldChange(fieldName, { ...muscleData, [mk]: +e.target.value })}
                    style={{ flex: 1, accentColor }}
                  />
                  <span style={{ fontSize: 10, color: accentColor, width: 28 }}>{val}%</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// -- 교정 메시지 섹션 --
function CorrectionsSection({ corrections, onFieldChange, styles }) {
  function handleCorrectionFieldChange(index, field, value) {
    const updated = corrections.map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    );
    onFieldChange("corrections", updated);
  }

  function handleRemoveCorrection(index) {
    const updated = corrections.filter((_, i) => i !== index);
    onFieldChange("corrections", updated);
  }

  function handleAddCorrection() {
    onFieldChange("corrections", [...corrections, { issue: "", bodyPart: "", message: "" }]);
  }

  return (
    <Section title={`교정 메시지 (${corrections.length}개)`}>
      {corrections.map((c, i) => (
        <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 10, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>교정 #{i + 1}</span>
            <button style={{ ...styles.smallBtn, color: "#FF6B6B", fontSize: 10, padding: "2px 8px" }}
              onClick={() => handleRemoveCorrection(i)}>삭제</button>
          </div>
          <input style={{ ...styles.input, marginBottom: 4 }} placeholder="문제 (예: 무릎 내측 붕괴)"
            value={c.issue || ""} onChange={e => handleCorrectionFieldChange(i, "issue", e.target.value)}
          />
          <input style={{ ...styles.input, marginBottom: 4 }} placeholder="부위 (예: 무릎)"
            value={c.bodyPart || ""} onChange={e => handleCorrectionFieldChange(i, "bodyPart", e.target.value)}
          />
          <input style={styles.input} placeholder="교정 메시지"
            value={c.message || ""} onChange={e => handleCorrectionFieldChange(i, "message", e.target.value)}
          />
        </div>
      ))}
      <button style={styles.outlineBtn} onClick={handleAddCorrection}>+ 교정 메시지 추가</button>
    </Section>
  );
}

// -- 공통 UI 컴포넌트 --
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, children, styles }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", minWidth: 80 }}>{label}</label>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>{children}</div>
    </div>
  );
}
