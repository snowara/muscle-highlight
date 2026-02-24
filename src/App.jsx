import { useState, useRef, useEffect } from "react";
import UploadArea from "./components/UploadArea";
import CanvasView from "./components/CanvasView";
import ExerciseGrid from "./components/ExerciseGrid";
import ControlPanel from "./components/ControlPanel";
import MuscleInfo from "./components/MuscleInfo";
import AnatomyPanel from "./components/AnatomyPanel";
import BrandSettings from "./components/BrandSettings";
import VideoUploadArea from "./components/VideoUploadArea";
import VideoProcessor from "./components/VideoProcessor";
import { initPoseDetector, detectPose } from "./lib/poseDetector";
import { createCompositeCanvas, downloadImage, copyToClipboard } from "./lib/compositeExport";
import { EXERCISE_DB } from "./data/exercises";
import { classifyExercise } from "./lib/exerciseClassifier";
import { recordCorrection, getLearningStats } from "./lib/learningStore";

export default function App() {
  // "upload" | "edit" | "video"
  const [appState, setAppState] = useState("upload");
  const [mode, setMode] = useState("photo"); // "photo" | "video"
  const [image, setImage] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 800 });
  const [landmarks, setLandmarks] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState("squat");
  const [autoDetected, setAutoDetected] = useState(null); // { key, confidence }
  const [glowIntensity, setGlowIntensity] = useState(0.7);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [mediapipeStatus, setMediapipeStatus] = useState("loading");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copyMsg, setCopyMsg] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [brand, setBrand] = useState({
    gymName: "MY GYM",
    tagline: "Transform Your Body",
    brandColor: "#00E5FF",
  });

  const canvasRef = useRef(null);

  useEffect(() => {
    initPoseDetector(setMediapipeStatus);
  }, []);

  async function handleImageLoad(img, w, h) {
    setIsAnalyzing(true);
    setImage(img);
    setCanvasSize({ w, h });

    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = w;
    tmpCanvas.height = h;
    const tmpCtx = tmpCanvas.getContext("2d");
    tmpCtx.drawImage(img, 0, 0, w, h);

    const result = await detectPose(tmpCanvas);
    setLandmarks(result.landmarks);
    if (result.isFallback && mediapipeStatus !== "fallback") {
      setMediapipeStatus("fallback");
    }

    // Auto-detect exercise from pose
    if (!result.isFallback) {
      const detected = classifyExercise(result.landmarks);
      setAutoDetected(detected);
      setSelectedExercise(detected.key);
    }

    setIsAnalyzing(false);
    setAppState("edit");
  }

  function handleVideoSelect(file) {
    setVideoFile(file);
    setAppState("video");
  }

  function handleDownload() {
    if (!canvasRef.current || !image || !landmarks) return;
    const composite = createCompositeCanvas(
      canvasRef.current, image, landmarks, selectedExercise,
      { glowIntensity, showSkeleton, showLabels },
      brand
    );
    downloadImage(composite, brand.gymName, EXERCISE_DB[selectedExercise].name);
  }

  async function handleCopy() {
    if (!canvasRef.current || !image || !landmarks) return;
    const composite = createCompositeCanvas(
      canvasRef.current, image, landmarks, selectedExercise,
      { glowIntensity, showSkeleton, showLabels },
      brand
    );
    const ok = await copyToClipboard(composite);
    if (ok) {
      setCopyMsg("복사 완료!");
    } else {
      downloadImage(composite, brand.gymName, EXERCISE_DB[selectedExercise].name);
      setCopyMsg("클립보드 불가 — 다운로드됨");
    }
    setTimeout(() => setCopyMsg(""), 2000);
  }

  // When user manually changes exercise, record as learning data
  function handleExerciseSelect(key) {
    if (autoDetected && key !== autoDetected.key && landmarks) {
      recordCorrection(landmarks, key, autoDetected.key);
    }
    setSelectedExercise(key);
  }

  function handleReset() {
    setAppState("upload");
    setImage(null);
    setLandmarks(null);
    setVideoFile(null);
  }

  // --- Upload screen ---
  if (appState === "upload") {
    return (
      <div style={styles.container}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
            💪 Muscle Highlight
          </h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 32 }}>
            AI가 운동 근육을 분석하고 시각화합니다
          </p>

          {/* mode tabs */}
          <div style={{
            display: "flex", gap: 4, marginBottom: 32,
            background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 4,
          }}>
            {[
              { key: "photo", label: "📸 사진", desc: "사진 업로드" },
              { key: "video", label: "🎬 영상", desc: "영상 업로드" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setMode(tab.key)}
                style={{
                  padding: "10px 28px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: mode === tab.key ? brand.brandColor + "22" : "transparent",
                  color: mode === tab.key ? brand.brandColor : "rgba(255,255,255,0.5)",
                  fontSize: 14, fontWeight: mode === tab.key ? 700 : 500,
                  outline: mode === tab.key ? `1.5px solid ${brand.brandColor}40` : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {isAnalyzing ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
              padding: 60, borderRadius: 16,
              background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{
                width: 40, height: 40, border: `3px solid ${brand.brandColor}`, borderTopColor: "transparent",
                borderRadius: "50%", animation: "spin 1s linear infinite",
              }} />
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>AI 포즈 분석 중...</p>
            </div>
          ) : mode === "photo" ? (
            <UploadArea
              onImageLoad={handleImageLoad}
              brandColor={brand.brandColor}
              isLoading={isAnalyzing}
            />
          ) : (
            <VideoUploadArea
              onVideoSelect={handleVideoSelect}
              brandColor={brand.brandColor}
            />
          )}

          {/* MediaPipe status */}
          <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: mediapipeStatus === "ready" ? "#00E676" :
                mediapipeStatus === "loading" ? "#FFD54F" : "#FF6B35",
            }} />
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
              {mediapipeStatus === "ready" && "MediaPipe AI 준비 완료"}
              {mediapipeStatus === "loading" && "AI 모델 로딩 중..."}
              {mediapipeStatus === "fallback" && "데모 모드 (Fallback)"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // --- Video processing screen ---
  if (appState === "video" && videoFile) {
    return (
      <div style={styles.container}>
        <VideoProcessor
          videoFile={videoFile}
          brand={brand}
          setBrand={setBrand}
          onReset={handleReset}
        />
      </div>
    );
  }

  // --- Photo edit screen ---
  return (
    <div style={styles.container}>
      <div className="edit-layout" style={styles.editLayout}>
        <div style={styles.canvasCol}>
          <CanvasView
            image={image}
            landmarks={landmarks}
            exerciseKey={selectedExercise}
            canvasSize={canvasSize}
            glowIntensity={glowIntensity}
            showSkeleton={showSkeleton}
            showLabels={showLabels}
            canvasRef={canvasRef}
          />

          <div style={styles.actionBar}>
            <button onClick={handleDownload} style={{ ...styles.btn, background: brand.brandColor }}>
              다운로드
            </button>
            <button onClick={handleCopy} style={{ ...styles.btn, background: "rgba(255,255,255,0.08)", border: `1px solid ${brand.brandColor}`, color: brand.brandColor }}>
              {copyMsg || "클립보드 복사"}
            </button>
            <button onClick={handleReset} style={{ ...styles.btn, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
              새 사진
            </button>
          </div>
        </div>

        {/* Anatomy diagram panel */}
        <div className="anatomy-panel" style={styles.anatomyPanel}>
          <AnatomyPanel exerciseKey={selectedExercise} brandColor={brand.brandColor} />
        </div>

        <div className="side-panel" style={styles.panel}>
          <ExerciseGrid selected={selectedExercise} onSelect={handleExerciseSelect} brandColor={brand.brandColor} />
          <div style={styles.divider} />
          <MuscleInfo exerciseKey={selectedExercise} mediapipeStatus={mediapipeStatus} autoDetected={autoDetected} onSelectExercise={handleExerciseSelect} />
          <div style={styles.divider} />
          <ControlPanel
            glowIntensity={glowIntensity} setGlowIntensity={setGlowIntensity}
            showSkeleton={showSkeleton} setShowSkeleton={setShowSkeleton}
            showLabels={showLabels} setShowLabels={setShowLabels}
            brandColor={brand.brandColor}
          />
          <div style={styles.divider} />
          <BrandSettings brand={brand} setBrand={setBrand} />
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #07070f, #0d0d22, #090916)",
    fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
    color: "#fff",
  },
  editLayout: {
    display: "flex",
    gap: 24,
    padding: 24,
    maxWidth: 1200,
    margin: "0 auto",
  },
  canvasCol: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  anatomyPanel: {
    width: 280,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    padding: 16,
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 14,
    alignSelf: "flex-start",
  },
  panel: {
    width: 280,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: 20,
    padding: 20,
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 14,
    alignSelf: "flex-start",
    maxHeight: "calc(100vh - 48px)",
    overflowY: "auto",
  },
  actionBar: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  btn: {
    padding: "10px 18px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    transition: "opacity 0.15s ease",
    whiteSpace: "nowrap",
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.06)",
  },
};
