import { useState, useRef } from "react";

export default function VideoUploadArea({ onVideoSelect, brandColor }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  function handleFile(file) {
    if (!file || !file.type.startsWith("video/")) return;
    onVideoSelect(file);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFile(e.dataTransfer.files[0]); }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      style={{
        width: "100%", maxWidth: 480, padding: "60px 40px",
        border: `2px dashed ${isDragOver ? brandColor : "rgba(255,255,255,0.15)"}`,
        borderRadius: 16, cursor: "pointer", textAlign: "center",
        background: isDragOver ? `${brandColor}10` : "rgba(255,255,255,0.02)",
        transition: "all 0.2s ease",
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
      <p style={{ color: "#fff", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
        운동 영상을 드래그하거나 클릭하여 업로드
      </p>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
        MP4, WebM, MOV 지원 (최대 60초 권장)
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  );
}
