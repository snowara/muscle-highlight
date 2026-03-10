/**
 * SyncPanel.jsx — QR 코드 기반 기기 간 학습 데이터 동기화
 *
 * 두 가지 모드:
 * 1. QR 생성: 현재 기기의 학습 데이터를 QR 코드로 표시
 * 2. QR 스캔: 다른 기기의 QR 코드를 카메라로 읽어서 가져오기
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { exportLearningData, importLearningData, getLearningStats } from "../lib/learningStore";
import { encodeLearningData, decodeLearningData, renderQRCode, isValidSyncData } from "../lib/syncUtils";

const MODE = { IDLE: "idle", GENERATE: "generate", SCAN: "scan" };

export default function SyncPanel({ onToast, styles }) {
  const [mode, setMode] = useState(MODE.IDLE);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState("");

  const stats = getLearningStats();
  const hasData = stats.totalCorrections > 0;

  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>
        기기 간 동기화
      </h3>

      <div style={{
        padding: 14, borderRadius: 10,
        background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)",
      }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 12, lineHeight: 1.6 }}>
          학습 데이터를 QR 코드로 다른 기기에 전송합니다.
          컴퓨터 &harr; 모바일 간 학습 결과를 동기화하세요.
        </div>

        {mode === MODE.IDLE && (
          <IdleView
            hasData={hasData}
            totalCorrections={stats.totalCorrections}
            onGenerate={() => setMode(MODE.GENERATE)}
            onScan={() => { setMode(MODE.SCAN); setScanResult(null); setScanError(""); }}
            styles={styles}
          />
        )}

        {mode === MODE.GENERATE && (
          <GenerateView
            onBack={() => setMode(MODE.IDLE)}
            styles={styles}
          />
        )}

        {mode === MODE.SCAN && (
          <ScanView
            onBack={() => setMode(MODE.IDLE)}
            onImported={(count) => {
              setMode(MODE.IDLE);
              onToast(`${count}건의 학습 데이터를 가져왔습니다`);
            }}
            scanResult={scanResult}
            setScanResult={setScanResult}
            scanError={scanError}
            setScanError={setScanError}
            styles={styles}
          />
        )}
      </div>
    </div>
  );
}

function IdleView({ hasData, totalCorrections, onGenerate, onScan, styles }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        style={{
          ...styles.primaryBtn,
          flex: 1,
          background: hasData ? "#3B82F6" : "rgba(59,130,246,0.3)",
          cursor: hasData ? "pointer" : "not-allowed",
          fontSize: 12,
        }}
        onClick={hasData ? onGenerate : undefined}
        disabled={!hasData}
      >
        QR 생성 ({totalCorrections}건)
      </button>
      <button
        style={{ ...styles.outlineBtn, flex: 1, fontSize: 12 }}
        onClick={onScan}
      >
        QR 스캔
      </button>
    </div>
  );
}

function GenerateView({ onBack, styles }) {
  const canvasRef = useRef(null);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const entries = exportLearningData();
    const { encoded, totalEntries, includedEntries } = encodeLearningData(entries);

    if (!encoded) {
      setError("인코딩할 학습 데이터가 없습니다");
      return;
    }

    setInfo({ totalEntries, includedEntries });

    if (canvasRef.current) {
      renderQRCode(encoded, canvasRef.current).then((ok) => {
        if (!ok) setError("QR 코드 생성에 실패했습니다");
      });
    }
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      {error ? (
        <div style={{ color: "#FF6B6B", fontSize: 12 }}>{error}</div>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            style={{ borderRadius: 12, background: "#fff" }}
          />
          {info && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.5 }}>
              {info.includedEntries === info.totalEntries
                ? `${info.totalEntries}건 전체 포함`
                : `${info.totalEntries}건 중 최근 ${info.includedEntries}건 포함`}
              <br />다른 기기에서 이 QR을 스캔하세요
            </div>
          )}
        </>
      )}
      <button style={{ ...styles.smallBtn, marginTop: 4 }} onClick={onBack}>
        돌아가기
      </button>
    </div>
  );
}

/**
 * QR 스캐너 카메라 훅 — 카메라 시작/중지/프레임 스캔 로직 분리
 */
