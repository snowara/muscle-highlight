import { useState, useEffect, useRef, useCallback } from "react";
import UploadArea from "./components/UploadArea";
import CanvasView from "./components/CanvasView";
import VideoPlayer from "./components/VideoPlayer";
import ExerciseGrid from "./components/ExerciseGrid";
import ControlPanel from "./components/ControlPanel";
import PoseScoreCard from "./components/PoseScoreCard";
import CorrectionPanel from "./components/CorrectionPanel";
import MuscleInfo from "./components/MuscleInfo";
import BrandSettings from "./components/BrandSettings";
import { initPoseDetector, detectImage, isDetectorReady } from "./lib/poseDetector";
import { analyzePose } from "./lib/poseAnalyzer";
import { EXERCISE_DB } from "./data/exercises";
import {
  createCompositeCanvas,
  downloadImage,
  copyToClipboard,
  loadBrandSettings,
  saveBrandSettings,
} from "./lib/compositeExport";

export default function App() {
  // ── State ──
  const [mode, setMode] = useState("upload"); // upload | edit
  const [mediaType, setMediaType] = useState(null); // image | video
  const [mediaUrl, setMediaUrl] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [detectorStatus, setDetectorStatus] = useState("loading");

  const [selectedExercise, setSelectedExercise] = useState(null);
  const [landmarks, setLandmarks] = useState(null);
  const [poseResult, setPoseResult] = useState(null);
  const [worstFrame, setWorstFrame] = useState(null);

  const [glowIntensity, setGlowIntensity] = useState(0.7);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [brand, setBrand] = useState(loadBrandSettings);
  const [toast, setToast] = useState(null);

  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  // ── MediaPipe 초기화 ──
  useEffect(() => {
    initPoseDetector().then((ok) => {
      setDetectorStatus(ok ? "ready" : "fallback");
    });
  }, []);

  // ── 브랜드 설정 저장 ──
  useEffect(() => {
    saveBrandSettings(brand);
  }, [brand]);

  // ── 파일 업로드 처리 ──
  const handleFileSelected = useCallback(async (file, type) => {
    setIsLoading(true);
    setMediaFile(file);
    setMediaType(type);
    setSelectedExercise(null);
    setPoseResult(null);
    setLandmarks(null);
    setWorstFrame(null);

    const url = URL.createObjectURL(file);
    setMediaUrl(url);

    if (type === "image") {
      const img = new Image();
      img.onload = async () => {
        // 대형 이미지 리사이즈 (최대 2400px)
        const MAX = 2400;
        let src = img;
        if (img.naturalWidth > MAX || img.naturalHeight > MAX) {
          const scale = Math.min(MAX / img.naturalWidth, MAX / img.naturalHeight);
          const c = document.createElement("canvas");
          c.width = Math.round(img.naturalWidth * scale);
          c.height = Math.round(img.naturalHeight * scale);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          const resized = new Image();
          resized.src = c.toDataURL("image/jpeg", 0.92);
          await new Promise((r) => { resized.onload = r; });
          src = resized;
        }
        imageRef.current = src;
        const result = await detectImage(src);
        setLandmarks(result.landmarks);
        setIsLoading(false);
        setMode("edit");
        if (result.isFallback) {
          showToast("AI 감지 실패 — 데모 모드로 전환됩니다", "warn");
        }
      };
      img.onerror = () => {
        setIsLoading(false);
        showToast("이미지 로드 실패 — 다른 파일을 시도하세요", "error");
      };
      img.src = url;
    } else {
      // 영상: 바로 편집 모드 진입
      setIsLoading(false);
      setMode("edit");
    }
  }, []);

  // ── 운동 선택 → 자세 분석 ──
  useEffect(() => {
    if (!selectedExercise || !landmarks) {
      setPoseResult(null);
      return;
    }
    const exercise = EXERCISE_DB[selectedExercise];
    if (!exercise) return;

    const result = analyzePose(landmarks, selectedExercise, exercise);
    setPoseResult(result);
  }, [selectedExercise, landmarks]);

  // ── 영상 모드 포즈 업데이트 ──
  const handleVideoPoseUpdate = useCallback((newLandmarks, newResult) => {
    setLandmarks(newLandmarks);
    setPoseResult(newResult);
  }, []);

  const handleWorstFrame = useCallback((frame) => {
    setWorstFrame(frame);
  }, []);

  // ── 내보내기 ──
  function handleDownload() {
    if (!canvasRef.current || !selectedExercise) return;

    const exercise = EXERCISE_DB[selectedExercise];
    const { canvas, poseResult: pr } = createCompositeCanvas(
      canvasRef.current,
      imageRef.current,
      landmarks,
      selectedExercise,
      { glowIntensity, showSkeleton, showLabels: true, muscleStates: poseResult?.muscleStates, poseStatus: poseResult?.status },
      brand
    );
    downloadImage(canvas, brand.gymName, exercise?.name || "운동", pr.score);
    showToast("PNG 다운로드 완료", "success");
  }

  async function handleCopy() {
    if (!canvasRef.current || !selectedExercise) return;

    const { canvas } = createCompositeCanvas(
      canvasRef.current,
      imageRef.current,
      landmarks,
      selectedExercise,
      { glowIntensity, showSkeleton, showLabels: true, muscleStates: poseResult?.muscleStates, poseStatus: poseResult?.status },
      brand
    );
    const ok = await copyToClipboard(canvas);
    showToast(ok ? "클립보드 복사 완료" : "복사 실패 — 다운로드를 이용하세요", ok ? "success" : "error");
  }

  function handleReset() {
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    setMode("upload");
    setMediaType(null);
    setMediaUrl(null);
    setMediaFile(null);
    setSelectedExercise(null);
    setLandmarks(null);
    setPoseResult(null);
    setWorstFrame(null);
  }

  function showToast(msg, type = "info") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Render ──
  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <span className="title-icon">💪</span> Muscle Highlight
        </h1>
        <p className="app-subtitle">AI 자세 분석 · 근육 시각화</p>
        <span className={`detector-badge ${detectorStatus}`}>
          {detectorStatus === "ready" ? "AI Ready" : detectorStatus === "loading" ? "Loading..." : "Demo Mode"}
        </span>
      </header>

      {mode === "upload" ? (
        <main className="main-upload">
          <UploadArea onFileSelected={handleFileSelected} isLoading={isLoading} />
        </main>
      ) : (
        <main className="main-edit">
          <div className="edit-left">
            {mediaType === "image" ? (
              <CanvasView
                imageUrl={mediaUrl}
                landmarks={landmarks}
                exerciseKey={selectedExercise}
                poseResult={poseResult}
                glowIntensity={glowIntensity}
                showSkeleton={showSkeleton}
                canvasRef={canvasRef}
              />
            ) : (
              <VideoPlayer
                videoUrl={mediaUrl}
                exerciseKey={selectedExercise}
                glowIntensity={glowIntensity}
                showSkeleton={showSkeleton}
                onPoseUpdate={handleVideoPoseUpdate}
                onWorstFrame={handleWorstFrame}
              />
            )}

            <div className="action-buttons">
              {mediaType === "image" && (
                <>
                  <button className="btn btn-primary" onClick={handleDownload} disabled={!selectedExercise}>
                    📥 다운로드
                  </button>
                  <button className="btn btn-secondary" onClick={handleCopy} disabled={!selectedExercise}>
                    📋 복사
                  </button>
                </>
              )}
              <button className="btn btn-ghost" onClick={handleReset}>
                🔄 새 파일
              </button>
            </div>
          </div>

          <div className="edit-right">
            <ExerciseGrid selectedExercise={selectedExercise} onSelect={setSelectedExercise} />
            <PoseScoreCard poseResult={poseResult} />
            <CorrectionPanel exerciseKey={selectedExercise} poseResult={poseResult} />
            <ControlPanel
              glowIntensity={glowIntensity}
              showSkeleton={showSkeleton}
              onGlowChange={setGlowIntensity}
              onSkeletonToggle={setShowSkeleton}
            />
            <MuscleInfo exerciseKey={selectedExercise} poseResult={poseResult} />
            <BrandSettings settings={brand} onChange={setBrand} />
          </div>
        </main>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
