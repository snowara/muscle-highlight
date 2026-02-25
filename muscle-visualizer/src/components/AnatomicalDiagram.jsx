import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { EXERCISE_DB } from "../data/exercises";
import { MUSCLE_REGIONS } from "../data/muscles";
import { renderFrontBodySVG, renderBackBodySVG, FRONT_MUSCLE_KEYS, BACK_MUSCLE_KEYS } from "../lib/bodyDiagram";
import { saveExercise, getCustomExercises } from "../lib/customExerciseStore";

const BACK_VIEW_MUSCLES = new Set(["lats", "traps", "lowerBack", "glutes", "hamstrings"]);
const FRONT_VIEW_MUSCLES = new Set(["chest", "quadriceps", "biceps", "core"]);

// 클릭 시 순환: 없음 → 주동근 → 보조근 → 없음
const CYCLE_STATES = [null, "primary", "secondary"];

function bestView(exercise) {
  if (!exercise) return "front";
  const primaryKeys = Object.keys(exercise.primary || {});
  const backCount = primaryKeys.filter((k) => BACK_VIEW_MUSCLES.has(k.replace(/_left|_right/, ""))).length;
  const frontCount = primaryKeys.filter((k) => FRONT_VIEW_MUSCLES.has(k.replace(/_left|_right/, ""))).length;
  return backCount > frontCount ? "back" : "front";
}

function getMergedExercise(exerciseKey) {
  const base = EXERCISE_DB[exerciseKey];
  if (!base) return null;
  const customs = getCustomExercises();
  if (customs[exerciseKey]) {
    return { ...base, ...customs[exerciseKey] };
  }
  return base;
}

/**
 * Expand base muscle keys to include side-specific keys if present.
 * e.g., { chest: 80 } → activeMuscles has "chest" for both sides.
 *       { chest_left: 80, chest_right: 40 } → side-specific.
 */
function buildActiveMuscles(primary, secondary, muscleStatus) {
  const result = {};
  for (const [key, val] of Object.entries(primary)) {
    result[key] = { level: "primary", status: muscleStatus[key.replace(/_left|_right/, "")] || "good" };
  }
  for (const [key, val] of Object.entries(secondary)) {
    if (!result[key]) {
      result[key] = { level: "secondary", status: muscleStatus[key.replace(/_left|_right/, "")] || "good" };
    }
  }
  return result;
}

/** Check if a muscle key has any side-specific entries */
function hasSideKeys(obj, baseKey) {
  return (baseKey + "_left") in obj || (baseKey + "_right") in obj;
}

/** Get the state (null, "primary", "secondary") for a specific key */
function getState(primary, secondary, key) {
  if (key in primary) return "primary";
  if (key in secondary) return "secondary";
  return null;
}

/** Cycle a single key's state */
function cycleKey(primary, secondary, key, activation) {
  const current = getState(primary, secondary, key);
  const idx = CYCLE_STATES.indexOf(current);
  const next = CYCLE_STATES[(idx + 1) % CYCLE_STATES.length];

  const newP = { ...primary };
  const newS = { ...secondary };
  delete newP[key];
  delete newS[key];
  if (next === "primary") newP[key] = activation || 80;
  else if (next === "secondary") newS[key] = activation || 40;
  return { primary: newP, secondary: newS };
}

