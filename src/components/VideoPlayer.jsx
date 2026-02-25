import { useRef, useEffect, useState, useCallback } from "react";
import { renderMuscleOverlay, resetTransitions } from "../lib/muscleRenderer";
import { detectVideoFrame } from "../lib/poseDetector";
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

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      // 비디오 프레임 그리기
      ctx.drawImage(video, 0, 0, w, h);

      // MediaPipe 감지 (비동기지만 fire-and-forget으로 오버레이 렌더)
      detectVideoFrame(video, timestamp).then((result) => {
        if (!result || !exerciseKey) return;

        const exercise = EXERCISE_DB[exerciseKey];
        if (!exercise) return;

        const poseResult = analyzePose(result.landmarks, exerciseKey, exercise);

        // 오버레이 렌더
        const octx = canvas.getContext("2d");
        octx.drawImage(video, 0, 0, w, h);
        renderMuscleOverlay(octx, result.landmarks, exerciseKey, w, h, {
          glowIntensity,
          showSkeleton,
          showLabels: true,
          time: timestamp / 1000,
          muscleStates: poseResult.muscleStates,
          poseStatus: poseResult.status,
        });

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
      });

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
      <video ref={videoRef} style={{ display: "none" }} muted playsInline />
      <canvas ref={canvasRef} className="main-canvas" />

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
