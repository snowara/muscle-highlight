import { useReducer, useRef, useEffect, useCallback } from "react";
import UploadArea from "./components/UploadArea";
import CanvasView from "./components/CanvasView";
import VideoPlayer from "./components/VideoPlayer";
import ExerciseSelector from "./components/ExerciseSelector";
import PoseScoreCard from "./components/PoseScoreCard";
import CorrectionPanel from "./components/CorrectionPanel";
import MuscleInfo from "./components/MuscleInfo";
import AnatomicalDiagram from "./components/AnatomicalDiagram";
import ControlPanel from "./components/ControlPanel";
import Toast from "./components/Toast";
import AdminPanel from "./components/AdminPanel";
import { initPoseDetector, prepareImage, detectPose } from "./lib/poseDetector";
import { classifyExercise } from "./lib/exerciseClassifier";
import { analyzePose } from "./lib/poseAnalyzer";
import {
  createCompositeCanvas, downloadImage, copyToClipboard,
  createWorstFrameComposite,
} from "./lib/compositeExport";
import { recordCorrection } from "./lib/learningStore";
import { EXERCISE_DB } from "./data/exercises";

// -- State --

const initialState = {
  appState: "upload",
  mediaType: null,
  image: null,
  canvasSize: { w: 600, h: 800 },
  landmarks: null,
  videoFile: null,
  worstFrame: null,
  selectedExercise: "squat",
  autoDetected: null,
  analysis: null,
  glowIntensity: 0.7,
  showSkeleton: false,
  showLabels: true,
  showCorrections: true,
  mediapipeStatus: "loading",
  isAnalyzing: false,
  toast: "",
  mobileTab: 0,
  showAdmin: false,
  brand: {
    gymName: "MY GYM",
    tagline: "Transform Your Body",
    brandColor: "#3B82F6",
  },
};

function appReducer(state, action) {
  switch (action.type) {
    case "SET_MEDIAPIPE_STATUS":
      return { ...state, mediapipeStatus: action.value };
    case "START_PHOTO_ANALYSIS":
      return { ...state, isAnalyzing: true, mediaType: "photo" };
    case "PHOTO_ANALYSIS_SUCCESS":
      return {
        ...state,
        image: action.image,
        canvasSize: action.canvasSize,
        landmarks: action.landmarks,
        autoDetected: action.autoDetected,
        selectedExercise: action.selectedExercise,
        analysis: action.analysis,
        isAnalyzing: false,
        appState: "photo",
        toast: action.isFallback
          ? "포즈 감지에 실패했습니다. 밝고 선명한 사진을 사용하거나 운동 종류를 직접 선택해주세요."
          : "",
      };
    case "PHOTO_ANALYSIS_FAIL":
      return { ...state, isAnalyzing: false, toast: "사진 분석에 실패했습니다" };
    case "START_VIDEO":
      return {
        ...state,
        mediaType: "video",
        videoFile: action.videoFile,
        selectedExercise: "auto",
        appState: "video",
      };
    case "SET_SELECTED_EXERCISE":
      return { ...state, selectedExercise: action.value };
    case "SET_AUTO_DETECTED":
      return {
        ...state,
        autoDetected: action.value,
        selectedExercise: action.value.key,
      };
    case "SET_ANALYSIS":
      return { ...state, analysis: action.value };
    case "SET_GLOW_INTENSITY":
      return { ...state, glowIntensity: action.value };
    case "SET_SHOW_SKELETON":
      return { ...state, showSkeleton: action.value };
    case "SET_SHOW_LABELS":
      return { ...state, showLabels: action.value };
    case "SET_SHOW_CORRECTIONS":
      return { ...state, showCorrections: action.value };
    case "SET_TOAST":
      return { ...state, toast: action.value };
    case "SET_MOBILE_TAB":
      return { ...state, mobileTab: action.value };
    case "SET_SHOW_ADMIN":
      return { ...state, showAdmin: action.value };
    case "SET_WORST_FRAME":
      return { ...state, worstFrame: action.value };
    case "RESET":
      return {
        ...state,
        appState: "upload",
        image: null,
        landmarks: null,
        videoFile: null,
        worstFrame: null,
        autoDetected: null,
        analysis: null,
        mediaType: null,
      };
    default:
      return state;
  }
}

