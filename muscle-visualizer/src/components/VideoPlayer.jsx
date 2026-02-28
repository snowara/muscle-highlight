import { useRef, useState, useEffect, useCallback } from "react";
import { detectPoseVideo } from "../lib/poseDetector";
import { renderMuscleOverlay } from "../lib/muscleRenderer";
import { classifyExercise } from "../lib/exerciseClassifier";
import { analyzePose, getScoreColor } from "../lib/poseAnalyzer";
import { EXERCISE_DB } from "../data/exercises";

export default function VideoPlayer({
  videoFile, exerciseKey, glowIntensity, showSkeleton, showLabels,
  onExerciseDetected, onAnalysisUpdate, onWorstFrame, showCorrections,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const scoreHistoryRef = useRef([]);
  const worstFrameRef = useRef({ score: 100, time: 0 });

  // Refs for rAF loop data (avoid stale closures)
  const landmarksRef = useRef(null);
  const analysisRef = useRef(null);
  const exerciseKeyRef = useRef(exerciseKey);
  const optionsRef = useRef({ glowIntensity, showSkeleton, showLabels });
  const videoSizeRef = useRef({ w: 640, h: 480 });

  // Detection race condition guard
  const isDetectingRef = useRef(false);

  // currentTime throttle
  const lastTimeUpdateRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoSize, setVideoSize] = useState({ w: 640, h: 480 });
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [scoreTimeline, setScoreTimeline] = useState([]);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const lastDetectTime = useRef(0);
  const detectInterval = 1000 / 15; // max 15fps detection
  const exerciseDetectedRef = useRef(false);
  const onWorstFrameRef = useRef(onWorstFrame);
  useEffect(() => { onWorstFrameRef.current = onWorstFrame; }, [onWorstFrame]);

  // Keep refs in sync with props
  useEffect(() => { exerciseKeyRef.current = exerciseKey; }, [exerciseKey]);
  useEffect(() => {
    optionsRef.current = { glowIntensity, showSkeleton, showLabels };
  }, [glowIntensity, showSkeleton, showLabels]);

  // Create video URL
  useEffect(() => {
    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  // Video metadata loaded
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const maxSize = 720;
    let w = video.videoWidth;
    let h = video.videoHeight;
    if (Math.max(w, h) > maxSize) {
      const scale = maxSize / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    setVideoSize({ w, h });
    videoSizeRef.current = { w, h };
    setDuration(video.duration);

    if (canvasRef.current) {
      canvasRef.current.width = w;
      canvasRef.current.height = h;
    }
  }, []);

  // -- Pose detection + analysis (extracted from processFrame) --
  const detectAndAnalyze = useCallback(async (canvas, video) => {
    if (isDetectingRef.current) return;
    isDetectingRef.current = true;

    const { w, h } = videoSizeRef.current;
    const timestampMs = Math.round(video.currentTime * 1000);

    try {
      const result = await detectPoseVideo(canvas, timestampMs);

      if (!result.isFallback && result.landmarks) {
        landmarksRef.current = result.landmarks;

        // Auto-detect exercise from first frames
        const eKey = exerciseKeyRef.current;
        if (video.currentTime < 2 && eKey === "auto" && !exerciseDetectedRef.current) {
          const detected = classifyExercise(result.landmarks);
          if (detected.confidence > 30) {
            exerciseDetectedRef.current = true;
            onExerciseDetected?.(detected);
          }
        }

        // Analyze pose
        const effectiveKey = eKey === "auto" ? "squat" : eKey;
        const poseAnalysis = analyzePose(result.landmarks, effectiveKey);
        analysisRef.current = poseAnalysis;
        setCurrentAnalysis(poseAnalysis);
        onAnalysisUpdate?.(poseAnalysis);

        // Record score for timeline
        scoreHistoryRef.current = [
          ...scoreHistoryRef.current,
          { time: video.currentTime, score: poseAnalysis.score, level: poseAnalysis.level },
        ];

        // Track worst frame (capture canvas snapshot)
        trackWorstFrame(poseAnalysis, video, w, h);
      }
    } catch (err) {
      console.warn("[VideoPlayer] Frame detection failed:", err);
    } finally {
      isDetectingRef.current = false;
    }
  }, [onExerciseDetected, onAnalysisUpdate]);

  // -- Worst frame tracker --
  const trackWorstFrame = useCallback((poseAnalysis, video, w, h) => {
    if (poseAnalysis.score < worstFrameRef.current.score) {
      const snapCanvas = document.createElement("canvas");
      snapCanvas.width = w;
      snapCanvas.height = h;
      snapCanvas.getContext("2d").drawImage(video, 0, 0, w, h);
      worstFrameRef.current = {
        score: poseAnalysis.score,
        time: video.currentTime,
        canvas: snapCanvas,
        landmarks: landmarksRef.current,
      };
    }
  }, []);

  // -- rAF loop --
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.paused || video.ended) return;

    const ctx = canvas.getContext("2d");
    const { w, h } = videoSizeRef.current;
    const now = performance.now();

    // Draw video frame
    ctx.drawImage(video, 0, 0, w, h);

    // Detect pose periodically (with guard)
    if (now - lastDetectTime.current > detectInterval) {
      lastDetectTime.current = now;
      detectAndAnalyze(canvas, video);
    }

    // Render overlay using refs
    renderOverlay(ctx, w, h, video.currentTime);

    // Throttled currentTime update (200ms interval)
    if (now - lastTimeUpdateRef.current > 200) {
      setCurrentTime(video.currentTime);
      lastTimeUpdateRef.current = now;
    }

    animRef.current = requestAnimationFrame(processFrame);
  }, [detectAndAnalyze]);

  // -- Render muscle overlay --
  const renderOverlay = useCallback((ctx, w, h, videoTime) => {
    const landmarks = landmarksRef.current;
    if (!landmarks) return;

    const eKey = exerciseKeyRef.current;
    const effectiveKey = eKey === "auto" ? "squat" : eKey;
    const muscleStatus = analysisRef.current?.muscleStatus || {};
    const opts = optionsRef.current;

    renderMuscleOverlay(ctx, landmarks, effectiveKey, w, h, {
      glowIntensity: opts.glowIntensity,
      showSkeleton: opts.showSkeleton,
      showLabels: opts.showLabels,
      time: videoTime,
      muscleStatus,
    });
  }, []);

  // Play/Pause handling
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      setIsPlaying(true);
      animRef.current = requestAnimationFrame(processFrame);
    };
    const onPause = () => {
      setIsPlaying(false);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    const onEnded = () => {
      setIsPlaying(false);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      setScoreTimeline([...scoreHistoryRef.current]);
      if (worstFrameRef.current.canvas) {
        onWorstFrameRef.current?.(worstFrameRef.current);
      }
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (!video.paused) video.pause();
    };
  }, [processFrame]);

  const effectiveKey = exerciseKey === "auto" ? "squat" : exerciseKey;
  const exercise = EXERCISE_DB[effectiveKey];
  const scoreColor = currentAnalysis ? getScoreColor(currentAnalysis.level) : null;
  const timelineSegments = scoreTimeline.length > 0 ? scoreTimeline : scoreHistoryRef.current;

  function handleTimelineClick(e) {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    video.currentTime = ratio * duration;
  }

  function seekToWorstFrame() {
    const video = videoRef.current;
    if (!video || worstFrameRef.current.score >= 100) return;
    video.currentTime = worstFrameRef.current.time;
    video.pause();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Video + Canvas overlay container */}
      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#000" }}>
        <video
          ref={videoRef}
          src={videoUrl}
          onLoadedMetadata={handleLoadedMetadata}
          playsInline
          muted
          style={{ width: "100%", display: "block", opacity: 0, position: "absolute", top: 0, left: 0 }}
        />
        <canvas
          ref={canvasRef}
          width={videoSize.w}
          height={videoSize.h}
          style={{
            width: "100%", height: "auto", display: "block",
            borderRadius: 16,
          }}
        />

        {/* Score badge overlay */}
        {exercise && (
          <div style={{
            position: "absolute", top: 12, left: 12,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)",
            borderRadius: 12, padding: "8px 14px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>{exercise.icon}</span>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{exercise.name}</span>
          </div>
        )}

        {/* Play/Pause button overlay */}
        <PlayPauseButton videoRef={videoRef} isPlaying={isPlaying} />

        {/* Bottom legend */}
        {exercise && <BottomLegend />}
      </div>

      {/* Progress bar */}
      <ProgressBar
        currentTime={currentTime}
        duration={duration}
        onClick={handleTimelineClick}
      />

      {/* Score Timeline */}
      {timelineSegments.length > 0 && (
        <ScoreTimeline
          segments={timelineSegments}
          duration={duration}
          currentTime={currentTime}
          worstScore={worstFrameRef.current.score}
          onTimelineClick={handleTimelineClick}
          onSeekWorst={seekToWorstFrame}
        />
      )}
    </div>
  );
}

