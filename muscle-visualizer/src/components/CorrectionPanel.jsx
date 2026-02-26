import { useState, useEffect } from "react";

const STORAGE_KEY = "customGuides";

function loadCustomGuides() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch { return {}; }
}

function saveCustomGuides(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function CorrectionPanel({ analysis, exerciseKey }) {
  const [customGuides, setCustomGuides] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // 운동별 커스텀 가이드 로드
  useEffect(() => {
    if (!exerciseKey) return;
    const all = loadCustomGuides();
    setCustomGuides(all[exerciseKey] || []);
    setIsAdding(false);
    setInputValue("");
  }, [exerciseKey]);

  function handleAdd() {
    const text = inputValue.trim();
    if (!text || !exerciseKey) return;
    const all = loadCustomGuides();
    const list = all[exerciseKey] || [];
    list.push(text);
    all[exerciseKey] = list;
    saveCustomGuides(all);
    setCustomGuides(list);
    setInputValue("");
    setIsAdding(false);
  }

  function handleDelete(index) {
    if (!exerciseKey) return;
    const all = loadCustomGuides();
    const list = [...(all[exerciseKey] || [])];
    list.splice(index, 1);
    all[exerciseKey] = list;
    saveCustomGuides(all);
    setCustomGuides(list);
  }

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

      {/* 올바른 항목 (체크) */}
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

      {/* 관장님 커스텀 가이드 */}
      <div style={{ marginTop: 8 }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 6,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 0.5 }}>
            트레이너 코멘트
          </span>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              style={{
                fontSize: 10, fontWeight: 600, padding: "3px 10px",
                borderRadius: 6, border: "1px solid rgba(59,130,246,0.3)",
                background: "rgba(59,130,246,0.1)", color: "#3B82F6",
                cursor: "pointer",
              }}
            >
              + 추가
            </button>
          )}
        </div>

        {/* 기존 커스텀 가이드 목록 */}
        {customGuides.map((guide, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 8,
            padding: "8px 12px", borderRadius: 8, marginBottom: 4,
            background: "rgba(59,130,246,0.06)",
            border: "1px solid rgba(59,130,246,0.15)",
          }}>
            <span style={{ fontSize: 11, color: "#3B82F6", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>💬</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", lineHeight: 1.5, flex: 1 }}>{guide}</span>
            <button
              onClick={() => handleDelete(i)}
              style={{
                fontSize: 10, color: "rgba(255,255,255,0.25)", background: "none",
                border: "none", cursor: "pointer", padding: "0 2px", flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        ))}

        {/* 입력 폼 */}
        {isAdding && (
          <div style={{
            display: "flex", gap: 6, marginTop: 4,
          }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              placeholder="교정 코멘트를 입력하세요"
              autoFocus
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 8,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#fff", fontSize: 11, outline: "none",
              }}
            />
            <button
              onClick={handleAdd}
              style={{
                padding: "8px 14px", borderRadius: 8, border: "none",
                background: "#3B82F6", color: "#fff", fontSize: 11,
                fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              저장
            </button>
            <button
              onClick={() => { setIsAdding(false); setInputValue(""); }}
              style={{
                padding: "8px 10px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent", color: "rgba(255,255,255,0.4)",
                fontSize: 11, cursor: "pointer",
              }}
            >
              취소
            </button>
          </div>
        )}

        {customGuides.length === 0 && !isAdding && (
          <div style={{
            padding: "10px 12px", borderRadius: 8, textAlign: "center",
            background: "rgba(255,255,255,0.02)",
            border: "1px dashed rgba(255,255,255,0.08)",
          }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
              운동별 추가 코멘트를 등록할 수 있습니다
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