// -- App --

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const canvasRef = useRef(null);

  const {
    appState, mediaType, image, canvasSize, landmarks,
    videoFile, worstFrame, selectedExercise, autoDetected,
    analysis, glowIntensity, showSkeleton, showLabels,
    showCorrections, mediapipeStatus, isAnalyzing, toast,
    mobileTab, showAdmin, brand,
  } = state;

  useEffect(() => {
    initPoseDetector((status) => dispatch({ type: "SET_MEDIAPIPE_STATUS", value: status }));
  }, []);

  // -- File upload handler --
  const handleFileSelect = useCallback(async (file, type) => {
    if (type === "photo") {
      dispatch({ type: "START_PHOTO_ANALYSIS" });
      try {
        const { canvas, width, height } = await prepareImage(file);
        const result = await detectPose(canvas);

        let detectedExercise = null;
        let exerciseKey = "squat";
        let poseAnalysis = null;

        if (!result.isFallback) {
          detectedExercise = classifyExercise(result.landmarks);
          exerciseKey = detectedExercise.key;
          poseAnalysis = analyzePose(result.landmarks, exerciseKey);
        }

        dispatch({
          type: "PHOTO_ANALYSIS_SUCCESS",
          image: canvas,
          canvasSize: { w: width, h: height },
          landmarks: result.landmarks,
          autoDetected: detectedExercise,
          selectedExercise: exerciseKey,
          analysis: poseAnalysis,
          isFallback: result.isFallback,
        });
      } catch (e) {
        console.error("[App] Photo analysis failed:", e);
        dispatch({ type: "PHOTO_ANALYSIS_FAIL" });
      }
    } else {
      dispatch({ type: "START_VIDEO", videoFile: file });
    }
  }, []);

  // -- Exercise change --
  const handleExerciseSelect = useCallback((key) => {
    if (autoDetected && key !== autoDetected.key && landmarks) {
      recordCorrection(landmarks, key, autoDetected.key);
    }
    dispatch({ type: "SET_SELECTED_EXERCISE", value: key });

    if (landmarks && key !== "auto") {
      const newAnalysis = analyzePose(landmarks, key);
      dispatch({ type: "SET_ANALYSIS", value: newAnalysis });
    }
  }, [autoDetected, landmarks]);

  // -- Export functions --
  const handleDownload = useCallback(() => {
    if (!canvasRef.current || !image || !landmarks) return;
    const exerciseKey = selectedExercise === "auto" ? "squat" : selectedExercise;
    const composite = createCompositeCanvas(
      canvasRef.current, image, landmarks, exerciseKey,
      { glowIntensity, showSkeleton, showLabels, muscleStatus: analysis?.muscleStatus || {} },
      brand, analysis
    );
    downloadImage(composite, brand.gymName, EXERCISE_DB[exerciseKey].name);
    dispatch({ type: "SET_TOAST", value: "다운로드 완료!" });
  }, [image, landmarks, selectedExercise, glowIntensity, showSkeleton, showLabels, analysis, brand]);

  const handleCopy = useCallback(async () => {
    if (!canvasRef.current || !image || !landmarks) return;
    const exerciseKey = selectedExercise === "auto" ? "squat" : selectedExercise;
    const composite = createCompositeCanvas(
      canvasRef.current, image, landmarks, exerciseKey,
      { glowIntensity, showSkeleton, showLabels, muscleStatus: analysis?.muscleStatus || {} },
      brand, analysis
    );
    const ok = await copyToClipboard(composite);
    if (ok) {
      dispatch({ type: "SET_TOAST", value: "클립보드에 복사됨!" });
    } else {
      downloadImage(composite, brand.gymName, EXERCISE_DB[exerciseKey].name);
      dispatch({ type: "SET_TOAST", value: "클립보드 불가 — 다운로드됨" });
    }
  }, [image, landmarks, selectedExercise, glowIntensity, showSkeleton, showLabels, analysis, brand]);

  const handleReset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  // -- Video worst frame download --
  const handleWorstFrameDownload = useCallback(() => {
    if (!worstFrame) return;
    const exerciseKey = selectedExercise === "auto" ? (autoDetected?.key || "squat") : selectedExercise;
    const composite = createWorstFrameComposite(
      worstFrame, exerciseKey,
      { glowIntensity, showSkeleton, showLabels, muscleStatus: analysis?.muscleStatus || {} },
      brand, analysis
    );
    downloadImage(composite, brand.gymName, EXERCISE_DB[exerciseKey]?.name || "exercise");
    dispatch({ type: "SET_TOAST", value: "최저 점수 프레임 다운로드 완료!" });
  }, [worstFrame, selectedExercise, autoDetected, glowIntensity, showSkeleton, showLabels, analysis, brand]);

  const handleAdminClose = useCallback(() => {
    dispatch({ type: "SET_SHOW_ADMIN", value: false });
    dispatch({ type: "RESET" });
  }, []);

  const effectiveExerciseKey = selectedExercise === "auto" ? (autoDetected?.key || "squat") : selectedExercise;

  // ========================
  //  UPLOAD SCREEN
  // ========================
  if (appState === "upload") {
    return (
      <div style={S.container}>
        <Toast message={toast} onClose={() => dispatch({ type: "SET_TOAST", value: "" })} />
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: "100vh", padding: 20,
        }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
            Muscle Highlight
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

          {/* 관리자 설정 버튼 */}
          <button
            onClick={() => dispatch({ type: "SET_SHOW_ADMIN", value: true })}
            style={{
              marginTop: 16, padding: "8px 16px", borderRadius: 8,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.35)", fontSize: 11, cursor: "pointer",
            }}
          >
            관리자 설정
          </button>
        </div>

        {showAdmin && <AdminPanel onClose={handleAdminClose} />}
      </div>
    );
  }

  // ========================
  //  SIDE PANEL CONTENT
  // ========================
  const sideContent = {
    analysis: (
      <>
        <CorrectionPanel analysis={analysis} exerciseKey={effectiveExerciseKey} />
      </>
    ),
    muscles: (
      <>
        <AnatomicalDiagram
          exerciseKey={effectiveExerciseKey}
          analysis={analysis}
        />
        <MuscleInfo exerciseKey={effectiveExerciseKey} analysis={analysis} />
      </>
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
          glowIntensity={glowIntensity} setGlowIntensity={(v) => dispatch({ type: "SET_GLOW_INTENSITY", value: v })}
          showSkeleton={showSkeleton} setShowSkeleton={(v) => dispatch({ type: "SET_SHOW_SKELETON", value: v })}
          showLabels={showLabels} setShowLabels={(v) => dispatch({ type: "SET_SHOW_LABELS", value: v })}
          showCorrections={showCorrections} setShowCorrections={(v) => dispatch({ type: "SET_SHOW_CORRECTIONS", value: v })}
        />
        <div style={S.divider} />
        <button
          onClick={() => dispatch({ type: "SET_SHOW_ADMIN", value: true })}
          style={{
            width: "100%", padding: "10px", borderRadius: 8,
            background: "rgba(232,64,64,0.08)", border: "1px solid rgba(232,64,64,0.2)",
            color: "#E84040", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          관리자 설정
        </button>
      </>
    ),
  };

  // ========================
  //  RESULT SCREEN
  // ========================
  return (
    <div style={S.container}>
      <Toast message={toast} onClose={() => dispatch({ type: "SET_TOAST", value: "" })} />

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
              onExerciseDetected={(d) => dispatch({ type: "SET_AUTO_DETECTED", value: d })}
              onAnalysisUpdate={(a) => dispatch({ type: "SET_ANALYSIS", value: a })}
              onWorstFrame={(wf) => dispatch({ type: "SET_WORST_FRAME", value: wf })}
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
                onClick={() => dispatch({ type: "SET_MOBILE_TAB", value: i })}
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

      {showAdmin && <AdminPanel onClose={handleAdminClose} />}

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
