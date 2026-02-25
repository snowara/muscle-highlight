import { useState, useRef } from "react";

export default function UploadArea({ onFileSelect }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  function handleFile(file) {
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) return;
    onFileSelect(file, isImage ? "photo" : "video");
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
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
        JPG, PNG, MP4, MOV, WebM 지원
      </p>

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
