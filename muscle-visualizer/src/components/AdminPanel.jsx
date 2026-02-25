/**
 * AdminPanel.jsx — 관장님용 관리 패널
 *
 * 탭 구성:
 * 1. 운동 관리 — CRUD (추가/수정/삭제)
 * 2. 학습 현황 — AI 학습 통계 + 이력
 * 3. 데이터 관리 — 내보내기/가져오기/초기화
 */

import { useState, useRef } from "react";
import { EXERCISE_DB, CATEGORIES } from "../data/exercises";
import { MUSCLE_REGIONS } from "../data/muscles";
import { saveExercise, deleteExercise, exportAllData, importAllData, resetAllCustomizations } from "../lib/customExerciseStore";
import { getLearningStats, getDetailedStats, getLearningHistory, clearLearningData } from "../lib/learningStore";

const TABS = [
  { key: "exercises", label: "운동 관리", icon: "🏋️" },
  { key: "learning", label: "학습 현황", icon: "🧠" },
  { key: "data", label: "데이터 관리", icon: "💾" },
];

const MUSCLE_KEYS = Object.keys(MUSCLE_REGIONS);

export default function AdminPanel({ onClose }) {
  const [tab, setTab] = useState("exercises");
  const [editingKey, setEditingKey] = useState(null);
  const [editData, setEditData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [toast, setToast] = useState("");
  const fileRef = useRef(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  // ═══════════════════════════════════════
  //  운동 관리 탭
  // ═══════════════════════════════════════
  function renderExerciseTab() {
    const allExercises = Object.entries(EXERCISE_DB).filter(([key, ex]) => {
      if (filterCategory !== "all" && ex.category !== filterCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (ex.name || "").toLowerCase().includes(q) ||
               (ex.koreanName || "").toLowerCase().includes(q) ||
               key.toLowerCase().includes(q);
      }
      return true;
    });

    if (editingKey !== null) {
      return renderExerciseEditor();
    }

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={S.heading}>운동 관리 ({Object.keys(EXERCISE_DB).length}개)</h2>
          <button style={S.primaryBtn} onClick={() => startNewExercise()}>+ 새 운동 추가</button>
        </div>

        {/* 검색 + 필터 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            type="text" placeholder="운동 검색..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={S.input}
          />
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={S.select}>
            <option value="all">전체</option>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </div>

        {/* 운동 목록 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "calc(100vh - 280px)", overflowY: "auto" }}>
          {allExercises.map(([key, ex]) => (
            <div key={key} style={S.exerciseRow}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{ex.icon || "🏋️"}</span>
                  <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{ex.name}</span>
                  {ex._custom && <span style={S.badge}>수정됨</span>}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                  {CATEGORIES[ex.category]?.label || ex.category} · {ex.equipment || "없음"} · 난이도 {ex.difficulty || "?"}
                  · 주동근 {Object.keys(ex.primary || {}).length}개
                  · 교정 {(ex.corrections || []).length}개
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={S.smallBtn} onClick={() => startEdit(key)}>수정</button>
                <button style={{ ...S.smallBtn, color: "#FF6B6B" }} onClick={() => handleDelete(key)}>삭제</button>
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
    deleteExercise(key);
    showToast(`"${EXERCISE_DB[key]?.name || key}" 삭제됨. 새로고침 후 반영.`);
  }

  function handleSaveExercise() {
    if (!editData.name) { showToast("운동 이름을 입력하세요"); return; }

    let key = editingKey;
    if (key === "__new__") {
      // 영문 키 생성
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

  // ── 운동 편집 폼 ──
  function renderExerciseEditor() {
    if (!editData) return null;
    const d = editData;
    const set = (field, val) => setEditData({ ...d, [field]: val });

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={S.heading}>
            {editingKey === "__new__" ? "새 운동 추가" : `"${d.name}" 수정`}
          </h2>
          <button style={S.smallBtn} onClick={() => { setEditingKey(null); setEditData(null); }}>
            취소
          </button>
        </div>

        <div style={{ maxHeight: "calc(100vh - 240px)", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 기본 정보 */}
          <Section title="기본 정보">
            <Row label="운동명">
              <input style={S.input} value={d.name} onChange={e => set("name", e.target.value)} placeholder="스쿼트" />
            </Row>
            <Row label="한국어명">
              <input style={S.input} value={d.koreanName || ""} onChange={e => set("koreanName", e.target.value)} placeholder="백스쿼트" />
            </Row>
            <Row label="카테고리">
              <select style={S.select} value={d.category} onChange={e => set("category", e.target.value)}>
                {Object.entries(CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </Row>
            <Row label="장비">
              <input style={S.input} value={d.equipment || ""} onChange={e => set("equipment", e.target.value)} placeholder="바벨" />
            </Row>
            <Row label="난이도 (1~5)">
              <input type="range" min={1} max={5} value={d.difficulty || 2}
                onChange={e => set("difficulty", +e.target.value)}
                style={{ flex: 1, accentColor: "#E84040" }}
              />
              <span style={{ color: "#E84040", fontWeight: 700, width: 24, textAlign: "center" }}>{d.difficulty || 2}</span>
            </Row>
            <Row label="설명">
              <input style={S.input} value={d.description || ""} onChange={e => set("description", e.target.value)} />
            </Row>
          </Section>

          {/* 근육 매핑 */}
          <Section title="주동근 (Primary)">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {MUSCLE_KEYS.map(mk => {
                const active = d.primary?.[mk] !== undefined;
                const val = d.primary?.[mk] || 50;
                return (
                  <div key={mk} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                    <input type="checkbox" checked={active}
                      onChange={e => {
                        const p = { ...d.primary };
                        if (e.target.checked) p[mk] = 50;
                        else delete p[mk];
                        set("primary", p);
                      }}
                    />
                    <span style={{ fontSize: 11, color: "#fff", minWidth: 60 }}>{MUSCLE_REGIONS[mk].simpleLabel}</span>
                    {active && (
                      <>
                        <input type="range" min={10} max={100} value={val}
                          onChange={e => set("primary", { ...d.primary, [mk]: +e.target.value })}
                          style={{ flex: 1, accentColor: "#E84040" }}
                        />
                        <span style={{ fontSize: 10, color: "#E84040", width: 28 }}>{val}%</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="보조근 (Secondary)">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {MUSCLE_KEYS.map(mk => {
                const active = d.secondary?.[mk] !== undefined;
                const val = d.secondary?.[mk] || 30;
                return (
                  <div key={mk} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                    <input type="checkbox" checked={active}
                      onChange={e => {
                        const s = { ...d.secondary };
                        if (e.target.checked) s[mk] = 30;
                        else delete s[mk];
                        set("secondary", s);
                      }}
                    />
                    <span style={{ fontSize: 11, color: "#fff", minWidth: 60 }}>{MUSCLE_REGIONS[mk].simpleLabel}</span>
                    {active && (
                      <>
                        <input type="range" min={10} max={100} value={val}
                          onChange={e => set("secondary", { ...d.secondary, [mk]: +e.target.value })}
                          style={{ flex: 1, accentColor: "#FFB020" }}
                        />
                        <span style={{ fontSize: 10, color: "#FFB020", width: 28 }}>{val}%</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          {/* 교정 메시지 */}
          <Section title={`교정 메시지 (${(d.corrections || []).length}개)`}>
            {(d.corrections || []).map((c, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>교정 #{i + 1}</span>
                  <button style={{ ...S.smallBtn, color: "#FF6B6B", fontSize: 10, padding: "2px 8px" }}
                    onClick={() => {
                      const arr = [...d.corrections];
                      arr.splice(i, 1);
                      set("corrections", arr);
                    }}>삭제</button>
                </div>
                <input style={{ ...S.input, marginBottom: 4 }} placeholder="문제 (예: 무릎 내측 붕괴)"
                  value={c.issue || ""} onChange={e => {
                    const arr = [...d.corrections];
                    arr[i] = { ...arr[i], issue: e.target.value };
                    set("corrections", arr);
                  }}
                />
                <input style={{ ...S.input, marginBottom: 4 }} placeholder="부위 (예: 무릎)"
                  value={c.bodyPart || ""} onChange={e => {
                    const arr = [...d.corrections];
                    arr[i] = { ...arr[i], bodyPart: e.target.value };
                    set("corrections", arr);
                  }}
                />
                <input style={S.input} placeholder="교정 메시지"
                  value={c.message || ""} onChange={e => {
                    const arr = [...d.corrections];
                    arr[i] = { ...arr[i], message: e.target.value };
                    set("corrections", arr);
                  }}
                />
              </div>
            ))}
            <button style={S.outlineBtn} onClick={() => {
              set("corrections", [...(d.corrections || []), { issue: "", bodyPart: "", message: "" }]);
            }}>+ 교정 메시지 추가</button>
          </Section>

          {/* 트레이너 팁 */}
          <Section title="트레이너 팁">
            <textarea style={{ ...S.input, minHeight: 60, resize: "vertical" }}
              value={d.trainerTip || ""} onChange={e => set("trainerTip", e.target.value)}
              placeholder="회원에게 전달할 핵심 코칭 포인트"
            />
            <textarea style={{ ...S.input, minHeight: 40, resize: "vertical", marginTop: 8 }}
              value={d.goodFormMessage || ""} onChange={e => set("goodFormMessage", e.target.value)}
              placeholder="올바른 자세 격려 메시지"
            />
          </Section>

          {/* 저장 버튼 */}
          <button style={{ ...S.primaryBtn, width: "100%", padding: "14px", fontSize: 15 }}
            onClick={handleSaveExercise}>
            저장하고 적용하기
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  학습 현황 탭
  // ═══════════════════════════════════════
  function renderLearningTab() {
    const stats = getDetailedStats();
    const history = getLearningHistory(30);

    return (
      <div>
        <h2 style={S.heading}>AI 학습 현황</h2>

        {/* 요약 카드 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          <StatCard label="총 학습 횟수" value={stats.totalCorrections} />
          <StatCard label="학습된 운동" value={stats.byExercise.length} />
          <StatCard label="학습 기간" value={
            stats.oldestEntry ? `${Math.ceil((Date.now() - stats.oldestEntry) / 86400000)}일` : "-"
          } />
        </div>

        {/* 운동별 학습 통계 */}
        <Section title="운동별 수정 횟수">
          {stats.byExercise.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
              아직 학습 데이터가 없습니다. 사진을 분석하고 운동을 수정하면 AI가 학습합니다.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {stats.byExercise.map(s => {
                const ex = EXERCISE_DB[s.exerciseKey];
                const maxCount = stats.byExercise[0]?.corrections || 1;
                return (
                  <div key={s.exerciseKey} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "#fff", minWidth: 100, fontWeight: 500 }}>
                      {ex?.name || s.exerciseKey}
                    </span>
                    <div style={{ flex: 1, height: 16, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{
                        width: `${(s.corrections / maxCount) * 100}%`,
                        height: "100%", borderRadius: 4,
                        background: "linear-gradient(90deg, #E84040, #FF6B6B)",
                      }} />
                    </div>
                    <span style={{ fontSize: 11, color: "#E84040", fontWeight: 700, minWidth: 30, textAlign: "right" }}>
                      {s.corrections}회
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* 최근 학습 이력 */}
        <Section title="최근 학습 이력">
          {history.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
              이력이 없습니다
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 300, overflowY: "auto" }}>
              {history.map((h, i) => {
                const fromEx = EXERCISE_DB[h.aiGuess];
                const toEx = EXERCISE_DB[h.correct];
                const timeAgo = getTimeAgo(h.timestamp);
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                    background: "rgba(255,255,255,0.02)", borderRadius: 6, fontSize: 12,
                  }}>
                    <span style={{ color: "#FF6B6B" }}>{fromEx?.name || h.aiGuess}</span>
                    <span style={{ color: "rgba(255,255,255,0.3)" }}>→</span>
                    <span style={{ color: "#22C55E" }}>{toEx?.name || h.correct}</span>
                    <span style={{ color: "rgba(255,255,255,0.2)", marginLeft: "auto", fontSize: 10 }}>{timeAgo}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* 학습 초기화 */}
        <div style={{ marginTop: 16 }}>
          <button style={{ ...S.outlineBtn, color: "#FF6B6B", borderColor: "rgba(255,107,107,0.3)" }}
            onClick={() => {
              clearLearningData();
              showToast("학습 데이터가 초기화되었습니다");
            }}>
            학습 데이터 초기화
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  데이터 관리 탭
  // ═══════════════════════════════════════
  function renderDataTab() {
    return (
      <div>
        <h2 style={S.heading}>데이터 관리</h2>

        <Section title="내보내기">
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>
            커스텀 운동 + 학습 데이터를 JSON 파일로 내보냅니다. 다른 기기에서 가져올 수 있습니다.
          </p>
          <button style={S.primaryBtn} onClick={() => {
            const data = exportAllData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `muscle-highlight-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast("데이터 내보내기 완료");
          }}>
            JSON 파일로 내보내기
          </button>
        </Section>

        <Section title="가져오기">
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>
            이전에 내보낸 JSON 파일을 불러와서 설정을 복원합니다.
          </p>
          <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }}
            onChange={e => {
              const file = e.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const data = JSON.parse(reader.result);
                  importAllData(data);
                  showToast("데이터 가져오기 완료. 새로고침 후 반영됩니다.");
                } catch {
                  showToast("잘못된 파일 형식입니다");
                }
              };
              reader.readAsText(file);
            }}
          />
          <button style={S.outlineBtn} onClick={() => fileRef.current?.click()}>
            JSON 파일 가져오기
          </button>
        </Section>

        <Section title="초기화">
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>
            커스텀 운동 수정/추가/삭제를 모두 되돌리고 기본값으로 복원합니다.
          </p>
          <button style={{ ...S.outlineBtn, color: "#FF6B6B", borderColor: "rgba(255,107,107,0.3)" }}
            onClick={() => {
              resetAllCustomizations();
              clearLearningData();
              showToast("모든 데이터가 초기화되었습니다. 새로고침하세요.");
            }}>
            전체 초기화
          </button>
        </Section>

        <div style={{ marginTop: 24, padding: 16, background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
          <h4 style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginBottom: 8 }}>저장 정보</h4>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.8 }}>
            모든 데이터는 이 브라우저의 localStorage에 저장됩니다.<br />
            다른 기기에서 사용하려면 "내보내기 → 가져오기"를 이용하세요.<br />
            브라우저 데이터를 삭제하면 커스텀 설정이 초기화됩니다.
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  메인 렌더링
  // ═══════════════════════════════════════
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
          {tab === "exercises" && renderExerciseTab()}
          {tab === "learning" && renderLearningTab()}
          {tab === "data" && renderDataTab()}
        </div>

        {/* 토스트 */}
        {toast && (
          <div style={S.toast}>{toast}</div>
        )}
      </div>
    </div>
  );
}

// ── 유틸리티 컴포넌트 ──

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", minWidth: 80 }}>{label}</label>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>{children}</div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{
      padding: "16px 12px", borderRadius: 10, textAlign: "center",
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#E84040" }}>{value}</div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function getTimeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

// ── 스타일 ──

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
