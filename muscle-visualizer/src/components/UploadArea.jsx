import { useState, useRef } from "react";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov", ".webm"]);

function getExtension(name) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

export default function UploadArea({ onFileSelect }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  function handleFile(file) {
    if (!file) return;
    setError("");

    if (file.size > MAX_FILE_SIZE) {
      setError("파일 크기가 100MB를 초과합니다");
      return;
    }

    const ext = getExtension(file.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      setError("지원하지 않는 파일 형식입니다 (JPG, PNG, MP4, MOV, WebM)");
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setError("이미지 또는 영상 파일만 업로드할 수 있습니다");
      return;
    }

    onFileSelect(file, isImage ? "photo" : "video");
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="운동 사진 또는 영상 업로드"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
      onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFile(e.dataTransfer.files[0]); }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      style={{
        width: "100%", maxWidth: 520, padding: "60px 40px",
        border: `2px dashed ${isDragOver ? "#3B82F6" : "rgba(255,255,255,0.12)"}`,
        borderRadius: 20, cursor: "pointer", textAlign: "center",
        background: isDragOver ? "rgba(59,130,246,0.06)" : "rgba(255,255,255,0.02)",
        transition: "all 0.2s ease",
      }}
    >
      <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.9 }}>📸</div>
      <p style={{ color: "#fff", fontSize: 17, fontWeight: 700, marginBottom: 8, lineHeight: 1.4 }}>
        운동 사진 또는 영상을 올려주세요
      </p>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, lineHeight: 1.6 }}>
        드래그 & 드롭 또는 클릭하여 업로드<br />
        JPG, PNG, MP4, MOV, WebM 지원 (최대 100MB)
      </p>
      {error && (
        <p style={{ color: "#EF4444", fontSize: 12, fontWeight: 600, marginTop: 8 }}>
          {error}
        </p>
      )}

      {/* 모바일 카메라 버튼 */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24 }}>
        <label style={{
          padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)",
          color: "#3B82F6", cursor: "pointer",
        }}
          onClick={(e) => e.stopPropagation()}
        >
          📷 카메라 촬영
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </label>
        <label style={{
          padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.6)", cursor: "pointer",
        }}
          onClick={(e) => e.stopPropagation()}
        >
          🎥 영상 촬영
          <input
            type="file"
            accept="video/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </label>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,video/mp4,video/webm,video/quicktime"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  );
}
