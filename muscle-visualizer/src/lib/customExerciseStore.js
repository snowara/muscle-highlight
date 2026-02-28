/**
 * customExerciseStore.js — 커스텀 운동 CRUD + 데이터 내보내기/가져오기
 *
 * localStorage 기반. 기본 EXERCISE_DB 위에 오버라이드/추가/삭제.
 */

const CUSTOM_KEY = "muscle-highlight-custom-exercises";
const DELETED_KEY = "muscle-highlight-deleted-exercises";
const LEARNING_KEY = "muscle-highlight-learning";

export function getCustomExercises() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY)) || {};
  } catch { return {}; }
}

export function getDeletedExercises() {
  try {
    return JSON.parse(localStorage.getItem(DELETED_KEY)) || [];
  } catch { return []; }
}

export function saveExercise(key, data) {
  const customs = getCustomExercises();
  customs[key] = { ...data, _custom: true, _updatedAt: Date.now() };
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(customs));
  // 삭제 목록에서 제거
  const deleted = getDeletedExercises().filter(k => k !== key);
  localStorage.setItem(DELETED_KEY, JSON.stringify(deleted));
}

export function deleteExercise(key) {
  const customs = getCustomExercises();
  if (customs[key]) {
    const { [key]: _, ...rest } = customs;
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(rest));
  }
  const deleted = getDeletedExercises();
  if (!deleted.includes(key)) {
    localStorage.setItem(DELETED_KEY, JSON.stringify([...deleted, key]));
  }
}

export function restoreExercise(key) {
  const deleted = getDeletedExercises().filter(k => k !== key);
  localStorage.setItem(DELETED_KEY, JSON.stringify(deleted));
}

/** 모든 데이터 JSON 내보내기 */
export function exportAllData() {
  return {
    customExercises: getCustomExercises(),
    deletedExercises: getDeletedExercises(),
    learningData: JSON.parse(localStorage.getItem(LEARNING_KEY) || "[]"),
    exportedAt: Date.now(),
    version: "1.0",
  };
}

/** 운동 데이터 객체 검증 — 각 값이 name/primary/secondary 구조인지 확인 */
function isValidExerciseMap(obj) {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return false;
  for (const val of Object.values(obj)) {
    if (typeof val !== "object" || val === null || Array.isArray(val)) return false;
    if (typeof val.name !== "string") return false;
  }
  return true;
}

/** JSON 데이터 가져오기 — 구조 검증 후 저장 */
export function importAllData(data) {
  if (typeof data !== "object" || data === null) {
    throw new Error("유효하지 않은 데이터 형식입니다");
  }

  if (data.customExercises != null) {
    if (!isValidExerciseMap(data.customExercises)) {
      throw new Error("customExercises 형식이 올바르지 않습니다");
    }
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(data.customExercises));
  }

  if (data.deletedExercises != null) {
    if (!Array.isArray(data.deletedExercises) || !data.deletedExercises.every(k => typeof k === "string")) {
      throw new Error("deletedExercises 형식이 올바르지 않습니다");
    }
    localStorage.setItem(DELETED_KEY, JSON.stringify(data.deletedExercises));
  }

  if (data.learningData != null) {
    if (!Array.isArray(data.learningData)) {
      throw new Error("learningData 형식이 올바르지 않습니다");
    }
    localStorage.setItem(LEARNING_KEY, JSON.stringify(data.learningData));
  }
}

/** 커스텀 운동만 초기화 (기본 DB로 복원) */
export function resetAllCustomizations() {
  localStorage.removeItem(CUSTOM_KEY);
  localStorage.removeItem(DELETED_KEY);
}