export default function AnatomicalDiagram({ exerciseKey, analysis, view: viewProp, style, onMuscleUpdate }) {
  const exercise = getMergedExercise(exerciseKey);
  const [view, setView] = useState(viewProp || "front");
  const [editMode, setEditMode] = useState(false);
  const [sideEdit, setSideEdit] = useState(false); // 좌/우 분리 편집 모드
  const [editPrimary, setEditPrimary] = useState({});
  const [editSecondary, setEditSecondary] = useState({});
  const [savedMsg, setSavedMsg] = useState("");
  const svgRef = useRef(null);

  useEffect(() => {
    if (exercise) setView(bestView(exercise));
  }, [exerciseKey]);

  // 편집모드 진입 시 데이터 로드
  useEffect(() => {
    if (editMode && exercise) {
      setEditPrimary({ ...(exercise.primary || {}) });
      setEditSecondary({ ...(exercise.secondary || {}) });
      setSavedMsg("");
    }
  }, [editMode, exerciseKey]);

  // 좌우모드 토글 시: 기존 데이터를 좌우로 분리하거나 합치기
  useEffect(() => {
    if (!editMode) return;
    if (sideEdit) {
      // 통합 → 좌우 분리: "chest:80" → "chest_left:80, chest_right:80"
      const expandSides = (obj) => {
        const result = {};
        for (const [key, val] of Object.entries(obj)) {
          if (key.endsWith("_left") || key.endsWith("_right")) {
            result[key] = val; // 이미 사이드 키
          } else {
            result[key + "_left"] = val;
            result[key + "_right"] = val;
          }
        }
        return result;
      };
      setEditPrimary(prev => expandSides(prev));
      setEditSecondary(prev => expandSides(prev));
    } else {
      // 좌우 → 통합: 양쪽 동일하면 합치기, 다르면 더 높은 등급 우선
      const collapseSides = (prim, sec) => {
        const allKeys = new Set();
        [...Object.keys(prim), ...Object.keys(sec)].forEach(k => {
          allKeys.add(k.replace(/_left|_right/, ""));
        });
        const newP = {};
        const newS = {};
        for (const base of allKeys) {
          const lState = getState(prim, sec, base + "_left") || getState(prim, sec, base);
          const rState = getState(prim, sec, base + "_right") || getState(prim, sec, base);
          // 하나라도 primary면 primary, 하나라도 secondary면 secondary
          const merged = lState === "primary" || rState === "primary" ? "primary"
            : lState === "secondary" || rState === "secondary" ? "secondary"
            : null;
          if (merged === "primary") newP[base] = prim[base + "_left"] || prim[base + "_right"] || prim[base] || 80;
          else if (merged === "secondary") newS[base] = sec[base + "_left"] || sec[base + "_right"] || sec[base] || 40;
        }
        return { primary: newP, secondary: newS };
      };
      const { primary: newP, secondary: newS } = collapseSides(editPrimary, editSecondary);
      setEditPrimary(newP);
      setEditSecondary(newS);
    }
  }, [sideEdit]);

  // Build activeMuscles
  const activeMuscles = useMemo(() => {
    if (!exercise) return {};
    const muscleStatus = analysis?.muscleStatus || {};
    const primary = editMode ? editPrimary : (exercise.primary || {});
    const secondary = editMode ? editSecondary : (exercise.secondary || {});
    return buildActiveMuscles(primary, secondary, muscleStatus);
  }, [exerciseKey, analysis, editMode, editPrimary, editSecondary]);

  // SVG 렌더링
  const svgHTML = useMemo(() => {
    const render = view === "back" ? renderBackBodySVG : renderFrontBodySVG;
    return render(activeMuscles);
  }, [activeMuscles, view]);

  // SVG 클릭 핸들러
  const handleSvgClick = useCallback((e) => {
    if (!editMode) return;
    const path = e.target.closest("[data-muscle]");
    if (!path) return;
    const muscleKey = path.getAttribute("data-muscle");
    const side = path.getAttribute("data-side"); // "left", "right", "common"
    if (!muscleKey) return;

    if (sideEdit && side && side !== "common") {
      // 좌/우 분리 모드: 클릭한 쪽만 토글
      const sideKey = muscleKey + "_" + side;
      const { primary, secondary } = cycleKey(editPrimary, editSecondary, sideKey);
      setEditPrimary(primary);
      setEditSecondary(secondary);
    } else {
      // 통합 모드: 양쪽 동시 토글
      if (sideEdit) {
        // common path 클릭 시 양쪽 모두 토글
        const lKey = muscleKey + "_left";
        const rKey = muscleKey + "_right";
        const lState = getState(editPrimary, editSecondary, lKey);
        const idx = CYCLE_STATES.indexOf(lState);
        const next = CYCLE_STATES[(idx + 1) % CYCLE_STATES.length];
        const newP = { ...editPrimary };
        const newS = { ...editSecondary };
        delete newP[lKey]; delete newP[rKey];
        delete newS[lKey]; delete newS[rKey];
        if (next === "primary") { newP[lKey] = 80; newP[rKey] = 80; }
        else if (next === "secondary") { newS[lKey] = 40; newS[rKey] = 40; }
        setEditPrimary(newP);
        setEditSecondary(newS);
      } else {
        const { primary, secondary } = cycleKey(editPrimary, editSecondary, muscleKey);
        setEditPrimary(primary);
        setEditSecondary(secondary);
      }
    }
  }, [editMode, sideEdit, editPrimary, editSecondary]);

  // 저장
  const handleSave = useCallback(() => {
    if (!exercise) return;
    const updated = {
      ...exercise,
      primary: { ...editPrimary },
      secondary: { ...editSecondary },
    };
    saveExercise(exerciseKey, updated);
    setSavedMsg("저장 완료!");
    setTimeout(() => setSavedMsg(""), 2000);
    if (onMuscleUpdate) onMuscleUpdate(exerciseKey, updated);
  }, [exerciseKey, exercise, editPrimary, editSecondary, onMuscleUpdate]);

  // 원본 복원
  const handleReset = useCallback(() => {
    const original = EXERCISE_DB[exerciseKey];
    if (!original) return;
    if (sideEdit) {
      // 원본을 좌우 분리로 확장
      const expand = (obj) => {
        const r = {};
        for (const [k, v] of Object.entries(obj)) { r[k + "_left"] = v; r[k + "_right"] = v; }
        return r;
      };
      setEditPrimary(expand(original.primary || {}));
      setEditSecondary(expand(original.secondary || {}));
    } else {
      setEditPrimary({ ...(original.primary || {}) });
      setEditSecondary({ ...(original.secondary || {}) });
    }
  }, [exerciseKey, sideEdit]);

  if (!exercise) return null;

  // 범례 데이터
  const primary = editMode ? editPrimary : (exercise.primary || {});
  const secondary = editMode ? editSecondary : (exercise.secondary || {});

  const legendPrimary = buildLegend(primary, "primary");
  const legendSecondary = buildLegend(secondary, "secondary");

  // 편집 모드: 사용 가능한 근육
  const availableMuscles = view === "back" ? BACK_MUSCLE_KEYS : FRONT_MUSCLE_KEYS;

  return (
    <div style={{ background: "#060610", borderRadius: 12, padding: 16, ...style }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{exercise.icon}</span>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{exercise.name}</span>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <ToggleBtn label={editMode ? "편집중" : "편집"} active={editMode} accent={editMode} onClick={() => setEditMode(!editMode)} />
          <ToggleBtn label="앞면" active={view === "front"} onClick={() => setView("front")} />
          <ToggleBtn label="뒷면" active={view === "back"} onClick={() => setView("back")} />
        </div>
      </div>

      {/* 편집 모드 안내 + 좌우 분리 토글 */}
      {editMode && (
        <div style={{
          background: "rgba(232,48,48,0.08)", border: "1px solid rgba(232,48,48,0.3)",
          borderRadius: 8, padding: "8px 12px", marginBottom: 10,
          fontSize: 11, color: "rgba(255,255,255,0.7)", lineHeight: 1.6,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ color: "#FF5555", fontWeight: 700 }}>근육 편집 모드</span>
              <span style={{ marginLeft: 6 }}>
                터치: <b style={{ color: "#FF4545" }}>주동근</b> → <b style={{ color: "#D03030" }}>보조근</b> → <b>제거</b>
              </span>
            </div>
            <ToggleBtn
              label={sideEdit ? "좌/우 분리" : "좌/우 통합"}
              active={sideEdit}
              accent={sideEdit}
              onClick={() => setSideEdit(!sideEdit)}
            />
          </div>
          {sideEdit && (
            <div style={{ marginTop: 4, fontSize: 10, color: "rgba(255,200,100,0.7)" }}>
              왼쪽/오른쪽 근육을 개별적으로 설정할 수 있습니다
            </div>
          )}
        </div>
      )}

      {/* SVG diagram */}
      <div
        ref={svgRef}
        onClick={handleSvgClick}
        style={{ width: "100%", lineHeight: 0 }}
        dangerouslySetInnerHTML={{ __html: svgHTML }}
      />

      {/* 편집 모드: 빠른 선택 */}
      {editMode && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 6, fontWeight: 600 }}>
            {view === "front" ? "앞면" : "뒷면"} 근육 {sideEdit ? "좌/우 선택" : "선택"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {availableMuscles.map((baseKey) => {
              const region = MUSCLE_REGIONS[baseKey];
              if (!region) return null;

              if (sideEdit) {
                // 좌/우 분리: 각각 칩 2개
                const lKey = baseKey + "_left";
                const rKey = baseKey + "_right";
                const lState = getState(editPrimary, editSecondary, lKey);
                const rState = getState(editPrimary, editSecondary, rKey);
                return (
                  <div key={baseKey} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", width: 50, flexShrink: 0 }}>
                      {region.simpleLabel}
                    </span>
                    <MuscleChip label="좌" state={lState} onClick={() => {
                      const { primary, secondary } = cycleKey(editPrimary, editSecondary, lKey);
                      setEditPrimary(primary); setEditSecondary(secondary);
                    }} />
                    <MuscleChip label="우" state={rState} onClick={() => {
                      const { primary, secondary } = cycleKey(editPrimary, editSecondary, rKey);
                      setEditPrimary(primary); setEditSecondary(secondary);
                    }} />
                  </div>
                );
              } else {
                // 통합
                const state = getState(editPrimary, editSecondary, baseKey);
                return (
                  <MuscleChip
                    key={baseKey}
                    label={region.simpleLabel}
                    state={state}
                    onClick={() => {
                      const { primary, secondary } = cycleKey(editPrimary, editSecondary, baseKey);
                      setEditPrimary(primary); setEditSecondary(secondary);
                    }}
                    wide
                  />
                );
              }
            })}
          </div>

          {/* 저장/복원 */}
          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
            <button onClick={handleSave} style={{
              padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              background: "#E83030", color: "#fff", fontSize: 12, fontWeight: 700,
            }}>저장</button>
            <button onClick={handleReset} style={{
              padding: "6px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
              cursor: "pointer", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 12,
            }}>원본 복원</button>
            {savedMsg && (
              <span style={{ color: "#4CAF50", fontSize: 11, fontWeight: 600 }}>{savedMsg}</span>
            )}
          </div>
        </div>
      )}

      {/* Muscle legend */}
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        {legendPrimary.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 600, marginRight: 2 }}>주동근</span>
            {legendPrimary.map((m) => (
              <LegendDot key={m.label} label={m.label} color="#E83030" glow="#FF2020" opacity={0.8} />
            ))}
          </div>
        )}
        {legendSecondary.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 600, marginRight: 2 }}>보조근</span>
            {legendSecondary.map((m) => (
              <LegendDot key={m.label} label={m.label} color="#C83030" glow="#FF4040" opacity={0.6} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Build unique legend items from primary/secondary keys (handles _left/_right) */
function buildLegend(obj, level) {
  const seen = new Set();
  const items = [];
  for (const key of Object.keys(obj)) {
    const baseKey = key.replace(/_left|_right/, "");
    if (seen.has(baseKey)) continue;
    seen.add(baseKey);
    const region = MUSCLE_REGIONS[baseKey];
    if (!region) continue;
    const side = key.endsWith("_left") ? " (좌)" : key.endsWith("_right") ? " (우)" : "";
    // Check if both sides exist
    const hasLeft = (baseKey + "_left") in obj;
    const hasRight = (baseKey + "_right") in obj;
    const hasBoth = hasLeft && hasRight;
    const hasBase = baseKey in obj;
    let suffix = "";
    if (!hasBase && hasLeft && !hasRight) suffix = " (좌)";
    else if (!hasBase && !hasLeft && hasRight) suffix = " (우)";
    items.push({ label: region.simpleLabel + suffix });
  }
  return items;
}

function LegendDot({ label, color, glow, opacity }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${glow}` }} />
      <span style={{ color: `rgba(255,255,255,${opacity})`, fontSize: 11 }}>{label}</span>
    </div>
  );
}

function ToggleBtn({ label, active, accent, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "4px 10px", borderRadius: 12, border: "none", cursor: "pointer",
      background: active ? accent ? "rgba(255,180,30,0.15)" : "rgba(232,48,48,0.15)" : "transparent",
      color: active ? accent ? "#FFB020" : "#FF5555" : "rgba(255,255,255,0.4)",
      fontSize: 10, fontWeight: active ? 700 : 400,
      outline: active ? accent ? "1.5px solid rgba(255,180,30,0.6)" : "1.5px solid rgba(232,48,48,0.6)" : "1px solid rgba(255,255,255,0.1)",
      transition: "all 0.15s ease",
    }}>{label}</button>
  );
}

function MuscleChip({ label, state, onClick, wide }) {
  const bg = state === "primary" ? "rgba(255,48,48,0.2)" : state === "secondary" ? "rgba(208,48,48,0.15)" : "rgba(255,255,255,0.05)";
  const border = state === "primary" ? "1px solid rgba(255,48,48,0.5)" : state === "secondary" ? "1px solid rgba(208,48,48,0.4)" : "1px solid rgba(255,255,255,0.1)";
  const color = state === "primary" ? "#FF5555" : state === "secondary" ? "#D06060" : "rgba(255,255,255,0.4)";
  const tag = state === "primary" ? " ●주" : state === "secondary" ? " ◐보" : "";

  return (
    <button onClick={onClick} style={{
      padding: "3px 8px", borderRadius: 10, cursor: "pointer",
      background: bg, border, color,
      fontSize: 10, fontWeight: state ? 600 : 400,
      transition: "all 0.15s ease",
      minWidth: wide ? 60 : 32,
    }}>
      {label}{tag}
    </button>
  );
}