function useQRScanner({ onDecoded, onError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const jsQRRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const stop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
    setCameraReady(false);
  }, []);

  useEffect(() => stop, [stop]);

  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (jsQRRef.current) {
      const result = jsQRRef.current(imageData.data, canvas.width, canvas.height);
      if (result?.data && isValidSyncData(result.data)) {
        stop();
        onDecoded(result.data);
        return;
      }
    }

    rafRef.current = requestAnimationFrame(scanFrame);
  }, [stop, onDecoded]);

  const start = useCallback(async () => {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setCameraReady(true);
        if (!jsQRRef.current) {
          const mod = await import("jsqr");
          jsQRRef.current = mod.default || mod;
        }
        scanFrame();
      }
    } catch {
      onError("카메라 접근이 거부되었습니다. 브라우저 설정에서 카메라를 허용하세요.");
      setScanning(false);
    }
  }, [scanFrame, onError]);

  return { videoRef, canvasRef, scanning, cameraReady, start, stop };
}

function ScanView({ onBack, onImported, scanResult, setScanResult, scanError, setScanError, styles }) {
  const handleDecoded = useCallback((data) => {
    const entries = decodeLearningData(data);
    if (!entries || entries.length === 0) {
      setScanError("유효하지 않은 동기화 데이터입니다");
      return;
    }
    setScanResult(entries);
  }, [setScanError, setScanResult]);

  const handleScanError = useCallback((msg) => {
    setScanError(msg);
  }, [setScanError]);

  const { videoRef, canvasRef, scanning, cameraReady, start, stop } =
    useQRScanner({ onDecoded: handleDecoded, onError: handleScanError });

  function startCamera() {
    setScanError("");
    setScanResult(null);
    start();
  }

  function handleImport() {
    if (!scanResult) return;
    const existing = exportLearningData();
    const merged = [...existing, ...scanResult];
    importLearningData(merged);
    onImported(scanResult.length);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      {scanError && (
        <div style={{ color: "#FF6B6B", fontSize: 12, textAlign: "center" }}>{scanError}</div>
      )}

      {!scanResult && !scanError && (
        <ScanCameraUI
          scanning={scanning}
          cameraReady={cameraReady}
          videoRef={videoRef}
          canvasRef={canvasRef}
          onStart={startCamera}
          styles={styles}
        />
      )}

      {scanResult && (
        <ScanResultUI
          count={scanResult.length}
          onImport={handleImport}
          onRescan={() => { setScanResult(null); startCamera(); }}
          styles={styles}
        />
      )}

      <button
        style={{ ...styles.smallBtn, marginTop: 4 }}
        onClick={() => { stop(); onBack(); }}
      >
        돌아가기
      </button>
    </div>
  );
}

function ScanCameraUI({ scanning, cameraReady, videoRef, canvasRef, onStart, styles }) {
  if (!scanning) {
    return (
      <>
        <button style={{ ...styles.primaryBtn, fontSize: 12 }} onClick={onStart}>
          카메라로 QR 스캔
        </button>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "center" }}>
          다른 기기에서 생성한 QR 코드를 카메라에 비추세요
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ position: "relative", width: "100%", maxWidth: 300 }}>
        <video
          ref={videoRef}
          style={{ width: "100%", borderRadius: 12, background: "#000", display: cameraReady ? "block" : "none" }}
          muted playsInline
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        {!cameraReady && (
          <div style={{
            width: "100%", height: 200, borderRadius: 12, background: "rgba(0,0,0,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>카메라 시작 중...</div>
          </div>
        )}
        {cameraReady && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <div style={{ width: 180, height: 180, border: "2px solid rgba(59,130,246,0.6)", borderRadius: 16 }} />
          </div>
        )}
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "center" }}>
        다른 기기에서 생성한 QR 코드를 카메라에 비추세요
      </div>
    </>
  );
}

function ScanResultUI({ count, onImport, onRescan, styles }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 8, color: "#22C55E" }}>&#10003;</div>
      <div style={{ color: "#22C55E", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>스캔 성공</div>
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 16 }}>
        {count}건의 학습 데이터를 발견했습니다
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button style={{ ...styles.primaryBtn, fontSize: 12 }} onClick={onImport}>가져오기</button>
        <button style={{ ...styles.smallBtn }} onClick={onRescan}>다시 스캔</button>
      </div>
    </div>
  );
}
