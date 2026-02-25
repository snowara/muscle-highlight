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
    delete customs[key];
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(customs));
  }
  const deleted = getDeletedExercises();
  if (!deleted.includes(key)) {
    deleted.push(key);
    localStorage.setItem(DELETED_KEY, JSON.stringify(deleted));
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

/** JSON 데이터 가져오기 */
export function importAllData(data) {
  if (data.customExercises) {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(data.customExercises));
  }
  if (data.deletedExercises) {
    localStorage.setItem(DELETED_KEY, JSON.stringify(data.deletedExercises));
  }
  if (data.learningData) {
    localStorage.setItem(LEARNING_KEY, JSON.stringify(data.learningData));
  }
}

/** 커스텀 운동만 초기화 (기본 DB로 복원) */
export function resetAllCustomizations() {
  localStorage.removeItem(CUSTOM_KEY);
  localStorage.removeItem(DELETED_KEY);
}
