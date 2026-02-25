import { EXERCISE_DB } from "../data/exercises";
import { MUSCLE_REGIONS } from "../data/muscles";

export default function CorrectionPanel({ exerciseKey, poseResult }) {
  if (!exerciseKey || !poseResult) return null;

  const exercise = EXERCISE_DB[exerciseKey];
  if (!exercise) return null;

  const { score, status, wrongMuscles, corrections } = poseResult;
  const isCorrect = status === "correct";

  return (
    <div className="correction-panel">
      <h3 className="panel-title">
        {isCorrect ? "💪 트레이너 코멘트" : "⚠️ 자세 교정 가이드"}
      </h3>

      {isCorrect ? (
        <div className="correction-good">
          <p className="trainer-comment">{exercise.goodFormMessage || "훌륭한 자세입니다!"}</p>
          <p className="trainer-tip">{exercise.trainerTip}</p>
        </div>
      ) : (
        <>
          {/* 교정 포인트 */}
          {corrections.length > 0 && (
            <div className="correction-list">
              <h4 className="sub-title">교정 포인트</h4>
              {corrections.map((c, i) => (
                <div key={i} className="correction-item">
                  <span className="correction-icon">🔴</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          )}

          {/* 잘못된 근육 */}
          {wrongMuscles.length > 0 && (
            <div className="wrong-muscles">
              <h4 className="sub-title">주의 근육</h4>
              <div className="muscle-tags">
                {wrongMuscles.map((m) => {
                  const muscle = MUSCLE_REGIONS[m];
                  return (
                    <span
                      key={m}
                      className="muscle-tag wrong"
                      style={{ borderColor: muscle?.wrongColor }}
                    >
                      {muscle?.simpleLabel || m}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* 운동별 교정 메시지 */}
          {exercise.corrections && exercise.corrections.length > 0 && (
            <div className="correction-messages">
              <h4 className="sub-title">교정 안내</h4>
              {exercise.corrections.slice(0, 4).map((corr, i) => (
                <div key={i} className="correction-message">
                  <span className="msg-number">{i + 1}</span>
                  <div>
                    <p className="msg-issue">{corr.issue}</p>
                    <p className="msg-fix">{corr.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
