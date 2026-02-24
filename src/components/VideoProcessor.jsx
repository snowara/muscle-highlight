import { useState } from "react";
import { EXERCISE_DB } from "../data/exercises";
import ExerciseGrid from "./ExerciseGrid";
import ControlPanel from "./ControlPanel";
import BrandSettings from "./BrandSettings";
import { processVideo, downloadVideo } from "../lib/videoProcessor";

export default function VideoProcessor({ videoFile, brand, setBrand, onReset }) {
  const [selectedExercise, setSelectedExercise] = useState("auto");
  const [autoDetected, setAutoDetected] = useState(null);
  const [glowIntensity, setGlowIntensity] = useState(0.7);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const exerciseKey = selectedExercise === "auto" ? (autoDetected?.key || "squat") : selectedExercise;
  const exercise = EXERCISE_DB[exerciseKey];

  async function handleProcess() {
    setIsProcessing(true);
    setProgress(0);
    setResultBlob(null);

    try {
      const blob = await processVideo(
        videoFile,
        selectedExercise === "auto" ? "auto" : selectedExercise,
        { glowIntensity, showSkeleton, showLabels },
        setProgress,
        (detected) => {
          setAutoDetected(detected);
        }
      );
      setResultBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error("Video processing failed:", e);
      alert("영상 처리 중 오류가 발생했습니다: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  }

  function handleDownload() {
    if (!resultBlob) return;
    const safeName = brand.gymName.replace(/[^a-zA-Z0-9가-힣]/g, "_");
    const safeExercise = exercise.name.replace(/[^a-zA-Z0-9가-힣]/g, "_");
    downloadVideo(resultBlob, `${safeName}_${safeExercise}_muscle.webm`);
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div className="edit-layout" style={{ display: "flex", gap: 24 }}>
        {/* left: video area */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* source preview */}
          <div style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16, overflow: "hidden",
          }}>
            {previewUrl ? (
              <video
                src={previewUrl}
                controls
                style={{ width: "100%", display: "block", borderRadius: 16 }}
              />
            ) : (
              <video
                src={URL.createObjectURL(videoFile)}
                controls
                muted
                style={{ width: "100%", display: "block", borderRadius: 16 }}
              />
            )}
          </div>

          {/* progress bar */}
          {isProcessing && (
            <div style={{
              background: "rgba(255,255,255,0.05)", borderRadius: 8, overflow: "hidden", height: 32,
              position: "relative",
            }}>
              <div style={{
                height: "100%", background: `linear-gradient(90deg, ${brand.brandColor}88, ${brand.brandColor})`,
                width: `${progress}%`, transition: "width 0.3s ease",
                borderRadius: 8,
              }} />
              <div style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 12, fontWeight: 600,
              }}>
                {progress < 100 ? `처리 중... ${progress}%` : "완료!"}
              </div>
            </div>
          )}

          {/* action buttons */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {!resultBlob ? (
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                style={{
                  padding: "12px 24px", borderRadius: 10, border: "none", cursor: isProcessing ? "not-allowed" : "pointer",
                  background: isProcessing ? "rgba(255,255,255,0.1)" : brand.brandColor,
                  color: "#fff", fontSize: 14, fontWeight: 700,
                  opacity: isProcessing ? 0.6 : 1,
                }}
              >
                {isProcessing ? `처리 중 ${progress}%` : `${exercise.icon} 근육 오버레이 적용`}
              </button>
            ) : (
              <>
                <button onClick={handleDownload} style={{
                  padding: "12px 24px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: brand.brandColor, color: "#fff", fontSize: 14, fontWeight: 700,
                }}>
                  영상 다운로드
                </button>
                <button onClick={() => { setResultBlob(null); setPreviewUrl(null); }} style={{
                  padding: "12px 24px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600,
                }}>
                  다시 처리
                </button>
              </>
            )}
            <button onClick={onReset} style={{
              padding: "12px 18px", borderRadius: 10, border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600,
            }}>
              처음으로
            </button>
          </div>
        </div>

        {/* right: settings panel */}
        <div className="side-panel" style={{
          width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 20,
          padding: 20, background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14,
          alignSelf: "flex-start", maxHeight: "calc(100vh - 48px)", overflowY: "auto",
        }}>
          <ExerciseGrid selected={selectedExercise} onSelect={setSelectedExercise} brandColor={brand.brandColor} showAutoOption={true} />

          {/* Auto detection result */}
          {autoDetected && selectedExercise === "auto" && (
            <div style={{
              padding: "10px 12px", borderRadius: 8,
              background: "linear-gradient(135deg, rgba(0,229,255,0.08), rgba(124,77,255,0.08))",
              border: "1px solid rgba(0,229,255,0.2)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 12 }}>🤖</span>
                <span style={{ color: "#00E5FF", fontSize: 11, fontWeight: 700 }}>AI 감지 결과</span>
              </div>
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
                {EXERCISE_DB[autoDetected.key]?.icon} {EXERCISE_DB[autoDetected.key]?.name}
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginLeft: 8 }}>
                  {autoDetected.confidence}%
                </span>
              </span>
            </div>
          )}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
          <ControlPanel
            glowIntensity={glowIntensity} setGlowIntensity={setGlowIntensity}
            showSkeleton={showSkeleton} setShowSkeleton={setShowSkeleton}
            showLabels={showLabels} setShowLabels={setShowLabels}
            brandColor={brand.brandColor}
          />
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
          <BrandSettings brand={brand} setBrand={setBrand} />

          {/* tips */}
          <div style={{
            padding: "12px 14px", borderRadius: 10,
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, lineHeight: 1.6, margin: 0 }}>
              💡 <b style={{ color: "rgba(255,255,255,0.7)" }}>팁</b><br/>
              · 운동 종류를 먼저 선택 후 처리하세요<br/>
              · 60초 이하 영상을 권장합니다<br/>
              · 처리 시간은 영상 길이에 비례합니다
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