// -- Sub-components --

function PlayPauseButton({ videoRef, isPlaying }) {
  function handleClick() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  }

  return (
    <button
      onClick={handleClick}
      style={{
        position: "absolute", bottom: 12, right: 12,
        width: 44, height: 44, borderRadius: "50%",
        background: "rgba(59,130,246,0.9)", border: "none",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 12px rgba(59,130,246,0.4)",
      }}
    >
      <span style={{ color: "#fff", fontSize: 18, marginLeft: isPlaying ? 0 : 2 }}>
        {isPlaying ? "⏸" : "▶"}
      </span>
    </button>
  );
}

function BottomLegend() {
  return (
    <div style={{
      position: "absolute", bottom: 12, left: 12,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)",
      borderRadius: 8, padding: "6px 12px",
      display: "flex", gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3B82F6" }} />
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>올바른</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444" }} />
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>잘못된</span>
      </div>
    </div>
  );
}

function ProgressBar({ currentTime, duration, onClick }) {
  return (
    <div style={{
      height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)",
      cursor: "pointer", position: "relative",
    }}
      onClick={onClick}
    >
      <div style={{
        height: "100%", borderRadius: 2,
        background: "#3B82F6",
        width: duration ? `${(currentTime / duration) * 100}%` : "0%",
        transition: "width 0.1s",
      }} />
    </div>
  );
}

