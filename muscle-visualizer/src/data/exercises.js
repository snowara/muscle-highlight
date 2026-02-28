// ============================================================
// exercises.js — 인덱스 파일
//
// 카테고리별 분할 파일을 통합하여 기존 API 유지:
//   - EXERCISE_DB : 전체 운동 데이터
//   - CATEGORIES  : 전체 카테고리 정의
//
// 각 운동 데이터 구조:
//   name, koreanName, variant, icon, category, equipment,
//   difficulty, description, snsTags, isIsometric,
//   primary, secondary, trainerTip, goodFormMessage, corrections
// ============================================================

import { UPPER_EXERCISES, UPPER_CATEGORIES } from "./exercises-upper";
import { LOWER_EXERCISES, LOWER_CATEGORIES } from "./exercises-lower";
import { CORE_EXERCISES, CORE_CATEGORIES } from "./exercises-core";

export const CATEGORIES = {
  ...UPPER_CATEGORIES,
  ...LOWER_CATEGORIES,
  ...CORE_CATEGORIES,
};

export const EXERCISE_DB = {
  ...UPPER_EXERCISES,
  ...LOWER_EXERCISES,
  ...CORE_EXERCISES,
};

// ── localStorage 커스텀 데이터 자동 로드 ──
// 관리자가 수정/추가/삭제한 운동을 기본 DB 위에 오버라이드
(function loadCustomizations() {
  try {
    const customs = JSON.parse(localStorage.getItem("muscle-highlight-custom-exercises") || "{}");
    const deleted = JSON.parse(localStorage.getItem("muscle-highlight-deleted-exercises") || "[]");
    for (const [key, data] of Object.entries(customs)) {
      if (EXERCISE_DB[key]) {
        Object.assign(EXERCISE_DB[key], data);
      } else {
        EXERCISE_DB[key] = data;
      }
    }
    for (const key of deleted) {
      delete EXERCISE_DB[key];
    }
  } catch (e) { /* localStorage 불가 환경 무시 */ }
})();
