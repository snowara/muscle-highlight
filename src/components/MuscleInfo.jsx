import { EXERCISE_DB } from "../data/exercises";
import { MUSCLE_REGIONS } from "../data/muscles";

export default function MuscleInfo({ exerciseKey, poseResult }) {
  if (!exerciseKey) return null;

  const exercise = EXERCISE_DB[exerciseKey];
  if (!exercise) return null;

  const primaryKeys = typeof exercise.primary === "object" && !Array.isArray(exercise.primary)
    ? Object.keys(exercise.primary) : (exercise.primary || []);
  const secondaryKeys = typeof exercise.secondary === "object" && !Array.isArray(exercise.secondary)
    ? Object.keys(exercise.secondary) : (exercise.secondary || []);

  const wrongSet = new Set(poseResult?.wrongMuscles || []);

  function renderMuscle(muscleId, level) {
    const muscle = MUSCLE_REGIONS[muscleId];
    if (!muscle) return null;
    const isWrong = wrongSet.has(muscleId);
    const color = isWrong ? muscle.wrongColor : muscle.correctColor;

    return (
      <div key={muscleId} className={`muscle-item ${isWrong ? "wrong" : "correct"}`}>
        <span className="muscle-dot" style={{ background: color }} />
        <span className="muscle-name">{muscle.simpleLabel}</span>
        <span className={`muscle-level ${level}`}>
          {level === "primary" ? "HIGH" : "MED"}
        </span>
        {isWrong && <span className="muscle-warn">⚠</span>}
      </div>
    );
  }

  return (
    <div className="muscle-info">
      <h3 className="panel-title">근육 분석</h3>

      <div className="exercise-header">
        <span className="ex-icon">{exercise.icon}</span>
        <div>
          <p className="ex-name">{exercise.name}</p>
          <p className="ex-desc">{exercise.description}</p>
        </div>
      </div>

      <div className="muscle-section">
        <h4 className="sub-title">주동근</h4>
        {primaryKeys.map((m) => renderMuscle(m, "primary"))}
      </div>

      <div className="muscle-section">
        <h4 className="sub-title">보조근</h4>
        {secondaryKeys.map((m) => renderMuscle(m, "secondary"))}
      </div>
    </div>
  );
}