function ScoreTimeline({ segments, duration, currentTime, worstScore, onTimelineClick, onSeekWorst }) {
  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 6,
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>
          자세 점수 타임라인
        </span>
        {worstScore < 80 && (
          <button
            onClick={onSeekWorst}
            style={{
              fontSize: 10, fontWeight: 600, padding: "3px 8px",
              borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)",
              background: "rgba(239,68,68,0.1)", color: "#EF4444",
              cursor: "pointer",
            }}
          >
            가장 나쁜 자세 보기 ({worstScore}점)
          </button>
        )}
      </div>
      <div
        style={{
          height: 28, borderRadius: 6, overflow: "hidden",
          background: "rgba(255,255,255,0.04)",
          display: "flex", cursor: "pointer", position: "relative",
        }}
        onClick={onTimelineClick}
      >
        {segments.map((seg, i) => {
          const w = duration ? ((1 / segments.length) * 100) : 0;
          const color = seg.level === "good" ? "#E84040" :
            seg.level === "warning" ? "#FFB020" : "#FF6B35";
          return (
            <div
              key={i}
              style={{
                flex: `0 0 ${w}%`,
                background: color,
                opacity: 0.7,
                transition: "opacity 0.1s",
                minWidth: 1,
              }}
              title={`${Math.round(seg.time)}초 - ${seg.score}점`}
            />
          );
        })}
        {/* Current position indicator */}
        <div style={{
          position: "absolute",
          left: duration ? `${(currentTime / duration) * 100}%` : "0%",
          top: 0, bottom: 0, width: 2, background: "#fff",
          boxShadow: "0 0 4px rgba(255,255,255,0.5)",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>0초</span>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{Math.round(duration)}초</span>
      </div>
    </div>
  );
}
