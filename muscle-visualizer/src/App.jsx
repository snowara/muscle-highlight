import { useState, useRef, useEffect } from "react";
import UploadArea from "./components/UploadArea";
import CanvasView from "./components/CanvasView";
import VideoPlayer from "./components/VideoPlayer";
import ExerciseSelector from "./components/ExerciseSelector";
import PoseScoreCard from "./components/PoseScoreCard";
import CorrectionPanel from "./components/CorrectionPanel";
import MuscleInfo from "./components/MuscleInfo";
import ControlPanel from "./components/ControlPanel";
import BrandSettings from "./components/BrandSettings";
import Toast from "./components/Toast";
import { initPoseDetector, prepareImage, detectPose } from "./lib/poseDetector";
import { classifyExercise } from "./lib/exerciseClassifier";
import { analyzePose } from "./lib/poseAnalyzer";
import {
  createCompositeCanvas, downloadImage, copyToClipboard,
  createWorstFrameComposite,
} from "./lib/compositeExport";
import { recordCorrection } from "./lib/learningStore";
import { EXERCISE_DB } from "./data/exercises";

export default function App() {
  const [appState, setAppState] = useState("upload"); // "upload" | "photo" | "video"
  const [mediaType, setMediaType] = useState(null); // "photo" | "video"

  // Photo state
  const [image, setImage] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 800 });
  const [landmarks, setLandmarks] = useState(null);

  // Video state
  const [videoFile, setVideoFile] = useState(null);
  const [worstFrame, setWorstFrame] = useState(null);

  // Shared state
  const [selectedExercise, setSelectedExercise] = useState("squat");
  const [autoDetected, setAutoDetected] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [glowIntensity, setGlowIntensity] = useState(0.7);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [showCorrections, setShowCorrections] = useState(true);
  const [mediapipeStatus, setMediapipeStatus] = useState("loading");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toast, setToast] = useState("");
  const [mobileTab, setMobileTab] = useState(0);
  const [brand, setBrand] = useState({
    gymName: "MY GYM",
    tagline: "Transform Your Body",
    brandColor: "#3B82F6",
  });

  const canvasRef = useRef(null);

  useEffect(() => {
    initPoseDetector(setMediapipeStatus);
  }, []);

  // ── File upload handler ──
  async function handleFileSelect(file, type) {
    if (type === "photo") {
      setIsAnalyzing(true);
      setMediaType("photo");

      try {
        // prepareImage: EXIF 보정 + 800px 리사이즈 + Canvas 반환
        const { canvas, width, height } = await prepareImage(file);
        setImage(canvas); // canvas can be used as drawImage source
        setCanvasSize({ w: width, h: height });

        const result = await detectPose(canvas);
        setLandmarks(result.landmarks);

        if (!result.isFallback) {
          const detected = classifyExercise(result.landmarks);
          setAutoDetected(detected);
          setSelectedExercise(detected.key);

          const poseAnalysis = analyzePose(result.landmarks, detected.key);
          setAnalysis(poseAnalysis);
        }

        setIsAnalyzing(false);
        setAppState("photo");
      } catch (e) {
        console.error("[App] Photo analysis failed:", e);
        setIsAnalyzing(false);
        setToast("사진 분석에 실패했습니다");
      }
    } else {
      setMediaType("video");
      setVideoFile(file);
      setSelectedExercise("auto");
      setAppState("video");
    }
  }

  // ── Exercise change ──
  function handleExerciseSelect(key) {
    if (autoDetected && key !== autoDetected.key && landmarks) {
      recordCorrection(landmarks, key, autoDetected.key);
    }
    setSelectedExercise(key);

    if (landmarks && key !== "auto") {
      const newAnalysis = analyzePose(landmarks, key);
      setAnalysis(newAnalysis);
    }
  }

  // ── Export functions ──
  function handleDownload() {
    if (!canvasRef.current || !image || !landmarks) return;
    const exerciseKey = selectedExercise === "auto" ? "squat" : selectedExercise;
    const composite = createCompositeCanvas(
      canvasRef.current, image, landmarks, exerciseKey,
      { glowIntensity, showSkeleton, showLabels, muscleStatus: analysis?.muscleStatus || {} },
      brand, analysis
    );
    downloadImage(composite, brand.gymName, EXERCISE_DB[exerciseKey].name);
    setToast("다운로드 완료!");
  }

  async function handleCopy() {
    if (!canvasRef.current || !image || !landmarks) return;
    const exerciseKey = selectedExercise === "auto" ? "squat" : selectedExercise;
    const composite = createCompositeCanvas(
      canvasRef.current, image, landmarks, exerciseKey,
      { glowIntensity, showSkeleton, showLabels, muscleStatus: analysis?.muscleStatus || {} },
      brand, analysis
    );
    const ok = await copyToClipboard(composite);
    if (ok) {
      setToast("클립보드에 복사됨!");
    } else {
      downloadImage(composite, brand.gymName, EXERCISE_DB[exerciseKey].name);
      setToast("클립보드 불가 — 다운로드됨");
    }
  }

  function handleReset() {
    setAppState("upload");
    setImage(null);
    setLandmarks(null);
    setVideoFile(null);
    setWorstFrame(null);
    setAutoDetected(null);
    setAnalysis(null);
    setMediaType(null);
  }

  // ── Video worst frame download ──
  function handleWorstFrameDownload() {
    if (!worstFrame) return;
    const exerciseKey = selectedExercise === "auto" ? (autoDetected?.key || "squat") : selectedExercise;
    const composite = createWorstFrameComposite(
      worstFrame, exerciseKey,
      { glowIntensity, showSkeleton, showLabels, muscleStatus: analysis?.muscleStatus || {} },
      brand, analysis
    );
    downloadImage(composite, brand.gymName, EXERCISE_DB[exerciseKey]?.name || "exercise");
    setToast("최저 점수 프레임 다운로드 완료!");
  }

  const effectiveExerciseKey = selectedExercise === "auto" ? (autoDetected?.key || "squat") : selectedExercise;

  // ═══════════════════════════════════════════════
  //  UPLOAD SCREEN
  // ═══════════════════════════════════════════════
  if (appState === "upload") {
    return (
      <div style={S.container}>
        <Toast message={toast} onClose={() => setToast("")} />
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: "100vh", padding: 20,
        }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
            💪 Muscle Highlight
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 36 }}>
            AI가 운동 자세를 분석하고 근육을 시각화합니다
          </p>

          {isAnalyzing ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
              padding: 60, borderRadius: 20,
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{
                width: 44, height: 44, border: "3px solid #3B82F6", borderTopColor: "transparent",
                borderRadius: "50%", animation: "spin 1s linear infinite",
              }} />
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 500 }}>
                AI가 자세를 분석하고 있어요...
              </p>
            </div>
          ) : (
            <UploadArea onFileSelect={handleFileSelect} />
          )}

          <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: mediapipeStatus === "ready" ? "#22C55E" :
                mediapipeStatus === "loading" ? "#F59E0B" : "#EF4444",
            }} />
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
              {mediapipeStatus === "ready" && "MediaPipe AI 준비 완료"}
              {mediapipeStatus === "loading" && "AI 모델 로딩 중..."}
              {mediapipeStatus === "fallback" && "데모 모드 (Fallback)"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  //  SIDE PANEL CONTENT (shared between photo/video)
  // ═══════════════════════════════════════════════
  const sideContent = {
    analysis: (
      <>
        <PoseScoreCard analysis={analysis} />
        <CorrectionPanel analysis={analysis} />
      </>
    ),
    muscles: (
      <MuscleInfo exerciseKey={effectiveExerciseKey} analysis={analysis} />
    ),
    settings: (
      <>
        <ExerciseSelector
          selected={selectedExercise}
          onSelect={handleExerciseSelect}
          autoDetected={autoDetected}
        />
        <div style={S.divider} />
        <ControlPanel
          glowIntensity={glowIntensity} setGlowIntensity={setGlowIntensity}
          showSkeleton={showSkeleton} setShowSkeleton={setShowSkeleton}
          showLabels={showLabels} setShowLabels={setShowLabels}
          showCorrections={showCorrections} setShowCorrections={setShowCorrections}
        />
        <div style={S.divider} />
        <BrandSettings brand={brand} setBrand={setBrand} />
      </>
    ),
  };

  // ═══════════════════════════════════════════════
  //  RESULT SCREEN (photo or video)
  // ═══════════════════════════════════════════════
  return (
    <div style={S.container}>
      <Toast message={toast} onClose={() => setToast("")} />

      <div className="result-layout">
        {/* Main area - Canvas or Video */}
        <div className="result-main">
          {appState === "photo" ? (
            <CanvasView
              image={image}
              landmarks={landmarks}
              exerciseKey={effectiveExerciseKey}
              canvasSize={canvasSize}
              glowIntensity={glowIntensity}
              showSkeleton={showSkeleton}
              showLabels={showLabels}
              canvasRef={canvasRef}
              analysis={analysis}
            />
          ) : (
            <VideoPlayer
              videoFile={videoFile}
              exerciseKey={selectedExercise}
              glowIntensity={glowIntensity}
              showSkeleton={showSkeleton}
              showLabels={showLabels}
              showCorrections={showCorrections}
              onExerciseDetected={(d) => {
                setAutoDetected(d);
                setSelectedExercise(d.key);
              }}
              onAnalysisUpdate={(a) => setAnalysis(a)}
              onWorstFrame={(wf) => setWorstFrame(wf)}
            />
          )}

          {/* Desktop action buttons */}
          <div className="bottom-actions-desktop" style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {appState === "photo" && (
              <>
                <ActionBtn label="다운로드" primary onClick={handleDownload} />
                <ActionBtn label="클립보드 복사" onClick={handleCopy} />
              </>
            )}
            {appState === "video" && worstFrame && (
              <ActionBtn label="최저 점수 프레임 저장" primary onClick={handleWorstFrameDownload} />
            )}
            <ActionBtn label="새 파일" muted onClick={handleReset} />
          </div>
        </div>

        {/* Side panel */}
        <div className="result-side">
          {/* Mobile tabs */}
          <div className="mobile-tabs" style={{
            display: "flex", gap: 0, background: "rgba(255,255,255,0.04)",
            borderRadius: 0, padding: 0, position: "sticky", top: 0, zIndex: 10,
          }}>
            {[
              { label: "자세 분석", icon: "📊" },
              { label: "근육 정보", icon: "💪" },
              { label: "설정", icon: "⚙️" },
            ].map((tab, i) => (
              <button
                key={i}
                onClick={() => setMobileTab(i)}
                style={{
                  flex: 1, padding: "12px 0", border: "none", cursor: "pointer",
                  background: mobileTab === i ? "rgba(59,130,246,0.1)" : "transparent",
                  borderBottom: mobileTab === i ? "2px solid #3B82F6" : "2px solid transparent",
                  color: mobileTab === i ? "#3B82F6" : "rgba(255,255,255,0.4)",
                  fontSize: 12, fontWeight: mobileTab === i ? 700 : 400,
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Desktop: show all panels */}
          <div className="mobile-tab-content" style={{
            display: "flex", flexDirection: "column", gap: 12, padding: "12px 0",
          }}>
            {/* On desktop, show all. On mobile, show selected tab */}
            <div className="desktop-only-all" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Panel>{sideContent.analysis}</Panel>
              <Panel>{sideContent.muscles}</Panel>
              <Panel>{sideContent.settings}</Panel>
            </div>
          </div>

          {/* Mobile: show selected tab only */}
          <div className="mobile-only-tab" style={{
            display: "none", flexDirection: "column", gap: 12, padding: "12px 0",
          }}>
            <Panel>
              {mobileTab === 0 && sideContent.analysis}
              {mobileTab === 1 && sideContent.muscles}
              {mobileTab === 2 && sideContent.settings}
            </Panel>
          </div>
        </div>
      </div>

      {/* Mobile fixed bottom actions */}
      <div className="bottom-actions-mobile" style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        padding: "12px 16px", display: "flex", gap: 8,
        background: "rgba(7,7,15,0.95)", backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        zIndex: 20,
      }}>
        {appState === "photo" && (
          <>
            <ActionBtn label="다운로드" primary onClick={handleDownload} flex />
            <ActionBtn label="복사" onClick={handleCopy} flex />
          </>
        )}
        {appState === "video" && worstFrame && (
          <ActionBtn label="최저 프레임 저장" primary onClick={handleWorstFrameDownload} flex />
        )}
        <ActionBtn label="새 파일" muted onClick={handleReset} flex />
      </div>
    </div>
  );
}

function Panel({ children }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14, padding: 16,
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      {children}
    </div>
  );
}

function ActionBtn({ label, primary, muted, onClick, flex }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 18px", borderRadius: 10, border: "none",
        cursor: "pointer", fontSize: 13, fontWeight: 600,
        transition: "opacity 0.15s ease", whiteSpace: "nowrap",
        ...(flex ? { flex: 1 } : {}),
        ...(primary ? {
          background: "#3B82F6", color: "#fff",
        } : muted ? {
          background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)",
        } : {
          background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)",
          color: "#3B82F6",
        }),
      }}
    >
      {label}
    </button>
  );
}

const S = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #07070f, #0d0d22, #090916)",
    fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
    color: "#fff",
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.06)",
  },
};
