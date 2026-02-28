/**
 * AdminLearningTab.jsx -- 학습 데이터 탭
 * AdminPanel에서 분리된 AI 학습 현황 컴포넌트
 */

import { EXERCISE_DB } from "../data/exercises";
import { getDetailedStats, getLearningHistory } from "../lib/learningStore";

export default function AdminLearningTab({ onClearLearning, styles }) {
  const stats = getDetailedStats();
  const history = getLearningHistory(30);

  return (
    <div>
      <h2 style={styles.heading}>AI 학습 현황</h2>

      {/* 요약 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        <StatCard label="총 학습 횟수" value={stats.totalCorrections} />
        <StatCard label="학습된 운동" value={stats.byExercise.length} />
        <StatCard label="학습 기간" value={
          stats.oldestEntry ? `${Math.ceil((Date.now() - stats.oldestEntry) / 86400000)}일` : "-"
        } />
      </div>

      {/* 운동별 학습 통계 */}
      <ExerciseStatsSection byExercise={stats.byExercise} />

      {/* 최근 학습 이력 */}
      <HistorySection history={history} />

      {/* 학습 초기화 */}
      <div style={{ marginTop: 16 }}>
        <button style={{ ...styles.outlineBtn, color: "#FF6B6B", borderColor: "rgba(255,107,107,0.3)" }}
          onClick={onClearLearning}>
          학습 데이터 초기화
        </button>
      </div>
    </div>
  );
}

function ExerciseStatsSection({ byExercise }) {
  if (byExercise.length === 0) {
    return (
      <Section title="운동별 수정 횟수">
        <div style={{ textAlign: "center", padding: 20, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
          아직 학습 데이터가 없습니다. 사진을 분석하고 운동을 수정하면 AI가 학습합니다.
        </div>
      </Section>
    );
  }

  const maxCount = byExercise[0]?.corrections || 1;

  return (
    <Section title="운동별 수정 횟수">
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {byExercise.map(s => {
          const ex = EXERCISE_DB[s.exerciseKey];
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
    </Section>
  );
}

function HistorySection({ history }) {
  if (history.length === 0) {
    return (
      <Section title="최근 학습 이력">
        <div style={{ textAlign: "center", padding: 20, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
          이력이 없습니다
        </div>
      </Section>
    );
  }

  return (
    <Section title="최근 학습 이력">
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
              <span style={{ color: "rgba(255,255,255,0.3)" }}>&rarr;</span>
              <span style={{ color: "#22C55E" }}>{toEx?.name || h.correct}</span>
              <span style={{ color: "rgba(255,255,255,0.2)", marginLeft: "auto", fontSize: 10 }}>{timeAgo}</span>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// -- 유틸리티 --
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

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>{title}</h3>
      {children}
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
