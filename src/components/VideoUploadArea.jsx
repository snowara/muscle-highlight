import { useState, useRef } from "react";

const MAX_DURATION = 60; // seconds
const isMobile = /iPhone|iPad|iPod|Android/i.test(typeof navigator !== "undefined" ? navigator.userAgent : "");

export default function VideoUploadArea({ onVideoSelect, brandColor }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef(null);
  const cameraRef = useRef(null);

  function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("영상 파일만 업로드 가능합니다 (MP4, WebM, MOV)");
      setTimeout(() => setError(null), 4000);
      return;
    }
    if (file.size === 0) {
      setError("빈 파일입니다");
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setError("파일 크기가 500MB를 초과합니다. 더 작은 파일을 사용하세요.");
      setTimeout(() => setError(null), 4000);
      return;
    }

    setError(null);
    setChecking(true);

    // Validate video can play and check duration
    const video = document.createElement("video");
    video.preload = "metadata";
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      setChecking(false);

      // Duration check
      if (video.duration > MAX_DURATION) {
        setError(`영상이 ${Math.round(video.duration)}초입니다. 최대 ${MAX_DURATION}초까지 가능합니다.`);
        setTimeout(() => setError(null), 4000);
        return;
      }
      if (video.duration < 0.5) {
        setError("영상이 너무 짧습니다 (최소 0.5초 이상)");
        setTimeout(() => setError(null), 3000);
        return;
      }
      // Resolution warning
      if (video.videoWidth > 3840 || video.videoHeight > 3840) {
        setError("초고해상도 영상은 처리 시간이 길 수 있습니다. 자동 리사이즈됩니다.");
        setTimeout(() => setError(null), 3000);
      }

      onVideoSelect(file);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      setChecking(false);

      // Codec check
      const canPlayMP4 = document.createElement("video").canPlayType("video/mp4");
      const canPlayWebm = document.createElement("video").canPlayType("video/webm");

      if (file.type === "video/mp4" && !canPlayMP4) {
        setError("이 브라우저는 MP4 코덱을 지원하지 않습니다. WebM 형식으로 변환하세요.");
      } else if (file.type === "video/webm" && !canPlayWebm) {
        setError("이 브라우저는 WebM 코덱을 지원하지 않습니다. MP4 형식으로 변환하세요.");
      } else {
        setError("지원하지 않는 영상 코덱입니다. H.264 MP4 또는 VP9 WebM 형식을 사용하세요.");
      }
      setTimeout(() => setError(null), 5000);
    };

    video.src = url;
  }

  return (
    <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        style={{
          width: "100%", padding: "60px 40px",
          border: `2px dashed ${isDragOver ? brandColor : "rgba(255,255,255,0.15)"}`,
          borderRadius: 16, cursor: "pointer", textAlign: "center",
          background: isDragOver ? `${brandColor}10` : "rgba(255,255,255,0.02)",
          transition: "all 0.2s ease",
          opacity: checking ? 0.5 : 1,
          pointerEvents: checking ? "none" : "auto",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
        <p style={{ color: "#fff", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          {checking ? "영상 확인 중..." : "운동 영상을 드래그하거나 클릭하여 업로드"}
        </p>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
          MP4, WebM, MOV (최대 {MAX_DURATION}초 · 500MB)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          style={{ display: "none" }}
          onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ""; }}
        />
      </div>

      {/* Mobile camera recording */}
      {isMobile && (
        <button
          onClick={() => cameraRef.current?.click()}
          style={{
            padding: "14px 20px", borderRadius: 12, border: "none", cursor: "pointer",
            background: `${brandColor}22`, color: brandColor,
            fontSize: 14, fontWeight: 600,
            outline: `1.5px solid ${brandColor}40`,
          }}
        >
          📹 카메라로 촬영
          <input
            ref={cameraRef}
            type="file"
            accept="video/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ""; }}
          />
        </button>
      )}

      {/* Error message */}
      {error && (
        <div style={{
          padding: "10px 14px", borderRadius: 8,
          background: "rgba(255,59,92,0.1)", border: "1px solid rgba(255,59,92,0.2)",
          color: "#FF3B5C", fontSize: 12, textAlign: "center",
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
