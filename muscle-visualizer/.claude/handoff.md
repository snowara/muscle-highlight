# Handoff Document
생성일시: 2026-03-01 KST (업데이트)
effort: high

## 1. 완료한 작업
- TF.js MLP 운동 분류 모델 구축 (합성 데이터 48,000개, 87.3% Top-1 정확도)
- 브라우저 하이브리드 분류: ML 신뢰도 >= 60% → ML, < 60% → 규칙 fallback
- learningStore에 20-dim fullFeatures 저장 + exportForTraining() 추가
- 코드 리뷰 이슈 수정: 텐서 메모리 누수, featureOrder 3중 복제 해소, console 제거
- 실제 사진 ML 테스트: 3장 중 1장 정확 (33%), 합성 데이터 한계 확인
- **사용자 보정 데이터 재학습 파이프라인 구현**
  - retrainWithCorrections.mjs: 합성 + 보정 데이터 결합 재학습 (5x oversample)
  - AdminLearningTab에 "재학습 데이터 내보내기" 버튼 추가
  - E2E 검증: 운동 수정 → localStorage에 fullFeatures 정상 저장 확인

## 2. 변경 파일 요약
| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| scripts/retrainWithCorrections.mjs | 신규 | 합성+보정 데이터 결합 재학습 스크립트 |
| scripts/package.json | 수정 | retrain 스크립트 추가 |
| src/components/AdminLearningTab.jsx | 수정 | ML 재학습 데이터 내보내기 버튼 추가 |

## 3. 테스트 필요 사항
- [ ] 관리자 패널 > 학습 현황 > "재학습 데이터 내보내기" 버튼 표시 확인
- [ ] 보정 데이터 없을 때 내보내기 버튼 비활성화 확인
- [ ] 보정 데이터 있을 때 JSON 파일 다운로드 확인
- [ ] retrainWithCorrections.mjs 실행 시 모델 재학습 정상 완료

## 4. 알려진 이슈 / TODO
- [ ] 실제 운동 사진으로 ML 정확도 개선 필요 (현재 33% → 목표 80%+)
- [ ] ML 신뢰도 임계값 상향 검토 (현재 60% → 75~80%)
- [ ] 보정 데이터 10건 이상 축적 후 재학습 효과 검증

## 5. 주의사항
- exerciseClassifier.js ↔ learningStore.js 순환 참조 주의 (현재 안정)
- Node.js 22+ 환경에서 학습 스크립트 실행 시 util.isNullOrUndefined 폴리필 필수
- retrainWithCorrections.mjs는 scripts/ 디렉토리에서 실행 (cd scripts && npm run retrain corrections.json)

## 6. 검증 권장 설정
- effort: high
- security: false
- coverage: false
- only: build
- loop: 3
