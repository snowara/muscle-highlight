import { useRef, useEffect, useState, useCallback } from "react";
import { renderMuscleOverlay, resetTransitions } from "../lib/muscleRenderer";
import { detectVideoFrame, resetVideoTimestamp } from "../lib/poseDetector";
import { analyzePose } from "../lib/poseAnalyzer";
import { EXERCISE_DB } from "../data/exercises";

export default function VideoPlayer({
  videoUrl,
  exerciseKey,
  glowIntensity,
  showSkeleton,
  onPoseUpdate,
  onWorstFrame,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const detectingRef = useRef(false);
  const lastResultRef = useRef(null);
  const worstRef = useRef({ score: 101, time: 0, landmarks: null });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const processFrame = useCallback(
    (timestamp) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.paused || video.ended) return;

      const ctx = canvas.getContext("2d");
      const w = video.videoWidth;
      const h = video.videoHeight;

      if (!w || !h) {
        animRef.current = requestAnimationFrame(processFrame);
        return;
      }

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      // 비디오 프레임 그리기
      ctx.drawImage(video, 0, 0, w, h);

      // 이전 감지 결과가 있으면 오버레이 렌더 (감지 대기 중에도 표시)
      if (lastResultRef.current && exerciseKey) {
        const { landmarks: prevLm, poseResult: prevPr } = lastResultRef.current;
        renderMuscleOverlay(ctx, prevLm, exerciseKey, w, h, {
          glowIntensity,
          showSkeleton,
          showLabels: true,
          time: timestamp / 1000,
          poseResult: prevPr,
          muscleStates: prevPr.muscleStates,
        });
      }

      // 이전 감지가 아직 진행 중이면 새 감지 시작하지 않음 (직렬화)
      if (!detectingRef.current && exerciseKey) {
        detectingRef.current = true;
        const ts = Math.round(timestamp);

        detectVideoFrame(video, ts)
          .then((result) => {
            if (!result) {
              detectingRef.current = false;
              return;
            }

            const exercise = EXERCISE_DB[exerciseKey];
            if (!exercise) {
              detectingRef.current = false;
              return;
            }

            const poseResult = analyzePose(result.landmarks, exerciseKey, exercise);

            // 결과 캐시 (다음 프레임에서 오버레이 유지)
            lastResultRef.current = { landmarks: result.landmarks, poseResult };

            // worst frame 추적
            if (!result.isFallback && poseResult.score < worstRef.current.score) {
              worstRef.current = {
                score: poseResult.score,
                time: video.currentTime,
                landmarks: result.landmarks,
              };
              onWorstFrame?.({
                score: poseResult.score,
                time: video.currentTime,
                landmarks: result.landmarks,
              });
            }

            onPoseUpdate?.(result.landmarks, poseResult);
            detectingRef.current = false;
          })
          .catch(() => {
            detectingRef.current = false;
          });
      }

      setCurrentTime(video.currentTime);
      animRef.current = requestAnimationFrame(processFrame);
    },
    [exerciseKey, glowIntensity, showSkeleton, onPoseUpdate, onWorstFrame]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    video.src = videoUrl;
    video.load();
    resetVideoTimestamp();

    video.onloadedmetadata = () => {
      setDuration(video.duration);
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    };
    video.onerror = () => {
      console.warn("Video load error");
    };

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [videoUrl]);

  useEffect(() => {
    resetTransitions();
    lastResultRef.current = null;
    worstRef.current = { score: 101, time: 0, landmarks: null };
  }, [exerciseKey]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
      animRef.current = requestAnimationFrame(processFrame);
    } else {
      video.pause();
      setIsPlaying(false);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
  }

  function handleSeek(e) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Number(e.target.value);
    setCurrentTime(video.currentTime);
  }

  function formatTime(t) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  return (
    <div className="video-container">
      {/* 비디오를 캔버스 뒤에 배치 (프레임 디코딩 보장, 사용자에게 안 보임) */}
      <video
        ref={videoRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          zIndex: 0,
        }}
        muted
        playsInline
      />
      <canvas
        ref={canvasRef}
        className="main-canvas"
        style={{ position: "relative", zIndex: 1 }}
      />

      <div className="video-controls">
        <button className="btn-icon" onClick={togglePlay}>
          {isPlaying ? "⏸" : "▶"}
        </button>
        <input
          type="range"
          className="video-seek"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
        />
        <span className="video-time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
