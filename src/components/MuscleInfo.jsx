import { EXERCISE_DB } from "../data/exercises";
import { MUSCLE_REGIONS } from "../data/muscles";
import { getLearningStats } from "../lib/learningStore";
import { getMuscleDisplayColor, getMuscleQuality, CORRECT_COLOR, INCORRECT_COLOR } from "../lib/poseAnalyzer";

function Badge({ label, color, level, muscleKey, poseQuality }) {
  const bgAlpha = level === "HIGH" ? "33" : "22";
  const muscleQualityMap = poseQuality ? getMuscleQuality(poseQuality) : null;
  const mq = muscleQualityMap?.[muscleKey];
  const qualityColor = mq ? getMuscleDisplayColor(mq.score) : null;
  const qualityPercent = mq ? Math.round(mq.score * 100) : null;

  // Find failed checkpoints related to this muscle
  const corrections = poseQuality?.checkpoints?.filter(
    (cp) => !cp.pass && cp.muscles && cp.muscles.includes(muscleKey)
  ) || [];

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 0,
      borderRadius: 8,
      background: color + bgAlpha,
      border: `1px solid ${color}40`,
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px",
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%", background: color,
          boxShadow: level === "HIGH" ? `0 0 8px ${color}` : "none",
        }} />
        <span style={{ color: "#fff", fontSize: 12, fontWeight: 500, flex: 1 }}>{label}</span>

        {/* Quality score indicator */}
        {mq && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* Mini quality bar */}
            <div style={{
              width: 36, height: 5, borderRadius: 3,
              background: "rgba(255,255,255,0.1)",
              overflow: "hidden",
            }}>
              <div style={{
                width: `${qualityPercent}%`, height: "100%", borderRadius: 3,
                background: qualityColor,
                transition: "width 0.3s ease",
              }} />
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, minWidth: 26, textAlign: "right",
              color: qualityColor,
            }}>
              {qualityPercent}%
            </span>
          </div>
        )}

        {!mq && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
            background: level === "HIGH" ? color + "44" : "rgba(255,255,255,0.08)",
            color: level === "HIGH" ? "#fff" : "rgba(255,255,255,0.5)",
          }}>
            {level}
          </span>
        )}
      </div>

      {/* Correction messages for this specific muscle */}
      {corrections.length > 0 && (
        <div style={{
          padding: "4px 12px 8px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}>
          {corrections.map((cp, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 6, marginTop: 4,
            }}>
              <div style={{
                width: 4, height: 4, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                background: cp.score < 40 ? INCORRECT_COLOR : "#FF8C42",
              }} />
              <span style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 10, lineHeight: 1.4,
              }}>
                {cp.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MuscleInfo({ exerciseKey, mediapipeStatus, autoDetected, onSelectExercise, poseQuality }) {
  const exercise = EXERCISE_DB[exerciseKey];
  if (!exercise) return null;

  return (
    <div>
      <h3 style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
        근육 분석
      </h3>

      {/* AI auto-detection result with top 3 */}
      {autoDetected && (
        <div style={{
          padding: "10px 12px", borderRadius: 8, marginBottom: 12,
          background: "linear-gradient(135deg, rgba(0,229,255,0.08), rgba(124,77,255,0.08))",
          border: "1px solid rgba(0,229,255,0.2)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 12 }}>🤖</span>
            <span style={{ color: "#00E5FF", fontSize: 11, fontWeight: 700 }}>AI 운동 감지</span>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, marginLeft: "auto" }}>
              클릭하여 변경
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {(autoDetected.top3 || [{ key: autoDetected.key, score: autoDetected.confidence }]).map((item, i) => {
              const ex = EXERCISE_DB[item.key];
              if (!ex) return null;
              const isSelected = item.key === exerciseKey;
              const barWidth = Math.max(10, Math.min(100, item.score * 1.1));
              return (
                <div
                  key={item.key}
                  onClick={() => onSelectExercise?.(item.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 8px", borderRadius: 6, cursor: "pointer",
                    background: isSelected ? "rgba(0,229,255,0.12)" : "rgba(255,255,255,0.03)",
                    border: isSelected ? "1px solid rgba(0,229,255,0.3)" : "1px solid transparent",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: 14, width: 22, textAlign: "center" }}>{ex.icon}</span>
                  <span style={{
                    color: isSelected ? "#fff" : "rgba(255,255,255,0.6)",
                    fontSize: 12, fontWeight: isSelected ? 600 : 400, flex: 1,
                  }}>
                    {ex.name}
                  </span>
                  {/* score bar */}
                  <div style={{
                    width: 50, height: 4, borderRadius: 2,
                    background: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${barWidth}%`, height: "100%", borderRadius: 2,
                      background: i === 0 ? "#00E5FF" : i === 1 ? "#7C4DFF" : "#FF6B35",
                    }} />
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, minWidth: 28, textAlign: "right",
                    color: i === 0 ? "#00E5FF" : "rgba(255,255,255,0.4)",
                  }}>
                    {item.score}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {Object.keys(exercise.primary).map((key) => {
          const m = MUSCLE_REGIONS[key];
          return m ? <Badge key={key} label={m.label} color={m.color} level="HIGH" muscleKey={key} poseQuality={poseQuality} /> : null;
        })}
        {Object.keys(exercise.secondary).map((key) => {
          const m = MUSCLE_REGIONS[key];
          return m ? <Badge key={key} label={m.label} color={m.color} level="MED" muscleKey={key} poseQuality={poseQuality} /> : null;
        })}
      </div>

      {/* Pose quality display */}
      {poseQuality && (
        <div style={{
          padding: "10px 12px", borderRadius: 8, marginBottom: 12,
          background: poseQuality.status !== 'bad'
            ? "rgba(0,170,255,0.08)"
            : "rgba(255,59,92,0.08)",
          border: `1px solid ${poseQuality.status !== 'bad' ? "rgba(0,170,255,0.2)" : "rgba(255,59,92,0.2)"}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 12 }}>{poseQuality.status !== 'bad' ? "✅" : "⚠️"}</span>
            <span style={{
              color: poseQuality.status !== 'bad' ? "#00AAFF" : "#FF3B5C",
              fontSize: 11, fontWeight: 700,
            }}>
              자세 점수: {poseQuality.score}/100
            </span>
            <span style={{
              marginLeft: "auto",
              fontSize: 10, fontWeight: 600,
              padding: "2px 6px", borderRadius: 4,
              background: poseQuality.status !== 'bad' ? "rgba(0,170,255,0.15)" : "rgba(255,59,92,0.15)",
              color: poseQuality.status !== 'bad' ? "#00AAFF" : "#FF3B5C",
            }}>
              {poseQuality.status !== 'bad' ? "Good" : "Fix"}
            </span>
          </div>
          {(() => {
            const failedCps = poseQuality.checkpoints?.filter(cp => !cp.pass) || [];
            if (failedCps.length === 0) return null;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {failedCps.map((cp, i) => (
                  <div key={i} style={{
                    padding: "6px 8px", borderRadius: 6,
                    background: cp.score < 40 ? "rgba(255,59,92,0.08)" : "rgba(255,140,66,0.08)",
                    border: `1px solid ${cp.score < 40 ? "rgba(255,59,92,0.15)" : "rgba(255,140,66,0.15)"}`,
                  }}>
                    <div style={{
                      color: cp.score < 40 ? "#FF3B5C" : "#FF8C42",
                      fontSize: 10, fontWeight: 700, marginBottom: 2,
                    }}>
                      {cp.score < 40 ? "🔴" : "🟡"} {cp.label}
                    </div>
                    <div style={{
                      color: "rgba(255,255,255,0.7)",
                      fontSize: 10, lineHeight: 1.4,
                    }}>
                      {cp.message}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* MediaPipe status */}
      <div style={{
        padding: "8px 12px", borderRadius: 8,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background:
            mediapipeStatus === "ready" ? "#00E676" :
            mediapipeStatus === "loading" ? "#FFD54F" :
            mediapipeStatus === "fallback" ? "#FF6B35" : "#FF3B5C",
        }} />
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
          {mediapipeStatus === "ready" && "MediaPipe 활성"}
          {mediapipeStatus === "loading" && "MediaPipe 로딩 중..."}
          {mediapipeStatus === "fallback" && "데모 모드 (Fallback)"}
          {mediapipeStatus === "error" && "MediaPipe 오류"}
        </span>
      </div>

      {/* Learning stats */}
      {(() => {
        const stats = getLearningStats();
        if (stats.totalCorrections === 0) return null;
        return (
          <div style={{
            padding: "8px 12px", borderRadius: 8, marginTop: 6,
            background: "rgba(124,77,255,0.06)",
            border: "1px solid rgba(124,77,255,0.15)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 11 }}>🧠</span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
              학습 데이터: {stats.totalCorrections}건
            </span>
          </div>
        );
      })()}
    </div>
  );
}
