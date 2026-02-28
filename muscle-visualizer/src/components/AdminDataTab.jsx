/**
 * AdminDataTab.jsx -- 데이터 내보내기/가져오기 탭
 * AdminPanel에서 분리된 데이터 관리 컴포넌트
 */

import { useRef } from "react";
import { exportAllData, importAllData, resetAllCustomizations } from "../lib/customExerciseStore";
import { clearLearningData } from "../lib/learningStore";

export default function AdminDataTab({ showToast, styles }) {
  const fileRef = useRef(null);

  function handleExport() {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `muscle-highlight-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("데이터 내보내기 완료");
  }

  function handleImport(e) {
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
  }

  function handleResetAll() {
    if (!window.confirm("모든 커스텀 운동과 학습 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }
    resetAllCustomizations();
    clearLearningData();
    showToast("모든 데이터가 초기화되었습니다. 새로고침하세요.");
  }

  return (
    <div>
      <h2 style={styles.heading}>데이터 관리</h2>

      <Section title="내보내기">
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>
          커스텀 운동 + 학습 데이터를 JSON 파일로 내보냅니다. 다른 기기에서 가져올 수 있습니다.
        </p>
        <button style={styles.primaryBtn} onClick={handleExport}>
          JSON 파일로 내보내기
        </button>
      </Section>

      <Section title="가져오기">
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>
          이전에 내보낸 JSON 파일을 불러와서 설정을 복원합니다.
        </p>
        <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }}
          onChange={handleImport}
        />
        <button style={styles.outlineBtn} onClick={() => fileRef.current?.click()}>
          JSON 파일 가져오기
        </button>
      </Section>

      <Section title="초기화">
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>
          커스텀 운동 수정/추가/삭제를 모두 되돌리고 기본값으로 복원합니다.
        </p>
        <button style={{ ...styles.outlineBtn, color: "#FF6B6B", borderColor: "rgba(255,107,107,0.3)" }}
          onClick={handleResetAll}>
          전체 초기화
        </button>
      </Section>

      <div style={{ marginTop: 24, padding: 16, background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
        <h4 style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginBottom: 8 }}>저장 정보</h4>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.8 }}>
          모든 데이터는 이 브라우저의 localStorage에 저장됩니다.<br />
          다른 기기에서 사용하려면 &quot;내보내기 &rarr; 가져오기&quot;를 이용하세요.<br />
          브라우저 데이터를 삭제하면 커스텀 설정이 초기화됩니다.
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>{title}</h3>
      {children}
    </div>
  );
}
