import { useState, useRef, useEffect, useCallback } from "react";
import { EXERCISE_DB } from "../data/exercises";
import ExerciseGrid from "./ExerciseGrid";
import ControlPanel from "./ControlPanel";
import BrandSettings from "./BrandSettings";
import { detectPose } from "../lib/poseDetector";
import { renderMuscleOverlay } from "../lib/muscleRenderer";
import { classifyExercise } from "../lib/exerciseClassifier";
import { analyzePose, CORRECT_COLOR, INCORRECT_COLOR } from "../lib/poseAnalyzer";

export default function VideoProcessor({ videoFile, brand, setBrand, onReset }) {
  const [selectedExercise, setSelectedExercise] = useState("auto");
  const [autoDetected, setAutoDetected] = useState(null);
  const [glowIntensity, setGlowIntensity] = useState(0.7);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Timeline state
  const [scoreTimeline, setScoreTimeline] = useState([]); // [{time, score, isGood, corrections}]
  const [worstFrame, setWorstFrame] = useState(null); // {time, score, dataUrl}
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentScore, setCurrentScore] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const videoUrlRef = useRef(null);

  const exerciseKey = selectedExercise === "auto" ? (autoDetected?.key || "squat") : selectedExercise;
  const exercise = EXERCISE_DB[exerciseKey];

  // Create video URL
  useEffect(() => {
    videoUrlRef.current = URL.createObjectURL(videoFile);
    return () => {
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    };
  }, [videoFile]);

  // Video metadata load
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
  }, []);

  // Real-time overlay rendering during playback
  useEffect(() => {
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    if (!video || !canvas || !isPlaying) return;

    let lastAnalysis = 0;
    const analyzeInterval = 200; // ms between pose analyses
    let lastLandmarks = null;
    let lastQuality = null;

    async function renderFrame() {
      if (video.paused || video.ended) {
        setIsPlaying(false);
        return;
      }

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w === 0 || h === 0) {
        animFrameRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");

      // Draw video frame
      ctx.drawImage(video, 0, 0, w, h);

      // Analyze pose periodically (not every frame for performance)
      const now = performance.now();
      if (now - lastAnalysis > analyzeInterval) {
        lastAnalysis = now;
        try {
          const tmpCanvas = document.createElement("canvas");
          tmpCanvas.width = Math.min(w, 480); // downscale for performance
          tmpCanvas.height = Math.round(Math.min(w, 480) * (h / w));
          const tmpCtx = tmpCanvas.getContext("2d");
          tmpCtx.drawImage(video, 0, 0, tmpCanvas.width, tmpCanvas.height);

          const result = await detectPose(tmpCanvas);
          if (!result.isFallback) {
            lastLandmarks = result.landmarks;
            lastQuality = analyzePose(result.landmarks, exerciseKey);
            setCurrentScore(lastQuality.score);
          }
        } catch {
          // keep previous landmarks
        }
      }

      // Render overlay
      if (lastLandmarks) {
        renderMuscleOverlay(ctx, lastLandmarks, exerciseKey, w, h, {
          glowIntensity, showSkeleton, showLabels,
          time: video.currentTime,
          poseQuality: lastQuality,
        });
      }

      setCurrentTime(video.currentTime);
      animFrameRef.current = requestAnimationFrame(renderFrame);
    }

    animFrameRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, exerciseKey, glowIntensity, showSkeleton, showLabels]);

  // Process entire video: analyze all frames for timeline
  async function handleProcess() {
    const video = videoRef.current;
    if (!video) return;

    setIsProcessing(true);
    setProgress(0);
    setScoreTimeline([]);
    setWorstFrame(null);

    const w = Math.min(video.videoWidth, 480);
    const h = Math.round(w * (video.videoHeight / video.videoWidth));
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = w;
    tmpCanvas.height = h;
    const tmpCtx = tmpCanvas.getContext("2d");

    const fps = 4; // analyze 4 frames per second for timeline
    const totalFrames = Math.floor(video.duration * fps);
    const frameInterval = 1 / fps;
    const timeline = [];
    let worst = { time: 0, score: 100, dataUrl: null };
    let detectedExercise = null;

    for (let i = 0; i < totalFrames; i++) {
      const time = i * frameInterval;

      await new Promise((resolve) => {
        video.currentTime = time;
        video.onseeked = resolve;
      });

      tmpCtx.drawImage(video, 0, 0, w, h);

      try {
        const result = await detectPose(tmpCanvas);
        if (!result.isFallback) {
          // Auto-detect exercise from first valid frame
          if (selectedExercise === "auto" && !detectedExercise && i < 10) {
            const detected = classifyExercise(result.landmarks);
            if (detected.confidence > 30) {
              detectedExercise = detected;
              setAutoDetected(detected);
            }
          }

          const exKey = detectedExercise?.key || exerciseKey;
          const quality = analyzePose(result.landmarks, exKey);
          timeline.push({
            time,
            score: quality.score,
            isGood: quality.status !== 'bad',
            corrections: quality.checkpoints?.filter(cp => !cp.pass) || [],
          });

          // Track worst frame
          if (quality.score < worst.score) {
            // Capture the frame as image
            const captureCanvas = document.createElement("canvas");
            captureCanvas.width = video.videoWidth;
            captureCanvas.height = video.videoHeight;
            const captureCtx = captureCanvas.getContext("2d");
            captureCtx.drawImage(video, 0, 0);
            renderMuscleOverlay(captureCtx, result.landmarks, exKey, video.videoWidth, video.videoHeight, {
              glowIntensity, showSkeleton, showLabels, time,
              poseQuality: quality,
            });

            worst = {
              time,
              score: quality.score,
              dataUrl: captureCanvas.toDataURL("image/jpeg", 0.85),
              corrections: quality.checkpoints?.filter(cp => !cp.pass) || [],
            };
          }
        }
      } catch {
        // skip failed frames
      }

      setProgress(Math.round(((i + 1) / totalFrames) * 100));
    }

    setScoreTimeline(timeline);
    if (worst.dataUrl) setWorstFrame(worst);
    setIsProcessing(false);

    // Reset video to start
    video.currentTime = 0;
  }

  function handlePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }

  function seekToTime(time) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  }

  function handleTimelineClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    seekToTime(x * duration);
  }

  function downloadWorstFrame() {
    if (!worstFrame?.dataUrl) return;
    const link = document.createElement("a");
    link.download = `worst_frame_${Math.round(worstFrame.time)}s.jpg`;
    link.href = worstFrame.dataUrl;
    link.click();
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div className="edit-layout" style={{ display: "flex", gap: 24 }}>
        {/* Left: video area */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Video with overlay canvas */}
          <div style={{
            position: "relative",
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16, overflow: "hidden",
          }}>
            <video
              ref={videoRef}
              src={videoUrlRef.current || (videoFile ? URL.createObjectURL(videoFile) : "")}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
              onEnded={() => setIsPlaying(false)}
              muted
              playsInline
              style={{
                width: "100%", display: isPlaying ? "none" : "block",
                borderRadius: 16,
              }}
              controls={!isPlaying && scoreTimeline.length === 0}
            />
            {/* Overlay canvas for real-time rendering */}
            {isPlaying && (
              <canvas
                ref={overlayCanvasRef}
                style={{ width: "100%", display: "block", borderRadius: 16 }}
              />
            )}

            {/* Current score badge during playback */}
            {isPlaying && currentScore !== null && (
              <div style={{
                position: "absolute", top: 12, left: 12,
                padding: "8px 14px", borderRadius: 8,
                background: currentScore >= 60 ? "rgba(0,170,255,0.2)" : "rgba(255,59,92,0.2)",
                border: `1px solid ${currentScore >= 60 ? "rgba(0,170,255,0.4)" : "rgba(255,59,92,0.4)"}`,
                backdropFilter: "blur(8px)",
              }}>
                <span style={{
                  color: currentScore >= 60 ? CORRECT_COLOR : INCORRECT_COLOR,
                  fontSize: 16, fontWeight: 700,
                }}>
                  {currentScore}점
                </span>
              </div>
            )}
          </div>

          {/* Score Timeline */}
          {scoreTimeline.length > 0 && (
            <div style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12, padding: 14,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 600 }}>
                  자세 점수 타임라인
                </span>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>
                  클릭하여 해당 구간으로 이동
                </span>
              </div>

              {/* Timeline bar */}
              <div
                onClick={handleTimelineClick}
                style={{
                  position: "relative", height: 40, borderRadius: 6,
                  background: "rgba(255,255,255,0.05)", cursor: "pointer",
                  overflow: "hidden",
                }}
              >
                {/* Score bars */}
                {scoreTimeline.map((entry, i) => {
                  const x = (entry.time / duration) * 100;
                  const w = (1 / scoreTimeline.length) * 100;
                  const barH = Math.max(4, (entry.score / 100) * 36);
                  return (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        left: `${x}%`,
                        width: `${Math.max(w, 0.5)}%`,
                        bottom: 2,
                        height: barH,
                        background: entry.isGood ? CORRECT_COLOR : INCORRECT_COLOR,
                        opacity: 0.7,
                        borderRadius: 1,
                        transition: "height 0.1s ease",
                      }}
                    />
                  );
                })}

                {/* Playback position indicator */}
                <div style={{
                  position: "absolute",
                  left: `${(currentTime / Math.max(duration, 0.1)) * 100}%`,
                  top: 0, bottom: 0, width: 2,
                  background: "#fff",
                  zIndex: 2,
                }} />
              </div>

              {/* Time labels */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 9 }}>0:00</span>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 9 }}>
                  {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}
                </span>
              </div>

              {/* Score legend */}
              <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: CORRECT_COLOR }} />
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>올바른 자세</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: INCORRECT_COLOR }} />
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>교정 필요</span>
                </div>
                {/* Average score */}
                {scoreTimeline.length > 0 && (() => {
                  const avg = Math.round(scoreTimeline.reduce((s, e) => s + e.score, 0) / scoreTimeline.length);
                  return (
                    <span style={{
                      marginLeft: "auto",
                      color: avg >= 60 ? CORRECT_COLOR : INCORRECT_COLOR,
                      fontSize: 11, fontWeight: 700,
                    }}>
                      평균 {avg}점
                    </span>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Worst Frame Capture */}
          {worstFrame && (
            <div style={{
              background: "rgba(255,59,92,0.05)",
              border: "1px solid rgba(255,59,92,0.15)",
              borderRadius: 12, padding: 14,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: INCORRECT_COLOR, fontSize: 12, fontWeight: 700 }}>
                  ⚠ 최악 프레임 ({worstFrame.score}점 @ {worstFrame.time.toFixed(1)}초)
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => seekToTime(worstFrame.time)}
                    style={{
                      padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                      background: "rgba(255,59,92,0.15)", color: INCORRECT_COLOR,
                      fontSize: 10, fontWeight: 600,
                    }}
                  >
                    해당 구간 이동
                  </button>
                  <button
                    onClick={downloadWorstFrame}
                    style={{
                      padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                      background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)",
                      fontSize: 10, fontWeight: 600,
                    }}
                  >
                    다운로드
                  </button>
                </div>
              </div>
              <img
                src={worstFrame.dataUrl}
                alt="worst frame"
                style={{ width: "100%", borderRadius: 8, display: "block" }}
              />
              {worstFrame.corrections?.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                  {worstFrame.corrections.map((c, i) => (
                    <div key={i} style={{
                      padding: "6px 10px", borderRadius: 6,
                      background: "rgba(255,59,92,0.08)",
                      border: "1px solid rgba(255,59,92,0.12)",
                      color: "rgba(255,255,255,0.8)", fontSize: 11,
                    }}>
                      <span style={{ color: INCORRECT_COLOR, fontWeight: 700 }}>{c.label}</span>: {c.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Progress bar */}
          {isProcessing && (
            <div style={{
              background: "rgba(255,255,255,0.05)", borderRadius: 8, overflow: "hidden", height: 32,
              position: "relative",
            }}>
              <div style={{
                height: "100%", background: `linear-gradient(90deg, ${brand.brandColor}88, ${brand.brandColor})`,
                width: `${progress}%`, transition: "width 0.3s ease", borderRadius: 8,
              }} />
              <div style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 12, fontWeight: 600,
              }}>
                {progress < 100 ? `분석 중... ${progress}%` : "분석 완료!"}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {scoreTimeline.length === 0 ? (
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                style={{
                  padding: "12px 24px", borderRadius: 10, border: "none",
                  cursor: isProcessing ? "not-allowed" : "pointer",
                  background: isProcessing ? "rgba(255,255,255,0.1)" : brand.brandColor,
                  color: "#fff", fontSize: 14, fontWeight: 700,
                  opacity: isProcessing ? 0.6 : 1,
                }}
              >
                {isProcessing ? `분석 중 ${progress}%` : `${exercise?.icon || "🎬"} 자세 분석 시작`}
              </button>
            ) : (
              <>
                <button
                  onClick={handlePlay}
                  style={{
                    padding: "12px 24px", borderRadius: 10, border: "none", cursor: "pointer",
                    background: brand.brandColor, color: "#fff", fontSize: 14, fontWeight: 700,
                  }}
                >
                  {isPlaying ? "⏸ 일시정지" : "▶ 오버레이 재생"}
                </button>
                <button
                  onClick={() => { setScoreTimeline([]); setWorstFrame(null); setCurrentScore(null); }}
                  style={{
                    padding: "12px 24px", borderRadius: 10, border: "none", cursor: "pointer",
                    background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)",
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  다시 분석
                </button>
              </>
            )}
            <button onClick={onReset} style={{
              padding: "12px 18px", borderRadius: 10, border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)",
              fontSize: 13, fontWeight: 600,
            }}>
              처음으로
            </button>
          </div>
        </div>

        {/* Right: settings panel */}
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

          {/* Tips */}
          <div style={{
            padding: "12px 14px", borderRadius: 10,
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, lineHeight: 1.6, margin: 0 }}>
              💡 <b style={{ color: "rgba(255,255,255,0.7)" }}>팁</b><br/>
              · 먼저 "자세 분석"으로 전체 타임라인을 생성하세요<br/>
              · 빨간 구간을 클릭하면 해당 프레임으로 이동합니다<br/>
              · "오버레이 재생"으로 실시간 글로우를 확인하세요<br/>
              · 최대 60초 영상까지 지원합니다
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
