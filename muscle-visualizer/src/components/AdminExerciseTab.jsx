/**
 * AdminExerciseTab.jsx -- 운동 목록 탭
 * AdminPanel에서 분리된 운동 검색/목록 표시 컴포넌트
 */

import { CATEGORIES } from "../data/exercises";

export default function AdminExerciseTab({
  allExercises,
  searchQuery,
  onSearchChange,
  filterCategory,
  onFilterChange,
  totalCount,
  onStartNew,
  onStartEdit,
  onDelete,
  styles,
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={styles.heading}>운동 관리 ({totalCount}개)</h2>
        <button style={styles.primaryBtn} onClick={onStartNew}>+ 새 운동 추가</button>
      </div>

      {/* 검색 + 필터 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="text" placeholder="운동 검색..."
          value={searchQuery} onChange={e => onSearchChange(e.target.value)}
          style={styles.input}
        />
        <select value={filterCategory} onChange={e => onFilterChange(e.target.value)} style={styles.select}>
          <option value="all">전체</option>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
      </div>

      {/* 운동 목록 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "calc(100vh - 280px)", overflowY: "auto" }}>
        {allExercises.map(([key, ex]) => (
          <div key={key} style={styles.exerciseRow}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>{ex.icon || ""}</span>
                <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{ex.name}</span>
                {ex._custom && <span style={styles.badge}>수정됨</span>}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                {CATEGORIES[ex.category]?.label || ex.category} · {ex.equipment || "없음"} · 난이도 {ex.difficulty || "?"}
                · 주동근 {Object.keys(ex.primary || {}).length}개
                · 교정 {(ex.corrections || []).length}개
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={styles.smallBtn} onClick={() => onStartEdit(key)}>수정</button>
              <button style={{ ...styles.smallBtn, color: "#FF6B6B" }} onClick={() => onDelete(key)}>삭제</button>
            </div>
          </div>
        ))}
        {allExercises.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.3)" }}>
            검색 결과가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
