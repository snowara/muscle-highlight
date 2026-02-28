/**
 * AdminPanel.jsx -- 관장님용 관리 패널
 *
 * 탭 전환 + 상태 관리만 담당.
 * 각 탭 UI는 별도 컴포넌트로 분리:
 *  - AdminExerciseTab / AdminExerciseEditor
 *  - AdminLearningTab
 *  - AdminDataTab
 */

import { useState } from "react";
import { EXERCISE_DB } from "../data/exercises";
import { saveExercise, deleteExercise } from "../lib/customExerciseStore";
import { clearLearningData } from "../lib/learningStore";
import AdminExerciseTab from "./AdminExerciseTab";
import AdminExerciseEditor from "./AdminExerciseEditor";
import AdminLearningTab from "./AdminLearningTab";
import AdminDataTab from "./AdminDataTab";

const TABS = [
  { key: "exercises", label: "운동 관리", icon: "🏋️" },
  { key: "learning", label: "학습 현황", icon: "🧠" },
  { key: "data", label: "데이터 관리", icon: "💾" },
];

export default function AdminPanel({ onClose }) {
  const [tab, setTab] = useState("exercises");
  const [editingKey, setEditingKey] = useState(null);
  const [editData, setEditData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [toast, setToast] = useState("");

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  // -- 운동 관련 핸들러 --
  function handleFieldChange(field, val) {
    setEditData(prev => ({ ...prev, [field]: val }));
  }

  function startNewExercise() {
    setEditingKey("__new__");
    setEditData({
      name: "", koreanName: "", variant: "",
      icon: "🏋️", category: "chest", equipment: "덤벨",
      difficulty: 2, description: "",
      primary: {}, secondary: {},
      trainerTip: "", goodFormMessage: "",
      corrections: [],
    });
  }

  function startEdit(key) {
    setEditingKey(key);
    setEditData(JSON.parse(JSON.stringify(EXERCISE_DB[key])));
  }

  function handleDelete(key) {
    if (!window.confirm(`"${EXERCISE_DB[key]?.name || key}"을(를) 삭제하시겠습니까?`)) {
      return;
    }
    deleteExercise(key);
    showToast(`"${EXERCISE_DB[key]?.name || key}" 삭제됨. 새로고침 후 반영.`);
  }

  function handleSaveExercise() {
    if (!editData.name) {
      showToast("운동 이름을 입력하세요");
      return;
    }

    let key = editingKey;
    if (key === "__new__") {
      key = (editData.name || "exercise").replace(/[^a-zA-Z가-힣0-9]/g, "");
      key = key.charAt(0).toLowerCase() + key.slice(1);
      if (!key || EXERCISE_DB[key]) {
        key = "custom_" + Date.now();
      }
    }

    saveExercise(key, editData);
    showToast(`"${editData.name}" 저장됨. 새로고침 후 반영.`);
    setEditingKey(null);
    setEditData(null);
  }

  function handleCancelEdit() {
    setEditingKey(null);
    setEditData(null);
  }

  function handleClearLearning() {
    if (!window.confirm("학습 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }
    clearLearningData();
    showToast("학습 데이터가 초기화되었습니다");
  }

  // -- 운동 필터링 --
  function getFilteredExercises() {
    return Object.entries(EXERCISE_DB).filter(([key, ex]) => {
      if (filterCategory !== "all" && ex.category !== filterCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (ex.name || "").toLowerCase().includes(q) ||
               (ex.koreanName || "").toLowerCase().includes(q) ||
               key.toLowerCase().includes(q);
      }
      return true;
    });
  }

  // -- 탭 콘텐츠 --
  function renderTabContent() {
    if (tab === "exercises") {
      if (editingKey !== null) {
        return (
          <AdminExerciseEditor
            editingKey={editingKey}
            editData={editData}
            onFieldChange={handleFieldChange}
            onSave={handleSaveExercise}
            onCancel={handleCancelEdit}
            styles={S}
          />
        );
      }
      return (
        <AdminExerciseTab
          allExercises={getFilteredExercises()}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterCategory={filterCategory}
          onFilterChange={setFilterCategory}
          totalCount={Object.keys(EXERCISE_DB).length}
          onStartNew={startNewExercise}
          onStartEdit={startEdit}
          onDelete={handleDelete}
          styles={S}
        />
      );
    }
    if (tab === "learning") {
      return <AdminLearningTab onClearLearning={handleClearLearning} styles={S} />;
    }
    if (tab === "data") {
      return <AdminDataTab showToast={showToast} styles={S} />;
    }
    return null;
  }

  return (
    <div style={S.overlay}>
      <div style={S.panel}>
        {/* 헤더 */}
        <div style={S.header}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>관리자 설정</h1>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0, marginTop: 2 }}>
              운동 편집 · AI 학습 · 데이터 관리
            </p>
          </div>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>

        {/* 탭 */}
        <div style={S.tabBar}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                ...S.tab,
                background: tab === t.key ? "rgba(232,64,64,0.12)" : "transparent",
                color: tab === t.key ? "#E84040" : "rgba(255,255,255,0.4)",
                borderBottom: tab === t.key ? "2px solid #E84040" : "2px solid transparent",
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* 콘텐츠 */}
        <div style={S.content}>
          {renderTabContent()}
        </div>

        {/* 토스트 */}
        {toast && (
          <div style={S.toast}>{toast}</div>
        )}
      </div>
    </div>
  );
}

// -- 스타일 --
const S = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
    display: "flex", justifyContent: "center", alignItems: "center",
  },
  panel: {
    width: "90vw", maxWidth: 720, height: "90vh",
    background: "#0d0d1a", borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.08)",
    display: "flex", flexDirection: "column", overflow: "hidden",
    position: "relative",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  closeBtn: {
    background: "rgba(255,255,255,0.05)", border: "none", color: "rgba(255,255,255,0.5)",
    width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 14,
  },
  tabBar: {
    display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  tab: {
    flex: 1, padding: "12px 0", border: "none", cursor: "pointer",
    fontSize: 12, fontWeight: 600, transition: "all 0.15s",
  },
  content: {
    flex: 1, padding: 20, overflowY: "auto",
  },
  heading: {
    fontSize: 16, fontWeight: 700, color: "#fff", margin: 0,
  },
  input: {
    width: "100%", padding: "8px 12px", borderRadius: 8,
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box",
    fontFamily: "inherit",
  },
  select: {
    padding: "8px 12px", borderRadius: 8,
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#fff", fontSize: 13, outline: "none",
  },
  primaryBtn: {
    padding: "10px 18px", borderRadius: 10, border: "none",
    background: "#E84040", color: "#fff", fontSize: 13, fontWeight: 700,
    cursor: "pointer",
  },
  outlineBtn: {
    padding: "10px 18px", borderRadius: 10,
    background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
    color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  smallBtn: {
    padding: "6px 12px", borderRadius: 6, border: "none",
    background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)",
    fontSize: 11, fontWeight: 600, cursor: "pointer",
  },
  badge: {
    fontSize: 9, padding: "2px 6px", borderRadius: 4,
    background: "rgba(232,64,64,0.15)", color: "#E84040", fontWeight: 600,
  },
  exerciseRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 14px", borderRadius: 10,
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
  },
  toast: {
    position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
    padding: "10px 20px", borderRadius: 10, background: "rgba(232,64,64,0.9)",
    color: "#fff", fontSize: 13, fontWeight: 600, zIndex: 10,
  },
};
